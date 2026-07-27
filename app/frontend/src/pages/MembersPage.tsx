import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Search,
  Users,
  Linkedin,
  Star,
  Loader2,
} from "lucide-react";
import { supabase, type Member } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "from-blue-500 to-blue-700",
  "from-emerald-500 to-emerald-700",
  "from-purple-500 to-purple-700",
  "from-amber-500 to-amber-700",
  "from-rose-500 to-rose-700",
  "from-teal-500 to-teal-700",
  "from-indigo-500 to-indigo-700",
  "from-orange-500 to-orange-700",
];

export default function MembersPage() {
  const { t, lang } = useI18n();
  usePageMeta({ title: t("members.title"), description: t("members.desc"), path: "/members" });
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from("members")
          .select("*")
          .order("is_featured", { ascending: false })
          .order("joined_at", { ascending: false });
        if (error || !data) {
          setMembers([]);
        } else {
          setMembers(data);
        }
      } catch {
        setMembers([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      (m.full_name || "").toLowerCase().includes(q) ||
      (m.role || "").toLowerCase().includes(q) ||
      (m.specialty || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-10 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("general.back")}
          </Link>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <Badge className="bg-primary/10 text-primary border-0 px-3 py-1">
                  {t("members.badge")}
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                {t("members.title")}
              </h1>
              <p className="text-muted-foreground max-w-xl">
                {t("members.desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="py-6 border-b border-border sticky top-16 bg-background/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("members.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>
      </section>

      {/* Members Grid */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-foreground mb-1">{t("members.empty")}</p>
              <p className="text-sm">{t("members.empty.desc")}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t("members.none")}{search ? ` "${search}"` : ""}</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                {t("members.showing")} {filtered.length}{" "}
                {filtered.length !== 1 ? t("members.members") : t("members.member")}
                {search && ` — "${search}"`}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((member, i) => {
                  // Parse specialty: "Specialty | Company | City"
                  const parts = (member.specialty || "").split("|").map((s) => s.trim());
                  const specLabel = parts[0] || "";
                  const companyLabel = parts[1] || "";
                  const cityLabel = parts[2] || "";
                  return (
                    <Card
                      key={member.id}
                      className="border border-border hover:border-primary/40 hover:shadow-lg transition-all duration-200 overflow-hidden group"
                    >
                      <CardContent className="p-5">
                        {/* Avatar */}
                        <div className="flex items-start gap-3 mb-3">
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.full_name}
                              className="w-12 h-12 rounded-xl object-cover flex-shrink-0 shadow-md"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                (e.currentTarget.nextSibling as HTMLElement)?.style.setProperty("display", "flex");
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} items-center justify-center flex-shrink-0 shadow-md ${member.avatar_url ? "hidden" : "flex"}`}
                          >
                            <span className="text-sm font-bold text-white">
                              {getInitials(member.full_name)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-semibold text-foreground text-sm truncate">
                                {member.full_name}
                              </h3>
                              {member.is_featured && (
                                <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 fill-amber-500" />
                              )}
                            </div>
                            <p className="text-xs text-primary font-medium truncate">
                              {member.role}
                            </p>
                            {companyLabel && (
                              <p className="text-xs text-muted-foreground truncate">{companyLabel}</p>
                            )}
                          </div>
                        </div>

                        {/* Specialty + Location */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {specLabel && (
                            <Badge variant="secondary" className="text-xs font-normal">
                              {specLabel}
                            </Badge>
                          )}
                          {cityLabel && (
                            <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                              📍 {cityLabel}
                            </Badge>
                          )}
                        </div>

                        {/* Join Date */}
                        <p className="text-xs text-muted-foreground mb-3">
                          {t("members.joined")}{" "}
                          {new Date(member.joined_at).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
                            month: "short",
                            year: "numeric",
                          })}
                        </p>

                        {/* LinkedIn */}
                        {member.linkedin_url && (
                          <a
                            href={member.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-[#0a66c2] hover:underline"
                          >
                            <Linkedin className="w-3.5 h-3.5" />
                            {t("members.linkedin")}
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
