# Flavor Experts — Android & iPhone (dev / emulator)

The web app is wrapped with **Capacitor 8** (`appId`: `net.flavorexperts.app`).

Focus: **debug builds on the Android emulator** for testing. No store signing required.

## Prerequisites

| Platform | Tools |
|----------|--------|
| Android | Android SDK (platform-tools, build-tools 35, platform 35), JDK 17+, Emulator |
| iOS | macOS + Xcode 15+ (simulator) |

## Build web + sync

```bash
cd app/frontend
pnpm install
pnpm build
npx cap sync
```

Or from repo root:

```bash
node build.mjs --android
# macOS:
node build.mjs --ios
```

## Android emulator (recommended for testing)

```bash
# From repo root — builds debug APK, starts AVD if needed, installs & launches
bash deploy/run-android-emulator.sh
```

Manual flow:

```bash
cd app/frontend
pnpm cap:android
cd android
./gradlew assembleDebug
# Start an AVD in Android Studio (Device Manager), then:
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n net.flavorexperts.app/.MainActivity
```

## iOS simulator (macOS)

```bash
cd app/frontend
pnpm cap:ios
pnpm cap:open:ios
# In Xcode: choose a Simulator → Run
```

## Community features in the app

Same `/community` experience inside the WebView:

- Photo posts (Supabase Storage `community/`)
- Likes, comments, share
- Native share sheet when `navigator.share` is available
