import {
  decodeSubtitleUrl,
  fetchSubtitleContent,
  parseOpenSubtitlesFileId,
  subtitleTextToVtt,
} from './subtitleFetch.mjs';

const FETCH_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
};

const STREMIO_SUBTITLES_BASE = 'https://opensubtitles-v3.strem.io';

const LANGUAGE_NAMES = {
  ar: 'Arabic',
  bg: 'Bulgarian',
  bs: 'Bosnian',
  cs: 'Czech',
  en: 'English',
  da: 'Danish',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  el: 'Greek',
  et: 'Estonian',
  he: 'Hebrew',
  hi: 'Hindi',
  hr: 'Croatian',
  hu: 'Hungarian',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  nl: 'Dutch',
  no: 'Norwegian',
  nb: 'Norwegian',
  fa: 'Persian',
  pl: 'Polish',
  sv: 'Swedish',
  fi: 'Finnish',
  pt: 'Portuguese',
  'pt-br': 'Brazilian Portuguese',
  ro: 'Romanian',
  ru: 'Russian',
  sk: 'Slovak',
  sl: 'Slovenian',
  sr: 'Serbian',
  tr: 'Turkish',
  uk: 'Ukrainian',
  zh: 'Chinese',
  'zh-tw': 'Chinese Traditional',
};

const LANGUAGE_FLAG_COUNTRIES = {
  ar: 'SA',
  bg: 'BG',
  bs: 'BA',
  cs: 'CZ',
  da: 'DK',
  de: 'DE',
  el: 'GR',
  en: 'US',
  es: 'ES',
  et: 'EE',
  fi: 'FI',
  fr: 'FR',
  he: 'IL',
  hi: 'IN',
  hr: 'HR',
  hu: 'HU',
  it: 'IT',
  ja: 'JP',
  ko: 'KR',
  nb: 'NO',
  nl: 'NL',
  no: 'NO',
  fa: 'IR',
  pl: 'PL',
  pt: 'PT',
  'pt-br': 'BR',
  ro: 'RO',
  ru: 'RU',
  sk: 'SK',
  sl: 'SI',
  sr: 'RS',
  sv: 'SE',
  tr: 'TR',
  uk: 'UA',
  zh: 'CN',
  'zh-tw': 'TW',
};

const STREMIO_LANGUAGE_ALIASES = {
  ara: 'ar',
  bul: 'bg',
  bos: 'bs',
  ces: 'cs',
  cze: 'cs',
  dan: 'da',
  deu: 'de',
  ger: 'de',
  ell: 'el',
  gre: 'el',
  eng: 'en',
  est: 'et',
  spa: 'es',
  fin: 'fi',
  fra: 'fr',
  fre: 'fr',
  heb: 'he',
  hin: 'hi',
  hrv: 'hr',
  hun: 'hu',
  ita: 'it',
  jpn: 'ja',
  kor: 'ko',
  nld: 'nl',
  dut: 'nl',
  nor: 'no',
  per: 'fa',
  fas: 'fa',
  pes: 'fa',
  pol: 'pl',
  por: 'pt',
  pob: 'pt-br',
  ron: 'ro',
  rum: 'ro',
  rus: 'ru',
  slk: 'sk',
  slo: 'sk',
  slv: 'sl',
  srp: 'sr',
  swe: 'sv',
  tur: 'tr',
  ukr: 'uk',
  zho: 'zh',
  chi: 'zh',
  zht: 'zh-tw',
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function textResponse(statusCode, body, contentType = 'text/plain; charset=utf-8') {
  return {
    statusCode,
    headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' },
    body,
  };
}

function languageName(code) {
  const normalized = normalizeLanguageCode(code);
  return LANGUAGE_NAMES[normalized] || normalized.toUpperCase();
}

function flagUrlForLanguage(code) {
  const normalized = normalizeLanguageCode(code);
  const country = LANGUAGE_FLAG_COUNTRIES[normalized];
  return country ? `https://flagsapi.com/${country}/flat/24.png` : '';
}

function normalizeLanguageCode(code) {
  const normalized = String(code || 'en').toLowerCase();
  return STREMIO_LANGUAGE_ALIASES[normalized] || normalized;
}

function firstString(...values) {
  return values.find(value => typeof value === 'string' && value.trim())?.trim() || '';
}

function stripEnvQuotes(value) {
  const trimmed = String(value || '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readLocalEnvValue(key) {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch {
    // Ignore in non-Node environments
  }
  return '';
}

function applyLocalEnvValue(key) {
  const value = readLocalEnvValue(key);
  if (value && typeof process !== 'undefined' && process.env && !process.env[key]) {
    process.env[key] = value;
  }
}

function subtitleUrlFor(sourceUrl, format, index, searchContext = {}, entry = {}) {
  const encoded = Buffer.from(sourceUrl, 'utf8').toString('base64url');
  const params = new URLSearchParams({
    format: format || 'srt',
    i: String(index),
  });
  const fileId = parseOpenSubtitlesFileId(sourceUrl);
  const wyzieId = firstString(entry?.id, entry?.subtitle_id);

  if (fileId) params.set('fileId', fileId);
  if (wyzieId) params.set('wyzieId', wyzieId);
  if (searchContext.tmdbId) params.set('tmdbId', String(searchContext.tmdbId));
  if (searchContext.imdbId) params.set('imdbId', String(searchContext.imdbId));
  if (searchContext.season) params.set('season', String(searchContext.season));
  if (searchContext.episode) params.set('episode', String(searchContext.episode));

  const language = normalizeLanguageCode(firstString(
    entry?.language,
    entry?.lang,
    entry?.languageCode,
    searchContext.language
  ));
  if (language) params.set('lang', language);

  const release = firstString(entry?.release, entry?.fileName, entry?.filename, entry?.name);
  if (release) params.set('release', release);

  return `/api/subtitles/file/${encodeURIComponent(encoded)}?${params.toString()}`;
}

function hasBlockedReleaseMarker(entry) {
  const values = [
    entry?.release,
    entry?.fileName,
    entry?.filename,
    entry?.name,
    entry?.origin,
    entry?.matchedRelease,
    entry?.matchedFilter,
    ...(Array.isArray(entry?.releases) ? entry.releases : []),
  ];

  return values.some(value => /dvdrip/i.test(String(value || '')));
}

function normalizeSubtitle(entry, index, searchContext = {}) {
  const sourceUrl = firstString(entry?.url, entry?.link, entry?.download, entry?.file);
  if (!sourceUrl) return null;
  if (hasBlockedReleaseMarker(entry)) return null;

  const language = normalizeLanguageCode(
    firstString(entry?.language, entry?.lang, entry?.languageCode) || 'en'
  );
  const source = firstString(entry?.source, entry?.provider, entry?.origin);
  const release = firstString(entry?.release, entry?.fileName, entry?.filename, entry?.name);
  const format = firstString(entry?.format, sourceUrl.split('?')[0].split('.').pop()) || 'srt';
  if (format.toLowerCase() !== 'srt') return null;
  const parts = [languageName(language)];
  if (entry?.hi || entry?.hearing_impaired) parts.push('CC');

  return {
    id: String(entry?.id || entry?.subtitle_id || `${language}-${index}`),
    label: parts.join(' · '),
    language,
    flagUrl: firstString(entry?.flagUrl, entry?.flag, entry?.flag_url, flagUrlForLanguage(language)),
    source,
    release,
    format,
    directUrl: sourceUrl,
    url: subtitleUrlFor(sourceUrl, format, index, searchContext, { ...entry, language }),
  };
}

function unwrapSubtitleList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.subtitles)) return payload.subtitles;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function buildStremioSubtitleUrl(options) {
  const imdbId = firstString(options.imdbId);
  if (!imdbId) return null;

  const isSeries =
    options.mediaType === 'tv' ||
    options.mediaType === 'series' ||
    options.type === 'series';

  const stremioType = isSeries ? 'series' : 'movie';
  const stremioId = isSeries
    ? `${imdbId}:${Number(options.season || 1)}:${Number(options.episode || 1)}`
    : imdbId;

  return new URL(`/subtitles/${stremioType}/${encodeURIComponent(stremioId)}.json`, STREMIO_SUBTITLES_BASE);
}

function normalizeStremioSubtitle(entry, index, searchContext = {}) {
  return normalizeSubtitle(
    {
      ...entry,
      language: entry?.language || entry?.lang,
      source: 'Stremio',
      provider: 'Stremio',
      release: firstString(entry?.release, entry?.filename, entry?.id),
      format: 'srt',
    },
    index,
    searchContext
  );
}

export async function handleSubtitleSearchRequest(options = {}) {
  const url = buildStremioSubtitleUrl(options);
  if (!url) {
    return jsonResponse(200, {
      source: 'stremio',
      configured: true,
      subtitles: [],
      message: 'Missing IMDb id for Stremio subtitle lookup.',
    });
  }

  try {
    const res = await fetch(url.toString(), { headers: FETCH_HEADERS });
    if (!res.ok) {
      return jsonResponse(res.status === 404 ? 200 : 502, {
        source: 'stremio',
        configured: true,
        subtitles: [],
        error: `Stremio subtitles returned ${res.status}`,
      });
    }

    const payload = await res.json();
    const searchContext = {
      tmdbId: options.tmdbId,
      imdbId: options.imdbId,
      season: options.season,
      episode: options.episode,
      language: options.language,
      mediaType: options.mediaType || options.type,
    };
    const subtitles = unwrapSubtitleList(payload)
      .map((entry, index) => normalizeStremioSubtitle(entry, index, searchContext))
      .filter(Boolean)
      .slice(0, 100);

    return jsonResponse(200, {
      source: 'stremio',
      configured: true,
      subtitles,
    });
  } catch (err) {
    return jsonResponse(502, {
      source: 'stremio',
      configured: true,
      subtitles: [],
      error: err?.message || 'Stremio subtitle search failed',
    });
  }
}

export async function handleSubtitleFileRequest(encodedUrl, options = {}) {
  if (!encodedUrl?.trim()) {
    return textResponse(400, 'Missing subtitle URL');
  }

  applyLocalEnvValue('OPENSUBTITLES_API_KEY');
  applyLocalEnvValue('SUBTITLE_FETCH_ORIGIN');

  let sourceUrl;
  try {
    sourceUrl = decodeSubtitleUrl(encodedUrl);
    new URL(sourceUrl);
  } catch {
    return textResponse(400, 'Invalid subtitle URL');
  }

  try {
    const text = await fetchSubtitleContent({
      sourceUrl,
      encodedUrl,
      fileId: options.fileId || parseOpenSubtitlesFileId(sourceUrl),
      wyzieId: options.wyzieId,
      tmdbId: options.tmdbId,
      imdbId: options.imdbId,
      season: options.season,
      episode: options.episode,
      language: options.language || options.lang,
      release: options.release,
    });
    return textResponse(200, subtitleTextToVtt(text, sourceUrl), 'text/vtt; charset=utf-8');
  } catch (err) {
    return textResponse(502, err?.message || 'Subtitle file failed');
  }
}
