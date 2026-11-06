import { legalResponse } from '../../../src/lib/defender/response';

export function onRequestPost(context: { request: Request; env: { DEEPSEEK_API_KEY?: string } }) {
  return legalResponse(context.request, context.env.DEEPSEEK_API_KEY);
}
