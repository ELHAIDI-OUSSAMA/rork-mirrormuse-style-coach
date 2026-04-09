import {
  ClosetItem,
  DemandInsight,
  DemandLevel,
  DemandNotification,
  MarketplaceListing,
  MarketplaceSearchQuery,
} from '@/types';
import { estimateResaleValue } from '@/lib/resaleEstimator';

function normalize(value?: string): string {
  return (value || '').trim().toLowerCase();
}

export function buildDemandQueryKey(input: {
  query: string;
  category?: string;
  brand?: string;
  size?: string;
  color?: string;
}): string {
  const q = normalize(input.query);
  const c = normalize(input.category);
  const b = normalize(input.brand);
  const s = normalize(input.size);
  const color = normalize(input.color);
  return [q, c, b, s, color].join('|');
}

function demandLevelForScore(score: number): DemandLevel {
  if (score >= 8) return 'high';
  if (score >= 3.5) return 'medium';
  return 'low';
}

export function computeDemandInsights(searches: MarketplaceSearchQuery[]): DemandInsight[] {
  const grouped = new Map<
    string,
    {
      query: string;
      category?: string;
      brand?: string;
      size?: string;
      color?: string;
      frequency: number;
      recencyBoost: number;
    }
  >();

  const now = Date.now();
  for (const entry of searches) {
    const key = buildDemandQueryKey(entry);
    const existing = grouped.get(key) || {
      query: entry.query,
      category: entry.category,
      brand: entry.brand,
      size: entry.size,
      color: entry.color,
      frequency: 0,
      recencyBoost: 0,
    };
    existing.frequency += 1;
    const ageDays = Math.max(0, (now - new Date(entry.timestamp).getTime()) / (24 * 60 * 60 * 1000));
    existing.recencyBoost += Math.max(0.2, 2 - Math.min(2, ageDays / 15));
    grouped.set(key, existing);
  }

  return Array.from(grouped.entries())
    .map(([queryKey, item]) => {
      const score = Number((item.frequency + item.recencyBoost).toFixed(2));
      return {
        queryKey,
        query: item.query,
        score,
        frequency: item.frequency,
        demandLevel: demandLevelForScore(score),
        category: item.category,
        brand: item.brand,
        size: item.size,
        color: item.color,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function listingMatchesDemand(listing: MarketplaceListing, demand: DemandInsight): boolean {
  const query = normalize(demand.query);
  const category = normalize(demand.category);
  const brand = normalize(demand.brand);
  const size = normalize(demand.size);
  const color = normalize(demand.color);
  const listingText = normalize(`${listing.title} ${listing.description} ${listing.category} ${listing.brand} ${listing.size} ${listing.color}`);
  if (query && !listingText.includes(query) && !query.split(' ').every((token) => listingText.includes(token))) return false;
  if (category && normalize(listing.category) !== category) return false;
  if (brand && normalize(listing.brand) !== brand) return false;
  if (size && normalize(listing.size) !== size) return false;
  if (color && normalize(listing.color) !== color) return false;
  return listing.status === 'active';
}

function closetItemMatchesDemand(item: ClosetItem, demand: DemandInsight): boolean {
  if (item.status === 'listed_for_sale' || item.status === 'sold' || item.status === 'donated' || item.status === 'archived') {
    return false;
  }
  const itemText = normalize(`${item.category} ${item.brand} ${item.size} ${item.color}`);
  const query = normalize(demand.query);
  if (query && !query.split(' ').every((token) => itemText.includes(token))) return false;
  if (demand.category && normalize(item.category) !== normalize(demand.category)) return false;
  if (demand.brand && normalize(item.brand) !== normalize(demand.brand)) return false;
  if (demand.size && normalize(item.size) !== normalize(demand.size)) return false;
  if (demand.color && normalize(item.color) !== normalize(demand.color)) return false;
  return true;
}

export function runDemandSupplyMatcher(params: {
  demandInsights: DemandInsight[];
  listings: MarketplaceListing[];
  closetItems: ClosetItem[];
  existingNotifications: DemandNotification[];
}): DemandNotification[] {
  const { demandInsights, listings, closetItems, existingNotifications } = params;
  const existingKeys = new Set(existingNotifications.map((n) => `${n.queryKey}:${n.closetItemId}`));
  const nextNotifications: DemandNotification[] = [];

  for (const demand of demandInsights) {
    if (demand.demandLevel !== 'high') continue;
    const supplyCount = listings.filter((listing) => listingMatchesDemand(listing, demand)).length;
    if (supplyCount >= 2) continue;

    const owners = closetItems.filter((item) => closetItemMatchesDemand(item, demand));
    for (const item of owners) {
      const notificationKey = `${demand.queryKey}:${item.id}`;
      if (existingKeys.has(notificationKey)) continue;
      const estResale = item.estimatedResaleValue || estimateResaleValue(item);
      nextNotifications.push({
        id: `demand_alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        closetItemId: item.id,
        queryKey: demand.queryKey,
        message: `High demand alert: users are searching for ${demand.query}. You own this item. List it now.`,
        demandLevel: demand.demandLevel,
        estimatedResaleValue: estResale,
        seen: false,
      });
      existingKeys.add(notificationKey);
    }
  }

  return nextNotifications;
}
