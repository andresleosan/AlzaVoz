import { searchProxy, type SearchGatewayEnv } from '../../../src/lib/search/proxy';
export function onRequest(context: { request: Request; env: SearchGatewayEnv }) { return searchProxy(context.request, context.env); }
