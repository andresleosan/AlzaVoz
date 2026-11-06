import { recordingProxy, type RecordingGatewayEnv } from '../../../src/lib/recording/proxy';

export function onRequest(context: { request: Request; env: RecordingGatewayEnv }) {
  return recordingProxy(context.request, context.env);
}
