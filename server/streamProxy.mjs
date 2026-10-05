const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const UPSTREAM_FETCH_TIMEOUT_MS = 20_000;
const DIGITALSUN_PROBE_TIMEOUT_MS = 8_000;
const DIGITALSUN_NESTED_SEGMENT_ATTEMPTS = 4;
const PROGRESSIVE_MEDIA_RE = /\.(mp4|m4s|webm|mkv|mov|m4v|ts)(\?|$)/i;

const FETCH_HEADERS = {
  Accept: '*/*',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

const LORDFLIX_CDN_HEADERS = {
  Referer: 'https://lordflix.org/',
  Origin: 'https://lordflix.org',
};

const LORDFLIX_CDN_HOST_MARKERS = [
  'lordflix',
  'snowhouse',
  'shegu.net',
  'nebulanovanature',
];

const LEG_CDN_HEADERS = {
  Referer: 'https://hexa.su/',
  Origin: 'https://hexa.su',
};

const LEG_CDN_HOST_MARKERS = [
  'tylerfisher55.workers.dev',
  'ironwallnet.com',
  'typhoontigertribe.net',
  'skywardslothnetwork.net',
  'workers.dev',
];

const VIDLINK_CDN_HEADERS = {
  Referer: 'https://vidlink.pro/',
  Origin: 'https://vidlink.pro',
};

const VIDLINK_CDN_HOST_MARKERS = [
  'vidlink',
  'costicritterbear',
  'watchiknow',
  'fingstmpserv',
  'vodvidl',
  'videosstr',
];

const VIDFAST_CDN_HEADERS = {
  Referer: 'https://vidfast.vc/',
  Origin: 'https://vidfast.vc',
};

/** Known + rotating Vidfast edge hosts (quietridge, grandpeak, …). */
const VIDFAST_CDN_HOST_MARKERS = [
  'vidfast.pro',
  'vidfast.vc',
  'quietridge.top',
  'quietridge',
  'grandpeak.top',
  'grandpeak',
];

/**
 * Referer/Origin profiles tried automatically when a CDN returns 403.
 * Order: most common first. Learned hosts skip straight to the working profile.
 */
const CDN_REFERER_PROFILES = [
  { id: 'vidfast', Referer: 'https://vidfast.vc/', Origin: 'https://vidfast.vc' },
  { id: 'vidfast-pro', Referer: 'https://vidfast.pro/', Origin: 'https://vidfast.pro' },
  { id: 'movy', Referer: 'https://www.movy.sx/', Origin: 'https://www.movy.sx' },
  { id: 'vixsrc', Referer: 'https://vixsrc.to/', Origin: 'https://vixsrc.to' },
  { id: 'vidlink', Referer: 'https://vidlink.pro/', Origin: 'https://vidlink.pro' },
  { id: 'videasy', Referer: 'https://player.videasy.to/', Origin: 'https://player.videasy.to' },
  { id: 'lordflix', Referer: 'https://lordflix.org/', Origin: 'https://lordflix.org' },
  { id: 'hexa', Referer: 'https://hexa.su/', Origin: 'https://hexa.su' },
  { id: 'icefy', Referer: 'https://streams.icefy.top/', Origin: 'https://streams.icefy.top' },
  { id: 'sportits', Referer: 'https://media.sportits.com/', Origin: 'https://media.sportits.com' },
];

/** @type {Map<string, { Referer: string, Origin?: string }>} */
const learnedRefererByHost = new Map();

function isVidfastCdnUrl(target) {
  const host = String(target?.hostname || '').toLowerCase();
  if (VIDFAST_CDN_HOST_MARKERS.some(marker => host.includes(marker))) return true;
  // All current Vidfast edges serve playlists/segments under /vd/<token>/…
  return /^\/vd\//i.test(String(target?.pathname || ''));
}

function rememberHostReferer(hostname, headers) {
  const host = String(hostname || '').toLowerCase();
  const referer = headers?.Referer;
  if (!host || !referer) return;
  learnedRefererByHost.set(host, {
    Referer: String(referer),
    ...(headers.Origin ? { Origin: String(headers.Origin) } : {}),
  });
}

function refererKey(headers) {
  return `${headers?.Referer || ''}|${headers?.Origin || ''}`;
}

/**
 * Build ordered header attempts: base → learned host → remaining CDN profiles.
 * @param {URL} target
 * @param {Record<string, string>} baseHeaders
 */
function buildRefererAttempts(target, baseHeaders) {
  const attempts = [];
  const seen = new Set();

  const push = (referer, origin) => {
    const next = { ...baseHeaders };
    if (referer) {
      next.Referer = referer;
      if (origin) next.Origin = origin;
      else delete next.Origin;
    } else {
      delete next.Referer;
      delete next.Origin;
    }
    const key = refererKey(next);
    if (seen.has(key)) return;
    seen.add(key);
    attempts.push(next);
  };

  if (baseHeaders.Referer) {
    push(baseHeaders.Referer, baseHeaders.Origin);
  }

  const learned = learnedRefererByHost.get(String(target.hostname || '').toLowerCase());
  if (learned?.Referer) push(learned.Referer, learned.Origin);

  for (const profile of CDN_REFERER_PROFILES) {
    push(profile.Referer, profile.Origin);
  }

  // Last resort: no referer (some CDNs allow bare requests)
  push(null, null);

  return attempts;
}

function isBlockedUpstreamResponse(status, bodyHead, contentType = '') {
  if (status === 401 || status === 403 || status === 407) return true;
  if (status >= 200 && status < 300) {
    if (isProbablyHtml(bodyHead) && /forbidden|access denied|attention required|just a moment/i.test(bodyHead)) {
      return true;
    }
    if (/text\/html/i.test(contentType) && isProbablyHtml(bodyHead)) return true;
  }
  return false;
}

/**
 * Fetch with automatic referer probing. Remembers what worked per CDN host.
 * @returns {Promise<{ upstream: Response, bodyBuffer: Buffer, headers: Record<string, string> }>}
 */
async function fetchUpstreamAuto(url, baseHeaders, timeoutMs = UPSTREAM_FETCH_TIMEOUT_MS) {
  let target;
  try {
    target = new URL(url);
  } catch {
    const upstream = await fetchUpstream(url, baseHeaders, timeoutMs);
    const bodyBuffer = Buffer.from(await upstream.arrayBuffer());
    return { upstream, bodyBuffer, headers: baseHeaders };
  }

  const attempts = buildRefererAttempts(target, baseHeaders);
  let last = null;

  for (const headers of attempts) {
    try {
      const upstream = await fetchUpstream(url, headers, timeoutMs);
      const bodyBuffer = Buffer.from(await upstream.arrayBuffer());
      const bodyHead = bodyBuffer.toString('utf8', 0, Math.min(bodyBuffer.length, 2048));
      const contentType = upstream.headers.get('content-type') || '';

      if (isBlockedUpstreamResponse(upstream.status, bodyHead, contentType)) {
        last = { upstream, bodyBuffer, headers };
        continue;
      }

      if (headers.Referer) rememberHostReferer(target.hostname, headers);
      return { upstream, bodyBuffer, headers };
    } catch (err) {
      last = last || { upstream: null, bodyBuffer: Buffer.alloc(0), headers, error: err };
    }
  }

  if (last?.upstream) return last;
  throw last?.error || new Error('Upstream fetch failed');
}

/**
 * Progressive/segment fetch with the same auto-referer probing (streams on success).
 */
async function fetchProgressiveAuto(target, baseHeaders) {
  const attempts = buildRefererAttempts(target, baseHeaders);
  let last = null;

  for (const headers of attempts) {
    try {
      const upstream = await fetch(target.toString(), {
        headers,
        redirect: 'follow',
        signal: createFetchSignal(),
      });

      if (upstream.status === 401 || upstream.status === 403 || upstream.status === 407) {
        await upstream.arrayBuffer().catch(() => undefined);
        last = { upstream, headers };
        continue;
      }

      const contentType = upstream.headers.get('content-type') || '';
      if (/text\/html/i.test(contentType) && upstream.status >= 400) {
        await upstream.arrayBuffer().catch(() => undefined);
        last = { upstream, headers };
        continue;
      }

      if (headers.Referer) rememberHostReferer(target.hostname, headers);
      return { upstream, headers };
    } catch (err) {
      last = last || { upstream: null, headers, error: err };
    }
  }

  if (last?.upstream) return last;
  throw last?.error || new Error('Upstream fetch failed');
}

function refererHeadersForRewrite(headers) {
  if (!headers?.Referer) return null;
  return {
    Referer: headers.Referer,
    ...(headers.Origin ? { Origin: headers.Origin } : {}),
  };
}

function attachRefererToDestination(destination, refererHeaders) {
  if (!refererHeaders?.Referer) return destination;
  try {
    const parsed = new URL(destination);
    if (parsed.searchParams.has('headers')) return destination;
    parsed.searchParams.set(
      'headers',
      JSON.stringify({
        referer: refererHeaders.Referer,
        ...(refererHeaders.Origin ? { origin: refererHeaders.Origin } : {}),
      })
    );
    return parsed.toString();
  } catch {
    return destination;
  }
}

const ICIFY_CDN_HEADERS = {
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://streams.icefy.top/',
  Origin: 'https://streams.icefy.top',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'cross-site',
};

const ICIFY_CDN_HOST_MARKERS = ['icefy.top', 'streams.icefy.top', 'aurorioncreative.site'];

const YTHD_CDN_HEADERS = {
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://ythd.org/',
  Origin: 'https://ythd.org',
};

const YTHD_STREAM_CDN_HEADERS = {
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://cloudorchestranova.com/',
  Origin: 'https://cloudorchestranova.com',
};

const YTHD_CDN_HOST_MARKERS = ['ythd.org', 'cloudorchestranova.com', 'cloudnestra.com', 'vidsrc.sh'];
const YTHD_STREAM_CDN_HOST_MARKERS = [
  'penumbrapalimpsest.space',
  'palimpsest.space',
  'antilogarithm-atlas.site',
  'atlas.site',
];

const VIDEASY_CDN_HEADERS = {
  Accept: '*/*',
  Referer: 'https://player.videasy.to/',
  Origin: 'https://player.videasy.to',
};

const VIDEASY_CDN_HOST_MARKERS = [
  'itsdeskmate.com',
  'digitalsun.app',
  'videasy.to',
  'vidking.net',
  'api.videasy.to',
  'api2.videasy.to',
];

const VIXSRC_CDN_HEADERS = {
  Accept: '*/*',
  Referer: 'https://vixsrc.to/',
  Origin: 'https://vixsrc.to',
};

const VIXSRC_CDN_HOST_MARKERS = [
  'vixsrc.to',
  'vix-content.net',
  'vixcloud.co',
  'mistyreef',
];

function createFetchSignal(timeoutMs = UPSTREAM_FETCH_TIMEOUT_MS) {
  return AbortSignal.timeout(timeoutMs);
}

async function fetchUpstream(url, headers, timeoutMs = UPSTREAM_FETCH_TIMEOUT_MS) {
  return fetch(url, {
    headers,
    redirect: 'follow',
    signal: createFetchSignal(timeoutMs),
  });
}

export function upstreamHeadersForUrl(target) {
  const headers = { ...FETCH_HEADERS };
  const host = target.hostname.toLowerCase();

  // Embedded headers describe upstream CDNs; known proxy hosts override them.
  Object.assign(headers, embeddedHeadersForUrl(target));

  // Previously learned working referer for this CDN host.
  const learned = learnedRefererByHost.get(host);
  if (learned?.Referer) {
    Object.assign(headers, learned);
  }

  if (LORDFLIX_CDN_HOST_MARKERS.some(marker => host.includes(marker))) {
    Object.assign(headers, LORDFLIX_CDN_HEADERS);
  }

  if (LEG_CDN_HOST_MARKERS.some(marker => host.includes(marker))) {
    Object.assign(headers, LEG_CDN_HEADERS);
  }

  if (VIDLINK_CDN_HOST_MARKERS.some(marker => host.includes(marker))) {
    Object.assign(headers, VIDLINK_CDN_HEADERS);
  }

  if (isVidfastCdnUrl(target)) {
    Object.assign(headers, VIDFAST_CDN_HEADERS);
  }

  if (ICIFY_CDN_HOST_MARKERS.some(marker => host.includes(marker))) {
    Object.assign(headers, ICIFY_CDN_HEADERS);
  }

  if (YTHD_STREAM_CDN_HOST_MARKERS.some(marker => host.includes(marker))) {
    Object.assign(headers, YTHD_STREAM_CDN_HEADERS);
  } else if (YTHD_CDN_HOST_MARKERS.some(marker => host.includes(marker))) {
    Object.assign(headers, YTHD_CDN_HEADERS);
  }

  if (VIDEASY_CDN_HOST_MARKERS.some(marker => host.includes(marker))) {
    Object.assign(headers, VIDEASY_CDN_HEADERS);
  }

  if (VIXSRC_CDN_HOST_MARKERS.some(marker => host.includes(marker))) {
    Object.assign(headers, VIXSRC_CDN_HEADERS);
  }

  if (host.includes('streamain.com')) {
    Object.assign(headers, {
      Accept: 'video/mp4,video/*,*/*',
      Referer: 'https://streamain.com/',
      Origin: 'https://streamain.com',
    });
  }

  if (host.includes('sportits.com')) {
    Object.assign(headers, {
      Accept: 'video/mp4,video/*,*/*',
      Referer: 'https://media.sportits.com/',
      Origin: 'https://media.sportits.com',
    });
  }

  return headers;
}

function getProxyRewriteBase(options = {}) {
  if (options.proxyPublicBase?.trim()) {
    return options.proxyPublicBase.trim().replace(/\/$/, '');
  }
  return (options.proxyBasePath ?? '/api/stream-proxy').replace(/\/$/, '');
}

function getClientRangeHeader(options = {}) {
  const headers = options.requestHeaders || {};
  return options.range || headers.range || headers.Range || '';
}

function passThroughUpstreamHeader(upstream, name) {
  if (!upstream?.headers?.get) return undefined;
  return upstream.headers.get(name) || upstream.headers.get(name.toLowerCase());
}

/**
 * @param {string | null | undefined} destination
 * @param {{ encodedDestination?: string | null, proxyBasePath?: string, proxyPublicBase?: string, range?: string, requestHeaders?: Record<string, string | string[] | undefined> }} [options]
 */
export async function handleStreamProxyRequest(destination, options = {}) {
  const resolvedDestination = resolveStreamProxyDestination(destination, options.encodedDestination);

  if (!resolvedDestination?.trim()) {
    return proxyError(400, 'Missing destination');
  }

  let target;
  try {
    target = new URL(resolvedDestination.trim());
    const unwrapped = unwrapEmbeddedStreamProxyUrl(target);
    if (unwrapped) target = new URL(unwrapped);
    target = normalizeDigitalsunStreamUrl(target);
  } catch {
    return proxyError(400, 'Invalid destination URL');
  }

  if (!ALLOWED_PROTOCOLS.has(target.protocol)) {
    return proxyError(400, 'Only http(s) destinations are allowed');
  }

  try {
    const upstreamHeaders = upstreamHeadersForUrl(target);
    const clientRange = getClientRangeHeader(options);
    if (clientRange) {
      upstreamHeaders.Range = String(clientRange);
    }

    const playlistRewriteSourceUrl = target.toString();
    if (target.searchParams.has('headers')) {
      try {
        JSON.parse(target.searchParams.get('headers') || '{}');
        target.searchParams.delete('headers');
      } catch {
        /* Leave non-JSON headers parameters untouched; they may belong to the provider URL. */
      }
    }

    if (isProgressiveMediaUrl(target)) {
      return proxyProgressiveMedia(target, upstreamHeaders);
    }

    const {
      upstream,
      bodyBuffer,
      headers: usedHeaders,
    } = await fetchUpstreamAuto(target.toString(), upstreamHeaders);

    const contentType = passThroughUpstreamHeader(upstream, 'content-type') || 'application/octet-stream';
    const pathHaystack = `${target.pathname}${target.search}`.toLowerCase();
    const bodyHead = bodyBuffer.toString('utf8', 0, Math.min(bodyBuffer.length, 2048));
    const isPlaylist =
      bodyHead.includes('#EXTM3U') &&
      !isProbablyHtml(bodyHead) &&
      (
        contentType.toLowerCase().includes('mpegurl') ||
        contentType.toLowerCase().includes('application/vnd.apple') ||
        pathHaystack.includes('.m3u8') ||
        pathHaystack.includes('/playlist/')
      );

    const proxyRewriteBase = getProxyRewriteBase(options);
    const rewriteReferer = refererHeadersForRewrite(usedHeaders);
    let body = bodyBuffer;
    if (isPlaylist) {
      body = rewriteM3u8Playlist(
        bodyBuffer.toString('utf8'),
        playlistRewriteSourceUrl,
        proxyRewriteBase,
        rewriteReferer
      );
    } else if (isDigitalsunHost(target.hostname) && isDigitalsunUrlListBuffer(bodyBuffer)) {
      body = await resolveDigitalsunUrlListSegment(bodyBuffer, usedHeaders);
    }
    const responseContentType = isPlaylist
      ? 'application/vnd.apple.mpegurl'
      : normalizeMediaContentType(contentType, bodyBuffer);

    const isSuccess = upstream.status >= 200 && upstream.status < 400;
    const looksLikeHtml = isProbablyHtml(bodyHead);
    const cacheControl =
      !isSuccess || looksLikeHtml
        ? 'no-store, no-cache, must-revalidate'
        : isPlaylist
          ? 'no-store'
          : 'private, max-age=3600, stale-while-revalidate=300';

    const responseHeaders = {
      'Content-Type': responseContentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': cacheControl,
    };

    if (!isSuccess || looksLikeHtml) {
      responseHeaders.Pragma = 'no-cache';
      responseHeaders.Expires = '0';
    }

    if (!isPlaylist && isSuccess && !looksLikeHtml) {
      const contentLength = passThroughUpstreamHeader(upstream, 'content-length');
      const contentRange = passThroughUpstreamHeader(upstream, 'content-range');
      const acceptRanges = passThroughUpstreamHeader(upstream, 'accept-ranges');

      if (contentLength) responseHeaders['Content-Length'] = contentLength;
      if (contentRange) responseHeaders['Content-Range'] = contentRange;
      if (acceptRanges) {
        responseHeaders['Accept-Ranges'] = acceptRanges;
      } else if (upstream.status === 200 || upstream.status === 206) {
        responseHeaders['Accept-Ranges'] = 'bytes';
      }
    }

    return {
      statusCode: upstream.status,
      headers: responseHeaders,
      body,
    };
  } catch (err) {
    return proxyError(502, err?.message ?? 'Stream proxy fetch failed');
  }
}

function isProgressiveMediaUrl(target) {
  return PROGRESSIVE_MEDIA_RE.test(target.pathname);
}

function progressiveMediaHeaders(upstream) {
  const contentType = passThroughUpstreamHeader(upstream, 'content-type') || 'video/mp4';
  const headers = {
    'Content-Type': /html|text\//i.test(contentType) ? 'video/mp4' : contentType,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'private, max-age=3600, stale-while-revalidate=300',
  };

  const contentLength = passThroughUpstreamHeader(upstream, 'content-length');
  const contentRange = passThroughUpstreamHeader(upstream, 'content-range');
  const acceptRanges = passThroughUpstreamHeader(upstream, 'accept-ranges');
  if (contentLength) headers['Content-Length'] = contentLength;
  if (contentRange) headers['Content-Range'] = contentRange;
  if (acceptRanges) {
    headers['Accept-Ranges'] = acceptRanges;
  } else if (upstream.status === 200 || upstream.status === 206) {
    headers['Accept-Ranges'] = 'bytes';
  }

  return headers;
}

async function proxyProgressiveMedia(target, upstreamHeaders) {
  const { upstream, headers: usedHeaders } = await fetchProgressiveAuto(target, upstreamHeaders);

  const headers = progressiveMediaHeaders(upstream);
  if (upstream.status >= 400) {
    headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';
    headers.Pragma = 'no-cache';
    headers.Expires = '0';
  }

  if (!upstream.body) {
    return {
      statusCode: upstream.status,
      headers,
      body: Buffer.from(await upstream.arrayBuffer()),
    };
  }

  return {
    statusCode: upstream.status,
    headers,
    stream: upstream.body,
    // usedHeaders kept for debugging; unused by pipe
    _usedReferer: usedHeaders?.Referer,
  };
}

export async function pipeProxyResult(res, result) {
  res.statusCode = result.statusCode;
  for (const [key, value] of Object.entries(result.headers ?? {})) {
    if (value != null) res.setHeader(key, value);
  }

  if (res.req?.method === 'HEAD') {
    res.end();
    return;
  }

  if (result.stream) {
    const { Readable } = await import('node:stream');
    const nodeStream = Readable.fromWeb(result.stream);
    const abort = () => {
      try {
        nodeStream.destroy();
      } catch {
        /* ignore */
      }
    };
    res.once('close', abort);
    nodeStream.once('error', () => {
      if (!res.writableEnded) res.destroy();
    });
    nodeStream.pipe(res);
    return;
  }

  res.end(result.body ?? '');
}

function proxyError(statusCode, message) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ error: message }),
  };
}

function embeddedHeadersForUrl(target) {
  const headersParam = target.searchParams.get('headers');
  if (!headersParam) return {};

  try {
    const parsed = JSON.parse(headersParam);
    const headers = {};
    for (const [key, value] of Object.entries(parsed)) {
      const normalizedKey = String(key).toLowerCase();
      if (normalizedKey === 'referer' || normalizedKey === 'referrer') {
        headers.Referer = String(value);
      } else if (normalizedKey === 'origin') {
        headers.Origin = String(value);
      } else if (normalizedKey === 'user-agent') {
        headers['User-Agent'] = String(value);
      }
    }
    return headers;
  } catch {
    return {};
  }
}

function isProbablyHtml(text) {
  const lower = String(text || '').trimStart().slice(0, 2048).toLowerCase();
  return (
    lower.startsWith('<!doctype html') ||
    lower.startsWith('<html') ||
    lower.includes('<title>attention required') ||
    lower.includes('cloudflare ray id') ||
    lower.includes('you have been blocked')
  );
}

function normalizeMediaContentType(contentType, bodyBuffer) {
  const lower = String(contentType || '').toLowerCase();

  if (isLikelyMpegTsSegment(bodyBuffer)) {
    return 'video/mp2t';
  }

  if ((lower.includes('image/') || lower.includes('octet-stream') || lower.includes('text/html')) && isLikelyMp4Segment(bodyBuffer)) {
    return 'video/mp4';
  }

  // VixSrc (and similar) disguise encrypted HLS segments as .html / text/html.
  if (lower.includes('text/html') || lower.includes('text/plain')) {
    const head = Buffer.isBuffer(bodyBuffer)
      ? bodyBuffer.toString('utf8', 0, Math.min(bodyBuffer.length, 64))
      : '';
    if (!isProbablyHtml(head)) {
      return 'application/octet-stream';
    }
  }

  return contentType || 'application/octet-stream';
}

function isLikelyMpegTsSegment(bodyBuffer) {
  if (!Buffer.isBuffer(bodyBuffer) || bodyBuffer.length < 188) return false;
  if (bodyBuffer[0] !== 0x47) return false;

  const packetOffsets = [188, 376, 564].filter(offset => offset < bodyBuffer.length);
  return packetOffsets.length === 0 || packetOffsets.some(offset => bodyBuffer[offset] === 0x47);
}

function isLikelyMp4Segment(bodyBuffer) {
  if (!Buffer.isBuffer(bodyBuffer) || bodyBuffer.length < 12) return false;
  const boxType = bodyBuffer.toString('ascii', 4, 8);
  return boxType === 'ftyp' || boxType === 'styp' || boxType === 'moof';
}

export function resolveStreamProxyDestination(destination, encodedDestination) {
  if (destination?.trim()) return destination.trim();
  if (!encodedDestination?.trim()) return null;

  try {
    return Buffer.from(decodeURIComponent(encodedDestination.trim()), 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function encodeProxyDestination(destination, proxyRewriteBase, refererHeaders = null) {
  const withReferer = attachRefererToDestination(destination, refererHeaders);
  return `${proxyRewriteBase}/${encodeURIComponent(
    Buffer.from(withReferer, 'utf8').toString('base64')
  )}?sp=2`;
}

function isDigitalsunHost(hostname) {
  return String(hostname || '').toLowerCase().includes('digitalsun.app');
}

function normalizeDigitalsunStreamUrl(url) {
  try {
    const parsed = new URL(url.toString());
    if (!isDigitalsunHost(parsed.hostname)) return parsed;

    // Master playlists use /video.m3u8; media segments stay on /?q= tokens.
    if (parsed.pathname === '/video.m3u8' && !parsed.searchParams.has('type')) {
      parsed.searchParams.set('type', 'hls');
    }

    return parsed;
  } catch {
    return url;
  }
}

function isDigitalsunUrlListBuffer(bodyBuffer) {
  if (!Buffer.isBuffer(bodyBuffer) || bodyBuffer.length < 64) return false;
  if (isLikelyMpegTsSegment(bodyBuffer) || isLikelyMp4Segment(bodyBuffer)) return false;

  const head = bodyBuffer.toString('utf8', 0, Math.min(bodyBuffer.length, 4096));
  if (head.includes('#EXTM3U') || isProbablyHtml(head)) return false;

  const lines = head.split(/\r?\n/).filter(line => line.startsWith('https://'));
  return lines.length >= 2 && lines.every(line => isDigitalsunHost(new URL(line).hostname));
}

async function resolveDigitalsunUrlListSegment(bodyBuffer, upstreamHeaders) {
  const lines = bodyBuffer
    .toString('utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith('https://') && isDigitalsunHost(new URL(line).hostname));

  const maxAttempts = Math.min(lines.length, DIGITALSUN_NESTED_SEGMENT_ATTEMPTS);
  for (let index = 0; index < maxAttempts; index += 1) {
    const candidate = lines[index];
    try {
      const nested = await fetchUpstream(
        candidate,
        upstreamHeaders,
        DIGITALSUN_PROBE_TIMEOUT_MS
      );
      if (!nested.ok) continue;

      const nestedBuffer = Buffer.from(await nested.arrayBuffer());
      if (isLikelyMpegTsSegment(nestedBuffer) || isLikelyMp4Segment(nestedBuffer)) {
        return nestedBuffer;
      }
    } catch {
      /* try next candidate */
    }
  }

  throw new Error('Digitalsun segment returned a URL list without a playable media chunk');
}

async function probeDigitalsunSegment(segUrl, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DIGITALSUN_PROBE_TIMEOUT_MS);

  try {
    const res = await fetch(segUrl, {
      headers: { ...headers, Range: 'bytes=0-2047' },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!res.ok || !res.body) return false;

    const reader = res.body.getReader();
    const { value } = await reader.read();
    await reader.cancel().catch(() => undefined);

    if (!value?.length) return false;
    return value[0] === 0x47;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function probeDigitalsunHlsPlayback(playlistUrl, mergedHeaders = {}) {
  try {
    let target = new URL(playlistUrl);
    target = normalizeDigitalsunStreamUrl(target);
    const headers = { ...upstreamHeadersForUrl(target), ...mergedHeaders };

    const playlistRes = await fetchUpstream(
      target.toString(),
      {
        ...headers,
        Accept: 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
      },
      DIGITALSUN_PROBE_TIMEOUT_MS
    );
    if (!playlistRes.ok) return false;

    const text = await playlistRes.text();
    if (!text.includes('#EXTM3U') || isProbablyHtml(text)) return false;

    const segUrl = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .find(line => line.startsWith('https://'));
    if (!segUrl) return false;

    return probeDigitalsunSegment(segUrl, headers);
  } catch {
    return false;
  }
}

function resolvePlaylistUri(uri, playlistUrl) {
  if (!uri || uri.startsWith('data:') || uri.startsWith('skd:')) return uri;

  try {
    const resolved = new URL(uri, playlistUrl);
    const unwrapped = unwrapEmbeddedStreamProxyUrl(resolved);
    const destination = unwrapped || resolved.toString();
    const withHeaders = inheritEmbeddedHeaders(destination, playlistUrl);
    return withHeaders.toString();
  } catch {
    return uri;
  }
}

function inheritEmbeddedHeaders(destination, playlistUrl) {
  try {
    const inheritedHeaders = new URL(playlistUrl).searchParams.get('headers');
    if (!inheritedHeaders) return destination;

    const parsed = new URL(destination);
    if (!parsed.searchParams.has('headers')) {
      parsed.searchParams.set('headers', inheritedHeaders);
    }
    return parsed.toString();
  } catch {
    return destination;
  }
}

function unwrapEmbeddedStreamProxyUrl(url) {
  const marker = '/api/stream-proxy/';
  const markerIndex = url.pathname.indexOf(marker);
  if (markerIndex === -1) return null;

  const encodedDestination = url.pathname.slice(markerIndex + marker.length);
  if (!encodedDestination) return null;

  try {
    const destination = Buffer.from(decodeURIComponent(encodedDestination), 'base64').toString('utf8');
    return /^https?:\/\//i.test(destination) ? destination : null;
  } catch {
    return null;
  }
}

function rewriteUriAttributes(line, playlistUrl, proxyRewriteBase, refererHeaders = null) {
  return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
    const resolved = resolvePlaylistUri(uri, playlistUrl);
    if (resolved === uri && (uri.startsWith('data:') || uri.startsWith('skd:'))) {
      return `URI="${uri}"`;
    }
    return `URI="${encodeProxyDestination(resolved, proxyRewriteBase, refererHeaders)}"`;
  });
}

function rewriteM3u8Playlist(text, playlistUrl, proxyRewriteBase, refererHeaders = null) {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .map((rawLine) => {
      const line = rawLine.trim();
      if (!line) return rawLine;

      if (line.startsWith('#')) {
        return line.includes('URI="')
          ? rewriteUriAttributes(rawLine, playlistUrl, proxyRewriteBase, refererHeaders)
          : rawLine;
      }

      return encodeProxyDestination(
        resolvePlaylistUri(line, playlistUrl),
        proxyRewriteBase,
        refererHeaders
      );
    })
    .join('\n');
}
