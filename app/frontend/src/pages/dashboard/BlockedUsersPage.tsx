import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";
import { fetchProfileNames } from "@/lib/connections";
import { toast } from "sonner";

function Inner() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [rows, setRows] = useState<Array<{ blocked_id: string }>>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  usePageMeta({ title: t("dash.blocked"), path: "/dashboard/blocked", noIndex: true });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase.from("member_blocks").select("blocked_id").eq("blocker_id", user.id);
    if (queryError) {
      setError(t("dash.error.retry"));
      setLoading(false);
      return;
    }
    const next = (data as typeof rows) || [];
    setRows(next);
    setNames(await fetchProfileNames(next.map((row) => row.blocked_id)));
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-xl px-4">
        <h1 className="text-2xl font-bold">{t("dash.blocked")}</h1>
        {loading && <p className="mt-4 text-muted-foreground" role="status">{t("dash.loading")}</p>}
        {error && (
          <div className="mt-4 space-y-2">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void load()}>{t("common.retry")}</Button>
          </div>
        )}
        {!loading && !error && rows.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">{t("dash.empty.blocked")}</p>
        )}
        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li key={row.blocked_id} className="flex flex-wrap justify-between gap-2 rounded-lg border p-3">
              <span className="text-sm min-w-0">{names[row.blocked_id] || t("dash.member")}</span>
              <Button size="sm" variant="outline" disabled={busy === row.blocked_id} onClick={async () => {
                setBusy(row.blocked_id);
                const { error: deleteError } = await supabase.from("member_blocks").delete().eq("blocker_id", user?.id || "").eq("blocked_id", row.blocked_id);
                setBusy(null);
                if (deleteError) {
                  toast.error(deleteError.message);
                  return;
                }
                setRows((list) => list.filter((item) => item.blocked_id !== row.blocked_id));
              }}>{t("dash.unblock")}</Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function BlockedUsersPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
