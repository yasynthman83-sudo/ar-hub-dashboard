import {
  Users,
  Wallet,
  FolderKanban,
  Headphones,
  Package,
  BarChart3,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import type { DashboardLink } from "@/config/dashboardLinks";

const iconMap: Record<string, LucideIcon> = {
  Users,
  Wallet,
  FolderKanban,
  Headphones,
  Package,
  BarChart3,
};

const colorClasses: Record<string, string> = {
  blue: "bg-primary/10 text-primary",
  green: "bg-emerald-100 text-emerald-600",
  purple: "bg-violet-100 text-violet-600",
  orange: "bg-orange-100 text-orange-600",
  teal: "bg-teal-100 text-teal-600",
  indigo: "bg-indigo-100 text-indigo-600",
};

interface DashboardCardProps {
  link: DashboardLink;
  index: number;
}

export function DashboardCard({ link, index }: DashboardCardProps) {
  const Icon = iconMap[link.icon] || Package;
  const colorClass = colorClasses[link.color] || colorClasses.blue;

  const handleClick = () => {
    // فتح الرابط في نفس التبويب
    window.location.href = link.url;
  };

  return (
    <button
      onClick={handleClick}
      className="dashboard-card w-full text-right group"
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${colorClass} transition-transform duration-300 group-hover:scale-110`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
              {link.title}
            </h3>
            <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
            {link.description}
          </p>
        </div>
      </div>
    </button>
  );
}
