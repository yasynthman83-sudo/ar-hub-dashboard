import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

async function generateVapidKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"]
  );
  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  return {
    publicKey: base64urlEncode(new Uint8Array(publicKeyRaw)),
    privateKeyJwk: JSON.stringify(privateKeyJwk),
  };
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

  return `${unsignedToken}.${base64urlEncode(new Uint8Array(signature))}`;
}

// HKDF using Web Crypto
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  // Extract
  const saltKey = await crypto.subtle.importKey(
    "raw",
    salt.length ? salt : new Uint8Array(32),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", saltKey, ikm));

  // Expand
  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info);
  infoWithCounter[info.length] = 1;
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithCounter));
  return okm.slice(0, length);
}

// aes128gcm content encoding (RFC 8291)
async function encryptPayload(
  clientPublicKeyB64: string,
  clientAuthB64: string,
  payload: string
): Promise<Uint8Array> {
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

  // Generate 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Key derivation for aes128gcm (RFC 8291)
  // IKM for auth: HKDF(clientAuth, sharedSecret, "WebPush: info\0" || clientPub || serverPub, 32)
  const authInfo = new Uint8Array([
    ...new TextEncoder().encode("WebPush: info\0"),
    ...clientPublicKey,
    ...serverPublicKeyRaw,
  ]);
  const ikm = await hkdf(clientAuth, sharedSecret, authInfo, 32);

  // Content encryption key: HKDF(salt, ikm, "Content-Encoding: aes128gcm\0", 16)
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const contentKey = await hkdf(salt, ikm, cekInfo, 16);

  // Nonce: HKDF(salt, ikm, "Content-Encoding: nonce\0", 12)
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Pad payload: payload + delimiter(0x02) for last record
  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // delimiter for final record

  // Encrypt with AES-128-GCM
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

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + encrypted
  const recordSize = encrypted.length + 86; // header size + encrypted
  const rs = new DataView(new ArrayBuffer(4));
  rs.setUint32(0, recordSize);
  const rsBytes = new Uint8Array(rs.buffer);

  const header = new Uint8Array(86); // 16 salt + 4 rs + 1 idlen + 65 key
  header.set(salt, 0);
  header.set(rsBytes, 16);
  header[20] = 65; // idlen = 65 bytes for uncompressed EC point
  header.set(serverPublicKeyRaw, 21);

  // Combine header + encrypted data
  const body = new Uint8Array(header.length + encrypted.length);
  body.set(header);
  body.set(encrypted, header.length);

  return body;
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
    const action = url.searchParams.get("action") || "";
    let body: any = {};
    if (req.method === "POST") {
      body = await req.json();
    }

    // Handle Supabase Database Webhook payload (has "type" and "record" fields)
    if (body.type === "INSERT" && body.record) {
      console.log("📨 Received Database Webhook trigger:", JSON.stringify(body).substring(0, 200));
      body = { action: "send", title: "📋 New Pick List", body: "بكلست جديدة" };
    }

    const actionFinal = body.action || action;

    // GET VAPID PUBLIC KEY
    if (actionFinal === "vapid-key" || actionFinal === "get-vapid-key") {
      let { data: config } = await supabase.from("vapid_config").select("public_key").single();
      if (!config) {
        const keys = await generateVapidKeys();
        const { error: insertError } = await supabase.from("vapid_config").insert({
          id: 1,
          public_key: keys.publicKey,
          private_key: keys.privateKeyJwk,
        });
        if (insertError) throw new Error("Failed to generate VAPID keys");
        config = { public_key: keys.publicKey };
      }
      return new Response(JSON.stringify({ publicKey: config.public_key }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SUBSCRIBE
    if (actionFinal === "subscribe") {
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
    if (actionFinal === "send") {
      const title = body.title || "📋 New Pick List";
      const message = body.body || "بكلست جديدة";

      const { data: vapidConfig } = await supabase.from("vapid_config").select("*").single();
      if (!vapidConfig) {
        return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: subscriptions } = await supabase.from("push_subscriptions").select("*");
      if (!subscriptions?.length) {
        return new Response(JSON.stringify({ sent: 0, message: "No subscribers" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payload = JSON.stringify({ title, body: message });
      const privateKeyJwk = JSON.parse(vapidConfig.private_key);
      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const sub of subscriptions) {
        try {
          const endpointUrl = new URL(sub.endpoint);
          const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
          const jwt = await createJwt(audience, privateKeyJwk);

          // Encrypt using aes128gcm
          const encryptedBody = await encryptPayload(sub.p256dh, sub.auth, payload);

          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Encoding": "aes128gcm",
              Authorization: `vapid t=${jwt}, k=${vapidConfig.public_key}`,
              TTL: "86400",
              Urgency: "high",
            },
            body: encryptedBody,
          });

          const responseText = await response.text();
          console.log(`Push to ${sub.endpoint.substring(0, 60)}: ${response.status} ${responseText}`);

          if (response.status === 201 || response.status === 200) {
            sent++;
          } else if (response.status === 404 || response.status === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            failed++;
            errors.push(`Expired: ${sub.endpoint.substring(0, 60)}`);
          } else {
            failed++;
            errors.push(`${response.status}: ${responseText.substring(0, 200)}`);
          }
        } catch (err) {
          console.error(`Push error for ${sub.endpoint.substring(0, 60)}:`, err.message);
          failed++;
          errors.push(`Error: ${err.message}`);
        }
      }

      return new Response(JSON.stringify({ sent, failed, total: subscriptions.length, errors }), {
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
