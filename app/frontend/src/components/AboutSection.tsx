import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Globe, Lightbulb, Award, Linkedin, Upload, User, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

const STORAGE_KEY_1 = "fen_founder1_img";
const STORAGE_KEY_2 = "fen_founder2_img";

export default function AboutSection() {
  const { t } = useI18n();
  const { isAdmin } = useAuth();
  const [founderImage1, setFounderImage1] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY_1)
  );
  const [founderImage2, setFounderImage2] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY_2)
  );
  const [uploading1, setUploading1] = useState(false);
  const [uploading2, setUploading2] = useState(false);
  const inputRef1 = useRef<HTMLInputElement>(null);
  const inputRef2 = useRef<HTMLInputElement>(null);

  async function uploadFounderImage(
    file: File,
    slot: 1 | 2,
    setter: (url: string) => void,
    setUploading: (v: boolean) => void,
    storageKey: string
  ) {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `founders/founder${slot}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("platform-uploads")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("platform-uploads").getPublicUrl(path);
      const url = data.publicUrl;
      setter(url);
      localStorage.setItem(storageKey, url);
    } catch {
      // Fallback: use local FileReader preview (not persistent)
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setter(dataUrl);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  }

  const highlights = [
    {
      icon: Target,
      title: t("about.mission.title"),
      description: t("about.mission.desc"),
    },
    {
      icon: Globe,
      title: t("about.global.title"),
      description: t("about.global.desc"),
    },
    {
      icon: Lightbulb,
      title: t("about.knowledge.title"),
      description: t("about.knowledge.desc"),
    },
    {
      icon: Award,
      title: t("about.expert.title"),
      description: t("about.expert.desc"),
    },
  ];

  return (
    <section id="about" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-2">
            {t("about.tag")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t("about.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            {t("about.desc")}
          </p>
        </div>

        {/* Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {highlights.map((item) => (
            <Card
              key={item.title}
              className="border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
            >
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Founders & Leadership */}
        <div className="mb-12">
          <div className="text-center mb-10">
            <span className="inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-2">
              {t("about.founders.tag")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              {t("about.founders.title")}
            </h2>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              {t("about.founders.desc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Founder 1 - Talal Al Boushi */}
            <Card className="border border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <CardContent className="p-0">
                {/* Photo Area */}
                <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/30 flex items-center justify-center overflow-hidden">
                  {founderImage1 ? (
                    <img
                      src={founderImage1}
                      alt="Talal Al Boushi"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                        <span className="text-3xl font-bold text-primary-foreground">
                          TB
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Upload overlay — admin only */}
                  {isAdmin && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all cursor-pointer opacity-0 group-hover:opacity-100">
                    <div className="flex items-center gap-2 bg-white/90 rounded-lg px-4 py-2 shadow-lg">
                      {uploading1 ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 text-primary" />
                      )}
                      <span className="text-sm font-medium text-primary">
                        {t("about.founders.upload")}
                      </span>
                    </div>
                    <input
                      ref={inputRef1}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadFounderImage(file, 1, setFounderImage1, setUploading1, STORAGE_KEY_1);
                      }}
                    />
                  </label>
                  )}
                </div>

                {/* Info */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {t("about.founder1.role_tag")}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {t("about.founder1.name")}
                  </h3>
                  <p className="text-sm font-medium text-primary mb-3">
                    {t("about.founder1.title")}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("about.founder1.desc")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Founder 2 - Ayoub Akbik */}
            <Card className="border border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <CardContent className="p-0">
                {/* Photo Area */}
                <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/30 flex items-center justify-center overflow-hidden">
                  {founderImage2 ? (
                    <img
                      src={founderImage2}
                      alt="Ayoub Akbik"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                        <span className="text-3xl font-bold text-primary-foreground">
                          AA
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Upload overlay — admin only */}
                  {isAdmin && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all cursor-pointer opacity-0 group-hover:opacity-100">
                    <div className="flex items-center gap-2 bg-white/90 rounded-lg px-4 py-2 shadow-lg">
                      {uploading2 ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 text-primary" />
                      )}
                      <span className="text-sm font-medium text-primary">
                        {t("about.founders.upload")}
                      </span>
                    </div>
                    <input
                      ref={inputRef2}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadFounderImage(file, 2, setFounderImage2, setUploading2, STORAGE_KEY_2);
                      }}
                    />
                  </label>
                  )}
                </div>

                {/* Info */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {t("about.founder2.role_tag")}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {t("about.founder2.name")}
                  </h3>
                  <p className="text-sm font-medium text-primary mb-3">
                    {t("about.founder2.title")}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {t("about.founder2.desc")}
                  </p>
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <a
                      href="https://www.linkedin.com/in/ayoub-akbik/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Linkedin className="w-4 h-4" />
                      {t("about.founders.connect")}
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Our Vision */}
        <div className="bg-gradient-to-br from-primary/5 via-secondary/30 to-primary/5 rounded-2xl p-8 md:p-12 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Eye className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              {t("about.vision.title")}
            </h3>
            <p className="text-muted-foreground leading-relaxed text-lg">
              {t("about.vision.desc")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}