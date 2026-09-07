import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { isMissingRelation, isPhase5WorkflowsEnabled } from "@/lib/phase5/flags";
import {
  listVerificationDocuments,
  listVerificationQueue,
  reviewVerification,
  signedVerificationUrl,
  type VerificationDocument,
  type VerificationRequest,
} from "@/lib/phase5/verification";
import { toast } from "sonner";

export default function AdminVerificationPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<VerificationRequest[]>([]);
  const [docs, setDocs] = useState<Record<string, VerificationDocument[]>>({});
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  usePageMeta({ title: t("admin.verify.title"), path: "/admin/verification", noIndex: true });

  const load = async () => {
    setLoading(true);
    const result = await listVerificationQueue({ status: status || undefined, kind: kind || undefined });
    setLoading(false);
    if (result.error) {
      setError(isMissingRelation(result.error) ? t("phase5.unavailable") : result.error);
      return;
    }
    setError(null);
    setRows(result.data);
    const next: Record<string, VerificationDocument[]> = {};
    await Promise.all(result.data.map(async (row) => {
      next[row.id] = (await listVerificationDocuments(row.id)).data;
    }));
    setDocs(next);
  };

  useEffect(() => { load(); }, [status, kind]);

  const decide = async (id: string, decision: string) => {
    if ((decision === "rejected" || decision === "needs_more_information") && reason.trim().length < 3) {
      toast.error(t("admin.verify.reason"));
      return;
    }
    setBusy(id);
    const result = await reviewVerification(id, decision, reason);
    setBusy(null);
    toast[result.error ? "error" : "success"](result.error || t("admin.verify.done"));
    if (!result.error) load();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-5xl space-y-6 px-4 pb-16 pt-24">
        <h1 className="text-3xl font-bold">{t("admin.verify.title")}</h1>
        {!isPhase5WorkflowsEnabled() && <p className="text-sm text-muted-foreground">{t("phase5.unavailable")}</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            {t("ops.filters.status")}
            <select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">{t("ops.filters.all")}</option>
              <option value="submitted">submitted</option>
              <option value="under_review">under_review</option>
              <option value="needs_more_information">needs_more_information</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
          </label>
          <label className="text-sm">
            {t("verify.kind")}
            <select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="">{t("ops.filters.all")}</option>
              <option value="professional">professional</option>
              <option value="company">company</option>
            </select>
          </label>
          <label className="text-sm">
            {t("admin.verify.reason")}
            <Input value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
        </div>
        {loading && <p className="text-sm text-muted-foreground">{t("verify.loading")}</p>}
        {error && (
          <div className="text-sm text-destructive">
            <p>{error}</p>
            <Button className="mt-2" size="sm" variant="outline" onClick={() => load()}>{t("notif.retry")}</Button>
          </div>
        )}
        {!loading && !error && rows.length === 0 && <p className="text-sm text-muted-foreground">{t("admin.verify.empty")}</p>}
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.id} className="space-y-3 rounded-xl border p-4">
              <p className="font-medium">{row.kind} · {row.status}</p>
              <p className="text-sm text-muted-foreground">{row.full_name || row.organization_name} · {row.country}</p>
              {row.notes && <p className="text-sm">{row.notes}</p>}
              {row.decision_reason && <p className="text-sm">{t("verify.reason")}: {row.decision_reason}</p>}
              <div className="flex flex-wrap gap-2">
                {(docs[row.id] || []).map((doc) => (
                  <Button key={doc.id} type="button" size="sm" variant="outline" onClick={async () => {
                    const signed = await signedVerificationUrl(doc.storage_path);
                    if (signed.url) window.open(signed.url, "_blank", "noopener,noreferrer");
                    else toast.error(signed.error || t("verify.file.fail"));
                  }}>{doc.original_name || "Document"}</Button>
                ))}
              </div>
              {["submitted", "under_review", "needs_more_information", "more_information_required"].includes(row.status) && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={!!busy} onClick={() => decide(row.id, "approved")}>{t("admin.verify.approve")}</Button>
                  <Button size="sm" variant="outline" disabled={!!busy} onClick={() => decide(row.id, "rejected")}>{t("admin.verify.reject")}</Button>
                  <Button size="sm" variant="outline" disabled={!!busy} onClick={() => decide(row.id, "needs_more_information")}>{t("admin.verify.more")}</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
