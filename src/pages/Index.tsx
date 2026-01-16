import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardCard } from "@/components/DashboardCard";
import { dashboardLinks } from "@/config/dashboardLinks";

const Index = () => {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <DashboardHeader />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {dashboardLinks.map((link, index) => (
            <DashboardCard key={link.id} link={link} index={index} />
          ))}
        </div>

        <footer className="mt-16 text-center text-muted-foreground text-sm">
          <p>جميع الحقوق محفوظة © {new Date().getFullYear()}</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
