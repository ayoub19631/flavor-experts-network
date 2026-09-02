import { Link } from "react-router-dom";
import { BookOpen, FileText, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { firstAuthorName, localizedAbstract, localizedTitle, publicHref } from "@/lib/publications/api";
import type { Publication } from "@/lib/publications/types";

export default function PublicationCard({ publication }: { publication: Publication }) {
  const { t, lang } = useI18n();
  const language = lang === "ar" ? "ar" : "en";
  const href = publicHref(publication);
  const isBook = publication.type === "book";

  return (
    <Card className="border-border h-full">
      <CardContent className="p-5 flex flex-col gap-3 h-full">
        <div className="flex items-start justify-between gap-3">
          {isBook ? <BookOpen className="w-5 h-5 text-primary shrink-0" /> : <FileText className="w-5 h-5 text-primary shrink-0" />}
          <div className="flex flex-wrap gap-1 justify-end">
            <Badge variant="outline">{publication.type.replace(/_/g, " ")}</Badge>
            {publication.visibility !== "public" && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="w-3 h-3" aria-hidden="true" />
                {t("library.members_only")}
              </Badge>
            )}
          </div>
        </div>
        <h3 className="font-semibold leading-snug">
          <Link to={href} className="hover:text-primary">{localizedTitle(publication, language)}</Link>
        </h3>
        {firstAuthorName(publication) && (
          <p className="text-sm text-muted-foreground">{firstAuthorName(publication)}</p>
        )}
        <p className="text-sm text-muted-foreground line-clamp-3 flex-1">{localizedAbstract(publication, language)}</p>
        <Link to={href} className="text-sm font-medium text-primary">
          {isBook ? t("library.read") : t("library.view")}
        </Link>
      </CardContent>
    </Card>
  );
}
