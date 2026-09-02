import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { createDraftPublication, fetchMyPublications } from "@/lib/publications/api";
import type { Publication } from "@/lib/publications/types";
import { toast } from "sonner";

export default function AdminPublicationsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<Publication[]>([]);
  const [creating, setCreating] = useState(false);
  usePageMeta({ title: t("admin.publications"), description: t("admin.publications.desc"), path: "/admin/publications", noIndex: true });

  const load = () => fetchMyPublications().then((result) => setItems(result.data));
  useEffect(() => { load(); }, []);

  const create = async (type: "book" | "original_research") => {
    setCreating(true);
    const result = await createDraftPublication({
      type,
      title: type === "book" ? "Untitled book" : "Untitled research",
    });
    setCreating(false);
    if (result.error || !result.data) toast.error(result.error || "Create failed");
    else window.location.assign(`/admin/publications/${result.data.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{t("admin.publications")}</h1>
            <p className="mt-2 text-muted-foreground">{t("admin.publications.desc")}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" disabled={creating} onClick={() => create("book")}>New book</Button>
            <Button type="button" variant="outline" disabled={creating} onClick={() => create("original_research")}>New research</Button>
          </div>
        </div>
        <ul className="mt-8 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border p-4 flex items-center justify-between gap-3">
              <div>
                <Link to={`/admin/publications/${item.id}`} className="font-medium">{item.title}</Link>
                <p className="text-xs text-muted-foreground">{item.type} · {item.status} · {item.slug}</p>
              </div>
              <Button asChild size="sm" variant="outline"><Link to={`/admin/publications/${item.id}`}>Edit</Link></Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
