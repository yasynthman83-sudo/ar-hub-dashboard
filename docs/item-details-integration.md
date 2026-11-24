# Item details: manual clipboard workflow

The portal does not require any changes to the external apps. A floating `عرض تفاصيل الايتم` button appears only in the picklist view. It opens the existing warehouse search page in a dismissible dialog while leaving the picklist iframe mounted.

1. Copy the item identifier in picklist using the browser's normal selection/copy action.
2. Open item details. Use the clipboard-paste icon or paste/type into the portal's `VFID أو UPC` field.
3. Use the copy icon if the identifier was edited or typed; paste into the actual warehouse search field and run its existing search manually.
4. Close with X or Escape to return to the same picklist state.

Clipboard access only runs on explicit clicks. Permission rejection and browsers without clipboard support fall back to manual input and selecting text for manual copying. Text is not saved, sent to analytics, or automatically transmitted to the search app.

The hub cannot read selection or fill search fields inside cross-origin frames. It therefore does not simulate an automatic search, depend on query parameters, or wait for a search handshake. The existing validated picklist selection listener remains optional and is not required for the manual workflow.

Verification covers the portal-side workflow, clipboard permission success/failure, missing clipboard support, and preservation of the original frame. Real authenticated warehouse search cannot be verified from this project without access to that external app's session.
