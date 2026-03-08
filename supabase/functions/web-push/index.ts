import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Web Push requires specific crypto operations
// We implement the Web Push protocol using Web Crypto API

async function generateVapidKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"]
  );

  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  const publicKeyBase64url = base64urlEncode(new Uint8Array(publicKeyRaw));

  return {
    publicKey: publicKeyBase64url,
    privateKeyJwk: JSON.stringify(privateKeyJwk),
  };
}

function base64urlEncode(buffer: Uint8Array): string {
  let binary = "";
  for (const byte of buffer) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function createJwt(audience: string, privateKeyJwk: JsonWebKey) {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: "mailto:push@lovable.app",
  };

  const headerB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format if needed
  const sigBytes = new Uint8Array(signature);
  let rawSig: Uint8Array;
  if (sigBytes.length === 64) {
    rawSig = sigBytes;
  } else {
    // Already raw format from Web Crypto
    rawSig = sigBytes;
  }

  const signatureB64 = base64urlEncode(rawSig);
  return `${unsignedToken}.${signatureB64}`;
}

// HKDF for Web Push encryption
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, salt.length ? salt : new Uint8Array(32)));
  
  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info);
  infoWithCounter[info.length] = 1;
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithCounter));
  return okm.slice(0, length);
}

function createInfo(type: string, clientPublicKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const info = new Uint8Array(18 + typeBytes.length + 1 + 5 + 2 + clientPublicKey.length + 2 + serverPublicKey.length);
  let offset = 0;
  
  const prefix = new TextEncoder().encode("Content-Encoding: ");
  info.set(prefix, offset); offset += prefix.length;
  info.set(typeBytes, offset); offset += typeBytes.length;
  info[offset++] = 0; // null byte
  
  const p256 = new TextEncoder().encode("P-256");
  info.set(p256, offset); offset += p256.length;
  
  info[offset++] = 0;
  info[offset++] = clientPublicKey.length;
  info.set(clientPublicKey, offset); offset += clientPublicKey.length;
  
  info[offset++] = 0;
  info[offset++] = serverPublicKey.length;
  info.set(serverPublicKey, offset);
  
  return info;
}

async function encryptPayload(
  clientPublicKeyB64: string,
  clientAuthB64: string,
  payload: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const clientPublicKey = base64urlDecode(clientPublicKeyB64);
  const clientAuth = base64urlDecode(clientAuthB64);

  // Generate server ECDH keys
  const serverKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeys.publicKey)
  );

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientKey },
      serverKeys.privateKey,
      256
    )
  );

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive encryption key using HKDF
  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const prk = await hkdf(clientAuth, sharedSecret, authInfo, 32);

  const contentInfo = createInfo("aesgcm", clientPublicKey, serverPublicKeyRaw);
  const contentKey = await hkdf(salt, prk, contentInfo, 16);

  const nonceInfo = createInfo("nonce", clientPublicKey, serverPublicKeyRaw);
  const nonce = await hkdf(salt, prk, nonceInfo, 12);

  // Encrypt with AES-GCM
  const paddedPayload = new Uint8Array(2 + new TextEncoder().encode(payload).length);
  paddedPayload[0] = 0;
  paddedPayload[1] = 0;
  paddedPayload.set(new TextEncoder().encode(payload), 2);

  const aesKey = await crypto.subtle.importKey(
    "raw",
    contentKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      paddedPayload
    )
  );

  return { encrypted, salt, serverPublicKey: serverPublicKeyRaw };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || (req.method === "GET" ? "vapid-key" : "");
    
    let body: any = {};
    if (req.method === "POST") {
      body = await req.json();
    }
    const actionFromBody = body.action || action;

    // GET VAPID PUBLIC KEY
    if (actionFromBody === "vapid-key" || actionFromBody === "get-vapid-key") {
      let { data: config } = await supabase.from("vapid_config").select("public_key").single();
      
      if (!config) {
        // Generate new VAPID keys
        const keys = await generateVapidKeys();
        const { error: insertError } = await supabase.from("vapid_config").insert({
          id: 1,
          public_key: keys.publicKey,
          private_key: keys.privateKeyJwk,
        });
        if (insertError) {
          console.error("Error storing VAPID keys:", insertError);
          throw new Error("Failed to generate VAPID keys");
        }
        config = { public_key: keys.publicKey };
      }

      return new Response(JSON.stringify({ publicKey: config.public_key }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SUBSCRIBE
    if (actionFromBody === "subscribe") {
      const { subscription } = body;
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return new Response(JSON.stringify({ error: "Invalid subscription" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        { onConflict: "endpoint" }
      );

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SEND PUSH TO ALL SUBSCRIBERS
    if (actionFromBody === "send") {
      const title = body.title || "📋 New Pick List";
      const message = body.body || "بكلست جديدة";

      // Get VAPID config
      const { data: vapidConfig } = await supabase
        .from("vapid_config")
        .select("*")
        .single();

      if (!vapidConfig) {
        return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get all subscriptions
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*");

      if (!subscriptions?.length) {
        return new Response(JSON.stringify({ sent: 0, message: "No subscribers" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payload = JSON.stringify({ title, body: message });
      const privateKeyJwk = JSON.parse(vapidConfig.private_key);
      let sent = 0;
      let failed = 0;

      for (const sub of subscriptions) {
        try {
          const endpointUrl = new URL(sub.endpoint);
          const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

          const jwt = await createJwt(audience, privateKeyJwk);
          const { encrypted, salt, serverPublicKey } = await encryptPayload(
            sub.p256dh,
            sub.auth,
            payload
          );

          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Encoding": "aesgcm",
              "Content-Length": encrypted.length.toString(),
              Authorization: `WebPush ${jwt}`,
              "Crypto-Key": `dh=${base64urlEncode(serverPublicKey)};p256ecdsa=${vapidConfig.public_key}`,
              Encryption: `salt=${base64urlEncode(salt)}`,
              TTL: "86400",
              Urgency: "high",
            },
            body: encrypted,
          });

          if (response.status === 201 || response.status === 200) {
            sent++;
          } else if (response.status === 404 || response.status === 410) {
            // Subscription expired, remove it
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            failed++;
          } else {
            console.error(`Push failed for ${sub.endpoint}: ${response.status} ${await response.text()}`);
            failed++;
          }
        } catch (err) {
          console.error(`Push error for ${sub.endpoint}:`, err);
          failed++;
        }
      }

      return new Response(JSON.stringify({ sent, failed, total: subscriptions.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
