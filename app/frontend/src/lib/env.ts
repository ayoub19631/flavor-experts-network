/**
 * Client-safe environment validation.
 * Never put secrets in VITE_* — they are embedded in the browser bundle.
 */
import { z } from "zod";

const clientEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url("VITE_SUPABASE_URL must be a valid URL"),
  VITE_SUPABASE_ANON_KEY: z.string().min(20, "VITE_SUPABASE_ANON_KEY is required"),
  VITE_SITE_URL: z.string().url().optional(),
  VITE_APP_TITLE: z.string().optional(),
  VITE_ADMIN_EMAIL: z.string().email().optional().or(z.literal("")),
  VITE_SENTRY_DSN: z.string().url().optional().or(z.literal("")),
  VITE_PORT: z.string().optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

function readEnv(): ClientEnv {
  const raw = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_SITE_URL: import.meta.env.VITE_SITE_URL,
    VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE,
    VITE_ADMIN_EMAIL: import.meta.env.VITE_ADMIN_EMAIL,
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
    VITE_PORT: import.meta.env.VITE_PORT,
  };

  const parsed = clientEnvSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    console.error(`[env] Invalid environment: ${details}`);
    // Soft-fail in production UI to avoid blank screen; hard-fail in tests via assertEnv()
    return raw as ClientEnv;
  }
  return parsed.data;
}

export const env = readEnv();

export function assertEnv(): ClientEnv {
  const parsed = clientEnvSchema.parse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_SITE_URL: import.meta.env.VITE_SITE_URL,
    VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE,
    VITE_ADMIN_EMAIL: import.meta.env.VITE_ADMIN_EMAIL,
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
    VITE_PORT: import.meta.env.VITE_PORT,
  });
  return parsed;
}

export const isProd = import.meta.env.PROD;
export const isDev = import.meta.env.DEV;
