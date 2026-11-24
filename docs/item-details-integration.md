# Required changes in the two embedded apps

The hub now accepts selected text from the picklist iframe, opens the existing warehouse search page above it, sends the text after a ready handshake, and preserves the picklist iframe on close. The two deployed apps currently do not implement this protocol. Cross-origin browser security prevents the hub from reading their selection or filling their fields directly. These changes must be made and published in those projects before the feature works for users.

## Shared parent validation

Use this helper in each embedded app. Keep origins exact; do not use wildcard targets or suffix matching. Add other deployment origins only when explicitly trusted.

```ts
const HUB_ORIGINS = new Set([
  "https://ar-hub-dashboard.lovable.app",
  "https://id-preview--17df9b7f-6264-446f-8e19-083c1763f987.lovable.app",
]);

function trustedHubOrigin(): string | null {
  if (window.parent === window || !document.referrer) return null;
  try {
    const origin = new URL(document.referrer).origin;
    return HUB_ORIGINS.has(origin) ? origin : null;
  } catch { return null; }
}
```

If the source app intentionally suppresses referrers, use a validated parent/child handshake instead of removing origin validation.

## Picklist app: send text selection

Mount the following React hook once in the picklist application's root. Include the shared helper above in this module. It supports regular text and input selections on desktop and mobile. Do not transmit password fields, contenteditable fields, or selection from login forms. The contextual action itself lives in the hub, not this app.

```ts
import { useEffect } from "react";

export function useHubItemSelection() {
  useEffect(() => {
    const origin = trustedHubOrigin();
    if (!origin) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const send = () => {
      const active = document.activeElement;
      let text = "";
      if (active instanceof HTMLInputElement) {
        if (active.type === "password" || active.closest("form")) return;
        text = active.value.slice(active.selectionStart ?? 0, active.selectionEnd ?? 0);
      } else if (active instanceof HTMLTextAreaElement) {
        if (active.closest("form")) return;
        text = active.value.slice(active.selectionStart, active.selectionEnd);
      } else {
        const selection = window.getSelection();
        const node = selection?.anchorNode;
        const element = node instanceof Element ? node : node?.parentElement;
        if (element?.closest("form, [contenteditable='true']")) return;
        text = selection?.toString() ?? "";
      }
      text = text.trim();
      if (text.length > 500) text = "";
      window.parent.postMessage({ type: "fadshi:item-selection", text }, origin);
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(send, 180); };
    document.addEventListener("selectionchange", schedule);
    document.addEventListener("pointerup", schedule);
    document.addEventListener("keyup", schedule);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", schedule);
      document.removeEventListener("pointerup", schedule);
      document.removeEventListener("keyup", schedule);
    };
  }, []);
}
```

## Warehouse app: consume the selected text

Mount this hook **inside the authenticated `/inventory/search` page**, with its existing input setter and search handler. Include the shared helper above in this module. The live page currently has a controlled `VFID أو UPC` input and a search function used by Enter, the search button, and the scanner. Reuse that function; do not query a second data source or simulate DOM clicks. Call it with the received value directly, not the old state value.

```ts
import { useEffect, useRef } from "react";

export function useHubItemSearch(
  setSearchText: (text: string) => void,
  runExistingSearch: (text: string) => void | Promise<void>,
) {
  const handlers = useRef({ setSearchText, runExistingSearch });
  handlers.current = { setSearchText, runExistingSearch };
  useEffect(() => {
    const origin = trustedHubOrigin();
    if (!origin) return;
    let lastRequestId = "";
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== origin) return;
      const data = event.data;
      if (!data || data.type !== "fadshi:search-item" ||
          typeof data.text !== "string" || !data.text.trim() || data.text.length > 500 ||
          typeof data.requestId !== "string" || !data.requestId ||
          data.requestId === lastRequestId) return;
      lastRequestId = data.requestId;
      const text = data.text.trim();
      handlers.current.setSearchText(text);
      // Acknowledges applying the text and invoking the existing search.
      // Search results/errors remain rendered by the existing search page.
      const result = handlers.current.runExistingSearch(text);
      window.parent.postMessage({ type: "fadshi:search-applied", requestId: data.requestId }, origin);
      Promise.resolve(result).catch(() => { /* Existing search handler must show its error UI. */ });
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "fadshi:search-ready" }, origin);
    return () => window.removeEventListener("message", receive);
  }, []);
}

// In the existing search page, after declaring its setter and search function:
// useHubItemSearch(setSearchText, searchItem);
```

Do not send ready from the login page. Send it when the actual authenticated search page mounts, including after login. The overlay reports a connection warning after 15 seconds if the page has not signalled readiness.

## Acceptance check after publishing all three apps

1. Sign in to picklist through the hub, open a real item, select its VFID/UPC.
2. Press `عرض تفاصيل الايتم`; confirm the existing warehouse search page opens above picklist.
3. Sign in to warehouse if needed; confirm the selected value is in its field and actual results appear without another search click.
4. Close with X or Escape; confirm the same picklist, scroll position, and progress remain.
5. Repeat on Android and iOS, with selecting another value and with no search results.
6. Verify messages from a different window or domain never trigger item details or searches.