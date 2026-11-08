import { reportProxy } from '@/lib/report/proxy';

function proxy(request: Request) {
  return reportProxy(request, {
    RECORDING_API_URL: process.env.RECORDING_API_URL,
    RECORDING_GATEWAY_SECRET: process.env.RECORDING_GATEWAY_SECRET,
    RECORDING_APP_ORIGIN: process.env.RECORDING_APP_ORIGIN,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
