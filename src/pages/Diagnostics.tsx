import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BackToDashboard } from "@/components/BackToDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DiagnosticState {
  swStatus: "checking" | "active" | "installing" | "waiting" | "none" | "unsupported";
  swScope: string;
  pushPermission: string;
  pushSubscription: boolean;
  subscriberCount: number;
  lastSubscription: string | null;
  testResult: { sent: number; failed: number; total: number; errors: string[] } | null;
  loading: boolean;
}

const Diagnostics = () => {
  const [state, setState] = useState<DiagnosticState>({
    swStatus: "checking",
    swScope: "",
    pushPermission: "unknown",
    pushSubscription: false,
    subscriberCount: 0,
    lastSubscription: null,
    testResult: null,
    loading: false,
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
      const sub = await reg.pushManager?.getSubscription();
      hasSub = !!sub;
    } catch {}

    setState((s) => ({
      ...s,
      swStatus: status,
      swScope: reg.scope,
      pushPermission: pushPerm,
      pushSubscription: hasSub,
    }));
  };

  const checkSubscribers = async () => {
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setState((s) => ({
        ...s,
        subscriberCount: data.length,
        lastSubscription: data.length > 0 ? data[0].created_at : null,
      }));
    }
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
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
          },
          body: JSON.stringify({
            action: "send",
            title: "🧪 إشعار تجريبي",
            body: "هذا إشعار تجريبي من صفحة التشخيص",
            url: "/diagnostics",
          }),
        }
      );

      const result = await res.json();
      setState((s) => ({ ...s, testResult: result }));
      toast.success(`تم الإرسال: ${result.sent} نجح، ${result.failed} فشل`);
    } catch (err: any) {
      toast.error("فشل إرسال الإشعار: " + err.message);
    } finally {
      setState((s) => ({ ...s, loading: false }));
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-600 text-white";
      case "granted": return "bg-green-600 text-white";
      case "installing":
      case "waiting": return "bg-yellow-600 text-white";
      default: return "bg-destructive text-destructive-foreground";
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        <BackToDashboard />
        <h1 className="text-2xl font-bold text-foreground">🔧 تشخيص نظام الإشعارات</h1>

        {/* Service Worker Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">حالة Service Worker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">الحالة</span>
              <Badge className={statusColor(state.swStatus)}>{state.swStatus}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">النطاق</span>
              <span className="text-card-foreground text-sm font-mono">{state.swScope || "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">إشعارات الدفع</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">صلاحية الإشعارات</span>
              <Badge className={statusColor(state.pushPermission)}>{state.pushPermission}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">اشتراك Push نشط</span>
              <Badge className={state.pushSubscription ? "bg-green-600 text-white" : "bg-destructive text-destructive-foreground"}>
                {state.pushSubscription ? "نعم ✅" : "لا ❌"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Subscribers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">المشتركين</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">عدد المشتركين</span>
              <span className="text-2xl font-bold text-primary">{state.subscriberCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">آخر اشتراك</span>
              <span className="text-card-foreground text-sm">
                {state.lastSubscription
                  ? new Date(state.lastSubscription).toLocaleString("ar-SA")
                  : "—"}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={checkSubscribers}>
              🔄 تحديث
            </Button>
          </CardContent>
        </Card>

        {/* Test Push */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">إرسال إشعار تجريبي</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={sendTestPush} disabled={state.loading} className="w-full">
              {state.loading ? "جاري الإرسال..." : "🚀 إرسال إشعار تجريبي"}
            </Button>

            {state.testResult && (
              <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">إجمالي</span>
                  <span className="text-card-foreground font-bold">{state.testResult.total}</span>
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
                    {state.testResult.errors.map((e, i) => (
                      <p key={i}>⚠️ {e}</p>
                    ))}
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
