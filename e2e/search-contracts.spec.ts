import { test, expect } from '@playwright/test';
import { parseCreateNotice, parseTip, type PublicNotice } from '../src/lib/search/contracts';
import { findMatches } from '../src/lib/search/matches';
import { searchProxy } from '../src/lib/search/proxy';
import { handleSearch } from '../workers/recordings/search';

const notice: PublicNotice = { id: crypto.randomUUID(), kind: 'pet-lost', title: 'Caso ficticio', description: 'Descripción sintética para prueba.', commune: 10, eventDate: '2026-01-01', createdAt: '2026-01-02T00:00:00Z' };
const candidate: PublicNotice = { ...notice, id: crypto.randomUUID(), kind: 'pet-found' };
test('parsers estrictos rechazan fechas imposibles y campos privados inesperados', () => {
  const valid = { kind: notice.kind, title: notice.title, description: notice.description, commune: notice.commune, eventDate: notice.eventDate, requestId: crypto.randomUUID(), consent: true, contact: '' };
  expect(parseCreateNotice(valid)).toEqual(valid);
  for (const eventDate of ['2025-99-99', '2026-99-99', '2026-02-30', '2099-01-01', 'texto']) expect(parseCreateNotice({ ...valid, eventDate })).toBeNull();
  expect(parseCreateNotice({ ...valid, phone: 'secret' })).toBeNull();
  expect(parseCreateNotice({ ...valid, title: 'Título\nmultilínea' })).toBeNull();
  expect(parseTip({ requestId: crypto.randomUUID(), text: 'pista', contact: '', consent: true })).toBeTruthy();
  expect(parseTip({ requestId: crypto.randomUUID(), text: 'pista', contact: '', consent: true, noticeId: notice.id })).toBeNull();
});

test('Worker limita candidatos antes de leer la colección', async () => {
  let candidateReads = 0;
  const statement = {
    bind: () => statement,
    first: async <T>() => ({ ...notice, event_date: notice.eventDate, created_at: notice.createdAt } as unknown as T),
    all: async <T>() => { candidateReads++; return { results: [] as T[] }; },
    run: async () => ({ success: true }),
  };
  const response = await handleSearch(new Request(`https://internal.test/search/${notice.id}/candidates`), { DB: { prepare: () => statement, batch: async () => [] }, SESSION_LIMITER: { limit: async () => ({ success: false }) } });
  expect(response.status).toBe(429);
  expect(candidateReads).toBe(0);
});

test('IA valida candidatos, no sigue IDs inventados y solo recibe proyección pública', async () => {
  let prompt = '';
  const fetcher: typeof fetch = async (_url, init) => {
    prompt = String(init?.body);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ suggestions: [{ id: candidate.id, reason: 'Color y comuna similares.' }] }) } }] });
  };
  expect(await findMatches(notice, [candidate], 'synthetic-key', fetcher)).toEqual([{ id: candidate.id, reason: 'Color y comuna similares.' }]);
  expect(prompt).toContain('deepseek-flash');
  expect(prompt).not.toMatch(/contact|requestId|tips/);
  for (const content of ['not json', JSON.stringify({ suggestions: [{ id: crypto.randomUUID(), reason: 'Inventada' }] }), JSON.stringify({ suggestions: [{ id: candidate.id, reason: '' }] })]) {
    await expect(findMatches(notice, [candidate], 'synthetic-key', async () => Response.json({ choices: [{ message: { content } }] }))).rejects.toThrow();
  }
  expect(await findMatches(notice, [], undefined, async () => { throw new Error('No debe llamarse'); })).toEqual([]);
  expect(await findMatches(notice, [candidate], 'synthetic-key', async () => Response.json({ choices: [{ message: { content: '{"suggestions":[]}' } }] }))).toEqual([]);
  await expect(findMatches(notice, [candidate], undefined, fetcher)).rejects.toThrow();
  await expect(findMatches(notice, [candidate], 'synthetic-key', async () => new Response('', { status: 500 }))).rejects.toThrow();
});

test('gateway no publica candidatos internos y IA exige consentimiento antes de consultar', async () => {
  const env = { RECORDING_GATEWAY_SECRET: 'x'.repeat(32), RECORDING_APP_ORIGIN: 'https://example.test', RECORDINGS: { fetch: async () => { throw new Error('No debe llamar'); } } };
  expect((await searchProxy(new Request(`https://example.test/api/search/${notice.id}/candidates`), env)).status).toBe(404);
  expect((await searchProxy(new Request(`https://example.test/api/search/${notice.id}/matches`, { method: 'POST', headers: { origin: env.RECORDING_APP_ORIGIN, 'x-search-client': '1', 'content-type': 'application/json' }, body: '{"consent":false}' }), env)).status).toBe(400);
});

test('gateway conserva límite de IA y no finge consulta cuando faltan candidatos', async () => {
  for (const limited of [true, false]) {
    const calls: string[] = [];
    const env = { RECORDING_GATEWAY_SECRET: 'x'.repeat(32), RECORDING_APP_ORIGIN: 'https://example.test', RECORDINGS: { fetch: async (request: Request) => {
      calls.push(new URL(request.url).pathname);
      return request.url.endsWith('/candidates') ? limited ? Response.json({ error: 'Espera un minuto' }, { status: 429 }) : Response.json({ notices: [] }) : Response.json({ notice });
    } } };
    const response = await searchProxy(new Request(`https://example.test/api/search/${notice.id}/matches`, { method: 'POST', headers: { origin: env.RECORDING_APP_ORIGIN, 'x-search-client': '1', 'content-type': 'application/json' }, body: '{"consent":true}' }), env);
    expect(response.status).toBe(limited ? 429 : 200);
    if (!limited) expect(await response.json()).toEqual({ suggestions: [], source: 'no-candidates' });
    expect(calls).toHaveLength(2);
  }
});
