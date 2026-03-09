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
    title: "بكلست",
    description: "نظام تجهيز الطلبات",
    url: "https://easy-fulfillment.lovable.app/picker-login",
    icon: "ClipboardList",
    color: "blue",
  },
  {
    id: "2",
    title: "كانسل وبحث",
    description: "البحث وإلغاء الطلبات",
    url: "https://scan-find-assign.lovable.app/search",
    icon: "Search",
    color: "orange",
  },
  {
    id: "3",
    title: "الاجازات",
    description: "إدارة الإجازات والطلبات",
    url: "https://baker-leave-buddy.lovable.app/login",
    icon: "Package",
    color: "green",
  },
  {
    id: "diagnostics",
    title: "تشخيص الإشعارات",
    description: "فحص حالة نظام الإشعارات",
    url: "/diagnostics",
    icon: "Activity",
    color: "purple",
  },
];
