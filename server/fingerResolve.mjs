import { probeDigitalsunHlsPlayback } from './streamProxy.mjs';
import { decryptMovySources } from './movyDecrypt.mjs';

const ENC_BASE = 'https://enc-dec.app/api';
const VIDLINK_BASE = 'https://vidlink.pro/api/b';
const VIDFAST_BASE = 'https://vidfast.vc';
const VIDFAST_VERSION = '1';
const MOVY_STREAM_API = 'https://api.wecollege.net';
const MOVY_ORIGIN = 'https://www.movy.sx';
const LORDFLIX_SNOWHOUSE = 'https://snowhouse.lordflix.club';
const LEG_FLIXER_EXTRACT = 'https://media-proxy.vynx-3b3.workers.dev/flixer/extract-all';
const ICIFY_BASE = 'https://streams.icefy.top';
const YTHD_BASE = 'https://ythd.org';
const YTHD_STREAM_API = 'https://data.vidsrc.sh/api.php';
const YTHD_PLAYER_ORIGIN = 'https://cloudorchestranova.com';
const VIDEASY_BASE = 'https://api.videasy.to';
const VIXSRC_BASE = 'https://vixsrc.to';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

const VIDLINK_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent': USER_AGENT,
  Connection: 'keep-alive',
  Referer: 'https://vidlink.pro/',
  Origin: 'https://vidlink.pro',
};

const VIDFAST_HEADERS = {
  Accept: '*/*',
  'User-Agent': USER_AGENT,
  Referer: `${VIDFAST_BASE}/`,
  'X-Requested-With': 'XMLHttpRequest',
};

const LORDFLIX_HEADERS = {
  Accept: '*/*',
  Origin: 'https://lordflix.org',
  Referer: 'https://lordflix.org/',
  'User-Agent': USER_AGENT,
};

const ICIFY_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: ICIFY_BASE,
  Origin: ICIFY_BASE,
};

const YTHD_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: `${YTHD_BASE}/`,
  Origin: YTHD_BASE,
};

const YTHD_STREAM_API_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: `${YTHD_PLAYER_ORIGIN}/`,
  Origin: YTHD_PLAYER_ORIGIN,
};

const YTHD_STREAM_CDN_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: `${YTHD_PLAYER_ORIGIN}/`,
  Origin: YTHD_PLAYER_ORIGIN,
};

const YTHD_STREAM_CDN_HOST_MARKERS = [
  'penumbrapalimpsest.space',
  'palimpsest.space',
  'antilogarithm-atlas.site',
  'atlas.site',
];

/** @type {Map<string, Promise<WebAssembly.Module>>} */
const ythdWasmModuleCache = new Map();

const VIDEASY_HEADERS = {
  Accept: '*/*',
  Origin: 'https://player.videasy.to',
  Referer: 'https://player.videasy.to/',
  'User-Agent': USER_AGENT,
};

const VIXSRC_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: `${VIXSRC_BASE}/`,
  Origin: VIXSRC_BASE,
};

const VIDEASY_PROVIDERS = {
  'videasy-neon': { server: 'mb-flix', label: 'Neon' },
  'videasy-yoru': { server: 'cdn', label: 'Yoru' },
  'videasy-cypher': { server: 'downloader2', label: 'Cypher' },
  'videasy-sage': { server: '1movies', label: 'Sage' },
  'videasy-breach': { server: 'm4uhd', label: 'Breach' },
  'videasy-vyse': { server: 'hdmovie', label: 'Vyse', quality: 'English' },
  'videasy-killjoy': {
    server: 'meine',
    label: 'Killjoy',
    language: 'german',
  },
  'videasy-fade': { server: 'hdmovie', label: 'Fade', quality: 'Hindi' },
  'videasy-omen': { server: 'lamovie', label: 'Omen' },
  'videasy-raze': { server: 'superflix', label: 'Raze' },
};

const LORDFLIX_FALLBACK_SERVERS = [
  'Berlin',
  'Backrooms',
  'Marseille',
  'Phoenix',
  'Oslo',
  'Luna',
];

const PROVIDER_LABELS = {
  fingerapi: 'Finger',
  lordflix: 'Toe',
  vidfast: 'Vidfast',
  movy: 'Movy',
  vixsrc: 'VixSrc',
  leg: 'Leg',
  icefy: 'Eye',
  ythd: 'YTHD',
  ...Object.fromEntries(
    Object.entries(VIDEASY_PROVIDERS).map(([providerId, provider]) => [
      providerId,
      provider.label,
    ])
  ),
};

/**
 * @param {string} path e.g. "tv/2316/9/23" or "movie/550"
 */
function parseFingerPath(path) {
  const normalized = String(path || '').replace(/^\/+/, '');
  const match = normalized.match(/^(movie|tv)\/(\d+)(?:\/(\d+)\/(\d+))?$/);

  if (!match) {
    const err = new Error('Invalid Finger API path');
    err.statusCode = 400;
    throw err;
  }

  const [, mediaType, tmdbId, season, episode] = match;
  return { mediaType, tmdbId, season, episode };
}

function assertPlayableStreams(streams) {
  if (Object.keys(streams).length === 0) {
    const err = new Error('Stream payload contained no playable URLs');
    err.statusCode = 404;
    throw err;
  }
}

function isProbablyHtml(text) {
  const trimmed = String(text || '').trimStart().slice(0, 2048).toLowerCase();
  return (
    trimmed.startsWith('<!doctype html') ||
    trimmed.startsWith('<html') ||
    trimmed.includes('<title>attention required') ||
    trimmed.includes('cloudflare ray id') ||
    trimmed.includes('you have been blocked')
  );
}

function isPotentialPlayableUrl(url) {
  const value = String(url || '');
  if (/^https?:\/\/.+\.(m3u8|mp4)(\?|$)/i.test(value)) return true;
  try {
    const parsed = new URL(value);
    return parsed.hostname.toLowerCase().includes('vixsrc.to') && parsed.pathname.includes('/playlist/');
  } catch {
    return false;
  }
}

async function readJsonResponse(res, name) {
  try {
    return await res.json();
  } catch {
    const err = new Error(`Invalid JSON from ${name}`);
    err.statusCode = 502;
    throw err;
  }
}

function validateEncDecPayload(payload, name) {
  if (payload?.status && payload.status !== 200) {
    const err = new Error(payload.error || `${name} returned status ${payload.status}`);
    err.statusCode = payload.status === 404 ? 404 : 502;
    throw err;
  }

  if (!payload?.result) {
    const err = new Error(`${name} returned no result`);
    err.statusCode = 502;
    throw err;
  }

  return payload.result;
}

function getTmdbApiKey(options = {}) {
  return (
    options?.env?.TMDB_API_KEY ||
    options?.env?.VITE_TMDB_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.TMDB_API_KEY || process.env?.VITE_TMDB_API_KEY : '') ||
    ''
  );
}

/**
 * @param {'movie' | 'tv'} mediaType
 * @param {string} tmdbId
 * @param {string | undefined} provided
 */
async function resolveImdbId(mediaType, tmdbId, provided) {
  const trimmed = String(provided || '').trim();
  if (trimmed) return trimmed;

  const apiKey = getTmdbApiKey();
  if (!apiKey) {
    const err = new Error('Toe requires an IMDB id (pass imdbId or configure TMDB_API_KEY)');
    err.statusCode = 400;
    throw err;
  }

  const detailPath = mediaType === 'movie' ? 'movie' : 'tv';
  const detailRes = await fetch(
    `https://api.themoviedb.org/3/${detailPath}/${tmdbId}?api_key=${encodeURIComponent(apiKey)}`
  );
  if (!detailRes.ok) {
    const err = new Error(`TMDB lookup returned ${detailRes.status}`);
    err.statusCode = 502;
    throw err;
  }

  const detail = await readJsonResponse(detailRes, 'TMDB');
  if (detail?.imdb_id) return detail.imdb_id;

  const externalRes = await fetch(
    `https://api.themoviedb.org/3/${detailPath}/${tmdbId}/external_ids?api_key=${encodeURIComponent(apiKey)}`
  );
  if (!externalRes.ok) {
    const err = new Error(`TMDB external ids returned ${externalRes.status}`);
    err.statusCode = 502;
    throw err;
  }

  const external = await readJsonResponse(externalRes, 'TMDB external ids');
  const imdbId = external?.imdb_id;
  if (!imdbId) {
    const err = new Error('No IMDB id found for this title');
    err.statusCode = 404;
    throw err;
  }

  return imdbId;
}

async function fetchLordflixServers() {
  try {
    const res = await fetch(`${LORDFLIX_SNOWHOUSE}/servers`, {
      headers: LORDFLIX_HEADERS,
    });
    if (!res.ok) return LORDFLIX_FALLBACK_SERVERS;

    const payload = await readJsonResponse(res, 'Toe servers');
    const names = Array.isArray(payload?.servers)
      ? payload.servers
          .filter(server => server?.status === 'ok' && server?.name)
          .map(server => server.name)
      : [];

    return names.length > 0 ? names : LORDFLIX_FALLBACK_SERVERS;
  } catch {
    return LORDFLIX_FALLBACK_SERVERS;
  }
}

function qualityKey(quality) {
  const value = String(quality || '').trim();
  const match = value.match(/(\d{3,4})p?/i);
  return match?.[1] ?? (value || 'hls');
}

function normalizeKnownSources(result) {
  const streams = {};
  const sources = Array.isArray(result?.sources) ? result.sources : [];

  for (const source of sources) {
    const url = source?.url || source?.file || source?.playlist;
    if (!url || typeof url !== 'string') continue;
    const key = qualityKey(source?.quality || source?.label || source?.name);
    if (!streams[key]) streams[key] = url;
  }

  if (sources.length === 1 && !streams.hls) {
    const only = sources[0]?.url || sources[0]?.file;
    if (only) streams.hls = only;
  }

  return streams;
}

function collectPlayableUrls(value, found = []) {
  if (!value) return found;

  if (typeof value === 'string') {
    if (isPotentialPlayableUrl(value)) {
      found.push(value);
    }
    return found;
  }

  if (Array.isArray(value)) {
    value.forEach(item => collectPlayableUrls(item, found));
    return found;
  }

  if (typeof value === 'object') {
    Object.values(value).forEach(item => collectPlayableUrls(item, found));
  }

  return found;
}

async function decryptVidfastText(text) {
  const res = await fetch(`${ENC_BASE}/dec-vidfast`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, version: VIDFAST_VERSION }),
  });
  if (!res.ok) {
    const err = new Error(`Vidfast decrypt returned ${res.status}`);
    err.statusCode = 502;
    throw err;
  }

  return validateEncDecPayload(await readJsonResponse(res, 'Vidfast decrypt'), 'Vidfast decrypt');
}

async function verifyHlsManifest(url, headers = {}) {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
        'User-Agent': USER_AGENT,
        ...headers,
      },
      redirect: 'follow',
    });
    if (!res.ok) return false;

    const text = await res.text();
    return text.includes('#EXTM3U') && !isProbablyHtml(text);
  } catch {
    return false;
  }
}

function headersFromStreamUrl(url) {
  try {
    const parsed = new URL(url);
    const headersParam = parsed.searchParams.get('headers');
    if (!headersParam) return {};

    const embedded = JSON.parse(headersParam);
    const headers = {};
    const referer = embedded.referer || embedded.referrer;
    if (referer) headers.Referer = String(referer);
    if (embedded.origin) headers.Origin = String(embedded.origin);
    if (embedded['user-agent']) headers['User-Agent'] = String(embedded['user-agent']);
    return headers;
  } catch {
    return {};
  }
}

async function filterYoruPlayableStreams(streams) {
  const entries = Object.entries(streams).filter(([, url]) => /\.m3u8(\?|$)/i.test(url));
  if (entries.length <= 1) return streams;

  const results = await Promise.all(
    entries.map(async ([key, url]) => {
      const merged = { ...headersFromStreamUrl(url), ...VIDEASY_HEADERS };
      const playable = await probeDigitalsunHlsPlayback(url, merged);
      return playable ? key : null;
    })
  );

  const filtered = {};
  for (let index = 0; index < entries.length; index += 1) {
    if (results[index]) {
      filtered[entries[index][0]] = entries[index][1];
    }
  }

  return Object.keys(filtered).length > 0 ? filtered : streams;
}

async function filterReachableStreams(streams, headers = {}) {
  const reachable = {};

  for (const [key, url] of Object.entries(streams)) {
    if (!isPotentialPlayableUrl(url)) continue;

    if (/\.m3u8(\?|$)/i.test(url)) {
      // Provider headers must win over embedded URL headers (VidLink CDN needs vidlink.pro referer).
      const merged = { ...headersFromStreamUrl(url), ...headers };
      if (await verifyHlsManifest(url, merged)) {
        reachable[key] = url;
      }
      continue;
    }

    reachable[key] = url;
  }

  return reachable;
}

function normalizeProviderStreams(result) {
  const streams = normalizeKnownSources(result);

  if (Array.isArray(result?.stream)) {
    for (const entry of result.stream) {
      const playlist = entry?.playlist;
      if (!playlist || typeof playlist !== 'string') continue;

      if (!streams.hls || entry?.id === 'primary') {
        streams.hls = playlist;
      } else if (entry?.id && !streams[entry.id]) {
        streams[entry.id] = playlist;
      }
    }
  }

  const directUrl = result?.url || result?.file || result?.playlist;
  if (directUrl && typeof directUrl === 'string' && !streams.hls) {
    streams.hls = directUrl;
  }

  for (const url of collectPlayableUrls(result)) {
    if (!streams.hls && /\.m3u8(\?|$)/i.test(url)) {
      streams.hls = url;
      continue;
    }

    const alreadyListed = Object.values(streams).includes(url);
    if (!alreadyListed && !streams.unknown) {
      streams.unknown = url;
    }
  }

  return streams;
}

function normalizeVideasyStreams(result, provider) {
  const qualityFilter = String(provider?.quality || '').toLowerCase();
  if (!qualityFilter) return normalizeProviderStreams(result);

  const sources = Array.isArray(result?.sources)
    ? result.sources.filter(source =>
        String(source?.quality || source?.label || source?.name || '')
          .toLowerCase()
          .includes(qualityFilter)
      )
    : [];

  return normalizeKnownSources({ sources });
}

function encodeVideasyTitle(title) {
  return encodeURIComponent(String(title || '').trim());
}

function addEmbeddedHeaders(url, headers) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set(
      'headers',
      JSON.stringify({
        referer: headers.Referer,
        origin: headers.Origin,
        'user-agent': headers['User-Agent'],
      })
    );
    return parsed.toString();
  } catch {
    return url;
  }
}

function addEmbeddedHeadersToStreams(streams, headers) {
  return Object.fromEntries(
    Object.entries(streams).map(([key, url]) => [key, addEmbeddedHeaders(url, headers)])
  );
}

function absoluteUrl(value, baseUrl) {
  const src = String(value || '').trim();
  if (!src) return '';
  if (src.startsWith('//')) return `https:${src}`;

  try {
    return new URL(src, baseUrl).toString();
  } catch {
    return '';
  }
}

function extractYthdIframeSrc(html) {
  const text = String(html || '');
  const iframeMatch = text.match(/<iframe\b[^>]*\bid=["']player_iframe["'][^>]*\bsrc=["']([^"']+)/i);
  if (iframeMatch?.[1]) return iframeMatch[1];

  const dynamicMatch = text.match(/\bsrc:\s*["']([^"']*\/prorcp\/[^"']+)/i);
  if (dynamicMatch?.[1]) return dynamicMatch[1];

  return '';
}

function extractYthdServerUrls(html) {
  const urls = [];
  const seen = new Set();
  const text = String(html || '');

  for (const match of text.matchAll(/data-hash=["']([^"']+)["'][^>]*>([^<]+)/gi)) {
    const hash = match?.[1];
    if (!hash) continue;
    const url = `https://cloudorchestranova.com/rcp/${hash}`;
    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }

  return urls;
}

function collectYthdPlayableUrls(text, baseUrl) {
  const urls = [];
  const seen = new Set();
  const normalized = String(text || '')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&');
  const patterns = [
    /https?:\/\/[^"'<>\\\s]+?\.(?:m3u8|mp4)(?:\?[^"'<>\\\s]*)?/gi,
    /\/\/[^"'<>\\\s]+?\.(?:m3u8|mp4)(?:\?[^"'<>\\\s]*)?/gi,
  ];

  for (const pattern of patterns) {
    for (const match of normalized.matchAll(pattern)) {
      const url = absoluteUrl(match[0], baseUrl);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
    }
  }

  return urls;
}

function streamsFromUrls(urls) {
  const streams = {};

  for (const url of urls) {
    if (!isPotentialPlayableUrl(url)) continue;

    if (/\.m3u8(\?|$)/i.test(url) || /vixsrc\.to\/playlist\//i.test(url)) {
      if (!streams.hls) streams.hls = url;
      continue;
    }

    const key = qualityKey(url);
    if (!streams[key]) {
      streams[key] = url;
    } else if (!streams.unknown) {
      streams.unknown = url;
    }
  }

  return streams;
}

function ythdCdnHeadersForUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (YTHD_STREAM_CDN_HOST_MARKERS.some(marker => host.includes(marker))) {
      return YTHD_STREAM_CDN_HEADERS;
    }
  } catch {
    /* ignore */
  }

  return YTHD_HEADERS;
}

function buildYthdStreamApiUrl(mediaType, tmdbId, season, episode) {
  const type = mediaType === 'tv' ? 'tv' : 'movie';
  let url = `${YTHD_STREAM_API}?type=${encodeURIComponent(type)}&tmdb=${encodeURIComponent(tmdbId)}`;
  if (mediaType === 'tv') {
    url += `&season=${encodeURIComponent(season)}&episode=${encodeURIComponent(episode)}`;
  }
  // Bare flag required by the vidsrc stream endpoint.
  return `${url}&stream_urls`;
}

function parseYthdTokenPayload(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const json = JSON.parse(trimmed);
      if (typeof json === 'string') return json;
      if (json && typeof json === 'object') {
        return String(json.token || json.data || json.string || json.result || '');
      }
    } catch {
      /* fall through */
    }
  }
  return trimmed;
}

function applyYthdStreamToken(url, token) {
  if (!token) return url;
  if (url.includes('__TOKEN__')) return url.split('__TOKEN__').join(token);
  // Match the embed player: append raw token (JWT-safe charset).
  return `${url}${url.includes('?') ? '&' : '?'}token=${token}`;
}

async function loadYthdWasmModule(windowId, wasmUrl) {
  const cacheKey = windowId == null ? `url:${wasmUrl}` : `w:${windowId}`;
  const cached = ythdWasmModuleCache.get(cacheKey);
  if (cached) return cached;

  const pending = (async () => {
    const res = await fetch(wasmUrl, {
      headers: YTHD_STREAM_API_HEADERS,
      credentials: 'omit',
    });
    if (!res.ok) {
      const err = new Error(`YTHD wasm returned ${res.status}`);
      err.statusCode = 502;
      throw err;
    }
    return WebAssembly.compile(await res.arrayBuffer());
  })();

  ythdWasmModuleCache.set(cacheKey, pending);
  try {
    return await pending;
  } catch (err) {
    ythdWasmModuleCache.delete(cacheKey);
    throw err;
  }
}

async function decryptYthdStreamUrls(encryptedB64, vsMeta) {
  if (!encryptedB64 || !vsMeta?.wasm_url) {
    const err = new Error('YTHD stream payload missing decryptor');
    err.statusCode = 502;
    throw err;
  }

  const mod = await loadYthdWasmModule(vsMeta.w, vsMeta.wasm_url);
  const instance = await WebAssembly.instantiate(mod, {});
  const exports = instance.exports;
  if (typeof exports.alloc !== 'function' || typeof exports.decrypt !== 'function' || !exports.memory) {
    const err = new Error('YTHD decryptor exports are incomplete');
    err.statusCode = 502;
    throw err;
  }

  const encrypted = typeof Buffer !== 'undefined'
    ? Buffer.from(String(encryptedB64), 'base64')
    : Uint8Array.from(atob(String(encryptedB64)), c => c.charCodeAt(0));
  const ptr = exports.alloc(encrypted.length);
  new Uint8Array(exports.memory.buffer, ptr, encrypted.length).set(encrypted);
  const outLen = exports.decrypt(ptr, encrypted.length);
  const decoded = new TextDecoder().decode(
    new Uint8Array(exports.memory.buffer, ptr + 12, outLen)
  );

  return decoded
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => /^https?:\/\//i.test(line));
}

async function fetchYthdHostToken(streamUrl) {
  let origin = '';
  try {
    origin = new URL(streamUrl).origin;
  } catch {
    return '';
  }
  if (!origin) return '';

  try {
    const res = await fetch(`${origin}/generate.php`, {
      headers: {
        ...YTHD_STREAM_CDN_HEADERS,
        Accept: '*/*',
      },
      credentials: 'omit',
    });
    if (!res.ok) return '';
    return parseYthdTokenPayload(await res.text());
  } catch {
    return '';
  }
}

async function fetchYthdText(url, referer) {
  const res = await fetch(url, {
    headers: {
      ...YTHD_HEADERS,
      Referer: referer || `${YTHD_BASE}/`,
      Origin: referer ? new URL(referer).origin : YTHD_BASE,
    },
    redirect: 'follow',
  });
  if (!res.ok) {
    const err = new Error(`YTHD page returned ${res.status}`);
    err.statusCode = res.status === 404 ? 404 : 502;
    throw err;
  }

  return res.text();
}

/**
 * @param {string} path
 */
async function resolveVidlinkStream(path) {
  const { mediaType, tmdbId, season, episode } = parseFingerPath(path);
  const encRes = await fetch(`${ENC_BASE}/enc-vidlink?text=${encodeURIComponent(tmdbId)}`);
  if (!encRes.ok) {
    const err = new Error(`Encrypt service returned ${encRes.status}`);
    err.statusCode = 502;
    throw err;
  }

  const encData = await readJsonResponse(encRes, 'encrypt service');
  if (!encData?.result) {
    const err = new Error('Failed to encrypt TMDB id');
    err.statusCode = 502;
    throw err;
  }

  const vidlinkUrl =
    mediaType === 'movie'
      ? `${VIDLINK_BASE}/movie/${encData.result}`
      : `${VIDLINK_BASE}/tv/${encData.result}/${season}/${episode}`;

  const vidRes = await fetch(vidlinkUrl, { headers: VIDLINK_HEADERS });
  if (!vidRes.ok) {
    const err = new Error(`VidLink API returned ${vidRes.status}`);
    err.statusCode = vidRes.status === 404 ? 404 : 502;
    throw err;
  }

  const payload = await readJsonResponse(vidRes, 'VidLink API');
  const stream = payload?.stream;
  if (!stream) {
    const err = new Error('No stream returned for this title');
    err.statusCode = 404;
    throw err;
  }

  const streams = {};

  if (stream.type === 'hls' && stream.playlist) {
    streams.hls = stream.playlist;
  } else if (stream.qualities && typeof stream.qualities === 'object') {
    for (const [quality, file] of Object.entries(stream.qualities)) {
      if (file?.url) streams[quality] = file.url;
    }
  } else if (stream.playlist) {
    streams.hls = stream.playlist;
  }

  const reachable = await filterReachableStreams(streams, VIDLINK_HEADERS);
  if (Object.keys(reachable).length === 0) {
    try {
      const fallback = await resolveVidfastStream(path);
      return {
        ...fallback,
        source: 'fingerapi',
        sourceId: `${PROVIDER_LABELS.fingerapi} (Vidfast fallback)`,
      };
    } catch {
      const err = new Error('VidLink stream blocked or unreachable');
      err.statusCode = 502;
      throw err;
    }
  }

  assertPlayableStreams(reachable);

  return {
    source: 'fingerapi',
    sourceId: PROVIDER_LABELS.fingerapi,
    streams: reachable,
  };
}

function isVidfastHost(hostname) {
  return String(hostname || '').toLowerCase().includes('vidfast.');
}

/**
 * Scrape a Vidfast player page (`/movie/{id}` or `/tv/{id}/{s}/{e}`).
 * @param {string} pageUrl
 * @param {{ source?: string, sourceIdPrefix?: string }} [meta]
 */
async function resolveVidfastPage(pageUrl, meta = {}) {
  let parsed;
  try {
    parsed = new URL(pageUrl);
  } catch {
    const err = new Error('Invalid Vidfast URL');
    err.statusCode = 400;
    throw err;
  }

  const origin = parsed.origin;
  const pageRes = await fetch(parsed.toString(), {
    headers: {
      Accept: 'text/html,*/*',
      'User-Agent': USER_AGENT,
      Referer: `${origin}/`,
    },
  });
  if (!pageRes.ok) {
    const err = new Error(`Vidfast page returned ${pageRes.status}`);
    err.statusCode = pageRes.status === 404 ? 404 : 502;
    throw err;
  }

  const pageText = await pageRes.text();
  const textMatch = pageText.match(/\\"en\\":\\"(.*?)\\"/) ?? pageText.match(/"en":"([^"]+)"/);
  const text = textMatch?.[1];
  if (!text) {
    const err = new Error('Vidfast page did not contain encrypted stream data');
    err.statusCode = 502;
    throw err;
  }

  const encRes = await fetch(
    `${ENC_BASE}/enc-vidfast?text=${encodeURIComponent(text)}&version=${encodeURIComponent(VIDFAST_VERSION)}`
  );
  if (!encRes.ok) {
    const err = new Error(`Vidfast encrypt returned ${encRes.status}`);
    err.statusCode = 502;
    throw err;
  }

  const parts = validateEncDecPayload(await readJsonResponse(encRes, 'Vidfast encrypt'), 'Vidfast encrypt');
  if (!parts?.servers || !parts?.stream || !parts?.token) {
    const err = new Error('Vidfast encrypt returned incomplete stream parts');
    err.statusCode = 502;
    throw err;
  }

  const vidfastHeaders = {
    ...VIDFAST_HEADERS,
    Referer: `${origin}/`,
    'X-CSRF-Token': parts.token,
  };

  const serversRes = await fetch(parts.servers, {
    method: 'POST',
    headers: vidfastHeaders,
  });
  if (!serversRes.ok) {
    const err = new Error(`Vidfast servers returned ${serversRes.status}`);
    err.statusCode = 502;
    throw err;
  }

  const servers = await decryptVidfastText(await serversRes.text());
  const candidates = Array.isArray(servers) ? servers : [];
  if (candidates.length === 0) {
    const err = new Error('Vidfast returned no servers');
    err.statusCode = 404;
    throw err;
  }

  const source = meta.source || 'vidfast';
  const sourceIdPrefix = meta.sourceIdPrefix || PROVIDER_LABELS.vidfast;

  let lastError;
  for (const server of candidates) {
    const data = server?.data;
    if (!data || typeof data !== 'string') continue;

    try {
      const streamRes = await fetch(`${parts.stream}/${data}`, {
        method: 'POST',
        headers: vidfastHeaders,
      });
      if (!streamRes.ok) {
        throw new Error(`Vidfast stream (${server?.name || 'server'}) returned ${streamRes.status}`);
      }

      const decoded = await decryptVidfastText(await streamRes.text());
      const streams = await filterReachableStreams(
        normalizeProviderStreams(decoded),
        vidfastHeaders
      );
      assertPlayableStreams(streams);

      return {
        source,
        sourceId: `${sourceIdPrefix} (${server?.name || 'Vidfast'})`,
        streams,
      };
    } catch (err) {
      lastError = err;
    }
  }

  const err = new Error(lastError?.message || 'Vidfast returned no playable stream');
  err.statusCode = lastError?.statusCode ?? 502;
  throw err;
}

/**
 * @param {string} path
 */
async function resolveVidfastStream(path) {
  const { mediaType, tmdbId, season, episode } = parseFingerPath(path);
  const pageUrl =
    mediaType === 'movie'
      ? `${VIDFAST_BASE}/movie/${tmdbId}/`
      : `${VIDFAST_BASE}/tv/${tmdbId}/${season}/${episode}/`;

  return resolveVidfastPage(pageUrl, {
    source: 'vidfast',
    sourceIdPrefix: PROVIDER_LABELS.vidfast,
  });
}

async function resolveVidfastExtract(pageUrl) {
  return resolveVidfastPage(pageUrl, {
    source: 'vidfast',
    sourceIdPrefix: PROVIDER_LABELS.vidfast,
  });
}

const MOVY_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent': USER_AGENT,
  Referer: `${MOVY_ORIGIN}/`,
  Origin: MOVY_ORIGIN,
};

async function fetchMovySeed(mediaId) {
  const res = await fetch(`${MOVY_STREAM_API}/seed?mediaId=${encodeURIComponent(mediaId)}`, {
    headers: MOVY_HEADERS,
  });
  if (!res.ok) {
    const err = new Error(`Movy seed returned ${res.status}`);
    err.statusCode = res.status === 404 ? 404 : 502;
    throw err;
  }
  const payload = await readJsonResponse(res, 'Movy seed');
  const seed = payload?.seed;
  if (!seed) {
    const err = new Error('Movy seed missing');
    err.statusCode = 502;
    throw err;
  }
  return String(seed);
}

function normalizeMovyStreams(decoded) {
  const streams = {};
  const sources = Array.isArray(decoded?.sources) ? decoded.sources : [];
  for (const source of sources) {
    const url = source?.url;
    if (!url || typeof url !== 'string') continue;
    const key = qualityKey(source?.quality || source?.label || 'hls');
    if (!streams[key]) streams[key] = url;
    if (/\.m3u8(\?|$)/i.test(url) && !streams.hls) streams.hls = url;
  }
  return streams;
}

/**
 * Resolve streams via Movy (api.wecollege.net miami).
 * @param {string} path
 * @param {{ title?: string, year?: string | number, imdbId?: string }} [options]
 */
async function resolveMovyStream(path, options = {}) {
  const { mediaType, tmdbId, season, episode } = parseFingerPath(path);
  const title = String(options.title || '').trim();
  const year = String(options.year || '').trim();

  if (!title || !year) {
    const err = new Error('Movy requires title and release year');
    err.statusCode = 400;
    throw err;
  }

  let imdbId = '';
  try {
    imdbId = await resolveImdbId(mediaType, tmdbId, options.imdbId);
  } catch {
    imdbId = String(options.imdbId || '').trim();
  }

  const seed = await fetchMovySeed(tmdbId);
  const params = new URLSearchParams({
    title,
    mediaType: mediaType === 'tv' ? 'tv' : 'movie',
    year,
    episodeId: mediaType === 'tv' ? String(episode || 1) : '1',
    seasonId: mediaType === 'tv' ? String(season || 1) : '1',
    tmdbId: String(tmdbId),
    enc: '2',
    seed,
  });
  if (imdbId) params.set('imdbId', imdbId);

  const sourcesRes = await fetch(`${MOVY_STREAM_API}/miami/sources?${params.toString()}`, {
    headers: MOVY_HEADERS,
  });
  if (!sourcesRes.ok) {
    const err = new Error(`Movy sources returned ${sourcesRes.status}`);
    err.statusCode = sourcesRes.status === 404 ? 404 : 502;
    throw err;
  }

  const ciphertext = await sourcesRes.text();
  let decoded;
  try {
    decoded = JSON.parse(decryptMovySources(ciphertext, seed, tmdbId));
  } catch (err) {
    const fail = new Error(err?.message || 'Movy decrypt failed');
    fail.statusCode = 502;
    throw fail;
  }

  const streams = await filterReachableStreams(normalizeMovyStreams(decoded), {
    ...MOVY_HEADERS,
    Referer: 'https://vidfast.vc/',
    Origin: 'https://vidfast.vc',
  });
  assertPlayableStreams(streams);

  return {
    source: 'movy',
    sourceId: PROVIDER_LABELS.movy,
    streams,
  };
}

/**
 * @param {string} path
 * @param {{ title?: string, year?: string | number, imdbId?: string }} options
 */
async function resolveLordflixStream(path, options = {}) {
  const { mediaType, tmdbId, season, episode } = parseFingerPath(path);
  const title = String(options.title || '').trim();
  const year = String(options.year || '').trim();

  if (!title || !year) {
    const err = new Error('Toe requires title and release year');
    err.statusCode = 400;
    throw err;
  }

  const imdbId = await resolveImdbId(mediaType, tmdbId, options.imdbId);
  const servers = await fetchLordflixServers();
  let lastError;

  for (const server of servers) {
    try {
      const sourceUrl = new URL(`${LORDFLIX_SNOWHOUSE}/`);
      sourceUrl.searchParams.set('title', title);
      sourceUrl.searchParams.set('type', mediaType === 'tv' ? 'series' : 'movie');
      sourceUrl.searchParams.set('year', year);
      sourceUrl.searchParams.set('imdb', imdbId);
      sourceUrl.searchParams.set('tmdb', tmdbId);
      sourceUrl.searchParams.set('server', server);

      if (mediaType === 'tv') {
        sourceUrl.searchParams.set('season', season);
        sourceUrl.searchParams.set('episode', episode);
      }

      const encRes = await fetch(
        `${ENC_BASE}/enc-lordflix?url=${encodeURIComponent(sourceUrl.toString())}`
      );
      const encPayload = await readJsonResponse(encRes, 'Toe encrypt');
      const encData = validateEncDecPayload(encPayload, 'Toe encrypt');

      const encryptedRes = await fetch(encData.url, { headers: LORDFLIX_HEADERS });
      if (!encryptedRes.ok) {
        throw new Error(`Toe (${server}) returned ${encryptedRes.status}`);
      }

      const decRes = await fetch(`${ENC_BASE}/dec-lordflix`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: await encryptedRes.text(), sign: encData.sign }),
      });
      if (!decRes.ok) {
        throw new Error(`Toe decrypt returned ${decRes.status}`);
      }

      const decoded = validateEncDecPayload(
        await readJsonResponse(decRes, 'Toe decrypt'),
        'Toe decrypt'
      );
      const streams = await filterReachableStreams(normalizeProviderStreams(decoded), LORDFLIX_HEADERS);
      assertPlayableStreams(streams);

      return {
        source: 'lordflix',
        sourceId: `${PROVIDER_LABELS.lordflix} (${server})`,
        streams,
      };
    } catch (err) {
      lastError = err;
    }
  }

  const err = new Error(lastError?.message || 'Toe returned no playable stream');
  err.statusCode = 502;
  throw err;
}

async function resolveToeStream(path, options = {}) {
  try {
    const result = await resolveVidfastStream(path);
    return {
      ...result,
      source: 'lordflix',
      sourceId: String(result.sourceId || '').replace(/^Vidfast\b/, PROVIDER_LABELS.lordflix),
    };
  } catch (vidfastError) {
    try {
      return await resolveLordflixStream(path, options);
    } catch (lordflixError) {
      const err = new Error(
        `Toe failed: ${vidfastError?.message || 'Vidfast failed'}; fallback: ${
          lordflixError?.message || 'Lordflix failed'
        }`
      );
      err.statusCode = lordflixError?.statusCode ?? vidfastError?.statusCode ?? 502;
      throw err;
    }
  }
}

async function isLegPlaylistReachable(source) {
  const referer = String(source?.referer || 'https://hexa.su/').trim() || 'https://hexa.su/';
  const origin = referer.replace(/\/$/, '');

  try {
    const res = await fetch(source.url, {
      headers: {
        Accept: '*/*',
        'User-Agent': USER_AGENT,
        Referer: referer,
        Origin: origin,
      },
      redirect: 'follow',
    });
    if (!res.ok) return false;

    const text = await res.text();
    return text.includes('#EXTM3U') && !isProbablyHtml(text);
  } catch {
    return false;
  }
}

/**
 * @param {string} path
 */
async function resolveLegStream(path) {
  const { mediaType, tmdbId, season, episode } = parseFingerPath(path);
  const url = new URL(LEG_FLIXER_EXTRACT);
  url.searchParams.set('tmdbId', tmdbId);
  url.searchParams.set('type', mediaType === 'tv' ? 'tv' : 'movie');

  if (mediaType === 'tv') {
    url.searchParams.set('season', season);
    url.searchParams.set('episode', episode);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  });
  if (!res.ok) {
    const err = new Error(`Leg extract returned ${res.status}`);
    err.statusCode = 502;
    throw err;
  }

  const payload = await readJsonResponse(res, 'Leg extract');
  if (!payload?.success) {
    const err = new Error(payload?.error || 'Leg extract failed');
    err.statusCode = 502;
    throw err;
  }

  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  const candidates = sources.filter(
    source =>
      source?.status === 'working' &&
      source?.type === 'hls' &&
      typeof source?.url === 'string' &&
      /\.m3u8(\?|$)/i.test(source.url)
  );

  if (candidates.length === 0) {
    const err = new Error('Leg returned no playable HLS source');
    err.statusCode = 404;
    throw err;
  }

  let lastError;
  for (const source of candidates) {
    const label = source.title || source.server || PROVIDER_LABELS.leg;
    if (!(await isLegPlaylistReachable(source))) {
      lastError = new Error(`Leg (${label}) manifest unreachable`);
      continue;
    }

    return {
      source: 'leg',
      sourceId: label,
      streams: {
        hls: source.url,
      },
    };
  }

  const err = new Error(lastError?.message || 'Leg returned no reachable HLS source');
  err.statusCode = 502;
  throw err;
}

/**
 * @param {string} path
 */
async function resolveIcefyStream(path) {
  const { mediaType, tmdbId, season, episode } = parseFingerPath(path);
  const apiPath =
    mediaType === 'movie'
      ? `movie/${tmdbId}`
      : `tv/${tmdbId}/${season}/${episode}`;

  const res = await fetch(`${ICIFY_BASE}/${apiPath}`, {
    headers: ICIFY_HEADERS,
  });
  if (!res.ok) {
    const err = new Error(`Icefy returned ${res.status}`);
    err.statusCode = res.status === 404 ? 404 : 502;
    throw err;
  }

  const payload = await readJsonResponse(res, 'Icefy');
  const streamUrl = payload?.stream;
  if (!streamUrl || typeof streamUrl !== 'string') {
    const err = new Error('No stream URL returned from Icefy');
    err.statusCode = 404;
    throw err;
  }

  const streams = await filterReachableStreams({ hls: streamUrl }, ICIFY_HEADERS);
  assertPlayableStreams(streams);

  return {
    source: 'icefy',
    sourceId: PROVIDER_LABELS.icefy,
    streams,
  };
}

/**
 * @param {string} path
 * @param {{ imdbId?: string }} options
 */
async function resolveYthdStream(path, options = {}) {
  const { mediaType, tmdbId, season, episode } = parseFingerPath(path);
  const pageUrl =
    mediaType === 'movie'
      ? `${YTHD_BASE}/embed/${encodeURIComponent(tmdbId)}`
      : `${YTHD_BASE}/embed/tv?tmdb=${encodeURIComponent(tmdbId)}&season=${encodeURIComponent(
          season
        )}&episode=${encodeURIComponent(episode)}`;

  const apiUrl = buildYthdStreamApiUrl(mediaType, tmdbId, season, episode);
  let payload;
  try {
    const res = await fetch(apiUrl, {
      headers: YTHD_STREAM_API_HEADERS,
      credentials: 'omit',
    });
    if (!res.ok) {
      const err = new Error(`YTHD stream API returned ${res.status}`);
      err.statusCode = res.status === 404 ? 404 : 502;
      throw err;
    }
    payload = await readJsonResponse(res, 'YTHD stream API');
  } catch (err) {
    // Fall back to the public embed page when the API path is blocked.
    return {
      source: 'ythd',
      sourceId: `${PROVIDER_LABELS.ythd} (embed fallback)`,
      embedUrl: pageUrl,
      streams: {},
    };
  }

  const rawStreamUrls = payload?.data?.stream_urls;
  let candidates = [];
  if (Array.isArray(rawStreamUrls)) {
    candidates = rawStreamUrls.filter(url => typeof url === 'string' && /^https?:\/\//i.test(url));
  } else if (typeof rawStreamUrls === 'string' && rawStreamUrls.trim()) {
    try {
      candidates = await decryptYthdStreamUrls(rawStreamUrls, payload.vs);
    } catch (err) {
      return {
        source: 'ythd',
        sourceId: `${PROVIDER_LABELS.ythd} (embed fallback)`,
        embedUrl: pageUrl,
        streams: {},
      };
    }
  }

  if (candidates.length === 0) {
    const err = new Error('YTHD returned no playable stream URL');
    err.statusCode = 404;
    throw err;
  }

  let lastError;
  for (const candidate of candidates) {
    try {
      const token = await fetchYthdHostToken(candidate);
      const playableUrl = applyYthdStreamToken(candidate, token);
      const streams = await filterReachableStreams(
        { hls: playableUrl },
        ythdCdnHeadersForUrl(playableUrl)
      );
      assertPlayableStreams(streams);
      return {
        source: 'ythd',
        sourceId: PROVIDER_LABELS.ythd,
        streams,
      };
    } catch (err) {
      lastError = err;
    }
  }

  // Scrape failed for every host — still expose the embed so the player can recover.
  if (pageUrl) {
    return {
      source: 'ythd',
      sourceId: `${PROVIDER_LABELS.ythd} (embed fallback)`,
      embedUrl: pageUrl,
      streams: {},
    };
  }

  const err = new Error(lastError?.message || 'YTHD returned no playable stream URL');
  err.statusCode = lastError?.statusCode ?? 404;
  throw err;
}

/**
 * @param {string} path
 * @param {{ title?: string, year?: string | number, imdbId?: string }} options
 */
async function resolveVideasyStream(path, options = {}) {
  const providerId = String(options.provider || 'videasy-neon').toLowerCase();
  const provider = VIDEASY_PROVIDERS[providerId] || VIDEASY_PROVIDERS['videasy-neon'];
  const { mediaType, tmdbId, season, episode } = parseFingerPath(path);
  const title = String(options.title || '').trim();
  const year = String(options.year || '').trim();
  const imdbId = String(options.imdbId || '').trim();

  if (!title || !year) {
    const err = new Error(`${provider.label} requires title and release year`);
    err.statusCode = 400;
    throw err;
  }

  const sourceUrl = new URL(`${VIDEASY_BASE}/${provider.server}/sources-with-title`);
  sourceUrl.searchParams.set('title', encodeVideasyTitle(title));
  sourceUrl.searchParams.set('mediaType', mediaType === 'tv' ? 'tv' : 'movie');
  sourceUrl.searchParams.set('year', year);
  sourceUrl.searchParams.set('tmdbId', tmdbId);
  if (imdbId) sourceUrl.searchParams.set('imdbId', imdbId);
  if (provider.language) sourceUrl.searchParams.set('language', provider.language);

  if (mediaType === 'tv') {
    sourceUrl.searchParams.set('episodeId', episode);
    sourceUrl.searchParams.set('seasonId', season);
  }

  const encryptedRes = await fetch(sourceUrl.toString(), {
    headers: VIDEASY_HEADERS,
  });
  if (!encryptedRes.ok) {
    const err = new Error(`${provider.label} returned ${encryptedRes.status}`);
    err.statusCode = encryptedRes.status === 404 ? 404 : 502;
    throw err;
  }

  const decRes = await fetch(`${ENC_BASE}/dec-videasy`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: await encryptedRes.text(), id: tmdbId }),
  });
  if (!decRes.ok) {
    const err = new Error(`${provider.label} decrypt returned ${decRes.status}`);
    err.statusCode = 502;
    throw err;
  }

  const decoded = validateEncDecPayload(
    await readJsonResponse(decRes, `${provider.label} decrypt`),
    `${provider.label} decrypt`
  );
  let streams = normalizeVideasyStreams(decoded, provider);
  streams = addEmbeddedHeadersToStreams(streams, VIDEASY_HEADERS);

  if (providerId === 'videasy-yoru') {
    streams = await filterYoruPlayableStreams(streams);
  }

  assertPlayableStreams(streams);

  return {
    source: providerId,
    sourceId: provider.label,
    streams,
  };
}

/**
 * @param {string} path
 * @param {{ title?: string, year?: string | number, imdbId?: string }} options
 */
async function resolveVideasyAutoStream(path, options = {}) {
  const errors = [];

  for (const [providerId, provider] of Object.entries(VIDEASY_PROVIDERS)) {
    try {
      const result = await resolveVideasyStream(path, {
        ...options,
        provider: providerId,
      });

      return {
        ...result,
        resolvedProvider: result.source,
      };
    } catch (err) {
      errors.push(`${provider.label}: ${err?.message || 'failed'}`);
    }
  }

  const err = new Error(
    errors.length > 0
      ? `No Videasy provider returned a playable stream (${errors.join('; ')})`
      : 'No compatible Videasy provider was available'
  );
  err.statusCode = 404;
  throw err;
}

const PROVIDER_RESOLVERS = {
  fingerapi: resolveVidlinkStream,
  lordflix: resolveToeStream,
  vidfast: resolveVidfastStream,
  movy: resolveMovyStream,
  leg: resolveLegStream,
  icefy: resolveIcefyStream,
  ythd: resolveYthdStream,
  vixsrc: resolveVixsrcStream,
  videasy: resolveVideasyAutoStream,
  ...Object.fromEntries(
    Object.keys(VIDEASY_PROVIDERS).map(providerId => [providerId, resolveVideasyStream])
  ),
};

function isVixsrcHost(hostname) {
  return String(hostname || '').toLowerCase().includes('vixsrc.to');
}

function playlistFromVixsrcEmbedHtml(html) {
  const source = String(html || '');
  const videoId = source.match(/window\.video\s*=\s*\{[\s\S]*?id:\s*'([^']+)'/)?.[1];
  const masterUrl =
    source.match(/window\.masterPlaylist\s*=\s*\{[\s\S]*?url:\s*'([^']+)'/)?.[1] ||
    (videoId ? `${VIXSRC_BASE}/playlist/${videoId}` : '');
  const token = source.match(/window\.masterPlaylist[\s\S]*?'token':\s*'([^']+)'/)?.[1];
  const expires = source.match(/window\.masterPlaylist[\s\S]*?'expires':\s*'([^']+)'/)?.[1];
  if (!masterUrl || !token || !expires) return null;

  let parsed;
  try {
    parsed = new URL(masterUrl);
  } catch {
    return null;
  }

  parsed.searchParams.set('token', token);
  parsed.searchParams.set('expires', expires);
  parsed.searchParams.set('lang', 'en');
  if (/window\.canPlayFHD\s*=\s*true/.test(source)) {
    parsed.searchParams.set('h', '1');
  }
  return parsed.toString();
}

async function resolveVixsrcExtract(pageUrl) {
  const parsed = new URL(pageUrl);
  const movieMatch = parsed.pathname.match(/^\/movie\/(\d+)\/?$/);
  const tvMatch = parsed.pathname.match(/^\/tv\/(\d+)\/(\d+)\/(\d+)\/?$/);
  const embedMatch = parsed.pathname.match(/^\/embed\/(\d+)\/?$/);

  let embedUrl = '';
  if (movieMatch || tvMatch) {
    const apiPath = movieMatch
      ? `/api/movie/${movieMatch[1]}?lang=en`
      : `/api/tv/${tvMatch[1]}/${tvMatch[2]}/${tvMatch[3]}?lang=en`;
    const apiRes = await fetch(`${VIXSRC_BASE}${apiPath}`, {
      headers: {
        ...VIXSRC_HEADERS,
        Accept: 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest',
      },
      redirect: 'follow',
    });
    if (!apiRes.ok) {
      const err = new Error(`VixSrc API returned ${apiRes.status}`);
      err.statusCode = apiRes.status === 404 ? 404 : 502;
      throw err;
    }

    let data;
    try {
      data = await apiRes.json();
    } catch {
      const err = new Error('Invalid JSON from VixSrc API');
      err.statusCode = 502;
      throw err;
    }

    if (!data?.src) {
      const err = new Error('VixSrc API missing embed source');
      err.statusCode = 404;
      throw err;
    }
    embedUrl = new URL(String(data.src), VIXSRC_BASE).toString();
  } else if (embedMatch) {
    embedUrl = parsed.toString();
  } else {
    const err = new Error('Unsupported VixSrc URL');
    err.statusCode = 400;
    throw err;
  }

  const embedRes = await fetch(embedUrl, {
    headers: VIXSRC_HEADERS,
    redirect: 'follow',
  });
  if (!embedRes.ok) {
    const err = new Error(`VixSrc embed returned ${embedRes.status}`);
    err.statusCode = embedRes.status === 404 ? 404 : 502;
    throw err;
  }

  const html = await embedRes.text();
  const playlist = playlistFromVixsrcEmbedHtml(html);
  if (!playlist) {
    const err = new Error('Could not extract VixSrc playlist');
    err.statusCode = 404;
    throw err;
  }

  return {
    source: 'vixsrc',
    sourceId: 'VixSrc',
    streams: { hls: playlist },
  };
}

async function resolveVixsrcStream(path) {
  const { mediaType, tmdbId, season, episode } = parseFingerPath(path);
  const pageUrl =
    mediaType === 'tv'
      ? `${VIXSRC_BASE}/tv/${tmdbId}/${season}/${episode}`
      : `${VIXSRC_BASE}/movie/${tmdbId}`;
  return resolveVixsrcExtract(pageUrl);
}

const STREAMAIN_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://streamain.com/',
  Origin: 'https://streamain.com',
};

function collectExtractPlayableUrls(text, baseUrl) {
  const urls = [];
  const seen = new Set();
  const normalized = String(text || '')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&');

  const dataLink = normalized.match(/data-link=["']([^"']+)["']/i);
  if (dataLink?.[1]) urls.push(dataLink[1]);

  const fileMatches = normalized.matchAll(/(?:file|src|source|url)\s*[:=]\s*["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/gi);
  for (const match of fileMatches) {
    if (match[1]) urls.push(match[1]);
  }

  const rawMatches = normalized.matchAll(/https?:\/\/[^"'<>\\\s]+?\.(?:m3u8|mp4)(?:\?[^"'<>\\\s]*)?/gi);
  for (const match of rawMatches) {
    urls.push(match[0]);
  }

  return urls
    .map(url => absoluteUrl(url, baseUrl))
    .filter(url => {
      if (!url || seen.has(url) || !isPotentialPlayableUrl(url)) return false;
      seen.add(url);
      return true;
    });
}

/**
 * Extract a playable mp4/hls URL from an embed page (Streamain and similar).
 * @param {string} pageUrl
 */
export async function resolveExtractUrl(pageUrl) {
  const raw = String(pageUrl || '').trim();
  if (!raw || !/^https?:\/\//i.test(raw)) {
    const err = new Error('A valid extract URL is required');
    err.statusCode = 400;
    throw err;
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    const err = new Error('Invalid extract URL');
    err.statusCode = 400;
    throw err;
  }

  const headers = parsed.hostname.includes('streamain.com')
    ? STREAMAIN_HEADERS
    : {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Referer: `${parsed.origin}/`,
        Origin: parsed.origin,
      };

  if (isVixsrcHost(parsed.hostname)) {
    return resolveVixsrcExtract(raw);
  }

  if (isVidfastHost(parsed.hostname)) {
    return resolveVidfastExtract(raw);
  }

  const res = await fetch(raw, { headers, redirect: 'follow' });
  if (!res.ok) {
    const err = new Error(`Extract page returned ${res.status}`);
    err.statusCode = res.status === 404 ? 404 : 502;
    throw err;
  }

  const html = await res.text();
  const playable = collectExtractPlayableUrls(html, raw);
  const extracted = streamsFromUrls(playable);
  const urls = Object.values(extracted);
  const streams =
    urls.length === 1 && !extracted.hls
      ? { unknown: urls[0] }
      : extracted;
  assertPlayableStreams(streams);

  return {
    source: 'extract',
    sourceId: 'App Exclusive',
    streams,
  };
}

/**
 * @param {string} path
 * @param {{ provider?: string, title?: string, year?: string | number, imdbId?: string, extractUrl?: string }} [options]
 */
export async function resolveFingerStream(path, options = {}) {
  const provider = String(options.provider || 'fingerapi').toLowerCase();
  const resolve = PROVIDER_RESOLVERS[provider];

  if (!resolve) {
    const err = new Error(`Unknown provider: ${provider}`);
    err.statusCode = 400;
    throw err;
  }

  return resolve(path, options);
}

/**
 * @param {string} path
 * @param {{ provider?: string, title?: string, year?: string | number, imdbId?: string }} [options]
 */
export async function handleFingerProxyRequest(path, options = {}) {
  try {
    const normalized = String(path || '').replace(/^\/+/, '');
    const extractUrl = options.extractUrl || options.url;
    const body =
      normalized === 'extract' || normalized.startsWith('extract/') || extractUrl
        ? await resolveExtractUrl(extractUrl || '')
        : await resolveFingerStream(path, options);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    };
  } catch (err) {
    const statusCode = err.statusCode ?? 502;
    return {
      statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: err.message ?? 'Finger API proxy failed',
      }),
    };
  }
}
