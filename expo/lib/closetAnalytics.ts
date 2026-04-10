import { ClosetItem, DemandNotification } from '@/types';
import { estimateResaleValue } from '@/lib/resaleEstimator';

const NEUTRAL_COLORS = new Set(['black', 'white', 'gray', 'grey', 'beige', 'cream', 'brown', 'navy']);
const BRIGHT_COLORS = new Set(['yellow', 'orange', 'pink', 'red', 'lime', 'teal', 'purple']);

export type ClosetValueInsights = {
  totalClosetValue: number;
  itemCount: number;
  highDemandItems: number;
  resalePotential: number;
  mostValuableItem?: ClosetItem;
  topBrands: string[];
  mostValuableItems: ClosetItem[];
};

export type StylePersonalityInsights = {
  personality: 'Urban Minimalist' | 'Streetwear Explorer' | 'Classic Gentleman' | 'Casual Comfort' | 'Modern Trendsetter';
  description: string;
  stats: {
    neutralColorsPct: number;
    brightColorsPct: number;
    darkColorsPct: number;
    streetwearInfluencePct: number;
    classicPiecesPct: number;
    sportInfluencePct: number;
    minimalInfluencePct: number;
  };
  categoryDistribution: {
    jackets: number;
    hoodies: number;
    shirts: number;
    pants: number;
    sneakers: number;
  };
};

function normalize(value?: string): string {
  return (value || '').trim().toLowerCase();
}

export function getClosetValueInsights(
  closetItems: ClosetItem[],
  cleanupCandidates: ClosetItem[],
  demandNotifications: DemandNotification[]
): ClosetValueInsights {
  const active = closetItems.filter((item) => item.status !== 'archived');
  const withValues = active.map((item) => ({
    ...item,
    estimatedResaleValue: item.estimatedResaleValue || estimateResaleValue(item),
  }));
  const totalClosetValue = withValues.reduce((sum, item) => sum + (item.estimatedResaleValue || 0), 0);
  const mostValuableItems = [...withValues]
    .sort((a, b) => (b.estimatedResaleValue || 0) - (a.estimatedResaleValue || 0))
    .slice(0, 6);
  const mostValuableItem = mostValuableItems[0];
  const brandCounts = withValues.reduce<Record<string, number>>((acc, item) => {
    const brand = item.brand?.trim();
    if (!brand) return acc;
    acc[brand] = (acc[brand] || 0) + 1;
    return acc;
  }, {});
  const topBrands = Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([brand]) => brand);
  const highDemandItems = new Set(demandNotifications.map((item) => item.closetItemId)).size;
  const resalePotential = cleanupCandidates.reduce(
    (sum, item) => sum + (item.estimatedResaleValue || estimateResaleValue(item)),
    0
  );

  return {
    totalClosetValue: Math.round(totalClosetValue),
    itemCount: withValues.length,
    highDemandItems,
    resalePotential: Math.round(resalePotential),
    mostValuableItem,
    topBrands,
    mostValuableItems,
  };
}

export function getStylePersonalityInsights(closetItems: ClosetItem[]): StylePersonalityInsights {
  const active = closetItems.filter((item) => item.status !== 'archived' && item.status !== 'sold' && item.status !== 'donated');
  const total = Math.max(1, active.length);

  let neutralCount = 0;
  let brightCount = 0;
  let darkCount = 0;
  let streetwearSignal = 0;
  let minimalSignal = 0;
  let classicSignal = 0;
  let sportSignal = 0;

  let jackets = 0;
  let hoodies = 0;
  let shirts = 0;
  let pants = 0;
  let sneakers = 0;

  for (const item of active) {
    const color = normalize(item.color);
    const category = normalize(item.category);
    const tags = (item.styleTags || []).map((tag) => normalize(tag));
    if (NEUTRAL_COLORS.has(color)) neutralCount += 1;
    if (BRIGHT_COLORS.has(color)) brightCount += 1;
    if (color === 'black' || color === 'navy' || color === 'charcoal') darkCount += 1;

    if (category === 'jacket' || category === 'blazer' || category === 'coat') jackets += 1;
    if (category === 'hoodie') hoodies += 1;
    if (category === 'shirt' || category === 't-shirt' || category === 'sweater') shirts += 1;
    if (category === 'jeans' || category === 'pants') pants += 1;
    if (category === 'sneakers') sneakers += 1;

    if (category === 'hoodie' || category === 'sneakers' || tags.some((tag) => tag.includes('street'))) streetwearSignal += 1.25;
    if (NEUTRAL_COLORS.has(color) || tags.some((tag) => tag.includes('minimal'))) minimalSignal += 1.15;
    if (category === 'blazer' || category === 'coat' || tags.some((tag) => tag.includes('classic'))) classicSignal += 1.2;
    if (category === 'sneakers' || tags.some((tag) => tag.includes('sport') || tag.includes('athleisure'))) sportSignal += 1.1;
  }

  const stats = {
    neutralColorsPct: Math.round((neutralCount / total) * 100),
    brightColorsPct: Math.round((brightCount / total) * 100),
    darkColorsPct: Math.round((darkCount / total) * 100),
    streetwearInfluencePct: Math.min(100, Math.round((streetwearSignal / total) * 80)),
    classicPiecesPct: Math.min(100, Math.round((classicSignal / total) * 80)),
    sportInfluencePct: Math.min(100, Math.round((sportSignal / total) * 80)),
    minimalInfluencePct: Math.min(100, Math.round((minimalSignal / total) * 80)),
  };

  let personality: StylePersonalityInsights['personality'] = 'Casual Comfort';
  let description =
    'Your style is practical and easygoing, with pieces that keep your outfits comfortable and versatile.';

  if (stats.neutralColorsPct > 60 && stats.minimalInfluencePct >= 45) {
    personality = 'Urban Minimalist';
    description =
      'You favor clean silhouettes and neutral tones. Your wardrobe leans toward timeless basics with subtle city energy.';
  } else if (stats.streetwearInfluencePct >= 50) {
    personality = 'Streetwear Explorer';
    description =
      'You build outfits with bold casual pieces, sneakers, and layers that feel modern and expressive.';
  } else if (stats.classicPiecesPct >= 48 && stats.neutralColorsPct >= 45) {
    personality = 'Classic Gentleman';
    description =
      'You prefer structured staples and refined color choices. Your closet balances polish with everyday wearability.';
  } else if (stats.sportInfluencePct >= 50) {
    personality = 'Modern Trendsetter';
    description =
      'You blend athletic influences with trend-aware basics, creating looks that feel active and current.';
  }

  return {
    personality,
    description,
    stats,
    categoryDistribution: {
      jackets,
      hoodies,
      shirts,
      pants,
      sneakers,
    },
  };
}
