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
  const { lang } = useI18n();
  const [email, setEmail] = useState(false);
  const [digest, setDigest] = useState("off");
  usePageMeta({ title: "Notification preferences", path: "/notifications/preferences", noIndex: true });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <form
        className="pt-24 pb-16 mx-auto max-w-lg px-4 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!user) return;
          const result = await upsertNotificationPreferences(user.id, { in_app: true, email, digest });
          toast[result.error ? "error" : "success"](result.error || (lang === "ar" ? "تم الحفظ" : "Saved"));
        }}
      >
        <h1 className="text-2xl font-bold">{lang === "ar" ? "تفضيلات الإشعارات" : "Notification preferences"}</h1>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={email} onChange={(event) => setEmail(event.target.checked)} />
          {lang === "ar" ? "بريد اختياري" : "Optional email alerts"}
        </label>
        <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={digest} onChange={(event) => setDigest(event.target.value)}>
          <option value="off">{lang === "ar" ? "بدون ملخص" : "No digest"}</option>
          <option value="daily">{lang === "ar" ? "يومي" : "Daily"}</option>
          <option value="weekly">{lang === "ar" ? "أسبوعي" : "Weekly"}</option>
        </select>
        <Button type="submit">{lang === "ar" ? "حفظ" : "Save"}</Button>
      </form>
    </div>
  );
}

export default function NotificationPreferencesPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
