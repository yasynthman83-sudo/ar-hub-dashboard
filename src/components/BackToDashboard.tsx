import { Home } from "lucide-react";
import logo from "@/assets/logo.png";

const DASHBOARD_URL = "https://id-preview--17df9b7f-6264-446f-8e19-083c1763f987.lovable.app";

export function BackToDashboard() {
  const handleBack = () => {
    window.location.href = DASHBOARD_URL;
  };

  return (
    <button
      onClick={handleBack}
      className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-card/95 backdrop-blur-sm border border-border px-4 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
    >
      <img src={logo} alt="فدشي" className="h-8 w-auto" />
      <span className="text-card-foreground font-medium">العودة للرئيسية</span>
      <Home className="w-5 h-5 text-primary" />
    </button>
  );
}
