import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowRight, Handshake, Loader2, Star } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import type { Partner } from "@/lib/types";

export default function PartnersSection() {
  const { t } = useI18n();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from("partners")
          .select("*")
          .eq("is_published", true)
          .order("sort_order", { ascending: true });

        if (error || !data) {
          setPartners([]);
        } else {
          setPartners(data as Partner[]);
        }
      } catch {
        setPartners([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <section className="py-16 bg-secondary/30" id="partners">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <Badge className="bg-primary/10 text-primary border-0 mb-3 px-3 py-1">
            <Building2 className="w-3.5 h-3.5 me-1.5" />
            {t("partners.tag")}
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            {t("partners.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("partners.desc")}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : partners.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {partners.map((partner) => (
                <a
                  key={partner.id}
                  href={partner.website_url || "#"}
                  target={partner.website_url ? "_blank" : undefined}
                  rel={partner.website_url ? "noopener noreferrer" : undefined}
                  className={`group relative flex flex-col items-center justify-center rounded-2xl border bg-background p-5 transition-all hover:shadow-md ${
                    partner.is_featured
                      ? "border-primary/40 shadow-sm ring-1 ring-primary/20 scale-[1.02]"
                      : "border-border hover:border-primary/30"
                  }`}
                  title={partner.name}
                >
                  {partner.is_featured && (
                    <Badge className="absolute top-2 end-2 bg-primary/10 text-primary border-0 text-[10px] px-1.5 py-0">
                      <Star className="w-2.5 h-2.5 me-0.5 fill-current" />
                      {t("partners.featured")}
                    </Badge>
                  )}
                  {partner.logo_url ? (
                    <img
                      src={partner.logo_url}
                      alt={partner.name}
                      className={`max-h-12 w-auto object-contain grayscale group-hover:grayscale-0 transition-all ${
                        partner.is_featured ? "max-h-14" : ""
                      }`}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <span className="mt-3 text-xs font-medium text-muted-foreground text-center line-clamp-2">
                    {partner.name}
                  </span>
                </a>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground mt-8">
              {t("partners.cta_text")}{" "}
              <Link to="/enterprise" className="text-primary hover:underline font-medium">
                {t("partners.cta_button")}
              </Link>
            </p>
          </>
        ) : (
          <div className="max-w-xl mx-auto text-center rounded-2xl border border-dashed border-border bg-background/80 px-6 py-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Handshake className="w-8 h-8 text-primary" />
            </div>
            <p className="text-foreground font-medium mb-2">{t("partners.empty.title")}</p>
            <p className="text-sm text-muted-foreground mb-6">{t("partners.empty.desc")}</p>
            <Link to="/enterprise">
              <Button className="gap-2">
                {t("partners.cta_button")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
