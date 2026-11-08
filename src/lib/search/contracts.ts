import { UUID } from '../recording/contracts';
import { bogotaDay } from '../community/contracts';

export const NOTICE_KINDS = ['person-lost', 'person-found', 'pet-lost', 'pet-found'] as const;
export type NoticeKind = typeof NOTICE_KINDS[number];
export const NOTICE_LABELS: Record<NoticeKind, string> = { 'person-lost': 'Persona perdida', 'person-found': 'Persona encontrada', 'pet-lost': 'Mascota perdida', 'pet-found': 'Mascota encontrada' };
export interface PublicNotice { id: string; kind: NoticeKind; title: string; description: string; commune: number; eventDate: string; createdAt: string }
export interface CreateNoticeInput { requestId: string; kind: NoticeKind; title: string; description: string; commune: number; eventDate: string; contact: string; consent: true }
export interface TipInput { requestId: string; text: string; contact: string; consent: true }
export interface Suggestion { id: string; reason: string }
export const MAX_SEARCH_BYTES = 8192;
export const NOTICE_LIMIT = 60;
export const CANDIDATE_LIMIT = 20;
export const complementaryKind: Record<NoticeKind, NoticeKind> = { 'person-lost': 'person-found', 'person-found': 'person-lost', 'pet-lost': 'pet-found', 'pet-found': 'pet-lost' };
export function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function keys(value: Record<string, unknown>, allowed: string[]): boolean { return Object.keys(value).every(key => allowed.includes(key)); }
function text(value: unknown, min: number, max: number): value is string { return typeof value === 'string' && value.trim().length >= min && value.length <= max && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value); }
export function isNoticeKind(value: unknown): value is NoticeKind { return NOTICE_KINDS.some(kind => kind === value); }
function date(value: unknown, now: Date): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > bogotaDay(now)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function parseCreateNotice(value: unknown, now = new Date()): CreateNoticeInput | null {
  if (!object(value) || !keys(value, ['requestId', 'kind', 'title', 'description', 'commune', 'eventDate', 'contact', 'consent']) || typeof value.requestId !== 'string' || !UUID.test(value.requestId) || !isNoticeKind(value.kind) || (!text(value.title, 3, 80) || /[\r\n]/.test(value.title)) || !text(value.description, 10, 1200) || !Number.isInteger(value.commune) || Number(value.commune) < 1 || Number(value.commune) > 16 || !date(value.eventDate, now) || !text(value.contact, 0, 200) || value.consent !== true) return null;
  return { requestId: value.requestId, kind: value.kind, title: value.title, description: value.description, commune: Number(value.commune), eventDate: value.eventDate, contact: value.contact, consent: true };
}
export function parseTip(value: unknown): TipInput | null {
  if (!object(value) || !keys(value, ['requestId', 'text', 'contact', 'consent']) || typeof value.requestId !== 'string' || !UUID.test(value.requestId) || !text(value.text, 3, 1200) || !text(value.contact, 0, 200) || value.consent !== true) return null;
  return { requestId: value.requestId, text: value.text, contact: value.contact, consent: true };
}
export function isPublicNotice(value: unknown): value is PublicNotice {
  return object(value) && keys(value, ['id', 'kind', 'title', 'description', 'commune', 'eventDate', 'createdAt']) && typeof value.id === 'string' && UUID.test(value.id) && isNoticeKind(value.kind) && text(value.title, 3, 80) && !/[\r\n]/.test(value.title) && text(value.description, 10, 1200) && Number.isInteger(value.commune) && Number(value.commune) >= 1 && Number(value.commune) <= 16 && typeof value.eventDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.eventDate) && typeof value.createdAt === 'string' && Number.isFinite(Date.parse(value.createdAt));
}
