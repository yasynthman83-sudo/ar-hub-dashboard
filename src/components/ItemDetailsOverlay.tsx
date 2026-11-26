import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { itemSearchUrl } from "@/lib/itemDetailsBridge";

interface Props {
  text: string;
  onClose: () => void;
}

export function ItemDetailsOverlay({ text, onClose }: Props) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPortal>
        <DialogOverlay className="bg-background/80" />
        <DialogPrimitive.Content dir="rtl" aria-describedby={undefined} className="fixed inset-2 z-50 flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg sm:inset-6" onOpenAutoFocus={(event) => event.preventDefault()}>
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
            <DialogTitle className="min-w-0 text-card-foreground">تفاصيل الايتم</DialogTitle>
            <Button size="icon" variant="ghost" className="shrink-0 text-card-foreground" onClick={onClose} aria-label="إغلاق تفاصيل الايتم" title="إغلاق تفاصيل الايتم"><X /></Button>
          </header>
          <iframe src={itemSearchUrl(text)} title="كانسل وبحث — تفاصيل الايتم" className="min-h-0 w-full flex-1 border-0" allow="camera; microphone; fullscreen; geolocation; clipboard-read; clipboard-write" allowFullScreen />
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}