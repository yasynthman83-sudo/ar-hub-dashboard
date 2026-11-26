# Architecture rules
- Receive selected text only through origin- and source-validated postMessage from the embedded picklist; cross-origin DOM access is not permitted by browsers.
- Keep the original application iframe mounted beneath the search dialog so closing details preserves the picklist session and position.
- Read the clipboard only on user-triggered details opening when selection is empty or on explicit paste; keep manual input/copy fallback because clipboard access may be denied.
- Pass current item input as encoded q and search parameters to the search iframe; never imply that loading it applies a search because external query support is unverified.