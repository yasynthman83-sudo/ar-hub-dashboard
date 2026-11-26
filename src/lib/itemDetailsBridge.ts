import { dashboardLinks } from "@/config/dashboardLinks";

export const pickerOrigin = new URL(dashboardLinks[0].url).origin;
export const searchUrl = dashboardLinks[1].url;
export const searchOrigin = new URL(searchUrl).origin;

export function itemSearchUrl(query: string): string {
  const url = new URL(searchUrl);
  url.searchParams.delete("q");
  url.searchParams.delete("search");
  const text = query.trim();
  if (!text) return url.href;
  const separator = url.search ? "&" : "?";
  const encoded = encodeURIComponent(text);
  return `${url.origin}${url.pathname}${url.search}${separator}q=${encoded}&search=${encoded}${url.hash}`;
}

export function isAllowedPortalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return !url.username && !url.password && dashboardLinks.some((link) => new URL(link.url).origin === url.origin);
  } catch {
    return false;
  }
}

export function readItemSelection(
  event: Pick<MessageEvent, "origin" | "source" | "data">,
  pickerWindow: Window | null,
): string | null {
  if (!pickerWindow || event.source !== pickerWindow || event.origin !== pickerOrigin) return null;
  const data: unknown = event.data;
  if (!data || typeof data !== "object" || !("type" in data) || data.type !== "fadshi:item-selection") return null;
  if (!("text" in data) || typeof data.text !== "string" || data.text.length > 500) return null;
  return data.text.trim();
}