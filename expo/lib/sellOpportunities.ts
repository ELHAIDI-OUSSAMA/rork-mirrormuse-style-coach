import { ClosetItem, ClosetSellOpportunity, DemandSignal } from '@/types';
import { estimateResaleValue } from '@/lib/resaleEstimator';
import { demandLevelFromScore } from '@/lib/demandSignals';

const DAY_MS = 24 * 60 * 60 * 1000;

function normalize(value?: string): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function monthsSince(dateLike?: string): number {
  if (!dateLike) return 12;
  const at = new Date(dateLike).getTime();
  if (!Number.isFinite(at)) return 12;
  return Math.max(0, (Date.now() - at) / (30 * DAY_MS));
}

function getDemandMatch(item: ClosetItem, signal: DemandSignal): { matched: boolean; relevance: number; reason: string } {
  const itemText = normalize(`${item.category} ${item.brand} ${item.color} ${item.size}`);
  const query = normalize(signal.normalizedQuery || signal.query);
  const queryTokens = query.split(' ').filter(Boolean);
  const tokenMatches = queryTokens.filter((token) => itemText.includes(token)).length;
  const tokenCoverage = queryTokens.length > 0 ? tokenMatches / queryTokens.length : 0;
  const exactLike = query.length > 0 && itemText.includes(query);
  const brandMatch = !!(signal.brand && normalize(item.brand) === normalize(signal.brand));
  const categoryMatch = !!(signal.category && normalize(item.category) === normalize(signal.category));
  const colorMatch = !!(signal.color && normalize(item.color) === normalize(signal.color));
  const relevance = (exactLike ? 0.42 : 0) + tokenCoverage * 0.28 + (brandMatch ? 0.16 : 0) + (categoryMatch ? 0.1 : 0) + (colorMatch ? 0.04 : 0);
  const matched = exactLike || relevance >= 0.36;
  const reason = brandMatch || exactLike
    ? 'Users are searching for this item'
    : categoryMatch
      ? 'This category is trending in the marketplace'
      : 'There is demand for similar pieces right now';
  return { matched, relevance, reason };
}

function scoreOpportunity(item: ClosetItem, signal: DemandSignal, relevance: number): number {
  const demandFactor = Math.min(1, signal.demandScore / 100);
  const resale = item.estimatedResaleValue || estimateResaleValue(item);
  const resaleFactor = Math.min(1, resale / 120);
  const inactivityFactor = Math.min(1, monthsSince(item.lastWornAt || item.lastUsedAt || item.createdAt) / 8);
  return Number((demandFactor * 0.4 + resaleFactor * 0.25 + inactivityFactor * 0.2 + relevance * 0.15).toFixed(3));
}

export function findSellOpportunities(closetItems: ClosetItem[], demandSignals: DemandSignal[]): ClosetSellOpportunity[] {
  const opportunities: ClosetSellOpportunity[] = [];
  for (const item of closetItems) {
    if (item.status === 'listed_for_sale' || item.status === 'sold' || item.status === 'donated' || item.status === 'archived') continue;
    const best = demandSignals
      .map((signal) => {
        const match = getDemandMatch(item, signal);
        if (!match.matched) return null;
        return { signal, ...match, score: scoreOpportunity(item, signal, match.relevance) };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.score || 0) - (a?.score || 0))[0];
    if (!best) continue;
    if ((best.score || 0) < 0.35) continue;
    const estResale = item.estimatedResaleValue || estimateResaleValue(item);
    const demandLevel = demandLevelFromScore(best.signal.demandScore);
    const inactiveMonths = Math.max(1, Math.round(monthsSince(item.lastWornAt || item.lastUsedAt || item.createdAt)));
    opportunities.push({
      id: `sell_opp_${item.id}_${best.signal.id}`,
      closetItemId: item.id,
      demandSignalId: best.signal.id,
      title: `${item.color} ${item.category}`,
      message: demandLevel === 'high'
        ? 'This item could sell quickly.'
        : 'There is demand for this style in the marketplace.',
      estimatedResaleValue: estResale,
      demandLevel,
      reason: inactiveMonths >= 4
        ? `${best.reason}. You have not worn it in about ${inactiveMonths} months.`
        : `${best.reason}. This item has solid resale potential.`,
      createdAt: new Date().toISOString(),
    });
  }

  return opportunities.sort((a, b) => {
    const levelRank = { high: 3, medium: 2, low: 1 } as const;
    const aRank = levelRank[a.demandLevel];
    const bRank = levelRank[b.demandLevel];
    if (aRank !== bRank) return bRank - aRank;
    return (b.estimatedResaleValue || 0) - (a.estimatedResaleValue || 0);
  });
}

export function maybeSendSellOpportunityNotification(params: {
  opportunity: ClosetSellOpportunity;
  closetItem: ClosetItem | undefined;
  lastNotificationAt?: string;
}): boolean {
  const { opportunity, closetItem, lastNotificationAt } = params;
  if (!closetItem || closetItem.status !== 'active') return false;
  if (opportunity.demandLevel !== 'high') return false;
  if (opportunity.dismissedUntil && new Date(opportunity.dismissedUntil).getTime() > Date.now()) return false;
  const lastWornAt = closetItem.lastWornAt || closetItem.lastUsedAt || closetItem.createdAt;
  if (monthsSince(lastWornAt) < 2.5) return false;
  if (lastNotificationAt) {
    const lastAt = new Date(lastNotificationAt).getTime();
    if (Number.isFinite(lastAt) && Date.now() - lastAt < DAY_MS) return false;
  }
  return true;
}
