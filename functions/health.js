import { handleApiRequest } from '../server/apiHandler.mjs';

export async function onRequest(context) {
  return handleApiRequest(context.request, context.env);
}
