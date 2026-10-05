import { wrapStreamUrl } from './fingerApi';

export interface M3u8QualityOption {
  id: string;
  label: string;
  variantUrl?: string;
  height?: number;
  width?: number;
  bandwidth?: number;
  tier?: number;
  hlsLevel?: number;
}

const MAX_NESTED_DEPTH = 2;

function parseStreamInfAttrs(line: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const body = line.replace('#EXT-X-STREAM-INF:', '');
  const re = /([A-Z0-9-]+)=("[^"]*"|[^,]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    const key = match[1];
    let value = match[2];
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    attrs[key] = value;
  }
  return attrs;
}

function resolvePlaylistUrl(baseUrl: string, relativeOrAbsolute: string): string {
  if (/^https?:\/\//i.test(relativeOrAbsolute)) return relativeOrAbsolute;
  try {
    return new URL(relativeOrAbsolute, baseUrl).toString();
  } catch {
    return relativeOrAbsolute;
  }
}

function decodeBase64Segment(segment: string): string | null {
  if (!/^[A-Za-z0-9+/=_-]+$/.test(segment) || segment.length < 2) return null;
  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return atob(padded);
  } catch {
    return null;
  }
}

export function parseQualityFromUrl(url?: string): number | undefined {
  if (!url) return undefined;

  const lower = url.toLowerCase();
  if (/2160|4k|uhd/.test(lower)) return 2160;

  for (const segment of url.split('/')) {
    if (!segment) continue;

    if (/^2160$|^4k$|^uhd$/i.test(segment)) return 2160;
    const plain = segment.match(/^(\d{3,4})$/);
    if (plain) {
      const value = parseInt(plain[1], 10);
      if (value >= 2160) return 2160;
      if (value >= 144) return value;
    }

    const decoded = decodeBase64Segment(segment);
    if (!decoded) continue;
    if (/^2160$|^4k$|^uhd$/i.test(decoded)) return 2160;
    const decodedNum = decoded.match(/^(\d{3,4})$/);
    if (decodedNum) {
      const value = parseInt(decodedNum[1], 10);
      if (value >= 2160) return 2160;
      if (value >= 144) return value;
    }
  }

  return undefined;
}

function parseQualityFromName(name?: string): number | undefined {
  if (!name?.trim()) return undefined;
  const n = name.trim().toLowerCase();
  if (n === '4k' || n === 'uhd' || n === '2160' || n === '2160p') return 2160;
  const match = n.match(/^(\d{3,4})p?$/);
  if (match) {
    const value = parseInt(match[1], 10);
    return value >= 2160 ? 2160 : value;
  }
  if (n.includes('4k') || n.includes('2160')) return 2160;
  return undefined;
}

export function resolveQualityTier(input: {
  height?: number;
  width?: number;
  bandwidth?: number;
  name?: string;
  url?: string;
}): number | undefined {
  const fromName = parseQualityFromName(input.name);
  if (fromName) return fromName;

  if (input.height && input.height >= 2160) return 2160;
  if (input.width && input.width >= 3840) return 2160;
  if (input.height && input.height > 0) return input.height;

  const fromUrl = parseQualityFromUrl(input.url);
  if (fromUrl) return fromUrl;

  if (input.bandwidth && input.bandwidth >= 12_000_000) return 2160;
  if (input.bandwidth && input.bandwidth >= 8_000_000) return 2160;
  if (input.bandwidth && input.bandwidth >= 3_000_000) return 1080;
  if (input.bandwidth && input.bandwidth >= 1_500_000) return 720;
  if (input.bandwidth && input.bandwidth >= 800_000) return 480;

  return undefined;
}

export function formatQualityLabel(tier?: number, name?: string): string {
  const fromName = parseQualityFromName(name);
  if (fromName && fromName >= 2160) return '4K';
  if (name?.trim()) {
    const trimmed = name.trim();
    if (/^4k$/i.test(trimmed) || /^2160p?$/i.test(trimmed) || /^uhd$/i.test(trimmed)) return '4K';
    if (/^\d{3,4}p?$/i.test(trimmed)) {
      const h = parseInt(trimmed, 10);
      return h >= 2160 ? '4K' : `${h}p`;
    }
    return trimmed;
  }

  if (!tier) return 'Auto';
  if (tier >= 2160) return '4K';
  return `${tier}p`;
}

function isMasterPlaylist(text: string): boolean {
  return text.includes('#EXT-X-STREAM-INF');
}

function dedupeVariants(variants: M3u8QualityOption[]): M3u8QualityOption[] {
  const byTier = new Map<number, M3u8QualityOption>();

  for (const variant of variants) {
    const tier =
      variant.tier ??
      resolveQualityTier({
        height: variant.height,
        width: variant.width,
        bandwidth: variant.bandwidth,
        url: variant.variantUrl,
      });

    if (!tier) continue;

    const normalized: M3u8QualityOption = {
      ...variant,
      tier,
      label: formatQualityLabel(tier, variant.label),
    };

    const existing = byTier.get(tier);
    if (!existing || (normalized.bandwidth ?? 0) > (existing.bandwidth ?? 0)) {
      byTier.set(tier, normalized);
    }
  }

  return Array.from(byTier.values()).sort(
    (a, b) => (b.tier ?? b.height ?? b.bandwidth ?? 0) - (a.tier ?? a.height ?? a.bandwidth ?? 0)
  );
}

export function parseM3u8Qualities(playlistText: string, baseUrl: string): M3u8QualityOption[] {
  const lines = playlistText.replace(/\r/g, '').split('\n');
  const variants: M3u8QualityOption[] = [];
  let pendingInf: Record<string, string> | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      pendingInf = parseStreamInfAttrs(line);
      continue;
    }

    if (pendingInf && !line.startsWith('#')) {
      const variantUrl = resolvePlaylistUrl(baseUrl, line);
      const resolution = pendingInf.RESOLUTION;
      let width: number | undefined;
      let height: number | undefined;

      if (resolution?.includes('x')) {
        const [w, h] = resolution.split('x').map(Number);
        width = Number.isFinite(w) ? w : undefined;
        height = Number.isFinite(h) ? h : undefined;
      }

      const bandwidth = pendingInf.BANDWIDTH ? parseInt(pendingInf.BANDWIDTH, 10) : undefined;
      const name = pendingInf.NAME?.trim();
      const tier = resolveQualityTier({ height, width, bandwidth, name, url: variantUrl });
      const label = formatQualityLabel(tier, name);

      variants.push({
        id: `variant-${variants.length}`,
        label,
        variantUrl,
        height: tier && tier >= 2160 ? 2160 : height ?? tier,
        width,
        bandwidth,
        tier,
      });
      pendingInf = null;
    }
  }

  return dedupeVariants(variants);
}

async function fetchPlaylistText(url: string): Promise<string> {
  if (/\.(mp4|webm|mkv|mov|m4v)(\?|$)/i.test(url)) {
    throw new Error('Not an HLS playlist');
  }

  const res = await fetch(wrapStreamUrl(url));
  if (!res.ok) {
    throw new Error(`Failed to read m3u8 manifest (${res.status})`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (/video\/(mp4|webm)/i.test(contentType)) {
    throw new Error('Not an HLS playlist');
  }

  const contentLength = Number(res.headers.get('content-length') || 0);
  if (contentLength > 2_000_000) {
    throw new Error('Playlist too large');
  }

  return res.text();
}

async function expandNestedVariants(
  variants: M3u8QualityOption[],
  depth: number
): Promise<M3u8QualityOption[]> {
  if (depth >= MAX_NESTED_DEPTH) return variants;

  const expanded: M3u8QualityOption[] = [];

  for (const variant of variants) {
    if (!variant.variantUrl) {
      expanded.push(variant);
      continue;
    }

    try {
      const subText = await fetchPlaylistText(variant.variantUrl);
      if (isMasterPlaylist(subText)) {
        const nested = parseM3u8Qualities(subText, variant.variantUrl);
        if (nested.length > 0) {
          const deeper = await expandNestedVariants(nested, depth + 1);
          expanded.push(...deeper);
          continue;
        }
      }
    } catch {
      /* keep original variant */
    }

    expanded.push(variant);
  }

  return dedupeVariants(expanded);
}

export async function fetchM3u8Qualities(masterUrl: string): Promise<M3u8QualityOption[]> {
  const text = await fetchPlaylistText(masterUrl);
  let variants = parseM3u8Qualities(text, masterUrl);

  if (variants.length > 0) {
    variants = await expandNestedVariants(variants, 0);
  }

  return variants;
}

export async function buildM3u8QualityMenu(masterUrl: string): Promise<M3u8QualityOption[]> {
  const variants = await fetchM3u8Qualities(masterUrl);

  const auto: M3u8QualityOption = {
    id: 'auto',
    label: 'Auto',
    hlsLevel: -1,
  };

  if (variants.length === 0) {
    return [auto];
  }

  if (variants.length === 1) {
    return [{ ...variants[0], id: 'auto', label: variants[0].label, hlsLevel: 0 }];
  }

  return [auto, ...variants];
}

export function mapVariantsToHlsLevels(
  options: M3u8QualityOption[],
  levels: Array<{ height?: number; width?: number; bitrate?: number; url?: string | string[] }>
): M3u8QualityOption[] {
  if (levels.length === 0) return options;

  return options.map(option => {
    if (option.id === 'auto') return option;
    if (option.hlsLevel != null && option.hlsLevel >= 0) return option;

    const optionTier =
      option.tier ??
      resolveQualityTier({
        height: option.height,
        width: option.width,
        bandwidth: option.bandwidth,
        url: option.variantUrl,
      });

    if (!optionTier) return option;

    let bestIndex = -1;
    let bestScore = Infinity;

    levels.forEach((level, index) => {
      const levelTier =
        resolveQualityTier({
          height: level.height,
          width: level.width,
          bandwidth: level.bitrate,
          url: Array.isArray(level.url) ? level.url[0] : level.url,
        }) ?? level.height;

      if (!levelTier) return;

      const tierDiff = Math.abs(levelTier - optionTier);
      const heightDiff =
        option.height && level.height ? Math.abs(level.height - option.height) : tierDiff * 100;
      const bitrateDiff =
        option.bandwidth && level.bitrate
          ? Math.abs(level.bitrate - option.bandwidth)
          : tierDiff * 1000;

      const score = heightDiff * 10 + bitrateDiff / 1000 + tierDiff * 50;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    if (bestIndex >= 0 && bestScore < 8000) {
      const level = levels[bestIndex];
      const tier =
        resolveQualityTier({
          height: level.height,
          width: level.width,
          bandwidth: level.bitrate,
          url: Array.isArray(level.url) ? level.url[0] : level.url,
        }) ?? optionTier;
      return {
        ...option,
        hlsLevel: bestIndex,
        tier,
        label: formatQualityLabel(tier),
      };
    }

    return option;
  });
}

export function formatHlsLevelLabel(level: {
  height?: number;
  width?: number;
  bitrate?: number;
  name?: string;
  url?: string | string[];
}): string {
  const tier = resolveQualityTier({
    height: level.height,
    width: level.width,
    bandwidth: level.bitrate,
    name: level.name,
    url: Array.isArray(level.url) ? level.url[0] : level.url,
  });

  return formatQualityLabel(tier, level.name);
}

export function buildQualityMenuFromHlsLevels(
  levels: Array<{ height?: number; width?: number; bitrate?: number; name?: string; url?: string | string[] }>
): M3u8QualityOption[] {
  const auto: M3u8QualityOption = { id: 'auto', label: 'Auto', hlsLevel: -1 };

  if (levels.length === 0) return [auto];

  const mapped = levels.map((level, index) => {
    const tier =
      resolveQualityTier({
        height: level.height,
        width: level.width,
        bandwidth: level.bitrate,
        name: level.name,
        url: Array.isArray(level.url) ? level.url[0] : level.url,
      }) ?? level.height;

    return {
      id: `level-${index}`,
      label: formatHlsLevelLabel(level),
      hlsLevel: index,
      height: level.height,
      width: level.width,
      bandwidth: level.bitrate,
      tier,
    };
  });

  const deduped = dedupeVariants(mapped);
  return deduped.length > 0 ? [auto, ...deduped] : [auto, ...mapped];
}

export function mergeQualityMenus(
  manifestOptions: M3u8QualityOption[],
  hlsOptions: M3u8QualityOption[]
): M3u8QualityOption[] {
  const auto = manifestOptions.find(o => o.id === 'auto') ??
    hlsOptions.find(o => o.id === 'auto') ?? { id: 'auto', label: 'Auto', hlsLevel: -1 };

  const byTier = new Map<number, M3u8QualityOption>();

  for (const option of [...manifestOptions, ...hlsOptions]) {
    if (option.id === 'auto') continue;
    const tier =
      option.tier ??
      resolveQualityTier({
        height: option.height,
        width: option.width,
        bandwidth: option.bandwidth,
        url: option.variantUrl,
      });
    if (!tier) continue;

    const existing = byTier.get(tier);
    const merged: M3u8QualityOption = {
      ...existing,
      ...option,
      tier,
      label: formatQualityLabel(tier, option.label),
      hlsLevel: option.hlsLevel ?? existing?.hlsLevel,
      variantUrl: option.variantUrl ?? existing?.variantUrl,
    };

    if (!existing || (merged.bandwidth ?? 0) >= (existing.bandwidth ?? 0)) {
      byTier.set(tier, merged);
    }
  }

  const variants = Array.from(byTier.values()).sort(
    (a, b) => (b.tier ?? 0) - (a.tier ?? 0)
  );

  if (variants.length === 0) return [auto];
  if (variants.length === 1) return [{ ...variants[0], id: 'auto', hlsLevel: variants[0].hlsLevel ?? 0 }];
  return [auto, ...variants];
}
