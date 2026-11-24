# Architecture rules
- Receive selected text only through origin- and source-validated postMessage from the embedded picklist; cross-origin DOM access is not permitted by browsers.
- Keep the original application iframe mounted beneath the search dialog so closing details preserves the picklist session and position.
- Use user-triggered clipboard read/write and manual input for item details; external search stays manual because the embedded apps cannot be modified. Never imply that loading the search iframe applies a search.