'use client';

import { useEffect, useState } from 'react';
import { COMMUNITY_CATEGORIES, isCommunityAggregate, type CommunityAggregate } from '@/lib/community/contracts';
import { MEDELLIN_COMUNAS } from '@/utils/medellinGeo';

async function fetchGroups(signal: AbortSignal): Promise<CommunityAggregate[]> {
  const response = await fetch('/api/community', { cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
  const data: unknown = await response.json();
  if (!response.ok || !data || typeof data !== 'object' || !('groups' in data) || !Array.isArray(data.groups) ||
    data.groups.length > 64 || !data.groups.every(isCommunityAggregate)) throw new Error('Invalid aggregates');
  return data.groups;
}

export function CommunityMap() {
  const [groups, setGroups] = useState<CommunityAggregate[]>([]);
  const [category, setCategory] = useState('all');
  const [state, setState] = useState('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetchGroups(controller.signal).then(data => {
      if (!controller.signal.aborted) { setGroups(data); setState('ready'); }
    }, () => { if (!controller.signal.aborted) setState('error'); });
    return () => controller.abort();
  }, [retry]);
  const filtered = groups.filter(group => category === 'all' || group.category === category);
  const counts = new Map<number, number>();
  for (const group of filtered) counts.set(group.commune, (counts.get(group.commune) ?? 0) + group.count);

  return <section className="community-map-section" aria-labelledby="community-map-title">
    <h2 id="community-map-title">Observaciones por comuna</h2>
    <p>Últimos 30 días, según el día de Bogotá. Son avisos ciudadanos sin verificar: no indican personas distintas ni niveles de ruido comparables.</p>
    <label className="community-field">Filtrar categoría
      <select value={category} onChange={event => setCategory(event.target.value)}>
        <option value="all">Todas las categorías</option>
        {Object.entries(COMMUNITY_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </label>
    {state === 'loading' && <p role="status">Consultando observaciones…</p>}
    {state === 'error' && <div role="alert"><p>No se pudo consultar el mapa. No significa que haya cero observaciones.</p><button className="community-secondary" onClick={() => { setState('loading'); setRetry(value => value + 1); }}>Reintentar mapa</button></div>}
    <svg viewBox="0 0 420 450" role="img" aria-labelledby="commune-map-caption" className="commune-map">
      <title id="commune-map-caption">Mapa esquemático de las 16 comunas de Medellín</title>
      <text x="25" y="25" fill="currentColor">Norte ↑</text>
      {MEDELLIN_COMUNAS.map(zone => {
        const x = 45 + (zone.centerLon + 75.62) / 0.075 * 330;
        const y = 55 + (6.31 - zone.centerLat) / 0.102 * 350;
        const count = state === 'ready' ? counts.get(zone.number) ?? 0 : null;
        return <g key={zone.number}>
          <title>{`${zone.name}: ${count === null ? 'sin datos actualizados' : `${count} observaciones`}`}</title>
          <circle cx={x} cy={y} r="16" fill={count ? '#6EE7B7' : '#111827'} stroke="#6EE7B7" />
          <text x={x} y={y + 5} textAnchor="middle" fill={count ? '#0B0F19' : '#F9FAFB'} fontWeight="700">{zone.number}</text>
        </g>;
      })}
    </svg>
    <p className="community-note">Centros aproximados de comunas, sin límites oficiales. Círculo lleno: hay observaciones. Los números identifican comunas, nunca ubicaciones de personas.</p>
    {state === 'ready' && <>
      {filtered.length === 0 && <p role="status">Sin observaciones para esta categoría en los últimos 30 días.</p>}
      <div className="community-table-wrap"><table>
        <caption>Recuentos por comuna y categoría</caption>
        <thead><tr><th scope="col">Comuna</th><th scope="col">Categoría</th><th scope="col">Avisos</th></tr></thead>
        <tbody>{filtered.map(group => <tr key={`${group.commune}-${group.category}`}>
          <th scope="row">{MEDELLIN_COMUNAS[group.commune - 1].name}</th><td>{COMMUNITY_CATEGORIES[group.category]}</td><td>{group.count}</td>
        </tr>)}</tbody>
      </table></div>
    </>}
  </section>;
}
