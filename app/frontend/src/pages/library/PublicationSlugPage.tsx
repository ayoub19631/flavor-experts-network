import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { fetchPublicationBySlug } from "@/lib/publications/api";
import BookDetailPage from "./BookDetailPage";
import ResearchDetailPage from "./ResearchDetailPage";
import { useI18n } from "@/lib/i18n";

export default function PublicationSlugPage() {
  const { slug = "" } = useParams();
  const { t } = useI18n();
  const [type, setType] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicationBySlug(slug).then((result) => setType(result.data?.type || "missing"));
  }, [slug]);

  if (!type) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 px-4 text-muted-foreground">{t("library.loading")}</div>
      </div>
    );
  }
  if (type === "missing") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 px-4 text-muted-foreground">{t("library.empty")}</div>
      </div>
    );
  }
  return type === "book" ? <BookDetailPage /> : <ResearchDetailPage />;
}
