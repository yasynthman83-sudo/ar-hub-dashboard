import { ArrowRight, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";

export function BackToDashboard() {
  return (
    <Link to="/" className="back-button">
      <ArrowRight className="w-5 h-5" />
      <LayoutDashboard className="w-4 h-4" />
      <span>العودة إلى لوحة التحكم</span>
    </Link>
  );
}
