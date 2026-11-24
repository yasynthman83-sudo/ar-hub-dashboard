import { useRef, useState } from "react";
import { Check, ClipboardPaste, Copy, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { searchUrl } from "@/lib/itemDetailsBridge";

interface Props {
  text: string;
  onClose: () => void;
}

export function ItemDetailsOverlay({ text, onClose }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(text);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const paste = async () => {
    setError("");
    setCopied(false);
    if (!navigator.clipboard?.readText) {
      setError("قراءة الحافظة غير متاحة. يمكنك لصق النص يدويًا في الحقل.");
      input.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const clipboardText = (await navigator.clipboard.readText()).trim();
      if (!clipboardText) setError("الحافظة فارغة.");
      else setValue(clipboardText);
    } catch {
      setError("تعذّر الوصول للحافظة. يمكنك لصق النص يدويًا في الحقل.");
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  };

  const copy = async () => {
    setError("");
    setCopied(false);
    if (!value.trim()) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value.trim());
      setCopied(true);
    } catch {
      input.current?.focus();
      input.current?.select();
      setError("تعذّر النسخ. يمكنك نسخ النص المحدد يدويًا.");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPortal>
        <DialogOverlay className="bg-background/80" />
        <DialogPrimitive.Content dir="rtl" className="fixed inset-2 z-50 flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg sm:inset-6" onOpenAutoFocus={(event) => event.preventDefault()}>
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-card-foreground"><Search className="h-5 w-5 shrink-0" />عرض تفاصيل الايتم</DialogTitle>
              <DialogDescription className="mt-1 text-muted-foreground">كانسل وبحث</DialogDescription>
            </div>
            <Button size="icon" variant="ghost" className="shrink-0 text-card-foreground" onClick={onClose} aria-label="إغلاق تفاصيل الايتم" title="إغلاق تفاصيل الايتم"><X /></Button>
          </header>
          <div className="shrink-0 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Input ref={input} aria-label="نص الايتم" placeholder="VFID أو UPC" dir="auto" value={value} onChange={(event) => { setValue(event.target.value); setCopied(false); setError(""); }} className="min-w-0 flex-1" />
              <Button size="icon" variant="outline" disabled={busy} onClick={paste} aria-label="لصق من الحافظة" title="لصق من الحافظة"><ClipboardPaste /></Button>
              <Button size="icon" variant="outline" disabled={!value.trim() || busy} onClick={copy} aria-label="نسخ نص الايتم" title="نسخ نص الايتم">{copied ? <Check /> : <Copy />}</Button>
            </div>
            {copied && <p role="status" className="mt-2 text-sm text-muted-foreground">تم النسخ</p>}
            {error && <p role="alert" className="mt-2 text-sm text-muted-foreground">{error}</p>}
          </div>
          <iframe src={searchUrl} title="كانسل وبحث — تفاصيل الايتم" className="min-h-0 w-full flex-1 border-0" allow="camera; microphone; fullscreen; geolocation; clipboard-read; clipboard-write" allowFullScreen />
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}