import { ClosetItem } from '@/types';
import { estimateResaleValue } from '@/lib/resaleEstimator';

const DAY_MS = 24 * 60 * 60 * 1000;
const CLEANUP_LAST_WORN_DAYS = 180;
const CLEANUP_LOW_USAGE_DAYS = 120;

function getMsAgo(dateLike?: string): number {
  if (!dateLike) return Number.POSITIVE_INFINITY;
  const ts = new Date(dateLike).getTime();
  if (!Number.isFinite(ts)) return Number.POSITIVE_INFINITY;
  return Date.now() - ts;
}

function isSuppressed(item: ClosetItem): boolean {
  const blockedStatuses = new Set(['sold', 'donated', 'archived', 'listed_for_sale']);
  if (item.status && blockedStatuses.has(item.status)) return true;
  if (!item.cleanupDismissedUntil) return false;
  return new Date(item.cleanupDismissedUntil).getTime() > Date.now();
}

function duplicateBoost(item: ClosetItem, items: ClosetItem[]): number {
  const color = item.color?.trim().toLowerCase() || '';
  const category = item.category?.trim().toLowerCase() || '';
  if (!color || !category) return 0;
  const similarCount = items.filter(
    (candidate) =>
      candidate.id !== item.id &&
      candidate.category?.trim().toLowerCase() === category &&
      candidate.color?.trim().toLowerCase() === color
  ).length;
  return similarCount > 0 ? Math.min(2.5, similarCount * 0.8) : 0;
}

function cleanupScore(item: ClosetItem, items: ClosetItem[]): number {
  const lastWornDate = item.lastWornAt || item.lastUsedAt || item.createdAt;
  const daysSinceWorn = getMsAgo(lastWornDate) / DAY_MS;
  const usageCount = item.usageCount || 0;
  const resaleValue = estimateResaleValue(item);
  return daysSinceWorn * 0.045 + Math.max(0, 2 - usageCount) * 1.1 + duplicateBoost(item, items) + resaleValue * 0.015;
}

function getCategoryGroupLabel(category: string): string {
  const normalized = category.trim().toLowerCase();
  const tops = new Set(['t-shirt', 'shirt', 'hoodie', 'sweater']);
  const bottoms = new Set(['jeans', 'pants', 'shorts', 'skirt', 'dress']);
  if (tops.has(normalized)) return 'tops';
  if (bottoms.has(normalized)) return 'bottoms';
  if (normalized === 'sneakers' || normalized === 'shoes' || normalized === 'boots') return 'shoes';
  if (normalized === 'jacket' || normalized === 'coat' || normalized === 'blazer') return 'outerwear';
  return `${normalized}s`;
}

export function getCleanupReason(item: ClosetItem, allItems: ClosetItem[]): string {
  const lastWornDate = item.lastWornAt || item.lastUsedAt || item.createdAt;
  const daysSinceWorn = getMsAgo(lastWornDate) / DAY_MS;
  const monthsSinceWorn = Math.max(1, Math.floor(daysSinceWorn / 30));

  const usageCount = item.usageCount || 0;
  const similarCount = allItems.filter(
    (candidate) =>
      candidate.id !== item.id &&
      candidate.category.toLowerCase() === item.category.toLowerCase() &&
      candidate.color.toLowerCase() === item.color.toLowerCase()
  ).length;

  const resaleValue = item.estimatedResaleValue || estimateResaleValue(item);

  if (daysSinceWorn > 150) {
    return `You haven’t worn this in ${monthsSinceWorn} month${monthsSinceWorn > 1 ? 's' : ''}.`;
  }
  if (usageCount <= 1) {
    return usageCount === 0 ? 'You have not reached for this item much yet.' : 'You have only worn this once.';
  }
  if (similarCount >= 2) {
    return `You own ${similarCount + 1} similar ${item.color.toLowerCase()} ${getCategoryGroupLabel(item.category)}.`;
  }
  if (resaleValue >= 20) {
    return 'This item may still have resale value.';
  }
  return 'This piece might deserve a second life.';
}

function isCleanupEligible(item: ClosetItem): boolean {
  if (isSuppressed(item)) return false;
  const usageCount = item.usageCount || 0;
  const daysSinceWorn = getMsAgo(item.lastWornAt || item.lastUsedAt || item.createdAt) / DAY_MS;
  const daysSinceCreated = getMsAgo(item.createdAt) / DAY_MS;
  return (
    daysSinceWorn > CLEANUP_LAST_WORN_DAYS ||
    (usageCount <= 1 && daysSinceCreated > CLEANUP_LOW_USAGE_DAYS)
  );
}

export function getCleanupCandidates(items: ClosetItem[]): ClosetItem[] {
  const eligible = items.filter(isCleanupEligible);
  return eligible
    .map((item) => ({
      ...item,
      estimatedResaleValue: item.estimatedResaleValue ?? estimateResaleValue(item),
      status: item.status === 'active' ? 'cleanup_candidate' : item.status,
    }))
    .sort((a, b) => cleanupScore(b, items) - cleanupScore(a, items));
}
