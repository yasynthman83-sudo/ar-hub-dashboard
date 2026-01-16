import logo from "@/assets/logo.png";

export function DashboardHeader() {
  return (
    <header className="text-center mb-12 animate-fade-in">
      <div className="inline-flex items-center justify-center mb-6">
        <img 
          src={logo} 
          alt="فدشي" 
          className="h-20 md:h-24 w-auto"
        />
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-3">
        لوحة التحكم الرئيسية
      </h1>
      <p className="text-muted-foreground text-base max-w-md mx-auto">
        بوابتك الموحدة للوصول إلى جميع الأنظمة والخدمات
      </p>
    </header>
  );
}
