import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";
import { applyModeration, listModerationQueue, listTrash, type ModerationReport, type TrashRow } from "@/lib/phase5/moderation";
import { toast } from "sonner";

export default function AdminOpsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"reports" | "audit" | "trash">("reports");
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [audit, setAudit] = useState<Array<{ id: string; action: string; entity_type: string; reason?: string | null; created_at: string }>>([]);
  const [trash, setTrash] = useState<TrashRow[]>([]);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");
  const [entityType, setEntityType] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [priority, setPriority] = useState("");
  const [from, setFrom] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  usePageMeta({ title: t("ops.title"), path: "/admin/ops", noIndex: true });

  const loadReports = async (nextOffset = 0) => {
    setLoading(true);
    const result = await listModerationQueue({
      status: status || undefined,
      entityType: entityType || undefined,
      reason: reasonFilter || undefined,
      priority: priority || undefined,
      from: from || undefined,
      offset: nextOffset,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setReports(nextOffset ? [...reports, ...result.data] : result.data);
    setOffset(nextOffset);
  };

  useEffect(() => {
    loadReports(0);
    supabase.from("audit_logs").select("id, action, entity_type, reason, created_at").order("created_at", { ascending: false }).limit(40)
      .then(({ data, error: auditError }) => {
        if (!auditError) setAudit((data as typeof audit) || []);
      });
    listTrash().then((result) => setTrash(result.data));
  }, [status, entityType, reasonFilter, priority, from]);

  const run = async (action: "dismiss" | "hide" | "restore" | "under_review" | "warn", report?: ModerationReport, trashRow?: TrashRow) => {
    if (reason.trim().length < 3) {
      toast.error(t("ops.reason"));
      return;
    }
    const key = report?.id || trashRow?.entity_id || action;
    setBusy(key);
    const result = await applyModeration({
      reportId: report?.id,
      action,
      reason,
      entityType: report?.entity_type || trashRow?.entity_type,
      entityId: report?.entity_id || trashRow?.entity_id,
    });
    setBusy(null);
    toast[result.error ? "error" : "success"](result.error || t("ops.success"));
    if (!result.error) {
      loadReports(0);
      listTrash().then((next) => setTrash(next.data));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-5xl space-y-6 px-4 pb-16 pt-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">{t("ops.title")}</h1>
          <Button asChild variant="outline"><Link to="/admin/verification">{t("ops.verification")}</Link></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["reports", "audit", "trash"] as const).map((item) => (
            <Button key={item} type="button" variant={tab === item ? "default" : "outline"} onClick={() => setTab(item)}>
              {t(`ops.${item}`)}
            </Button>
          ))}
        </div>
        <label className="block text-sm">
          {t("ops.reason")}
          <Input value={reason} onChange={(event) => setReason(event.target.value)} required />
        </label>
        {tab === "reports" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Input aria-label={t("ops.filters.status")} placeholder={t("ops.filters.status")} value={status} onChange={(event) => setStatus(event.target.value)} />
              <Input aria-label={t("ops.filters.type")} placeholder={t("ops.filters.type")} value={entityType} onChange={(event) => setEntityType(event.target.value)} />
              <Input aria-label={t("ops.filters.reason")} placeholder={t("ops.filters.reason")} value={reasonFilter} onChange={(event) => setReasonFilter(event.target.value)} />
              <Input aria-label={t("ops.filters.priority")} placeholder={t("ops.filters.priority")} value={priority} onChange={(event) => setPriority(event.target.value)} />
              <Input type="date" aria-label={t("ops.filters.date")} value={from} onChange={(event) => setFrom(event.target.value)} />
            </div>
            {loading && <p className="text-sm text-muted-foreground" role="status">{t("ops.loading")}</p>}
            {error && <p className="text-sm text-destructive">{t("ops.error")}</p>}
            {!loading && reports.length === 0 && <p className="text-sm text-muted-foreground">{t("ops.empty")}</p>}
            <ul className="space-y-3">
              {reports.map((report) => (
                <li key={report.id} className="rounded-xl border p-4">
                  <p className="font-medium">{report.entity_type} · {report.entity_id}</p>
                  <p className="text-sm text-muted-foreground">{report.reason} · {report.status} · {report.priority || "normal"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("dismiss", report)}>{t("ops.dismiss")}</Button>
                    <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("under_review", report)}>{t("ops.review")}</Button>
                    <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("hide", report)}>{t("ops.hide")}</Button>
                    <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("restore", report)}>{t("ops.restore")}</Button>
                    <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("warn", report)}>{t("ops.warn")}</Button>
                  </div>
                </li>
              ))}
            </ul>
            {reports.length >= 20 && (
              <Button variant="outline" onClick={() => loadReports(offset + 20)}>{t("notif.load_more")}</Button>
            )}
          </div>
        )}
        {tab === "audit" && (
          <ul className="space-y-2 text-sm">
            {audit.map((row) => (
              <li key={row.id} className="rounded-lg border p-3">{row.created_at} · {row.action} · {row.entity_type} · {row.reason}</li>
            ))}
          </ul>
        )}
        {tab === "trash" && (
          <div className="space-y-3">
            {trash.length === 0 && <p className="text-sm text-muted-foreground">{t("ops.trash.empty")}</p>}
            {trash.map((row) => (
              <div key={`${row.entity_type}-${row.entity_id}`} className="rounded-xl border p-4 text-sm">
                <p className="font-medium">{row.entity_type} · {row.entity_id}</p>
                <p className="text-muted-foreground">{t("ops.owner")}: {row.owner_id || "—"} · {t("ops.deleted_by")}: {row.deleted_by || "—"}</p>
                <p>{row.reason} · {row.deleted_at}</p>
                <Button className="mt-2" size="sm" disabled={!!busy} onClick={() => run("restore", undefined, row)}>{t("ops.trash.restore")}</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
