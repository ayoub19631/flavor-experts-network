import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Loader2,
  MessageCircle,
  Send,
  AlertCircle,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { toast } from "sonner";

const infoItems = [
  { key: "expert", icon: Users },
  { key: "flexible", icon: Calendar },
  { key: "topic", icon: MessageCircle },
] as const;

export default function ConsultationsPage() {
  const { t } = useI18n();
  const { user, profile } = useAuth();
  usePageMeta({
    title: t("consultations.title"),
    description: t("consultations.desc"),
    path: "/consultations",
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    if ((formData.get("website_url") as string)?.trim()) {
      setSubmitted(true);
      setLoading(false);
      return;
    }

    const name = (formData.get("name") as string).trim();
    const email = (formData.get("email") as string).trim();
    const topic = (formData.get("topic") as string).trim();
    const preferred_date = (formData.get("preferred_date") as string).trim() || null;
    const message = (formData.get("message") as string).trim();

    if (!name || !email || !topic || !message) {
      setError(t("consultations.error.fields"));
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t("consultations.error.email"));
      setLoading(false);
      return;
    }

    try {
      if (user) {
        const { error: insertError } = await supabase.from("consultation_requests").insert({
          user_id: user.id,
          name,
          email,
          topic,
          preferred_date,
          message,
          status: "new",
        });

        if (insertError) {
          setError(insertError.message || t("consultations.error.submit"));
          setLoading(false);
          return;
        }
      } else {
        const { data, error: fnError } = await supabase.functions.invoke("submit-public-form", {
          body: {
            form: "consultation",
            name,
            email,
            topic,
            preferred_date,
            message,
            website_url: "",
          },
        });

        if (fnError || data?.error) {
          setError(data?.error || fnError?.message || t("consultations.error.submit"));
          setLoading(false);
          return;
        }
      }

      setSubmitted(true);
      toast.success(t("consultations.success"));
      (e.target as HTMLFormElement).reset();
    } catch {
      setError(t("consultations.error.submit"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-28 pb-10 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("general.back")}
          </Link>
          <Badge className="bg-primary/10 text-primary border-0 mb-4 px-3 py-1">
            {t("consultations.tag")}
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            {t("consultations.title")}
          </h1>
          <p className="text-muted-foreground max-w-2xl">{t("consultations.desc")}</p>
        </div>
      </section>

      <section className="py-10 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {infoItems.map(({ key, icon: Icon }) => (
                <Card key={key} className="border border-border">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {t(`consultations.info.${key}.title`)}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t(`consultations.info.${key}.desc`)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="lg:col-span-3 border border-border">
              <CardContent className="p-6 sm:p-8">
                {submitted ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <CheckCircle className="w-14 h-14 text-primary mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {t("consultations.sent")}
                    </h3>
                    <p className="text-muted-foreground mb-6">{t("consultations.sent_desc")}</p>
                    <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
                      {t("consultations.another")}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
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
                        <Label htmlFor="name">{t("consultations.name")}</Label>
                        <Input
                          id="name"
                          name="name"
                          defaultValue={profile?.full_name || ""}
                          placeholder={t("consultations.name_placeholder")}
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t("consultations.email")}</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          defaultValue={user?.email || ""}
                          placeholder={t("consultations.email_placeholder")}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="topic">{t("consultations.topic")}</Label>
                      <Input
                        id="topic"
                        name="topic"
                        placeholder={t("consultations.topic_placeholder")}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preferred_date">{t("consultations.date")}</Label>
                      <Input
                        id="preferred_date"
                        name="preferred_date"
                        type="date"
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">{t("consultations.message")}</Label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder={t("consultations.message_placeholder")}
                        rows={5}
                        required
                        disabled={loading}
                      />
                    </div>
                    {error && (
                      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                      </div>
                    )}
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full gap-2 bg-primary hover:bg-primary/90"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {loading ? t("consultations.sending") : t("consultations.submit")}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
