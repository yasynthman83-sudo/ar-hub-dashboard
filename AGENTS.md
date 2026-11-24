# Architecture rules
- Receive selected text only through origin- and source-validated postMessage from the embedded picklist; cross-origin DOM access is not permitted by browsers.
- Keep the original application iframe mounted beneath the search dialog so closing details preserves the picklist session and position.
- Require the warehouse iframe ready/applied handshake before reporting automatic search as connected; iframe load alone is not confirmation.