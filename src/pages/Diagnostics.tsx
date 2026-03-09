import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Bell, Smartphone, Wifi, WifiOff } from "lucide-react";
import { BackToDashboard } from "@/components/BackToDashboard";

export default function Diagnostics() {
  const [swState, setSwState] = useState<{
    registered: boolean;
    active: boolean;
    waiting: boolean;
    installing: boolean;
    scope: string | null;
  }>({
    registered: false,
    active: false,
    waiting: false,
    installing: false,
    scope: null,
  });

  const [pushSubscription, setPushSubscription] = useState<{
    subscribed: boolean;
    endpoint: string | null;
  }>({
    subscribed: false,
    endpoint: null,
  });

  const [dbSubscriptions, setDbSubscriptions] = useState<number>(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [lastPing, setLastPing] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const checkServiceWorker = async () => {
    if (!("serviceWorker" in navigator)) {
      toast.error("❌ Service Worker غير مدعوم في هذا المتصفح");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        setSwState({
          registered: true,
          active: !!registration.active,
          waiting: !!registration.waiting,
          installing: !!registration.installing,
          scope: registration.scope,
        });

        // Check push subscription
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          setPushSubscription({
            subscribed: true,
            endpoint: sub.endpoint,
          });
        }

        // Ping the service worker
        if (registration.active) {
          const messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = (event) => {
            if (event.data && event.data.type === "PONG") {
              setLastPing(new Date(event.data.timestamp).toLocaleTimeString("ar"));
              toast.success("💓 Service Worker يستجيب بنجاح!");
            }
          };

          navigator.serviceWorker.controller?.postMessage(
            { type: "PING" },
            [messageChannel.port2]
          );
        }
      } else {
        setSwState({
          registered: false,
          active: false,
          waiting: false,
          installing: false,
          scope: null,
        });
      }
    } catch (error: any) {
      toast.error("❌ خطأ في فحص Service Worker: " + error.message);
    }
  };

  const checkDatabaseSubscriptions = async () => {
    try {
      const { count, error } = await supabase
        .from("push_subscriptions")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      setDbSubscriptions(count || 0);
    } catch (error: any) {
      toast.error("❌ خطأ في قراءة قاعدة البيانات: " + error.message);
    }
  };

  const sendTestNotification = async () => {
    try {
      toast.loading("🔄 جاري إرسال إشعار تجريبي...");
      
      // Insert a test record to trigger the webhook
      const { error } = await supabase
        .from("notification1")
        .insert({ id: `test-${Date.now()}`, JOP: "اختبار إشعار" });

      if (error) throw error;
      
      toast.success("✅ تم إرسال الإشعار التجريبي بنجاح!");
    } catch (error: any) {
      toast.error("❌ فشل إرسال الإشعار: " + error.message);
    }
  };

  useEffect(() => {
    checkServiceWorker();
    checkDatabaseSubscriptions();

    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-accent/10 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <BackToDashboard />
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              🔍 تشخيص نظام الإشعارات
            </h1>
            <p className="text-muted-foreground mt-2">
              تحقق من حالة Service Worker وإعدادات الإشعارات
            </p>
          </div>
          <Button onClick={() => { checkServiceWorker(); checkDatabaseSubscriptions(); }} size="sm">
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
        </div>

        <Separator />

        {/* Network Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {isOnline ? <Wifi className="h-5 w-5 text-success" /> : <WifiOff className="h-5 w-5 text-destructive" />}
                حالة الاتصال
              </CardTitle>
              <Badge variant={isOnline ? "default" : "destructive"}>
                {isOnline ? "متصل" : "غير متصل"}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Service Worker Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Service Worker
            </CardTitle>
            <CardDescription>حالة Service Worker المسؤول عن الإشعارات في الخلفية</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">مسجل</p>
                <Badge variant={swState.registered ? "default" : "destructive"}>
                  {swState.registered ? "✅ نعم" : "❌ لا"}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">نشط</p>
                <Badge variant={swState.active ? "default" : "destructive"}>
                  {swState.active ? "✅ نعم" : "❌ لا"}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">قيد الانتظار</p>
                <Badge variant={swState.waiting ? "secondary" : "outline"}>
                  {swState.waiting ? "⏳ نعم" : "لا"}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">قيد التثبيت</p>
                <Badge variant={swState.installing ? "secondary" : "outline"}>
                  {swState.installing ? "⏳ نعم" : "لا"}
                </Badge>
              </div>
            </div>
            {swState.scope && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">النطاق (Scope)</p>
                <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                  {swState.scope}
                </code>
              </div>
            )}
            {lastPing && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">آخر استجابة (Ping)</p>
                <Badge variant="outline" className="font-mono">
                  💓 {lastPing}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Push Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              اشتراك الإشعارات
            </CardTitle>
            <CardDescription>حالة اشتراك هذا الجهاز في إشعارات الدفع</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">الحالة</p>
              <Badge variant={pushSubscription.subscribed ? "default" : "destructive"}>
                {pushSubscription.subscribed ? "✅ مشترك" : "❌ غير مشترك"}
              </Badge>
            </div>
            {pushSubscription.endpoint && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Endpoint</p>
                <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                  {pushSubscription.endpoint.substring(0, 80)}...
                </code>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">إذن الإشعارات</p>
              <Badge
                variant={
                  notificationPermission === "granted"
                    ? "default"
                    : notificationPermission === "denied"
                    ? "destructive"
                    : "secondary"
                }
              >
                {notificationPermission === "granted" && "✅ ممنوح"}
                {notificationPermission === "denied" && "❌ مرفوض"}
                {notificationPermission === "default" && "⏳ لم يُطلب بعد"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Database Subscriptions */}
        <Card>
          <CardHeader>
            <CardTitle>اشتراكات قاعدة البيانات</CardTitle>
            <CardDescription>عدد الأجهزة المشتركة في نظام الإشعارات</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">{dbSubscriptions}</div>
            <p className="text-sm text-muted-foreground mt-2">جهاز مشترك حالياً</p>
          </CardContent>
        </Card>

        {/* Test Button */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle>اختبار الإشعارات</CardTitle>
            <CardDescription>
              أرسل إشعار تجريبي لجميع الأجهزة المشتركة للتحقق من عمل النظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={sendTestNotification} className="w-full" size="lg">
              <Bell className="h-5 w-5 ml-2" />
              إرسال إشعار تجريبي الآن
            </Button>
          </CardContent>
        </Card>

        {/* Troubleshooting Tips */}
        <Card className="border-warning/20 bg-gradient-to-br from-warning/5 to-warning/10">
          <CardHeader>
            <CardTitle className="text-warning">💡 نصائح لحل المشاكل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-2">
              <p className="font-bold">📱 على Android:</p>
              <ul className="list-disc list-inside space-y-1 mr-4 text-muted-foreground">
                <li>تأكد من تثبيت التطبيق كـ PWA على الشاشة الرئيسية</li>
                <li>اذهب إلى الإعدادات → التطبيقات → Chrome → البطارية → "غير مقيد"</li>
                <li>تأكد من تفعيل الإشعارات في إعدادات التطبيق</li>
                <li>قد يستغرق Chrome دقائق لاستقبال Push بعد إغلاق التطبيق</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-bold">🍎 على iOS:</p>
              <ul className="list-disc list-inside space-y-1 mr-4 text-muted-foreground">
                <li>⚠️ iOS حالياً لا يدعم Push Notifications للـ PWA</li>
                <li>الإشعارات تعمل فقط عندما يكون التطبيق مفتوحاً</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
