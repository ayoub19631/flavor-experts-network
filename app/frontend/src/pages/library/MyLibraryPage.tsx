import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { fetchMyPublications, publicHref } from "@/lib/publications/api";
import type { Publication } from "@/lib/publications/types";

function MyLibraryInner() {
  const { t } = useI18n();
  const [items, setItems] = useState<Publication[]>([]);
  usePageMeta({ title: t("mylibrary.title"), description: t("mylibrary.desc"), path: "/my-library", noIndex: true });

  useEffect(() => {
    fetchMyPublications().then((result) => setItems(result.data));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-4xl px-4 sm:px-6">
        <h1 className="text-3xl font-bold">{t("mylibrary.title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("mylibrary.desc")}</p>
        <div className="mt-4 flex gap-3 text-sm">
          <Link to="/submit-publication" className="text-primary">{t("submit.title")}</Link>
          <Link to="/library" className="text-primary">{t("nav.library")}</Link>
        </div>
        {items.length === 0 ? <p className="mt-10 text-muted-foreground">{t("mylibrary.empty")}</p> : (
          <ul className="mt-8 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border p-4">
                <Link to={item.status === "published" ? publicHref(item) : `/my-library/${item.id}`} className="font-medium">
                  {item.title}
                </Link>
                <p className="text-xs text-muted-foreground mt-1">{item.type} · {item.status}</p>
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
      <MyLibraryInner />
    </ProtectedRoute>
  );
}
