export const FINGER_API_SERVER = 'finger-api';
export const FINGER_API_SERVER_NAME = 'Series.tech';
export const FINGER_API_SERVER_TAG = 'Native 4K';
export type FingerProviderId =
  | 'fingerapi'
  | 'lordflix'
  | 'leg'
  | 'icefy'
  | 'ythd'
  | 'vixsrc'
  | 'vidfast'
  | 'movy'
  | 'videasy'
  | 'videasy-neon'
  | 'videasy-yoru'
  | 'videasy-cypher'
  | 'videasy-sage'
  | 'videasy-breach'
  | 'videasy-vyse'
  | 'videasy-killjoy'
  | 'videasy-fade'
  | 'videasy-omen'
  | 'videasy-raze';

import { IS_NATIVE_SHELL } from './appShell';
import { FINGER_EXT_ORIGIN, hasNativeShellOrFingerBridge, isFingerExtensionAvailable } from './fingerExtension';

export const ALL_FINGER_STREAM_PROVIDERS = [
  { id: 'movy' as const, label: 'Movy', meta: 'movy.sx' },
  { id: 'vidfast' as const, label: 'Vidfast', meta: 'vidfast.vc' },
  { id: 'vixsrc' as const, label: 'VixSrc', meta: 'vixsrc.to' },
] as const;

export function hasLocalFingerRuntime(): boolean {
  return true;
}

export function getDefaultFingerProvider(): FingerProviderId {
  return 'movy';
}

export const DEFAULT_FINGER_PROVIDER: FingerProviderId = 'movy';

export function getFingerStreamProviders() {
  return ALL_FINGER_STREAM_PROVIDERS;
}

export const FINGER_STREAM_PROVIDERS = ALL_FINGER_STREAM_PROVIDERS;

export const FINGER_API_SERVER_FEATURES = [
  '4K Ultra HD',
  'Progress sync',
  'Native player',
] as const;

interface FingerStreamResponse {
  streams: Record<string, string>;
  source?: string;
  sourceId?: string;
  embedUrl?: string;
  error?: string;
}

export interface FingerMediaInput {
  tmdbId: string;
  type: 'movie' | 'series';
  title: string;
  releaseYear: number;
  season?: number;
  episode?: number;
  provider?: FingerProviderId;
  imdbId?: string;
}

export type FingerPlayback =
  | { kind: 'hls'; url: string }
  | { kind: 'mp4'; url: string }
  | { kind: 'embed'; url: string };

export interface FingerVariantQuality {
  id: string;
  label: string;
  /** Raw stream URL before stream-proxy wrapping */
  url: string;
}

export type FingerScrapeResult = FingerPlayback & {
  sourceId?: string;
  /** Raw HLS URL before stream-proxy wrapping (master or best single playlist) */
  masterUrl?: string;
  /** Per-quality playlists when the provider does not return one adaptive master */
  variantQualities?: FingerVariantQuality[];
};

/** Same-origin proxy — resolves streams server-side via p-stream VidLink scraper. */
function getFingerProxyBase(): string {
  if (isFingerExtensionAvailable()) {
    return `${FINGER_EXT_ORIGIN}/api/finger`;
  }

  if (IS_NATIVE_SHELL && typeof window !== 'undefined') {
    return `${window.location.origin}/api/finger`;
  }

  const custom = import.meta.env.VITE_FINGER_PROXY_URL as string | undefined;
  if (custom?.trim()) return custom.trim().replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/finger`;
  }

  return '/api/finger';
}

function parseFingerStreams(data: FingerStreamResponse): Record<string, string> {
  const streams = { ...(data.streams || {}) };

  return Object.entries(streams).reduce<Record<string, string>>(
    (acc, [quality, url]) => {
      if (quality === 'hls' && url) {
        acc.hls = url;
        return acc;
      }

      if (quality === 'ORG') {
        const urlPath = url.split('?')[0];
        if (urlPath.toLowerCase().includes('.mp4')) {
          acc.unknown = url;
        }
        return acc;
      }

      let qualityKey: number | 'unknown';
      if (quality === '4k' || quality === '4K') {
        qualityKey = 2160;
      } else if (quality === 'unknown') {
        qualityKey = 'unknown';
      } else {
        qualityKey = parseInt(quality.replace('P', ''), 10);
      }

      if (qualityKey === 'unknown') {
        acc.unknown = url;
      } else if (typeof qualityKey === 'number' && !Number.isNaN(qualityKey) && !acc[qualityKey]) {
        acc[String(qualityKey)] = url;
      } else if (!acc[quality]) {
        acc[quality] = url;
      }
      return acc;
    },
    {}
  );
}

/** Resolves HLS segment proxy — same-origin in dev/Netlify, or VITE_M3U8_PROXY_URL override. */
export function getStreamProxyBase(): string | null {
  // Prefer same-origin proxy (Vite/Netlify/Electron). It supports Range + streaming for
  // progressive MP4. The extension fake-origin cannot be used by <video src> and hangs
  // on large files when buffered through postMessage.
  if (typeof window !== 'undefined') {
    const custom = import.meta.env.VITE_M3U8_PROXY_URL as string | undefined;
    if (custom?.trim()) return custom.trim().replace(/\/$/, '');
    return `${window.location.origin}/api/stream-proxy`;
  }

  return null;
}

export function getProxyApiBase(): string {
  if (typeof window !== 'undefined') {
    const custom = import.meta.env.VITE_PROXY_API_BASE as string | undefined;
    if (custom?.trim()) return custom.trim().replace(/\/$/, '');
    return window.location.origin;
  }

  return '';
}

function toBase64(input: string): string {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(input);
  }

  return Buffer.from(input, 'utf-8').toString('base64');
}

function isProxiedStreamUrl(url: string, proxyBase: string): boolean {
  if (!url || !proxyBase) return false;

  try {
    const resolvedUrl = new URL(url, typeof window !== 'undefined' ? window.location.origin : undefined);
    const resolvedBase = new URL(proxyBase, resolvedUrl.origin);
    return (
      resolvedUrl.origin === resolvedBase.origin &&
      (resolvedUrl.pathname === resolvedBase.pathname ||
        resolvedUrl.pathname.startsWith(`${resolvedBase.pathname}/`))
    );
  } catch {
    return url === proxyBase || url.startsWith(`${proxyBase}/`) || url.startsWith(`${proxyBase}?`);
  }
}

function resolveProxyRewriteUrl(url: string): string {
  if (!url.startsWith('/api/stream-proxy/')) return url;
  const apiBase = getProxyApiBase();
  return apiBase ? `${apiBase}${url}` : url;
}

export function wrapStreamUrl(url: string): string {
  const base = getStreamProxyBase();
  if (!base) return url;

  const normalized = resolveProxyRewriteUrl(url);
  if (isProxiedStreamUrl(normalized, base)) return normalized;

  // hls-proxy format: /BASE64(streamUrl). Query busts stale Chromium disk-cache of prior 403s.
  return `${base}/${encodeURIComponent(toBase64(normalized))}?sp=2`;
}

function qualityKeyToLabel(key: string): string {
  if (key === 'hls') return 'Auto (Adaptive)';
  if (key === '2160' || key === '4k' || key === '4K') return '4K';
  if (key === 'unknown') return 'Original';
  if (/^\d+$/.test(key)) return `${key}p`;
  return key.toUpperCase();
}

function qualitySortRank(key: string): number {
  if (key === 'hls') return 9999;
  if (key === '2160' || key === '4k' || key === '4K') return 2160;
  if (key === 'unknown') return 0;
  const n = parseInt(key, 10);
  return Number.isNaN(n) ? 1 : n;
}

export function isHlsStreamUrl(url: string): boolean {
  if (/\.m3u8(\?|$)/i.test(url)) return true;
  try {
    const parsed = new URL(url);
    return /vixsrc\.to$/i.test(parsed.hostname) && parsed.pathname.includes('/playlist/');
  } catch {
    return /vixsrc\.to\/playlist\//i.test(url);
  }
}

export function buildVixsrcPageUrl(input: {
  type: 'movie' | 'series';
  tmdbId: string;
  season?: number;
  episode?: number;
}): string {
  if (input.type === 'series') {
    if (!input.season || !input.episode) {
      throw new Error('Missing season or episode');
    }
    return `https://vixsrc.to/tv/${input.tmdbId}/${input.season}/${input.episode}`;
  }
  return `https://vixsrc.to/movie/${input.tmdbId}`;
}

export function buildVidfastPageUrl(input: {
  type: 'movie' | 'series';
  tmdbId: string;
  season?: number;
  episode?: number;
}): string {
  if (input.type === 'series') {
    if (!input.season || !input.episode) {
      throw new Error('Missing season or episode');
    }
    return `https://vidfast.vc/tv/${input.tmdbId}/${input.season}/${input.episode}`;
  }
  return `https://vidfast.vc/movie/${input.tmdbId}`;
}

export function buildMovyPageUrl(input: {
  type: 'movie' | 'series';
  tmdbId: string;
  season?: number;
  episode?: number;
}): string {
  if (input.type === 'series') {
    if (!input.season || !input.episode) {
      throw new Error('Missing season or episode');
    }
    return `https://www.movy.sx/tv/${input.tmdbId}/${input.season}/${input.episode}?play=true`;
  }
  return `https://www.movy.sx/movie/${input.tmdbId}`;
}

function urlToPlayback(url: string): FingerPlayback {
  const isHls = isHlsStreamUrl(url);
  const finalUrl = wrapStreamUrl(url);
  return { kind: isHls ? 'hls' : 'mp4', url: finalUrl };
}

export interface FingerQualityOption {
  id: string;
  label: string;
  playback: FingerPlayback;
  /** HLS.js level index; -1 = auto */
  hlsLevel?: number;
}

const DEFAULT_QUALITY_ORDER = ['2160', '4K', '4k', '1080', '720', '480', '360', 'hls', 'unknown'];

function qualityOrderForProvider(_provider?: FingerProviderId): string[] {
  return DEFAULT_QUALITY_ORDER;
}

function qualityOrderRank(key: string, order: string[]): number {
  const index = order.indexOf(key);
  return index === -1 ? -1 : order.length - index;
}

function pickFromQualityOrder(
  streams: Record<string, string>,
  order: string[]
): string | undefined {
  for (const quality of order) {
    const url = streams[quality];
    if (url) return url;
  }

  const values = Object.values(streams);
  return values.length > 0 ? values[0] : undefined;
}

export function pickBestStreamUrl(
  streams: Record<string, string>,
  provider?: FingerProviderId
): string | undefined {
  return pickFromQualityOrder(streams, qualityOrderForProvider(provider));
}

function buildVariantQualities(
  streams: Record<string, string>,
  provider?: FingerProviderId
): FingerVariantQuality[] | undefined {
  // Only explicit resolution keys (1080/720/…) count as provider variants.
  // A lone adaptive master (`hls`, optional duplicate `unknown`) is left to Shaka.
  const explicitEntries = Object.entries(streams).filter(
    ([key, url]) => Boolean(url) && key !== 'hls' && key !== 'unknown'
  );
  if (explicitEntries.length <= 1) return undefined;

  const seenUrls = new Set<string>();
  const uniqueEntries = explicitEntries.filter(([, url]) => {
    if (seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });
  if (uniqueEntries.length <= 1) return undefined;

  return buildFingerQualityOptions(Object.fromEntries(uniqueEntries), provider).map(option => ({
    id: option.id,
    label: option.label,
    url: streams[option.id],
  }));
}

function streamsToPlayback(
  streams: Record<string, string>,
  provider?: FingerProviderId
): FingerPlayback {
  const url = pickFromQualityOrder(streams, qualityOrderForProvider(provider));
  if (!url) throw new Error('No playable stream found');
  return urlToPlayback(url);
}

function pickDefaultQualityId(
  streams: Record<string, string>,
  provider?: FingerProviderId
): string {
  const order = qualityOrderForProvider(provider);
  for (const quality of order) {
    if (streams[quality]) return quality;
  }
  return 'hls';
}

export function buildFingerQualityOptions(
  streams: Record<string, string>,
  provider?: FingerProviderId
): FingerQualityOption[] {
  const order = qualityOrderForProvider(provider);
  return Object.entries(streams)
    .sort(([a], [b]) => {
      const orderRank = qualityOrderRank(b, order) - qualityOrderRank(a, order);
      return orderRank !== 0 ? orderRank : qualitySortRank(b) - qualitySortRank(a);
    })
    .map(([key, url]) => ({
      id: key,
      label: qualityKeyToLabel(key),
      playback: urlToPlayback(url),
    }));
}

function buildFingerPath(input: FingerMediaInput): string {
  if (input.type === 'series') {
    if (!input.season || !input.episode) {
      throw new Error('Missing season or episode');
    }
    return `/tv/${input.tmdbId}/${input.season}/${input.episode}`;
  }
  return `/movie/${input.tmdbId}`;
}

async function fetchFingerResponse(input: FingerMediaInput): Promise<FingerStreamResponse> {
  const path = buildFingerPath(input);
  const query = new URLSearchParams({
    provider: input.provider ?? getDefaultFingerProvider(),
    title: input.title,
    year: String(input.releaseYear),
  });
  if (input.imdbId) query.set('imdbId', input.imdbId);

  const url = `${getFingerProxyBase()}${path}?${query.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, { credentials: 'omit' });
  } catch {
    throw new Error(
      'Could not reach Finger API proxy. Restart the dev server or deploy the /api/finger handler.'
    );
  }

  if (!res.ok) {
    let detail = '';
    try {
      const errBody = (await res.json()) as { error?: string };
      detail = errBody.error ? `: ${errBody.error}` : '';
    } catch {
      /* ignore */
    }

    throw new Error(`Finger API returned ${res.status}${detail}`);
  }

  let data: FingerStreamResponse;
  try {
    data = await res.json();
  } catch {
    throw new Error('Invalid response from Finger API');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  const hasStreams = data.streams && Object.keys(data.streams).length > 0;
  const hasEmbed = Boolean(data.embedUrl?.trim());
  if (!hasStreams && !hasEmbed) {
    throw new Error('No streams returned from Finger API');
  }

  return data;
}

export async function scrapeFingerQualityOptions(input: FingerMediaInput): Promise<{
  sourceId?: string;
  options: FingerQualityOption[];
  defaultOptionId: string;
}> {
  const data = await fetchFingerResponse(input);
  const streams = parseFingerStreams(data);
  const options = buildFingerQualityOptions(streams, input.provider);
  return {
    sourceId: data.sourceId ?? data.source,
    options,
    defaultOptionId: pickDefaultQualityId(streams, input.provider),
  };
}

export async function scrapeFingerStreamDetailed(input: FingerMediaInput): Promise<FingerScrapeResult> {
  const data = await fetchFingerResponse(input);
  if (data.embedUrl) {
    return {
      kind: 'embed',
      url: data.embedUrl,
      sourceId: data.sourceId,
    };
  }

  const streams = parseFingerStreams(data);
  const playback = streamsToPlayback(streams, input.provider);

  return {
    ...playback,
    sourceId: data.sourceId ?? data.source,
    masterUrl: pickBestStreamUrl(streams, input.provider),
    variantQualities: buildVariantQualities(streams, input.provider),
  };
}

export async function scrapeFingerStream(input: FingerMediaInput): Promise<FingerPlayback> {
  const result = await scrapeFingerStreamDetailed(input);
  return result;
}

async function fetchFingerExtractResponse(pageUrl: string): Promise<FingerStreamResponse> {
  const url = `${getFingerProxyBase()}/extract?${new URLSearchParams({ url: pageUrl }).toString()}`;

  let res: Response;
  try {
    res = await fetch(url, { credentials: 'omit' });
  } catch {
    throw new Error(
      'Could not reach Finger API proxy. Restart the desktop app or deploy the /api/finger handler.'
    );
  }

  if (!res.ok) {
    let detail = '';
    try {
      const errBody = (await res.json()) as { error?: string };
      detail = errBody.error ? `: ${errBody.error}` : '';
    } catch {
      /* ignore */
    }
    throw new Error(`Extract failed${detail || ` (${res.status})`}`);
  }

  let data: FingerStreamResponse;
  try {
    data = await res.json();
  } catch {
    throw new Error('Invalid extract response');
  }

  if (data.error) throw new Error(data.error);
  if (!data.streams || Object.keys(data.streams).length === 0) {
    throw new Error('No playable stream found in the embed page');
  }

  return data;
}

/** Extract a playable stream from an arbitrary embed URL (App Exclusives). */
export async function scrapeFingerFromUrl(pageUrl: string): Promise<FingerScrapeResult> {
  const data = await fetchFingerExtractResponse(pageUrl);
  const streams = parseFingerStreams(data);
  const playback = streamsToPlayback(streams);
  const isHls = playback.kind === 'hls';

  return {
    ...playback,
    sourceId: data.sourceId ?? data.source ?? 'App Exclusive',
    masterUrl: isHls ? pickBestStreamUrl(streams) : undefined,
    variantQualities: isHls ? buildVariantQualities(streams) : undefined,
  };
}
