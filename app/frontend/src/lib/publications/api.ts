import { supabase } from "@/lib/supabase";
import type {
  BookChapter,
  Publication,
  PublicationAuthor,
  PublicationBookmark,
  PublicationCategory,
  PublicationFile,
  PublicationReference,
  PublicationTranslation,
  PublicationVersion,
  ReadingProgress,
} from "./types";
import { slugifyPublication } from "./slug";

const LIST_SELECT = `
  id, type, slug, status, visibility, primary_language, title, subtitle, abstract, description,
  cover_image_path, license, doi, isbn, version_number, audience_level, application_area,
  regulatory_scope, keywords, is_featured, retraction_notice, correction_notice,
  created_by, published_at, updated_at, created_at,
  publication_authors(id, publication_id, full_name, affiliation, country, orcid, author_order, is_corresponding, contribution)
`;

export type PublicationListFilters = {
  type?: string;
  language?: string;
  category?: string;
  level?: string;
  query?: string;
  featured?: boolean;
  page?: number;
  pageSize?: number;
};

export async function fetchPublicationCategories() {
  const { data, error } = await supabase
    .from("publication_categories")
    .select("*")
    .order("sort_order");
  return { data: (data as PublicationCategory[]) || [], error: error?.message || null };
}

export async function listPublications(filters: PublicationListFilters = {}) {
  const page = Math.max(filters.page || 0, 0);
  const pageSize = Math.min(Math.max(filters.pageSize || 12, 1), 50);
  const from = page * pageSize;
  const to = from + pageSize - 1;

  if (filters.query && filters.query.trim().length >= 2) {
    const { data, error } = await supabase.rpc("search_publications", {
      p_query: filters.query.trim(),
      p_type: filters.type || null,
      p_language: filters.language || null,
      p_category: filters.category || null,
      p_limit: pageSize,
      p_offset: from,
    });
    return { data: (data as Publication[]) || [], error: error?.message || null, fromSearch: true };
  }

  let query = supabase
    .from("publications")
    .select(LIST_SELECT)
    .in("status", ["published", "corrected", "retracted"])
    .order("published_at", { ascending: false })
    .range(from, to);

  if (filters.type) query = query.eq("type", filters.type);
  if (filters.language) query = query.eq("primary_language", filters.language);
  if (filters.level) query = query.eq("audience_level", filters.level);
  if (filters.featured) query = query.eq("is_featured", true);

  const { data, error } = await query;
  return { data: (data as Publication[]) || [], error: error?.message || null, fromSearch: false };
}

export async function fetchPublicationBySlug(slug: string) {
  const { data, error } = await supabase
    .from("publications")
    .select(`
      *,
      publication_authors(id, publication_id, profile_id, full_name, affiliation, country, orcid, author_order, is_corresponding, contribution),
      publication_files(*),
      publication_references(*),
      publication_translations(*),
      book_chapters(id, publication_id, slug, sort_order, status, estimated_reading_minutes),
      publication_category_map(category_id, publication_categories(id, slug, name_en, name_ar, sort_order))
    `)
    .eq("slug", slug)
    .maybeSingle();
  return { data: (data as Publication | null) || null, error: error?.message || null };
}

export async function fetchChapter(publicationId: string, chapterSlug: string, language: "en" | "ar") {
  const { data: chapter, error } = await supabase
    .from("book_chapters")
    .select("id, publication_id, slug, sort_order, status, estimated_reading_minutes")
    .eq("publication_id", publicationId)
    .eq("slug", chapterSlug)
    .maybeSingle();
  if (error || !chapter) return { data: null as BookChapter | null, error: error?.message || "Chapter not found." };

  const { data: translation } = await supabase
    .from("book_chapter_translations")
    .select("language, title, summary, body")
    .eq("chapter_id", chapter.id)
    .in("language", [language, "en"]);

  const preferred = (translation || []).find((row) => row.language === language) || translation?.[0];
  return {
    data: {
      ...chapter,
      title: preferred?.title || chapter.slug,
      summary: preferred?.summary || null,
      body: preferred?.body || "",
    } as BookChapter,
    error: null,
  };
}

export async function fetchMyPublications() {
  const { data, error } = await supabase
    .from("publications")
    .select(LIST_SELECT)
    .order("updated_at", { ascending: false });
  return { data: (data as Publication[]) || [], error: error?.message || null };
}

export async function createDraftPublication(input: {
  type: Publication["type"];
  title: string;
  language?: "en" | "ar";
}) {
  const slug = slugifyPublication(input.title);
  const { data, error } = await supabase
    .from("publications")
    .insert({
      type: input.type,
      title: input.title.trim(),
      slug,
      status: "draft",
      visibility: "members",
      primary_language: input.language || "en",
    })
    .select("*")
    .single();
  return { data: (data as Publication | null) || null, error: error?.message || null };
}

export async function updatePublication(id: string, values: Record<string, unknown>) {
  const { error } = await supabase.from("publications").update(values).eq("id", id);
  return { error: error?.message || null };
}

export async function upsertTranslation(input: PublicationTranslation) {
  const { error } = await supabase.from("publication_translations").upsert(input, {
    onConflict: "publication_id,language",
  });
  return { error: error?.message || null };
}

export async function replaceAuthors(publicationId: string, authors: Array<Partial<PublicationAuthor>>) {
  await supabase.from("publication_authors").delete().eq("publication_id", publicationId);
  if (!authors.length) return { error: null };
  const { error } = await supabase.from("publication_authors").insert(
    authors.map((author, index) => ({
      publication_id: publicationId,
      full_name: author.full_name?.trim() || "Author",
      affiliation: author.affiliation || null,
      country: author.country || null,
      orcid: author.orcid || null,
      email: author.email || null,
      author_order: author.author_order || index + 1,
      is_corresponding: Boolean(author.is_corresponding),
      contribution: author.contribution || null,
      profile_id: author.profile_id || null,
    })),
  );
  return { error: error?.message || null };
}

export async function replaceReferences(publicationId: string, references: Array<Partial<PublicationReference>>) {
  await supabase.from("publication_references").delete().eq("publication_id", publicationId);
  if (!references.length) return { error: null };
  const { error } = await supabase.from("publication_references").insert(
    references.map((item, index) => ({
      publication_id: publicationId,
      sort_order: item.sort_order ?? index,
      citation_text: item.citation_text || null,
      title: item.title || null,
      authors: item.authors || null,
      journal_or_publisher: item.journal_or_publisher || null,
      publication_year: item.publication_year || null,
      doi: item.doi || null,
      url: item.url || null,
    })),
  );
  return { error: error?.message || null };
}

export async function upsertChapter(input: {
  id?: string;
  publication_id: string;
  slug: string;
  sort_order: number;
  estimated_reading_minutes?: number;
  title: string;
  summary?: string;
  body?: string;
  language: "en" | "ar";
}) {
  const payload = {
    publication_id: input.publication_id,
    slug: input.slug,
    sort_order: input.sort_order,
    estimated_reading_minutes: input.estimated_reading_minutes || 12,
    status: "draft",
  };
  const query = input.id
    ? supabase.from("book_chapters").update(payload).eq("id", input.id).select("id").single()
    : supabase.from("book_chapters").insert(payload).select("id").single();
  const { data, error } = await query;
  if (error || !data) return { error: error?.message || "Could not save chapter." };
  const { error: translationError } = await supabase.from("book_chapter_translations").upsert({
    chapter_id: data.id,
    language: input.language,
    title: input.title,
    summary: input.summary || null,
    body: input.body || null,
  }, { onConflict: "chapter_id,language" });
  return { error: translationError?.message || null, id: data.id as string };
}

export async function submitPublication(id: string) {
  const { data, error } = await supabase.rpc("submit_publication", { p_id: id });
  return { data: (data as Publication | null) || null, error: error?.message || null };
}

export async function publishPublication(id: string, notes?: string) {
  const { data, error } = await supabase.rpc("publish_publication", { p_id: id, p_notes: notes || null });
  return { data: (data as Publication | null) || null, error: error?.message || null };
}

export async function snapshotPublication(id: string, notes?: string) {
  const { data, error } = await supabase.rpc("snapshot_publication_version", { p_id: id, p_notes: notes || null });
  return { data: (data as PublicationVersion | null) || null, error: error?.message || null };
}

export async function fetchVersions(publicationId: string) {
  const { data, error } = await supabase
    .from("publication_versions")
    .select("*")
    .eq("publication_id", publicationId)
    .order("version_number", { ascending: false });
  return { data: (data as PublicationVersion[]) || [], error: error?.message || null };
}

export async function recordPublicationEvent(
  publicationId: string,
  eventType: "view" | "read" | "download" | "bookmark" | "citation_export",
  fileId?: string,
) {
  await supabase.rpc("record_publication_event", {
    p_publication_id: publicationId,
    p_event_type: eventType,
    p_file_id: fileId || null,
  });
}

export async function saveReadingProgress(input: {
  publicationId: string;
  chapterId?: string | null;
  progressPercent?: number;
  lastPosition?: string | null;
}) {
  const { data, error } = await supabase.rpc("upsert_reading_progress", {
    p_publication_id: input.publicationId,
    p_chapter_id: input.chapterId || null,
    p_progress_percent: input.progressPercent || 0,
    p_last_position: input.lastPosition || null,
  });
  return { data: (data as ReadingProgress | null) || null, error: error?.message || null };
}

export async function fetchReadingProgress(publicationId: string) {
  const { data, error } = await supabase
    .from("reading_progress")
    .select("*")
    .eq("publication_id", publicationId)
    .maybeSingle();
  return { data: (data as ReadingProgress | null) || null, error: error?.message || null };
}

export async function fetchBookmarks(publicationId: string) {
  const { data, error } = await supabase
    .from("publication_bookmarks")
    .select("*")
    .eq("publication_id", publicationId)
    .order("created_at", { ascending: false });
  return { data: (data as PublicationBookmark[]) || [], error: error?.message || null };
}

export async function addBookmark(input: {
  publicationId: string;
  chapterId?: string | null;
  position?: string | null;
  note?: string | null;
}) {
  const { error } = await supabase.from("publication_bookmarks").insert({
    publication_id: input.publicationId,
    chapter_id: input.chapterId || null,
    position: input.position || null,
    note: input.note || null,
  });
  return { error: error?.message || null };
}

export function localizedTitle(publication: Publication, language: "en" | "ar"): string {
  const translation = publication.publication_translations?.find((item) => item.language === language);
  return translation?.title || publication.title;
}

export function localizedAbstract(publication: Publication, language: "en" | "ar"): string {
  const translation = publication.publication_translations?.find((item) => item.language === language);
  return translation?.abstract || publication.abstract || publication.description || "";
}

export function firstAuthorName(publication: Publication): string {
  const authors = [...(publication.publication_authors || [])].sort((a, b) => a.author_order - b.author_order);
  return authors[0]?.full_name || "";
}

export function publicHref(publication: Pick<Publication, "type" | "slug">): string {
  return publication.type === "book" ? `/books/${publication.slug}` : `/research/${publication.slug}`;
}
