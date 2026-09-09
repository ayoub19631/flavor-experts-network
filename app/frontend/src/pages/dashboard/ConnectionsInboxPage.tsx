import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { fetchMemberIdsByProfileIds, fetchProfileNames } from "@/lib/connections";

type Connection = { id: string; requester_id: string; addressee_id: string; status: string; message?: string | null };

function Inner() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [incoming, setIncoming] = useState<Connection[]>([]);
  const [sent, setSent] = useState<Connection[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [memberIds, setMemberIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  usePageMeta({ title: t("dash.connections"), path: "/dashboard/connections", noIndex: true });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const [{ data: inRows, error: inErr }, { data: outRows, error: outErr }] = await Promise.all([
      supabase.from("member_connections").select("*").eq("addressee_id", user.id).eq("status", "pending"),
      supabase.from("member_connections").select("*").eq("requester_id", user.id).eq("status", "pending"),
    ]);
    if (inErr || outErr) {
      setError(t("dash.error.retry"));
      setLoading(false);
      return;
    }
    const incomingRows = (inRows as Connection[]) || [];
    const sentRows = (outRows as Connection[]) || [];
    setIncoming(incomingRows);
    setSent(sentRows);
    const ids = [...incomingRows.map((row) => row.requester_id), ...sentRows.map((row) => row.addressee_id)];
    const [nameMap, memberMap] = await Promise.all([fetchProfileNames(ids), fetchMemberIdsByProfileIds(ids)]);
    setNames(nameMap);
    setMemberIds(memberMap);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [user]);

  const labelFor = (id: string) => names[id] || t("dash.member");
  const hrefFor = (id: string) => (memberIds[id] ? `/members/${memberIds[id]}` : undefined);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-2xl px-4 space-y-6">
        <h1 className="text-2xl font-bold">{t("dash.connections")}</h1>
        {loading && <p className="text-muted-foreground" role="status">{t("dash.loading")}</p>}
        {error && (
          <div className="space-y-2">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void load()}>{t("common.retry")}</Button>
          </div>
        )}
        {!loading && !error && (
          <>
            <section>
              <h2 className="font-semibold">{t("dash.incoming")}</h2>
              {incoming.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("dash.empty.incoming")}{" "}
                  <Link to="/members" className="text-primary hover:underline">{t("dash.cta.members")}</Link>
                </p>
              )}
              {incoming.map((row) => (
                <div key={row.id} className="mt-2 flex flex-wrap gap-2 rounded-lg border p-3">
                  <span className="text-sm flex-1 min-w-0">
                    {hrefFor(row.requester_id) ? (
                      <Link to={hrefFor(row.requester_id)!} className="hover:text-primary">{labelFor(row.requester_id)}</Link>
                    ) : labelFor(row.requester_id)}
                    {row.message ? <span className="block text-muted-foreground">{row.message}</span> : null}
                  </span>
                  <Button size="sm" disabled={busy === row.id} onClick={async () => {
                    setBusy(row.id);
                    const { error: updateError } = await supabase.from("member_connections").update({ status: "accepted" }).eq("id", row.id);
                    setBusy(null);
                    toast[updateError ? "error" : "success"](updateError?.message || t("dash.accepted"));
                    void load();
                  }}>{t("dash.accept")}</Button>
                  <Button size="sm" variant="outline" disabled={busy === row.id} onClick={async () => {
                    setBusy(row.id);
                    const { error: updateError } = await supabase.from("member_connections").update({ status: "declined" }).eq("id", row.id);
                    setBusy(null);
                    toast[updateError ? "error" : "success"](updateError?.message || t("dash.declined"));
                    void load();
                  }}>{t("dash.decline")}</Button>
                </div>
              ))}
            </section>
            <section>
              <h2 className="font-semibold">{t("dash.sent")}</h2>
              {sent.length === 0 && <p className="mt-2 text-sm text-muted-foreground">{t("dash.empty.sent")}</p>}
              {sent.map((row) => (
                <div key={row.id} className="mt-2 flex flex-wrap gap-2 rounded-lg border p-3">
                  <span className="text-sm flex-1 min-w-0">
                    {hrefFor(row.addressee_id) ? (
                      <Link to={hrefFor(row.addressee_id)!} className="hover:text-primary">{labelFor(row.addressee_id)}</Link>
                    ) : labelFor(row.addressee_id)}
                  </span>
                  <Button size="sm" variant="outline" disabled={busy === row.id} onClick={async () => {
                    setBusy(row.id);
                    const { error: updateError } = await supabase.from("member_connections").update({ status: "cancelled" }).eq("id", row.id);
                    setBusy(null);
                    toast[updateError ? "error" : "success"](updateError?.message || t("dash.cancelled"));
                    void load();
                  }}>{t("dash.withdraw")}</Button>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConnectionsInboxPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
