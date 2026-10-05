export type WatchProgressEntry = {
  currentTime: number;
  duration: number;
  progress: number;
  updatedAt: number;
};

export function localWatchProgressKey(
  mediaId: string | number,
  type: 'movie' | 'series',
  season: number = 1,
  episode: number = 1
): string {
  return `watchProgress_${mediaId}_${type}_${season}_${episode}`;
}

export function isResumableProgress(entry: {
  currentTime?: number;
  duration?: number;
  progress?: number;
} | null | undefined): boolean {
  if (!entry) return false;
  const currentTime = entry.currentTime ?? 0;
  const duration = entry.duration ?? 0;
  const progress =
    entry.progress ?? (duration > 0 ? (currentTime / duration) * 100 : 0);

  if (currentTime < 1) return false;
  if (progress >= 95) return false;
  if (duration > 0 && currentTime >= duration - 30) return false;
  return true;
}

export function resumableTimeFromEntry(
  entry: { currentTime?: number; duration?: number; progress?: number } | null | undefined
): number | undefined {
  if (!isResumableProgress(entry)) return undefined;
  return entry?.currentTime;
}

export function readLocalWatchProgress(
  mediaId: string | number,
  type: 'movie' | 'series',
  season: number = 1,
  episode: number = 1
): WatchProgressEntry | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem(
      localWatchProgressKey(mediaId, type, season, episode)
    );
    if (!stored) return null;
    const data = JSON.parse(stored) as WatchProgressEntry & { timestamp?: number };
    return {
      currentTime: data.currentTime ?? 0,
      duration: data.duration ?? 0,
      progress: data.progress ?? 0,
      updatedAt: data.updatedAt ?? data.timestamp ?? 0,
    };
  } catch {
    return null;
  }
}

export function writeLocalWatchProgress(
  mediaId: string | number,
  type: 'movie' | 'series',
  season: number = 1,
  episode: number = 1,
  entry: { currentTime: number; duration: number; progress: number }
): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const payload: WatchProgressEntry = {
      ...entry,
      updatedAt: Date.now(),
    };
    localStorage.setItem(
      localWatchProgressKey(mediaId, type, season, episode),
      JSON.stringify(payload)
    );
  } catch {
    // Ignore storage quota
  }
}
