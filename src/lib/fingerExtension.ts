/** Firefox Finger Bridge detection + proxy origin helpers */

import { IS_NATIVE_SHELL } from './appShell';

export const FINGER_EXT_ORIGIN = 'https://seriestech-finger.invalid';

export interface FingerExtensionApi {
  installed: true;
  version: string;
  origin: string;
  ping: () => Promise<{ ok?: boolean; version?: string }>;
}

declare global {
  interface Window {
    __SERIES_TECH_FINGER_EXT__?: FingerExtensionApi;
  }
}

export function getFingerExtension(): FingerExtensionApi | null {
  if (typeof window === 'undefined') return null;
  const api = window.__SERIES_TECH_FINGER_EXT__;
  return api?.installed ? api : null;
}

export function isFingerExtensionAvailable(): boolean {
  return getFingerExtension() != null;
}

/** Desktop/APK shell, or Firefox Finger Bridge — unlocks FingerPlayer + App Exclusives on web. */
export function hasNativeShellOrFingerBridge(): boolean {
  return IS_NATIVE_SHELL || isFingerExtensionAvailable();
}

/** Subscribe to extension readiness (content script may inject slightly after first paint). */
export function subscribeFingerExtension(onChange: (available: boolean) => void): () => void {
  if (typeof window === 'undefined') {
    onChange(false);
    return () => undefined;
  }

  const emit = () => onChange(isFingerExtensionAvailable());
  emit();

  const onReady = () => emit();
  window.addEventListener('seriestech-finger-ext-ready', onReady);

  const interval = window.setInterval(emit, 1500);
  return () => {
    window.removeEventListener('seriestech-finger-ext-ready', onReady);
    window.clearInterval(interval);
  };
}

/** Subscribe to shell-or-bridge unlock (native stays true; web tracks extension). */
export function subscribeNativeShellOrFingerBridge(onChange: (allowed: boolean) => void): () => void {
  if (IS_NATIVE_SHELL) {
    onChange(true);
    return () => undefined;
  }
  return subscribeFingerExtension(onChange);
}
