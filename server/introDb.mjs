const INTRODB_V2_BASE_URL = 'https://api.theintrodb.org';

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function getIntroDbApiKey(env) {
  return (
    env?.INTRODB_API_KEY ||
    env?.THEINTRODB_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.INTRODB_API_KEY || process.env?.THEINTRODB_API_KEY : '') ||
    ''
  );
}

function getIntroDbBaseUrl(env) {
  return (
    env?.INTRODB_BASE_URL ||
    env?.THEINTRODB_BASE_URL ||
    (typeof process !== 'undefined' ? process.env?.INTRODB_BASE_URL || process.env?.THEINTRODB_BASE_URL : '') ||
    INTRODB_V2_BASE_URL
  ).replace(/\/$/, '');
}

function firstString(...values) {
  return values.find(value => typeof value === 'string' && value.trim())?.trim() || '';
}

function mediaTypeForApi(mediaType) {
  const value = String(mediaType || '').toLowerCase();
  if (value === 'movie') return 'movie';
  if (value === 'series' || value === 'tv' || value === 'show') return 'tv';
  return 'tv';
}

function parseSeconds(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return NaN;

  const trimmed = value.trim();
  if (!trimmed) return NaN;
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);

  const parts = trimmed.split(':').map(part => Number(part));
  if (parts.some(part => !Number.isFinite(part))) return NaN;

  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return NaN;
}

const SEGMENT_FIELDS = [
  ['intro', 'intro'],
  ['recap', 'recap'],
  ['credits', 'credits'],
  ['preview', 'preview'],
  ['outro', 'credits'],
];

function unwrapSegments(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.segments)) return payload.segments;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (payload?.start != null || payload?.end != null) return [payload];

  return SEGMENT_FIELDS.flatMap(([field, type]) => {
    const value = payload?.[field];
    if (Array.isArray(value)) {
      return value.map(segment => ({ ...segment, segment_type: type, type }));
    }
    if (value && typeof value === 'object') {
      return [{ ...value, segment_type: type, type }];
    }
    return [];
  });
}

function normalizeSegment(segment) {
  const type = firstString(
    segment?.segment_type,
    segment?.segmentType,
    segment?.type,
    segment?.kind
  ) || 'intro';

  let start = parseSeconds(
    segment?.start_sec ??
      segment?.startSec ??
      segment?.start_seconds ??
      segment?.start ??
      segment?.startTime
  );
  let end = parseSeconds(
    segment?.end_sec ??
      segment?.endSec ??
      segment?.end_seconds ??
      segment?.end ??
      segment?.endTime
  );

  if (segment?.start_ms != null && Number.isFinite(segment.start_ms)) {
    start = segment.start_ms / 1000;
  } else if (segment?.start_ms === null && (type === 'intro' || type === 'recap')) {
    start = 0;
  }

  if (segment?.end_ms != null && Number.isFinite(segment.end_ms)) {
    end = segment.end_ms / 1000;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  return {
    type: type.toLowerCase(),
    start,
    end,
  };
}

function buildV2MediaUrl(options = {}) {
  const imdbId = firstString(options.imdbId, options.imdb_id);
  const tmdbId = firstString(options.tmdbId, options.tmdb_id);
  if (!imdbId && !tmdbId) return null;

  const base = getIntroDbBaseUrl(options.env);
  const url = new URL(
    base.includes('introdb.app') ? '/segments' : '/v2/media',
    base
  );

  if (url.pathname === '/segments') {
    if (!imdbId) return null;
    url.searchParams.set('imdb_id', imdbId);
  } else if (tmdbId) {
    url.searchParams.set('tmdb_id', tmdbId);
  } else {
    url.searchParams.set('imdb_id', imdbId);
  }

  url.searchParams.set('type', mediaTypeForApi(options.mediaType));
  if (options.season) url.searchParams.set('season', String(options.season));
  if (options.episode) url.searchParams.set('episode', String(options.episode));

  return url;
}

function isLegacyIntroDbHost(baseUrl) {
  return String(baseUrl || '').includes('introdb.app');
}

export async function handleIntroDbRequest(options = {}) {
  const url = buildV2MediaUrl(options);
  const apiKey = getIntroDbApiKey(options.env);

  if (!url) {
    return jsonResponse(200, {
      source: 'introdb',
      configured: Boolean(apiKey),
      segments: [],
      message: 'Missing TMDB or IMDb id for IntroDB lookup.',
    });
  }

  const headers = {
    Accept: 'application/json',
    'User-Agent': 'seriestechmovies 3.2.0',
  };
  if (apiKey) headers['X-API-Key'] = apiKey;

  try {
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      return jsonResponse(res.status === 404 ? 200 : 502, {
        source: 'introdb',
        configured: Boolean(apiKey),
        segments: [],
        error: `IntroDB returned ${res.status}`,
      });
    }

    const payload = await res.json();
    if (payload?.error) {
      return jsonResponse(200, {
        source: 'introdb',
        configured: Boolean(apiKey),
        segments: [],
        error: String(payload.error),
      });
    }

    const segments = unwrapSegments(payload)
      .map(normalizeSegment)
      .filter(Boolean)
      .filter(segment => segment.type === 'intro');

    return jsonResponse(200, {
      source: isLegacyIntroDbHost(url.origin) ? 'introdb-legacy' : 'introdb',
      configured: Boolean(apiKey),
      segments,
    });
  } catch (err) {
    return jsonResponse(502, {
      source: 'introdb',
      configured: Boolean(apiKey),
      segments: [],
      error: err?.message || 'IntroDB lookup failed',
    });
  }
}
