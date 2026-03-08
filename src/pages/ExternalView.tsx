import { Home } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import logo from "@/assets/logo.png";

// قائمة النطاقات المسموح بها فقط
const ALLOWED_ORIGINS = [
  "https://easy-fulfillment.lovable.app",
  "https://scan-find-assign.lovable.app",
  "https://baker-leave-buddy.lovable.app",
];

function isAllowedUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_ORIGINS.some((origin) => urlString.startsWith(origin));
  } catch {
    return false;
  }
}

export default function ExternalView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const url = searchParams.get("url") || "";
  const title = searchParams.get("title") || "الموقع";
  const urlAllowed = isAllowedUrl(url);

  const handleBack = () => {
    navigate("/");
  };

  if (!url || !urlAllowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-card-foreground text-xl">{!url ? "لم يتم تحديد رابط" : "رابط غير مسموح به"}</p>
        <button
          onClick={handleBack}
          className="flex items-center gap-2 bg-primary px-6 py-3 rounded-lg text-primary-foreground font-medium"
        >
          <Home className="w-5 h-5" />
          العودة للرئيسية
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* شريط العودة العلوي */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <button
          onClick={handleBack}
          className="flex items-center gap-3 bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-lg transition-all duration-200 group"
        >
          <Home className="w-5 h-5 text-primary" />
          <span className="text-card-foreground font-medium">العودة للرئيسية</span>
        </button>
        
        <div className="flex items-center gap-3">
          <span className="text-card-foreground font-semibold">{title}</span>
          <img src={logo} alt="فدشي" className="h-8 w-auto" />
        </div>
      </header>

      {/* عرض الموقع */}
      <iframe
        src={url}
        className="flex-1 w-full border-0"
        title={title}
        allow="camera; microphone; fullscreen; geolocation; clipboard-read; clipboard-write"
        allowFullScreen
      />
    </div>
  );
}
