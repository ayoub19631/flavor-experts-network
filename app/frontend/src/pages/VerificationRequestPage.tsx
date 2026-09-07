import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { isAllowedVerificationFile } from "@/lib/phase5/mentions";
import {
  fetchMyVerification,
  listVerificationDocuments,
  removeVerificationDocument,
  submitVerification,
  uploadVerificationFile,
  upsertVerificationDraft,
  type VerificationDocument,
  type VerificationRequest,
} from "@/lib/phase5/verification";
import { toast } from "sonner";

function Inner() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [docs, setDocs] = useState<VerificationDocument[]>([]);
  const [kind, setKind] = useState<"professional" | "company">("professional");
  const [fullName, setFullName] = useState("");
  const [org, setOrg] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [attested, setAttested] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  usePageMeta({ title: t("verify.title"), path: "/verification", noIndex: true });

  const locked = request ? !["draft", "needs_more_information", "more_information_required"].includes(request.status) : false;

  const hydrate = (row: VerificationRequest) => {
    setRequest(row);
    setKind(row.kind);
    setFullName(row.full_name || profile?.full_name || "");
    setOrg(row.organization_name || profile?.company || "");
    setCountry(row.country || "");
    setWebsite(row.website || "");
    setNotes(row.notes || "");
    setAttested(!!row.attestation_accepted);
  };

  const load = async () => {
    setLoading(true);
    const result = await fetchMyVerification();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    if (result.data) {
      hydrate(result.data);
      setDocs((await listVerificationDocuments(result.data.id)).data);
    } else {
      setFullName(profile?.full_name || "");
      setOrg(profile?.company || "");
    }
  };

  useEffect(() => { load(); }, [profile?.id]);

  const ensureDraft = async () => {
    const result = await upsertVerificationDraft({
      kind,
      full_name: fullName,
      organization_name: org,
      country,
      website,
      notes,
    });
    if (result.error || !result.id) {
      toast.error(result.error || t("verify.error"));
      return null;
    }
    if (!request) await load();
    return result.id;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <form
        className="mx-auto max-w-lg space-y-4 px-4 pb-16 pt-24"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!user || locked) return;
          setBusy(true);
          const id = await ensureDraft();
          if (!id) {
            setBusy(false);
            return;
          }
          const result = await submitVerification(id, attested);
          setBusy(false);
          toast[result.error ? "error" : "success"](result.error || t("verify.submitted"));
          if (!result.error) load();
        }}
      >
        <h1 className="text-2xl font-bold">{t("verify.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("verify.desc")}</p>
        {loading && <p className="text-sm text-muted-foreground" role="status">{t("verify.loading")}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {request && (
          <p className="rounded-lg border px-3 py-2 text-sm">{t("verify.status")}: {request.status}</p>
        )}
        {request?.decision_reason && (
          <p className="rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/20">
            {t("verify.reason")}: {request.decision_reason}
          </p>
        )}
        <label className="block text-sm">
          {t("verify.kind")}
          <select
            className="mt-1 h-10 w-full rounded-md border bg-background px-3"
            value={kind}
            disabled={locked}
            onChange={(event) => setKind(event.target.value as "professional" | "company")}
          >
            <option value="professional">{t("verify.kind.professional")}</option>
            <option value="company">{t("verify.kind.company")}</option>
          </select>
        </label>
        <label className="block text-sm">
          {t("verify.full_name")}
          <Input value={fullName} disabled={locked} onChange={(event) => setFullName(event.target.value)} required />
        </label>
        {kind === "company" && (
          <label className="block text-sm">
            {t("verify.org")}
            <Input value={org} disabled={locked} onChange={(event) => setOrg(event.target.value)} required />
          </label>
        )}
        <label className="block text-sm">
          {t("verify.country")}
          <Input value={country} disabled={locked} onChange={(event) => setCountry(event.target.value)} />
        </label>
        <label className="block text-sm">
          {t("verify.website")}
          <Input value={website} disabled={locked} onChange={(event) => setWebsite(event.target.value)} />
        </label>
        <label className="block text-sm">
          {t("verify.notes")}
          <Textarea value={notes} disabled={locked} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t("verify.documents")}</legend>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            disabled={locked || !user}
            aria-label={t("verify.upload")}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file || !user) return;
              const check = isAllowedVerificationFile(file);
              if (!check.ok) {
                toast.error(check.reason === "too_large" ? t("verify.file.too_large") : t("verify.file.invalid"));
                return;
              }
              const id = await ensureDraft();
              if (!id) return;
              setProgress(5);
              const result = await uploadVerificationFile(user.id, id, file, setProgress);
              if (result.error) toast.error(result.error === "invalid" ? t("verify.file.invalid") : result.error);
              else toast.success(t("verify.file.ok"));
              setDocs((await listVerificationDocuments(id)).data);
              setTimeout(() => setProgress(0), 600);
            }}
          />
          {progress > 0 && <Progress value={progress} aria-label={t("verify.progress")} />}
          <ul className="space-y-2">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>{doc.original_name || doc.storage_path.split("/").pop()}</span>
                {!locked && (
                  <Button type="button" size="sm" variant="ghost" onClick={async () => {
                    await removeVerificationDocument(doc.id, doc.storage_path);
                    setDocs((rows) => rows.filter((row) => row.id !== doc.id));
                  }}>{t("verify.remove")}</Button>
                )}
              </li>
            ))}
          </ul>
        </fieldset>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={attested} disabled={locked} onChange={(event) => setAttested(event.target.checked)} required={!locked} />
          {t("verify.attestation")}
        </label>
        {!locked && (
          <Button type="submit" disabled={busy || !attested}>
            {request && request.status !== "draft" ? t("verify.resubmit") : t("verify.submit")}
          </Button>
        )}
      </form>
    </div>
  );
}

export default function VerificationRequestPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
