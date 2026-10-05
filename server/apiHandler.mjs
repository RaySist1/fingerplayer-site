import { handleFingerProxyRequest } from './fingerResolve.mjs';
import { handleIntroDbRequest } from './introDb.mjs';
import { handleImdbTrailerRequest } from './imdbTrailer.mjs';
import {
  handleSubtitleFileRequest,
  handleSubtitleSearchRequest,
} from './subtitleResolve.mjs';
import { handleStreamProxyRequest } from './streamProxy.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

function withCors(headers = {}) {
  return { ...corsHeaders, ...headers };
}

function sendResult(result) {
  const headers = withCors(result.headers || {});
  const body = result.stream || result.body;
  return new Response(body, {
    status: result.statusCode || 200,
    headers,
  });
}

function sendJson(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: withCors({ 'Content-Type': 'application/json' }),
  });
}

function sendText(statusCode, body, contentType = 'text/plain; charset=utf-8') {
  return new Response(body, {
    status: statusCode,
    headers: withCors({ 'Content-Type': contentType }),
  });
}

function apiInfo(url) {
  const origin = url.origin;
  return {
    name: 'FingerPlayer Cloudflare API & Proxy',
    status: 'online',
    version: '2.0.0',
    endpoints: {
      fingerMovie: `${origin}/api/finger/movie/550?provider=fingerapi`,
      fingerSeries: `${origin}/api/finger/tv/1396/1/1?provider=fingerapi`,
      fingerExtract: `${origin}/api/finger/extract?url={embedUrl}`,
      streamProxy: `${origin}/api/stream-proxy/{base64-stream-url}`,
      subtitles: `${origin}/api/subtitles?type=series&tmdbId=2316&season=1&episode=1`,
      introdb: `${origin}/api/introdb?type=series&tmdbId=2316&season=1&episode=1`,
      imdbTrailer: `${origin}/api/imdb-trailer?imdbId=tt1266020`,
      health: `${origin}/api/health`,
    },
  };
}

async function handleTmdbMetadata(url, env) {
  const mediaType = url.searchParams.get('type');
  const tmdbId = url.searchParams.get('tmdbId');
  const season = url.searchParams.get('season');
  const episode = url.searchParams.get('episode');

  if (!['movie', 'series'].includes(mediaType) || !/^\d+$/.test(tmdbId || '')) {
    return sendJson(400, { error: 'A valid media type and TMDB ID are required' });
  }

  if (mediaType === 'series' && (!/^\d+$/.test(season || '') || !/^\d+$/.test(episode || ''))) {
    return sendJson(400, { error: 'A valid season and episode are required for series metadata' });
  }

  const apiKey =
    env?.TMDB_API_KEY ||
    env?.VITE_TMDB_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.TMDB_API_KEY || process.env?.VITE_TMDB_API_KEY : '');
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    return sendJson(503, { error: 'TMDB API key is not configured for the Worker' });
  }

  const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
  const detailsUrl = new URL(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}`);
  detailsUrl.searchParams.set('api_key', apiKey.trim());
  detailsUrl.searchParams.set('language', 'en-US');
  detailsUrl.searchParams.set('append_to_response', 'images');
  detailsUrl.searchParams.set('include_image_language', 'en,null');

  const detailsResponse = await fetch(detailsUrl);
  if (!detailsResponse.ok) {
    return sendJson(detailsResponse.status === 404 ? 404 : 502, {
      error: `TMDB details request failed (${detailsResponse.status})`,
    });
  }

  const details = await detailsResponse.json();
  let episodeDetails = null;
  if (mediaType === 'series') {
    const episodeUrl = new URL(
      `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}/episode/${episode}`
    );
    episodeUrl.searchParams.set('api_key', apiKey.trim());
    episodeUrl.searchParams.set('language', 'en-US');

    const episodeResponse = await fetch(episodeUrl);
    if (episodeResponse.ok) {
      episodeDetails = await episodeResponse.json();
    }
  }

  const logos = details.images?.logos || [];
  const logo = logos.find(image => image.iso_639_1 === 'en') ||
    logos.find(image => image.iso_639_1 == null) ||
    logos[0];

  return sendJson(200, {
    title: mediaType === 'series' ? details.name : details.title,
    episodeTitle: episodeDetails?.name,
    release_date: details.release_date,
    first_air_date: details.first_air_date,
    air_date: episodeDetails?.air_date,
    vote_average: episodeDetails?.vote_average ?? details.vote_average,
    logoUrl: logo?.file_path ? `https://image.tmdb.org/t/p/w500${logo.file_path}` : undefined,
    overview: episodeDetails?.overview || details.overview,
  });
}

/**
 * Universal Web Standard request handler for Cloudflare Pages Functions,
 * Cloudflare Workers, and Vite development server.
 *
 * @param {Request} request
 * @param {Record<string, unknown>} [env]
 * @returns {Promise<Response>}
 */
export async function handleApiRequest(request, env = {}) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return sendText(405, 'Method not allowed');
  }

  const isStreamProxy = path === '/api/stream-proxy' || path.startsWith('/api/stream-proxy/');
  const isSubtitles = path === '/api/subtitles' || path.startsWith('/api/subtitles/');
  const isIntroDb = path === '/api/introdb';
  const isImdbTrailer = path === '/api/imdb-trailer';
  const isTmdbMetadata = path === '/api/tmdb/metadata';
  const isFinger = path.startsWith('/api/finger');
  const isHealth = path === '/health' || path === '/api/health' || path === '/api';

  try {
    if (isHealth) {
      return sendJson(200, apiInfo(url));
    }

    if (isTmdbMetadata) {
      return handleTmdbMetadata(url, env);
    }

    if (isStreamProxy) {
      const destination = url.searchParams.get('destination');
      const encodedDestination =
        path === '/api/stream-proxy'
          ? null
          : path.replace(/^\/api\/stream-proxy\/?/, '');

      const requestHeaders = {};
      for (const [k, v] of request.headers.entries()) {
        requestHeaders[k.toLowerCase()] = v;
      }

      const result = await handleStreamProxyRequest(destination, {
        encodedDestination,
        proxyBasePath: '/api/stream-proxy',
        proxyPublicBase: `${url.origin}/api/stream-proxy`,
        range: request.headers.get('range') || undefined,
        requestHeaders,
      });

      return sendResult(result);
    }

    if (isSubtitles) {
      if (path.startsWith('/api/subtitles/file/')) {
        const encodedUrl = path.replace(/^\/api\/subtitles\/file\/?/, '');
        const result = await handleSubtitleFileRequest(encodedUrl, {
          fileId: url.searchParams.get('fileId') ?? undefined,
          wyzieId: url.searchParams.get('wyzieId') ?? undefined,
          tmdbId: url.searchParams.get('tmdbId') ?? undefined,
          imdbId: url.searchParams.get('imdbId') ?? undefined,
          season: url.searchParams.get('season') ?? undefined,
          episode: url.searchParams.get('episode') ?? undefined,
          language: url.searchParams.get('lang') ?? undefined,
          release: url.searchParams.get('release') ?? undefined,
          env,
        });
        return sendResult(result);
      }

      const result = await handleSubtitleSearchRequest({
        mediaType: url.searchParams.get('type') ?? undefined,
        tmdbId: url.searchParams.get('tmdbId') ?? undefined,
        imdbId: url.searchParams.get('imdbId') ?? undefined,
        season: url.searchParams.get('season') ?? undefined,
        episode: url.searchParams.get('episode') ?? undefined,
        language: url.searchParams.get('language') ?? undefined,
        env,
      });
      return sendResult(result);
    }

    if (isIntroDb) {
      const result = await handleIntroDbRequest({
        mediaType: url.searchParams.get('type') ?? undefined,
        tmdbId: url.searchParams.get('tmdbId') ?? undefined,
        imdbId: url.searchParams.get('imdbId') ?? undefined,
        season: url.searchParams.get('season') ?? undefined,
        episode: url.searchParams.get('episode') ?? undefined,
        env,
      });
      return sendResult(result);
    }

    if (isImdbTrailer) {
      const result = await handleImdbTrailerRequest({
        imdbId: url.searchParams.get('imdbId') ?? undefined,
        env,
      });
      return sendResult(result);
    }

    if (isFinger) {
      const fingerPath = path.replace(/^\/api\/finger\/?/, '');
      const result = await handleFingerProxyRequest(fingerPath, {
        provider: url.searchParams.get('provider') ?? undefined,
        title: url.searchParams.get('title') ?? undefined,
        year: url.searchParams.get('year') ?? undefined,
        imdbId: url.searchParams.get('imdbId') ?? undefined,
        extractUrl: url.searchParams.get('url') ?? url.searchParams.get('extractUrl') ?? undefined,
        env,
      });
      return sendResult(result);
    }

    return sendJson(404, { error: 'Not found', path });
  } catch (err) {
    return sendJson(err?.statusCode || 500, { error: err?.message || 'Internal proxy error' });
  }
}
