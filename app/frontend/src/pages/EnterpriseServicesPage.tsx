import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Megaphone,
  FileText,
  Award,
  BarChart3,
  Building2,
  Send,
  Loader2,
  CheckCircle,
  Star,
  Globe,
  Users,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { toast } from "sonner";

const services = [
  {
    key: "ads",
    icon: Megaphone,
    color: "bg-blue-100 text-blue-600",
    highlight: "3x/month",
  },
  {
    key: "articles",
    icon: FileText,
    color: "bg-emerald-100 text-emerald-600",
    highlight: "Unlimited",
  },
  {
    key: "logo",
    icon: Award,
    color: "bg-amber-100 text-amber-600",
    highlight: "Featured",
  },
  {
    key: "reports",
    icon: BarChart3,
    color: "bg-purple-100 text-purple-600",
    highlight: "Monthly",
  },
];

const stats = [
  { key: "members", icon: Users, valueKey: "enterprise.stat.members" },
  { key: "countries", icon: Globe, valueKey: "enterprise.stat.countries" },
  { key: "engagement", icon: TrendingUp, valueKey: "enterprise.stat.engagement" },
  { key: "satisfaction", icon: Star, valueKey: "enterprise.stat.satisfaction" },
] as const;

export default function EnterpriseServicesPage() {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      company_name: (formData.get("company") as string).trim(),
      contact_name: (formData.get("name") as string).trim(),
      email: (formData.get("email") as string).trim(),
      phone: (formData.get("phone") as string).trim(),
      services_interested: (formData.get("services") as string).trim(),
      message: (formData.get("message") as string).trim(),
    };

    if (!data.company_name || !data.contact_name || !data.email || !data.message) {
      setError(t("contact.error.fields"));
      setLoading(false);
      return;
    }

    try {
      const { data: res, error: fnError } = await supabase.functions.invoke("submit-public-form", {
        body: {
          form: "enterprise",
          ...data,
          website_url: (formData.get("website_url") as string) || "",
        },
      });
      if (fnError || res?.error) {
        setError(res?.error || fnError?.message || t("contact.error.unexpected"));
        setLoading(false);
        return;
      }
      setSubmitted(true);
      toast.success(
        lang === "ar"
          ? "تم إرسال الطلب! سنتواصل معك خلال 24 ساعة."
          : "Request submitted! We'll contact you within 24 hours.",
      );
    } catch {
      setError(t("contact.error.unexpected"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-28 pb-16 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("general.back")}
          </Link>

          <div className="text-center max-w-3xl mx-auto">
            <Badge className="bg-primary/10 text-primary border-0 mb-4 px-4 py-1.5">
              <Building2 className="w-3.5 h-3.5 me-1.5" />
              {t("enterprise.badge")}
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
              {t("enterprise.title")}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t("enterprise.desc")}
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.key} className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{t(stat.valueKey)}</p>
                  <p className="text-sm text-muted-foreground">{t(`enterprise.stat.${stat.key}`)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              {t("enterprise.services.title")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("enterprise.services.desc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <Card
                  key={service.key}
                  className="border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl ${service.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-foreground">
                            {t(`enterprise.service.${service.key}.title`)}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {service.highlight}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {t(`enterprise.service.${service.key}.desc`)}
                        </p>
                        <ul className="mt-3 space-y-1.5">
                          {[1, 2, 3].map((i) => (
                            <li
                              key={i}
                              className="flex items-center gap-2 text-sm text-muted-foreground"
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                              {t(`enterprise.service.${service.key}.f${i}`)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Request Form */}
      <section className="py-16 bg-secondary/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              {t("enterprise.form.title")}
            </h2>
            <p className="text-muted-foreground">
              {t("enterprise.form.desc")}
            </p>
          </div>

          <Card className="border border-border shadow-lg">
            <CardContent className="p-6 sm:p-8">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="w-16 h-16 text-primary mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {t("enterprise.form.success")}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {t("enterprise.form.success_desc")}
                  </p>
                  <Link to="/pricing">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      {t("enterprise.form.view_pricing")}
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <input
                    type="text"
                    name="website_url"
                    tabIndex={-1}
                    autoComplete="off"
                    className="hidden"
                    aria-hidden="true"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company">{t("enterprise.form.company")}</Label>
                      <Input
                        id="company"
                        name="company"
                        placeholder={t("enterprise.form.company_placeholder")}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">{t("enterprise.form.name")}</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder={t("enterprise.form.name_placeholder")}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t("enterprise.form.email")}</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="company@example.com"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t("enterprise.form.phone")}</Label>
                      <Input
                        id="phone"
                        name="phone"
                        placeholder="+1 (555) 000-0000"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="services">{t("enterprise.form.services")}</Label>
                    <Input
                      id="services"
                      name="services"
                      placeholder={t("enterprise.form.services_placeholder")}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">{t("enterprise.form.message")}</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder={t("enterprise.form.message_placeholder")}
                      rows={4}
                      required
                      disabled={loading}
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {loading ? t("contact.sending") : t("enterprise.form.submit")}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <FooterSection />
    </div>
  );
}