import { reportProxy } from '../../../src/lib/report/proxy';
import type { RecordingGatewayEnv } from '../../../src/lib/recording/proxy';

export function onRequest(context: { request: Request; env: RecordingGatewayEnv }) {
  return reportProxy(context.request, context.env);
}
