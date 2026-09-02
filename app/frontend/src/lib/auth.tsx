import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "./supabase";
import type { User, Session } from "@supabase/supabase-js";
import type { UserProfile, SubscriptionTier } from "./types";
import {
  clearPendingVerificationEmail,
  getAuthRedirectUrl,
  isEmailNotConfirmedError,
  isEmailVerified as checkEmailVerified,
  rememberPendingVerificationEmail,
  EMAIL_NOT_CONFIRMED_CODE,
} from "./auth-utils";
import { resolvePlatformAccess } from "./platform-access";
import { PLATFORM_ALWAYS_FREE } from "./site-config";
import { type Language } from "./languages";
import { TERMS_VERSION } from "./terms-policy";
import { hasCapability, type PlatformRole } from "./phase4/roles";


export { EMAIL_NOT_CONFIRMED_CODE };

export type { SubscriptionTier, UserProfile };

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    preferredLanguage?: Language,
    extras?: {
      country?: string;
      role?: string;
      specialty?: string;
      company?: string;
      adultConfirmed?: boolean;
    },
  ) => Promise<{ error: string | null }>;
  acceptPlatformTerms: () => Promise<{ error: string | null }>;
  claimCompanyAccount: (details: {
    company: string;
    website?: string | null;
    phone?: string | null;
    industry?: string | null;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<UserProfile, 'full_name' | 'avatar_url'>>) => Promise<{ error: string | null }>;
  isPremium: boolean;
  isEnterprise: boolean;
  isAdmin: boolean;
  platformRoles: PlatformRole[];
  canModerateCommunity: boolean;
  isEmailVerified: boolean;
  hasPlatformAccess: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [platformRoles, setPlatformRoles] = useState<PlatformRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          loadProfile(s.user);
        } else {
          setProfile(null);
          setPlatformRoles([]);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(u: User) {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", u.id)
        .single();

      if (!error && data) {
        setProfile(data as UserProfile);
        const roles = await supabase.from("platform_roles").select("role").eq("user_id", u.id);
        setPlatformRoles(((roles.data || []).map((row) => row.role) as PlatformRole[]) || []);
      } else {
        // Profile missing (race with handle_new_user) — upsert only safe identity fields.
        // Never set is_admin / subscription / preview flags from the client.
        const safeProfile = {
          id: u.id,
          email: u.email || "",
          full_name:
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            u.email?.split("@")[0] ||
            "User",
          avatar_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || "",
        };
        const { data: inserted, error: insertError } = await supabase
          .from("user_profiles")
          .upsert([safeProfile], { onConflict: "id" })
          .select("*")
          .single();

        if (!insertError && inserted) {
          setProfile(inserted as UserProfile);
        } else {
          // Retry once — trigger may still be writing
          await new Promise((r) => setTimeout(r, 400));
          const { data: retried } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", u.id)
            .maybeSingle();
          setProfile(
            (retried as UserProfile) || {
              ...safeProfile,
              subscription_tier: "free" as SubscriptionTier,
              subscription_active: true,
              is_admin: false,
              created_at: u.created_at,
            },
          );
        }
      }
    } catch {
      setProfile({
        id: u.id,
        email: u.email || "",
        full_name: u.user_metadata?.full_name || u.email?.split("@")[0] || "User",
        avatar_url: u.user_metadata?.avatar_url || "",
        subscription_tier: "free",
        subscription_active: true,
        is_admin: false,
        created_at: u.created_at,
      });
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (isEmailNotConfirmedError(error.message)) {
        rememberPendingVerificationEmail(email);
        return { error: EMAIL_NOT_CONFIRMED_CODE };
      }
      return { error: error.message };
    }
    if (data.user && !checkEmailVerified(data.user)) {
      rememberPendingVerificationEmail(email);
      return { error: EMAIL_NOT_CONFIRMED_CODE };
    }
    clearPendingVerificationEmail();
    return { error: null };
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
    preferredLanguage: Language = "en",
    extras?: {
      country?: string;
      role?: string;
      specialty?: string;
      company?: string;
      adultConfirmed?: boolean;
    },
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          preferred_language: preferredLanguage,
          terms_accepted: true,
          terms_version: TERMS_VERSION,
          country: extras?.country || "",
          role: extras?.role || "",
          specialty: extras?.specialty || "",
          company: extras?.company || "",
          adult_confirmed: extras?.adultConfirmed === true,
        },
        emailRedirectTo: getAuthRedirectUrl("/auth/callback"),
      },
    });
    if (error) return { error: error.message };
    rememberPendingVerificationEmail(email);
    // Supabase may auto-confirm in dev — still require explicit verification flow
    if (data.user && checkEmailVerified(data.user)) {
      clearPendingVerificationEmail();
    }
    return { error: null };
  }

  async function acceptPlatformTerms() {
    const { error } = await supabase.rpc("accept_platform_terms", {
      p_version: TERMS_VERSION,
    });
    if (error) return { error: error.message };
    if (user) await loadProfile(user);
    return { error: null };
  }

  async function claimCompanyAccount(details: {
    company: string;
    website?: string | null;
    phone?: string | null;
    industry?: string | null;
  }) {
    const { error } = await supabase.rpc("claim_company_account", {
      p_company: details.company,
      p_website: details.website || null,
      p_phone: details.phone || null,
      p_industry: details.industry || null,
    });
    if (error) return { error: error.message };
    if (user) await loadProfile(user);
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function updateProfile(updates: Partial<Pick<UserProfile, 'full_name' | 'avatar_url'>>) {
    if (!user) return { error: "Not authenticated" };
    const { error } = await supabase
      .from("user_profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) return { error: error.message };
    if (profile) setProfile({ ...profile, ...updates });
    return { error: null };
  }

  const tier = profile?.subscription_tier;
  const active = profile?.subscription_active !== false;
  // Fully free platform: every signed-in member gets full access.
  const isPremium = PLATFORM_ALWAYS_FREE
    ? !!user
    : active && (tier === "professional" || tier === "enterprise");
  const isEnterprise = PLATFORM_ALWAYS_FREE
    ? !!user && profile?.account_type === "company"
    : active && tier === "enterprise";
  const isAdmin = profile?.is_admin === true || hasCapability(platformRoles, "admin");
  const canModerateCommunity = hasCapability(platformRoles, "moderate_community", profile?.is_admin === true);

  const isEmailVerified = checkEmailVerified(user);
  const hasPlatformAccess = resolvePlatformAccess(user, profile);

  return (
    <AuthContext.Provider
      value={{
        user, session, profile, loading, signIn, signUp, acceptPlatformTerms, claimCompanyAccount, signOut, updateProfile,
        isPremium, isEnterprise, isAdmin, platformRoles, canModerateCommunity, isEmailVerified, hasPlatformAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const defaultAuth: AuthContextType = {
  user: null,
  session: null,
  profile: null,
  loading: false,
  signIn: async () => ({ error: "Not available" }),
  signUp: async () => ({ error: "Not available" }),
  acceptPlatformTerms: async () => ({ error: "Not available" }),
  claimCompanyAccount: async () => ({ error: "Not available" }),
  signOut: async () => {},
  updateProfile: async () => ({ error: "Not available" }),
  isPremium: false,
  isEnterprise: false,
  isAdmin: false,
  platformRoles: [],
  canModerateCommunity: false,
  isEmailVerified: false,
  hasPlatformAccess: true,
};

export function useAuth() {
  const context = useContext(AuthContext);
  return context ?? defaultAuth;
}