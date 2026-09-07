import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import {
  archiveOwnPublication,
  createDraftPublication,
  createPublicationRevision,
  fetchMyPublications,
  publicHref,
} from "@/lib/publications/api";
import type { Publication } from "@/lib/publications/types";
import { toast } from "sonner";

function AuthorDashboardInner() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = useState<Publication[]>([]);
  usePageMeta({ title: t("author.dashboard"), description: t("author.dashboard.desc"), path: "/dashboard/publications", noIndex: true });

  const load = () => fetchMyPublications().then((result) => setItems(result.data));
  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-4xl px-4 sm:px-6">
        <h1 className="text-3xl font-bold">{t("author.dashboard")}</h1>
        <p className="mt-3 text-muted-foreground">{t("author.dashboard.desc")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" onClick={async () => {
            const result = await createDraftPublication({ title: "Untitled draft", type: "original_research" });
            if (result.data) navigate(`/dashboard/publications/${result.data.id}`);
            else toast.error(result.error || "Could not create draft");
          }}>{t("submit.create")}</Button>
          <Link to="/submit-publication" className="text-sm text-primary self-center">{t("submit.title")}</Link>
        </div>
        {items.length === 0 ? <p className="mt-10 text-muted-foreground">{t("mylibrary.empty")}</p> : (
          <ul className="mt-8 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border p-4 space-y-2">
                <Link to={item.status === "published" ? publicHref(item) : `/dashboard/publications/${item.id}`} className="font-medium">
                  {item.title}
                </Link>
                <p className="text-xs text-muted-foreground">{item.type} · {item.status}</p>
                {item.decision_reason && item.status !== "published" && (
                  <p className="text-sm text-amber-700 dark:text-amber-300">{t("author.notes")}: {item.decision_reason}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline"><Link to={`/dashboard/publications/${item.id}`}>Edit</Link></Button>
                  {["published", "corrected", "approved"].includes(item.status) && (
                    <Button type="button" size="sm" variant="outline" onClick={async () => {
                      const result = await createPublicationRevision(item.id);
                      if (result.data) navigate(`/dashboard/publications/${result.data.id}`);
                      else toast.error(result.error || "Revision failed");
                    }}>{t("author.new_version")}</Button>
                  )}
                  {item.status !== "archived" && (
                    <Button type="button" size="sm" variant="outline" onClick={async () => {
                      const result = await archiveOwnPublication(item.id);
                      toast[result.error ? "error" : "success"](result.error || t("author.archive"));
                      await load();
                    }}>{t("author.archive")}</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <FooterSection />
    </div>
  );
}

export default function MyLibraryPage() {
  return (
    <ProtectedRoute>
      <AuthorDashboardInner />
    </ProtectedRoute>
  );
}
