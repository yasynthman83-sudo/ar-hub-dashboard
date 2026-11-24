import { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { searchOrigin, searchUrl } from "@/lib/itemDetailsBridge";

interface Props {
  text: string;
  onClose: () => void;
}

export function ItemDetailsOverlay({ text, onClose }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const requestId = useRef(crypto.randomUUID());
  const [status, setStatus] = useState<"loading" | "searching" | "ready" | "unavailable">("loading");

  useEffect(() => {
    const timeout = window.setTimeout(() => setStatus("unavailable"), 15000);
    const receive = (event: MessageEvent) => {
      if (event.origin !== searchOrigin || event.source !== frame.current?.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "fadshi:search-ready") {
        window.clearTimeout(timeout);
        setStatus("searching");
        frame.current?.contentWindow?.postMessage({ type: "fadshi:search-item", text, requestId: requestId.current }, searchOrigin);
      }
      if (data.type === "fadshi:search-applied" && data.requestId === requestId.current) setStatus("ready");
    };
    window.addEventListener("message", receive);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", receive);
    };
  }, [text]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPortal>
        <DialogOverlay className="bg-background/80" />
        <DialogPrimitive.Content dir="rtl" className="fixed inset-2 z-50 flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg sm:inset-6" onOpenAutoFocus={(event) => event.preventDefault()}>
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-card-foreground"><Search className="h-5 w-5 shrink-0" />عرض تفاصيل الايتم</DialogTitle>
              <DialogDescription className="mt-1 break-all text-muted-foreground">{text}</DialogDescription>
            </div>
            <Button size="icon" variant="ghost" className="shrink-0 text-card-foreground" onClick={onClose} aria-label="إغلاق تفاصيل الايتم" title="إغلاق تفاصيل الايتم"><X /></Button>
          </header>
          {(status === "loading" || status === "searching") && <div role="status" className="flex shrink-0 items-center gap-2 px-4 py-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />{status === "loading" ? "جارٍ فتح بوابة البحث…" : "جارٍ البحث…"}</div>}
          {status === "unavailable" && <p role="status" className="shrink-0 px-4 py-2 text-sm text-muted-foreground">لم يتصل البحث التلقائي. قد يلزم تسجيل الدخول أو تفعيل الربط في بوابة البحث.</p>}
          <iframe ref={frame} src={searchUrl} title="كانسل وبحث — تفاصيل الايتم" className="min-h-0 w-full flex-1 border-0" allow="camera; microphone; fullscreen; geolocation; clipboard-read; clipboard-write" allowFullScreen />
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}