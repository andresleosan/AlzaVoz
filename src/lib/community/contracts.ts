export const COMMUNITY_CATEGORIES = {
  music: 'Música y reuniones', traffic: 'Tránsito', construction: 'Obras', other: 'Otro ruido',
} as const;
export type CommunityCategory = keyof typeof COMMUNITY_CATEGORIES;
export interface CommunityInput { requestId: string; commune: number; category: CommunityCategory; day: string }
export interface CommunityAggregate { commune: number; category: CommunityCategory; count: number }

export function bogotaDay(date = new Date()): string {
  return new Date(date.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
export function firstCommunityDay(now = new Date()): string {
  return bogotaDay(new Date(now.getTime() - 29 * 86400000));
}
export function isCategory(value: unknown): value is CommunityCategory {
  return typeof value === 'string' && Object.hasOwn(COMMUNITY_CATEGORIES, value);
}
export function parseCommunityInput(value: unknown, now = new Date()): CommunityInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).sort().join(',') !== 'category,commune,day,requestId' ||
    typeof v.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v.requestId) ||
    typeof v.commune !== 'number' || !Number.isInteger(v.commune) || v.commune < 1 || v.commune > 16 ||
    !isCategory(v.category) || typeof v.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.day) ||
    !Number.isFinite(Date.parse(v.day)) || new Date(v.day).toISOString().slice(0, 10) !== v.day ||
    v.day < firstCommunityDay(now) || v.day > bogotaDay(now)) return null;
  return { requestId: v.requestId, commune: v.commune, category: v.category, day: v.day };
}
export function isCommunityAggregate(value: unknown): value is CommunityAggregate {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.commune === 'number' && Number.isInteger(v.commune) && v.commune >= 1 && v.commune <= 16 &&
    isCategory(v.category) && typeof v.count === 'number' && Number.isSafeInteger(v.count) && v.count > 0;
}
