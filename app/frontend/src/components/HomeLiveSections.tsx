import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { filterPublicMembers } from "@/lib/public-members";

type PathRow = { id: string; title?: string; name?: string; slug?: string };
type CourseRow = { id: string; title: string; slug: string; level?: string | null };
type PostRow = { id: string; body?: string | null; created_at?: string };
type MemberRow = { id: string; full_name: string; role?: string | null; company?: string | null };
type JobRow = { id: string; title: string; company?: string | null; location?: string | null };
type MarketRow = { id: string; title: string };
type PartnerRow = { id: string; name: string };
type NewsRow = { id: string; title: string; slug?: string | null };
type Stats = {
  public_members?: number;
  published_courses?: number;
  open_jobs?: number;
  learning_paths?: number;
};

function EmptyNote({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground border border-dashed border-border rounded-xl px-4 py-6 text-center">{text}</p>;
}

function Section({
  id,
  title,
  href,
  loading,
  empty,
  children,
  hasItems,
}: {
  id: string;
  title: string;
  href: string;
  loading: boolean;
  empty: string;
  children: React.ReactNode;
  hasItems: boolean;
}) {
  const { t } = useI18n();
  return (
    <section id={id} className="py-14 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to={href}>{t("home.view_all")}</Link>
          </Button>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : hasItems ? (
          children
        ) : (
          <EmptyNote text={empty} />
        )}
      </div>
    </section>
  );
}

export default function HomeLiveSections() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [paths, setPaths] = useState<PathRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [experts, setExperts] = useState<MemberRow[]>([]);
  const [articles, setArticles] = useState<NewsRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [market, setMarket] = useState<MarketRow[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [
        pathsRes,
        coursesRes,
        postsRes,
        membersRes,
        newsRes,
        jobsRes,
        marketRes,
        partnersRes,
        statsRes,
      ] = await Promise.all([
        supabase.from("learning_paths").select("id, title, slug").eq("is_published", true).limit(4),
        supabase
          .from("courses")
          .select("id, title, slug, level, is_published, status")
          .or("is_published.eq.true,status.eq.published")
          .limit(4),
        supabase
          .from("social_posts")
          .select("id, body, created_at")
          .eq("is_published", true)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("member_directory")
          .select("id, full_name, role, company, is_featured")
          .order("is_featured", { ascending: false })
          .limit(8),
        supabase
          .from("industry_news")
          .select("id, title")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("job_listings")
          .select("id, title, company, location")
          .eq("is_published", true)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("market_briefings")
          .select("id, title")
          .order("created_at", { ascending: false })
          .limit(4),
        supabase.from("partners").select("id, name").limit(6),
        supabase.rpc("platform_public_stats"),
      ]);
      if (cancelled) return;
      setPaths((pathsRes.data as PathRow[]) || []);
      setCourses(((coursesRes.data as CourseRow[]) || []).filter((c) => c.slug && c.title));
      setPosts((postsRes.data as PostRow[]) || []);
      setExperts(filterPublicMembers((membersRes.data as MemberRow[]) || []).slice(0, 4));
      setArticles((newsRes.data as NewsRow[]) || []);
      setJobs((jobsRes.data as JobRow[]) || []);
      setMarket((marketRes.data as MarketRow[]) || []);
      setPartners((partnersRes.data as PartnerRow[]) || []);
      setStats((statsRes.data as Stats) || null);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const statItems = [
    { key: "members", value: stats?.public_members, label: t("home.stats.members") },
    { key: "courses", value: stats?.published_courses, label: t("home.stats.courses") },
    { key: "jobs", value: stats?.open_jobs, label: t("home.stats.jobs") },
    { key: "paths", value: stats?.learning_paths, label: t("home.stats.paths") },
  ].filter((item) => typeof item.value === "number");

  return (
    <>
      <Section id="learning" title={t("home.paths.title")} href="/courses" loading={loading} empty={t("home.paths.empty")} hasItems={paths.length > 0}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {paths.map((path) => (
            <Card key={path.id} className="h-full border-border">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground">{path.title || path.name}</h3>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="academy" title={t("home.courses.title")} href="/courses" loading={loading} empty={t("home.courses.empty")} hasItems={courses.length > 0}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {courses.map((course) => (
            <Link key={course.id} to={`/courses/${course.slug}`} className="block h-full">
              <Card className="h-full border-border hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground">{course.title}</h3>
                  {course.level ? <p className="text-sm text-muted-foreground mt-1">{course.level}</p> : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      <Section id="posts" title={t("home.posts.title")} href="/community" loading={loading} empty={t("home.posts.empty")} hasItems={posts.length > 0}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <Card key={post.id} className="border-border">
              <CardContent className="p-5">
                <p className="text-sm text-foreground line-clamp-4">{post.body || ""}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="experts" title={t("home.experts.title")} href="/members" loading={loading} empty={t("home.experts.empty")} hasItems={experts.length > 0}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {experts.map((member) => (
            <Link key={member.id} to={`/members/${member.id}`} className="block h-full">
              <Card className="h-full border-border">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground">{member.full_name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{member.role || member.company || ""}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      <Section id="articles" title={t("home.articles.title")} href="/blog" loading={loading} empty={t("home.articles.empty")} hasItems={articles.length > 0}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {articles.map((article) => (
            <Link key={article.id} to="/blog" className="block h-full">
              <Card className="h-full border-border">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground">{article.title}</h3>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      <Section id="jobs" title={t("home.jobs.title")} href="/jobs" loading={loading} empty={t("home.jobs.empty")} hasItems={jobs.length > 0}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {jobs.map((job) => (
            <Link key={job.id} to="/jobs" className="block h-full">
              <Card className="h-full border-border">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground">{job.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{[job.company, job.location].filter(Boolean).join(" · ")}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      <Section id="market" title={t("home.market.title")} href="/market" loading={loading} empty={t("home.market.empty")} hasItems={market.length > 0}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {market.map((item) => (
            <Card key={item.id} className="h-full border-border">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground">{item.title}</h3>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="partners" title={t("home.partners.title")} href="/enterprise" loading={loading} empty={t("home.partners.empty")} hasItems={partners.length > 0}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {partners.map((partner) => (
            <Card key={partner.id} className="h-full border-border">
              <CardContent className="p-4 flex items-center justify-center text-center text-sm font-medium text-foreground">
                {partner.name}
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <section id="stats" className="py-14 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">{t("home.stats.title")}</h2>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : statItems.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statItems.map((item) => (
                <Card key={item.key} className="border-border">
                  <CardContent className="p-5 text-center">
                    <p className="text-2xl font-bold text-foreground">{item.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{item.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyNote text={t("home.stats.empty")} />
          )}
        </div>
      </section>

      <section id="join" className="py-16 border-t border-border bg-secondary/30">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{t("home.cta.title")}</h2>
          <p className="text-muted-foreground mb-6">{t("home.cta.desc")}</p>
          <Button asChild size="lg">
            <Link to="/auth?mode=signup">{t("home.cta.button")}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
