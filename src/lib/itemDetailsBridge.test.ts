import { describe, expect, it } from "vitest";
import { isAllowedPortalUrl, pickerOrigin, readItemSelection } from "./itemDetailsBridge";

describe("embedded item details permissions", () => {
  it("accepts trimmed selected item text only from the picker frame", () => {
    const source = window;
    expect(readItemSelection({ source, origin: pickerOrigin, data: { type: "fadshi:item-selection", text: "  123456789  " } }, source)).toBe("123456789");
  });
  it("does not offer item details for messages from the search portal", () => {
    expect(readItemSelection({ source: window, origin: "https://warehousemgr.lovable.app", data: { type: "fadshi:item-selection", text: "123" } }, window)).toBeNull();
  });
  it("rejects another window even when its origin matches", () => {
    expect(readItemSelection({ source: null, origin: pickerOrigin, data: { type: "fadshi:item-selection", text: "123" } }, window)).toBeNull();
  });
  it("supports clearing selection and rejects invalid selection payloads", () => {
    expect(readItemSelection({ source: window, origin: pickerOrigin, data: { type: "fadshi:item-selection", text: "" } }, window)).toBe("");
    expect(readItemSelection({ source: window, origin: pickerOrigin, data: { type: "fadshi:item-selection", text: 123 } }, window)).toBeNull();
  });
  it("allows the configured search URL but not lookalike domains", () => {
    expect(isAllowedPortalUrl("https://warehousemgr.lovable.app/inventory/search")).toBe(true);
    expect(isAllowedPortalUrl("https://warehousemgr.lovable.app.attacker.example/inventory/search")).toBe(false);
    expect(isAllowedPortalUrl("http://warehousemgr.lovable.app/inventory/search")).toBe(false);
  });
});