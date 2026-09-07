import { useState } from "react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { upsertNotificationPreferences } from "@/lib/phase4/notifications";
import { toast } from "sonner";

function Inner() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState(false);
  const [digest, setDigest] = useState("off");
  usePageMeta({ title: t("notif.prefs.title"), path: "/notifications/preferences", noIndex: true });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <form
        className="mx-auto max-w-lg space-y-4 px-4 pb-16 pt-24"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!user) return;
          const result = await upsertNotificationPreferences(user.id, { in_app: true, email, digest });
          toast[result.error ? "error" : "success"](result.error || t("notif.prefs.saved"));
        }}
      >
        <h1 className="text-2xl font-bold">{t("notif.prefs.title")}</h1>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={email} onChange={(event) => setEmail(event.target.checked)} />
          {t("notif.prefs.email")}
        </label>
        <label className="block text-sm">
          <span className="sr-only">{t("notif.prefs.digest.off")}</span>
          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={digest} onChange={(event) => setDigest(event.target.value)}>
            <option value="off">{t("notif.prefs.digest.off")}</option>
            <option value="daily">{t("notif.prefs.digest.daily")}</option>
            <option value="weekly">{t("notif.prefs.digest.weekly")}</option>
          </select>
        </label>
        <Button type="submit">{t("notif.prefs.save")}</Button>
      </form>
    </div>
  );
}

export default function NotificationPreferencesPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
