#!/usr/bin/env bash
# Build Flavor Experts (debug), boot an AVD if needed, install & launch.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/app/frontend"
ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
export ANDROID_HOME ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

AVD_NAME="${AVD_NAME:-fen_api34}"
PKG="net.flavorexperts.app"

if [[ ! -x "$ANDROID_HOME/platform-tools/adb" ]]; then
  echo "Android SDK not found at $ANDROID_HOME"
  echo "Install cmdline-tools, platform-tools, emulator, and a system image first."
  exit 1
fi

echo "==> Building web + Capacitor sync"
cd "$FRONTEND"
pnpm build
npx cap sync android

echo "==> Assembling debug APK"
cd "$FRONTEND/android"
./gradlew assembleDebug --quiet

APK="$FRONTEND/android/app/build/outputs/apk/debug/app-debug.apk"
if [[ ! -f "$APK" ]]; then
  echo "APK missing: $APK"
  exit 1
fi
echo "APK: $APK"

boot_wait() {
  adb wait-for-device
  local i=0
  until [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; do
    i=$((i + 1))
    if (( i > 180 )); then
      echo "Emulator boot timed out"
      return 1
    fi
    sleep 2
  done
}

if ! adb devices | grep -E 'emulator-|device$' | grep -v 'List' | grep -q 'device$'; then
  if ! command -v emulator >/dev/null; then
    echo "No running device and emulator binary missing."
    exit 1
  fi
  if ! emulator -list-avds | grep -qx "$AVD_NAME"; then
    echo "AVD '$AVD_NAME' not found. Create one with Android Studio Device Manager,"
    echo "or: avdmanager create avd -n $AVD_NAME -k 'system-images;android-34;google_apis;x86_64' -d pixel_6"
    exit 1
  fi
  echo "==> Starting emulator: $AVD_NAME"
  # Prefer hardware accel when available; fall back to software.
  EMU_FLAGS=(-avd "$AVD_NAME" -no-audio -no-boot-anim -gpu swiftshader_indirect)
  if [[ ! -e /dev/kvm ]]; then
    EMU_FLAGS+=(-accel off)
    echo "    (no /dev/kvm — software emulation, slower boot)"
  fi
  if [[ -z "${DISPLAY:-}" ]]; then
    EMU_FLAGS+=(-no-window)
  fi
  emulator "${EMU_FLAGS[@]}" >/tmp/fen-emulator.log 2>&1 &
  echo $! >/tmp/fen-emulator.pid
fi

echo "==> Waiting for device boot"
boot_wait

echo "==> Installing & launching $PKG"
adb install -r "$APK"
adb shell am start -n "$PKG/.MainActivity"
echo "Done. App launched on emulator."
echo "Logs: adb logcat | grep -i flavor"
