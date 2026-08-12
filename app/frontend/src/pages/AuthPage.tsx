import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, ArrowLeft, Eye, EyeOff, CheckCircle,
  User, Building2, Globe, Phone, Briefcase, ChevronDown,
} from "lucide-react";
import SocialAuthButtons, { SocialAuthDivider } from "@/components/SocialAuthButtons";
import BrandLogo from "@/components/BrandLogo";
import { SITE } from "@/lib/site-config";
import { useAuth, EMAIL_NOT_CONFIRMED_CODE } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getAuthRedirectUrl, rememberPendingVerificationEmail } from "@/lib/auth-utils";
type AuthMode = "login" | "signup" | "reset" | "new-password";
type AccountType = "individual" | "company";

const INDUSTRY_KEYS = [
  "auth.industry.food",
  "auth.industry.flavor",
  "auth.industry.ingredients",
  "auth.industry.dairy",
  "auth.industry.bakery",
  "auth.industry.beverages",
  "auth.industry.nutra",
  "auth.industry.research",
  "auth.industry.consulting",
  "auth.industry.other",
] as const;

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  usePageMeta({
    title: "Sign in",
    description: "Sign in or create your Flavor Experts Network account.",
    path: "/auth",
    noIndex: true,
  });
  const initialMode = (searchParams.get("mode") as AuthMode) || "login";
  const initialType = (searchParams.get("type") as AccountType) || "individual";

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [accountType, setAccountType] = useState<AccountType>(initialType);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [industryKey, setIndustryKey] = useState<(typeof INDUSTRY_KEYS)[number]>(INDUSTRY_KEYS[0]);
  const [companySize, setCompanySize] = useState(COMPANY_SIZES[0]);
  const [contactName, setContactName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyPassword, setCompanyPassword] = useState("");
  const [showCompanyPw, setShowCompanyPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [companyCreated, setCompanyCreated] = useState(false);

  const { signIn, signUp } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const companyFeatures = useMemo(
    () => [
      t("auth.company_f1"),
      t("auth.company_f2"),
      t("auth.company_f3"),
      t("auth.company_f4"),
      t("auth.company_f5"),
    ],
    [t],
  );

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("new-password");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const resetError = () => { setError(null); setResetSent(false); setPasswordUpdated(false); setCompanyCreated(false); };
  const switchMode = (newMode: AuthMode) => { setMode(newMode); resetError(); };
  const switchType = (type: AccountType) => { setAccountType(type); resetError(); };

  const handleIndividualSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);

    if (mode === "reset") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: getAuthRedirectUrl("/auth/callback") });
      if (resetError) setError(resetError.message); else setResetSent(true);
      setLoading(false); return;
    }

    if (mode === "new-password") {
      if (newPassword.length < 8) { setError(t("auth.err.password_min")); setLoading(false); return; }
      if (newPassword !== confirmPassword) { setError(t("auth.err.password_match")); setLoading(false); return; }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) setError(updateError.message);
      else { setPasswordUpdated(true); toast.success(t("auth.password_updated")); setTimeout(() => navigate("/dashboard"), 2000); }
      setLoading(false); return;
    }

    if (mode === "login") {
      const result = await signIn(email, password);
      if (result.error === EMAIL_NOT_CONFIRMED_CODE) {
        toast.info(t("auth.verify_required"));
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      } else if (result.error) {
        setError(result.error);
      } else {
        toast.success(t("auth.welcome_back"));
        navigate("/dashboard");
      }
      setLoading(false);
      return;
    }

    if (!fullName.trim()) { setError(t("auth.err.full_name")); setLoading(false); return; }
    if (password.length < 8) { setError(t("auth.err.password_min")); setLoading(false); return; }
    const result = await signUp(email, password, fullName, lang);
    if (result.error) setError(result.error);
    else {
      rememberPendingVerificationEmail(email);
      toast.success(t("auth.verify_sent"));
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    }
    setLoading(false);
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);

    if (!companyName.trim() || !contactName.trim() || !companyEmail.trim()) {
      setError(t("auth.err.required"));
      setLoading(false);
      return;
    }
    if (companyPassword.length < 8) { setError(t("auth.err.password_min")); setLoading(false); return; }

    const industry = t(industryKey);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: companyEmail, password: companyPassword,
      options: {
        emailRedirectTo: getAuthRedirectUrl("/auth/callback"),
        data: {
          full_name: contactName, account_type: "company", company_name: companyName,
          industry, company_size: companySize, phone: companyPhone || null, website: companyWebsite || null,
          preferred_language: lang,
        },
      },
    });

    if (signUpError) { setError(signUpError.message); setLoading(false); return; }

    // Route lead through rate-limited edge function (avoids RLS block for unverified users)
    const { data: leadRes, error: leadErr } = await supabase.functions.invoke("submit-public-form", {
      body: {
        form: "enterprise",
        company_name: companyName,
        contact_name: contactName,
        email: companyEmail,
        phone: companyPhone || "",
        services_interested: industry,
        message: `Company registration - Size: ${companySize} | Website: ${companyWebsite || "N/A"}`,
      },
    });
    if (leadErr || leadRes?.error) {
      console.warn("Enterprise lead insert skipped:", leadErr?.message || leadRes?.error);
    }

    if (data.user) {
      // Safe identity/company fields only — privileges come from DB defaults / handle_new_user
      const { error: profileErr } = await supabase.from("user_profiles").upsert({
        id: data.user.id,
        email: companyEmail.trim().toLowerCase(),
        full_name: contactName.trim(),
        account_type: "company",
        company: companyName.trim(),
        website_url: companyWebsite.trim() || null,
        phone: companyPhone.trim() || null,
        role: industry,
      }, { onConflict: "id" });
      if (profileErr) {
        console.warn("Company profile upsert deferred to trigger:", profileErr.message);
      }
    }

    rememberPendingVerificationEmail(companyEmail);
    setCompanyCreated(true);
    toast.success(t("auth.verify_sent"));
    setTimeout(() => navigate(`/verify-email?email=${encodeURIComponent(companyEmail)}`), 1500);
    setLoading(false);
  };

  const titleMap: Record<AuthMode, string> = {
    login: t("auth.login.title"), signup: t("auth.signup.title"),
    reset: t("auth.reset.title"), "new-password": t("auth.newpw.title"),
  };
  const descMap: Record<AuthMode, string> = {
    login: t("auth.login.desc"), signup: t("auth.signup.desc"),
    reset: t("auth.reset.desc"), "new-password": t("auth.newpw.desc"),
  };

  const isAuthSpecial = mode === "reset" || mode === "new-password";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />{t("general.back")}
        </Link>

        <Card className="border border-border shadow-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary via-primary/60 to-primary/30" />
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center gap-2 mb-6">
              <BrandLogo size="lg" />
              <div className="text-center leading-tight">
                <span className="text-lg font-bold text-foreground block">{SITE.name}</span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {SITE.tagline}
                </span>
              </div>
            </div>

            {!isAuthSpecial && (
              <div className="flex rounded-xl border border-border p-1 mb-6 bg-secondary/30">
                <button onClick={() => switchType("individual")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${accountType === "individual" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <User className="w-4 h-4" />{t("auth.individual")}
                </button>
                <button onClick={() => switchType("company")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${accountType === "company" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <Building2 className="w-4 h-4" />{t("auth.company_tab")}
                </button>
              </div>
            )}

            {accountType === "company" && !isAuthSpecial && (
              <>
                {companyCreated ? (
                  <div className="text-center space-y-4 py-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">{t("auth.company_created")}</h2>
                    <p className="text-sm text-muted-foreground">{t("auth.company_created_desc")}</p>
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-left space-y-1.5">
                      <p className="font-semibold text-foreground mb-2">{t("auth.company_includes")}</p>
                      {companyFeatures.map((f) => (
                        <div key={f} className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />{f}
                        </div>
                      ))}
                    </div>
                    <Button className="w-full" onClick={() => navigate("/enterprise")}>{t("auth.explore_enterprise")}</Button>
                    <button onClick={() => { setCompanyCreated(false); resetError(); }} className="text-xs text-muted-foreground hover:text-primary">{t("auth.register_another")}</button>
                  </div>
                ) : mode === "login" ? (
                  <>
                    <div className="text-center mb-6">
                      <h1 className="text-2xl font-bold text-foreground mb-1">{t("auth.company_login")}</h1>
                      <p className="text-sm text-muted-foreground">{t("auth.company_login_desc")}</p>
                    </div>
                    <SocialAuthButtons mode="login" intent="company" onError={setError} layout="grid" />
                    <SocialAuthDivider />
                    <form onSubmit={handleIndividualSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="c-email">{t("auth.email")}</Label>
                        <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="company@example.com" required disabled={loading} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="c-password">{t("auth.password")}</Label>
                          <button type="button" onClick={() => switchMode("reset")} className="text-xs text-primary hover:underline">{t("auth.forgot")}</button>
                        </div>
                        <div className="relative">
                          <Input id="c-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="......" required disabled={loading} className="pr-10" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">{error}</div>}
                      <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                        {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{t("auth.login")}
                      </Button>
                    </form>
                    <p className="mt-4 text-center text-sm text-muted-foreground">{t("auth.no_company_account")}{" "}<button onClick={() => switchMode("signup")} className="text-primary hover:underline font-medium">{t("auth.register")}</button></p>
                  </>
                ) : (
                  <>
                    <div className="text-center mb-5">
                      <h1 className="text-2xl font-bold text-foreground mb-1">{t("auth.company_signup")}</h1>
                      <p className="text-sm text-muted-foreground">{t("auth.company_signup_desc")}</p>
                    </div>
                    <SocialAuthButtons mode="signup" intent="company" onError={setError} layout="grid" />
                    <SocialAuthDivider />
                    <form onSubmit={handleCompanySubmit} className="space-y-4">
                      <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" />{t("auth.company_info")}
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="companyName">{t("auth.company_name")} <span className="text-red-500">*</span></Label>
                          <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Flavors Ltd." required disabled={loading} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="industry">{t("auth.industry")} <span className="text-red-500">*</span></Label>
                            <div className="relative">
                              <select
                                id="industry"
                                value={industryKey}
                                onChange={(e) => setIndustryKey(e.target.value as (typeof INDUSTRY_KEYS)[number])}
                                disabled={loading}
                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-ring"
                              >
                                {INDUSTRY_KEYS.map((key) => (
                                  <option key={key} value={key}>{t(key)}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="companySize">{t("auth.company_size")} <span className="text-red-500">*</span></Label>
                            <div className="relative">
                              <select id="companySize" value={companySize} onChange={(e) => setCompanySize(e.target.value)} disabled={loading} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-ring">
                                {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s} {t("auth.employees")}</option>)}
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="companyWebsite"><span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />{t("auth.website")}</span></Label>
                          <Input id="companyWebsite" type="url" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="https://yourcompany.com" disabled={loading} />
                        </div>
                      </div>
                      <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />{t("auth.contact_person")}
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="contactName">{t("auth.name")} <span className="text-red-500">*</span></Label>
                          <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Smith" required disabled={loading} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="companyEmail">{t("auth.work_email")} <span className="text-red-500">*</span></Label>
                            <Input id="companyEmail" type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="jane@company.com" required disabled={loading} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="companyPhone"><span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{t("auth.phone")}</span></Label>
                            <Input id="companyPhone" type="tel" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="+971 50 000 0000" disabled={loading} />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="companyPassword">{t("auth.password")} <span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <Input id="companyPassword" type={showCompanyPw ? "text" : "password"} value={companyPassword} onChange={(e) => setCompanyPassword(e.target.value)} placeholder={t("auth.password_min")} required minLength={8} disabled={loading} className="pr-10" />
                          <button type="button" onClick={() => setShowCompanyPw(!showCompanyPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                            {showCompanyPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">{error}</div>}
                      <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{t("auth.enterprise_badge")}</p>
                          <p className="text-xs text-amber-600 dark:text-amber-500">{t("auth.enterprise_badge_desc")}</p>
                        </div>
                      </div>
                      <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11">
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t("auth.creating")}</> : <><Building2 className="w-4 h-4 mr-2" />{t("auth.create_company")}</>}
                      </Button>
                    </form>
                    <p className="mt-4 text-center text-sm text-muted-foreground">{t("auth.has_account")}{" "}<button onClick={() => switchMode("login")} className="text-primary hover:underline font-medium">{t("auth.login")}</button></p>
                  </>
                )}
              </>
            )}

            {(accountType === "individual" || isAuthSpecial) && (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-foreground mb-1">{titleMap[mode]}</h1>
                  <p className="text-sm text-muted-foreground">{descMap[mode]}</p>
                </div>
                {resetSent && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto"><CheckCircle className="w-8 h-8 text-green-600" /></div>
                    <p className="text-sm text-muted-foreground">{t("auth.reset.sent")}</p>
                    <Button variant="outline" className="w-full" onClick={() => switchMode("login")}>{t("auth.back_login")}</Button>
                  </div>
                )}
                {passwordUpdated && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto"><CheckCircle className="w-8 h-8 text-green-600" /></div>
                    <p className="text-sm text-muted-foreground">{t("auth.newpw.success")}</p>
                  </div>
                )}
                {!resetSent && !passwordUpdated && (
                  <>
                    {(mode === "login" || mode === "signup") && (
                      <div className="mb-1">
                        <SocialAuthButtons
                          mode={mode}
                          onError={setError}
                          layout="grid"
                        />
                        <SocialAuthDivider />
                      </div>
                    )}
                    <form onSubmit={handleIndividualSubmit} className="space-y-4">
                      {mode === "new-password" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="newPassword">{t("auth.newpw.label")}</Label>
                            <div className="relative">
                              <Input id="newPassword" type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="......" required minLength={8} disabled={loading} className="pr-10" />
                              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">{t("auth.newpw.confirm")}</Label>
                            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="......" required disabled={loading} />
                          </div>
                        </>
                      )}
                      {mode === "signup" && (
                        <div className="space-y-2">
                          <Label htmlFor="fullName">{t("auth.name")}</Label>
                          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required disabled={loading} />
                        </div>
                      )}
                      {mode !== "new-password" && (
                        <div className="space-y-2">
                          <Label htmlFor="email">{t("auth.email")}</Label>
                          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required disabled={loading} />
                        </div>
                      )}
                      {(mode === "login" || mode === "signup") && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="password">{t("auth.password")}</Label>
                            {mode === "login" && <button type="button" onClick={() => switchMode("reset")} className="text-xs text-primary hover:underline">{t("auth.forgot")}</button>}
                          </div>
                          <div className="relative">
                            <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="......" required minLength={8} disabled={loading} className="pr-10" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      )}
                      {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">{error}</div>}

                      <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                        {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        {mode === "login" ? t("auth.login") : mode === "signup" ? t("auth.signup") : mode === "reset" ? t("auth.reset.send") : t("auth.newpw.save")}
                      </Button>
                    </form>
                    <div className="mt-6 text-center text-sm text-muted-foreground">
                      {mode === "login" && <p>{t("auth.no_account")}{" "}<button onClick={() => switchMode("signup")} className="text-primary hover:underline font-medium">{t("auth.signup")}</button></p>}
                      {mode === "signup" && <p>{t("auth.has_account")}{" "}<button onClick={() => switchMode("login")} className="text-primary hover:underline font-medium">{t("auth.login")}</button></p>}
                      {(mode === "reset" || mode === "new-password") && <button onClick={() => switchMode("login")} className="text-primary hover:underline font-medium">{t("auth.back_login")}</button>}
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-4">
          {t("auth.agree_terms")}{" "}
          <Link to="/terms" className="hover:text-primary underline">{t("auth.terms_link")}</Link>
          {" "}{t("auth.and")}{" "}
          <Link to="/privacy" className="hover:text-primary underline">{t("auth.privacy_link")}</Link>
          .
        </p>
        <p className="text-center text-xs text-muted-foreground mt-2">
          {t("auth.welcome_policy_note")}
        </p>
      </div>
    </div>
  );
}
