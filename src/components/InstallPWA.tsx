import { useState, useEffect, forwardRef } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallPWA = forwardRef<HTMLDivElement>((_, ref) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    if (isStandalone) return;

    // Detect iOS
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isiOS);

    if (isiOS) {
      // Show iOS install guide if not dismissed recently
      const dismissed = localStorage.getItem("pwa-ios-dismissed");
      if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setShowBanner(true);
        setShowIOSGuide(true);
      }
      return;
    }

    // Android/Desktop: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    if (isIOS) {
      localStorage.setItem("pwa-ios-dismissed", Date.now().toString());
    }
  };

  if (!showBanner) return null;

  return (
    <div ref={ref} className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="bg-gradient-to-br from-primary/10 via-card to-secondary/10 border-2 border-primary/20 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-xl p-3 shadow-lg">
              <Smartphone className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-foreground text-base">📱 تثبيت التطبيق على الهاتف</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                الإشعارات تعمل <strong className="text-primary">فقط</strong> على الهاتف المُثبت عليه التطبيق
              </p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {showIOSGuide ? (
          <div className="text-xs text-foreground bg-gradient-to-br from-warning/20 to-warning/5 border border-warning/30 rounded-xl p-4 space-y-2">
            <p className="font-bold text-base flex items-center gap-2">
              <span>🍎</span>
              <span>خطوات التثبيت على iPhone</span>
            </p>
            <div className="space-y-1.5 mr-2">
              <p>1️⃣ اضغط على زر المشاركة <span className="inline-block text-lg">⬆️</span> أسفل الشاشة</p>
              <p>2️⃣ اختر <strong className="text-warning">"إضافة إلى الشاشة الرئيسية"</strong></p>
              <p>3️⃣ اضغط <strong className="text-warning">"إضافة"</strong></p>
              <p>4️⃣ افتح التطبيق من الشاشة الرئيسية واسمح بالإشعارات</p>
            </div>
            <div className="mt-3 pt-3 border-t border-warning/20">
              <p className="font-bold text-destructive flex items-center gap-1.5">
                <span className="text-base">⚠️</span>
                <span>مهم جداً:</span>
              </p>
              <p className="mt-1">الإشعارات <strong>لن تعمل</strong> إلا بعد التثبيت على الشاشة الرئيسية وفتح التطبيق منها!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-foreground bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-xl p-4 space-y-2">
              <p className="font-bold text-base flex items-center gap-2">
                <span>🤖</span>
                <span>خطوات التثبيت على Android</span>
              </p>
              <div className="space-y-1.5 mr-2">
                <p>1️⃣ اضغط على زر "تثبيت الآن" أدناه</p>
                <p>2️⃣ اسمح بالتثبيت عند ظهور النافذة</p>
                <p>3️⃣ افتح التطبيق من الشاشة الرئيسية واسمح بالإشعارات</p>
              </div>
              <div className="mt-3 pt-3 border-t border-primary/20">
                <p className="font-bold text-destructive flex items-center gap-1.5">
                  <span className="text-base">⚠️</span>
                  <span>مهم جداً:</span>
                </p>
                <p className="mt-1">الإشعارات تعمل <strong>فقط على الهاتف</strong> وبعد تثبيت التطبيق والسماح بالإشعارات!</p>
              </div>
            </div>
            <Button onClick={handleInstall} className="w-full shadow-lg" size="lg">
              <Download className="h-5 w-5 ml-2" />
              تثبيت الآن على الهاتف
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});
