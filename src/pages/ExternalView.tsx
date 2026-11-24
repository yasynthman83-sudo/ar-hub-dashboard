import { useEffect, useRef, useState } from "react";
import { Home, Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { ItemDetailsOverlay } from "@/components/ItemDetailsOverlay";
import { isAllowedPortalUrl, pickerOrigin, readItemSelection } from "@/lib/itemDetailsBridge";

export default function ExternalView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const url = searchParams.get("url") || "";
  const title = searchParams.get("title") || "الموقع";
  const urlAllowed = isAllowedPortalUrl(url);
  const frame = useRef<HTMLIFrameElement>(null);
  const [selection, setSelection] = useState("");
  const [itemText, setItemText] = useState<string | null>(null);
  const isPicker = urlAllowed && new URL(url).origin === pickerOrigin;

  useEffect(() => {
    setSelection("");
    setItemText(null);
    if (!isPicker) return;
    const receive = (event: MessageEvent) => {
      const text = readItemSelection(event, frame.current?.contentWindow ?? null);
      if (text !== null) setSelection(text);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [url, isPicker]);

  const handleBack = () => {
    navigate("/");
  };

  if (!url || !urlAllowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-card-foreground text-xl">{!url ? "لم يتم تحديد رابط" : "رابط غير مسموح به"}</p>
        <Button
          onClick={handleBack}
          className="flex items-center gap-2 bg-primary px-6 py-3 rounded-lg text-primary-foreground font-medium"
        >
          <Home className="w-5 h-5" />
          العودة للرئيسية
        </Button>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {/* شريط العودة العلوي */}
      <header className="bg-card border-b border-border px-4 py-3 flex shrink-0 flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="flex items-center gap-3 bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-lg transition-all duration-200 group"
        >
          <Home className="w-5 h-5 text-primary" />
          <span className="text-card-foreground font-medium">العودة للرئيسية</span>
        </Button>
        
        <div className="flex items-center gap-3">
          <span className="text-card-foreground font-semibold">{title}</span>
          <img src={logo} alt="فدشي" className="h-8 w-auto" />
        </div>
      </header>

      {isPicker && selection && <div className="flex shrink-0 justify-center border-b border-border bg-card px-4 py-2"><Button onPointerDown={(event) => event.preventDefault()} onClick={() => setItemText(selection)}><Search />عرض تفاصيل الايتم</Button></div>}
      {/* Keep the picker mounted while details are open to preserve its state. */}
      <iframe
        ref={frame}
        src={url}
        className="min-h-0 flex-1 w-full border-0"
        title={title}
        allow="camera; microphone; fullscreen; geolocation; clipboard-read; clipboard-write"
        allowFullScreen
      />
      {itemText !== null && <ItemDetailsOverlay text={itemText} onClose={() => setItemText(null)} />}
    </div>
  );
}
