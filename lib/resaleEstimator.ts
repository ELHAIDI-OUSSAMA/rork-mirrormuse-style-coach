import { ClosetItem } from '@/types';

const CATEGORY_BASELINE: Record<string, number> = {
  jacket: 40,
  coat: 42,
  blazer: 38,
  't-shirt': 12,
  shirt: 16,
  hoodie: 25,
  sweater: 24,
  jeans: 30,
  pants: 24,
  sneakers: 45,
  shoes: 32,
  boots: 38,
  accessory: 20,
  bag: 28,
  belt: 16,
  watch: 45,
};

const CATEGORY_PRICE_FACTOR: Record<string, number> = {
  jacket: 0.55,
  coat: 0.55,
  blazer: 0.5,
  sneakers: 0.6,
  shoes: 0.5,
  boots: 0.5,
  jeans: 0.45,
  hoodie: 0.45,
  sweater: 0.4,
  't-shirt': 0.35,
  shirt: 0.4,
  pants: 0.4,
  accessory: 0.4,
  bag: 0.45,
  belt: 0.35,
  watch: 0.55,
};

function normalizeCategory(value: string): string {
  return value.trim().toLowerCase();
}

function brandMultiplier(brand?: string): number {
  if (!brand) return 1;
  const normalized = brand.trim().toLowerCase();
  const premiumBrands = ['zara', 'cos', 'aritzia', 'all saints', 'lululemon', 'nike', 'adidas'];
  const luxuryBrands = ['gucci', 'prada', 'dior', 'balenciaga', 'saint laurent', 'chanel', 'hermes', 'lv'];
  if (luxuryBrands.some((name) => normalized.includes(name))) return 1.45;
  if (premiumBrands.some((name) => normalized.includes(name))) return 1.2;
  return 1;
}

function conditionMultiplier(item: ClosetItem): number {
  const usageCount = item.usageCount || 0;
  if (usageCount <= 1) return 1.12;
  if (usageCount <= 5) return 1;
  if (usageCount <= 12) return 0.88;
  return 0.75;
}

export function estimateResaleValue(item: ClosetItem): number {
  const category = normalizeCategory(item.category || 'accessory');
  const baseline = CATEGORY_BASELINE[category] ?? 20;
  const factor = CATEGORY_PRICE_FACTOR[category] ?? 0.4;
  const fromPrice = item.price && item.price > 0 ? item.price * factor : baseline;
  const estimated = fromPrice * brandMultiplier(item.brand) * conditionMultiplier(item);
  return Math.max(5, Math.round(estimated));
}
