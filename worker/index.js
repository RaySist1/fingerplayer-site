import { handleApiRequest } from '../server/apiHandler.mjs';

/**
 * Cloudflare Worker entry point.
 * Handles /api/* requests and serves static assets via env.ASSETS if present.
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (
      url.pathname.startsWith('/api/') ||
      url.pathname === '/health' ||
      url.pathname === '/api'
    ) {
      return handleApiRequest(request, env);
    }

    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
