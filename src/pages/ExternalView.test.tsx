import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    expect(screen.getByRole("textbox", { name: "نص الايتم" })).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "إغلاق تفاصيل الايتم" }));
    expect(screen.queryByTitle("كانسل وبحث — تفاصيل الايتم")).toBeNull();
    expect(screen.getByTitle("بكلست")).toBe(picker);
    expect(picker.src).toBe(`${pickerOrigin}/picker-login`);
  });
  it("reads clipboard only on request and copies the item for manual search", async () => {
    const readText = vi.fn().mockResolvedValue("  VFID-123  ");
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue({ readText, writeText } as unknown as Clipboard);
    const params = new URLSearchParams({ url: `${pickerOrigin}/picker-login`, title: "بكلست" });
    render(<MemoryRouter initialEntries={[`/view?${params}`]}><ExternalView /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "عرض تفاصيل الايتم" }));
    expect(readText).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "لصق من الحافظة" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "نص الايتم" })).toHaveValue("VFID-123"));
    fireEvent.click(screen.getByRole("button", { name: "نسخ نص الايتم" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("VFID-123"));
  });
  it("allows manual paste when clipboard permission is denied", async () => {
    vi.spyOn(navigator, "clipboard", "get").mockReturnValue({ readText: vi.fn().mockRejectedValue(new Error("Denied")) } as unknown as Clipboard);
    const params = new URLSearchParams({ url: `${pickerOrigin}/picker-login`, title: "بكلست" });
    render(<MemoryRouter initialEntries={[`/view?${params}`]}><ExternalView /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "عرض تفاصيل الايتم" }));
    fireEvent.click(screen.getByRole("button", { name: "لصق من الحافظة" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    fireEvent.change(screen.getByRole("textbox", { name: "نص الايتم" }), { target: { value: "UPC-456" } });
    expect(screen.getByRole("textbox", { name: "نص الايتم" })).toHaveValue("UPC-456");
  });
  it("never shows the picklist selection action inside cancel and search", () => {
    const params = new URLSearchParams({ url: `${searchOrigin}/inventory/search`, title: "كانسل وبحث" });
    render(<MemoryRouter initialEntries={[`/view?${params}`]}><ExternalView /></MemoryRouter>);
    const frame = screen.getByTitle("كانسل وبحث") as HTMLIFrameElement;
    fireEvent(window, new MessageEvent("message", { source: frame.contentWindow, origin: pickerOrigin, data: { type: "fadshi:item-selection", text: "123" } }));
    expect(screen.queryByRole("button", { name: "عرض تفاصيل الايتم" })).toBeNull();
  });
  it("keeps manual entry available when clipboard API is missing", () => {
    const params = new URLSearchParams({ url: `${pickerOrigin}/picker-login`, title: "بكلست" });
    render(<MemoryRouter initialEntries={[`/view?${params}`]}><ExternalView /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "عرض تفاصيل الايتم" }));
    fireEvent.click(screen.getByRole("button", { name: "لصق من الحافظة" }));
    fireEvent.change(screen.getByRole("textbox", { name: "نص الايتم" }), { target: { value: "123456" } });
    expect(screen.getByRole("textbox", { name: "نص الايتم" })).toHaveValue("123456");
    expect(screen.getByRole("button", { name: "نسخ نص الايتم" })).toBeEnabled();
  });
});