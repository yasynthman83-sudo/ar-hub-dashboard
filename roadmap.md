# Item details from picklist
- [x] Replace the external integration dependency with a floating item-details action and manual input/clipboard controls.
- [x] Verify clipboard success, denied/unavailable fallback, and closing without reloading picklist (10 tests and live browser checks).
- [x] Check desktop/mobile layouts and save the changes. External authenticated warehouse results are not verified; searching there remains manual.

# Clipboard and query-link update
- [x] Read clipboard on opening details only when no selected text is available, with manual fallback.
- [x] Send current input through both q and search parameters and update on edits/paste.
- [x] Verify clipboard, URL updates, and preservation of picklist (11 tests and live browser flow); external automatic search is unverified and depends on the destination app.