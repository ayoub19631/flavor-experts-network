import { supabase } from "@/lib/supabase";
import { isMissingRelation } from "./flags";
import { extractMentionIds, type MentionEntityType } from "./mentions";

export async function saveContentMentions(
  entityType: MentionEntityType,
  entityId: string,
  text: string,
) {
  const ids = extractMentionIds(text);
  if (!ids.length) return { saved: 0 };
  const { data, error } = await supabase.rpc("save_content_mentions", {
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_profile_ids: ids,
  });
  if (error && !isMissingRelation(error.message)) {
    return { saved: 0, error: error.message };
  }
  return { saved: typeof data === "number" ? data : 0 };
}
