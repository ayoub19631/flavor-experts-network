import { Capacitor } from "@capacitor/core";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/lib/supabase";

/**
 * Native (Capacitor) platform helpers: deep links, external browser, session
 * bootstrap from OAuth redirects.
 *
 * The app registers the custom URL scheme `flavorexperts://`. OAuth and
 * magic-link flows finish by redirecting to `flavorexperts://auth/callback`
 * which the OS routes back into the app.
 */

export const APP_URL_SCHEME = "flavorexperts";

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** Deep-link URL the native app listens for (used as OAuth redirect target). */
export function appAuthCallbackUrl(): string {
  return `${APP_URL_SCHEME}://auth/callback`;
}

/** Open a URL in the system browser (required for OAuth — Google blocks webviews). */
export async function openExternal(url: string): Promise<void> {
  if (isNativeApp()) {
    await Browser.open({ url, presentationStyle: "popover" });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Close the in-app browser after a deep link returns (no-op on web). */
async function closeExternalBrowser(): Promise<void> {
  try {
    await Browser.close();
  } catch {
    /* browser may already be closed */
  }
}

/**
 * Establish a Supabase session from a deep-link URL carrying auth tokens
 * (`#access_token=…&refresh_token=…` implicit flow or `?code=…` PKCE flow).
 * Returns true when a session was established.
 */
export async function establishSessionFromUrl(rawUrl: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return !error;
  }

  const code = url.searchParams.get("code") || hashParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return !error;
  }

  return false;
}

/**
 * Convert a deep link into an in-app route, e.g.
 * `flavorexperts://auth/callback` → `/auth/callback` (query/hash preserved).
 * Returns null for links that don't belong to the app scheme.
 */
export function deepLinkToRoute(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== `${APP_URL_SCHEME}:`) return null;
  const host = url.host === APP_URL_SCHEME ? "" : url.host;
  const path = `/${[host, url.pathname.replace(/^\//, "")].filter(Boolean).join("/")}`;
  return `${path}${url.search}${url.hash}`;
}

/**
 * Register the deep-link listener once. `onRoute` receives in-app routes
 * (usually react-router's navigate). Returns an unsubscribe function.
 */
export function registerDeepLinkListener(
  onRoute: (route: string) => void,
): () => void {
  if (!isNativeApp()) return () => undefined;

  const sub = App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
    void (async () => {
      await closeExternalBrowser();
      const route = deepLinkToRoute(event.url);
      if (!route) return;
      // Auth deep links carry tokens — establish the session before routing.
      await establishSessionFromUrl(event.url);
      onRoute(route.split("#")[0].split("?")[0]);
    })();
  });

  return () => {
    void sub.then((handle) => handle.remove());
  };
}
