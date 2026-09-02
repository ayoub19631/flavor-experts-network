import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, Briefcase, Building2, FileText, Loader2, Search, Users, MessageSquareText } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";
import type { JobListing, Member, SocialPost } from "@/lib/types";
import { filterPublicMembers } from "@/lib/public-members";
import { blogPosts, getBlogRoute } from "@/lib/blog";
import { publicHref } from "@/lib/publications/api";
import type { Publication } from "@/lib/publications/types";
import { rememberSearch, unifiedSearch, type UnifiedHit } from "@/lib/phase4/search";

export default function SearchPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") || "";
  const [q, setQ] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [books, setBooks] = useState<Publication[]>([]);
  const [research, setResearch] = useState<Publication[]>([]);
  const [articles, setArticles] = useState<Array<{ slug: string; title: string }>>([]);
  const [companies, setCompanies] = useState<Member[]>([]);
  const [ranked, setRanked] = useState<UnifiedHit[]>([]);
  usePageMeta({ title: t("search.title"), description: t("search.desc"), path: "/search" });

  const query = q.trim();

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      setParams(query ? { q: query } : {}, { replace: true });
      if (query.length < 2) {
        setMembers([]);
        setPosts([]);
        setJobs([]);
        setBooks([]);
        setResearch([]);
        setArticles([]);
        setCompanies([]);
        setRanked([]);
        return;
      }
      setLoading(true);
      const server = await unifiedSearch(query);
      setRanked(server.data);
      if (server.data.length > 0) void rememberSearch(query);
      const like = `%${query}%`;
      const needle = query.toLowerCase();
      const [m, p, j, pub] = await Promise.all([
        supabase
          .from("member_directory")
          .select("id, full_name, role, company, avatar_url, specialty, title, location")
          .or(`full_name.ilike.${like},role.ilike.${like},company.ilike.${like},specialty.ilike.${like},title.ilike.${like}`)
          .limit(24),
        supabase
          .from("social_posts")
          .select("id, body, created_at, author_id")
          .eq("is_published", true)
          .eq("is_hidden", false)
          .ilike("body", like)
          .limit(8),
        supabase
          .from("job_listings")
          .select("id, title, company_name, location")
          .eq("is_published", true)
          .eq("status", "open")
          .or(`title.ilike.${like},company_name.ilike.${like},location.ilike.${like}`)
          .limit(8),
        supabase.rpc("search_publications", {
          p_query: query,
          p_type: null,
          p_language: null,
          p_category: null,
          p_limit: 8,
          p_offset: 0,
        }),
      ]);
      let foundMembers = (m.data as Member[]) || [];
      if (m.error || foundMembers.length === 0) {
        const fallback = await supabase
          .from("member_directory")
          .select("id, full_name, role, company, avatar_url, specialty, title, location")
          .limit(80);
        foundMembers = ((fallback.data as Member[]) || []).filter((row) =>
          [row.full_name, row.role, row.company, row.specialty, row.title, row.location]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(needle)),
        ).slice(0, 8);
      } else {
        foundMembers = foundMembers.slice(0, 8);
      }
      const visibleMembers = filterPublicMembers(foundMembers);
      setMembers(visibleMembers);
      setCompanies(visibleMembers.filter((row) => Boolean(row.company)));
      setPosts((p.data as SocialPost[]) || []);
      setJobs((j.data as JobListing[]) || []);
      const publications = ((pub.data as Publication[]) || []);
      setBooks(publications.filter((item) => item.type === "book"));
      setResearch(publications.filter((item) => item.type !== "book"));
      setArticles(
        blogPosts
          .filter((post) => `${post.title} ${post.description || ""}`.toLowerCase().includes(needle))
          .slice(0, 6)
          .map((post) => ({ slug: post.slug, title: post.title })),
      );
      setLoading(false);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query]);

  const empty = useMemo(
    () => query.length >= 2 && !loading && ranked.length + members.length + posts.length + jobs.length + books.length + research.length + articles.length === 0,
    [query, loading, ranked.length, members.length, posts.length, jobs.length, books.length, research.length, articles.length],
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <h1 className="text-2xl font-bold mb-2">{t("search.title")}</h1>
        <p className="text-sm text-muted-foreground mb-5">{t("search.desc")}</p>
        <div className="relative mb-8">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.ph")}
            className="ps-9 h-12"
            autoFocus
          />
        </div>
        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        {empty && ranked.length === 0 && <p className="text-sm text-muted-foreground">{t("search.empty")}</p>}
        {ranked.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold mb-3">{t("search.title")}</h2>
            <div className="space-y-2">
              {ranked.map((hit) => (
                <Link key={`${hit.entity_type}-${hit.entity_id}`} to={hit.href} className="block rounded-xl border border-border p-3 hover:border-primary/30">
                  <p className="text-[11px] uppercase text-muted-foreground">{hit.entity_type}</p>
                  <p className="font-medium">{hit.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
        {members.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Users className="w-4 h-4" />{t("nav.members")}</h2>
            <div className="space-y-2">
              {members.map((m) => (
                <Link key={m.id} to={`/members/${m.id}`} className="block rounded-xl border border-border p-3 hover:border-primary/30">
                  <p className="font-medium">{m.full_name}</p>
                  <p className="text-xs text-muted-foreground">{[m.role, m.company].filter(Boolean).join(" · ")}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
        {books.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" />{t("search.books")}</h2>
            <div className="space-y-2">
              {books.map((item) => (
                <Link key={item.id} to={publicHref(item)} className="block rounded-xl border border-border p-3 hover:border-primary/30">
                  <p className="font-medium">{item.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
        {research.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><FileText className="w-4 h-4" />{t("search.research")}</h2>
            <div className="space-y-2">
              {research.map((item) => (
                <Link key={item.id} to={publicHref(item)} className="block rounded-xl border border-border p-3 hover:border-primary/30">
                  <p className="font-medium">{item.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
        {articles.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><FileText className="w-4 h-4" />{t("search.articles")}</h2>
            <div className="space-y-2">
              {articles.map((item) => (
                <Link key={item.slug} to={getBlogRoute(item.slug)} className="block rounded-xl border border-border p-3 hover:border-primary/30">
                  <p className="font-medium">{item.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
        {companies.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Building2 className="w-4 h-4" />{t("search.companies")}</h2>
            <div className="space-y-2">
              {companies.map((m) => (
                <Link key={`company-${m.id}`} to={`/members/${m.id}`} className="block rounded-xl border border-border p-3 hover:border-primary/30">
                  <p className="font-medium">{m.company}</p>
                  <p className="text-xs text-muted-foreground">{m.full_name}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
        {jobs.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Briefcase className="w-4 h-4" />{t("nav.jobs")}</h2>
            <div className="space-y-2">
              {jobs.map((job) => (
                <Link key={job.id} to={`/jobs/${job.id}`} className="block rounded-xl border border-border p-3 hover:border-primary/30">
                  <p className="font-medium">{job.title}</p>
                  <p className="text-xs text-muted-foreground">{[job.company_name, job.location].filter(Boolean).join(" · ")}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
        {posts.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><MessageSquareText className="w-4 h-4" />{t("nav.community")}</h2>
            <div className="space-y-2">
              {posts.map((post) => (
                <Link key={post.id} to={`/community#post-${post.id}`} className="block rounded-xl border border-border p-3 hover:border-primary/30">
                  <p className="text-sm line-clamp-3">{post.body}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
