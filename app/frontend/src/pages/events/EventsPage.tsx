import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";

type EventRow = { id: string; slug: string; title: string; event_type: string; starts_at: string; location?: string | null };

export default function EventsPage() {
  const { lang } = useI18n();
  const [events, setEvents] = useState<EventRow[]>([]);
  usePageMeta({ title: lang === "ar" ? "الفعاليات" : "Events", path: "/events" });

  useEffect(() => {
    supabase.from("events").select("id, slug, title, event_type, starts_at, location").eq("status", "published").is("deleted_at", null).order("starts_at")
      .then(({ data }) => setEvents((data as EventRow[]) || []));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-4xl px-4">
        <h1 className="text-3xl font-bold">{lang === "ar" ? "الفعاليات والندوات" : "Events and webinars"}</h1>
        <ul className="mt-6 space-y-3">
          {events.length === 0 && <li className="text-sm text-muted-foreground">{lang === "ar" ? "لا توجد فعاليات منشورة بعد." : "No published events yet."}</li>}
          {events.map((event) => (
            <li key={event.id} className="rounded-xl border p-4">
              <Link to={`/events/${event.slug}`} className="font-semibold">{event.title}</Link>
              <p className="text-sm text-muted-foreground">{event.event_type} · {new Date(event.starts_at).toLocaleString()} · {event.location}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
