export const DESKTOP_STATS_TOTAL_SECONDS_KEY = 'seriesTech.desktop.totalSeconds';
export const DESKTOP_STATS_WATCH_SECONDS_KEY = 'seriesTech.desktop.watchSeconds';
export const DESKTOP_WATCHING_EVENT = 'seriesTech:desktop-watching';

export function readDesktopStatSeconds(key: string): number {
  if (typeof window === 'undefined') return 0;

  const value = Number.parseInt(window.localStorage.getItem(key) ?? '0', 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function writeDesktopStatSeconds(key: string, seconds: number) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(key, String(Math.max(0, Math.floor(seconds))));
}

export function emitDesktopWatchingState(isWatching: boolean) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent(DESKTOP_WATCHING_EVENT, {
      detail: { isWatching },
    })
  );
}
