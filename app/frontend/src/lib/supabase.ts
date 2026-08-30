import { createClient } from '@supabase/supabase-js';
import type {
  UserProfile,
  Member,
  IndustryNews,
  EducationalResource,
  ContactMessage,
  EnterpriseRequest,
} from './types';

// Re-export so existing imports from supabase.ts keep working
export type { UserProfile, Member, IndustryNews, EducationalResource, ContactMessage, EnterpriseRequest };

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ─── Generic fetch helper ─────────────────────────────────────────────────────
export async function fetchFromSupabase<T>(
  tableName: string,
  options?: {
    select?: string;
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
    filters?: Array<{ column: string; value: unknown }>;
  }
): Promise<{ data: T[] | null; fromDb: boolean; error: string | null }> {
  try {
    let query = supabase.from(tableName).select(options?.select || '*');

    // Apply equality filters
    if (options?.filters) {
      for (const f of options.filters) {
        query = query.eq(f.column, f.value);
      }
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false });
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST205') return { data: null, fromDb: false, error: 'Table not found' };
      return { data: null, fromDb: false, error: error.message };
    }

    if (data && data.length > 0) return { data: data as T[], fromDb: true, error: null };
    return { data: null, fromDb: false, error: null };
  } catch (err) {
    return { data: null, fromDb: false, error: String(err) };
  }
}

// ─── Insert helper ────────────────────────────────────────────────────────────
export async function insertToSupabase<T extends Record<string, unknown>>(
  tableName: string,
  record: T
): Promise<{ success: boolean; data?: T; error: string | null }> {
  try {
    const { data, error } = await supabase.from(tableName).insert(record as never).select().single();
    if (error) {
      console.error(`Supabase insert error (${tableName}):`, error);
      return { success: false, error: error.message };
    }
    return { success: true, data: data as T, error: null };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ─── Update helper ────────────────────────────────────────────────────────────
export async function updateInSupabase<T extends Record<string, unknown>>(
  tableName: string,
  id: string,
  updates: Partial<T>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from(tableName)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ─── Delete helper ────────────────────────────────────────────────────────────
export async function deleteFromSupabase(
  tableName: string,
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}