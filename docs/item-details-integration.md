# Item details: manual clipboard workflow

The portal does not require any changes to the external apps. A floating `عرض تفاصيل الايتم` button appears only in the picklist view. It opens the existing warehouse search page in a dismissible dialog while leaving the picklist iframe mounted.

1. Copy the item identifier in picklist using the browser's normal selection/copy action.
2. Open item details. When no validated selection is available, the opening click attempts to read the clipboard. Use the clipboard-paste icon or paste/type into the portal's `VFID أو UPC` field if needed.
3. Use the copy icon if the identifier was edited or typed; paste into the actual warehouse search field and run its existing search manually.
4. Close with X or Escape to return to the same picklist state.

Clipboard access only runs on explicit clicks. Permission rejection and browsers without clipboard support fall back to manual input and selecting text for manual copying. Text is not saved or sent to analytics. Current input is transmitted to the search app through both `q` and `search` query parameters on opening, editing, or pasting; empty input restores the base search URL.

The hub cannot read selection or fill search fields inside cross-origin frames. It does not simulate search or wait for a search handshake. Query parameters only populate or apply search if the destination app supports them; manual search remains the fallback. The existing validated picklist selection listener remains optional.

Verification covers the portal-side workflow, clipboard permission success/failure, missing clipboard support, and preservation of the original frame. Real authenticated warehouse search cannot be verified from this project without access to that external app's session.
