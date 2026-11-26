import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ExternalView from "./ExternalView";
import { pickerOrigin, searchOrigin } from "@/lib/itemDetailsBridge";

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
beforeEach(() => Object.defineProperty(navigator, "clipboard", { configurable: true, get: () => undefined }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard);
  else Reflect.deleteProperty(navigator, "clipboard");
});

describe("picklist item details flow", () => {
  it("opens details without external messages and closes without replacing the picker iframe", async () => {
    const params = new URLSearchParams({ url: `${pickerOrigin}/picker-login`, title: "بكلست" });
    render(<MemoryRouter initialEntries={[`/view?${params}`]}><ExternalView /></MemoryRouter>);
    const picker = screen.getByTitle("بكلست") as HTMLIFrameElement;
    fireEvent.click(screen.getByRole("button", { name: "عرض تفاصيل الايتم" }));
    expect((screen.getByTitle("كانسل وبحث — تفاصيل الايتم") as HTMLIFrameElement).src).toBe(`${searchOrigin}/inventory/search`);
    fireEvent.click(screen.getByRole("button", { name: "إغلاق تفاصيل الايتم" }));
    expect(screen.queryByTitle("كانسل وبحث — تفاصيل الايتم")).toBeNull();
    expect(screen.getByTitle("بكلست")).toBe(picker);
    expect(picker.src).toBe(`${pickerOrigin}/picker-login`);
  });
  it("reads clipboard only on opening and passes encoded text through both parameters", async () => {
    const readText = vi.fn().mockResolvedValue("  صنف & /?  ");
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue({ readText } as unknown as Clipboard);
    const params = new URLSearchParams({ url: `${pickerOrigin}/picker-login`, title: "بكلست" });
    render(<MemoryRouter initialEntries={[`/view?${params}`]}><ExternalView /></MemoryRouter>);
    expect(readText).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "عرض تفاصيل الايتم" }));
    const searchFrame = await screen.findByTitle("كانسل وبحث — تفاصيل الايتم") as HTMLIFrameElement;
    expect(readText).toHaveBeenCalledTimes(1);
    expect(searchFrame.src).toBe(`${searchOrigin}/inventory/search?q=${encodeURIComponent("صنف & /?")}&search=${encodeURIComponent("صنف & /?")}`);
  });
  it("opens the destination without query text when clipboard permission is denied", async () => {
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue({ readText: vi.fn().mockRejectedValue(new Error("Denied")) } as unknown as Clipboard);
    const params = new URLSearchParams({ url: `${pickerOrigin}/picker-login`, title: "بكلست" });
    render(<MemoryRouter initialEntries={[`/view?${params}`]}><ExternalView /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "عرض تفاصيل الايتم" }));
    const searchFrame = await screen.findByTitle("كانسل وبحث — تفاصيل الايتم") as HTMLIFrameElement;
    expect(searchFrame.src).toBe(`${searchOrigin}/inventory/search`);
  });
  it("uses validated selection without reading clipboard and preserves picklist on close", () => {
    const readText = vi.fn();
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue({ readText } as unknown as Clipboard);
    const params = new URLSearchParams({ url: `${pickerOrigin}/picker-login`, title: "بكلست" });
    render(<MemoryRouter initialEntries={[`/view?${params}`]}><ExternalView /></MemoryRouter>);
    const picker = screen.getByTitle("بكلست") as HTMLIFrameElement;
    fireEvent(window, new MessageEvent("message", { source: picker.contentWindow, origin: pickerOrigin, data: { type: "fadshi:item-selection", text: "SELECTED-123" } }));
    fireEvent.click(screen.getByRole("button", { name: "عرض تفاصيل الايتم" }));
    expect(readText).not.toHaveBeenCalled();
    const searchFrame = screen.getByTitle("كانسل وبحث — تفاصيل الايتم") as HTMLIFrameElement;
    expect(searchFrame.src).toBe(`${searchOrigin}/inventory/search?q=SELECTED-123&search=SELECTED-123`);
    fireEvent.click(screen.getByRole("button", { name: "إغلاق تفاصيل الايتم" }));
    expect(screen.getByTitle("بكلست")).toBe(picker);
  });
  it("never shows the picklist selection action inside cancel and search", () => {
    const params = new URLSearchParams({ url: `${searchOrigin}/inventory/search`, title: "كانسل وبحث" });
    render(<MemoryRouter initialEntries={[`/view?${params}`]}><ExternalView /></MemoryRouter>);
    const frame = screen.getByTitle("كانسل وبحث") as HTMLIFrameElement;
    fireEvent(window, new MessageEvent("message", { source: frame.contentWindow, origin: pickerOrigin, data: { type: "fadshi:item-selection", text: "123" } }));
    expect(screen.queryByRole("button", { name: "عرض تفاصيل الايتم" })).toBeNull();
  });
});
