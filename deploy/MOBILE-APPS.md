# Flavor Experts — Android & iPhone apps

The web app is wrapped with **Capacitor 8** (`appId`: `net.flavorexperts.app`).

## Prerequisites

| Platform | Tools |
|----------|--------|
| Android | Android Studio (SDK 34+), JDK 17 |
| iOS | macOS + Xcode 15+ + CocoaPods |

## One-time setup

```bash
cd app/frontend
pnpm install
pnpm build
npx cap add android   # once
npx cap add ios       # once (macOS only)
npx cap sync
```

Or from repo root:

```bash
node build.mjs --android
node build.mjs --ios      # macOS
node build.mjs --all
```

## Daily rebuild / sync

```bash
cd app/frontend
pnpm cap:android          # build web + sync Android
pnpm cap:open:android     # open Android Studio

pnpm cap:ios              # build web + sync iOS (macOS)
pnpm cap:open:ios         # open Xcode
```

## Release notes

- **Android:** Build signed AAB/APK from Android Studio → Build → Generate Signed Bundle.
  Keystore settings are referenced in `capacitor.config.ts` (`release-keystore.jks`).
- **iOS:** Open Xcode, set Team + Signing, archive for App Store / TestFlight.
- Deep links / OAuth: set redirect URLs to the Capacitor app scheme in Supabase Auth.
- Push notifications: configure FCM (Android) and APNs (iOS), then set Capacitor Push secrets.

## Community features in the app

The same `/community` experience runs inside the WebView:

- Photo posts (Supabase Storage `community/` folder)
- Likes, comments, share
- Native share sheet when `navigator.share` is available
