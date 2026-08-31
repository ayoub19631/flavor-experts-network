import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mail,
  MapPin,
  Linkedin,
  Send,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { SITE } from "@/lib/site-config";
import { toast } from "sonner";

export default function ContactSection() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedToDb, setSavedToDb] = useState(false);
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSavedToDb(false);

    const formData = new FormData(e.currentTarget);
    // Honeypot — bots fill hidden fields; humans leave empty
    if ((formData.get("website_url") as string)?.trim()) {
      setSubmitted(true);
      setLoading(false);
      return;
    }

    const name = (formData.get("name") as string).trim();
    const email = (formData.get("email") as string).trim();
    const subject = (formData.get("subject") as string).trim();
    const message = (formData.get("message") as string).trim();

    if (!name || !email || !subject || !message) {
      setError(t("contact.error.fields"));
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t("contact.error.email"));
      setLoading(false);
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("submit-public-form", {
        body: {
          form: "contact",
          name,
          email,
          subject,
          message,
          website_url: (formData.get("website_url") as string) || "",
        },
      });

      if (fnError || data?.error) {
        const msg = data?.error || fnError?.message || "Failed to send message";
        setError(msg.includes("Too many") ? msg : t("contact.error.unexpected"));
        setLoading(false);
        return;
      }

      setSavedToDb(true);
      setSubmitted(true);
      toast.success(t("contact.success"));
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      console.error("Submit error:", err);
      setError(t("contact.error.unexpected"));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setError(null);
    setSavedToDb(false);
  };

  return (
    <section id="contact" className="py-20 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-2">
            {t("contact.tag")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t("contact.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            {t("contact.desc")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-border hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">{t("contact.email")}</h4>
                  {SITE.supportEmail ? (
                    <a
                      href={`mailto:${SITE.supportEmail}`}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {SITE.supportEmail}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("contact.email_unconfigured")}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Linkedin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">
                    {t("contact.linkedin")}
                  </h4>
                  <a
                    href="https://www.linkedin.com/groups/13155714/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Flavor Experts Network
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">
                    {t("contact.global")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("contact.global.desc")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card className="lg:col-span-3 border border-border">
            <CardContent className="p-6 sm:p-8">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="w-14 h-14 text-primary mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {t("contact.sent")}
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    {t("contact.sent.desc")}
                  </p>
                  {savedToDb && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1 mb-4">
                      <CheckCircle className="w-3 h-3" />
                      {t("contact.saved")}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="mt-2"
                  >
                    {t("contact.another")}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Honeypot field — hidden from users */}
                  <input
                    type="text"
                    name="website_url"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="absolute -left-[9999px] h-0 w-0 opacity-0"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t("contact.name")}</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder={t("contact.name.placeholder")}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t("contact.email.label")}</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your@email.com"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">{t("contact.subject")}</Label>
                    <Input
                      id="subject"
                      name="subject"
                      placeholder={t("contact.subject.placeholder")}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">{t("contact.message")}</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder={t("contact.message.placeholder")}
                      rows={5}
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
                    {loading ? t("contact.sending") : t("contact.send")}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}