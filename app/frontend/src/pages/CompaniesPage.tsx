import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2, Loader2, MapPin, Search, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import MemberAvatar from "@/components/MemberAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase, type Member } from "@/lib/supabase";
import { filterPublicMembers } from "@/lib/public-members";
import { buildCompanyDirectory, type CompanyListing } from "@/lib/companies";

export default function CompaniesPage() {
  const { t } = useI18n();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  usePageMeta({ title: t("companies.title"), description: t("companies.desc"), path: "/companies" });

  useEffect(() => {
    supabase
      .from("member_directory")
      .select("id, full_name, role, specialty, avatar_url, cover_url, title, company, location, bio, member_type, website, profile_id")
      .order("is_featured", { ascending: false })
      .limit(120)
      .then(({ data }) => {
        setMembers(filterPublicMembers((data as Member[]) || []));
        setLoading(false);
      });
  }, []);

  const companies = useMemo(() => buildCompanyDirectory(members), [members]);
  const locations = useMemo(
    () => [...new Set(companies.map((company) => company.location).filter(Boolean) as string[])].sort(),
    [companies],
  );
  const filtered = companies.filter((company) => {
    const q = search.trim().toLowerCase();
    if (q && ![company.name, company.location, company.role].filter(Boolean).some((value) => String(value).toLowerCase().includes(q))) {
      return false;
    }
    if (locationFilter !== "all" && company.location !== locationFilter) return false;
    return true;
  });
  const hasFilters = Boolean(search.trim()) || locationFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setLocationFilter("all");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="relative pt-28 pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <img src="/brand/section-market.webp" alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(208_100%_10%/0.82)] via-[hsl(208_100%_10%/0.88)] to-background" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-8">
            <ArrowLeft className="w-4 h-4" />
            {t("general.back")}
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[hsl(47_23%_85%)]" />
            </div>
            <Badge className="bg-white/10 text-[hsl(47_23%_85%)] border-0 px-3 py-1">{t("companies.badge")}</Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{t("companies.title")}</h1>
          <p className="text-white/75 max-w-xl">{t("companies.desc")}</p>
          <div className="mt-4">
            <Button asChild variant="secondary" size="sm">
              <Link to="/members">{t("nav.members")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-6 border-b border-border sticky top-16 bg-background/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="ps-9 h-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("companies.search")} />
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder={t("companies.filter.location")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("members.filter.all")}</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>{location}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button type="button" variant="ghost" className="h-10" onClick={clearFilters}>
                {t("members.filter.clear")}
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : companies.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-foreground">{t("companies.empty")}</p>
              <p className="text-sm mt-1">{t("companies.empty.desc")}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground space-y-4">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t("companies.none")}{search ? ` "${search}"` : ""}</p>
              <Button variant="outline" onClick={clearFilters}>{t("members.filter.clear")}</Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                {t("companies.showing")} {filtered.length}{" "}
                {filtered.length === 1 ? t("companies.company") : t("companies.companies")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((company, index) => (
                  <CompanyCard key={company.slug} company={company} colorIndex={index} t={t} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
      <FooterSection />
    </div>
  );
}

function CompanyCard({
  company,
  colorIndex,
  t,
}: {
  company: CompanyListing;
  colorIndex: number;
  t: (key: string) => string;
}) {
  return (
    <Link to={company.profile_path} className="group rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-200 overflow-hidden block">
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <MemberAvatar src={company.avatar_url} name={company.name} colorIndex={colorIndex} />
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm truncate group-hover:text-primary">{company.name}</h3>
            {company.role && <p className="text-xs text-muted-foreground truncate">{company.role}</p>}
            {company.is_company_account && (
              <Badge variant="secondary" className="mt-1 text-[10px] font-normal">{t("profile.type.company")}</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {company.location && (
            <Badge variant="outline" className="text-xs font-normal text-muted-foreground gap-1">
              <MapPin className="w-3 h-3" />
              {company.location}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          {company.member_count} {t("companies.members")}
        </p>
        <p className="text-xs font-medium text-primary mt-3 group-hover:underline">{t("companies.view_profile")}</p>
      </div>
    </Link>
  );
}
