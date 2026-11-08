import { communityProxy } from '../../src/lib/community/proxy';
import type { RecordingGatewayEnv } from '../../src/lib/recording/proxy';
export function onRequest(context: { request: Request; env: RecordingGatewayEnv }) {
  return communityProxy(context.request, context.env);
}
