export const IS_DESKTOP_APP = import.meta.env.VITE_DESKTOP === 'true';
export const IS_MOBILE_APP = import.meta.env.VITE_MOBILE === 'true';
export const IS_NATIVE_SHELL = IS_DESKTOP_APP || IS_MOBILE_APP;

/** Hide/show Android status + nav bars for FingerPlayer fullscreen (APK). */
export function setNativeImmersiveMode(enabled: boolean) {
  if (!IS_MOBILE_APP || typeof window === 'undefined') return;
  try {
    window.SeriesTechAndroid?.setImmersive?.(enabled);
  } catch {
    /* bridge unavailable */
  }
}
