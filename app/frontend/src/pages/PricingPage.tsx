import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Check, X, ArrowLeft, Crown, Zap, Building2, Star,
  Shield, Clock, Users, BookOpen, Video, BarChart2,
  Headphones, ChevronDown, ChevronUp, FileText, Globe, Award,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import PaymentModal, { CURRENCIES, convertPrice } from "@/components/PaymentModal";
import { toast } from "sonner";

const COMPARISON_ROWS = (t: (k: string) => string, lang: string) => [
  { category: lang === "ar" ? "الأخبار والمحتوى" : "News & Content", features: [
    { label: lang === "ar" ? "أخبار الصناعة العامة" : "Public Industry News", free: true, pro: true, ent: true },
    { label: lang === "ar" ? "أوراق بحثية مميزة" : "Premium Research Papers", free: false, pro: true, ent: true },
    { label: lang === "ar" ? "تقارير السوق الشهرية" : "Monthly Market Reports", free: false, pro: true, ent: true },
    { label: lang === "ar" ? "المقالات التقنية المتخصصة" : "Specialized Technical Articles", free: false, pro: true, ent: true },
  ]},
  { category: lang === "ar" ? "التعلم والتطوير" : "Learning & Development", features: [
    { label: lang === "ar" ? "مكتبة الموارد الأساسية" : "Basic Resource Library", free: true, pro: true, ent: true },
    { label: lang === "ar" ? "الندوات والورش الحصرية" : "Exclusive Webinars & Workshops", free: false, pro: true, ent: true },
    { label: lang === "ar" ? "دورات تدريبية معتمدة" : "Certified Training Courses", free: false, pro: true, ent: true },
    { label: lang === "ar" ? "أدلة التركيب المتقدمة" : "Advanced Formulation Guides", free: false, pro: true, ent: true },
  ]},
  { category: lang === "ar" ? "الشبكات المهنية" : "Professional Networking", features: [
    { label: lang === "ar" ? "دليل الأعضاء" : "Members Directory", free: true, pro: true, ent: true },
    { label: lang === "ar" ? "الوصول لمنتدى المجتمع" : "Community Forum Access", free: true, pro: true, ent: true },
    { label: lang === "ar" ? "أولوية في فعاليات التواصل" : "Priority Networking Events", free: false, pro: true, ent: true },
    { label: lang === "ar" ? "استشارات مباشرة مع خبراء" : "Direct Expert Consultations", free: false, pro: true, ent: true },
  ]},
  { category: lang === "ar" ? "خدمات الشركات" : "Enterprise Services", features: [
    { label: lang === "ar" ? "3 إعلانات شهرية للشركة" : "3 Company Ads per Month", free: false, pro: false, ent: true },
    { label: lang === "ar" ? "نشر مقالات الشركة" : "Publish Company Articles", free: false, pro: false, ent: true },
    { label: lang === "ar" ? "شعار الشركة في صفحة الشركاء" : "Logo in Partners Section", free: false, pro: false, ent: true },
    { label: lang === "ar" ? "تقارير أداء وتحليلات مفصلة" : "Performance Reports & Analytics", free: false, pro: false, ent: true },
    { label: lang === "ar" ? "مدير حساب مخصص" : "Dedicated Account Manager", free: false, pro: false, ent: true },
  ]},
  { category: lang === "ar" ? "الدعم" : "Support", features: [
    { label: lang === "ar" ? "دعم عبر البريد الإلكتروني" : "Email Support", free: true, pro: true, ent: true },
    { label: lang === "ar" ? "دعم ذو أولوية" : "Priority Support", free: false, pro: true, ent: true },
    { label: lang === "ar" ? "دعم هاتفي مخصص" : "Dedicated Phone Support", free: false, pro: false, ent: true },
  ]},
];

const FAQ_ITEMS = (lang: string) => [
  {
    q: lang === "ar" ? "هل يمكنني الترقية أو الإلغاء في أي وقت؟" : "Can I upgrade or cancel at any time?",
    a: lang === "ar" ? "نعم، يمكنك الترقية في أي وقت والاستمتاع بالمزايا الجديدة فوراً. يمكن إلغاء الاشتراك في أي وقت وسيبقى نشطاً حتى نهاية دورة الفوترة الحالية." : "Yes, you can upgrade anytime and enjoy new features immediately. Cancellations take effect at the end of the current billing cycle.",
  },
  {
    q: lang === "ar" ? "هل هناك فترة تجريبية مجانية؟" : "Is there a free trial?",
    a: lang === "ar" ? "نعم! يمكنك البدء بالخطة المجانية إلى الأبد. للخطط المدفوعة، نقدم ضمان استرداد الأموال خلال 7 أيام إذا لم تكن راضياً." : "Yes! You can start with the Free plan forever. For paid plans, we offer a 7-day money-back guarantee if you're not satisfied.",
  },
  {
    q: lang === "ar" ? "هل الأوراق البحثية متاحة للتنزيل؟" : "Are research papers available for download?",
    a: lang === "ar" ? "نعم، جميع الأوراق البحثية المميزة متاحة للتنزيل بصيغة PDF للأعضاء المحترفين والمؤسسيين." : "Yes, all premium research papers are available for PDF download for Professional and Enterprise members.",
  },
  {
    q: lang === "ar" ? "كيف تعمل خطة الشركات؟" : "How does the Enterprise plan work?",
    a: lang === "ar" ? "خطة الشركات مصممة للفرق والمؤسسات. تشمل جميع مزايا الخطة الاحترافية بالإضافة إلى أدوات التسويق والإعلان وتحليلات الأداء وإبراز العلامة التجارية." : "The Enterprise plan is designed for teams and organizations. It includes all Professional features plus marketing tools, advertising, performance analytics, and brand placement.",
  },
  {
    q: lang === "ar" ? "ما طرق الدفع المقبولة؟" : "What payment methods are accepted?",
    a: lang === "ar" ? "نقبل جميع بطاقات الائتمان الرئيسية (Visa, Mastercard, Amex) والتحويل البنكي للخطط المؤسسية." : "We accept all major credit cards (Visa, Mastercard, Amex) and bank transfers for Enterprise plans.",
  },
  {
    q: lang === "ar" ? "هل يمكن مشاركة الحساب مع الفريق؟" : "Can the account be shared with a team?",
    a: lang === "ar" ? "الحسابات الفردية والمهنية هي لمستخدم واحد. للفرق، تواصل معنا للحصول على خطط مخصصة متعددة المستخدمين." : "Individual and Professional accounts are for single users. For teams, contact us for custom multi-user plans.",
  },
];

export default function PricingPage() {
  const { user, profile, isEmailVerified } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Currency & Payment
  const [currencyCode, setCurrencyCode] = useState(
    localStorage.getItem("fen-preferred-currency") || "USD"
  );
  const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  const [paymentPlan, setPaymentPlan] = useState<{ key: "professional" | "enterprise"; priceUSD: number } | null>(null);

  const startCheckout = (key: "professional" | "enterprise", priceUSD: number) => {
    if (!user) {
      navigate("/auth?mode=signup");
      return;
    }
    if (!isEmailVerified) {
      toast.info(t("auth.verify_before_subscribe"));
      navigate(`/verify-email?email=${encodeURIComponent(user.email || "")}`);
      return;
    }
    setPaymentPlan({ key, priceUSD });
  };

  const discount = billing === "annual" ? 0.8 : 1;
  const currentTier = profile?.subscription_tier || "free";

  // Price in selected currency
  const proUSD = billing === "annual" ? Math.round(29 * 12 * 0.8 / 12) : 29;
  const entUSD = billing === "annual" ? Math.round(99 * 12 * 0.8 / 12) : 99;

  const plans = [
    {
      key: "free",
      icon: Zap,
      price: { monthly: "$0", annual: "$0" },
      period: lang === "ar" ? "مجاناً للأبد" : "forever",
      highlight: false,
      gradient: "from-gray-400 to-gray-500",
      badgeColor: "",
      features: [
        lang === "ar" ? "الوصول للأخبار والمقالات العامة" : "Access to public news & articles",
        lang === "ar" ? "الوصول لمنتدى المجتمع" : "Community forum access",
        lang === "ar" ? "النشرة الإخبارية الشهرية" : "Monthly newsletter",
        lang === "ar" ? "مكتبة الموارد الأساسية" : "Basic resource library",
      ],
      cta: currentTier === "free" ? (lang === "ar" ? "خطتك الحالية" : "Current Plan") : (lang === "ar" ? "خطة مجانية" : "Free Plan"),
      ctaDisabled: currentTier === "free",
      ctaLink: "/auth",
      tierKey: "free",
    },
    {
      key: "professional",
      icon: Crown,
      price: { monthly: "$29", annual: `$${Math.round(29 * 12 * 0.8 / 12)}` },
      period: lang === "ar" ? "/شهر" : "/month",
      highlight: true,
      gradient: "from-primary via-primary/80 to-primary/60",
      badgeColor: "bg-primary text-primary-foreground",
      features: [
        lang === "ar" ? "جميع ميزات الخطة المجانية" : "All Free features",
        lang === "ar" ? "أوراق بحثية مميزة" : "Premium research papers",
        lang === "ar" ? "ندوات وورش عمل حصرية" : "Exclusive webinars & workshops",
        lang === "ar" ? "تقارير وتحليلات الصناعة" : "Industry reports & analytics",
        lang === "ar" ? "أولوية في فعاليات التواصل" : "Priority networking events",
        lang === "ar" ? "استشارات مباشرة مع الخبراء" : "Direct expert consultations",
      ],
      cta: currentTier === "professional" ? (lang === "ar" ? "خطتك الحالية" : "Current Plan") : (lang === "ar" ? "ابدأ الآن" : "Get Started"),
      ctaDisabled: currentTier === "professional",
      ctaLink: user ? "/enterprise" : "/auth",
      tierKey: "professional",
    },
    {
      key: "enterprise",
      icon: Building2,
      price: { monthly: "$99", annual: `$${Math.round(99 * 12 * 0.8 / 12)}` },
      period: lang === "ar" ? "/شهر" : "/month",
      highlight: false,
      gradient: "from-[hsl(208_100%_16%)] via-[hsl(208_70%_28%)] to-[hsl(47_30%_70%)]",
      badgeColor: "bg-primary text-primary-foreground",
      features: [
        lang === "ar" ? "جميع ميزات الخطة الاحترافية" : "All Professional features",
        lang === "ar" ? "3 إعلانات شهرية للشركة" : "3 company ads per month",
        lang === "ar" ? "نشر مقالات الشركة على الموقع" : "Publish company articles on site",
        lang === "ar" ? "شعار الشركة في قسم الشركاء" : "Company logo in Partners section",
        lang === "ar" ? "تقارير أداء شهرية مفصلة" : "Monthly performance reports",
        lang === "ar" ? "مدير حساب مخصص" : "Dedicated account manager",
      ],
      cta: currentTier === "enterprise" ? (lang === "ar" ? "خطتك الحالية" : "Current Plan") : (lang === "ar" ? "تواصل مع المبيعات" : "Contact Sales"),
      ctaDisabled: currentTier === "enterprise",
      ctaLink: "/enterprise",
      tierKey: "enterprise",
    },
  ];

  const faqItems = FAQ_ITEMS(lang);
  const compRows = COMPARISON_ROWS(t, lang);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back */}
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t("general.back")}
          </Link>

          {/* Header */}
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-primary/10 text-primary border-none px-4 py-1.5 text-sm font-semibold">
              {t("pricing.tag")}
            </Badge>
            <div className="mb-4 mx-auto max-w-xl rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
              {lang === "ar"
                ? "وضع الاختبار: خطط الأسعار معروضة للمعاينة فقط — خدمات البيع والاشتراك المدفوع غير مفعّلة حالياً."
                : "Testing mode: pricing plans are shown for preview only — paid sales and subscriptions are not active yet."}
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold text-foreground mb-4 leading-tight">
              {t("pricing.title")}
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
              {t("pricing.desc")}
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mt-8 flex-wrap">
              <span className={`text-sm font-medium ${billing === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>
                {lang === "ar" ? "شهري" : "Monthly"}
              </span>
              <button
                onClick={() => setBilling(b => b === "monthly" ? "annual" : "monthly")}
                className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${billing === "annual" ? "bg-primary" : "bg-muted"}`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${billing === "annual" ? "translate-x-8" : "translate-x-1"}`} />
              </button>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${billing === "annual" ? "text-foreground" : "text-muted-foreground"}`}>
                  {lang === "ar" ? "سنوي" : "Annual"}
                </span>
                {billing === "annual" && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-bold border-none">
                    {lang === "ar" ? "وفّر 20%" : "Save 20%"}
                  </Badge>
                )}
              </div>
              {/* Currency Selector */}
              <div className="flex items-center gap-2 border-l border-border pl-4 ml-2">
                <span className="text-sm text-muted-foreground">💱</span>
                <Select value={currencyCode} onValueChange={code => { setCurrencyCode(code); localStorage.setItem("fen-preferred-currency", code); }}>
                  <SelectTrigger className="h-8 w-44 text-sm border-border">
                    <SelectValue>
                      <span className="flex items-center gap-1.5">
                        <span>{currency.flag}</span>
                        <span className="font-semibold">{currency.code}</span>
                        <span className="text-muted-foreground text-xs">{currency.symbol}</span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="flex items-center gap-2">
                          <span>{c.flag}</span>
                          <span className="font-medium w-10">{c.code}</span>
                          <span className="text-muted-foreground text-xs">{c.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Trusted by */}
          <div className="flex items-center justify-center gap-6 mb-12 flex-wrap text-sm text-muted-foreground">
            {[
              { icon: Users, label: lang === "ar" ? "مجتمع مهني" : "Professional community" },
              { icon: Globe, label: lang === "ar" ? "انتشار عالمي" : "Global reach" },
              { icon: Shield, label: lang === "ar" ? "دفع آمن 100%" : "100% secure payment" },
              { icon: Award, label: lang === "ar" ? "ضمان استرداد 7 أيام" : "7-day money-back" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="w-4 h-4 text-primary" />
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <Card
                  key={plan.key}
                  className={`relative border-2 transition-all duration-300 overflow-hidden ${
                    plan.highlight
                      ? "border-primary shadow-2xl shadow-primary/20 scale-[1.03] md:scale-[1.05]"
                      : plan.key === "enterprise"
                        ? "border-primary/30 hover:border-primary/40 hover:shadow-xl"
                        : "border-border hover:border-primary/30 hover:shadow-xl"
                  }`}
                >
                  {/* Gradient strip */}
                  <div className={`h-1.5 bg-gradient-to-r ${plan.gradient}`} />

                  {plan.highlight && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5">
                        {t("pricing.popular")}
                      </Badge>
                    </div>
                  )}

                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-sm`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{t(`pricing.${plan.key === "professional" ? "pro" : plan.key}`)}</h3>
                        <p className="text-xs text-muted-foreground">{t(`pricing.${plan.key === "professional" ? "pro" : plan.key}.desc`)}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-5">
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-extrabold text-foreground">
                          {plan.key === "free"
                            ? "$0"
                            : plan.key === "professional"
                              ? convertPrice(proUSD, currency)
                              : convertPrice(entUSD, currency)}
                        </span>
                        <span className="text-sm text-muted-foreground mb-1.5">{plan.period}</span>
                      </div>
                      {currencyCode !== "USD" && plan.key !== "free" && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ≈ ${plan.key === "professional" ? proUSD : entUSD} USD
                        </p>
                      )}
                      {billing === "annual" && plan.key !== "free" && (
                        <p className="text-xs text-emerald-600 font-medium mt-0.5">
                          {lang === "ar" ? `بدلاً من ${plan.price.monthly}/شهر` : `Instead of ${plan.price.monthly}/month`}
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-2.5 mb-6">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-sm">
                          <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlight ? "text-primary" : plan.key === "enterprise" ? "text-primary" : "text-emerald-500"}`} />
                          <span className="text-muted-foreground">{feat}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    {plan.ctaDisabled ? (
                      <Button variant="outline" className="w-full" disabled>
                        <Check className="w-4 h-4 mr-2" /> {plan.cta}
                      </Button>
                    ) : plan.key === "enterprise" ? (
                      <Link to={plan.ctaLink}>
                        <Button variant="outline" className="w-full border-primary/40 text-primary hover:bg-secondary dark:hover:bg-primary/20 font-semibold">
                          {plan.cta}
                        </Button>
                      </Link>
                    ) : plan.key === "professional" ? (
                      user ? (
                        <Button
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/30"
                          onClick={() => startCheckout("professional", billing === "annual" ? proUSD * 12 : proUSD)}
                        >
                          {plan.cta}
                        </Button>
                      ) : (
                        <Link to="/auth">
                          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/30">
                            {plan.cta}
                          </Button>
                        </Link>
                      )
                    ) : (
                      <Link to={plan.ctaLink}>
                        <Button variant="outline" className="w-full">{plan.cta}</Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Feature Comparison Toggle */}
          <div className="max-w-5xl mx-auto mb-16">
            <div className="text-center mb-6">
              <button
                onClick={() => setShowComparison(c => !c)}
                className="inline-flex items-center gap-2 text-primary font-semibold hover:underline text-sm"
              >
                {showComparison
                  ? (lang === "ar" ? "إخفاء المقارنة التفصيلية" : "Hide detailed comparison")
                  : (lang === "ar" ? "عرض مقارنة تفصيلية كاملة" : "Show full feature comparison")}
                {showComparison ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showComparison && (
              <div className="rounded-2xl border border-border overflow-hidden shadow-lg">
                {/* Table Header */}
                <div className="grid grid-cols-4 bg-muted/50 border-b border-border">
                  <div className="p-4 text-sm font-semibold text-muted-foreground">{lang === "ar" ? "الميزة" : "Feature"}</div>
                  {[
                    { label: lang === "ar" ? "مجاني" : "Free", icon: Zap, color: "text-gray-500" },
                    { label: lang === "ar" ? "احترافي" : "Professional", icon: Crown, color: "text-primary" },
                    { label: lang === "ar" ? "مؤسسي" : "Enterprise", icon: Building2, color: "text-primary" },
                  ].map(({ label, icon: Icon, color }) => (
                    <div key={label} className="p-4 text-center">
                      <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                      <p className={`text-sm font-bold ${color}`}>{label}</p>
                    </div>
                  ))}
                </div>
                {compRows.map(({ category, features }, ci) => (
                  <div key={category}>
                    <div className="grid grid-cols-4 bg-muted/20 border-b border-border">
                      <div className="p-3 col-span-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">{category}</div>
                    </div>
                    {features.map(({ label, free, pro, ent }, fi) => (
                      <div key={label} className={`grid grid-cols-4 border-b border-border ${fi % 2 === 0 ? "" : "bg-muted/10"}`}>
                        <div className="p-3 text-sm text-foreground">{label}</div>
                        {[free, pro, ent].map((val, vi) => (
                          <div key={vi} className="p-3 flex justify-center items-center">
                            {val
                              ? <Check className="w-4 h-4 text-emerald-500" />
                              : <X className="w-4 h-4 text-muted-foreground/30" />}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Value Props */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16">
            {[
              { icon: FileText, title: lang === "ar" ? "موارد بحثية" : "Research Resources", desc: lang === "ar" ? "محتوى علمي مختار" : "Curated scientific content" },
              { icon: Video, title: lang === "ar" ? "50+ ندوة سنوياً" : "50+ Webinars/Year", desc: lang === "ar" ? "مع خبراء دوليين" : "With global experts" },
              { icon: BarChart2, title: lang === "ar" ? "تقارير السوق الشهرية" : "Monthly Market Reports", desc: lang === "ar" ? "تحليلات حصرية" : "Exclusive analytics" },
              { icon: Headphones, title: lang === "ar" ? "دعم متميز" : "Priority Support", desc: lang === "ar" ? "استجابة خلال 24 ساعة" : "24h response time" },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="border border-border text-center hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-bold text-foreground text-sm mb-1">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQ */}
          <div className="max-w-3xl mx-auto mb-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">{lang === "ar" ? "الأسئلة الشائعة" : "Frequently Asked Questions"}</h2>
              <p className="text-muted-foreground">{lang === "ar" ? "إجابات على أهم أسئلتك" : "Answers to your most important questions"}</p>
            </div>
            <div className="space-y-3">
              {faqItems.map((item, i) => (
                <Card key={i} className="border border-border overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <span className="font-semibold text-foreground text-sm pr-4">{item.q}</span>
                    {openFaq === i
                      ? <ChevronUp className="w-4 h-4 text-primary flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* CTA Banner */}
          <div className="max-w-3xl mx-auto">
            <div className="rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/70 p-8 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <Crown className="absolute w-32 h-32 top-0 right-8 rotate-12" />
                <Star className="absolute w-24 h-24 bottom-0 left-8 -rotate-12" />
              </div>
              <div className="relative">
                <Badge className="bg-white/20 text-white border-white/30 mb-4 text-xs px-3 py-1">
                  {lang === "ar" ? "🎉 الأكثر شعبية" : "🎉 Most Popular"}
                </Badge>
                <h2 className="text-2xl font-bold mb-2">
                  {lang === "ar" ? "ابدأ بالخطة الاحترافية اليوم" : "Start Professional Today"}
                </h2>
                <p className="text-white/80 mb-6 text-sm">
                  {lang === "ar" ? "انضم لمجتمع خبراء النكهات. ابدأ بـ $29/شهر فقط." : "Join the flavor experts community. Start at just $29/month."}
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Link to={user ? "/enterprise" : "/auth"}>
                    <Button className="bg-white text-primary hover:bg-white/90 font-bold px-8 shadow-lg">
                      <Crown className="w-4 h-4 mr-2" />
                      {lang === "ar" ? "ابدأ الآن" : "Get Started Now"}
                    </Button>
                  </Link>
                  <Link to="/enterprise">
                    <Button variant="outline" className="border-white/40 text-white hover:bg-white/10 font-semibold">
                      <Building2 className="w-4 h-4 mr-2" />
                      {lang === "ar" ? "خيارات الشركات" : "Enterprise Options"}
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center justify-center gap-4 mt-6 text-xs text-white/70">
                  <div className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> {lang === "ar" ? "دفع آمن" : "Secure payment"}</div>
                  <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {lang === "ar" ? "إلغاء في أي وقت" : "Cancel anytime"}</div>
                  <div className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> {lang === "ar" ? "ضمان 7 أيام" : "7-day guarantee"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <FooterSection />

      {/* Payment Modal */}
      {paymentPlan && (
        <PaymentModal
          open={!!paymentPlan}
          onClose={() => setPaymentPlan(null)}
          initialCurrency={currencyCode}
          plan={{
            key: paymentPlan.key,
            name: paymentPlan.key === "professional" ? "Professional" : "Enterprise",
            priceUSD: paymentPlan.priceUSD,
            period: billing,
            features: paymentPlan.key === "professional"
              ? ["Premium Research Papers", "Exclusive Webinars", "Expert Consultations", "Industry Reports"]
              : ["All Professional Features", "Company Ads", "Dedicated Account Manager", "Performance Reports"],
            gradient: paymentPlan.key === "professional"
              ? "from-primary via-primary/80 to-primary/60"
              : "from-[hsl(208_100%_16%)] via-[hsl(208_70%_28%)] to-[hsl(47_30%_70%)]",
            icon: paymentPlan.key === "professional" ? Crown : Building2,
            color: "text-primary",
          }}
        />
      )}
    </div>
  );
}
