import { recordingProxy } from '@/lib/recording/proxy';
function proxy(request: Request) {
  return recordingProxy(request, {
    RECORDING_API_URL: process.env.RECORDING_API_URL,
    RECORDING_GATEWAY_SECRET: process.env.RECORDING_GATEWAY_SECRET,
    RECORDING_APP_ORIGIN: process.env.RECORDING_APP_ORIGIN,
  });
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
