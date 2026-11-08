import { adminProxy, type AdminGatewayEnv } from '../../../src/lib/admin/proxy';

export function onRequest(context: { request: Request; env: AdminGatewayEnv }) {
  return adminProxy(context.request, context.env);
}
