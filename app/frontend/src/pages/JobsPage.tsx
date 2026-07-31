import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Clock,
  Crown,
  Loader2,
  Lock,
  MapPin,
  Plus,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";
import { safeHttpUrl } from "@/lib/url";
import type { EmploymentType, ExperienceLevel, JobListing } from "@/lib/types";
import { toast } from "sonner";

const EMP_TYPES: EmploymentType[] = ["full_time", "part_time", "contract", "remote", "internship"];
const EXP_LEVELS: ExperienceLevel[] = ["entry", "mid", "senior", "lead", "executive"];

function formatDate(date: string, lang: string) {
  return new Date(date).toLocaleDateString(lang === "ar" ? "ar" : "en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function JobsPage() {
  const { t, lang } = useI18n();
  const { user, profile, isPremium, loading: authLoading } = useAuth();
  usePageMeta({ title: t("jobs.title"), description: t("jobs.desc"), path: "/jobs" });

  const isCompany = profile?.account_type === "company";
  const canPost = !!user && isCompany && isPremium;
  const canBrowse = !!user && isPremium;

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<JobListing | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [applying, setApplying] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    employment_type: "full_time" as EmploymentType,
    experience_level: "mid" as ExperienceLevel,
    salary_range: "",
    apply_url: "",
    skills: "",
  });

  const loadJobs = async () => {
    if (!canBrowse && !canPost) {
      setJobs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let q = supabase
      .from("job_listings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (canBrowse) {
      q = q.eq("is_published", true).eq("status", "open");
    }

    const { data, error } = await q;
    if (error) {
      setJobs([]);
    } else {
      setJobs((data as JobListing[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, canBrowse, canPost]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (typeFilter !== "all" && j.employment_type !== typeFilter) return false;
      if (!q) return true;
      return (
        j.title.toLowerCase().includes(q) ||
        j.company_name.toLowerCase().includes(q) ||
        (j.location || "").toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q)
      );
    });
  }, [jobs, search, typeFilter]);

  const empLabel = (v: string) => t(`jobs.type.${v}`);
  const expLabel = (v: string) => t(`jobs.level.${v}`);

  const submitJob = async () => {
    if (!user || !canPost) return;
    if (!form.title.trim() || !form.description.trim()) {
      toast.error(t("jobs.form.required"));
      return;
    }
    setSubmitting(true);
    const skills = form.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const { error } = await supabase.from("job_listings").insert({
      company_id: user.id,
      company_name: profile?.company || profile?.full_name || "Company",
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim() || null,
      employment_type: form.employment_type,
      experience_level: form.experience_level,
      salary_range: form.salary_range.trim() || null,
      apply_url: form.apply_url.trim() ? safeHttpUrl(form.apply_url) : null,
      skills,
      is_published: true,
      status: "open",
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("jobs.form.success"));
    setShowForm(false);
    setForm({
      title: "",
      description: "",
      location: "",
      employment_type: "full_time",
      experience_level: "mid",
      salary_range: "",
      apply_url: "",
      skills: "",
    });
    loadJobs();
  };

  const applyToJob = async (job: JobListing) => {
    if (!user || !canBrowse) return;
    setApplying(true);
    const { error } = await supabase.from("job_applications").insert({
      job_id: job.id,
      applicant_id: user.id,
      cover_letter: coverLetter.trim() || null,
    });
    setApplying(false);
    if (error) {
      if (error.code === "23505") toast.error(t("jobs.apply.already"));
      else toast.error(error.message);
      return;
    }
    toast.success(t("jobs.apply.success"));
    setCoverLetter("");
    setSelected(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("general.back")}
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
            <div>
              <Badge className="bg-primary/10 text-primary border-0 mb-3">
                <Briefcase className="w-3.5 h-3.5 me-1.5" />
                {t("jobs.tag")}
              </Badge>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">{t("jobs.title")}</h1>
              <p className="text-muted-foreground max-w-2xl">{t("jobs.desc")}</p>
            </div>
            {canPost && (
              <Button className="gap-2" onClick={() => setShowForm((v) => !v)}>
                <Plus className="w-4 h-4" />
                {t("jobs.post_cta")}
              </Button>
            )}
          </div>

          {/* Premium gate */}
          {!authLoading && !canBrowse && (
            <Card className="mb-8 border-primary/20 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/30" />
              <CardContent className="p-8 sm:p-10 text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Lock className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold">{t("jobs.locked.title")}</h2>
                <p className="text-muted-foreground max-w-lg mx-auto">{t("jobs.locked.desc")}</p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  {!user ? (
                    <Button asChild>
                      <Link to="/auth?mode=login">{t("nav.login")}</Link>
                    </Button>
                  ) : (
                    <Button asChild className="gap-2">
                      <Link to="/pricing">
                        <Crown className="w-4 h-4" />
                        {t("jobs.locked.upgrade")}
                      </Link>
                    </Button>
                  )}
                  {user && !isCompany && (
                    <Button asChild variant="outline">
                      <Link to="/auth?mode=signup&type=company">{t("jobs.company_signup")}</Link>
                    </Button>
                  )}
                </div>
                {isCompany && user && !isPremium && (
                  <p className="text-xs text-muted-foreground">{t("jobs.company_need_premium")}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Company post form */}
          {canPost && showForm && (
            <Card className="mb-8 border-primary/25">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-lg">{t("jobs.form.title")}</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-2">
                    <Label>{t("jobs.form.job_title")}</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder={t("jobs.form.job_title_ph")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("jobs.form.location")}</Label>
                    <Input
                      value={form.location}
                      onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                      placeholder={t("jobs.form.location_ph")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("jobs.form.salary")}</Label>
                    <Input
                      value={form.salary_range}
                      onChange={(e) => setForm((p) => ({ ...p, salary_range: e.target.value }))}
                      placeholder={t("jobs.form.salary_ph")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("jobs.form.type")}</Label>
                    <Select
                      value={form.employment_type}
                      onValueChange={(v) =>
                        setForm((p) => ({ ...p, employment_type: v as EmploymentType }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EMP_TYPES.map((v) => (
                          <SelectItem key={v} value={v}>
                            {empLabel(v)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("jobs.form.level")}</Label>
                    <Select
                      value={form.experience_level}
                      onValueChange={(v) =>
                        setForm((p) => ({ ...p, experience_level: v as ExperienceLevel }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXP_LEVELS.map((v) => (
                          <SelectItem key={v} value={v}>
                            {expLabel(v)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <Label>{t("jobs.form.skills")}</Label>
                    <Input
                      value={form.skills}
                      onChange={(e) => setForm((p) => ({ ...p, skills: e.target.value }))}
                      placeholder={t("jobs.form.skills_ph")}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <Label>{t("jobs.form.apply_url")}</Label>
                    <Input
                      value={form.apply_url}
                      onChange={(e) => setForm((p) => ({ ...p, apply_url: e.target.value }))}
                      placeholder="https://"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <Label>{t("jobs.form.description")}</Label>
                    <Textarea
                      rows={6}
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder={t("jobs.form.description_ph")}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    {t("general.cancel")}
                  </Button>
                  <Button onClick={submitJob} disabled={submitting} className="gap-2">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {t("jobs.form.publish")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search (premium) */}
          {canBrowse && (
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-11"
                  placeholder={t("jobs.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="sm:w-48 h-11">
                  <SelectValue placeholder={t("jobs.filter_type")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("jobs.filter_all")}</SelectItem>
                  {EMP_TYPES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {empLabel(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {canBrowse && (
            <>
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center space-y-2">
                    <Briefcase className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                    <p className="font-medium">{t("jobs.empty")}</p>
                    <p className="text-sm text-muted-foreground">{t("jobs.empty.desc")}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filtered.map((job) => (
                    <Card
                      key={job.id}
                      className="hover:border-primary/30 transition-colors overflow-hidden"
                    >
                      <CardContent className="p-0">
                        <button
                          type="button"
                          className="w-full text-start p-5 sm:p-6"
                          onClick={() => setSelected(job)}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="space-y-2 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold text-foreground">{job.title}</h3>
                                <Badge variant="secondary">{empLabel(job.employment_type)}</Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5" />
                                  {job.company_name}
                                </span>
                                {job.location && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {job.location}
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatDate(job.created_at, lang)}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                              {job.skills && job.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {job.skills.slice(0, 5).map((s) => (
                                    <Badge key={s} variant="outline" className="text-xs font-normal">
                                      {s}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="shrink-0">
                              <Badge className="bg-primary/10 text-primary border-0">
                                {expLabel(job.experience_level)}
                              </Badge>
                            </div>
                          </div>
                        </button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Detail / apply panel */}
          {selected && canBrowse && (
            <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-6">
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
                <CardContent className="p-6 sm:p-8 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold">{selected.title}</h2>
                      <p className="text-muted-foreground mt-1">
                        {selected.company_name}
                        {selected.location ? ` · ${selected.location}` : ""}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                      ✕
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{empLabel(selected.employment_type)}</Badge>
                    <Badge variant="outline">{expLabel(selected.experience_level)}</Badge>
                    {selected.salary_range && <Badge variant="outline">{selected.salary_range}</Badge>}
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                    {selected.description}
                  </div>
                  {selected.apply_url && safeHttpUrl(selected.apply_url) ? (
                    <Button asChild className="w-full gap-2">
                      <a href={safeHttpUrl(selected.apply_url)!} target="_blank" rel="noopener noreferrer">
                        <Sparkles className="w-4 h-4" />
                        {t("jobs.apply.external")}
                      </a>
                    </Button>
                  ) : (
                    <div className="space-y-3 border-t border-border pt-4">
                      <Label>{t("jobs.apply.cover")}</Label>
                      <Textarea
                        rows={4}
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        placeholder={t("jobs.apply.cover_ph")}
                      />
                      <Button
                        className="w-full gap-2"
                        disabled={applying}
                        onClick={() => applyToJob(selected)}
                      >
                        {applying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        {t("jobs.apply.submit")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
