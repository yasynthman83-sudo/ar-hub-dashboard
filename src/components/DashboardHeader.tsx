import { LayoutDashboard } from "lucide-react";

export function DashboardHeader() {
  return (
    <header className="text-center mb-12 animate-fade-in">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
        <LayoutDashboard className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
        لوحة التحكم الرئيسية
      </h1>
      <p className="text-muted-foreground text-lg max-w-md mx-auto">
        بوابتك الموحدة للوصول إلى جميع الأنظمة والخدمات
      </p>
    </header>
  );
}
