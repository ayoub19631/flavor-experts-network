import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { createDraftPublication, fetchMyPublications, listReviewQueue, reviewPublication } from "@/lib/publications/api";
import { PUBLICATION_TYPES, PUBLICATION_STATUSES, type Publication } from "@/lib/publications/types";
import { toast } from "sonner";

export default function AdminPublicationsPage() {
  const { t } = useI18n();
  const [mine, setMine] = useState<Publication[]>([]);
  const [queue, setQueue] = useState<Publication[]>([]);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [language, setLanguage] = useState("");
  const [reason, setReason] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  usePageMeta({ title: t("admin.publications"), description: t("admin.publications.desc"), path: "/admin/publications", noIndex: true });

  const load = async () => {
    const [own, review] = await Promise.all([
      fetchMyPublications(),
      listReviewQueue({ status: status || undefined, type: type || undefined, language: language || undefined }),
    ]);
    setMine(own.data);
    setQueue(review.data);
    if (review.error) toast.error(review.error);
  };

  useEffect(() => { load(); }, [status, type, language]);

  const act = async (id: string, action: "approve" | "request_revision" | "reject" | "schedule" | "archive" | "restore" | "start_review") => {
    if ((action === "request_revision" || action === "reject") && !reason.trim()) {
      toast.error(t("review.reason"));
      return;
    }
    const result = await reviewPublication(id, action, reason || undefined, action === "schedule" ? scheduledAt || undefined : undefined);
    toast[result.error ? "error" : "success"](result.error || action);
    setReason("");
    await load();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-5xl px-4 sm:px-6 space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{t("admin.publications")}</h1>
            <p className="mt-2 text-muted-foreground">{t("admin.publications.desc")}</p>
          </div>
          <Button type="button" onClick={async () => {
            const result = await createDraftPublication({ type: "original_research", title: "Untitled research" });
            if (result.data) window.location.assign(`/admin/publications/${result.data.id}`);
          }}>New draft</Button>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t("review.queue")}</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Status</option>
              {PUBLICATION_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">Type</option>
              {PUBLICATION_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="">Language</option>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t("review.reason")} rows={3} />
          <Input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
          <ul className="space-y-3">
            {queue.map((item) => (
              <li key={item.id} className="rounded-xl border p-4 space-y-2">
                <Link to={`/admin/publications/${item.id}`} className="font-medium">{item.title}</Link>
                <p className="text-xs text-muted-foreground">{item.type} · {item.status} · {item.primary_language}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => act(item.id, "start_review")}>Review</Button>
                  <Button size="sm" onClick={() => act(item.id, "approve")}>{t("review.approve")}</Button>
                  <Button size="sm" variant="outline" onClick={() => act(item.id, "request_revision")}>{t("review.revision")}</Button>
                  <Button size="sm" variant="outline" onClick={() => act(item.id, "reject")}>{t("review.reject")}</Button>
                  <Button size="sm" variant="outline" onClick={() => act(item.id, "schedule")}>{t("review.schedule")}</Button>
                  <Button size="sm" variant="outline" onClick={() => act(item.id, "archive")}>{t("author.archive")}</Button>
                  <Button size="sm" variant="outline" onClick={() => act(item.id, "restore")}>{t("review.restore")}</Button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{t("mylibrary.title")}</h2>
          <ul className="space-y-3">
            {mine.map((item) => (
              <li key={item.id} className="rounded-xl border p-4 flex items-center justify-between gap-3">
                <div>
                  <Link to={`/admin/publications/${item.id}`} className="font-medium">{item.title}</Link>
                  <p className="text-xs text-muted-foreground">{item.type} · {item.status}</p>
                </div>
                <Button asChild size="sm" variant="outline"><Link to={`/admin/publications/${item.id}`}>Edit</Link></Button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
