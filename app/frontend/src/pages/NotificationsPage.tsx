import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { deleteNotification, listNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from "@/lib/phase4/notifications";

function Inner() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [items, setItems] = useState<AppNotification[]>([]);
  usePageMeta({ title: lang === "ar" ? "الإشعارات" : "Notifications", path: "/notifications", noIndex: true });

  const load = () => listNotifications().then((result) => setItems(result.data));
  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-2xl px-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{lang === "ar" ? "مركز الإشعارات" : "Notification center"}</h1>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/notifications/preferences">{lang === "ar" ? "التفضيلات" : "Preferences"}</Link></Button>
            <Button size="sm" variant="outline" onClick={async () => { if (user) { await markAllNotificationsRead(user.id); load(); } }}>
              {lang === "ar" ? "تعليم الكل كمقروء" : "Mark all read"}
            </Button>
          </div>
        </div>
        <ul className="mt-6 space-y-3">
          {items.length === 0 && <li className="text-sm text-muted-foreground">{lang === "ar" ? "لا إشعارات بعد" : "No notifications yet"}</li>}
          {items.map((item) => (
            <li key={item.id} className={`rounded-xl border p-4 ${item.is_read ? "" : "bg-primary/5"}`}>
              <Link to={item.link || "/"} onClick={() => markNotificationRead(item.id)} className="font-medium">{item.title}</Link>
              <p className="text-sm text-muted-foreground mt-1">{item.body}</p>
              <button type="button" className="text-xs text-destructive mt-2" onClick={async () => { await deleteNotification(item.id); load(); }}>
                {lang === "ar" ? "حذف" : "Delete"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
