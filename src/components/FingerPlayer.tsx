/**
 * FingerPlayer 2.0 — Complete Ultra-Modern Rebuild
 *
 * Design: Deep black canvas, frosted-glass panels, white/accent chrome,
 * smooth spring animations. Full preferences system with keybind customization,
 * player appearance settings, subtitle controls, and more.
 * All playback engineering (shaka, provider probing, quality pinning,
 * captions, intros, progress sync) is preserved in behavior.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import shaka from 'shaka-player';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Captions,
  ChevronRight,
  Gauge,
  Keyboard,
  Loader2,
  Maximize,
  Minimize,
  Monitor,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  RotateCw,
  Search,
  Server,
  Settings,
  SkipForward,
  Sliders,
  SlidersHorizontal,
  Volume1,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  scrapeFingerStreamDetailed,
  scrapeFingerFromUrl,
  wrapStreamUrl,
  getProxyApiBase,
  isHlsStreamUrl,
  FINGER_API_SERVER_TAG,
  getFingerStreamProviders,
  getDefaultFingerProvider,
  hasLocalFingerRuntime,
  type FingerPlayback,
  type FingerProviderId,
} from '../lib/fingerApi';
import { FINGER_EXT_ORIGIN, isFingerExtensionAvailable } from '../lib/fingerExtension';
import {
  buildM3u8QualityMenu,
  resolveQualityTier,
  type M3u8QualityOption,
} from '../lib/m3u8Qualities';
import {
  readLocalWatchProgress,
  resumableTimeFromEntry,
} from '../lib/watchProgress';
import { emitDesktopWatchingState } from '../lib/desktopStats';
import { IS_DESKTOP_APP, IS_NATIVE_SHELL, IS_MOBILE_APP, setNativeImmersiveMode } from '../lib/appShell';
import './FingerPlayer.css';

/* ══════════════════════ constants ══════════════════════ */

const BUFFER_AHEAD = IS_NATIVE_SHELL ? 180 : 60;
const BUFFER_BEHIND = IS_NATIVE_SHELL ? 120 : 30;
const HEIGHT_UNCAPPED = 8192;
const VARIANT_SWITCH_TIMEOUT = 15_000;
const MANUAL_TIER_STABLE_MS = 25_000;
const AUTO_ID = 'auto';
const CAPTIONS_OFF = 'captions-off';
const CAPTIONS_LOCKED = false;

const HIDE_CONTROLS_MS = 2200;
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

const KEY_VOLUME = 'fp-player-volume';
const KEY_CAPTIONS = 'fp-subtitle-settings';
const KEY_KEYBINDS = 'fp-keybinds';
const KEY_PREFS = 'fp-player-prefs';

const PREVIEW_W = 184;
const PREVIEW_H = 104;
const PREVIEW_SETTLE_MS = 90;

const SWATCHES = [
  '#ffffff', '#ffd966', '#7dd3fc', '#6ee7b7',
  '#c084fc', '#94a3b8', '#64748b', '#1f2937', '#000000',
] as const;

const CAPTION_FONTS = [
  { id: 'arial', label: 'Arial', family: '"FPArial", Arial, Helvetica, sans-serif' },
  { id: 'consolas', label: 'Mono', family: '"FPConsolas", Consolas, monospace' },
  { id: 'grotesk', label: 'Grotesk', family: '"FPGrotesk", "Space Grotesk", Arial, sans-serif' },
] as const;

const ICON = { width: 26, height: 26 } as const;
const ICON_SM = { width: 18, height: 18 } as const;
const STROKE = 1.8;

/* ══════════════════════ public contracts ══════════════════════ */

export interface WatchProgressPayload {
  currentTime: number;
  duration: number;
  progress: number;
  event: string;
}

interface FingerPlayerProps {
  mediaId: string;
  type: 'movie' | 'series';
  title: string;
  releaseYear: number;
  releaseDate?: string;
  rating?: number | string | null;
  /** Optional raw TMDB media object. */
  tmdb?: {
    title?: string;
    episodeTitle?: string;
    release_date?: string;
    first_air_date?: string;
    air_date?: string;
    vote_average?: number | string | null;
    logoUrl?: string;
    overview?: string;
  } | null;
  season?: number;
  episode?: number;
  initialTime?: number;
  logoUrl?: string;
  description?: string;
  episodeTitle?: string;
  runtimeMinutes?: number | null;
  imdbId?: string;
  initialProvider?: FingerProviderId;
  onProviderChange?: (provider: FingerProviderId) => void;
  onProgress?: (data: WatchProgressPayload) => void;
  canGoNextEpisode?: boolean;
  onNextEpisode?: () => void;
  lockProviderServer?: boolean;
  extractUrl?: string;
  forceSubtitleLang?: string;
  showSubtitlesButton?: boolean;
  onBack?: () => void;
}

export function readSavedWatchTime(
  mediaId: string,
  type: 'movie' | 'series',
  season: number,
  episode: number
): number | undefined {
  return resumableTimeFromEntry(
    readLocalWatchProgress(mediaId, type, season, episode)
  );
}

/* ══════════════════════ pure helpers ══════════════════════ */

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function describeError(err: unknown): string {
  if (err instanceof Error && err.message && err.message !== 'Shaka Error') return err.message;
  if (err && typeof err === 'object') {
    const shaped = err as { code?: number | string; message?: string; data?: unknown[] };
    const detail = Array.isArray(shaped.data) && shaped.data.length > 0
      ? shaped.data.map(p => {
          if (p instanceof Error) return p.message;
          if (typeof p === 'string' || typeof p === 'number') return String(p);
          return '';
        }).filter(Boolean).join(' · ')
      : '';
    if (shaped.message && detail) return `${shaped.message}: ${detail}`;
    if (shaped.message) return shaped.message;
    if (shaped.code != null && detail) return `Playback error ${shaped.code}: ${detail}`;
    if (shaped.code != null) return `Playback error ${shaped.code}`;
  }
  return 'Stream playback failed';
}

function needsShakaPipeline(url: string): boolean {
  if (!url) return false;
  if (url.startsWith(FINGER_EXT_ORIGIN)) return true;
  return isFingerExtensionAvailable() && url.includes('seriestech-finger.invalid');
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, min), max);
}

function safeHex(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const t = value.trim();
  return /^#[0-9a-f]{6}$/i.test(t) ? t : fallback;
}

function hexAlpha(hex: string, alpha: number): string {
  const base = safeHex(hex, '#000000').slice(1);
  const r = parseInt(base.slice(0, 2), 16);
  const g = parseInt(base.slice(2, 4), 16);
  const b = parseInt(base.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1, 1)})`;
}

function proxyUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getProxyApiBase()}${path.startsWith('/') ? path : `/${path}`}`;
}

function tierBadge(tier?: number): string {
  if (!tier) return 'Auto';
  return tier >= 2160 ? '4K' : `${tier}p`;
}

function tierRank(option: M3u8QualityOption): number {
  return option.tier ?? resolveQualityTier({
    height: option.height,
    width: option.width,
    bandwidth: option.bandwidth,
    url: option.variantUrl,
  }) ?? 0;
}

function qualityNote(label: string): string | null {
  const match = label.match(/(\d{3,4})\s*p/i);
  if (!match) return /auto/i.test(label) ? 'Adaptive bitrate' : null;
  const h = Number(match[1]);
  if (h >= 2160) return '4K UHD';
  if (h >= 1440) return 'QHD';
  if (h >= 1080) return 'Full HD';
  if (h >= 720) return 'HD Ready';
  return 'SD';
}

function tiersUpTo(options: M3u8QualityOption[], ceiling: number): number[] {
  return Array.from(new Set(options.map(tierRank).filter(t => t > 0 && t <= ceiling))).sort((a, b) => a - b);
}

function tierJustBelow(options: M3u8QualityOption[], target: number): number {
  const ladder = tiersUpTo(options, target);
  const at = ladder.findIndex(t => t >= target);
  if (at <= 0) return target;
  return ladder[at - 1];
}

function nextTierDown(options: M3u8QualityOption[], current: number): number | null {
  const lower = tiersUpTo(options, current).filter(t => t < current);
  return lower.length ? lower[lower.length - 1] : null;
}

function nextTierUp(options: M3u8QualityOption[], current: number, ceiling: number): number | null {
  return tiersUpTo(options, ceiling).find(t => t > current) ?? null;
}

type Span = { start: number; end: number };

function spansFromVideo(video: HTMLVideoElement): Span[] {
  const duration = video.duration;
  if (!Number.isFinite(duration) || duration <= 0) return [];
  const spans: Span[] = [];
  for (let i = 0; i < video.buffered.length; i++) {
    const start = (video.buffered.start(i) / duration) * 100;
    const end = (video.buffered.end(i) / duration) * 100;
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      spans.push({ start: Math.min(Math.max(start, 0), 100), end: Math.min(Math.max(end, 0), 100) });
    }
  }
  return spans;
}

function spansEqual(a: Span[], b: Span[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((span, i) => Math.abs(span.start - b[i].start) < 0.1 && Math.abs(span.end - b[i].end) < 0.1);
}

function mergeSpans(a: Span[], b: Span[]): Span[] {
  const sorted = [...a, ...b]
    .filter(s => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start)
    .sort((l, r) => l.start - r.start);
  const merged: Span[] = [];
  sorted.forEach(span => {
    const tail = merged[merged.length - 1];
    if (tail && span.start <= tail.end + 0.35) { tail.end = Math.max(tail.end, span.end); return; }
    merged.push({ ...span });
  });
  return merged;
}

function nudgeVideoTo(video: HTMLVideoElement, time: number, onApplied?: (t: number, d: number) => void): void {
  if (!Number.isFinite(time) || time <= 0) return;
  const attempt = (): boolean => {
    const duration = video.duration;
    if (Number.isFinite(duration) && duration > 0 && time >= duration - 1) return false;
    try { video.currentTime = time; } catch { return false; }
    const resolved = Number.isFinite(video.duration) ? video.duration : duration;
    onApplied?.(time, resolved || 0);
    return true;
  };
  if (attempt()) return;
  const events: Array<keyof HTMLVideoElementEventMap> = ['loadedmetadata', 'durationchange', 'canplay'];
  const bindings = events.map(event => {
    const handler = () => {
      if (attempt()) bindings.forEach(({ event: evt, handler: fn }) => video.removeEventListener(evt, fn));
    };
    video.addEventListener(event, handler);
    return { event, handler };
  });
}

type MediaSnapshot = { at: number; rolling: boolean; level: number; hushed: boolean; rate: number };

function grabSnapshot(video: HTMLVideoElement | null, rate: number): MediaSnapshot {
  return {
    at: video && Number.isFinite(video.currentTime) ? Math.max(0, video.currentTime) : 0,
    rolling: Boolean(video && !video.paused && !video.ended),
    level: video && Number.isFinite(video.volume) ? video.volume : 1,
    hushed: Boolean(video?.muted),
    rate,
  };
}

function reapplySnapshot(video: HTMLVideoElement, snap: MediaSnapshot): void {
  video.volume = snap.level > 0 ? snap.level : video.volume || 1;
  video.muted = snap.hushed;
  video.playbackRate = snap.rate;
}

/* ══════════════════════ caption domain ══════════════════════ */

type CaptionTrack = {
  id: string; label: string; language: string; url: string;
  flagUrl?: string; source?: string; release?: string; format?: string;
};
type Cue = { start: number; end: number; text: string };
type IntroSpan = { type: string; start: number; end: number };

type CaptionStyle = {
  textColor: string; textOpacity: number; backgroundColor: string;
  backgroundOpacity: number; textSize: number; fontFamily: string;
  positionX: number; positionY: number;
};

const DEFAULT_STYLE: CaptionStyle = {
  textColor: '#ffffff', textOpacity: 1, backgroundColor: '#000000',
  backgroundOpacity: 0.68, textSize: 24, fontFamily: 'arial',
  positionX: 50, positionY: 78,
};

const LANGUAGE_NAMES: Record<string, string> = {
  ar: 'Arabic', bg: 'Bulgarian', bs: 'Bosnian', cs: 'Czech', da: 'Danish',
  de: 'German', el: 'Greek', en: 'English', es: 'Spanish', et: 'Estonian',
  fi: 'Finnish', fr: 'French', he: 'Hebrew', hi: 'Hindi', hr: 'Croatian',
  hu: 'Hungarian', it: 'Italian', ja: 'Japanese', ko: 'Korean', nb: 'Norwegian',
  nl: 'Dutch', no: 'Norwegian', fa: 'Persian', pl: 'Polish', pt: 'Portuguese',
  'pt-br': 'Brazilian Portuguese', ro: 'Romanian', ru: 'Russian', sk: 'Slovak',
  sl: 'Slovenian', sr: 'Serbian', sv: 'Swedish', tr: 'Turkish', uk: 'Ukrainian',
  zh: 'Chinese', 'zh-tw': 'Chinese Traditional',
};

const LANGUAGE_FLAGS: Record<string, string> = {
  ar: 'SA', bg: 'BG', bs: 'BA', cs: 'CZ', da: 'DK', de: 'DE', el: 'GR',
  en: 'US', es: 'ES', et: 'EE', fi: 'FI', fr: 'FR', he: 'IL', hi: 'IN',
  hr: 'HR', hu: 'HU', it: 'IT', ja: 'JP', ko: 'KR', nb: 'NO', nl: 'NL',
  no: 'NO', fa: 'IR', pl: 'PL', pt: 'PT', 'pt-br': 'BR', ro: 'RO', ru: 'RU',
  sk: 'SK', sl: 'SI', sr: 'RS', sv: 'SE', tr: 'TR', uk: 'UA', zh: 'CN', 'zh-tw': 'TW',
};

const ISO3_ALIASES: Record<string, string> = {
  ara: 'ar', bul: 'bg', bos: 'bs', ces: 'cs', cze: 'cs', dan: 'da',
  deu: 'de', ger: 'de', ell: 'el', gre: 'el', eng: 'en', est: 'et',
  spa: 'es', fin: 'fi', fra: 'fr', fre: 'fr', heb: 'he', hin: 'hi',
  hrv: 'hr', hun: 'hu', ita: 'it', jpn: 'ja', kor: 'ko', nld: 'nl',
  dut: 'nl', nor: 'no', per: 'fa', fas: 'fa', pes: 'fa', pol: 'pl',
  por: 'pt', pob: 'pt-br', ron: 'ro', rum: 'ro', rus: 'ru', slk: 'sk',
  slo: 'sk', slv: 'sl', srp: 'sr', swe: 'sv', tur: 'tr', ukr: 'uk',
  zho: 'zh', chi: 'zh', zht: 'zh-tw',
};

function normalizeLang(code?: string): string {
  const lowered = String(code || 'en').toLowerCase();
  return ISO3_ALIASES[lowered] || lowered;
}

function languageLabel(code: string): string {
  const n = normalizeLang(code);
  return LANGUAGE_NAMES[n] || n.toUpperCase();
}

function flagFor(code: string): string {
  const country = LANGUAGE_FLAGS[normalizeLang(code)];
  return country ? `https://flagsapi.com/${country}/flat/24.png` : '';
}

function toCaptionTrack(entry: any, index: number): CaptionTrack | null {
  const url = typeof entry?.url === 'string' ? entry.url : '';
  if (!url) return null;
  const language = normalizeLang(entry.language || entry.lang || 'en');
  const release = String(entry.release || entry.filename || entry.id || '').trim();
  return {
    id: String(entry.id || `${language}-${index}`),
    label: String(entry.label || languageLabel(language)),
    language,
    url: proxyUrl(url),
    flagUrl: entry.flagUrl || flagFor(language),
    source: entry.source || 'Stremio',
    release,
    format: entry.format || 'srt',
  };
}

async function loadCaptionCatalog(params: {
  type: 'movie' | 'series'; season: number; episode: number;
  imdbId?: string; tmdbId?: string;
}): Promise<CaptionTrack[]> {
  const query = new URLSearchParams({ type: params.type, season: String(params.season), episode: String(params.episode) });
  if (params.imdbId) query.set('imdbId', params.imdbId);
  if (params.tmdbId) query.set('tmdbId', params.tmdbId);
  const res = await fetch(proxyUrl(`/api/subtitles?${query.toString()}`));
  if (!res.ok) return [];
  const data = (await res.json()) as { subtitles?: any[] };
  return Array.isArray(data.subtitles)
    ? data.subtitles.map((entry, i) => toCaptionTrack(entry, i)).filter((t): t is CaptionTrack => Boolean(t)).slice(0, 100)
    : [];
}

async function loadIntroSpans(params: {
  mediaId: string; type: 'movie' | 'series'; season: number; episode: number; imdbId?: string;
}): Promise<IntroSpan[]> {
  if (params.type !== 'series') return [];
  const query = new URLSearchParams({ type: params.type, tmdbId: params.mediaId, season: String(params.season), episode: String(params.episode) });
  if (params.imdbId) query.set('imdbId', params.imdbId);
  const res = await fetch(proxyUrl(`/api/introdb?${query.toString()}`));
  if (!res.ok) return [];
  const data = (await res.json()) as { segments?: IntroSpan[] };
  return Array.isArray(data.segments) ? data.segments.filter(s => s.type === 'intro' && s.end > s.start) : [];
}

function parseStamp(value: string): number {
  const normalized = value.trim().replace(',', '.');
  const parts = normalized.split(':');
  if (parts.length < 2) return 0;
  const sec = Number(parts.pop());
  const min = Number(parts.pop());
  const hr = Number(parts.pop() ?? 0);
  if (![hr, min, sec].every(Number.isFinite)) return 0;
  return hr * 3600 + min * 60 + sec;
}

function parseCues(text: string): Cue[] {
  const normalized = text.replace(/\r/g, '').replace(/^\uFEFF/, '');
  const blocks = normalized.replace(/^WEBVTT[^\n]*(?:\n|$)/i, '').split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean);
    const timingAt = lines.findIndex(l => l.includes('-->'));
    if (timingAt === -1) continue;
    const [rawStart, rawEnd] = lines[timingAt].split('-->').map(p => p.trim().split(/\s+/)[0]);
    const body = lines.slice(timingAt + 1).join('\n').replace(/<[^>]+>/g, '').trim();
    const start = parseStamp(rawStart || '');
    const end = parseStamp(rawEnd || '');
    if (end > start && body) cues.push({ start, end, text: body });
  }
  return cues;
}

async function fetchCueText(track: CaptionTrack): Promise<string> {
  const res = await fetch(proxyUrl(track.url));
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Subtitle request failed (${res.status})`);
  return text;
}

function captionFontFamily(id: string): string {
  return CAPTION_FONTS.find(f => f.id === id)?.family || CAPTION_FONTS[0].family;
}

function captionOverlayStyle(style: CaptionStyle): CSSProperties {
  return { left: `${style.positionX}%`, top: `${style.positionY}%`, transform: 'translate(-50%, -50%)' };
}

function captionLineStyle(style: CaptionStyle): CSSProperties {
  const family = captionFontFamily(style.fontFamily);
  return {
    '--fp-caption-font': family,
    backgroundColor: hexAlpha(style.backgroundColor, style.backgroundOpacity),
    color: hexAlpha(style.textColor, style.textOpacity),
    fontFamily: family,
    fontSize: `${style.textSize}px`,
  } as CSSProperties;
}

function readCaptionStyle(): CaptionStyle {
  try {
    const stored = localStorage.getItem(KEY_CAPTIONS);
    if (!stored) return DEFAULT_STYLE;
    const data = JSON.parse(stored) as Partial<CaptionStyle>;
    return {
      textColor: safeHex(data.textColor, DEFAULT_STYLE.textColor),
      textOpacity: clamp(data.textOpacity, 0.2, 1, DEFAULT_STYLE.textOpacity),
      backgroundColor: safeHex(data.backgroundColor, DEFAULT_STYLE.backgroundColor),
      backgroundOpacity: clamp(data.backgroundOpacity, 0, 1, DEFAULT_STYLE.backgroundOpacity),
      textSize: clamp(data.textSize, 14, 42, DEFAULT_STYLE.textSize),
      fontFamily: CAPTION_FONTS.some(f => f.id === data.fontFamily) ? String(data.fontFamily) : DEFAULT_STYLE.fontFamily,
      positionX: clamp(data.positionX, 8, 92, DEFAULT_STYLE.positionX),
      positionY: clamp(data.positionY, 8, 94, DEFAULT_STYLE.positionY),
    };
  } catch { return DEFAULT_STYLE; }
}

function writeCaptionStyle(style: CaptionStyle): void {
  try { localStorage.setItem(KEY_CAPTIONS, JSON.stringify(style)); } catch { /* noop */ }
}

/* ══════════════════════ keybind system ══════════════════════ */

type KeybindAction =
  | 'togglePlay' | 'seekBack' | 'seekForward'
  | 'volumeUp' | 'volumeDown' | 'mute'
  | 'fullscreen' | 'openPrefs' | 'closePanel';

interface KeybindConfig {
  action: KeybindAction;
  label: string;
  description: string;
  defaultKeys: string[];
  keys: string[];
}

const DEFAULT_KEYBINDS: KeybindConfig[] = [
  { action: 'togglePlay', label: 'Play / Pause', description: 'Toggle playback', defaultKeys: ['Space'], keys: ['Space'] },
  { action: 'seekBack', label: 'Seek Back 10s', description: 'Jump 10 seconds back', defaultKeys: ['ArrowLeft'], keys: ['ArrowLeft'] },
  { action: 'seekForward', label: 'Seek Forward 10s', description: 'Jump 10 seconds ahead', defaultKeys: ['ArrowRight'], keys: ['ArrowRight'] },
  { action: 'volumeUp', label: 'Volume Up', description: 'Increase volume 5%', defaultKeys: ['ArrowUp'], keys: ['ArrowUp'] },
  { action: 'volumeDown', label: 'Volume Down', description: 'Decrease volume 5%', defaultKeys: ['ArrowDown'], keys: ['ArrowDown'] },
  { action: 'mute', label: 'Mute / Unmute', description: 'Toggle audio mute', defaultKeys: ['m'], keys: ['m'] },
  { action: 'fullscreen', label: 'Fullscreen', description: 'Toggle fullscreen mode', defaultKeys: ['f'], keys: ['f'] },
  { action: 'openPrefs', label: 'Open Preferences', description: 'Open the preferences panel', defaultKeys: ['k'], keys: ['k'] },
  { action: 'closePanel', label: 'Close Panel', description: 'Close any open panel', defaultKeys: ['Escape'], keys: ['Escape'] },
];

function normalizeKey(key: unknown): string | null {
  if (typeof key !== 'string') return null;
  const trimmed = key.trim();
  if (!trimmed) return null;

  const aliases: Record<string, string> = {
    ' ': 'Space',
    Spacebar: 'Space',
    Esc: 'Escape',
    Left: 'ArrowLeft',
    Right: 'ArrowRight',
    Up: 'ArrowUp',
    Down: 'ArrowDown',
  };
  const normalized = aliases[trimmed] || trimmed;

  // Store letters case-insensitively. Playback matching also remains
  // case-insensitive, so a single key is enough and cannot render twice.
  if (normalized.length === 1 && /[a-z]/i.test(normalized)) return normalized.toLowerCase();
  return normalized;
}

function readKeybinds(): KeybindConfig[] {
  try {
    const stored = localStorage.getItem(KEY_KEYBINDS);
    if (!stored) return DEFAULT_KEYBINDS.map(kb => ({ ...kb, keys: [...kb.defaultKeys] }));
    const data = JSON.parse(stored) as Record<string, unknown>;

    return DEFAULT_KEYBINDS.map(kb => {
      const raw = Array.isArray(data[kb.action]) ? data[kb.action] : kb.defaultKeys;
      const keys = Array.from(new Set((raw as unknown[]).map(normalizeKey).filter((key): key is string => Boolean(key))));
      return { ...kb, keys: keys.length ? keys.slice(0, 1) : [...kb.defaultKeys] };
    });
  } catch {
    return DEFAULT_KEYBINDS.map(kb => ({ ...kb, keys: [...kb.defaultKeys] }));
  }
}

function writeKeybinds(keybinds: KeybindConfig[]): void {
  try {
    const data: Record<string, string[]> = {};
    keybinds.forEach(kb => { data[kb.action] = Array.from(new Set(kb.keys.map(normalizeKey).filter((key): key is string => Boolean(key)))).slice(0, 1); });
    localStorage.setItem(KEY_KEYBINDS, JSON.stringify(data));
  } catch { /* noop */ }
}

function displayKey(key: string): string {
  const map: Record<string, string> = {
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
    Escape: 'Esc', Space: 'Space', Enter: '↵', Backspace: '⌫', Delete: '⌦',
  };
  return map[key] || key;
}

/* ══════════════════════ player prefs ══════════════════════ */

interface PlayerPrefs {
  seekStep: number;
  volumeStep: number;
  autoHideDelay: number;
  showPreviewThumbnails: boolean;
  showRemainingTime: boolean;
  doubleClickFullscreen: boolean;
  autoNextEpisode: boolean;
  defaultQuality: string;
  accentColor: string;
  textColor: string;
  controlColor: string;
  borderColor: string;
  controlOpacity: number;
  controlBlur: number;
  uiScale: number;
  controlRadius: number;
  iconSize: number;
  seekThickness: number;
  seekThumbSize: number;
  pauseDim: number;
  pauseBlur: number;
}

const DEFAULT_PREFS: PlayerPrefs = {
  seekStep: 10,
  volumeStep: 0.05,
  autoHideDelay: 2200,
  showPreviewThumbnails: true,
  showRemainingTime: false,
  doubleClickFullscreen: true,
  autoNextEpisode: true,
  defaultQuality: 'auto',
  accentColor: '#ffffff',
  textColor: '#ffffff',
  controlColor: '#090909',
  borderColor: '#ffffff',
  controlOpacity: 0.82,
  controlBlur: 18,
  uiScale: 1,
  controlRadius: 8,
  iconSize: 24,
  seekThickness: 2,
  seekThumbSize: 8,
  pauseDim: 0.56,
  pauseBlur: 3,
};

function readPrefs(): PlayerPrefs {
  try {
    const stored = localStorage.getItem(KEY_PREFS);
    if (!stored) return DEFAULT_PREFS;
    const data = JSON.parse(stored) as Partial<PlayerPrefs>;
    return {
      seekStep: clamp(data.seekStep, 1, 60, DEFAULT_PREFS.seekStep),
      volumeStep: clamp(data.volumeStep, 0.01, 0.2, DEFAULT_PREFS.volumeStep),
      autoHideDelay: clamp(data.autoHideDelay, 500, 10000, DEFAULT_PREFS.autoHideDelay),
      showPreviewThumbnails: data.showPreviewThumbnails ?? DEFAULT_PREFS.showPreviewThumbnails,
      showRemainingTime: data.showRemainingTime ?? DEFAULT_PREFS.showRemainingTime,
      doubleClickFullscreen: data.doubleClickFullscreen ?? DEFAULT_PREFS.doubleClickFullscreen,
      autoNextEpisode: data.autoNextEpisode ?? DEFAULT_PREFS.autoNextEpisode,
      defaultQuality: typeof data.defaultQuality === 'string' ? data.defaultQuality : DEFAULT_PREFS.defaultQuality,
      accentColor: safeHex(data.accentColor, DEFAULT_PREFS.accentColor),
      textColor: safeHex(data.textColor, DEFAULT_PREFS.textColor),
      controlColor: safeHex(data.controlColor, DEFAULT_PREFS.controlColor),
      borderColor: safeHex(data.borderColor, DEFAULT_PREFS.borderColor),
      controlOpacity: clamp(data.controlOpacity, 0.35, 1, DEFAULT_PREFS.controlOpacity),
      controlBlur: clamp(data.controlBlur, 0, 32, DEFAULT_PREFS.controlBlur),
      uiScale: clamp(data.uiScale, 0.8, 1.2, DEFAULT_PREFS.uiScale),
      controlRadius: clamp(data.controlRadius, 0, 20, DEFAULT_PREFS.controlRadius),
      iconSize: clamp(data.iconSize, 16, 32, DEFAULT_PREFS.iconSize),
      seekThickness: clamp(data.seekThickness, 1, 6, DEFAULT_PREFS.seekThickness),
      seekThumbSize: clamp(data.seekThumbSize, 4, 14, DEFAULT_PREFS.seekThumbSize),
      pauseDim: clamp(data.pauseDim, 0.25, 0.85, DEFAULT_PREFS.pauseDim),
      pauseBlur: clamp(data.pauseBlur, 0, 12, DEFAULT_PREFS.pauseBlur),
    };
  } catch { return DEFAULT_PREFS; }
}

function writePrefs(prefs: PlayerPrefs): void {
  try { localStorage.setItem(KEY_PREFS, JSON.stringify(prefs)); } catch { /* noop */ }
}

type StoredVolume = { volume: number; muted: boolean };

function readStoredVolume(): StoredVolume {
  try {
    const stored = localStorage.getItem(KEY_VOLUME);
    if (!stored) return { volume: 1, muted: false };
    const data = JSON.parse(stored) as { volume?: number; muted?: boolean };
    return { volume: clamp(data.volume, 0, 1, 1), muted: Boolean(data.muted) };
  } catch { return { volume: 1, muted: false }; }
}

function writeStoredVolume(volume: number, muted: boolean): void {
  try { localStorage.setItem(KEY_VOLUME, JSON.stringify({ volume: clamp(volume, 0, 1, 1), muted })); } catch { /* noop */ }
}

/* ══════════════════════ hover preview engine ══════════════════════ */

type LiveSource = { kind: 'hls' | 'mp4'; url: string };

function useHoverPreview(source: LiveSource | null, enabled: boolean) {
  const [frame, setFrame] = useState<string | null>(null);
  const videoSlot = useRef<HTMLVideoElement | null>(null);
  const engineSlot = useRef<InstanceType<typeof shaka.Player> | null>(null);
  const canvasSlot = useRef<HTMLCanvasElement | null>(null);
  const readyFlag = useRef(false);
  const busyFlag = useRef(false);
  const queuedAt = useRef<number | null>(null);
  const settleTimer = useRef<number | null>(null);
  const lastPaintedAt = useRef<number | null>(null);
  const paint = useRef<(at: number) => void>(() => undefined);

  useEffect(() => {
    readyFlag.current = false;
    busyFlag.current = false;
    queuedAt.current = null;
    lastPaintedAt.current = null;
    setFrame(null);
    if (!source?.url || !enabled) return () => undefined;

    let dead = false;
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('playsinline', '');
    video.style.cssText = 'position:fixed;left:-9999px;top:0;width:160px;height:90px;opacity:0;pointer-events:none;';
    document.body.appendChild(video);
    videoSlot.current = video;

    const paintNow = (at: number) => {
      if (dead || !videoSlot.current) return;
      if (video.videoWidth < 2 || video.videoHeight < 2) return;
      if (!canvasSlot.current) canvasSlot.current = document.createElement('canvas');
      const canvas = canvasSlot.current;
      canvas.width = PREVIEW_W;
      canvas.height = PREVIEW_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      try { ctx.drawImage(video, 0, 0, PREVIEW_W, PREVIEW_H); setFrame(canvas.toDataURL('image/jpeg', 0.72)); lastPaintedAt.current = at; } catch { /* tainted */ }
    };

    const capture = (at: number) => {
      if (dead) return;
      if (!readyFlag.current || busyFlag.current) { queuedAt.current = at; return; }
      if (lastPaintedAt.current != null && Math.abs(lastPaintedAt.current - at) < 0.4) return;
      busyFlag.current = true;
      const duration = Number.isFinite(video.duration) ? video.duration : at;
      const target = Math.max(0, Math.min(at, Math.max(duration - 0.05, 0)));
      const settle = () => {
        busyFlag.current = false;
        if (dead) return;
        paintNow(target);
        const queued = queuedAt.current;
        if (queued != null) { queuedAt.current = null; capture(queued); }
      };
      if (Math.abs(video.currentTime - target) <= 0.15) { settle(); return; }
      const onSeeked = () => { video.removeEventListener('seeked', onSeeked); video.removeEventListener('error', onFailed); settle(); };
      const onFailed = () => { video.removeEventListener('seeked', onSeeked); video.removeEventListener('error', onFailed); busyFlag.current = false; };
      video.addEventListener('seeked', onSeeked);
      video.addEventListener('error', onFailed);
      try { video.currentTime = target; } catch { onFailed(); }
    };

    paint.current = capture;

    const markReady = () => {
      if (dead) return;
      readyFlag.current = true;
      const queued = queuedAt.current;
      if (queued != null) { queuedAt.current = null; capture(queued); }
    };

    const boot = async () => {
      try {
        if (source.kind === 'hls') {
          shaka.polyfill.installAll();
          if (!shaka.Player.isBrowserSupported()) return;
          const engine = new shaka.Player(video);
          if (dead) { await engine.destroy().catch(() => undefined); return; }
          engineSlot.current = engine;
          await engine.configure({ streaming: { bufferingGoal: 6, bufferBehind: 2, retryParameters: { maxAttempts: 2, baseDelay: 200, backoffFactor: 2, fuzzFactor: 0.5, timeout: 8000 } }, abr: { enabled: true, restrictions: { maxHeight: 360 } } });
          await engine.load(source.url);
        } else {
          await new Promise<void>((resolve, reject) => {
            const ok = () => { done(); resolve(); };
            const bad = () => { done(); reject(new Error('preview mp4 failed')); };
            const done = () => { video.removeEventListener('loadeddata', ok); video.removeEventListener('error', bad); };
            video.addEventListener('loadeddata', ok, { once: true });
            video.addEventListener('error', bad, { once: true });
            video.src = source.url; video.load();
          });
        }
        markReady();
      } catch { /* previews are decorative */ }
    };

    void boot();

    return () => {
      dead = true;
      paint.current = () => undefined;
      readyFlag.current = false;
      const engine = engineSlot.current;
      engineSlot.current = null;
      if (engine) void engine.destroy().catch(() => undefined);
      videoSlot.current = null;
      video.removeAttribute('src');
      try { video.load(); } catch { /* noop */ }
      video.remove();
    };
  }, [source?.kind, source?.url, enabled]);

  const askPreview = useCallback((atSeconds: number | null) => {
    if (settleTimer.current != null) { window.clearTimeout(settleTimer.current); settleTimer.current = null; }
    if (atSeconds == null) return;
    settleTimer.current = window.setTimeout(() => { settleTimer.current = null; paint.current(atSeconds); }, PREVIEW_SETTLE_MS);
  }, []);

  const dropPreview = useCallback(() => {
    if (settleTimer.current != null) { window.clearTimeout(settleTimer.current); settleTimer.current = null; }
    setFrame(null);
  }, []);

  return { frame, askPreview, dropPreview };
}

/* ══════════════════════ rail pointer hook ══════════════════════ */

function useRailPointer(onPercent: (pct: number) => void) {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const percentFrom = useCallback((clientX: number) => {
    const zone = zoneRef.current;
    if (!zone) return 0;
    const rect = zone.getBoundingClientRect();
    return Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 0), 100);
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    onPercent(percentFrom(event.clientX));
  }, [onPercent, percentFrom]);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    onPercent(percentFrom(event.clientX));
  }, [dragging, onPercent, percentFrom]);

  const endDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  }, []);

  return { zoneRef, dragging, railHandlers: { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag } };
}

/* ══════════════════════ UI sub-components ══════════════════════ */

function SeekBar({ percent, spans, onSeek, paused, duration, frame, onHoverTime, showPreview }: {
  percent: number; spans: Span[]; onSeek: (pct: number) => void;
  paused: boolean; duration: number; frame: string | null;
  onHoverTime: (t: number | null) => void; showPreview: boolean;
}) {
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const { zoneRef, dragging, railHandlers } = useRailPointer(onSeek);
  const hoverSeconds = hoverPct != null ? (hoverPct / 100) * duration : 0;

  const trackHover = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const rawX = event.clientX - rect.left;
    const pct = Math.min(Math.max((rawX / rect.width) * 100, 0), 100);
    const halfPreview = Math.min(PREVIEW_W / 2, rect.width / 2);
    const clampedX = Math.min(Math.max(rawX, halfPreview), rect.width - halfPreview);
    setHoverPct(pct);
    setHoverX(clampedX);
    if (duration > 0) onHoverTime((pct / 100) * duration);
  };

  const leave = () => { setHoverPct(null); setHoverX(null); onHoverTime(null); };

  const handlers = {
    ...railHandlers,
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => { trackHover(event); railHandlers.onPointerMove(event); },
  };

  return (
    <div
      ref={zoneRef}
      className={cn('fp-rail-zone', dragging && 'is-dragging', paused && 'is-paused')}
      onPointerEnter={trackHover}
      onPointerLeave={leave}
      {...handlers}
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      tabIndex={-1}
    >
      <div className="fp-rail">
        {spans.map((span, i) => (
          <div key={`buf-${i}-${span.start.toFixed(1)}`} className="fp-rail-buf"
            style={{ left: `${span.start}%`, width: `${span.end - span.start}%` }} />
        ))}
        <div className="fp-rail-fill" style={{ width: `${percent}%` }} />
        <div className="fp-rail-thumb" style={{ left: `${percent}%` }} />
        {hoverPct != null && <div className="fp-rail-ghost" style={{ left: `${hoverPct}%` }} />}
      </div>

      {hoverPct != null && showPreview && hoverX != null && (
        <div className="fp-preview" style={{ left: `${hoverX}px` }}>
          <div className={cn('fp-preview__frame', !frame && 'fp-preview__frame--empty')}>
            {frame ? <img src={frame} alt="" draggable={false} /> : null}
          </div>
          <div className="fp-preview__time">{clock(hoverSeconds)}</div>
        </div>
      )}
    </div>
  );
}

function VolumeRail({
  percent,
  onPercent,
  onPreviewPercent,
}: {
  percent: number;
  onPercent: (pct: number) => void;
  onPreviewPercent?: (pct: number | null) => void;
}) {
  const { zoneRef, dragging, railHandlers } = useRailPointer(onPercent);

  const trackHover = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const next = rect.width
      ? Math.min(Math.max(((event.clientX - rect.left) / rect.width) * 100, 0), 100)
      : 0;
    onPreviewPercent?.(next);
  };

  const handlers = {
    ...railHandlers,
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      trackHover(event);
      railHandlers.onPointerMove(event);
    },
  };

  return (
    <div className="fp-vol-rail-zone">
      <div
        ref={zoneRef}
        className={cn('fp-rail-zone', dragging && 'is-dragging')}
        onPointerEnter={trackHover}
        onPointerLeave={() => onPreviewPercent?.(null)}
        {...handlers}
        role="slider"
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        tabIndex={-1}
      >
        <div className="fp-rail">
          <div className="fp-rail-fill" style={{ width: `${percent}%` }} />
          <div className="fp-rail-thumb" style={{ left: `${percent}%` }} />
          <div
            className="fp-vol-tooltip"
            style={{ left: `${percent}%` }}
            aria-hidden="true"
          >
            {Math.round(percent)}%
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ onClick, label, active, expanded, className, menuTrigger, children }: {
  onClick: () => void; label: string; active?: boolean;
  expanded?: boolean; className?: string; menuTrigger?: boolean; children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      aria-expanded={expanded}
      className={cn('fp-btn-icon', active && 'is-active', className)}
      data-fp-menu-trigger={menuTrigger ? 'true' : undefined}
    >
      {children}
    </button>
  );
}

function PlayButton({ rolling, onClick }: { rolling: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rolling ? 'Pause' : 'Play'}
      className="fp-btn-icon fp-btn-play"
    >
      <AnimatePresence mode="wait">
        <span
          key={rolling ? 'pause' : 'play'}
          style={{ display: 'inline-flex' }}
        >
          {rolling
            ? <Pause {...ICON} strokeWidth={STROKE} fill="currentColor" />
            : <Play {...ICON} strokeWidth={STROKE} fill="currentColor" style={{ marginLeft: 2 }} />}
        </span>
      </AnimatePresence>
    </button>
  );
}

function SkipButton({ way, onClick, step }: { way: 'back' | 'ahead'; onClick: () => void; step: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={way === 'back' ? `Rewind ${step}s` : `Forward ${step}s`}
      className="fp-btn-icon fp-btn-skip"
    >
      {way === 'back'
        ? <RotateCcw {...ICON} strokeWidth={STROKE} />
        : <RotateCw {...ICON} strokeWidth={STROKE} />}
      <span className="fp-skip-num" aria-hidden>{step}</span>
    </button>
  );
}

function ActionPrompt({ title, meta, onClick, ariaLabel }: {
  title: string; meta?: string; onClick: () => void; ariaLabel: string;
}) {
  return (
    <button
      type="button"
      className="fp-action-prompt"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span className="fp-action-prompt__title">{title}</span>
      {meta ? <span className="fp-action-prompt__meta">{meta}</span> : null}
    </button>
  );
}

/* ══════════════════════ Color Field ══════════════════════ */

function ColorField({ title, value, onChange }: { title: string; value: string; onChange: (next: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  return (
    <div className="fp-range-group">
      <div className="fp-range-head">
        <span className="fp-range-label">{title}</span>
        <span className="fp-range-value">{value.toUpperCase()}</span>
      </div>
      <div className="fp-swatches" role="list" aria-label={`${title} colors`}>
        {SWATCHES.map(color => (
          <button
            key={color} type="button"
            className={cn('fp-swatch', value.toLowerCase() === color && 'is-on')}
            style={{ backgroundColor: color }}
            aria-label={`${title} ${color}`}
            aria-pressed={value.toLowerCase() === color}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
      <label className="fp-hex-row">
        <span className="fp-hex-label">Hex</span>
        <input
          value={draft}
          spellCheck={false}
          maxLength={7}
          onChange={event => {
            const raw = event.target.value;
            const next = raw.startsWith('#') ? raw : `#${raw}`;
            setDraft(next);
            if (/^#[0-9a-f]{6}$/i.test(next)) onChange(next);
          }}
          onBlur={() => setDraft(value)}
          aria-label={`${title} hex`}
        />
      </label>
    </div>
  );
}

/* ══════════════════════ Toggle Switch ══════════════════════ */

function ToggleSwitch({ on, onToggle, label, description }: {
  on: boolean; onToggle: () => void; label: string; description?: string;
}) {
  const id = `fp-toggle-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  return (
    <div className="fp-toggle">
      <div className="fp-toggle__info">
        <Label htmlFor={id} className="fp-toggle__label">{label}</Label>
        {description && <span className="fp-toggle__desc">{description}</span>}
      </div>
      <Switch id={id} checked={on} onCheckedChange={onToggle} aria-label={label} />
    </div>
  );
}

function RangeSetting({ label, value, min, max, step, display, onChange }: { label: string; value: number; min: number; max: number; step: number; display: string; onChange: (value: number) => void }) {
  return (
    <div className="fp-range-group fp-appearance-range">
      <div className="fp-range-head"><span className="fp-range-label">{label}</span><span className="fp-range-value">{display}</span></div>
      <input className="fp-range" type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}

/* ══════════════════════ Preferences Dialog ══════════════════════ */

type PrefSection = 'shortcuts' | 'keybinds' | 'appearance' | 'playback' | 'subtitles';

function PreferencesDialog({
  onClose,
  keybinds,
  onUpdateKeybind,
  onResetKeybinds,
  prefs,
  onUpdatePref,
  onResetPrefs,
  captionStyle,
  onPatchCaptionStyle,
  onResetCaptionStyle,
  onOpenPlacer,
}: {
  onClose: () => void;
  keybinds: KeybindConfig[];
  onUpdateKeybind: (action: KeybindAction, keys: string[]) => void;
  onResetKeybinds: () => void;
  prefs: PlayerPrefs;
  onUpdatePref: <K extends keyof PlayerPrefs>(key: K, value: PlayerPrefs[K]) => void;
  onResetPrefs: () => void;
  captionStyle: CaptionStyle;
  onPatchCaptionStyle: (patch: Partial<CaptionStyle>) => void;
  onResetCaptionStyle: () => void;
  onOpenPlacer: () => void;
}) {
  const [section, setSection] = useState<PrefSection>('shortcuts');
  const [editingAction, setEditingAction] = useState<KeybindAction | null>(null);

  useEffect(() => {
    if (!editingAction) return;

    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'Escape') {
        setEditingAction(null);
        return;
      }

      // Modifier-only presses are not useful playback shortcuts and were a
      // common source of empty/invalid bindings in the old capture flow.
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;

      const captured = normalizeKey(event.key) || normalizeKey(event.code);
      if (!captured) return;

      onUpdateKeybind(editingAction, [captured]);
      setEditingAction(null);
    };

    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [editingAction, onUpdateKeybind]);

  const NAV_ITEMS: { id: PrefSection; label: string; icon: ReactNode }[] = [
    { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard width={14} height={14} /> },
    { id: 'keybinds', label: 'Keybinds', icon: <Pencil width={14} height={14} /> },
    { id: 'playback', label: 'Playback', icon: <Zap width={14} height={14} /> },
    { id: 'appearance', label: 'Appearance', icon: <Monitor width={14} height={14} /> },
    { id: 'subtitles', label: 'Subtitles', icon: <Captions width={14} height={14} /> },
  ];

  const SECTION_TITLES: Record<PrefSection, { title: string; sub: string }> = {
    shortcuts: { title: 'Keyboard Shortcuts', sub: 'Quick reference for all hotkeys' },
    keybinds: { title: 'Customize Keybinds', sub: 'Click edit to remap any action' },
    playback: { title: 'Playback Behavior', sub: 'Control how the player behaves' },
    appearance: { title: 'Player Appearance', sub: 'Visual settings and accent color' },
    subtitles: { title: 'Subtitle Style', sub: 'Customize caption appearance' },
  };

  return (
    <motion.div
      className="fp-overlay-veil"
      role="dialog"
      aria-modal
      aria-label="Player preferences"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <motion.div
        className="fp-prefs-dialog"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
      >
        {/* Sidebar nav */}
        <div className="fp-prefs-nav">
          <div className="fp-prefs-nav-head">
            <span className="fp-prefs-nav-title">Preferences</span>
            <button type="button" className="fp-close-btn" onClick={onClose} aria-label="Close preferences">
              <X strokeWidth={STROKE} />
            </button>
          </div>
          <div className="fp-prefs-nav-body">
            {NAV_ITEMS.map((item, index) => (
              <motion.button
                key={item.id}
                type="button"
                className={cn('fp-prefs-nav-item', section === item.id && 'is-active')}
                onClick={() => setSection(item.id)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 + index * 0.035, duration: 0.22, ease: 'easeOut' }}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.985 }}
              >
                {item.icon}
                {item.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="fp-prefs-content">
          <div className="fp-prefs-content-head">
            <div>
              <h2 className="fp-prefs-content-title">{SECTION_TITLES[section].title}</h2>
              <p className="fp-prefs-content-sub">{SECTION_TITLES[section].sub}</p>
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={section}
              className="fp-prefs-content-body"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
            {section === 'shortcuts' && (
              <div className="fp-shortcuts-grid">
                {keybinds.map(kb => (
                  <div key={kb.action} className="fp-shortcut-row">
                    <span className="fp-shortcut-act">{kb.label}</span>
                    <div className="fp-shortcut-keys">
                      {kb.keys.slice(0, 1).map(k => (
                        <kbd key={k} className="fp-key-chip">{displayKey(k)}</kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {section === 'keybinds' && (
              <>
                {keybinds.map(kb => (
                  <div key={kb.action} className={cn('fp-keybind-row', editingAction === kb.action && 'is-editing')}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span className="fp-keybind-action">{kb.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--fp-white-40, rgba(255,255,255,0.4))' }}>{kb.description}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="fp-keybind-keys">
                        {editingAction === kb.action
                          ? <kbd className="fp-key-chip" style={{ minWidth: 60 }}>Press a key…</kbd>
                          : kb.keys.slice(0, 1).map(k => <kbd key={k} className="fp-key-chip">{displayKey(k)}</kbd>)
                        }
                      </div>
                      <button
                        type="button"
                        className="fp-keybind-edit-btn"
                        onClick={() => setEditingAction(editingAction === kb.action ? null : kb.action)}
                        aria-label={`Edit keybind for ${kb.label}`}
                      >
                        <Pencil width={12} height={12} />
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ paddingTop: 12 }}>
                  <button type="button" className="fp-action-btn" onClick={onResetKeybinds} style={{ width: '100%' }}>
                    Reset all keybinds to defaults
                  </button>
                </div>
              </>
            )}

            {section === 'playback' && (
              <>
                <div className="fp-range-group">
                  <div className="fp-range-head">
                    <span className="fp-range-label">Seek Step</span>
                    <span className="fp-range-value">{prefs.seekStep}s</span>
                  </div>
                  <input
                    className="fp-range"
                    type="range" min="1" max="60" value={prefs.seekStep}
                    onChange={e => onUpdatePref('seekStep', Number(e.target.value))}
                    aria-label="Seek step seconds"
                  />
                  <div className="fp-range-marks"><span>1s</span><span>60s</span></div>
                </div>

                <div className="fp-range-group">
                  <div className="fp-range-head">
                    <span className="fp-range-label">Volume Step</span>
                    <span className="fp-range-value">{Math.round(prefs.volumeStep * 100)}%</span>
                  </div>
                  <input
                    className="fp-range"
                    type="range" min="1" max="20" value={Math.round(prefs.volumeStep * 100)}
                    onChange={e => onUpdatePref('volumeStep', Number(e.target.value) / 100)}
                    aria-label="Volume step"
                  />
                  <div className="fp-range-marks"><span>1%</span><span>20%</span></div>
                </div>

                <div className="fp-range-group">
                  <div className="fp-range-head">
                    <span className="fp-range-label">Controls Hide Delay</span>
                    <span className="fp-range-value">{(prefs.autoHideDelay / 1000).toFixed(1)}s</span>
                  </div>
                  <input
                    className="fp-range"
                    type="range" min="500" max="10000" step="100" value={prefs.autoHideDelay}
                    onChange={e => onUpdatePref('autoHideDelay', Number(e.target.value))}
                    aria-label="Auto hide delay"
                  />
                  <div className="fp-range-marks"><span>0.5s</span><span>10s</span></div>
                </div>

                <ToggleSwitch on={prefs.autoNextEpisode} onToggle={() => onUpdatePref('autoNextEpisode', !prefs.autoNextEpisode)}
                  label="Auto-play next episode" description="Automatically go to next episode at end" />
                <ToggleSwitch on={prefs.doubleClickFullscreen} onToggle={() => onUpdatePref('doubleClickFullscreen', !prefs.doubleClickFullscreen)}
                  label="Double-click for fullscreen" description="Double-click the video to toggle fullscreen" />
                <ToggleSwitch on={prefs.showPreviewThumbnails} onToggle={() => onUpdatePref('showPreviewThumbnails', !prefs.showPreviewThumbnails)}
                  label="Seek preview thumbnails" description="Show video frame previews when hovering the seek bar" />
                <ToggleSwitch on={prefs.showRemainingTime} onToggle={() => onUpdatePref('showRemainingTime', !prefs.showRemainingTime)}
                  label="Countdown timer" description="Show remaining time instead of the full episode or movie duration" />

                <div style={{ paddingTop: 12 }}>
                  <button type="button" className="fp-action-btn" onClick={onResetPrefs} style={{ width: '100%' }}>
                    Reset playback settings to defaults
                  </button>
                </div>
              </>
            )}

            {section === 'appearance' && (
              <>
                <div className="fp-appearance-grid">
                  <div className="fp-appearance-card fp-appearance-card-wide">
                    <div className="fp-appearance-card-head"><span>Theme Colors</span><small>Customize the player chrome, text, accents and borders.</small></div>
                    <div className="fp-appearance-color-grid">
                      {([['accentColor','Accent',prefs.accentColor],['textColor','Text',prefs.textColor],['controlColor','Controls',prefs.controlColor],['borderColor','Borders',prefs.borderColor]] as const).map(([key,label,value]) => (
                        <label key={key} className="fp-appearance-color">
                          <span>{label}</span><span className="fp-color-control"><input type="color" value={value} onChange={e => onUpdatePref(key,e.target.value)} aria-label={`${label} color`} /><code>{value.toUpperCase()}</code></span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="fp-appearance-card">
                    <div className="fp-appearance-card-head"><span>Controls</span><small>Minimal controls are used by default for a clean, distraction-free player.</small></div>
                    <RangeSetting label="UI Scale" value={prefs.uiScale} min={0.8} max={1.2} step={0.05} display={`${Math.round(prefs.uiScale*100)}%`} onChange={v=>onUpdatePref('uiScale',v)} />
                    <RangeSetting label="Control Opacity" value={prefs.controlOpacity} min={0.35} max={1} step={0.05} display={`${Math.round(prefs.controlOpacity*100)}%`} onChange={v=>onUpdatePref('controlOpacity',v)} />
                    <RangeSetting label="Control Blur" value={prefs.controlBlur} min={0} max={32} step={1} display={`${prefs.controlBlur}px`} onChange={v=>onUpdatePref('controlBlur',v)} />
                  </div>
                  <div className="fp-appearance-card">
                    <div className="fp-appearance-card-head"><span>Controls</span><small>Fine tune the physical feel of the chrome.</small></div>
                    <RangeSetting label="Corner Radius" value={prefs.controlRadius} min={0} max={20} step={1} display={`${prefs.controlRadius}px`} onChange={v=>onUpdatePref('controlRadius',v)} />
                    <RangeSetting label="Icon Size" value={prefs.iconSize} min={16} max={32} step={1} display={`${prefs.iconSize}px`} onChange={v=>onUpdatePref('iconSize',v)} />
                    <RangeSetting label="Seek Thickness" value={prefs.seekThickness} min={1} max={6} step={1} display={`${prefs.seekThickness}px`} onChange={v=>onUpdatePref('seekThickness',v)} />
                    <RangeSetting label="Seek Thumb" value={prefs.seekThumbSize} min={4} max={14} step={1} display={`${prefs.seekThumbSize}px`} onChange={v=>onUpdatePref('seekThumbSize',v)} />
                  </div>
                  <div className="fp-appearance-card">
                    <div className="fp-appearance-card-head"><span>Pause Treatment</span><small>Control the cinematic paused state.</small></div>
                    <RangeSetting label="Video Dim" value={prefs.pauseDim} min={0.25} max={0.85} step={0.05} display={`${Math.round(prefs.pauseDim*100)}%`} onChange={v=>onUpdatePref('pauseDim',v)} />
                    <RangeSetting label="Video Blur" value={prefs.pauseBlur} min={0} max={12} step={1} display={`${prefs.pauseBlur}px`} onChange={v=>onUpdatePref('pauseBlur',v)} />
                  </div>
                  <div className="fp-appearance-card fp-appearance-card-preview">
                    <div className="fp-appearance-card-head"><span>Live Preview</span><small>Updates instantly as you customize the player.</small></div>
                    <div className="fp-appearance-preview" style={{'--preview-accent':prefs.accentColor,'--preview-control':prefs.controlColor,'--preview-text':prefs.textColor} as CSSProperties}>
                      <div className="fp-appearance-preview-video"/><div className="fp-appearance-preview-chrome"><div className="fp-appearance-preview-rail"><i/></div><div className="fp-appearance-preview-controls"><b/><b/><span>FingerPlayer</span><b/><b/></div></div>
                    </div>
                  </div>
                  <button type="button" className="fp-action-btn fp-appearance-reset" onClick={onResetPrefs}>Reset player appearance to defaults</button>
                </div>
              </>
            )}

            {section === 'subtitles' && (
              <>
                <div className="fp-range-group">
                  <div className="fp-range-head">
                    <span className="fp-range-label">Text Size</span>
                    <span className="fp-range-value">{Math.round((captionStyle.textSize / 42) * 100)}%</span>
                  </div>
                  <input
                    className="fp-range"
                    type="range" min="14" max="42" value={captionStyle.textSize}
                    onChange={e => onPatchCaptionStyle({ textSize: Number(e.target.value) })}
                    aria-label="Subtitle text size"
                  />
                  <div className="fp-range-marks"><span>Small</span><span>Large</span></div>
                </div>

                <div className="fp-range-group">
                  <div className="fp-range-head">
                    <span className="fp-range-label">Font</span>
                  </div>
                  <div className="fp-seg">
                    {CAPTION_FONTS.map(font => (
                      <button
                        key={font.id} type="button"
                        className={cn('fp-seg-btn', captionStyle.fontFamily === font.id && 'is-on')}
                        onClick={() => onPatchCaptionStyle({ fontFamily: font.id })}
                      >
                        <span className="fp-seg-sample" style={{ fontFamily: font.family }}>Aa</span>
                        <span className="fp-seg-label">{font.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <ColorField title="Text Color" value={captionStyle.textColor} onChange={next => onPatchCaptionStyle({ textColor: next })} />

                <div className="fp-range-group">
                  <div className="fp-range-head">
                    <span className="fp-range-label">Text Opacity</span>
                    <span className="fp-range-value">{Math.round(captionStyle.textOpacity * 100)}%</span>
                  </div>
                  <input
                    className="fp-range"
                    type="range" min="20" max="100" value={Math.round(captionStyle.textOpacity * 100)}
                    onChange={e => onPatchCaptionStyle({ textOpacity: Number(e.target.value) / 100 })}
                  />
                </div>

                <ColorField title="Background Color" value={captionStyle.backgroundColor} onChange={next => onPatchCaptionStyle({ backgroundColor: next })} />

                <div className="fp-range-group">
                  <div className="fp-range-head">
                    <span className="fp-range-label">Background Opacity</span>
                    <span className="fp-range-value">{Math.round(captionStyle.backgroundOpacity * 100)}%</span>
                  </div>
                  <input
                    className="fp-range"
                    type="range" min="0" max="100" value={Math.round(captionStyle.backgroundOpacity * 100)}
                    onChange={e => onPatchCaptionStyle({ backgroundOpacity: Number(e.target.value) / 100 })}
                  />
                </div>

                <div className="fp-action-row" style={{ marginTop: 8 }}>
                  <button type="button" className="fp-action-btn fp-action-btn--primary" onClick={onOpenPlacer}>Position</button>
                </div>

                <div style={{ padding: '12px 0' }}>
                  <p className="fp-range-label" style={{ marginBottom: 6 }}>Preview</p>
                  <div className="fp-subs" style={{ position: 'relative', left: 'auto', top: 'auto', transform: 'none', maxWidth: '100%', paddingTop: 8 }}>
                    <span className="fp-subs__line" style={captionLineStyle(captionStyle)}>This is how your subtitles look</span>
                  </div>
                </div>

                <div style={{ paddingTop: 8 }}>
                  <button type="button" className="fp-action-btn" onClick={onResetCaptionStyle} style={{ width: '100%' }}>
                    Reset subtitle style
                  </button>
                </div>
              </>
            )}
            </motion.div>
          </AnimatePresence>

          <div className="fp-prefs-footer">
            Press <kbd className="fp-key-chip">Esc</kbd> to close ·{' '}
            <kbd className="fp-key-chip">K</kbd> to reopen
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════ provider helpers ══════════════════════ */

type ProviderPick = FingerProviderId | typeof AUTO_ID;

const AUTO_PROVIDER_ENTRY = { id: AUTO_ID, label: 'Auto', meta: 'Test servers automatically' } as const;

const RADIO_NAMES = [
  'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel',
  'India', 'Juliett', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa',
  'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'X-ray',
  'Yankee', 'Zulu',
] as const;

function isYthdProvider(provider: { id: string; label?: string }): boolean {
  const id = String(provider.id).toLowerCase();
  const label = String(provider.label ?? '').toLowerCase();
  return id.includes('ythd') || label.includes('ythd');
}

function getAvailableFingerProviders() {
  return getFingerStreamProviders().filter(provider => !isYthdProvider(provider));
}

function radioNameForProvider(id: string): string {
  const providers = getAvailableFingerProviders();
  const index = providers.findIndex(provider => provider.id === id);
  return index >= 0 ? RADIO_NAMES[index % RADIO_NAMES.length] : 'Alpha';
}

function providerMetaForName(name: string): string {
  switch (name) {
    case 'Alpha':
    case 'Bravo':
      return 'Up to 4K / 2160p';
    case 'Charlie':
      return '1080p · Slightly unstable';
    default:
      return 'Stream server';
  }
}

function displayProvider(provider: { id: FingerProviderId; label?: string; meta?: string }) {
  return {
    ...provider,
    label: radioNameForProvider(provider.id),
    meta: providerMetaForName(radioNameForProvider(provider.id)),
  };
}

function getSafeDefaultFingerProvider(configured = getDefaultFingerProvider()): FingerProviderId {
  const providers = getAvailableFingerProviders();
  if (providers.some(provider => provider.id === configured)) return configured;
  return providers[0]?.id ?? configured;
}

function providerName(id: FingerProviderId): string {
  return radioNameForProvider(id);
}

/* ══════════════════════ player ══════════════════════ */

type SessionState = 'loading' | 'ready' | 'error';
type SettingsSection = 'quality' | 'server' | 'speed';
type ShakaPlayer = InstanceType<typeof shaka.Player>;
type ShakaVariantTrack = NonNullable<ReturnType<NonNullable<ShakaPlayer['getVariantTracks']>>>[number];
type VariantTrack = { id: number; height?: number; width?: number; bandwidth?: number; active?: boolean };

function toVariantTrack(raw: ShakaVariantTrack): VariantTrack {
  return { id: raw.id, height: raw.height ?? undefined, width: raw.width ?? undefined, bandwidth: raw.bandwidth ?? undefined, active: raw.active };
}

export default function FingerPlayer({
  mediaId, type, title, releaseYear, releaseDate, rating, tmdb,
  season = 1, episode = 1, initialTime,
  logoUrl, description, episodeTitle, runtimeMinutes, imdbId,
  initialProvider, onProviderChange,
  onProgress, canGoNextEpisode = false, onNextEpisode,
  lockProviderServer = false, extractUrl,
  forceSubtitleLang, showSubtitlesButton = true, onBack,
}: FingerPlayerProps) {
  /* ── refs ───────────────────────────────────────── */
  const shellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const engineRef = useRef<ShakaPlayer | null>(null);
  const playbackStartTokenSlot = useRef(0);
  const settingsPanelRef = useRef<HTMLDivElement>(null);

  const menuSlot = useRef<M3u8QualityOption[]>([]);
  const menuFromProviderSlot = useRef(false);
  const pickedQualitySlot = useRef('auto');
  const pinnedVariantSlot = useRef<number | null>(null);
  const tierCeilingSlot = useRef<number | null>(null);
  const tierFloorSlot = useRef<number | null>(null);
  const tierStableAtSlot = useRef<number | null>(null);
  const liveSourceSlot = useRef<LiveSource | null>(null);
  const switchTokenSlot = useRef(0);
  const forcedCaptionApplied = useRef(false);
  const spanSlot = useRef<Span[]>([]);
  const lastReportAt = useRef(0);
  const onProgressSlot = useRef(onProgress);
  const resumeApplied = useRef(false);
  const initialTimeSlot = useRef(initialTime);
  const hideTimerSlot = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveProviderSlot = useRef<FingerProviderId>(getSafeDefaultFingerProvider(initialProvider));
  const providerPickSlot = useRef<ProviderPick>(getSafeDefaultFingerProvider(initialProvider));
  const autoResolvedSlot = useRef(false);
  const rateSlot = useRef(1);
  const logIdSlot = useRef(0);

  useEffect(() => { onProgressSlot.current = onProgress; }, [onProgress]);
  useEffect(() => { initialTimeSlot.current = initialTime; }, [initialTime]);

  /* ── prefs & keybinds ──────────────────────────── */
  const [prefs, setPrefs] = useState<PlayerPrefs>(() => readPrefs());
  const [keybinds, setKeybinds] = useState<KeybindConfig[]>(() => readKeybinds());

  const updatePref = useCallback(<K extends keyof PlayerPrefs>(key: K, value: PlayerPrefs[K]) => {
    setPrefs(prev => { const next = { ...prev, [key]: value }; writePrefs(next); return next; });
  }, []);

  const resetPrefs = useCallback(() => { setPrefs(DEFAULT_PREFS); writePrefs(DEFAULT_PREFS); }, []);

  const updateKeybind = useCallback((action: KeybindAction, keys: string[]) => {
    const captured = normalizeKey(keys[0]);
    if (!captured) return;

    setKeybinds(prev => {
      const current = prev.find(kb => kb.action === action);
      if (!current) return prev;

      const previousKey = normalizeKey(current.keys[0]) || normalizeKey(current.defaultKeys[0]);
      const owner = prev.find(kb => kb.action !== action && kb.keys.some(key => normalizeKey(key) === captured));

      // If the key is already assigned, swap the two bindings rather than
      // leaving the previous action blank or accidentally restoring a
      // conflicting default key.
      const next = prev.map(kb => {
        if (kb.action === action) return { ...kb, keys: [captured] };
        if (owner && kb.action === owner.action && previousKey && previousKey !== captured) {
          return { ...kb, keys: [previousKey] };
        }
        return { ...kb, keys: [normalizeKey(kb.keys[0]) || normalizeKey(kb.defaultKeys[0]) || 'Space'] };
      });

      writeKeybinds(next);
      return next;
    });
  }, []);

  const resetKeybinds = useCallback(() => { setKeybinds(DEFAULT_KEYBINDS); writeKeybinds(DEFAULT_KEYBINDS); }, []);

  /* ── session state ─────────────────────────────── */
  const [session, setSession] = useState<SessionState>('loading');
  const [failure, setFailure] = useState<string | null>(null);
  const [embedSrc, setEmbedSrc] = useState<string | null>(null);
  const [liveSource, setLiveSource] = useState<LiveSource | null>(null);
  const [activeProvider, setActiveProvider] = useState<FingerProviderId>(() => getSafeDefaultFingerProvider(initialProvider));
  const [providerPick, setProviderPick] = useState<ProviderPick>(() => getSafeDefaultFingerProvider(initialProvider));
  const [sourceName, setSourceName] = useState<string>(() => providerName(getSafeDefaultFingerProvider(initialProvider)));
  const [busyStep, setBusyStep] = useState<string | null>(null);
  const [bootLog, setBootLog] = useState<Array<{ id: number; text: string; live: boolean }>>([]);
  const [sessionNonce, setSessionNonce] = useState(0);

  const localRuntime = hasLocalFingerRuntime();
  const providerSwitchAllowed = !extractUrl && (!lockProviderServer || localRuntime);
  const manualProviders = useMemo(() => {
    const providers = getAvailableFingerProviders();
    return providerSwitchAllowed ? [...providers] : providers.filter(p => p.id === getSafeDefaultFingerProvider());
  }, [providerSwitchAllowed, localRuntime]);

  const providerEntries = useMemo(
    () => {
      const entries = localRuntime && providerSwitchAllowed ? [AUTO_PROVIDER_ENTRY, ...manualProviders] : manualProviders;
      return entries.map(provider => provider.id === AUTO_ID ? provider : displayProvider(provider));
    },
    [manualProviders, providerSwitchAllowed, localRuntime]
  );

  const [qualityMenu, setQualityMenu] = useState<M3u8QualityOption[]>([]);
  const [pickedQuality, setPickedQuality] = useState('auto');
  const [qualityBadge, setQualityBadge] = useState('Auto');
  const [introSpans, setIntroSpans] = useState<IntroSpan[]>([]);

  /* ── captions ──────────────────────────────────── */
  const [captionTracks, setCaptionTracks] = useState<CaptionTrack[]>([]);
  const [captionPick, setCaptionPick] = useState<string>(CAPTIONS_OFF);
  const [cues, setCues] = useState<Cue[]>([]);
  const [captionBusyId, setCaptionBusyId] = useState<string | null>(null);
  const [captionFailure, setCaptionFailure] = useState<string | null>(null);
  const [captionQuery, setCaptionQuery] = useState('');
  const [captionsOpen, setCaptionsOpen] = useState(false);
  const [captionsTab, setCaptionsTab] = useState<'tracks' | 'style'>('tracks');
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(() => readCaptionStyle());
  const [placing, setPlacing] = useState(false);
  const [placeDraft, setPlaceDraft] = useState(() => ({ x: DEFAULT_STYLE.positionX, y: DEFAULT_STYLE.positionY }));
  const [placeGuides, setPlaceGuides] = useState<{ x: number | null; y: number | null; limitY: number | null }>({ x: null, y: null, limitY: null });

  const styleOverlay = useMemo(() => captionOverlayStyle(captionStyle), [captionStyle]);
  const styleLine = useMemo(() => captionLineStyle(captionStyle), [captionStyle]);
  const draftOverlay = useMemo(() => captionOverlayStyle({ ...captionStyle, positionX: placeDraft.x, positionY: placeDraft.y }), [captionStyle, placeDraft]);
  const draftLine = useMemo(() => captionLineStyle({ ...captionStyle, positionX: placeDraft.x, positionY: placeDraft.y }), [captionStyle, placeDraft]);

  /* ── transport state ───────────────────────────── */
  const [rolling, setRolling] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [switchingQuality, setSwitchingQuality] = useState(false);
  const firstVolume = useMemo(() => readStoredVolume(), []);
  const [volume, setVolume] = useState(firstVolume.volume);
  const [hushed, setHushed] = useState(firstVolume.muted);
  const [volumeHud, setVolumeHud] = useState<{ percent: number; delta: number } | null>(null);
  const volumeHudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rate, setRate] = useState(1);
  const [playedPct, setPlayedPct] = useState(0);
  const [bufferSpans, setBufferSpans] = useState<Span[]>([]);
  const [now, setNow] = useState(0);
  const [total, setTotal] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('quality');
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [startedOnce, setStartedOnce] = useState(false);

  useEffect(() => { rateSlot.current = rate; }, [rate]);
  useEffect(() => { pickedQualitySlot.current = pickedQuality; }, [pickedQuality]);

  useEffect(() => {
    liveProviderSlot.current = activeProvider;
    const fallback = getSafeDefaultFingerProvider();
    if (providerSwitchAllowed || !lockProviderServer || activeProvider === fallback) return;
    setActiveProvider(fallback);
    setProviderPick(fallback);
    providerPickSlot.current = fallback;
    setSourceName(providerName(fallback));
  }, [activeProvider, providerSwitchAllowed, lockProviderServer, localRuntime]);

  useEffect(() => { providerPickSlot.current = providerPick; }, [providerPick]);

  // Apply accent color from prefs
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    shell.style.setProperty('--fp-accent', prefs.accentColor);
    shell.style.setProperty('--fp-text', prefs.textColor);
    shell.style.setProperty('--fp-control-color', prefs.controlColor);
    shell.style.setProperty('--fp-border-color', prefs.borderColor);
    shell.style.setProperty('--fp-control-opacity', String(prefs.controlOpacity));
    shell.style.setProperty('--fp-control-blur', `${prefs.controlBlur}px`);
    shell.style.setProperty('--fp-ui-scale', String(prefs.uiScale));
    shell.style.setProperty('--fp-control-radius', `${prefs.controlRadius}px`);
    shell.style.setProperty('--fp-icon-size', `${prefs.iconSize}px`);
    shell.style.setProperty('--fp-seek-thickness', `${prefs.seekThickness}px`);
    shell.style.setProperty('--fp-seek-thumb-size', `${prefs.seekThumbSize}px`);
    shell.style.setProperty('--fp-pause-dim', String(prefs.pauseDim));
    shell.style.setProperty('--fp-pause-blur', `${prefs.pauseBlur}px`);
  }, [prefs]);

  const preview = useHoverPreview(session === 'ready' ? liveSource : null, prefs.showPreviewThumbnails);

  /* ── boot log ──────────────────────────────────── */
  const log = useCallback((text: string) => {
    logIdSlot.current += 1;
    const id = logIdSlot.current;
    setBootLog(prev => {
      const settled = prev.map(row => (row.live ? { ...row, live: false } : row));
      return [...settled, { id, text, live: true }].slice(-3);
    });
  }, []);

  const step = useCallback((label: string | null) => { setBusyStep(label); if (label) log(label); }, [log]);

  /* ── engine ────────────────────────────────────── */
  const killEngine = useCallback(() => {
    playbackStartTokenSlot.current += 1;
    const engine = engineRef.current;
    engineRef.current = null;
    if (engine) void engine.destroy();
  }, []);

  const installMenu = useCallback((options: M3u8QualityOption[]) => {
    menuSlot.current = options;
    setQualityMenu(options);
  }, []);

  const tiersFromEngine = useCallback((tracks: VariantTrack[]): M3u8QualityOption[] => {
    const byTier = new Map<number, M3u8QualityOption>();
    tracks.forEach(track => {
      const tier = resolveQualityTier({ height: track.height, width: track.width, bandwidth: track.bandwidth }) ?? track.height;
      if (!tier) return;
      const prev = byTier.get(tier);
      if (!prev || (track.bandwidth ?? 0) > (prev.bandwidth ?? 0)) {
        byTier.set(tier, { id: `track-${track.id}`, label: tierBadge(tier), hlsLevel: track.id, height: track.height, width: track.width, bandwidth: track.bandwidth, tier });
      }
    });
    const ranked = Array.from(byTier.values()).sort((a, b) => (b.tier ?? 0) - (a.tier ?? 0));
    return [{ id: AUTO_ID, label: 'Auto', hlsLevel: -1 }, ...ranked];
  }, []);

  const wireNetworking = useCallback((engine: ShakaPlayer) => {
    const networking = engine.getNetworkingEngine?.();
    networking?.registerRequestFilter?.((_kind: unknown, request: { uris?: string[] }) => {
      if (Array.isArray(request.uris)) request.uris = request.uris.map(uri => wrapStreamUrl(uri));
    });
  }, []);

  const tuneEngine = useCallback((engine: ShakaPlayer) => {
    engine.configure({
      abr: { enabled: true, defaultBandwidthEstimate: 8_000_000, switchInterval: 10, bandwidthDowngradeTarget: 0.95, bandwidthUpgradeTarget: 0.75 },
      restrictions: { maxHeight: HEIGHT_UNCAPPED },
      streaming: {
        bufferingGoal: BUFFER_AHEAD, rebufferingGoal: 2, bufferBehind: BUFFER_BEHIND,
        retryParameters: { maxAttempts: 5, baseDelay: 300, backoffFactor: 1.6, fuzzFactor: 0.4, timeout: 12_000 },
      },
      manifest: { retryParameters: { maxAttempts: 4, baseDelay: 350, backoffFactor: 1.7, fuzzFactor: 0.4, timeout: 12_000 } },
    });
  }, []);

  const pinQuality = useCallback(async (engine: ShakaPlayer, option?: M3u8QualityOption) => {
    if (!option || option.id === AUTO_ID || option.hlsLevel === -1) {
      pinnedVariantSlot.current = null;
      tierCeilingSlot.current = null;
      tierFloorSlot.current = null;
      tierStableAtSlot.current = null;
      engine.configure({ abr: { enabled: true }, restrictions: { minHeight: 0, maxHeight: HEIGHT_UNCAPPED } });
      return;
    }
    const ceiling = tierRank(option);
    if (!ceiling) return;
    const rawTracks = (engine.getVariantTracks?.() ?? []) as ShakaVariantTrack[];
    const matchTrack = (pred: (d: VariantTrack) => boolean): ShakaVariantTrack | undefined => rawTracks.find(raw => pred(toVariantTrack(raw)));
    const exact = typeof option.hlsLevel === 'number' && option.hlsLevel >= 0
      ? matchTrack(t => t.id === option.hlsLevel)
      : matchTrack(t => {
          const tier = resolveQualityTier({ height: t.height, width: t.width, bandwidth: t.bandwidth }) ?? t.height;
          return tier === ceiling;
        });
    if (exact) {
      const exactData = toVariantTrack(exact);
      pinnedVariantSlot.current = exactData.id;
      tierCeilingSlot.current = ceiling;
      tierFloorSlot.current = exactData.height ?? ceiling;
      tierStableAtSlot.current = Date.now();
      try { engine.configure({ abr: { enabled: false }, restrictions: { minHeight: 0, maxHeight: HEIGHT_UNCAPPED } }); await engine.selectVariantTrack(exact, false); return; } catch { /* fall through */ }
    }
    const floor = tierJustBelow(menuSlot.current, ceiling);
    pinnedVariantSlot.current = option.hlsLevel ?? null;
    tierCeilingSlot.current = ceiling;
    tierFloorSlot.current = floor;
    tierStableAtSlot.current = Date.now();
    engine.configure({ abr: { enabled: true }, restrictions: { minHeight: floor, maxHeight: ceiling } });
  }, []);

  const loosenFloor = useCallback(() => {
    const engine = engineRef.current;
    const ceiling = tierCeilingSlot.current;
    const floor = tierFloorSlot.current;
    if (!engine || !ceiling || !floor) return;
    const lower = nextTierDown(menuSlot.current, floor);
    if (!lower) return;
    tierFloorSlot.current = lower;
    tierStableAtSlot.current = null;
    engine.configure({ abr: { enabled: true }, restrictions: { minHeight: lower, maxHeight: ceiling } });
  }, []);

  const raiseFloor = useCallback(() => {
    const engine = engineRef.current;
    const ceiling = tierCeilingSlot.current;
    const floor = tierFloorSlot.current;
    if (!engine || !ceiling || !floor || floor >= ceiling) return;
    const wanted = tierJustBelow(menuSlot.current, ceiling);
    if (floor >= wanted) return;
    const higher = nextTierUp(menuSlot.current, floor, wanted);
    if (!higher) return;
    tierFloorSlot.current = higher;
    tierStableAtSlot.current = Date.now();
    engine.configure({ abr: { enabled: true }, restrictions: { minHeight: higher, maxHeight: ceiling } });
  }, []);

  /* ── captions ──────────────────────────────────── */
  const refreshSpans = useCallback(() => {
    const video = videoRef.current;
    const next = video ? spansFromVideo(video) : [];
    setBufferSpans(prev => {
      const merged = mergeSpans(prev, next);
      spanSlot.current = merged;
      return spansEqual(prev, merged) ? prev : merged;
    });
  }, []);

  const fetchCaptions = useCallback(async () => {
    setCaptionTracks([]); setIntroSpans([]); setCaptionPick(CAPTIONS_OFF);
    setCues([]); setCaptionFailure(null); setCaptionBusyId(null); setCaptionQuery('');
    try {
      const tracks = await loadCaptionCatalog({ type, season, episode, imdbId, tmdbId: mediaId });
      setCaptionTracks(tracks);
    } catch { setCaptionTracks([]); }
  }, [episode, imdbId, mediaId, season, type]);

  const fetchIntros = useCallback(async () => {
    setIntroSpans([]);
    try { const spans = await loadIntroSpans({ mediaId, type, season, episode, imdbId }); setIntroSpans(spans); }
    catch { setIntroSpans([]); }
  }, [episode, imdbId, mediaId, season, type]);

  const chooseCaption = useCallback(async (track: CaptionTrack | null) => {
    setBuffering(false);
    if (!track) { setCaptionPick(CAPTIONS_OFF); setCues([]); setCaptionFailure(null); setCaptionBusyId(null); setCaptionsOpen(false); return; }
    setCaptionPick(track.id); setCues([]); setCaptionFailure(null); setCaptionBusyId(track.id);
    try {
      const text = await fetchCueText(track);
      const parsed = parseCues(text);
      if (parsed.length === 0) throw new Error('Subtitle file contained no readable cues');
      setCues(parsed);
      setCaptionsOpen(false);
    } catch (err) {
      setCaptionPick(CAPTIONS_OFF); setCues([]);
      setCaptionFailure(err instanceof Error ? err.message : 'Subtitle download failed');
    } finally { setCaptionBusyId(null); setBuffering(false); }
  }, []);

  useEffect(() => {
    if (!forceSubtitleLang || forcedCaptionApplied.current || captionTracks.length === 0) return;
    const wanted = forceSubtitleLang.toLowerCase();
    const hit = captionTracks.find(t => { const l = t.language.toLowerCase(); return l === wanted || l.startsWith(`${wanted}-`) || l.startsWith(`${wanted}_`); });
    if (!hit) return;
    forcedCaptionApplied.current = true;
    void chooseCaption(hit);
  }, [forceSubtitleLang, chooseCaption, captionTracks]);

  const patchCaptionStyle = useCallback((updates: Partial<CaptionStyle>) => {
    setCaptionStyle(prev => {
      const next: CaptionStyle = {
        ...prev, ...updates,
        textColor: safeHex(updates.textColor ?? prev.textColor, prev.textColor),
        textOpacity: clamp(updates.textOpacity ?? prev.textOpacity, 0.2, 1, prev.textOpacity),
        backgroundColor: safeHex(updates.backgroundColor ?? prev.backgroundColor, prev.backgroundColor),
        backgroundOpacity: clamp(updates.backgroundOpacity ?? prev.backgroundOpacity, 0, 1, prev.backgroundOpacity),
        textSize: clamp(updates.textSize ?? prev.textSize, 14, 42, prev.textSize),
        fontFamily: CAPTION_FONTS.some(f => f.id === (updates.fontFamily ?? prev.fontFamily)) ? String(updates.fontFamily ?? prev.fontFamily) : prev.fontFamily,
        positionX: clamp(updates.positionX ?? prev.positionX, 8, 92, prev.positionX),
        positionY: clamp(updates.positionY ?? prev.positionY, 8, 94, prev.positionY),
      };
      writeCaptionStyle(next);
      return next;
    });
  }, []);

  const resetCaptionStyle = useCallback(() => { setCaptionStyle(DEFAULT_STYLE); writeCaptionStyle(DEFAULT_STYLE); }, []);

  const openPlacer = useCallback(() => {
    setPlaceDraft({ x: captionStyle.positionX, y: captionStyle.positionY });
    setPlaceGuides({ x: null, y: null, limitY: null });
    setCaptionsOpen(false);
    setPlacing(true);
  }, [captionStyle.positionX, captionStyle.positionY]);

  const placerPosition = useCallback((stage: HTMLDivElement, cx: number, cy: number) => {
    const shell = shellRef.current ?? stage;
    const rect = shell.getBoundingClientRect();
    // The placer stage is the full player surface, so use the same coordinate
    // system as the live subtitle overlay. The seek rail is the hard lower
    // boundary: the subtitle's visual box must remain completely above it.
    const rail = shell.querySelector('.fp-rail') as HTMLElement | null;
    const preview = stage.querySelector('.fp-subs--placing') as HTMLElement | null;
    const railTop = rail?.getBoundingClientRect().top ?? rect.bottom;
    const previewHalfHeight = Math.max(18, (preview?.getBoundingClientRect().height ?? 56) / 2);
    const maxY = clamp(((railTop - rect.top - previewHalfHeight - 4) / rect.height) * 100, 8, 94, 94);

    const rawX = clamp(((cx - rect.left) / rect.width) * 100, 8, 92, captionStyle.positionX);
    const rawY = clamp(((cy - rect.top) / rect.height) * 100, 8, maxY, Math.min(captionStyle.positionY, maxY));
    const snapThreshold = Math.min(3.2, 22 / Math.max(rect.width, rect.height) * 100);
    const snapPointsX = [10, 25, 50, 75, 90];
    const snapPointsY = [10, 25, 50, 75, 90, maxY];

    const nearest = (value: number, points: number[]) => {
      let best: number | null = null;
      let distance = snapThreshold;
      for (const point of points) {
        const d = Math.abs(value - point);
        if (d <= distance) { best = point; distance = d; }
      }
      return best;
    };

    const snappedX = nearest(rawX, snapPointsX);
    const snappedY = nearest(rawY, snapPointsY);
    const nextX = snappedX ?? rawX;
    const nextY = snappedY ?? rawY;
    setPlaceGuides({ x: snappedX, y: snappedY, limitY: maxY });
    setPlaceDraft({ x: nextX, y: nextY });
  }, [captionStyle.positionX, captionStyle.positionY]);

  const placerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    placerPosition(event.currentTarget, event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [placerPosition]);

  const placerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    placerPosition(event.currentTarget, event.clientX, event.clientY);
  }, [placerPosition]);

  const confirmPlacer = useCallback(() => {
    patchCaptionStyle({ positionX: placeDraft.x, positionY: placeDraft.y });
    setPlaceGuides({ x: null, y: null, limitY: null });
    setPlacing(false);
    setCaptionsOpen(true);
    setCaptionsTab('style');
  }, [placeDraft, patchCaptionStyle]);

  const cancelPlacer = useCallback(() => {
    setPlaceGuides({ x: null, y: null, limitY: null });
    setPlacing(false);
    setCaptionsOpen(true);
    setCaptionsTab('style');
  }, []);

  /* ── volume / progress ─────────────────────────── */
  const applyVolume = useCallback((level: number, muted: boolean) => {
    const video = videoRef.current;
    const nextLevel = Math.min(Math.max(level, 0), 1);
    if (video) { video.volume = nextLevel > 0 ? nextLevel : video.volume || nextLevel; video.muted = muted; }
    setVolume(nextLevel); setHushed(muted);
    writeStoredVolume(nextLevel, muted);
  }, []);

  const report = useCallback((event: string, force = false) => {
    const video = videoRef.current;
    const save = onProgressSlot.current;
    if (!video || !save) return;
    const at = Date.now();
    if (event === 'timeupdate' && !force && at - lastReportAt.current < 2000) return;
    const duration = video.duration || 0;
    const currentTime = video.currentTime || 0;
    save({ currentTime, duration, progress: duration > 0 ? (currentTime / duration) * 100 : 0, event });
    lastReportAt.current = at;
  }, []);

  /* ── variant swapping ──────────────────────────── */
  const swapVariant = useCallback(async (option: M3u8QualityOption, snap: MediaSnapshot, previous: { id: string; label: string }) => {
    const engine = engineRef.current;
    const video = videoRef.current;
    if (!engine || !video || !option.variantUrl) return false;

    const previousSource = liveSourceSlot.current;
    const nextUrl = wrapStreamUrl(option.variantUrl);
    const resumeAt = snap.at;
    const token = ++switchTokenSlot.current;

    setSwitchingQuality(true); setBuffering(true);

    const syncUi = (time: number, duration: number) => {
      setNow(time);
      if (duration > 0) { setTotal(duration); setPlayedPct((time / duration) * 100); }
      refreshSpans();
    };

    const finish = async (source: LiveSource) => {
      if (switchTokenSlot.current !== token) return;
      liveSourceSlot.current = source; setLiveSource(source);
      reapplySnapshot(video, snap);
      if (resumeAt > 0) nudgeVideoTo(video, resumeAt, syncUi);
      else syncUi(video.currentTime, video.duration || 0);
      if (snap.rolling) await video.play().catch(() => undefined);
      setSwitchingQuality(false); setBuffering(false);
    };

    const rollback = async () => {
      if (!previousSource || switchTokenSlot.current !== token) { setSwitchingQuality(false); setBuffering(false); return; }
      try {
        await engine.load(previousSource.url, resumeAt > 0 ? resumeAt : undefined);
        pickedQualitySlot.current = previous.id; setPickedQuality(previous.id); setQualityBadge(previous.label);
        await finish(previousSource);
      } catch { setSwitchingQuality(false); setBuffering(false); setFailure('Failed to switch quality'); setSession('error'); }
    };

    try {
      const loadRace = Promise.race([
        engine.load(nextUrl, resumeAt > 0 ? resumeAt : undefined),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('Quality switch timed out')), VARIANT_SWITCH_TIMEOUT)),
      ]);
      await loadRace;
      if (switchTokenSlot.current !== token) return true;
      await finish({ kind: isHlsStreamUrl(option.variantUrl) ? 'hls' : 'mp4', url: nextUrl });
      return true;
    } catch { await rollback(); return false; }
  }, [refreshSpans]);

  /* ── media mounting ────────────────────────────── */
  const mountMedia = useCallback((playback: FingerPlayback, resumeAt?: number) => {
    const video = videoRef.current;
    killEngine();
    const playbackStartToken = playbackStartTokenSlot.current;
    liveSourceSlot.current = null; setLiveSource(null);

    if (playback.kind === 'embed') { setSession('ready'); return; }
    if (!video) return;

    video.preload = 'auto';
    const pendingResume = resumeAt != null && Number.isFinite(resumeAt) && resumeAt > 0 ? resumeAt : undefined;

    const syncUi = (time: number, duration: number) => {
      setNow(time);
      if (duration > 0) { setTotal(duration); setPlayedPct((time / duration) * 100); }
      refreshSpans();
    };

    const goLive = async () => {
      if (playbackStartTokenSlot.current !== playbackStartToken) return;
      const stored = readStoredVolume();
      const volume = stored.volume > 0 ? stored.volume : 1;
      video.volume = volume;
      video.muted = false;
      setVolume(volume); setHushed(false);
      if (stored.muted) writeStoredVolume(volume, false);
      setSession('ready');
      video.playbackRate = rateSlot.current;
      if (pendingResume != null) nudgeVideoTo(video, pendingResume, syncUi);
      const startPlayback = async (attempt = 0): Promise<void> => {
        if (playbackStartTokenSlot.current !== playbackStartToken) return;
        try {
          await video.play();
        } catch (error) {
          if (error instanceof DOMException && error.name === 'NotAllowedError') return;

          if (error instanceof DOMException && error.name === 'AbortError' && attempt < 5) {
            await new Promise(resolve => window.setTimeout(resolve, 200 * (attempt + 1)));
            if (playbackStartTokenSlot.current === playbackStartToken) void startPlayback(attempt + 1);
            return;
          }

          setFailure(describeError(error));
          setSession('error');
        }
      };
      void startPlayback();
    };

    if (playback.kind === 'hls' || needsShakaPipeline(playback.url)) {
      const source: LiveSource = { kind: playback.kind === 'mp4' ? 'mp4' : 'hls', url: playback.url };
      liveSourceSlot.current = source; setLiveSource(source);
      shaka.polyfill.installAll();

      if (shaka.Player.isBrowserSupported()) {
        const engine = new shaka.Player(video);
        engineRef.current = engine;
        tuneEngine(engine); wireNetworking(engine);

        engine.addEventListener('variantchanged', () => {
          if (pickedQualitySlot.current !== AUTO_ID) {
            const chosen = menuSlot.current.find(o => o.id === pickedQualitySlot.current);
            if (chosen) setQualityBadge(chosen.label);
            return;
          }
          const hot = ((engine.getVariantTracks?.() ?? []) as ShakaVariantTrack[]).map(toVariantTrack).find(t => t.active);
          const tier = hot ? resolveQualityTier({ height: hot.height, width: hot.width, bandwidth: hot.bandwidth }) ?? hot.height : undefined;
          if (tier) setQualityBadge(tierBadge(tier));
        });

        void (async () => {
          try {
            await engine.load(playback.url, pendingResume ?? undefined);
            const tracks = ((engine.getVariantTracks?.() ?? []) as ShakaVariantTrack[]).map(toVariantTrack);
            const fromEngine = tiersFromEngine(tracks);
            if (menuFromProviderSlot.current) {
              const chosen = menuSlot.current.find(o => o.id === pickedQualitySlot.current);
              if (chosen) setQualityBadge(chosen.label);
            } else if (playback.kind === 'hls') {
              installMenu(fromEngine);
              const chosen = fromEngine.find(o => o.id === pickedQualitySlot.current);
              void pinQuality(engine, chosen);
              if (!chosen || chosen.id === AUTO_ID || chosen.hlsLevel === -1) {
                pickedQualitySlot.current = AUTO_ID; setPickedQuality(AUTO_ID); setQualityBadge('Auto');
              }
            }
            goLive(); refreshSpans();
          } catch (err) {
            if (engineRef.current !== engine) return;
            const hasMedia = video.currentTime > 0 || video.readyState >= HTMLMediaElement.HAVE_METADATA;
            if (hasMedia && !video.ended) return;
            setFailure(describeError(err)); setSession('error');
          }
        })();
      } else if (playback.kind === 'hls' && video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = playback.url;
        video.addEventListener('loadedmetadata', goLive, { once: true });
      } else if (playback.kind === 'hls') {
        throw new Error('HLS is not supported in this browser');
      } else {
        throw new Error('Progressive playback requires Shaka Player');
      }
      return;
    }

    const source: LiveSource = { kind: 'mp4', url: playback.url };
    liveSourceSlot.current = source; setLiveSource(source);
    video.src = playback.url;

    const onMeta = () => goLive();
    const onStall = () => { setFailure('Could not load progressive stream'); setSession('error'); };
    video.addEventListener('loadedmetadata', onMeta, { once: true });
    video.addEventListener('error', onStall, { once: true });
    window.setTimeout(() => {
      if (engineRef.current) return;
      if (liveSourceSlot.current?.url !== playback.url) return;
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return;
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('error', onStall);
      setFailure('Stream metadata timed out — try again'); setSession('error');
    }, 45_000);
  }, [installMenu, pinQuality, killEngine, refreshSpans, tiersFromEngine, tuneEngine, wireNetworking]);

  /* ── session bootstrap ─────────────────────────── */
  const beginSession = useCallback(async () => {
    setSession('loading'); setFailure(null); setEmbedSrc(null); setRolling(false); setPlayedPct(0);
    spanSlot.current = []; setBufferSpans([]); setCaptionTracks([]); setCaptionPick(CAPTIONS_OFF);
    setCues([]); setCaptionBusyId(null); setCaptionFailure(null); forcedCaptionApplied.current = false;
    setNow(0); setTotal(0); setSettingsOpen(false); setCaptionsOpen(false); setBootLog([]); logIdSlot.current = 0;

    log('Booting player runtime');
    step(extractUrl || localRuntime ? 'Extracting stream' : 'Preparing stream');
    killEngine();
    pinnedVariantSlot.current = null; tierCeilingSlot.current = null; tierFloorSlot.current = null; tierStableAtSlot.current = null;

    if (!CAPTIONS_LOCKED) { log('Indexing subtitle catalog'); void fetchCaptions(); }
    void fetchIntros();

    try {
      const requestVia = (provider: FingerProviderId) => scrapeFingerStreamDetailed({
        tmdbId: mediaId, type, title, releaseYear,
        season: type === 'series' ? season : undefined,
        episode: type === 'series' ? episode : undefined,
        provider, imdbId,
      });

      let chosenProvider = liveProviderSlot.current;
      let result = null as Awaited<ReturnType<typeof scrapeFingerStreamDetailed>> | null;

      const probeAll = !extractUrl && localRuntime && providerPickSlot.current === AUTO_ID && !autoResolvedSlot.current && manualProviders.length > 0;

      if (extractUrl) {
        step('Extracting stream'); setSourceName('App Exclusive');
        result = await scrapeFingerFromUrl(extractUrl);
      } else if (probeAll) {
        let lastError: unknown;
        for (const provider of manualProviders) {
          step(`Testing ${provider.label}`); setSourceName(provider.label);
          try {
            result = await requestVia(provider.id);
            chosenProvider = provider.id; liveProviderSlot.current = provider.id;
            autoResolvedSlot.current = true; setActiveProvider(provider.id);
            onProviderChange?.(provider.id);
            log(`${provider.label} responded`); break;
          } catch (err) { lastError = err; log(`${provider.label} unavailable`); }
        }
        if (!result) throw lastError instanceof Error ? lastError : new Error('No desktop provider returned a playable stream');
      } else {
        step(`Testing ${providerName(chosenProvider)}`); setSourceName(providerName(chosenProvider));
        result = await requestVia(chosenProvider);
        log(`${providerName(chosenProvider)} ready`);
      }

      setBusyStep(null);
      if (!extractUrl) setSourceName(providerName(chosenProvider));

      menuFromProviderSlot.current = Boolean(result.variantQualities?.length);

      if (result.kind === 'embed') {
        log('Opening embed session');
        setEmbedSrc(result.url);
        menuFromProviderSlot.current = false;
        installMenu([{ id: 'embed', label: 'Embed', hlsLevel: 0 }]);
        pickedQualitySlot.current = 'embed'; setPickedQuality('embed'); setQualityBadge('Embed');
        setSession('ready'); return;
      }

      log('Resolving quality ladder');
      if (result.kind === 'hls' && result.variantQualities?.length) {
        installMenu(result.variantQualities.map(q => ({ id: q.id, label: q.label, variantUrl: q.url, hlsLevel: -1 })));
        const best = result.variantQualities[0];
        pickedQualitySlot.current = best.id; setPickedQuality(best.id); setQualityBadge(best.label);
      } else if (result.kind === 'hls' && result.masterUrl) {
        try {
          const menu = await buildM3u8QualityMenu(result.masterUrl);
          installMenu(menu); pickedQualitySlot.current = AUTO_ID; setPickedQuality(AUTO_ID); setQualityBadge('Auto');
        } catch { installMenu([{ id: AUTO_ID, label: 'Auto', hlsLevel: -1 }]); pickedQualitySlot.current = AUTO_ID; setPickedQuality(AUTO_ID); setQualityBadge('Auto'); }
      } else {
        menuFromProviderSlot.current = false;
        installMenu([{ id: 'source', label: 'Source', hlsLevel: 0 }]);
        pickedQualitySlot.current = 'source'; setPickedQuality('source'); setQualityBadge('Source');
      }

      log('Attaching media source');
      const resumeAt = initialTimeSlot.current ?? readSavedWatchTime(mediaId, type, season, episode);
      log(resumeAt ? 'Restoring watch position' : 'Buffering first frames');
      mountMedia(result, resumeAt);
    } catch (err) {
      setBusyStep(null);
      log('Playback bootstrap failed');
      setFailure(err instanceof Error ? err.message : 'Failed to load stream');
      setSession('error');
    }
  }, [episode, extractUrl, fetchCaptions, fetchIntros, installMenu, killEngine, localRuntime, log, manualProviders, mediaId, mountMedia, onProviderChange, releaseYear, season, step, title, type]);

  useEffect(() => {
    void beginSession();
    resumeApplied.current = false;
    return () => { killEngine(); };
  }, [beginSession, killEngine, sessionNonce]);

  useEffect(() => {
    if (initialTime == null || initialTime <= 0 || session !== 'ready') return;
    const video = videoRef.current;
    if (!video || resumeApplied.current) return;
    if (video.currentTime >= 1 && Math.abs(video.currentTime - initialTime) < 3) { resumeApplied.current = true; return; }
    nudgeVideoTo(video, initialTime, (time, duration) => {
      resumeApplied.current = true; setNow(time);
      if (duration > 0) { setTotal(duration); setPlayedPct((time / duration) * 100); }
    });
  }, [initialTime, session]);

  /* ── user intents ──────────────────────────────── */
  const pickProvider = useCallback((id: ProviderPick) => {
    providerPickSlot.current = id; setProviderPick(id);
    if (id === AUTO_ID) { autoResolvedSlot.current = false; setSourceName('Auto'); }
    else { autoResolvedSlot.current = true; liveProviderSlot.current = id; setActiveProvider(id); setSourceName(providerName(id)); onProviderChange?.(id); }
    setSettingsOpen(false); setSessionNonce(n => n + 1);
  }, [onProviderChange]);

  const pickQuality = useCallback((option: M3u8QualityOption) => {
    const engine = engineRef.current;
    const video = videoRef.current;
    if (option.id === pickedQualitySlot.current) { setSettingsOpen(false); return; }
    const snap = grabSnapshot(video, rateSlot.current);
    const previous = { id: pickedQualitySlot.current, label: menuSlot.current.find(e => e.id === pickedQualitySlot.current)?.label ?? qualityBadge };
    pickedQualitySlot.current = option.id; setPickedQuality(option.id); setQualityBadge(option.label); setSettingsOpen(false);
    if (menuFromProviderSlot.current && option.variantUrl) {
      if (engine) { void swapVariant(option, snap, previous); return; }
      const hls = isHlsStreamUrl(option.variantUrl);
      mountMedia({ kind: hls ? 'hls' : 'mp4', url: wrapStreamUrl(option.variantUrl) }, snap.at > 0 ? snap.at : undefined);
      return;
    }
    if (!engine) return;
    void pinQuality(engine, option);
  }, [mountMedia, pinQuality, qualityBadge, swapVariant]);

  const toggleRolling = useCallback(() => {
    const video = videoRef.current;
    if (!video || session !== 'ready') return;
    if (!video.paused && !video.ended) { video.pause(); setRolling(false); setChromeVisible(true); }
    else { video.play().catch(() => undefined); }
  }, [session]);

  const onTimeTick = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const pct = (video.currentTime / video.duration) * 100;
    setPlayedPct(Number.isFinite(pct) ? pct : 0);
    setNow(video.currentTime); setTotal(video.duration || 0);
    refreshSpans(); report('timeupdate');
  }, [refreshSpans, report]);

  const onScrub = useCallback((pct: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const target = (pct / 100) * video.duration;
    if (Number.isFinite(target)) { video.currentTime = target; setPlayedPct(pct); refreshSpans(); }
  }, [refreshSpans]);

  const onSeeked = useCallback(() => { report('seeked', true); }, [report]);

  const syncDesktopPresence = useCallback(() => {
    if (!IS_DESKTOP_APP) return;
    const video = videoRef.current;
    const playing = Boolean(video && !video.paused && !video.ended && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
    emitDesktopWatchingState(session === 'ready' && playing);
  }, [session]);

  const showVolumeHud = useCallback((level: number, delta = 0) => {
    const percent = Math.round(Math.min(Math.max(level, 0), 1) * 100);
    setVolumeHud({ percent, delta });
    if (volumeHudTimer.current) clearTimeout(volumeHudTimer.current);
    volumeHudTimer.current = setTimeout(() => {
      setVolumeHud(null);
      volumeHudTimer.current = null;
    }, 900);
  }, []);

  const setVolumePct = useCallback((pct: number) => {
    const level = Math.min(Math.max(pct / 100, 0), 1);
    applyVolume(level, level === 0);
    showVolumeHud(level);
  }, [applyVolume, showVolumeHud]);

  const nudgeVolume = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const current = video.muted ? 0 : video.volume;
    const next = Math.min(Math.max(current + delta, 0), 1);
    applyVolume(next, next === 0);
    showVolumeHud(next, delta);
  }, [applyVolume, showVolumeHud]);

  const nudgeTime = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video || session !== 'ready' || !Number.isFinite(video.duration)) return;
    const target = Math.min(Math.max(video.currentTime + delta, 0), video.duration);
    video.currentTime = target; setNow(target); setPlayedPct((target / video.duration) * 100);
    refreshSpans(); report('seeked', true);
  }, [session, refreshSpans, report]);

  const toggleHush = useCallback(() => {
    if (hushed) { const next = volume > 0 ? volume : 1; applyVolume(next, false); }
    else { applyVolume(volume, true); }
  }, [hushed, volume, applyVolume]);

  const setPlaybackRate = useCallback((next: number) => {
    const video = videoRef.current;
    if (!video) return;
    rateSlot.current = next; video.playbackRate = next; setRate(next);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) return;
    const doc = document as Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };
    const element = shell as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    const systemFs = Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
    const cssFs = shell.classList.contains('is-native-fullscreen');
    const entering = !systemFs && !cssFs;
    try {
      if (entering) {
        if (IS_MOBILE_APP) { setNativeImmersiveMode(true); shell.classList.add('is-native-fullscreen'); setFullscreen(true); }
        if (element.requestFullscreen) await element.requestFullscreen();
        else if (element.webkitRequestFullscreen) await element.webkitRequestFullscreen();
      } else {
        if (IS_MOBILE_APP) { setNativeImmersiveMode(false); shell.classList.remove('is-native-fullscreen'); setFullscreen(false); }
        if (document.fullscreenElement || doc.webkitFullscreenElement) {
          if (document.exitFullscreen) await document.exitFullscreen();
          else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
        }
      }
    } catch { /* user agent refused */ }
  }, []);

  /* ── chrome auto-hide ──────────────────────────── */
  const cancelHide = useCallback(() => {
    if (hideTimerSlot.current) { clearTimeout(hideTimerSlot.current); hideTimerSlot.current = null; }
  }, []);

  const armHide = useCallback(() => {
    cancelHide();
    if (!rolling || settingsOpen || captionsOpen || placing || prefsOpen || session !== 'ready') return;
    hideTimerSlot.current = setTimeout(() => { setChromeVisible(false); setSettingsOpen(false); setCaptionsOpen(false); }, prefs.autoHideDelay);
  }, [cancelHide, rolling, settingsOpen, captionsOpen, placing, prefsOpen, session, prefs.autoHideDelay]);

  const wake = useCallback(() => { setChromeVisible(true); armHide(); }, [armHide]);

  useEffect(() => {
    if (settingsOpen || captionsOpen || placing || prefsOpen) { cancelHide(); setChromeVisible(true); return; }
    if (rolling) armHide();
  }, [settingsOpen, captionsOpen, placing, prefsOpen, rolling, cancelHide, armHide]);

  useEffect(() => {
    if (!rolling || session !== 'ready') { cancelHide(); return; }
    armHide(); return cancelHide;
  }, [rolling, session, armHide, cancelHide]);

  useEffect(() => {
    if (!settingsOpen) return;
    const away = (event: globalThis.MouseEvent) => {
      if (settingsPanelRef.current && !settingsPanelRef.current.contains(event.target as Node)) setSettingsOpen(false);
    };
    window.addEventListener('mousedown', away);
    return () => window.removeEventListener('mousedown', away);
  }, [settingsOpen]);

  useEffect(() => () => { cancelHide(); }, [cancelHide]);

  /* ── video events ──────────────────────────────── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || session !== 'ready') return;

    const onPlay = () => { setStartedOnce(true); setRolling(true); syncDesktopPresence(); report('play', true); };
    const onPause = () => { setRolling(false); if (IS_DESKTOP_APP) emitDesktopWatchingState(false); setChromeVisible(true); report('pause', true); };
    const onEnded = () => { if (IS_DESKTOP_APP) emitDesktopWatchingState(false); report('ended', true); };
    const onWaiting = () => { if (!captionBusyId) setBuffering(true); loosenFloor(); tierStableAtSlot.current = null; };
    const markSteady = () => {
      setBuffering(false);
      if (tierCeilingSlot.current && tierFloorSlot.current && tierStableAtSlot.current == null) tierStableAtSlot.current = Date.now();
    };
    const onSpans = () => refreshSpans();

    const upgradeTimer = window.setInterval(() => {
      const stableAt = tierStableAtSlot.current;
      if (!stableAt || video.paused || video.ended || buffering) return;
      if (Date.now() - stableAt >= MANUAL_TIER_STABLE_MS) raiseFloor();
    }, 5_000);

    video.addEventListener('play', onPlay); video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded); video.addEventListener('seeked', onSeeked);
    video.addEventListener('waiting', onWaiting); video.addEventListener('playing', markSteady);
    video.addEventListener('canplay', markSteady); video.addEventListener('progress', onSpans);
    video.addEventListener('durationchange', onSpans); video.addEventListener('loadedmetadata', onSpans);
    video.addEventListener('emptied', onSpans);

    return () => {
      if (IS_DESKTOP_APP) emitDesktopWatchingState(video.paused || video.ended ? false : true);
      if (video.currentTime > 0) report('pause', true);
      video.removeEventListener('play', onPlay); video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded); video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('waiting', onWaiting); video.removeEventListener('playing', markSteady);
      video.removeEventListener('canplay', markSteady); video.removeEventListener('progress', onSpans);
      video.removeEventListener('durationchange', onSpans); video.removeEventListener('loadedmetadata', onSpans);
      video.removeEventListener('emptied', onSpans); window.clearInterval(upgradeTimer);
    };
  }, [session, onSeeked, buffering, loosenFloor, raiseFloor, refreshSpans, report, syncDesktopPresence, captionBusyId]);

  /* ── fullscreen mirror ─────────────────────────── */
  useEffect(() => {
    const mirror = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const active = Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
      if (IS_MOBILE_APP) {
        if (active) { setFullscreen(true); setNativeImmersiveMode(true); }
        else { shellRef.current?.classList.remove('is-native-fullscreen'); setNativeImmersiveMode(false); setFullscreen(false); }
      } else { setFullscreen(active); }
      syncDesktopPresence(); window.setTimeout(syncDesktopPresence, 250);
    };
    document.addEventListener('fullscreenchange', mirror);
    document.addEventListener('webkitfullscreenchange', mirror as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', mirror);
      document.removeEventListener('webkitfullscreenchange', mirror as EventListener);
      if (IS_MOBILE_APP) { setNativeImmersiveMode(false); shellRef.current?.classList.remove('is-native-fullscreen'); }
    };
  }, [syncDesktopPresence]);

  /* ── desktop heartbeat ─────────────────────────── */
  useEffect(() => {
    if (!IS_DESKTOP_APP) return;
    syncDesktopPresence();
    const beat = window.setInterval(syncDesktopPresence, 1000);
    window.addEventListener('focus', syncDesktopPresence);
    document.addEventListener('visibilitychange', syncDesktopPresence);
    return () => { window.clearInterval(beat); window.removeEventListener('focus', syncDesktopPresence); document.removeEventListener('visibilitychange', syncDesktopPresence); };
  }, [syncDesktopPresence]);

  /* ── keyboard ──────────────────────────────────── */
  useEffect(() => {
    if (session !== 'ready') return;
    const typingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || target.isContentEditable;
    };

    const findAction = (key: string): KeybindAction | null => {
      const normalized = normalizeKey(key);
      if (!normalized) return null;
      return keybinds.find(kb => kb.keys.some(bound => normalizeKey(bound) === normalized))?.action ?? null;
    };

    const onKey = (event: KeyboardEvent) => {
      if (prefsOpen) {
        if (event.key === 'Escape') { event.preventDefault(); setPrefsOpen(false); }
        return;
      }

      // Ignore actual text-entry controls, but do not ignore player buttons.
      // A focused play button must still respond to the global Space binding.
      if (typingTarget(event.target) && !(event.target instanceof HTMLButtonElement && shellRef.current?.contains(event.target))) return;
      if (typingTarget(document.activeElement) && !(document.activeElement instanceof HTMLButtonElement && shellRef.current?.contains(document.activeElement))) return;

      const action = findAction(event.key) ?? findAction(event.code);
      if (!action && event.key !== 'Escape' && event.code !== 'Escape') return;

      switch (action) {
        case 'togglePlay':
          event.preventDefault(); wake(); toggleRolling(); break;
        case 'seekBack':
          event.preventDefault(); wake(); nudgeTime(-prefs.seekStep); break;
        case 'seekForward':
          event.preventDefault(); wake(); nudgeTime(prefs.seekStep); break;
        case 'volumeUp':
          event.preventDefault(); wake(); nudgeVolume(prefs.volumeStep); break;
        case 'volumeDown':
          event.preventDefault(); wake(); nudgeVolume(-prefs.volumeStep); break;
        case 'mute':
          event.preventDefault(); wake(); toggleHush(); break;
        case 'fullscreen':
          event.preventDefault(); wake(); void toggleFullscreen(); break;
        case 'openPrefs':
          event.preventDefault(); wake(); setSettingsOpen(false); setCaptionsOpen(false); setPrefsOpen(p => !p); break;
        case 'closePanel':
          if (settingsOpen || captionsOpen || prefsOpen) { event.preventDefault(); setSettingsOpen(false); setCaptionsOpen(false); setPrefsOpen(false); }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [session, wake, toggleRolling, toggleFullscreen, nudgeTime, nudgeVolume, toggleHush, prefsOpen, keybinds, prefs, settingsOpen, captionsOpen]);

  /* ── derived UI ────────────────────────────────── */
  const resolvedRuntime = useMemo(() => {
    if (runtimeMinutes && runtimeMinutes > 0) return runtimeMinutes;
    if (total > 0) return Math.max(1, Math.round(total / 60));
    return null;
  }, [runtimeMinutes, total]);

  const headingEpLabel = type === 'series' ? `S${season}:E${episode}` : String(releaseYear);

  const liveCue = useMemo(() => {
    if (captionPick === CAPTIONS_OFF || cues.length === 0) return null;
    return cues.find(c => now >= c.start && now <= c.end)?.text ?? null;
  }, [now, captionPick, cues]);

  const liveIntro = useMemo(
    () => introSpans.find(s => s.type === 'intro' && now >= s.start && now < Math.max(s.end - 0.5, s.start)) ?? null,
    [now, introSpans]
  );

  const nextEpisodeArmed = useMemo(() => {
    if (!canGoNextEpisode || !onNextEpisode) return false;
    if (type !== 'series' || session !== 'ready') return false;
    if (!Number.isFinite(total) || total <= 30) return false;
    if (!prefs.autoNextEpisode) return false;
    return total - now <= 30 && now < total;
  }, [canGoNextEpisode, now, total, onNextEpisode, session, type, prefs.autoNextEpisode]);

  const nextCountdown = useMemo(() => {
    const left = Math.max(0, Math.ceil(total - now));
    return left > 0 ? `in ${left}s` : 'starting now';
  }, [now, total]);

  const filteredCaptions = useMemo(() => {
    const needle = captionQuery.trim().toLowerCase();
    return [...captionTracks]
      .sort((a, b) => { const byLang = a.label.localeCompare(b.label); return byLang !== 0 ? byLang : (a.release || '').localeCompare(b.release || ''); })
      .filter(t => {
        if (!needle) return true;
        return [t.label, t.language, t.source, t.release, t.format].filter(Boolean).some(v => String(v).toLowerCase().includes(needle));
      });
  }, [captionTracks, captionQuery]);

  const pausedEffectsActive = !rolling && session === 'ready' && startedOnce;
  const pauseCardVisible = pausedEffectsActive && !settingsOpen && !captionsOpen && !placing && !prefsOpen;
  const chromeUp = chromeVisible || !rolling;
  const currentLabel = clock(now);
  const remainingLabel = clock(Math.max(0, total - now));
  const rightTimeLabel = prefs.showRemainingTime ? remainingLabel : clock(total);
  const [resolvedTmdb, setResolvedTmdb] = useState<typeof tmdb | null>(tmdb ?? null);

  useEffect(() => {
    setResolvedTmdb(tmdb ?? null);
  }, [tmdb]);

  useEffect(() => {
    if (!mediaId) return;

    let cancelled = false;

    const mergeTmdb = (data: any) => {
      if (!data) return;
      setResolvedTmdb(previous => ({
        ...(previous ?? {}),
        release_date: data.release_date || data.first_air_date || data.air_date || previous?.release_date,
        first_air_date: data.first_air_date || data.air_date || data.release_date || previous?.first_air_date,
        vote_average: data.vote_average ?? previous?.vote_average,
        logoUrl: data.logoUrl || previous?.logoUrl,
        overview: data.overview || previous?.overview,
        title: data.title || previous?.title,
        episodeTitle: data.episodeTitle || previous?.episodeTitle,
      }));
    };

    const loadTmdbMetadata = async () => {
      // First try the app route. This is the preferred path when the backend
      // is configured with a server-side TMDB key.
      try {
        const params = new URLSearchParams({ type, tmdbId: mediaId });
        if (type === 'series') {
          params.set('season', String(season));
          params.set('episode', String(episode));
        }
        const response = await fetch(`/api/tmdb/metadata?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          if (!cancelled && data) mergeTmdb(data);
          // A partial response should still get the client-side fallback.
          const hasDate = Boolean(data?.release_date || data?.first_air_date || data?.air_date);
          const hasRating = data?.vote_average != null && Number(data.vote_average) > 0;
          if (hasDate && hasRating) return;
        }
      } catch {
        // Fall through to the VITE client key.
      }

      // Vite exposes VITE_* values to the browser at build time. The supplied
      // VITE_TMDB_API_KEY therefore works even when /api/tmdb/metadata is not
      // available or the server is not configured with TMDB credentials.
      const apiKey = String(import.meta.env.VITE_TMDB_API_KEY || '').trim();
      if (!apiKey || cancelled) return;

      try {
        const encodedId = encodeURIComponent(mediaId);
        const base = 'https://api.themoviedb.org/3';
        let details: any = null;

        if (type === 'series') {
          // Prefer the episode endpoint when season/episode are available,
          // then use the TV details endpoint for the show's first-air date.
          if (season != null && episode != null) {
            const episodeUrl = `${base}/tv/${encodedId}/season/${encodeURIComponent(String(season))}/episode/${encodeURIComponent(String(episode))}?api_key=${encodeURIComponent(apiKey)}&language=en-US`;
            const episodeResponse = await fetch(episodeUrl);
            if (episodeResponse.ok) {
              const episodeData = await episodeResponse.json();
              details = episodeData;
            }
          }

          const tvUrl = `${base}/tv/${encodedId}?api_key=${encodeURIComponent(apiKey)}&language=en-US`;
          const tvResponse = await fetch(tvUrl);
          if (tvResponse.ok) {
            const tvData = await tvResponse.json();
            details = {
              ...(tvData || {}),
              // Keep an episode rating if the episode endpoint supplied one;
              // otherwise use the series rating.
              vote_average: details?.vote_average ?? tvData?.vote_average,
              // Release date shown in the player is the series first-air date.
              first_air_date: tvData?.first_air_date || details?.air_date,
            };
          }
        } else {
          const movieUrl = `${base}/movie/${encodedId}?api_key=${encodeURIComponent(apiKey)}&language=en-US`;
          const movieResponse = await fetch(movieUrl);
          if (movieResponse.ok) details = await movieResponse.json();
        }

        if (!cancelled && details) mergeTmdb(details);
      } catch {
        // Metadata is supplementary; playback must continue if TMDB is unavailable.
      }
    };

    void loadTmdbMetadata();
    return () => {
      cancelled = true;
    };
  }, [mediaId, type, season, episode, tmdb]);

  const tmdbReleaseDate = type === 'series'
    ? (resolvedTmdb?.first_air_date || releaseDate || '')
    : (resolvedTmdb?.release_date || releaseDate || '');
  const tmdbRating = resolvedTmdb?.vote_average ?? rating;
  const resolvedTitle = title === 'Media Title' && resolvedTmdb?.title ? resolvedTmdb.title : title;
  const resolvedEpisodeTitle = episodeTitle || resolvedTmdb?.episodeTitle;
  const resolvedLogoUrl = resolvedTmdb?.logoUrl || logoUrl;
  const resolvedDescription = resolvedTmdb?.overview || description;

  const formattedReleaseDate = useMemo(() => {
    const raw = String(tmdbReleaseDate ?? '').trim();
    if (!raw || /^\d{4}$/.test(raw)) return '';
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(parsed);
  }, [tmdbReleaseDate]);

  const formattedRating = useMemo(() => {
    const raw = tmdbRating == null ? '' : String(tmdbRating).trim();
    if (!raw) return '';
    const numeric = Number(raw.replace('/10', ''));
    if (!Number.isFinite(numeric) || numeric <= 0) return '';
    return `${numeric.toFixed(1).replace(/\.0$/, '')}/10`;
  }, [tmdbRating]);

  const skipIntro = useCallback(() => {
    const video = videoRef.current;
    if (!video || !liveIntro || session !== 'ready') return;
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : liveIntro.end;
    const target = Math.min(liveIntro.end + 0.35, duration);
    video.currentTime = target; setNow(target);
    if (duration > 0) setPlayedPct((target / duration) * 100);
    refreshSpans(); report('skip-intro', true); wake();
  }, [liveIntro, refreshSpans, report, session, wake]);

  const goNext = useCallback(() => {
    if (session !== 'ready' || !nextEpisodeArmed || !onNextEpisode) return;
    report('next-episode', true); onNextEpisode();
  }, [nextEpisodeArmed, onNextEpisode, report, session]);

  const goNextNow = useCallback(() => {
    if (session !== 'ready' || !onNextEpisode) return;
    report('next-episode', true); onNextEpisode();
  }, [onNextEpisode, report, session]);

  useEffect(() => {
    if (!settingsOpen && !captionsOpen && !prefsOpen && !placing) return;
    const onOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (target.closest('.fp-panel, .fp-prefs-dialog, .fp-placer, [data-fp-menu-trigger=\"true\"]')) return;
      setSettingsOpen(false);
      setCaptionsOpen(false);
      setPrefsOpen(false);
      setPlacing(false);
    };
    document.addEventListener('pointerdown', onOutsidePointer, true);
    return () => document.removeEventListener('pointerdown', onOutsidePointer, true);
  }, [settingsOpen, captionsOpen, prefsOpen, placing]);

  /* ══════════════════════ render ══════════════════════ */

  return (
    <div
      ref={shellRef}
      className={cn(
        'fp-root absolute inset-0 w-full h-full overflow-hidden bg-black',
        'fp-control-minimal',
        rolling && !chromeVisible && session === 'ready' && 'cursor-none',
        fullscreen && 'is-fullscreen',
        pausedEffectsActive && 'is-paused'
      )}
      onMouseMove={wake}
      onMouseEnter={wake}
      onMouseLeave={() => { cancelHide(); if (rolling) { setChromeVisible(false); setSettingsOpen(false); setCaptionsOpen(false); } }}
      aria-label={`${FINGER_API_SERVER_TAG} player for ${resolvedTitle}`}
      tabIndex={-1}
    >
      {/* Video / embed */}
      {embedSrc ? (
        <iframe
          title={`${resolvedTitle} embedded player`}
          className="fp-embed-frame bg-black"
          src={embedSrc}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <video
          ref={videoRef}
          className="fp-video w-full h-full object-contain bg-black"
          preload="auto"
          playsInline
          autoPlay
          onTimeUpdate={onTimeTick}
          onClick={() => { wake(); toggleRolling(); }}
          onDoubleClick={prefs.doubleClickFullscreen ? toggleFullscreen : undefined}
        />
      )}

      {/* Back button */}
      {onBack && session !== 'loading' && (
          <button
          type="button"
          className={cn('fp-back', !chromeUp && 'is-hidden')}
          onClick={onBack}
          aria-label="Back"
        >
          <ArrowLeft strokeWidth={2} />
        </button>
      )}

      {/* Live captions */}
      {session === 'ready' && !embedSrc && liveCue && (
        <div className="fp-subs" style={styleOverlay} aria-live="polite">
          {liveCue.split('\n').map((line, i) => (
            <span key={`${i}-${line}`} className="fp-subs__line" style={styleLine}>{line}</span>
          ))}
        </div>
      )}

      {/* Skip Intro / Next Episode */}
      <AnimatePresence>
        {session === 'ready' && !embedSrc && liveIntro && (
          <ActionPrompt key="skip-intro" title="Skip Intro" onClick={skipIntro} ariaLabel={`Skip intro to ${clock(liveIntro.end)}`} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {session === 'ready' && !embedSrc && nextEpisodeArmed && (
          <ActionPrompt key="next-ep" title="Next Episode" meta={nextCountdown} onClick={goNext} ariaLabel="Play next episode" />
        )}
      </AnimatePresence>

      {/* Subtitle position editor */}
      {session === 'ready' && !embedSrc && placing && (
        <div className="fp-placer" role="dialog" aria-modal>
          <div className="fp-placer-stage" onPointerDown={placerDown} onPointerMove={placerMove}>
            <div className="fp-placer-guides" aria-hidden="true">
              <span className="fp-placer-guide fp-placer-guide--v fp-placer-guide--25" />
              <span className={cn('fp-placer-guide fp-placer-guide--v fp-placer-guide--50', placeGuides.x === 50 && 'is-snapped')} />
              <span className="fp-placer-guide fp-placer-guide--v fp-placer-guide--75" />
              <span className="fp-placer-guide fp-placer-guide--h fp-placer-guide--25" />
              <span className={cn('fp-placer-guide fp-placer-guide--h fp-placer-guide--50', placeGuides.y === 50 && 'is-snapped')} />
              <span className="fp-placer-guide fp-placer-guide--h fp-placer-guide--75" />
              <span
              className={cn('fp-placer-guide fp-placer-guide--safe', placeGuides.y != null && placeGuides.limitY != null && Math.abs(placeGuides.y - placeGuides.limitY) < 0.01 && 'is-snapped')}
              style={{ top: `${placeGuides.limitY ?? 78}%` }}
            />
            </div>
            <div className="fp-subs fp-subs--placing" style={draftOverlay}>
              <span className="fp-subs__line" style={draftLine}>Drag subtitles here</span>
              <span className="fp-subs__line" style={draftLine}>Then confirm position</span>
            </div>
          </div>
          <div className="fp-placer-bar">
            <div>
              <p className="fp-placer-title">Subtitle position</p>
              <p className="fp-placer-hint">Drag the preview text to position.</p>
            </div>
            <div className="fp-placer-actions">
              <button type="button" className="fp-action-btn" onClick={cancelPlacer}>Cancel</button>
              <button type="button" className="fp-action-btn fp-action-btn--primary" onClick={confirmPlacer}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Dialog */}
      <AnimatePresence>
        {prefsOpen && (
          <PreferencesDialog
            key="prefs"
            onClose={() => setPrefsOpen(false)}
            keybinds={keybinds}
            onUpdateKeybind={updateKeybind}
            onResetKeybinds={resetKeybinds}
            prefs={prefs}
            onUpdatePref={updatePref}
            onResetPrefs={resetPrefs}
            captionStyle={captionStyle}
            onPatchCaptionStyle={patchCaptionStyle}
            onResetCaptionStyle={resetCaptionStyle}
            onOpenPlacer={openPlacer}
          />
        )}
      </AnimatePresence>

      {/* Loading */}
      {session === 'loading' && (
        <div className="fp-loading" aria-live="polite" aria-busy>
          <div className="fp-loading-core">
            {resolvedLogoUrl ? <img className="fp-loading-logo" src={resolvedLogoUrl} alt="" /> : <div className="fp-loader" aria-hidden />}
            <div>
              <p className="fp-loading-title">{resolvedTitle}</p>
              <p className="fp-loading-step">{busyStep ?? 'Preparing stream'}</p>
            </div>
            <ul className="fp-loading-log" aria-label="Loading activity">
              {bootLog.length === 0
                ? <li className="fp-loading-log-line is-live">Waiting for bootstrap…</li>
                : bootLog.map(row => (
                    <li key={row.id} className={cn('fp-loading-log-line', row.live && 'is-live')}>
                      <span>{row.text}</span>
                    </li>
                  ))
              }
            </ul>
          </div>
        </div>
      )}

      {/* Error */}
      {session === 'error' && (
        <div className="fp-error">
          <div className="fp-error-card">
            <p className="fp-error-code">Playback error</p>
            <h2 className="fp-error-title">Stream unavailable</h2>
            <p className="fp-error-msg">{failure}</p>
            {providerSwitchAllowed && (
              <div className="fp-error-servers" aria-label="Choose another server">
                {providerEntries.map(provider => (
                  <button
                    key={provider.id} type="button"
                    className={cn('fp-error-server-btn', providerPick === provider.id && 'is-on')}
                    aria-pressed={providerPick === provider.id}
                    onClick={() => { if (providerPick === provider.id) void beginSession(); else pickProvider(provider.id); }}
                  >
                    <span className="fp-error-server-name">{provider.label}</span>
                    <span className="fp-error-server-meta">{provider.meta}</span>
                  </button>
                ))}
              </div>
            )}
            <button type="button" className="fp-error-retry-btn" onClick={() => void beginSession()}>Try again</button>
          </div>
        </div>
      )}

      {/* Buffer indicator */}
      <AnimatePresence>
        {session === 'ready' && (buffering || switchingQuality) && (
          <div className="fp-buffer-indicator" aria-live="polite">
            <div className="fp-buffer-pill">
              <span className="fp-buffer-dot" aria-hidden />
              <span className="fp-buffer-dot" aria-hidden />
              <span className="fp-buffer-dot" aria-hidden />
              <span className="fp-buffer-label">{switchingQuality ? 'Switching quality' : 'Buffering'}</span>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Captions panel */}
      <AnimatePresence>
        {session === 'ready' && showSubtitlesButton && captionsOpen && (
          <motion.div
            className="fp-panel"
            role="dialog"
            aria-modal
            aria-label="Audio and subtitles"
            onMouseDown={e => e.stopPropagation()}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 440, damping: 34, mass: 0.75 }}
          >
            {CAPTIONS_LOCKED ? (
              <div className="fp-panel-main">
                <div className="fp-panel-main-head">
                  <div>
                    <h2 className="fp-panel-main-title">Subtitles</h2>
                    <p className="fp-panel-main-sub">Coming soon</p>
                  </div>
                  <button type="button" className="fp-close-btn" onClick={() => setCaptionsOpen(false)} aria-label="Close"><X strokeWidth={STROKE} /></button>
                </div>
                <div className="fp-panel-main-body">
                  <p className="fp-pane-empty">We're polishing subtitle search and styling.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Sidebar */}
                <div className="fp-panel-sidebar">
                  <div className="fp-panel-sidebar-head">
                    <span className="fp-panel-sidebar-title">Subtitles</span>
                  </div>
                  <div className="fp-panel-sidebar-body">
                    <button type="button" className={cn('fp-nav-item', captionsTab === 'tracks' && 'is-active')} onClick={() => setCaptionsTab('tracks')}>
                      <span className="fp-nav-item__icon"><Search width={14} height={14} strokeWidth={2} /></span>
                      <span className="fp-nav-item__content">
                        <span className="fp-nav-item__label">Tracks</span>
                        <span className="fp-nav-item__value">{captionTracks.length} available</span>
                      </span>
                    </button>
                    <button type="button" className={cn('fp-nav-item', captionsTab === 'style' && 'is-active')} onClick={() => setCaptionsTab('style')}>
                      <span className="fp-nav-item__icon"><SlidersHorizontal width={14} height={14} strokeWidth={2} /></span>
                      <span className="fp-nav-item__content">
                        <span className="fp-nav-item__label">Appearance</span>
                        <span className="fp-nav-item__value">Customize style</span>
                      </span>
                    </button>
                  </div>
                </div>

                {/* Main content */}
                <div className="fp-panel-main">
                  <div className="fp-panel-main-head">
                    <div>
                      <h2 className="fp-panel-main-title">{captionsTab === 'tracks' ? 'Select Track' : 'Subtitle Style'}</h2>
                      <p className="fp-panel-main-sub">
                        {captionsTab === 'tracks' ? `${filteredCaptions.length} of ${captionTracks.length} tracks` : 'Changes apply instantly'}
                      </p>
                    </div>
                    <button type="button" className="fp-close-btn" onClick={() => setCaptionsOpen(false)} aria-label="Close subtitles"><X strokeWidth={STROKE} /></button>
                  </div>

                  {captionsTab === 'tracks' ? (
                    <>
                      <div className="fp-search">
                        <Search strokeWidth={STROKE} aria-hidden />
                        <input
                          value={captionQuery}
                          onChange={e => setCaptionQuery(e.target.value)}
                          placeholder="Search language, source…"
                          aria-label="Search subtitles"
                        />
                      </div>
                      <div className="fp-panel-main-body">
                        <button type="button" className={cn('fp-option', captionPick === CAPTIONS_OFF && 'is-selected')} onClick={() => void chooseCaption(null)}>
                          <span className="fp-option__check" aria-hidden><Check /></span>
                          <span className="fp-option__label">Off</span>
                        </button>
                        {filteredCaptions.length > 0 ? filteredCaptions.map(track => (
                          <button key={track.id} type="button" className={cn('fp-option', captionPick === track.id && 'is-selected')} onClick={() => void chooseCaption(track)}>
                            <span className="fp-option__check" aria-hidden><Check /></span>
                            {track.flagUrl ? (
                              <img className="fp-flag" src={track.flagUrl} alt="" aria-hidden loading="lazy" />
                            ) : (
                              <span className="fp-flag">{track.language.slice(0, 2).toUpperCase()}</span>
                            )}
                            <span className="fp-option__body">
                              <span className="fp-option__label">{track.label}</span>
                              <span className="fp-option__note">{[track.format?.toUpperCase() || 'SRT', track.release].filter(Boolean).join(' · ')}</span>
                            </span>
                            {captionBusyId === track.id ? <Loader2 className="fp-spinner" strokeWidth={STROKE} /> : null}
                          </button>
                        )) : (
                          <p className="fp-pane-empty">{captionTracks.length > 0 ? 'No subtitles match your search' : 'No subtitles available'}</p>
                        )}
                        {captionFailure && <p className="fp-error-note">{captionFailure}</p>}
                      </div>
                    </>
                  ) : (
                    <div key="style" className="fp-panel-main-body">
                      <div className="fp-range-group">
                        <div className="fp-range-head">
                          <span className="fp-range-label">Text size</span>
                          <span className="fp-range-value">{Math.round((captionStyle.textSize / 42) * 100)}%</span>
                        </div>
                        <input className="fp-range" type="range" min="14" max="42" value={captionStyle.textSize} onChange={e => patchCaptionStyle({ textSize: Number(e.target.value) })} aria-label="Text size" />
                        <div className="fp-range-marks"><span>Small</span><span>Large</span></div>
                      </div>

                      <div className="fp-range-group">
                        <span className="fp-range-label">Font</span>
                        <div className="fp-seg" style={{ marginTop: 6 }}>
                          {CAPTION_FONTS.map(font => (
                            <button key={font.id} type="button" className={cn('fp-seg-btn', captionStyle.fontFamily === font.id && 'is-on')} onClick={() => patchCaptionStyle({ fontFamily: font.id })}>
                              <span className="fp-seg-sample" style={{ fontFamily: font.family }}>Aa</span>
                              <span className="fp-seg-label">{font.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <ColorField title="Text color" value={captionStyle.textColor} onChange={next => patchCaptionStyle({ textColor: next })} />

                      <div className="fp-range-group">
                        <div className="fp-range-head">
                          <span className="fp-range-label">Text Opacity</span>
                          <span className="fp-range-value">{Math.round(captionStyle.textOpacity * 100)}%</span>
                        </div>
                        <input className="fp-range" type="range" min="20" max="100" value={Math.round(captionStyle.textOpacity * 100)} onChange={e => patchCaptionStyle({ textOpacity: Number(e.target.value) / 100 })} />
                      </div>

                      <ColorField title="Background color" value={captionStyle.backgroundColor} onChange={next => patchCaptionStyle({ backgroundColor: next })} />

                      <div className="fp-range-group">
                        <div className="fp-range-head">
                          <span className="fp-range-label">Background Opacity</span>
                          <span className="fp-range-value">{Math.round(captionStyle.backgroundOpacity * 100)}%</span>
                        </div>
                        <input className="fp-range" type="range" min="0" max="100" value={Math.round(captionStyle.backgroundOpacity * 100)} onChange={e => patchCaptionStyle({ backgroundOpacity: Number(e.target.value) / 100 })} />
                      </div>

                      <div className="fp-action-row" style={{ marginTop: 8 }}>
                        <button type="button" className="fp-action-btn fp-action-btn--primary" onClick={openPlacer}>Position</button>
                        <button type="button" className="fp-action-btn" onClick={resetCaptionStyle}>Reset</button>
                      </div>

                      <div style={{ padding: '12px 0 4px' }}>
                        <p className="fp-range-label" style={{ marginBottom: 6 }}>Preview</p>
                        <div className="fp-subs" style={{ position: 'relative', left: 'auto', top: 'auto', transform: 'none', maxWidth: '100%', paddingTop: 4 }}>
                          <span className="fp-subs__line" style={styleLine}>Subtitle preview text</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause screen */}
      <AnimatePresence>
        {pauseCardVisible && !embedSrc && (
          <motion.div
            className="fp-pause-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Volume HUD — rendered above the chrome so it can never be clipped by
          the seekbar/control layer. Also provides visible feedback for the
          ArrowUp / ArrowDown volume keybinds. */}
      <AnimatePresence>

        {volumeHud && (

          <motion.div

            key="volume-hud"

            className="fp-volume-hud"

            initial={{ opacity: 0, y: -5, scale: 0.98 }}

            animate={{ opacity: 1, y: 0, scale: 1 }}

            exit={{ opacity: 0, y: -3, scale: 0.99 }}

            transition={{ duration: 0.14, ease: "easeOut" }}

            role="status"

            aria-live="polite"

            aria-label={`Volume ${volumeHud.percent}%`}

          >

            <div className="fp-volume-hud__icon">

              {volumeHud.percent === 0

                ? <VolumeX width={15} height={15} strokeWidth={1.8} />

                : volumeHud.percent > 50

                  ? <Volume2 width={15} height={15} strokeWidth={1.8} />

                  : <Volume1 width={15} height={15} strokeWidth={1.8} />}

            </div>

            <span className="fp-volume-hud__value">{volumeHud.percent}%</span>

            <span className="fp-volume-hud__delta">

              {volumeHud.delta > 0 ? "+" : ""}{Math.round(volumeHud.delta * 100)}%

            </span>

            <span className="fp-volume-hud__track" aria-hidden="true">

              <span style={{ width: `${volumeHud.percent}%` }} />

            </span>

          </motion.div>

        )}

      </AnimatePresence>

      {/* Settings panel */}
      {session === 'ready' && (
        <AnimatePresence>
          {chromeUp && (
            <motion.div
              className="fp-chrome"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.26, ease: 'easeOut' }}
            >
              {/* Pause metadata */}
              {pauseCardVisible && !embedSrc && (
                <div className="fp-pause-info">
                  {resolvedLogoUrl ? <img className="fp-pause-logo" src={resolvedLogoUrl} alt="" /> : null}
                  <h2 className="fp-pause-title">{resolvedTitle}</h2>
                  {type === 'series' && resolvedEpisodeTitle ? <p className="fp-pause-episode">{resolvedEpisodeTitle}</p> : null}
                  {type === 'series' ? (
                    <p className="fp-pause-season">Season {season ?? '—'} · Episode {episode ?? '—'}</p>
                  ) : null}
                  <div className="fp-pause-meta">
                    {formattedReleaseDate ? <span>{formattedReleaseDate}</span> : null}
                    {formattedRating ? <span className="fp-pause-rating">★ {formattedRating}</span> : null}
                  </div>
                  {resolvedDescription ? <p className="fp-pause-desc">{resolvedDescription}</p> : null}
                </div>
              )}

              {/* Seek timeline */}
              <div className="fp-timeline">
                {!embedSrc ? (
                  <>
                    <span className="fp-time-current">{currentLabel}</span>
                    <SeekBar
                      percent={playedPct}
                      spans={bufferSpans}
                      onSeek={onScrub}
                      paused={!rolling}
                      duration={total}
                      frame={preview.frame}
                      onHoverTime={preview.askPreview}
                      showPreview={prefs.showPreviewThumbnails}
                    />
                    <span className="fp-time-total">{rightTimeLabel}</span>
                  </>
                ) : (
                  <div className="fp-rail-zone" aria-hidden>
                    <div className="fp-rail" />
                  </div>
                )}
              </div>

              {/* Controls row */}
              <div className="fp-controls">
                <div className="fp-cluster-left">
                  {!embedSrc && (
                    <>
                      <PlayButton rolling={rolling} onClick={toggleRolling} />
                      <SkipButton way="back" step={prefs.seekStep} onClick={() => { wake(); nudgeTime(-prefs.seekStep); }} />
                      <SkipButton way="ahead" step={prefs.seekStep} onClick={() => { wake(); nudgeTime(prefs.seekStep); }} />

                      <div className="fp-vol-group">
                        <IconBtn onClick={toggleHush} label={hushed ? 'Unmute' : 'Mute'}>
                          {hushed
                            ? <VolumeX {...ICON} strokeWidth={STROKE} />
                            : volume > 0.5
                              ? <Volume2 {...ICON} strokeWidth={STROKE} />
                              : <Volume1 {...ICON} strokeWidth={STROKE} />}
                        </IconBtn>
                        <div className="fp-vol-slider" aria-label="Volume control">
                          <VolumeRail
                            percent={(hushed ? 0 : volume) * 100}
                            onPercent={setVolumePct}
                            onPreviewPercent={() => {}}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Center title */}
                <div className="fp-cluster-center">
                  <span className="fp-title-name">{resolvedTitle}</span>
                  <span className="fp-title-ep">{headingEpLabel}</span>
                  {type === 'series' && resolvedEpisodeTitle && <span className="fp-title-ep-name">{resolvedEpisodeTitle}</span>}
                </div>

                {/* Right controls */}
                <div className="fp-cluster-right">
                  {canGoNextEpisode && onNextEpisode && !embedSrc && (
                    <IconBtn onClick={goNextNow} label="Next episode">
                      <SkipForward {...ICON} strokeWidth={STROKE} />
                    </IconBtn>
                  )}

                  {showSubtitlesButton && (
                    <IconBtn
                      onClick={() => { setSettingsOpen(false); setCaptionsTab('tracks'); setCaptionsOpen(o => !o); }}
                      label="Subtitles"
                      menuTrigger
                      active={captionPick !== CAPTIONS_OFF}
                      expanded={captionsOpen}
                    >
                      <Captions {...ICON} strokeWidth={STROKE} />
                    </IconBtn>
                  )}

                  {!embedSrc && (
                    <IconBtn
                      onClick={() => { setSettingsOpen(false); setCaptionsOpen(false); setPrefsOpen(p => !p); }}
                      label="Preferences"
                      menuTrigger
                      expanded={prefsOpen}
                    >
                      <Sliders {...ICON} strokeWidth={STROKE} />
                    </IconBtn>
                  )}

                  {!embedSrc && (
                    <div ref={settingsPanelRef}>
                      <IconBtn
                        onClick={() => { setCaptionsOpen(false); setSettingsOpen(o => !o); }}
                        label="Settings"
                        menuTrigger
                        expanded={settingsOpen}
                      >
                        <Settings {...ICON} strokeWidth={STROKE} />
                      </IconBtn>

                      <AnimatePresence>
                        {settingsOpen && (
                          <motion.div
                            className="fp-panel"
                            role="dialog"
                            aria-label="Playback settings"
                            onMouseDown={e => e.stopPropagation()}
                            initial={{ opacity: 0, y: 14, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.985 }}
                            transition={{ type: 'spring', stiffness: 440, damping: 34, mass: 0.75 }}
                          >
                            {/* Settings sidebar */}
                            <div className="fp-panel-sidebar">
                              <div className="fp-panel-sidebar-head">
                                <span className="fp-panel-sidebar-title">Settings</span>
                              </div>
                              <div className="fp-panel-sidebar-body">
                                <button type="button" className={cn('fp-nav-item', settingsSection === 'quality' && 'is-active')} onClick={() => setSettingsSection('quality')}>
                                  <span className="fp-nav-item__icon"><Gauge width={14} height={14} strokeWidth={2} /></span>
                                  <span className="fp-nav-item__content">
                                    <span className="fp-nav-item__label">Quality</span>
                                    <span className="fp-nav-item__value">{qualityBadge}</span>
                                  </span>
                                </button>
                                {providerSwitchAllowed && (
                                  <button type="button" className={cn('fp-nav-item', settingsSection === 'server' && 'is-active')} onClick={() => setSettingsSection('server')}>
                                    <span className="fp-nav-item__icon"><Server width={14} height={14} strokeWidth={2} /></span>
                                    <span className="fp-nav-item__content">
                                      <span className="fp-nav-item__label">Server</span>
                                      <span className="fp-nav-item__value">{sourceName}</span>
                                    </span>
                                  </button>
                                )}
                                <button type="button" className={cn('fp-nav-item', settingsSection === 'speed' && 'is-active')} onClick={() => setSettingsSection('speed')}>
                                  <span className="fp-nav-item__icon"><Zap width={14} height={14} strokeWidth={2} /></span>
                                  <span className="fp-nav-item__content">
                                    <span className="fp-nav-item__label">Speed</span>
                                    <span className="fp-nav-item__value">{rate}×</span>
                                  </span>
                                </button>
                              </div>
                            </div>

                            {/* Settings main */}
                            <div className="fp-panel-main">
                              <div className="fp-panel-main-head">
                                <div>
                                  <h2 className="fp-panel-main-title">
                                    {settingsSection === 'quality' ? 'Video Quality' : settingsSection === 'server' ? 'Server' : 'Playback Speed'}
                                  </h2>
                                  <p className="fp-panel-main-sub">
                                    {settingsSection === 'quality' ? 'Adjust stream resolution' : settingsSection === 'server' ? 'Stream source server' : 'Watch at a different pace'}
                                  </p>
                                </div>
                              </div>
                              <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                  key={settingsSection}
                                  className="fp-panel-main-body"
                                  initial={{ opacity: 0, x: 10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -8 }}
                                  transition={{ duration: 0.18, ease: 'easeOut' }}
                                >
                                {settingsSection === 'quality' && (
                                  qualityMenu.length > 0 ? qualityMenu.map(option => {
                                    const note = qualityNote(option.label);
                                    return (
                                      <button key={option.id} type="button" className={cn('fp-option', pickedQuality === option.id && 'is-selected')} onClick={() => pickQuality(option)}>
                                        <span className="fp-option__check" aria-hidden><Check /></span>
                                        <span className="fp-option__body">
                                          <span className="fp-option__label">{option.label}</span>
                                          {note && <span className="fp-option__note">{note}</span>}
                                        </span>
                                      </button>
                                    );
                                  }) : <p className="fp-pane-empty">No quality options</p>
                                )}

                                {settingsSection === 'server' && providerSwitchAllowed && providerEntries.map(provider => (
                                  <button key={provider.id} type="button" className={cn('fp-option', providerPick === provider.id && 'is-selected')} aria-pressed={providerPick === provider.id} onClick={() => pickProvider(provider.id)}>
                                    <span className="fp-option__check" aria-hidden><Check /></span>
                                    <span className="fp-option__body">
                                      <span className="fp-option__label">{provider.label}</span>
                                      {provider.meta && <span className="fp-option__note">{provider.meta}</span>}
                                    </span>
                                  </button>
                                ))}

                                {settingsSection === 'speed' && SPEEDS.map(speed => (
                                  <button key={speed} type="button" className={cn('fp-option', rate === speed && 'is-selected')} aria-pressed={rate === speed}
                                    onClick={() => { setPlaybackRate(speed); setSettingsOpen(false); }}>
                                    <span className="fp-option__check" aria-hidden><Check /></span>
                                    <span className="fp-option__body">
                                      <span className="fp-option__label">{speed}×</span>
                                      {speed === 1 && <span className="fp-option__note">Normal speed</span>}
                                    </span>
                                  </button>
                                ))}
                                </motion.div>
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <IconBtn onClick={() => void toggleFullscreen()} label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                    {fullscreen ? <Minimize {...ICON} strokeWidth={STROKE} /> : <Maximize {...ICON} strokeWidth={STROKE} />}
                  </IconBtn>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
