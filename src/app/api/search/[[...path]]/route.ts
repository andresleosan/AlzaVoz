import { searchProxy } from '@/lib/search/proxy';
function proxy(request: Request) { return searchProxy(request, { RECORDING_API_URL: process.env.RECORDING_API_URL, RECORDING_GATEWAY_SECRET: process.env.RECORDING_GATEWAY_SECRET, RECORDING_APP_ORIGIN: process.env.RECORDING_APP_ORIGIN, DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY }); }
export const GET = proxy;
export const POST = proxy;
