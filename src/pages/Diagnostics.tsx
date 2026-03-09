import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BackToDashboard } from "@/components/BackToDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Subscriber {
  id: string;
  endpoint: string;
  device_type?: string;
  created_at: string;
}

interface DiagnosticState {
  swStatus: "checking" | "active" | "installing" | "waiting" | "none" | "unsupported";
  swScope: string;
  pushPermission: string;
  pushSubscription: boolean;
  subscribers: Subscriber[];
  testResult: { sent: number; failed: number; total: number; errors: string[] } | null;
  loading: boolean;
  sendTarget: "all" | "mobile" | "desktop";
}

const Diagnostics = () => {
  const [state, setState] = useState<DiagnosticState>({
    swStatus: "checking",
    swScope: "",
    pushPermission: "unknown",
    pushSubscription: false,
    subscribers: [],
    testResult: null,
    loading: false,
    sendTarget: "mobile",
  });

  useEffect(() => {
    checkServiceWorker();
    checkSubscribers();
  }, []);

  const checkServiceWorker = async () => {
    if (!("serviceWorker" in navigator)) {
      setState((s) => ({ ...s, swStatus: "unsupported" }));
      return;
    }
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      setState((s) => ({ ...s, swStatus: "none", swScope: "" }));
      return;
    }
    const status = reg.active ? "active" : reg.installing ? "installing" : reg.waiting ? "waiting" : "none";
    const pushPerm = "Notification" in window ? Notification.permission : "unsupported";
    let hasSub = false;
    try {
      hasSub = !!(await reg.pushManager?.getSubscription());
    } catch {}
    setState((s) => ({ ...s, swStatus: status, swScope: reg.scope, pushPermission: pushPerm, pushSubscription: hasSub }));
  };

  const checkSubscribers = async () => {
    const { data } = await supabase
      .from("push_subscriptions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setState((s) => ({ ...s, subscribers: data as any }));
    }
  };

  const deleteSubscription = async (id: string) => {
    await supabase.from("push_subscriptions").delete().eq("id", id);
    toast.success("تم حذف الاشتراك");
    checkSubscribers();
  };

  const sendTestPush = async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/web-push`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}`, apikey: anonKey },
          body: JSON.stringify({
            action: "send",
            title: "🧪 إشعار تجريبي",
            body: "هذا إشعار تجريبي من صفحة التشخيص",
            url: "/diagnostics",
            target: state.sendTarget,
          }),
        }
      );
      const result = await res.json();
      setState((s) => ({ ...s, testResult: result }));
      toast.success(`تم الإرسال: ${result.sent} نجح، ${result.failed} فشل`);
    } catch (err: any) {
      toast.error("فشل: " + err.message);
    } finally {
      setState((s) => ({ ...s, loading: false }));
    }
  };

  const mobileCount = state.subscribers.filter((s) => ["android", "ios", "mobile"].includes(s.device_type || "")).length;
  const desktopCount = state.subscribers.filter((s) => s.device_type === "desktop").length;
  const unknownCount = state.subscribers.filter((s) => !s.device_type || s.device_type === "unknown").length;

  const statusBadge = (val: string, good: string) => (
    <span className={`px-2 py-1 rounded text-xs font-bold ${val === good ? "bg-green-600/20 text-green-400" : "bg-destructive/20 text-destructive"}`}>
      {val}
    </span>
  );

  const deviceIcon = (type?: string) => {
    if (type === "android") return "🤖";
    if (type === "ios") return "🍎";
    if (type === "mobile") return "📱";
    if (type === "desktop") return "💻";
    return "❓";
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        <BackToDashboard />
        <h1 className="text-2xl font-bold text-foreground">🔧 تشخيص نظام الإشعارات</h1>

        {/* SW & Push Status */}
        <Card>
          <CardHeader><CardTitle className="text-lg">حالة النظام</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Service Worker</span>
              {statusBadge(state.swStatus, "active")}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">صلاحية الإشعارات</span>
              {statusBadge(state.pushPermission, "granted")}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">اشتراك Push نشط</span>
              {statusBadge(state.pushSubscription ? "نعم" : "لا", "نعم")}
            </div>
          </CardContent>
        </Card>

        {/* Subscribers */}
        <Card>
          <CardHeader><CardTitle className="text-lg">المشتركين ({state.subscribers.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-4 text-sm">
              <span>📱 موبايل: <strong className="text-primary">{mobileCount}</strong></span>
              <span>💻 سطح المكتب: <strong className="text-primary">{desktopCount}</strong></span>
              {unknownCount > 0 && <span>❓ غير محدد: <strong>{unknownCount}</strong></span>}
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {state.subscribers.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/50 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{deviceIcon(sub.device_type)}</span>
                    <div className="truncate">
                      <span className="text-muted-foreground">{sub.endpoint.substring(0, 60)}...</span>
                      <br />
                      <span className="text-muted-foreground">{new Date(sub.created_at).toLocaleString("ar-SA")}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => deleteSubscription(sub.id)}>
                    🗑️
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={checkSubscribers}>🔄 تحديث</Button>
          </CardContent>
        </Card>

        {/* Test Push */}
        <Card>
          <CardHeader><CardTitle className="text-lg">إرسال إشعار تجريبي</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {(["mobile", "desktop", "all"] as const).map((t) => (
                <Button
                  key={t}
                  variant={state.sendTarget === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setState((s) => ({ ...s, sendTarget: t }))}
                >
                  {t === "mobile" ? "📱 موبايل فقط" : t === "desktop" ? "💻 سطح المكتب" : "🌐 الكل"}
                </Button>
              ))}
            </div>
            <Button onClick={sendTestPush} disabled={state.loading} className="w-full">
              {state.loading ? "جاري الإرسال..." : "🚀 إرسال إشعار تجريبي"}
            </Button>

            {state.testResult && (
              <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">إجمالي</span>
                  <span className="font-bold">{state.testResult.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">نجح</span>
                  <span className="text-green-400 font-bold">{state.testResult.sent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">فشل</span>
                  <span className="text-red-400 font-bold">{state.testResult.failed}</span>
                </div>
                {state.testResult.total > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">معدل النجاح</span>
                    <span className="text-primary font-bold">
                      {Math.round((state.testResult.sent / state.testResult.total) * 100)}%
                    </span>
                  </div>
                )}
                {state.testResult.errors.length > 0 && (
                  <div className="mt-2 text-xs text-destructive space-y-1">
                    {state.testResult.errors.map((e, i) => <p key={i}>⚠️ {e}</p>)}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Diagnostics;
