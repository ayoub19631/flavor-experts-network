import { supabase } from "@/lib/supabase";

export type UnifiedHit = {
  entity_type: string;
  entity_id: string;
  title: string;
  href: string;
  rank: number;
};

export async function unifiedSearch(query: string) {
  const { data, error } = await supabase.rpc("unified_search", {
    p_query: query,
    p_limit: 8,
  });
  return { data: (data as UnifiedHit[]) || [], error: error?.message || null };
}

export async function rememberSearch(query: string) {
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) return;
  await supabase.from("search_recents").upsert({
    user_id: session.user.id,
    query,
    created_at: new Date().toISOString(),
  });
}
