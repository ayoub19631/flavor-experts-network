import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import SeoJsonLd from "@/components/SeoJsonLd";
import { SITE } from "@/lib/site-config";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { toast } from "sonner";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  event_type: string;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  registration_url?: string | null;
};

export default function EventDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { lang } = useI18n();
  const [event, setEvent] = useState<EventRow | null>(null);
  useEffect(() => {
    if (!slug) return;
    supabase.from("events").select("*").eq("slug", slug).eq("status", "published").is("deleted_at", null).maybeSingle()
      .then(({ data }) => setEvent((data as EventRow) || null));
  }, [slug]);
  usePageMeta({ title: event?.title || "Event", path: `/events/${slug || ""}` });

  if (!event) {
    return <div className="min-h-screen bg-background"><Navbar /><p className="pt-28 text-center text-muted-foreground">{lang === "ar" ? "الفعالية غير متاحة." : "Event not available."}</p></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <SeoJsonLd data={{
        "@context": "https://schema.org",
        "@type": "Event",
        name: event.title,
        startDate: event.starts_at,
        endDate: event.ends_at || event.starts_at,
        eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
        location: event.location || SITE.canonicalOrigin,
        organizer: { "@type": "Organization", name: SITE.name },
      }} />
      <article className="pt-24 pb-16 mx-auto max-w-3xl px-4 space-y-4">
        <h1 className="text-3xl font-bold">{event.title}</h1>
        <p className="text-muted-foreground">{event.event_type} · {new Date(event.starts_at).toLocaleString()}</p>
        <p>{event.description}</p>
        {user && (
          <Button onClick={async () => {
            const { error } = await supabase.from("event_registrations").insert({ event_id: event.id, user_id: user.id, status: "registered" });
            toast[error ? "error" : "success"](error?.message || (lang === "ar" ? "تم التسجيل" : "Registered"));
          }}>{lang === "ar" ? "تسجيل" : "Register"}</Button>
        )}
        {event.registration_url && <Button asChild variant="outline"><a href={event.registration_url} target="_blank" rel="noreferrer">External registration</a></Button>}
      </article>
    </div>
  );
}
