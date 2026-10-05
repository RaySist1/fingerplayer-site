const OPENSUBTITLES_API_BASE = 'https://api.opensubtitles.com/api/v1';
const OPENSUBTITLES_USER_AGENT = 'seriestechmovies 3.2.0';
const OPENSUBTITLES_DOWNLOAD_HOSTS = new Set([
  'dl.opensubtitles.org',
  'www.opensubtitles.com',
  'www.opensubtitles.org',
]);

const FETCH_HEADERS = {
  Accept: 'text/plain, application/octet-stream, */*',
  'User-Agent': OPENSUBTITLES_USER_AGENT,
};

const OPENSUBTITLES_PAGE_HEADERS = {
  ...FETCH_HEADERS,
  Referer: 'https://www.opensubtitles.com/',
  Origin: 'https://www.opensubtitles.com',
};

const SUBTITLE_FETCH_TIMEOUT_MS = 20_000;
const SUBTITLE_FETCH_RETRIES = 2;

export function parseOpenSubtitlesFileId(sourceUrl) {
  if (!sourceUrl) return null;
  try {
    const pathname = new URL(sourceUrl).pathname;
    const match = pathname.match(/\/(?:filead|sub)\/(\d+)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function isOpenSubtitlesDownloadUrl(sourceUrl) {
  try {
    return OPENSUBTITLES_DOWNLOAD_HOSTS.has(new URL(sourceUrl).hostname);
  } catch {
    return false;
  }
}

function getOpenSubtitlesApiKey() {
  return process.env.OPENSUBTITLES_API_KEY || process.env.VITE_OPENSUBTITLES_API_KEY || '';
}

function getSubtitleFetchOrigin() {
  return (
    process.env.SUBTITLE_FETCH_ORIGIN ||
    process.env.VITE_SUBTITLE_FETCH_ORIGIN ||
    ''
  ).replace(/\/$/, '');
}

function isTimeoutError(err) {
  return (
    err?.name === 'AbortError' ||
    err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
    err?.cause?.code === 'ETIMEDOUT'
  );
}

function openSubtitlesApiHeaders() {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': OPENSUBTITLES_USER_AGENT,
    'Api-Key': getOpenSubtitlesApiKey(),
  };
}

async function fetchWithTimeout(url, init = {}, timeoutMs = SUBTITLE_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export function decodeSubtitleUrl(encodedUrl) {
  const decoded = decodeURIComponent(encodedUrl.trim());
  try {
    return decodeBase64Url(decoded);
  } catch {
    return decodeBase64(decoded);
  }
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  return decodeBase64(normalized + padding);
}

function decodeBase64(value) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('utf8');
  }

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

async function gunzipBytes(bytes) {
  if (typeof DecompressionStream !== 'undefined') {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }

  const { gunzipSync } = await import('node:zlib');
  return new TextDecoder('utf-8').decode(gunzipSync(bytes));
}

async function readResponseText(res) {
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    return gunzipBytes(bytes);
  }

  return new TextDecoder('utf-8').decode(bytes);
}

async function fetchDirectSubtitleUrl(sourceUrl) {
  let lastError;

  for (let attempt = 0; attempt <= SUBTITLE_FETCH_RETRIES; attempt += 1) {
    try {
      const res = await fetchWithTimeout(sourceUrl, {
        headers: isOpenSubtitlesDownloadUrl(sourceUrl)
          ? OPENSUBTITLES_PAGE_HEADERS
          : FETCH_HEADERS,
        redirect: 'follow',
      });

      if (!res.ok) {
        throw new Error(`Subtitle file returned ${res.status}`);
      }

      const text = await readResponseText(res);
      if (!text.trim()) {
        throw new Error('Subtitle file was empty');
      }

      return text;
    } catch (err) {
      lastError = err;
      if (!isTimeoutError(err) || attempt === SUBTITLE_FETCH_RETRIES) break;
    }
  }

  throw lastError;
}

function buildOpenSubtitlesSearchUrl(searchContext = {}) {
  const url = new URL(`${OPENSUBTITLES_API_BASE}/subtitles`);
  const imdbId = searchContext.imdbId?.trim();
  const tmdbId = searchContext.tmdbId?.trim();

  if (imdbId) {
    url.searchParams.set('imdb_id', imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`);
  } else if (tmdbId) {
    url.searchParams.set('tmdb_id', tmdbId);
  } else {
    return null;
  }

  if (searchContext.season) {
    url.searchParams.set('season_number', String(searchContext.season));
  }
  if (searchContext.episode) {
    url.searchParams.set('episode_number', String(searchContext.episode));
  }
  if (searchContext.language) {
    url.searchParams.set('languages', String(searchContext.language).toLowerCase());
  }

  return url;
}

function pickOpenSubtitlesFileId(results, searchContext = {}) {
  const entries = Array.isArray(results) ? results : [];
  if (entries.length === 0) return null;

  const language = String(searchContext.language || '').toLowerCase();
  const releaseHint = String(searchContext.release || '').toLowerCase();
  const wyzieId = String(searchContext.wyzieId || '');

  let best = entries[0];
  let bestScore = -1;

  for (const entry of entries) {
    const attributes = entry?.attributes ?? {};
    const files = attributes?.files ?? [];
    const fileId = files[0]?.file_id;
    if (!fileId) continue;

    let score = 0;
    const entryLanguage = String(attributes.language || '').toLowerCase();
    if (language && entryLanguage === language) score += 4;
    if (releaseHint && String(attributes.release || '').toLowerCase().includes(releaseHint)) {
      score += 2;
    }
    if (wyzieId && String(fileId) === wyzieId) score += 1;

    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return best?.attributes?.files?.[0]?.file_id ?? null;
}

async function resolveOpenSubtitlesFileId(searchContext = {}, parsedFileId = null) {
  if (parsedFileId) {
    const probe = await fetchWithTimeout(`${OPENSUBTITLES_API_BASE}/download`, {
      method: 'POST',
      headers: openSubtitlesApiHeaders(),
      body: JSON.stringify({ file_id: Number(parsedFileId) }),
    });

    if (probe.ok) return Number(parsedFileId);
  }

  const searchUrl = buildOpenSubtitlesSearchUrl(searchContext);
  if (!searchUrl) return null;

  const res = await fetchWithTimeout(searchUrl.toString(), {
    headers: openSubtitlesApiHeaders(),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    throw new Error(
      `OpenSubtitles search returned ${res.status}${detail ? `: ${detail}` : ''}`
    );
  }

  const payload = await res.json();
  const fileId = pickOpenSubtitlesFileId(payload?.data, searchContext);
  if (!fileId) {
    throw new Error('OpenSubtitles search did not return a matching subtitle file');
  }

  return fileId;
}

async function requestOpenSubtitlesFetchLink(fileId) {
  const res = await fetchWithTimeout(`${OPENSUBTITLES_API_BASE}/download`, {
    method: 'POST',
    headers: openSubtitlesApiHeaders(),
    body: JSON.stringify({ file_id: Number(fileId) }),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    throw new Error(
      `OpenSubtitles API returned ${res.status}${detail ? `: ${detail}` : ''}`
    );
  }

  const payload = await res.json();
  const link = payload?.link;
  if (!link || typeof link !== 'string') {
    throw new Error('OpenSubtitles API did not return a subtitle URL');
  }

  return link;
}

async function fetchViaOpenSubtitlesApi(searchContext = {}, parsedFileId = null) {
  const fileId = await resolveOpenSubtitlesFileId(searchContext, parsedFileId);
  const link = await requestOpenSubtitlesFetchLink(fileId);
  return fetchDirectSubtitleUrl(link);
}

async function fetchViaConfiguredOrigin(encodedUrl, searchContext = {}) {
  const origin = getSubtitleFetchOrigin();
  if (!origin) return null;

  const params = new URLSearchParams();
  if (searchContext.fileId) params.set('fileId', String(searchContext.fileId));
  if (searchContext.wyzieId) params.set('wyzieId', String(searchContext.wyzieId));
  if (searchContext.tmdbId) params.set('tmdbId', String(searchContext.tmdbId));
  if (searchContext.imdbId) params.set('imdbId', String(searchContext.imdbId));
  if (searchContext.season) params.set('season', String(searchContext.season));
  if (searchContext.episode) params.set('episode', String(searchContext.episode));
  if (searchContext.language) params.set('lang', String(searchContext.language));
  if (searchContext.release) params.set('release', String(searchContext.release));

  const query = params.toString();
  const url = `${origin}/api/subtitles/file/${encodedUrl}${query ? `?${query}` : ''}`;

  const res = await fetchWithTimeout(url, { headers: FETCH_HEADERS });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `Subtitle relay returned ${res.status}`);
  }
  return text;
}

export async function fetchSubtitleContent({
  sourceUrl,
  encodedUrl,
  fileId,
  wyzieId,
  tmdbId,
  imdbId,
  season,
  episode,
  language,
  release,
} = {}) {
  const searchContext = {
    fileId,
    wyzieId,
    tmdbId,
    imdbId,
    season,
    episode,
    language,
    release,
  };
  const parsedFileId = fileId || parseOpenSubtitlesFileId(sourceUrl);
  const shouldUseOpenSubtitlesFirst =
    isOpenSubtitlesDownloadUrl(sourceUrl) && Boolean(getOpenSubtitlesApiKey());
  let openSubtitlesFirstError = null;

  if (shouldUseOpenSubtitlesFirst) {
    try {
      return await fetchViaOpenSubtitlesApi(searchContext, parsedFileId);
    } catch (err) {
      openSubtitlesFirstError = err;
    }
  }

  if (encodedUrl && getSubtitleFetchOrigin()) {
    try {
      const relayed = await fetchViaConfiguredOrigin(encodedUrl, searchContext);
      if (relayed) return relayed;
    } catch {
      // Fall through to direct fetch.
    }
  }

  try {
    return await fetchDirectSubtitleUrl(sourceUrl);
  } catch (err) {
    if (!isTimeoutError(err)) throw err;

    if (openSubtitlesFirstError) {
      throw openSubtitlesFirstError;
    }

    if (getOpenSubtitlesApiKey()) {
      return fetchViaOpenSubtitlesApi(searchContext, parsedFileId);
    }

    throw new Error(
      'OpenSubtitles subtitle URL is unreachable from this server. Add OPENSUBTITLES_API_KEY (free at https://www.opensubtitles.com/consumers) or set SUBTITLE_FETCH_ORIGIN to your deployed site URL.'
    );
  }
}

export function subtitleTextToVtt(text, sourceUrl = '') {
  const cleaned = String(text || '').replace(/^\uFEFF/, '').trim();
  if (/^WEBVTT/i.test(cleaned)) return cleaned;

  if (/^\[Script Info\]/i.test(cleaned) || /^Dialogue:/im.test(cleaned)) {
    return assToVtt(cleaned);
  }

  return srtToVtt(cleaned || sourceUrl);
}

function srtToVtt(text) {
  return `WEBVTT\n\n${text
    .replace(/\{\\[^}]+}/g, '')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')}\n`;
}

function assToVtt(text) {
  const formatLine = text.match(/^Format:\s*(.+)$/im)?.[1] || '';
  const fields = formatLine.split(',').map(field => field.trim().toLowerCase());
  const startIndex = fields.indexOf('start');
  const endIndex = fields.indexOf('end');
  const textIndex = fields.indexOf('text');
  const events = [];

  for (const line of text.split('\n')) {
    if (!line.startsWith('Dialogue:')) continue;
    const raw = line.slice('Dialogue:'.length).trim();
    const parts = splitAssDialogue(raw, Math.max(fields.length, textIndex + 1));
    const start = parts[startIndex];
    const end = parts[endIndex];
    const cueText = parts.slice(textIndex).join(',').trim();
    if (!start || !end || !cueText) continue;

    events.push(
      `${assTimeToVtt(start)} --> ${assTimeToVtt(end)}\n${cleanAssText(cueText)}`
    );
  }

  return `WEBVTT\n\n${events.join('\n\n')}\n`;
}

function splitAssDialogue(value, fieldCount) {
  const parts = value.split(',');
  if (parts.length <= fieldCount) return parts;
  return [...parts.slice(0, fieldCount - 1), parts.slice(fieldCount - 1).join(',')];
}

function assTimeToVtt(value) {
  const [hours = '0', minutes = '00', seconds = '00'] = String(value).trim().split(':');
  const [secs = '00', centis = '00'] = seconds.split('.');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${secs.padStart(2, '0')}.${centis.padEnd(3, '0').slice(0, 3)}`;
}

function cleanAssText(value) {
  return value
    .replace(/\{[^}]+}/g, '')
    .replace(/\\N/g, '\n')
    .replace(/\\h/g, ' ')
    .trim();
}
