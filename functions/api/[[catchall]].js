import { handleApiRequest } from '../../server/apiHandler.mjs';

/**
 * Cloudflare Pages Function entry point.
 * Matches all /api/* requests.
 */
export async function onRequest(context) {
  return handleApiRequest(context.request, context.env);
}
