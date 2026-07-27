import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export type Platform = 'web' | 'android' | 'ios' | 'electron';

interface PlatformInfo {
  platform: Platform;
  isNative: boolean;
  isElectron: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isWeb: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  version: string | null;
  osVersion: string | null;
}

function detectPlatform(): PlatformInfo {
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron;
  const capacitorPlatform = Capacitor.getPlatform(); // 'web' | 'android' | 'ios'
  const isAndroid = capacitorPlatform === 'android';
  const isIOS = capacitorPlatform === 'ios';
  const isNative = Capacitor.isNativePlatform();

  let platform: Platform = 'web';
  if (isElectron) platform = 'electron';
  else if (isAndroid) platform = 'android';
  else if (isIOS) platform = 'ios';

  return {
    platform,
    isNative,
    isElectron,
    isAndroid,
    isIOS,
    isWeb: platform === 'web',
    isMobile: isAndroid || isIOS,
    isDesktop: isElectron || platform === 'web',
    version: null,
    osVersion: null,
  };
}

export function usePlatform(): PlatformInfo {
  const [info, setInfo] = useState<PlatformInfo>(() => detectPlatform());

  useEffect(() => {
    // Get version from Electron if available
    const api = (window as any).electronAPI;
    if (api?.getVersion) {
      api.getVersion().then((version: string) => {
        setInfo((prev) => ({ ...prev, version }));
      });
    }
  }, []);

  return info;
}

/** Returns true only when running inside Electron desktop app */
export function useIsElectron(): boolean {
  return usePlatform().isElectron;
}

/** Returns true when running as native Android/iOS app */
export function useIsNative(): boolean {
  return usePlatform().isNative;
}
