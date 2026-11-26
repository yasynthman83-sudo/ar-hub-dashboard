# Architecture rules
- Receive selected text only through origin- and source-validated postMessage from the embedded picklist; cross-origin DOM access is not permitted by browsers.
- Keep the original application iframe mounted beneath the search dialog so closing details preserves the picklist session and position.
- Read the clipboard only on user-triggered details opening when selection is empty; if access fails, open the destination without query text for manual search there.
- Keep item details limited to a title/close header and the destination iframe, passing received item text as encoded q and search parameters to the search iframe; never imply that loading it applies a search because external query support is unverified.