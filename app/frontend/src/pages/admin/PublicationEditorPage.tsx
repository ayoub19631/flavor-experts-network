import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { usePageMeta } from "@/hooks/use-page-meta";
import {
  archiveOwnPublication,
  createPublicationRevision,
  fetchPublicationById,
  fetchReviewActions,
  publicHref,
  publishPublication,
  replaceAuthors,
  replaceReferences,
  snapshotPublication,
  submitPublication,
  updatePublication,
  upsertChapter,
  upsertTranslation,
} from "@/lib/publications/api";
import { uploadPublicationFile } from "@/lib/publications/files";
import { slugifyPublication } from "@/lib/publications/slug";
import { validateForPublish } from "@/lib/publications/validation";
import { PUBLICATION_TYPES, PUBLICATION_VISIBILITIES, type Publication, type PublicationAuthor, type PublicationReference } from "@/lib/publications/types";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export default function PublicationEditorPage() {
  const { id = "" } = useParams();
  const { isAdmin, user } = useAuth();
  const { t } = useI18n();
  const [publication, setPublication] = useState<Publication | null>(null);
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [slug, setSlug] = useState("");
  const [abstract, setAbstract] = useState("");
  const [abstractAr, setAbstractAr] = useState("");
  const [type, setType] = useState<Publication["type"]>("original_research");
  const [visibility, setVisibility] = useState<Publication["visibility"]>("members");
  const [authorsText, setAuthorsText] = useState("");
  const [contributorsText, setContributorsText] = useState("");
  const [referencesText, setReferencesText] = useState("");
  const [keywords, setKeywords] = useState("");
  const [publisher, setPublisher] = useState("");
  const [institution, setInstitution] = useState("");
  const [doi, setDoi] = useState("");
  const [doiUrl, setDoiUrl] = useState("");
  const [isbn, setIsbn] = useState("");
  const [edition, setEdition] = useState("");
  const [license, setLicense] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterBody, setChapterBody] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Array<{ action: string; reason?: string | null; created_at: string }>>([]);
  const [dirty, setDirty] = useState(false);

  usePageMeta({ title: "Publication editor", path: `/dashboard/publications/${id}`, noIndex: true });

  const load = async () => {
    const result = await fetchPublicationById(id);
    if (!result.data) {
      setLoadError(result.error || "This draft is not available.");
      return;
    }
    setPublication(result.data);
    setTitle(result.data.title);
    setSlug(result.data.slug);
    setAbstract(result.data.abstract || "");
    setType(result.data.type);
    setVisibility(result.data.visibility);
    setKeywords((result.data.keywords || []).join(", "));
    setPublisher(result.data.publisher || "");
    setInstitution(result.data.institution || "");
    setDoi(result.data.doi || "");
    setDoiUrl(result.data.doi_url || "");
    setIsbn(result.data.isbn || "");
    setEdition(result.data.edition || "");
    setLicense(result.data.license || "");
    setPageCount(result.data.page_count ? String(result.data.page_count) : "");
    const ar = result.data.publication_translations?.find((item) => item.language === "ar");
    setTitleAr(ar?.title || "");
    setAbstractAr(ar?.abstract || "");
    setAuthorsText((result.data.publication_authors || []).map((author) => [author.full_name, author.affiliation].filter(Boolean).join(" | ")).join("\n"));
    setReferencesText((result.data.publication_references || []).map((item) => item.citation_text || item.title || "").join("\n"));
    const { data: contributors } = await supabase.from("publication_contributors").select("full_name, role").eq("publication_id", result.data.id);
    setContributorsText((contributors || []).map((row) => `${row.full_name} | ${row.role}`).join("\n"));
    const actions = await fetchReviewActions(result.data.id);
    setNotes(actions.data as Array<{ action: string; reason?: string | null; created_at: string }>);
    setDirty(false);
  };

  useEffect(() => { load(); }, [id]);

  const authors: Array<Pick<PublicationAuthor, "full_name">> = useMemo(
    () => authorsText.split("\n").map((line) => ({ full_name: line.split("|")[0].trim() })).filter((item) => item.full_name),
    [authorsText],
  );

  const save = async (silent = false) => {
    if (!publication) return;
    const result = await updatePublication(publication.id, {
      title: title.trim(),
      slug: slugifyPublication(slug || title),
      abstract,
      type,
      visibility,
      keywords: keywords.split(",").map((item) => item.trim()).filter(Boolean),
      publisher: publisher || null,
      institution: institution || null,
      doi: doi || null,
      doi_url: doiUrl || null,
      isbn: isbn || null,
      edition: edition || null,
      license: license || null,
      page_count: pageCount ? Number(pageCount) : null,
    });
    await upsertTranslation({ publication_id: publication.id, language: "en", title: title.trim(), abstract });
    if (titleAr.trim()) await upsertTranslation({ publication_id: publication.id, language: "ar", title: titleAr.trim(), abstract: abstractAr });
    await replaceAuthors(publication.id, authorsText.split("\n").filter(Boolean).map((line, index) => {
      const [full_name, affiliation] = line.split("|").map((part) => part.trim());
      return { full_name, affiliation, author_order: index + 1 };
    }));
    await supabase.from("publication_contributors").delete().eq("publication_id", publication.id);
    const contributorRows = contributorsText.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const [full_name, role] = line.split("|").map((part) => part.trim());
      return { publication_id: publication.id, full_name, role: role || "contributor" };
    });
    if (contributorRows.length) await supabase.from("publication_contributors").insert(contributorRows);
    const references: Array<Partial<PublicationReference>> = referencesText.split("\n").filter(Boolean).map((line, index) => ({
      citation_text: line,
      sort_order: index,
    }));
    await replaceReferences(publication.id, references);
    if (!(publication.publication_category_map || []).length) {
      const { data: categories } = await supabase.from("publication_categories").select("id").order("sort_order").limit(1);
      if (categories?.[0]?.id) {
        await supabase.from("publication_category_map").insert({
          publication_id: publication.id,
          category_id: categories[0].id,
        });
      }
    }
    if (result.error) {
      if (!silent) toast.error(result.error);
      return;
    }
    if (!silent) toast.success("Draft saved");
    else toast.success(t("author.autosave"));
    setDirty(false);
    await load();
  };

  useEffect(() => {
    if (!publication || !dirty) return;
    const handle = window.setTimeout(() => { save(true); }, 2500);
    return () => window.clearTimeout(handle);
  }, [dirty, title, abstract, slug, type, visibility, authorsText, referencesText, keywords, publisher, doi, isbn]);

  const mark = () => setDirty(true);

  const addChapter = async () => {
    if (!publication || !chapterTitle.trim()) return;
    const result = await upsertChapter({
      publication_id: publication.id,
      slug: slugifyPublication(chapterTitle),
      sort_order: (publication.book_chapters || []).length,
      title: chapterTitle,
      body: chapterBody,
      language: "en",
    });
    if (result.error) toast.error(result.error);
    else {
      toast.success("Chapter added");
      setChapterTitle("");
      setChapterBody("");
      await load();
    }
  };

  const validate = () => {
    if (!publication) return [];
    return validateForPublish({
      publication: { ...publication, title, slug, type, abstract, description: publication.description, cover_image_path: publication.cover_image_path, primary_language: publication.primary_language },
      authors,
      categories: (publication.publication_category_map || []).map((item) => item.category_id),
      chapters: publication.book_chapters,
    }).map((item) => item.message);
  };

  const previewHref = publication ? publicHref(publication) : "/publications";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-4xl px-4 sm:px-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Publication editor</h1>
          <Button asChild variant="outline"><Link to={previewHref}>Preview</Link></Button>
        </div>
        {loadError ? <p className="text-muted-foreground">{loadError}</p> : !publication ? <p className="text-muted-foreground">Loading…</p> : (
          <>
            <p className="text-sm text-muted-foreground">Status: {publication.status} · Version {publication.version_number}</p>
            {publication.decision_reason && publication.status !== "published" && (
              <p className="rounded-lg border border-amber-500/40 p-3 text-sm">{t("author.notes")}: {publication.decision_reason}</p>
            )}
            {notes.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-1">
                {notes.slice(0, 6).map((note) => (
                  <li key={`${note.created_at}-${note.action}`}>{note.action} · {note.reason || "—"}</li>
                ))}
              </ul>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={title} onChange={(event) => { setTitle(event.target.value); mark(); }} placeholder="English title" />
              <Input value={titleAr} onChange={(event) => { setTitleAr(event.target.value); mark(); }} placeholder="العنوان العربي" />
              <Input value={slug} onChange={(event) => { setSlug(event.target.value); mark(); }} placeholder="slug" />
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={type} onChange={(event) => { setType(event.target.value as Publication["type"]); mark(); }}>
                {PUBLICATION_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={visibility} onChange={(event) => { setVisibility(event.target.value as Publication["visibility"]); mark(); }}>
                {PUBLICATION_VISIBILITIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <Input value={publisher} onChange={(event) => { setPublisher(event.target.value); mark(); }} placeholder="Publisher / institution" />
              <Input value={institution} onChange={(event) => { setInstitution(event.target.value); mark(); }} placeholder="Institution" />
              <Input value={doi} onChange={(event) => { setDoi(event.target.value); mark(); }} placeholder="DOI (optional, stored only)" />
              <Input value={doiUrl} onChange={(event) => { setDoiUrl(event.target.value); mark(); }} placeholder="https://doi.org/10...." />
              <Input value={isbn} onChange={(event) => { setIsbn(event.target.value); mark(); }} placeholder="ISBN (optional)" />
              <Input value={edition} onChange={(event) => { setEdition(event.target.value); mark(); }} placeholder="Edition / version" />
              <Input value={license} onChange={(event) => { setLicense(event.target.value); mark(); }} placeholder="License" />
              <Input value={pageCount} onChange={(event) => { setPageCount(event.target.value); mark(); }} placeholder="Page count" />
              <Input value={keywords} onChange={(event) => { setKeywords(event.target.value); mark(); }} placeholder="Keywords, comma separated" />
            </div>
            <Textarea value={abstract} onChange={(event) => { setAbstract(event.target.value); mark(); }} placeholder="Abstract (EN)" rows={5} />
            <Textarea value={abstractAr} onChange={(event) => { setAbstractAr(event.target.value); mark(); }} placeholder="الملخص" rows={5} />
            <Textarea value={authorsText} onChange={(event) => { setAuthorsText(event.target.value); mark(); }} placeholder="Authors, one per line: Name | Affiliation" rows={4} />
            <Textarea value={contributorsText} onChange={(event) => { setContributorsText(event.target.value); mark(); }} placeholder="Contributors, one per line: Name | contributor" rows={3} />
            <Textarea value={referencesText} onChange={(event) => { setReferencesText(event.target.value); mark(); }} placeholder="References, one per line" rows={4} />

            {publication.type === "book" && (
              <div className="rounded-xl border p-4 space-y-3">
                <h2 className="font-semibold">Chapters</h2>
                <ul className="text-sm space-y-1">
                  {(publication.book_chapters || []).map((chapter) => <li key={chapter.id}>{chapter.sort_order + 1}. {chapter.slug}</li>)}
                </ul>
                <Input value={chapterTitle} onChange={(event) => setChapterTitle(event.target.value)} placeholder="Chapter title" />
                <Textarea value={chapterBody} onChange={(event) => setChapterBody(event.target.value)} placeholder="Chapter body (Markdown)" rows={6} />
                <Button type="button" variant="outline" onClick={addChapter}>Add chapter</Button>
              </div>
            )}

            <div className="rounded-xl border p-4 space-y-3">
              <h2 className="font-semibold">Files</h2>
              <label className="block text-sm">
                Cover (JPEG/PNG/WebP) or PDF
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="mt-2 block"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file || !publication) return;
                    const kind = file.type.startsWith("image/") ? "cover" : "full_pdf";
                    const uploaded = await uploadPublicationFile({
                      publicationId: publication.id,
                      ownerId: publication.created_by || user?.id || "",
                      file,
                      kind,
                      visibility,
                      isDownloadable: kind !== "cover",
                    });
                    if (uploaded.error) toast.error(uploaded.error);
                    else toast.success("File uploaded");
                    await load();
                  }}
                />
              </label>
            </div>

            {errors.length > 0 && (
              <ul className="rounded-lg bg-destructive/10 p-3 text-sm space-y-1" role="alert">
                {errors.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => save(false)}>Save draft</Button>
              <Button type="button" variant="outline" onClick={async () => {
                await save(true);
                const result = await submitPublication(publication.id);
                toast[result.error ? "error" : "success"](result.error || "Submitted");
                await load();
              }}>Submit</Button>
              <Button type="button" variant="outline" onClick={async () => {
                const result = await archiveOwnPublication(publication.id);
                toast[result.error ? "error" : "success"](result.error || t("author.archive"));
                await load();
              }}>{t("author.archive")}</Button>
              {["published", "corrected", "approved"].includes(publication.status) && (
                <Button type="button" variant="outline" onClick={async () => {
                  const result = await createPublicationRevision(publication.id);
                  toast[result.error ? "error" : "success"](result.error || t("author.new_version"));
                }}>{t("author.new_version")}</Button>
              )}
              {isAdmin && (
                <>
                  <Button type="button" variant="outline" onClick={() => setErrors(validate())}>Validate</Button>
                  <Button type="button" variant="outline" onClick={async () => {
                    const result = await snapshotPublication(publication.id, "Manual snapshot");
                    toast[result.error ? "error" : "success"](result.error || "Version saved");
                  }}>Save version</Button>
                  <Button type="button" onClick={async () => {
                    const currentErrors = validate();
                    setErrors(currentErrors);
                    if (currentErrors.length) return;
                    const result = await publishPublication(publication.id, "Admin publish");
                    toast[result.error ? "error" : "success"](result.error || "Published");
                    await load();
                  }}>Publish</Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
