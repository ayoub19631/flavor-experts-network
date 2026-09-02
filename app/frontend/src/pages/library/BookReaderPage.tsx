import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { usePageMeta } from "@/hooks/use-page-meta";
import { addBookmark, fetchChapter, fetchPublicationBySlug, recordPublicationEvent, saveReadingProgress } from "@/lib/publications/api";
import { markdownToSafeHtml } from "@/lib/publications/sanitize";
import type { BookChapter, Publication } from "@/lib/publications/types";
import { toast } from "sonner";

export default function BookReaderPage() {
  const { slug = "", chapterSlug = "" } = useParams();
  const { t, lang, dir } = useI18n();
  const { user, isAdmin } = useAuth();
  const language = lang === "ar" ? "ar" : "en";
  const [publication, setPublication] = useState<Publication | null>(null);
  const [chapter, setChapter] = useState<BookChapter | null>(null);
  const [fontSize, setFontSize] = useState(18);

  useEffect(() => {
    fetchPublicationBySlug(slug).then(async (result) => {
      setPublication(result.data);
      if (result.data) {
        const loaded = await fetchChapter(result.data.id, chapterSlug, language);
        setChapter(loaded.data);
        if (loaded.data) {
          await recordPublicationEvent(result.data.id, "read");
          if (user) {
            const chapters = [...(result.data.book_chapters || [])].sort((a, b) => a.sort_order - b.sort_order);
            const index = Math.max(chapters.findIndex((item) => item.slug === chapterSlug), 0);
            await saveReadingProgress({
              publicationId: result.data.id,
              chapterId: loaded.data.id,
              progressPercent: chapters.length ? Math.round(((index + 1) / chapters.length) * 100) : 0,
            });
          }
        }
      }
    });
  }, [slug, chapterSlug, language, user]);

  const chapters = useMemo(
    () => [...(publication?.book_chapters || [])].sort((a, b) => a.sort_order - b.sort_order),
    [publication],
  );
  const index = chapters.findIndex((item) => item.slug === chapterSlug);
  const prev = index > 0 ? chapters[index - 1] : null;
  const next = index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : null;
  const progress = chapters.length ? Math.round(((index + 1) / chapters.length) * 100) : 0;

  usePageMeta({
    title: chapter?.title || publication?.title || t("books.title"),
    description: chapter?.summary || t("books.desc"),
    path: `/books/${slug}/chapters/${chapterSlug}`,
    locale: lang,
    noIndex: !publication || publication.visibility !== "public" || publication.status === "draft",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 mx-auto max-w-6xl px-4 sm:px-6 grid gap-6 lg:grid-cols-[240px,1fr]">
        <aside className="lg:sticky lg:top-24 h-fit rounded-xl border p-4">
          <h2 className="font-semibold mb-3">{t("reader.contents")}</h2>
          <nav className="space-y-1 text-sm">
            {chapters.map((item) => (
              <Link
                key={item.id}
                to={`/books/${slug}/chapters/${item.slug}`}
                className={`block rounded-md px-2 py-1 ${item.slug === chapterSlug ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
              >
                {item.slug.replace(/-/g, " ")}
              </Link>
            ))}
          </nav>
        </aside>
        <article>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("books.version")} {publication?.version_number || 1}</p>
          <h1 className="mt-2 text-3xl font-bold">{chapter?.title || chapterSlug}</h1>
          <p className="mt-4 text-sm rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">{t("reader.disclaimer")}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-sm text-muted-foreground">
              {t("reader.font")}
              <input
                type="range"
                min={16}
                max={24}
                value={fontSize}
                onChange={(event) => setFontSize(Number(event.target.value))}
                className="ms-2 align-middle"
                aria-label={t("reader.font")}
              />
            </label>
            <span className="text-sm text-muted-foreground">{t("reader.progress")}: {progress}%</span>
            {user && chapter && publication && (
              <Button type="button" size="sm" variant="outline" onClick={async () => {
                const result = await addBookmark({ publicationId: publication.id, chapterId: chapter.id });
                toast.success(result.error ? result.error : t("reader.bookmarked"));
              }}>{t("reader.bookmark")}</Button>
            )}
            {isAdmin && <span className="text-xs text-muted-foreground">Admin preview</span>}
          </div>
          <div
            className="prose dark:prose-invert max-w-none mt-6"
            style={{ fontSize }}
            dir={dir}
            dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(chapter?.body || chapter?.summary || "") }}
          />
          <div className="mt-10 flex justify-between gap-3">
            {prev ? <Button asChild variant="outline"><Link to={`/books/${slug}/chapters/${prev.slug}`}>{t("reader.prev")}</Link></Button> : <span />}
            {next ? <Button asChild><Link to={`/books/${slug}/chapters/${next.slug}`}>{t("reader.next")}</Link></Button> : <span />}
          </div>
        </article>
      </div>
    </div>
  );
}
