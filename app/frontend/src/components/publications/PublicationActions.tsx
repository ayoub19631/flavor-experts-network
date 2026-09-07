import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { reportContent } from "@/lib/phase4/moderation";
import { fetchRelatedPublications, publicHref, togglePublicationBookmark } from "@/lib/publications/api";
import { storedDoiHref } from "@/lib/publications/files";
import type { Publication } from "@/lib/publications/types";
import { canonicalUrl } from "@/lib/seo-routes";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import PublicationCard from "./PublicationCard";

export default function PublicationActions({ publication }: { publication: Publication }) {
  const { t } = useI18n();
  const [related, setRelated] = useState<Publication[]>([]);
  const [saved, setSaved] = useState(false);
  const doiHref = storedDoiHref(publication.doi, publication.doi_url);
  const shareUrl = canonicalUrl(publicHref(publication));

  useEffect(() => {
    fetchRelatedPublications(publication.id).then((result) => setRelated(result.data));
  }, [publication.id]);

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        <span>{t("pub.views")}: {publication.view_count || 0}</span>
        <span>{t("pub.downloads")}: {publication.download_count || 0}</span>
        {publication.publisher && <span>{t("pub.publisher")}: {publication.publisher}</span>}
        {publication.edition && <span>{t("pub.edition")}: {publication.edition}</span>}
        {publication.page_count ? <span>{t("pub.pages")}: {publication.page_count}</span> : null}
        {publication.isbn && <span>ISBN {publication.isbn}</span>}
        {doiHref && (
          <a href={doiHref} className="text-primary" target="_blank" rel="noopener noreferrer">DOI</a>
        )}
      </div>
      {publication.doi && <p className="text-xs text-muted-foreground">{t("pub.doi_note")}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={async () => {
          const result = await togglePublicationBookmark(publication.id);
          if (result.error) toast.error(result.error);
          else setSaved(result.saved);
        }}>{saved ? t("pub.saved") : t("pub.save")}</Button>
        <Button type="button" variant="outline" onClick={async () => {
          if (navigator.share) await navigator.share({ title: publication.title, url: shareUrl });
          else {
            await navigator.clipboard.writeText(shareUrl);
            toast.success(t("pub.share"));
          }
        }}>{t("pub.share")}</Button>
        <Button type="button" variant="outline" onClick={async () => {
          const result = await reportContent({
            entityType: "publication",
            entityId: publication.id,
            reason: "policy_violation",
            details: publication.slug,
          });
          toast[result.error ? "error" : "success"](result.error || t("pub.report"));
        }}>{t("pub.report")}</Button>
      </div>
      {related.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">{t("pub.related")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {related.map((item) => <PublicationCard key={item.id} publication={item} />)}
          </div>
        </section>
      )}
    </div>
  );
}
