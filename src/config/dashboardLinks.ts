// ملف إعدادات روابط لوحة التحكم
// يمكنك تعديل هذا الملف لإضافة أو حذف أو تعديل الروابط

export interface DashboardLink {
  id: string;
  title: string;
  description: string;
  url: string;
  icon: string;
  color: string;
}

export const dashboardLinks: DashboardLink[] = [
  {
    id: "1",
    title: "نظام إدارة الموارد البشرية",
    description: "إدارة الموظفين والرواتب والإجازات",
    url: "https://hr.example.com",
    icon: "Users",
    color: "blue",
  },
  {
    id: "2",
    title: "نظام المالية والمحاسبة",
    description: "الفواتير والمصروفات والتقارير المالية",
    url: "https://finance.example.com",
    icon: "Wallet",
    color: "green",
  },
  {
    id: "3",
    title: "نظام إدارة المشاريع",
    description: "متابعة المهام والمشاريع وفرق العمل",
    url: "https://projects.example.com",
    icon: "FolderKanban",
    color: "purple",
  },
  {
    id: "4",
    title: "نظام خدمة العملاء",
    description: "التذاكر والدعم الفني والتواصل",
    url: "https://support.example.com",
    icon: "Headphones",
    color: "orange",
  },
  {
    id: "5",
    title: "نظام إدارة المخزون",
    description: "المنتجات والمستودعات والشحن",
    url: "https://inventory.example.com",
    icon: "Package",
    color: "teal",
  },
  {
    id: "6",
    title: "التقارير والإحصائيات",
    description: "لوحات تحليلية وتقارير شاملة",
    url: "https://reports.example.com",
    icon: "BarChart3",
    color: "indigo",
  },
];
