import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { filterPublicMembers } from "@/lib/public-members";
import { buildCompanyDirectory } from "@/lib/companies";
import type { Member } from "@/lib/types";
import { blogPosts, getBlogRoute } from "@/lib/blog";

type PostRow = { id: string; body?: string | null; created_at?: string };
type JobRow = { id: string; title: string; company?: string | null; location?: string | null };
type MarketRow = { id: string; title: string };
type PartnerRow = { id: string; name: string };
type Stats = {
  public_members?: number;
  open_jobs?: number;
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
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [experts, setExperts] = useState<Member[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [market, setMarket] = useState<MarketRow[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [companiesPreview, setCompaniesPreview] = useState<ReturnType<typeof buildCompanyDirectory>>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [
        postsRes,
        membersRes,
        jobsRes,
        marketRes,
        partnersRes,
        statsRes,
      ] = await Promise.all([
        supabase
          .from("social_posts")
          .select("id, body, created_at")
          .eq("is_published", true)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("member_directory")
          .select("id, full_name, role, company, is_featured, member_type, location, avatar_url, title, website")
          .order("is_featured", { ascending: false })
          .limit(80),
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
      setPosts((postsRes.data as PostRow[]) || []);
      const publicMembers = filterPublicMembers((membersRes.data as Member[]) || []);
      setExperts(publicMembers.slice(0, 4));
      setPartners((partnersRes.data as PartnerRow[]) || []);
      setCompaniesPreview(buildCompanyDirectory(publicMembers).slice(0, 4));
      setJobs((jobsRes.data as JobRow[]) || []);
      setMarket((marketRes.data as MarketRow[]) || []);
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
    { key: "jobs", value: stats?.open_jobs, label: t("home.stats.jobs") },
  ].filter((item) => typeof item.value === "number");

  return (
    <>
      <Section id="news" title={t("insights.title")} href="/insights" loading={false} empty={t("home.articles.empty")} hasItems={blogPosts.length > 0}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {blogPosts.slice(0, 4).map((article) => (
            <Link key={article.slug} to={getBlogRoute(article.slug)} className="block h-full">
              <Card className="h-full border-border hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground">{article.title}</h3>
                  {article.description ? (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{article.description}</p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      <Section id="posts" title={t("home.posts.title")} href="/community" loading={loading} empty={t("home.posts.empty")} hasItems={posts.length > 0}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <Link key={post.id} to={`/community#post-${post.id}`} className="block h-full">
              <Card className="h-full border-border hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <p className="text-sm text-foreground line-clamp-4">{post.body || ""}</p>
                </CardContent>
              </Card>
            </Link>
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

      <Section id="companies" title={t("home.companies.title")} href="/companies" loading={loading} empty={t("home.companies.empty")} hasItems={companiesPreview.length > 0}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {companiesPreview.map((company) => (
            <Link key={company.slug} to={company.profile_path} className="block h-full">
              <Card className="h-full border-border">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground">{company.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{company.location || ""}</p>
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
