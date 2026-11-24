import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ExternalView from "./ExternalView";
import { pickerOrigin, searchOrigin } from "@/lib/itemDetailsBridge";

afterEach(cleanup);

describe("picklist item details flow", () => {
  it("searches the selected text and closes without replacing the picker iframe", async () => {
    const params = new URLSearchParams({ url: `${pickerOrigin}/picker-login`, title: "بكلست" });
    render(<MemoryRouter initialEntries={[`/view?${params}`]}><ExternalView /></MemoryRouter>);
    const picker = screen.getByTitle("بكلست") as HTMLIFrameElement;
    fireEvent(window, new MessageEvent("message", { source: picker.contentWindow, origin: pickerOrigin, data: { type: "fadshi:item-selection", text: "  VFID-123  " } }));
    fireEvent.click(screen.getByRole("button", { name: "عرض تفاصيل الايتم" }));
    const search = screen.getByTitle("كانسل وبحث — تفاصيل الايتم") as HTMLIFrameElement;
    const searchWindow = search.contentWindow;
    if (!searchWindow) throw new Error("Search iframe window missing");
    const send = vi.spyOn(searchWindow, "postMessage");
    fireEvent(window, new MessageEvent("message", { source: searchWindow, origin: searchOrigin, data: { type: "fadshi:search-ready" } }));
    await waitFor(() => expect(send).toHaveBeenCalledWith({ type: "fadshi:search-item", text: "VFID-123", requestId: expect.any(String) }, searchOrigin));
    fireEvent.click(screen.getByRole("button", { name: "إغلاق تفاصيل الايتم" }));
    expect(screen.queryByTitle("كانسل وبحث — تفاصيل الايتم")).toBeNull();
    expect(screen.getByTitle("بكلست")).toBe(picker);
    expect(picker.src).toBe(`${pickerOrigin}/picker-login`);
  });
  it("never shows the picklist selection action inside cancel and search", () => {
    const params = new URLSearchParams({ url: `${searchOrigin}/inventory/search`, title: "كانسل وبحث" });
    render(<MemoryRouter initialEntries={[`/view?${params}`]}><ExternalView /></MemoryRouter>);
    const frame = screen.getByTitle("كانسل وبحث") as HTMLIFrameElement;
    fireEvent(window, new MessageEvent("message", { source: frame.contentWindow, origin: pickerOrigin, data: { type: "fadshi:item-selection", text: "123" } }));
    expect(screen.queryByRole("button", { name: "عرض تفاصيل الايتم" })).toBeNull();
  });
});