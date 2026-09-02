import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Loader2, MapPin } from "lucide-react";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import MemberAvatar from "@/components/MemberAvatar";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase, type Member } from "@/lib/supabase";
import { filterPublicMembers } from "@/lib/public-members";
import { buildCompanyDirectory } from "@/lib/companies";

export default function CompanyDetailPage() {
  const { slug } = useParams();
  const { t, lang } = useI18n();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("member_directory")
      .select("id, full_name, role, specialty, avatar_url, title, company, location, bio, member_type, website, profile_id")
      .limit(120)
      .then(({ data }) => {
        setMembers(filterPublicMembers((data as Member[]) || []));
        setLoading(false);
      });
  }, []);

  const listing = useMemo(
    () => buildCompanyDirectory(members).find((company) => company.slug === slug),
    [members, slug],
  );
  const people = useMemo(() => {
    if (!listing) return [];
    return members.filter((member) => {
      const employer = (member.member_type === "company" ? (member.company || member.full_name) : member.company)?.trim().toLowerCase();
      return employer === listing.name.toLowerCase();
    });
  }, [members, listing]);

  usePageMeta({
    title: listing?.name || t("companies.title"),
    description: listing ? `${listing.name} · Flavor Experts Network` : t("companies.desc"),
    path: `/companies/${slug || ""}`,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-4xl px-4">
        <Link to="/companies" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4" />
          {t("companies.title")}
        </Link>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : !listing ? (
          <p className="text-muted-foreground">{lang === "ar" ? "لم يتم العثور على هذه الشركة." : "This company was not found."}</p>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 flex items-start gap-4">
              <MemberAvatar src={listing.avatar_url} name={listing.name} className="w-16 h-16 rounded-2xl" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold">{listing.name}</h1>
                  {listing.is_company_account && <Badge variant="secondary">{t("profile.type.company")}</Badge>}
                </div>
                {listing.location && <p className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{listing.location}</p>}
              </div>
            </div>
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 inline-flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {t("companies.members")}
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {people.map((member) => (
                  <Link key={member.id} to={`/members/${member.id}`} className="rounded-xl border p-4 hover:border-primary/40">
                    <div className="flex items-center gap-3">
                      <MemberAvatar src={member.avatar_url} name={member.full_name} className="w-10 h-10 rounded-lg" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.role || member.title}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
      <FooterSection />
    </div>
  );
}
