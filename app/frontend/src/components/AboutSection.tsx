import { Card, CardContent } from "@/components/ui/card";
import { Target, Globe, Lightbulb, Award, Eye, Users, BookOpen } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function AboutSection() {
  const { t } = useI18n();

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

  const platformCards = [
    {
      image: "/brand/section-community.webp",
      title: t("about.platform.community.title"),
      description: t("about.platform.community.desc"),
      icon: Users,
    },
    {
      image: "/brand/flavor-expertise-science.webp",
      title: t("about.platform.knowledge.title"),
      description: t("about.platform.knowledge.desc"),
      icon: BookOpen,
    },
  ];

  return (
    <section id="about" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative mb-14 overflow-hidden rounded-3xl">
          <img
            src="/brand/section-community.webp"
            alt={t("about.title")}
            className="h-48 sm:h-64 w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(208_100%_10%/0.88)] via-[hsl(208_100%_10%/0.55)] to-transparent rtl:bg-gradient-to-l" />
          <div className="absolute inset-0 flex items-end p-6 sm:p-10">
            <div className="max-w-xl">
              <span className="inline-block text-xs font-semibold text-[hsl(47_23%_85%)] uppercase tracking-wider mb-2">
                {t("about.tag")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {t("about.title")}
              </h2>
              <p className="text-white/80 text-sm sm:text-base leading-relaxed">
                {t("about.desc")}
              </p>
            </div>
          </div>
        </div>

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

        <div className="mb-12">
          <div className="text-center mb-10">
            <span className="inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-2">
              {t("about.platform.tag")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              {t("about.platform.title")}
            </h2>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              {t("about.platform.desc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {platformCards.map((card) => (
              <Card
                key={card.title}
                className="border border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <CardContent className="p-0">
                  <div className="relative w-full aspect-[16/9] overflow-hidden">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <card.icon className="w-4 h-4 text-primary" />
                      <h3 className="text-xl font-bold text-foreground">{card.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

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
