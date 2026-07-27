import { supabase } from "@/lib/supabase";

/** Resolve a resource URL with premium link protection (server-side RLS / RPC). */
export async function resolveResourceUrl(
  resourceId: string | undefined,
  fallbackLink?: string | null,
  premium?: boolean,
): Promise<string | null> {
  if (!resourceId) return fallbackLink || null;

  if (premium) {
    const { data, error } = await supabase.rpc("resolve_resource_url", {
      p_resource_id: resourceId,
    });
    if (!error && data) return String(data);
    return null;
  }

  if (fallbackLink) return fallbackLink;

  const { data, error } = await supabase.rpc("resolve_resource_url", {
    p_resource_id: resourceId,
  });
  if (!error && data) return String(data);
  return null;
}

export async function openResourceLink(
  resourceId: string | undefined,
  fallbackLink?: string | null,
  premium?: boolean,
): Promise<boolean> {
  const url = await resolveResourceUrl(resourceId, fallbackLink, premium);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
