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

export { EMAIL_NOT_CONFIRMED_CODE };

export type { SubscriptionTier, UserProfile };

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<UserProfile, 'full_name' | 'avatar_url'>>) => Promise<{ error: string | null }>;
  isPremium: boolean;
  isEnterprise: boolean;
  isAdmin: boolean;
  isEmailVerified: boolean;
  hasPlatformAccess: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
      } else {
        // Profile not found — try to create it (handles race condition with trigger)
        const newProfile = {
          id: u.id,
          email: u.email || "",
          full_name: u.user_metadata?.full_name || u.email?.split("@")[0] || "User",
          avatar_url: u.user_metadata?.avatar_url || "",
          subscription_tier: "free" as SubscriptionTier,
          subscription_active: true,
          is_admin: false,
          platform_preview_access: false,
          created_at: u.created_at,
        };
        const { data: inserted } = await supabase
          .from("user_profiles")
          .upsert([newProfile], { onConflict: "id" })
          .select()
          .single();
        setProfile((inserted as UserProfile) ?? newProfile);
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
        platform_preview_access: false,
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

  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
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
  const isPremium =
    active &&
    (tier === "professional" || tier === "enterprise");
  const isEnterprise = active && tier === "enterprise";
  const isAdmin = profile?.is_admin === true;

  const isEmailVerified = checkEmailVerified(user);
  const hasPlatformAccess = resolvePlatformAccess(user, profile);

  return (
    <AuthContext.Provider
      value={{
        user, session, profile, loading, signIn, signUp, signOut, updateProfile,
        isPremium, isEnterprise, isAdmin, isEmailVerified, hasPlatformAccess,
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
  signOut: async () => {},
  updateProfile: async () => ({ error: "Not available" }),
  isPremium: false,
  isEnterprise: false,
  isAdmin: false,
  isEmailVerified: false,
  hasPlatformAccess: true,
};

export function useAuth() {
  const context = useContext(AuthContext);
  return context ?? defaultAuth;
}