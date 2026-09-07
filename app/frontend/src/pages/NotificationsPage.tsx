import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import {
  listMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
  removeMyNotification,
  type AppNotification,
} from "@/lib/phase5/notifications";
import { safeAppPath } from "@/lib/phase5/security";

function Inner() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  usePageMeta({ title: t("notif.title"), path: "/notifications", noIndex: true });

  const load = async (before?: string) => {
    if (before) setLoadingMore(true);
    else setLoading(true);
    const result = await listMyNotifications(20, before);
    if (before) setLoadingMore(false);
    else setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setHasMore(result.data.length === 20);
    setItems((prev) => (before ? [...prev, ...result.data] : result.data));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-24">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{t("notif.title")}</h1>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/notifications/preferences">{t("notif.preferences")}</Link></Button>
            <Button size="sm" variant="outline" onClick={async () => { await markAllMyNotificationsRead(user?.id); load(); }}>
              {t("notif.mark_all")}
            </Button>
          </div>
        </div>
        {loading && <p className="mt-6 text-sm text-muted-foreground" role="status">{t("notif.loading")}</p>}
        {error && (
          <div className="mt-6 rounded-lg border border-destructive/30 p-4 text-sm">
            <p>{t("notif.error")}</p>
            <Button className="mt-2" size="sm" variant="outline" onClick={() => load()}>{t("notif.retry")}</Button>
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="mt-6 rounded-xl border p-8 text-center">
            <p className="font-medium">{t("notif.empty")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("notif.empty.desc")}</p>
          </div>
        )}
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item.id} className={`rounded-xl border p-4 ${item.is_read ? "" : "bg-primary/5"}`}>
              <Link
                to={safeAppPath(item.link)}
                onClick={() => markMyNotificationRead(item.id)}
                className="font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {item.title}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              <div className="mt-2 flex gap-3">
                {!item.is_read && (
                  <button type="button" className="text-xs text-primary" onClick={async () => { await markMyNotificationRead(item.id); load(); }}>
                    {t("notif.mark_read")}
                  </button>
                )}
                <button type="button" className="text-xs text-destructive" onClick={async () => { await removeMyNotification(item.id); load(); }}>
                  {t("notif.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
        {hasMore && (
          <Button className="mt-4" variant="outline" disabled={loadingMore} onClick={() => load(items[items.length - 1]?.created_at)}>
            {t("notif.load_more")}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
