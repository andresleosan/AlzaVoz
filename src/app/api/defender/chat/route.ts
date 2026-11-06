import { legalResponse } from '@/lib/defender/response';
export async function POST(request: Request) {
  return legalResponse(request, process.env.DEEPSEEK_API_KEY);
}
