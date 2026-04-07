import { DemandSignal, MarketplaceSearchQuery } from '@/types';

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function demandScoreFromCount(count: number): number {
  if (count >= 50) return 100;
  if (count >= 11) return 60;
  if (count >= 1) return 25;
  return 0;
}

export function demandLevelFromScore(score: number): 'low' | 'medium' | 'high' {
  if (score >= 100) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

export function aggregateDemandSignals(searches: MarketplaceSearchQuery[]): DemandSignal[] {
  const nowIso = new Date().toISOString();
  const grouped = new Map<string, DemandSignal>();

  for (const search of searches) {
    const query = search.query?.trim();
    if (!query) continue;
    const normalizedQuery = normalizeQuery(query);
    const existing = grouped.get(normalizedQuery);
    if (!existing) {
      grouped.set(normalizedQuery, {
        id: `signal_${normalizedQuery.replace(/\s+/g, '_')}`,
        query,
        normalizedQuery,
        category: search.category,
        brand: search.brand,
        color: search.color,
        size: search.size,
        count: 1,
        demandScore: demandScoreFromCount(1),
        createdAt: search.timestamp || nowIso,
        updatedAt: search.timestamp || nowIso,
      });
      continue;
    }

    const nextCount = existing.count + 1;
    grouped.set(normalizedQuery, {
      ...existing,
      query,
      category: existing.category || search.category,
      brand: existing.brand || search.brand,
      color: existing.color || search.color,
      size: existing.size || search.size,
      count: nextCount,
      demandScore: demandScoreFromCount(nextCount),
      updatedAt: search.timestamp || nowIso,
    });
  }

  return Array.from(grouped.values()).sort((a, b) => b.demandScore - a.demandScore || b.count - a.count);
}
