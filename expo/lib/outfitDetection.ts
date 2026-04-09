import { DetectedClothingItem } from '@/types';
import {
  detectOutfitItems as detectOutfitItemsBase,
  detectOutfitItemsFallback as detectOutfitItemsFallbackBase,
  detectLowerBodyFocused,
  detectFootwearFocused,
  dedupeDetectedOutfitItems,
  pushCoverageFallback,
} from '@/utils/outfitDetection';

export async function detectOutfitItems(imageUri: string): Promise<DetectedClothingItem[]> {
  return detectOutfitItemsBase(imageUri);
}

export async function detectOutfitItemsFallback(imageUri: string): Promise<DetectedClothingItem[]> {
  return detectOutfitItemsFallbackBase(imageUri);
}

export interface CoverageAuditResult {
  items: DetectedClothingItem[];
  retriedLower: boolean;
  retriedFeet: boolean;
  retriedFallback: boolean;
}

export async function auditDetectionCoverage(
  imageUri: string,
  detectedItems: DetectedClothingItem[]
): Promise<CoverageAuditResult> {
  // IMPORTANT: do NOT re-filter incoming items here. They were already filtered
  // by detectOutfitItems. Re-filtering can silently strip lower/feet items
  // that have borderline confidence but are valid.
  let items = dedupeDetectedOutfitItems(detectedItems);
  let retriedLower = false;
  let retriedFeet = false;
  let retriedFallback = false;

  const hasUpper = items.some(i => i.region === 'upper_outer' || i.region === 'upper_inner');
  let hasLower = items.some(i => i.region === 'lower');
  let hasFeet = items.some(i => i.region === 'feet');

  console.log('[CoverageAudit] Input:', {
    total: items.length,
    hasUpper,
    hasLower,
    hasFeet,
    regions: items.map(i => `${i.region}/${i.subcategory}`).join(', '),
  });

  // If upper body found but no lower body, always retry with dedicated focused pass
  if (hasUpper && !hasLower) {
    console.log('[CoverageAudit] Upper body found but NO lower body — running dedicated lower detection');
    const lowerItems = await detectLowerBodyFocused(imageUri);
    console.log('[CoverageAudit] Lower focused returned:', lowerItems.length, 'items');
    if (lowerItems.length > 0) {
      items = dedupeDetectedOutfitItems([...items, ...lowerItems]);
      retriedLower = true;
      hasLower = items.some(i => i.region === 'lower');
      console.log('[CoverageAudit] Lower retry result:', lowerItems.map(i => `${i.subcategory}/${i.color} conf=${i.confidence.toFixed(2)}`).join(', '));
    } else {
      console.log('[CoverageAudit] Lower focused returned nothing — will use coverage fallback');
    }
  }

  // If we have upper or lower items but no feet, retry with dedicated focused pass
  if ((hasUpper || hasLower) && !hasFeet) {
    console.log('[CoverageAudit] No footwear found — running dedicated footwear detection');
    const feetItems = await detectFootwearFocused(imageUri);
    console.log('[CoverageAudit] Feet focused returned:', feetItems.length, 'items');
    if (feetItems.length > 0) {
      items = dedupeDetectedOutfitItems([...items, ...feetItems]);
      retriedFeet = true;
      hasFeet = items.some(i => i.region === 'feet');
      console.log('[CoverageAudit] Feet retry result:', feetItems.map(i => `${i.subcategory}/${i.color} conf=${i.confidence.toFixed(2)}`).join(', '));
    } else {
      console.log('[CoverageAudit] Feet focused returned nothing — will use coverage fallback');
    }
  }

  // Full fallback if still only upper-body
  const onlyTopLike = hasUpper && !hasLower && !hasFeet;
  if (items.length < 2 || onlyTopLike) {
    console.log('[CoverageAudit] Still sparse or only upper-body — running full fallback');
    const fallbackItems = await detectOutfitItemsFallbackBase(imageUri);
    items = dedupeDetectedOutfitItems([...items, ...fallbackItems]);
    retriedFallback = true;
    hasLower = items.some(i => i.region === 'lower');
    hasFeet = items.some(i => i.region === 'feet');
  }

  // LAST RESORT: if lower or feet STILL missing, add synthetic fallback items
  if (hasUpper && !hasLower) {
    console.log('[CoverageAudit] LAST RESORT: adding synthetic lower-body fallback');
    items = pushCoverageFallback(items, 'lower');
  }
  if ((hasUpper || hasLower) && !hasFeet) {
    console.log('[CoverageAudit] LAST RESORT: adding synthetic footwear fallback');
    items = pushCoverageFallback(items, 'feet');
  }

  console.log('[CoverageAudit] Final:', items.map(i => `${i.region}/${i.subcategory}/${i.color}`).join(', '));
  return { items, retriedLower, retriedFeet, retriedFallback };
}
