import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { DetectedClothingItem, ClothingSubcategory } from '@/types';

const SUBCATEGORY_VALUES: [ClothingSubcategory, ...ClothingSubcategory[]] = [
  'Jacket',
  'Coat',
  'Blazer',
  'Overshirt',
  'Sweater',
  'T-shirt',
  'Shirt',
  'Hoodie',
  'Pants',
  'Jeans',
  'Shorts',
  'Sneakers',
  'Loafers',
  'Boots',
  'Shoes',
  'Belt',
  'Bag',
  'Watch',
];

const regionOrder: DetectedClothingItem['region'][] = [
  'upper_outer',
  'upper_inner',
  'lower',
  'feet',
  'accessory',
];

const RawBBoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});

const RawItemSchema = z.object({
  region: z.enum(['upper_outer', 'upper_inner', 'lower', 'feet', 'accessory']),
  subcategory: z.enum(SUBCATEGORY_VALUES),
  color: z.string(),
  confidence: z.number().min(0).max(1),
  visibility: z.enum(['visible', 'partial', 'not_visible']),
  bbox: RawBBoxSchema.optional(),
  notes: z.string().optional(),
});

const RawDetectionSchema = z.object({
  frameCoverage: z.enum(['full_body', 'three_quarter', 'upper_body', 'unknown']).optional(),
  lowerBodyVisible: z.boolean().optional(),
  feetVisible: z.boolean().optional(),
  items: z.array(RawItemSchema),
});

type DetectionFocus = 'all' | 'upper_outer' | 'upper_inner' | 'lower' | 'feet' | 'fallback';
type RawDetection = z.infer<typeof RawDetectionSchema>;

async function imageToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string) || '';
        resolve(base64.split(',')[1] || '');
      };
      reader.onerror = () => reject(new Error('Failed to read image as base64'));
      reader.readAsDataURL(blob);
    });
  }

  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

function clamp(value: number, min = 0, max = 1): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function toCategory(region: DetectedClothingItem['region']): DetectedClothingItem['category'] {
  if (region === 'upper_outer') return 'Outerwear';
  if (region === 'upper_inner') return 'Top';
  if (region === 'lower') return 'Bottom';
  if (region === 'feet') return 'Footwear';
  return 'Accessory';
}

function defaultBBoxForRegion(region: DetectedClothingItem['region']) {
  if (region === 'upper_outer') return { x: 0.14, y: 0.08, width: 0.72, height: 0.42 };
  if (region === 'upper_inner') return { x: 0.2, y: 0.16, width: 0.6, height: 0.34 };
  if (region === 'lower') return { x: 0.2, y: 0.46, width: 0.6, height: 0.36 };
  if (region === 'feet') return { x: 0.18, y: 0.82, width: 0.64, height: 0.18 };
  return { x: 0.22, y: 0.22, width: 0.56, height: 0.42 };
}

const MAX_BBOX_BY_REGION: Record<string, { maxW: number; maxH: number }> = {
  upper_outer: { maxW: 0.75, maxH: 0.45 },
  upper_inner: { maxW: 0.65, maxH: 0.38 },
  lower:       { maxW: 0.70, maxH: 0.48 },
  feet:        { maxW: 0.68, maxH: 0.30 },
  accessory:   { maxW: 0.40, maxH: 0.30 },
};

const MAX_BBOX_AREA = 0.38;

function capBBox(
  region: string,
  x: number, y: number, w: number, h: number,
): { x: number; y: number; w: number; h: number } {
  const cap = MAX_BBOX_BY_REGION[region] || { maxW: 0.70, maxH: 0.50 };
  const cw = Math.min(w, cap.maxW);
  const ch = Math.min(h, cap.maxH);
  const trimW = w - cw;
  const trimH = h - ch;
  return {
    x: clamp(x + trimW / 2),
    y: clamp(y + trimH / 2),
    w: clamp(cw, 0.04, 1),
    h: clamp(ch, 0.04, 1),
  };
}

function normalizeItem(item: z.infer<typeof RawItemSchema>): DetectedClothingItem {
  const raw = item.bbox || defaultBBoxForRegion(item.region);
  const x = clamp(raw.x);
  const y = clamp(raw.y);
  const w = clamp(raw.width, 0.02, 1);
  const h = clamp(raw.height, 0.02, 1);

  const capped = capBBox(item.region, x, y, w, h);

  return {
    category: toCategory(item.region),
    subcategory: item.subcategory,
    color: item.color,
    confidence: clamp(item.confidence),
    visibility: item.visibility,
    region: item.region,
    evidence: item.notes || `${item.color} ${item.subcategory} in ${item.region}`,
    notes: item.notes,
    bbox: capped,
  };
}

function bboxBottom(item: DetectedClothingItem): number {
  if (!item.bbox) return 0;
  return clamp(item.bbox.y + item.bbox.h);
}

function iou(a: DetectedClothingItem['bbox'], b: DetectedClothingItem['bbox']): number {
  if (!a || !b) return 0;
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;

  const interX1 = Math.max(a.x, b.x);
  const interY1 = Math.max(a.y, b.y);
  const interX2 = Math.min(ax2, bx2);
  const interY2 = Math.min(ay2, by2);

  const interW = Math.max(0, interX2 - interX1);
  const interH = Math.max(0, interY2 - interY1);
  const interArea = interW * interH;

  const aArea = Math.max(0, (ax2 - a.x) * (ay2 - a.y));
  const bArea = Math.max(0, (bx2 - b.x) * (by2 - b.y));
  const union = aArea + bArea - interArea;

  if (union <= 0) return 0;
  return interArea / union;
}

export function shouldIncludeDetectedItem(item: DetectedClothingItem): boolean {
  if (item.bbox) {
    const area = item.bbox.w * item.bbox.h;
    // More permissive for lower/feet — pants and sneakers are often under-detected
    const areaLimit = item.region === 'lower' ? 0.45 : item.region === 'feet' ? 0.48 : MAX_BBOX_AREA;
    if (area > areaLimit) {
      console.log(`[Detection] Rejected ${item.subcategory} in ${item.region}: bbox area ${area.toFixed(3)} exceeds ${areaLimit}`);
      return false;
    }
  }

  // Lower-body and footwear: be very tolerant. These are the most under-detected regions.
  if (item.region === 'lower' || item.region === 'feet') {
    if (item.visibility === 'visible') return true;
    if (item.visibility === 'partial' && item.confidence >= 0.20) return true;
    // Even 'not_visible' items from focused passes may be valid; accept with medium confidence.
    if (item.confidence >= 0.25) return true;
    console.log(`[Detection] Dropped ${item.region}/${item.subcategory}: visibility=${item.visibility}, confidence=${item.confidence.toFixed(2)} (too low)`);
    return false;
  }

  if (item.visibility === 'visible') return true;
  if (item.visibility === 'partial') {
    return item.confidence >= 0.4;
  }

  const bottom = bboxBottom(item);
  if (item.region === 'upper_outer' || item.region === 'upper_inner') {
    if (item.confidence >= 0.32 && bottom >= 0.28 && bottom <= 0.72) return true;
  }

  return item.confidence >= 0.45;
}

export function dedupeDetectedOutfitItems(items: DetectedClothingItem[]): DetectedClothingItem[] {
  const sorted = [...items].sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    const ra = regionOrder.indexOf(a.region);
    const rb = regionOrder.indexOf(b.region);
    if (ra !== rb) return ra - rb;
    return a.subcategory.localeCompare(b.subcategory);
  });
  const deduped: DetectedClothingItem[] = [];

  for (const candidate of sorted) {
    const duplicate = deduped.some((existing) => {
      if (existing.region !== candidate.region) return false;
      if (existing.subcategory !== candidate.subcategory) return false;
      return iou(existing.bbox, candidate.bbox) >= 0.45;
    });

    const highOverlapCrossRegion = deduped.some((existing) => {
      if (existing.region === candidate.region) return false;
      return iou(existing.bbox, candidate.bbox) >= 0.85;
    });

    if (!duplicate && !highOverlapCrossRegion) deduped.push(candidate);
    else if (highOverlapCrossRegion) {
      console.log(`[Detection] Dedup: rejected ${candidate.subcategory} in ${candidate.region} due to high cross-region overlap`);
    }
  }

  return deduped.sort((a, b) => {
    const ra = regionOrder.indexOf(a.region);
    const rb = regionOrder.indexOf(b.region);
    if (ra !== rb) return ra - rb;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return a.subcategory.localeCompare(b.subcategory);
  });
}

export function filterDetectedOutfitItems(items: DetectedClothingItem[]): DetectedClothingItem[] {
  const filtered = items.filter(shouldIncludeDetectedItem);
  return dedupeDetectedOutfitItems(filtered);
}

function buildPrompt(focus: DetectionFocus): string {
  if (focus === 'fallback') {
    return `Analyze this outfit and identify every clearly visible clothing piece worn by the person.
Include outerwear, inner tops, pants, jeans, trousers, and shoes if visible.
Return all clearly visible pieces even if the person's head is cropped.

Be tolerant of:
- cropped head
- screenshot overlays / UI elements
- imperfect backgrounds
- partial visibility

Rules:
- Include items that are clearly visible even if confidence is medium.
- Do NOT fail only because this is not a studio or mirror photo.
- Only exclude pieces that are truly too occluded or too blurry to separate.
- Provide normalized bounding boxes (x,y,width,height) for every returned piece.
- Prefer these regions: upper_outer, upper_inner, lower, feet.

CRITICAL BBOX RULES:
- Each item must have a TIGHT bounding box covering only that specific garment.
- upper_outer height: 25-42% of image max.
- upper_inner height: 20-35% of image max.
- lower (pants/jeans) height: 28-38% of image max. The bbox must END at the ankle line, NOT at the shoes.
- feet (shoes) height: 8-18% of image max. The bbox must START below the ankle line.
- NEVER return a bbox covering the full body or torso+legs combined.
- The lower bbox and feet bbox must NOT overlap. Pants end at ankles, shoes start below ankles.`;
  }

  if (focus === 'upper_outer') {
    return `Analyze this outfit photo and detect ONLY upper outerwear worn by the person.
Focus on jacket/coat/blazer/overshirt if visible.
Head can be cropped; ignore screenshot overlays.
If outerwear is partially visible but still recognizable, return it with medium confidence.
Provide a normalized bounding box for each result.`;
  }

  if (focus === 'upper_inner') {
    return `Analyze this outfit photo and detect ONLY inner tops worn by the person.
Focus on t-shirt/shirt/hoodie/sweater under or without outerwear.
Head can be cropped; ignore screenshot overlays.
If inner top is partially visible but still recognizable, return it with medium confidence.
Provide a normalized bounding box for each result.`;
  }

  if (focus === 'lower') {
    return `Analyze this outfit photo and detect ONLY lower-body clothing worn by the person.
Focus on pants/jeans/trousers/shorts worn below the waist.

IMPORTANT:
- If legs are visible in the image, the person IS wearing pants/trousers. Return them.
- Mark visibility as "visible" if the garment is clearly present in the frame.
- Do NOT set visibility to "not_visible" just because the garment overlaps with a jacket or shirt.
- Provide an accurate bounding box: start at the waistband (around y=0.42-0.50), end at the ANKLES (around y=0.78-0.84).
- bbox height should be approximately 0.28-0.38 of the image.
- The bbox must NOT extend into the shoe/footwear area. Stop at the ankle line.
- Return the color of the pants/trousers accurately.
- Head can be cropped; ignore screenshot overlays.

You MUST return at least one lower item if legs/pants are visible in the image.`;
  }

  if (focus === 'feet') {
    return `Analyze this outfit photo and detect ONLY footwear worn by the person.
Focus on sneakers/shoes/boots/loafers visible near the bottom of the image.

IMPORTANT:
- If shoes are visible in the image, return them with visibility "visible".
- Even if only part of the shoe is visible, return it with visibility "partial" and medium confidence.
- Provide an accurate bounding box near the bottom: start around y=0.82-0.88, height around 0.08-0.18.
- Return the color of the footwear accurately.
- Head can be cropped; ignore screenshot overlays.
- Do NOT hallucinate footwear that is not in the image.

You MUST return at least one feet item if shoes/sneakers are visible in the image.`;
  }

  return `Analyze this outfit photo and list every distinct visible clothing item worn by the person.

CRITICAL RULES FOR BOUNDING BOXES:
- Each item MUST have its OWN tight bounding box covering ONLY that specific garment.
- upper_outer (jacket/coat/blazer): bbox should cover from shoulders to bottom hem of the outerwear. Height should be 25-42% of image.
- upper_inner (shirt/t-shirt): bbox should cover ONLY the visible inner top area. Height should be 20-35% of image.
- lower (pants/jeans): bbox should start at the waistband and end at the ANKLES — NOT at the shoes. Height should be 28-38% of image.
- feet (shoes/sneakers): bbox should cover ONLY the footwear area near the bottom, starting BELOW the ankle line. Height should be 8-18% of image.
- The lower bbox and feet bbox must NOT overlap. Pants stop at ankles, shoes start below.
- NEVER return a bbox that covers the full body (>50% height).
- NEVER return the same bbox for two different items.

DETECTION RULES:
- Detect layered tops separately: if person wears a jacket OVER a shirt, return BOTH as separate items with separate bboxes.
- Include pants/jeans/trousers as a "lower" item if visible in the frame.
- Include shoes/sneakers as a "feet" item if visible in the frame.
- This may be a screenshot with overlays or cropped head: still detect valid clothing pieces.
- If an item is partially visible, return it with visibility "partial" and medium confidence.
- Do NOT guess items that are not visible.

Return items grouped by region: upper_outer, upper_inner, lower, feet, accessory.`;
}

async function runDetectionPass(base64Image: string, focus: DetectionFocus): Promise<RawDetection> {
  return await generateObject({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: buildPrompt(focus) },
          { type: 'image', image: base64Image },
        ],
      },
    ],
    schema: RawDetectionSchema,
  });
}

async function runDetectionPassSafe(
  base64Image: string,
  focus: DetectionFocus
): Promise<RawDetection | null> {
  try {
    return await runDetectionPass(base64Image, focus);
  } catch (error) {
    console.log(`[OutfitDetection] ${focus} pass failed:`, error);
    return null;
  }
}

function hasAtLeastTwoWearableItems(items: DetectedClothingItem[]): boolean {
  const wearableRegions = new Set<DetectedClothingItem['region']>([
    'upper_outer',
    'upper_inner',
    'lower',
    'feet',
  ]);
  return filterDetectedOutfitItems(items).filter((item) => wearableRegions.has(item.region)).length >= 2;
}

async function runRegionPasses(base64Image: string): Promise<DetectedClothingItem[]> {
  const passes = await Promise.all([
    runDetectionPassSafe(base64Image, 'upper_outer'),
    runDetectionPassSafe(base64Image, 'upper_inner'),
    runDetectionPassSafe(base64Image, 'lower'),
    runDetectionPassSafe(base64Image, 'feet'),
  ]);
  return passes.flatMap((pass) => (pass ? pass.items.map(normalizeItem) : []));
}

export function pushCoverageFallback(
  items: DetectedClothingItem[],
  region: 'lower' | 'feet'
): DetectedClothingItem[] {
  const fallback: DetectedClothingItem = region === 'lower'
    ? {
        category: 'Bottom',
        subcategory: 'Pants',
        color: 'Unknown',
        confidence: 0.35,
        visibility: 'visible',
        region: 'lower',
        evidence: 'Coverage audit fallback for lower-body clothing',
        notes: 'Fallback: lower body appears visible in frame.',
        bbox: { x: 0.22, y: 0.5, w: 0.56, h: 0.34 },
      }
    : {
        category: 'Footwear',
        subcategory: 'Sneakers',
        color: 'Unknown',
        confidence: 0.35,
        visibility: 'visible',
        region: 'feet',
        evidence: 'Coverage audit fallback for footwear',
        notes: 'Fallback: feet area appears visible in frame.',
        bbox: { x: 0.2, y: 0.84, w: 0.6, h: 0.16 },
      };

  return dedupeDetectedOutfitItems([...items, fallback]);
}

function separateLowerAndFeet(items: DetectedClothingItem[]): DetectedClothingItem[] {
  const lowerItems = items.filter(i => i.region === 'lower' && i.bbox);
  const feetItems = items.filter(i => i.region === 'feet' && i.bbox);

  if (lowerItems.length === 0 || feetItems.length === 0) return items;

  const feetTopY = Math.min(...feetItems.map(f => f.bbox!.y));
  const GAP = 0.02;

  return items.map(item => {
    if (item.region !== 'lower' || !item.bbox) return item;

    const lowerBottom = item.bbox.y + item.bbox.h;
    if (lowerBottom > feetTopY - GAP) {
      const newH = Math.max(0.15, feetTopY - GAP - item.bbox.y);
      console.log(`[OutfitDetection] separateLowerAndFeet: trimmed ${item.subcategory} bbox.h from ${item.bbox.h.toFixed(3)} to ${newH.toFixed(3)} (feetTopY=${feetTopY.toFixed(3)})`);
      return {
        ...item,
        bbox: { ...item.bbox, h: newH },
      };
    }
    return item;
  });
}

export async function detectOutfitItems(imageUri: string): Promise<DetectedClothingItem[]> {
  try {
    const base64Image = await imageToBase64(imageUri);
    console.log('[OutfitDetection] ====== DETECTION START ======');

    // --- PASS 1: primary "all" detection ---
    const primary = await runDetectionPassSafe(base64Image, 'all');
    const rawCount = primary?.items?.length || 0;
    let merged = dedupeDetectedOutfitItems((primary?.items || []).map(normalizeItem));
    console.log(`[OutfitDetection] STAGE 1 (all): model returned ${rawCount} raw items → ${merged.length} after dedupe`);
    merged.forEach(i => console.log(`  [1] ${i.region}/${i.subcategory} conf=${i.confidence.toFixed(2)} vis=${i.visibility} bbox=[${i.bbox?.x.toFixed(2)},${i.bbox?.y.toFixed(2)},${i.bbox?.w.toFixed(2)},${i.bbox?.h.toFixed(2)}]`));

    // --- Region checks ---
    const hasUpper = merged.some(i => i.region === 'upper_outer' || i.region === 'upper_inner');
    let hasLower = merged.some(i => i.region === 'lower' && shouldIncludeDetectedItem(i));
    let hasFeet = merged.some(i => i.region === 'feet' && shouldIncludeDetectedItem(i));

    // --- PASS 2: focused passes for missing regions ---
    const needsLowerPass = !hasLower;
    const needsFeetPass = !hasFeet;

    if (needsLowerPass || needsFeetPass || !hasUpper) {
      console.log(`[OutfitDetection] STAGE 2 (focused): needLower=${needsLowerPass} needFeet=${needsFeetPass} needUpper=${!hasUpper}`);
      const focusedPasses = await Promise.all([
        needsLowerPass ? runDetectionPassSafe(base64Image, 'lower') : null,
        needsFeetPass ? runDetectionPassSafe(base64Image, 'feet') : null,
        !hasUpper ? runDetectionPassSafe(base64Image, 'upper_outer') : null,
        !hasUpper ? runDetectionPassSafe(base64Image, 'upper_inner') : null,
      ]);
      const focusedItems = focusedPasses.flatMap(p => (p ? p.items.map(normalizeItem) : []));
      console.log(`[OutfitDetection] STAGE 2: focused passes returned ${focusedItems.length} items`);
      focusedItems.forEach(i => console.log(`  [2-new] ${i.region}/${i.subcategory} conf=${i.confidence.toFixed(2)}`));
      const beforeMerge = merged.length;
      merged = dedupeDetectedOutfitItems([...merged, ...focusedItems]);
      console.log(`[OutfitDetection] STAGE 2: merged ${beforeMerge} + ${focusedItems.length} → ${merged.length} after dedupe`);

      hasLower = merged.some(i => i.region === 'lower' && shouldIncludeDetectedItem(i));
      hasFeet = merged.some(i => i.region === 'feet' && shouldIncludeDetectedItem(i));
    }

    // --- Heuristics for expected regions ---
    const expectLower = hasVisibleLowerBody(merged, primary?.frameCoverage, primary?.lowerBodyVisible);
    const expectFeet = hasVisibleFootwear(merged, primary?.frameCoverage, primary?.feetVisible);

    console.log(`[OutfitDetection] STAGE 2.5 (heuristics): expectLower=${expectLower} hasLower=${hasLower} expectFeet=${expectFeet} hasFeet=${hasFeet} frameCoverage=${primary?.frameCoverage}`);

    // --- PASS 3: dedicated retry for missing regions ---
    if (expectLower && !hasLower) {
      console.log('[OutfitDetection] STAGE 3: lower-body retry');
      const lowerRetry = await runDetectionPassSafe(base64Image, 'lower');
      const lowerItems = lowerRetry?.items?.length || 0;
      if (lowerRetry) {
        merged = dedupeDetectedOutfitItems([...merged, ...lowerRetry.items.map(normalizeItem)]);
      }
      hasLower = merged.some(i => i.region === 'lower' && shouldIncludeDetectedItem(i));
      console.log(`[OutfitDetection] STAGE 3: lower retry returned ${lowerItems} → hasLower=${hasLower}, total=${merged.length}`);
    }

    if (expectFeet && !hasFeet) {
      console.log('[OutfitDetection] STAGE 3: footwear retry');
      const feetRetry = await runDetectionPassSafe(base64Image, 'feet');
      const feetItems = feetRetry?.items?.length || 0;
      if (feetRetry) {
        merged = dedupeDetectedOutfitItems([...merged, ...feetRetry.items.map(normalizeItem)]);
      }
      hasFeet = merged.some(i => i.region === 'feet' && shouldIncludeDetectedItem(i));
      console.log(`[OutfitDetection] STAGE 3: feet retry returned ${feetItems} → hasFeet=${hasFeet}, total=${merged.length}`);
    }

    // --- PASS 4: coverage fallbacks (synthetic items with default bboxes) ---
    if (expectLower && !hasLower) {
      console.log('[OutfitDetection] STAGE 4: adding SYNTHETIC lower-body fallback');
      merged = pushCoverageFallback(merged, 'lower');
      hasLower = true;
    }

    const expectFeetFinal = expectFeet || hasLower || hasUpper;
    if (expectFeetFinal && !hasFeet) {
      console.log('[OutfitDetection] STAGE 4: adding SYNTHETIC footwear fallback');
      merged = pushCoverageFallback(merged, 'feet');
      hasFeet = true;
    }

    console.log(`[OutfitDetection] STAGE 4 done: ${merged.length} items (hasUpper=${hasUpper} hasLower=${hasLower} hasFeet=${hasFeet})`);

    // --- PASS 5: full fallback if still sparse ---
    if (!hasAtLeastTwoWearableItems(merged)) {
      console.log('[OutfitDetection] STAGE 5: full fallback (sparse results)');
      const fallbackItems = await detectOutfitItemsFallback(imageUri);
      merged = dedupeDetectedOutfitItems([...merged, ...fallbackItems]);
      console.log(`[OutfitDetection] STAGE 5: fallback returned ${fallbackItems.length} → total=${merged.length}`);
    }

    // --- PASS 6: LAST RESORT — force synthetics for all missing regions ---
    // If after everything we still have < 2 items, this is an outfit image and
    // the model just failed to detect. Add synthetics unconditionally.
    if (merged.length < 2) {
      console.log(`[OutfitDetection] STAGE 6: LAST RESORT — only ${merged.length} items, forcing synthetics for all missing regions`);
      const hasUpperFinal = merged.some(i => i.region === 'upper_outer' || i.region === 'upper_inner');
      const hasLowerFinal = merged.some(i => i.region === 'lower');
      const hasFeetFinal = merged.some(i => i.region === 'feet');

      if (!hasUpperFinal) {
        const syntheticUpper: DetectedClothingItem = {
          category: 'Top',
          subcategory: 'Sweater',
          color: 'Unknown',
          confidence: 0.30,
          visibility: 'visible',
          region: 'upper_inner',
          evidence: 'Last-resort synthetic upper-body fallback',
          notes: 'Synthetic: outfit classified but model failed to detect upper body.',
          bbox: { x: 0.15, y: 0.08, w: 0.70, h: 0.38 },
        };
        merged.push(syntheticUpper);
      }
      if (!hasLowerFinal) {
        merged = pushCoverageFallback(merged, 'lower');
      }
      if (!hasFeetFinal) {
        merged = pushCoverageFallback(merged, 'feet');
      }
      console.log(`[OutfitDetection] STAGE 6: after last-resort synthetics → ${merged.length} items`);
    }

    const filtered = filterDetectedOutfitItems(merged);
    const final = separateLowerAndFeet(filtered);
    console.log(`[OutfitDetection] ====== FINAL: ${final.length} items (from ${merged.length} pre-filter) ======`);
    final.forEach((i, idx) => {
      console.log(`  [FINAL-${idx}] ${i.region}/${i.subcategory}: color=${i.color}, conf=${i.confidence.toFixed(2)}, bbox=[${i.bbox?.x.toFixed(3)},${i.bbox?.y.toFixed(3)},${i.bbox?.w.toFixed(3)},${i.bbox?.h.toFixed(3)}]`);
    });

    return final;
  } catch (error) {
    console.log('[OutfitDetection] FATAL ERROR:', error);
    return [];
  }
}

export async function detectOutfitItemsFallback(cleanedImageUri: string): Promise<DetectedClothingItem[]> {
  try {
    const base64Image = await imageToBase64(cleanedImageUri);
    const tolerantPass = await runDetectionPassSafe(base64Image, 'fallback');
    const regionItems = await runRegionPasses(base64Image);

    let merged = dedupeDetectedOutfitItems([
      ...((tolerantPass?.items || []).map(normalizeItem)),
      ...regionItems,
    ]);

    const hasUpper = merged.some(i => (i.region === 'upper_outer' || i.region === 'upper_inner') && shouldIncludeDetectedItem(i));
    const hasLower = merged.some(i => i.region === 'lower' && shouldIncludeDetectedItem(i));
    const hasFeet = merged.some(i => i.region === 'feet' && shouldIncludeDetectedItem(i));

    // If upper body found, always expect lower. Also check model self-report.
    const expectLower = hasUpper || !!tolerantPass?.lowerBodyVisible || tolerantPass?.frameCoverage === 'full_body' || tolerantPass?.frameCoverage === 'three_quarter';
    const expectFeet = hasLower || hasUpper || !!tolerantPass?.feetVisible || tolerantPass?.frameCoverage === 'full_body';

    if (expectLower && !hasLower) merged = pushCoverageFallback(merged, 'lower');
    if (expectFeet && !hasFeet) merged = pushCoverageFallback(merged, 'feet');

    return filterDetectedOutfitItems(merged);
  } catch (error) {
    console.log('[OutfitDetectionFallback] Failed:', error);
    return [];
  }
}

export async function detectLowerBodyFocused(imageUri: string): Promise<DetectedClothingItem[]> {
  try {
    const base64Image = await imageToBase64(imageUri);
    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze the lower half of this outfit image and identify clearly visible bottoms such as pants, jeans, trousers, shorts, or skirts.

Focus ONLY on the lower-body garments. Ignore upper-body clothing, accessories, and shoes.

Return each visible lower-body garment with:
- region: must be "lower"
- subcategory: Pants, Jeans, or Shorts
- color: the primary color of the garment
- confidence: 0-1
- visibility: visible or partial
- bbox: normalized bounding box covering ONLY the pants/trousers area (from waist to ANKLES, NOT to shoes)
  - typical y range: 0.42-0.50 start, ending at 0.78-0.84
  - typical height: 0.28-0.38
  - The bbox must NOT extend into the shoe/footwear area

Do NOT guess hidden garments. Only return clearly visible items.
If legs/pants are visible in the image, you MUST return at least one lower item.`,
            },
            { type: 'image', image: base64Image },
          ],
        },
      ],
      schema: RawDetectionSchema,
    });
    const items = (result?.items || [])
      .map(normalizeItem)
      .filter(i => i.region === 'lower');
    console.log('[LowerBodyFocused] Found:', items.map(i => `${i.subcategory}/${i.color}`).join(', ') || 'none');
    return items;
  } catch (error) {
    console.log('[LowerBodyFocused] Failed:', error);
    return [];
  }
}

export async function detectFootwearFocused(imageUri: string): Promise<DetectedClothingItem[]> {
  try {
    const base64Image = await imageToBase64(imageUri);
    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze the bottom part of this outfit image and identify clearly visible footwear such as sneakers, shoes, boots, loafers, or sandals.

Focus ONLY on the footwear. Ignore floor, background, and all non-shoe elements.

Return each visible footwear item with:
- region: must be "feet"
- subcategory: Sneakers, Shoes, Boots, or Loafers
- color: the primary color
- confidence: 0-1
- visibility: visible or partial
- bbox: normalized bounding box covering ONLY the shoes/sneakers
  - typical y range: 0.82-0.88 start, ending at 0.95-1.0
  - typical height: 0.08-0.18

Do NOT hallucinate footwear if not visible.
If shoes/sneakers are clearly visible near the bottom of the image, you MUST return at least one feet item.`,
            },
            { type: 'image', image: base64Image },
          ],
        },
      ],
      schema: RawDetectionSchema,
    });
    const items = (result?.items || [])
      .map(normalizeItem)
      .filter(i => i.region === 'feet');
    console.log('[FootwearFocused] Found:', items.map(i => `${i.subcategory}/${i.color}`).join(', ') || 'none');
    return items;
  } catch (error) {
    console.log('[FootwearFocused] Failed:', error);
    return [];
  }
}

export function hasVisibleLowerBody(
  detections: DetectedClothingItem[],
  frameCoverage?: string,
  lowerBodyVisible?: boolean
): boolean {
  if (detections.some(i => i.region === 'lower')) return true;
  if (lowerBodyVisible) return true;
  if (frameCoverage === 'full_body' || frameCoverage === 'three_quarter') return true;
  // Heuristic: if any detected item has a bbox that extends below 55% of image, lower body exists
  if (detections.some(i => bboxBottom(i) > 0.55)) return true;
  // Heuristic: if upper body is detected, lower body is almost certainly visible
  if (detections.some(i => i.region === 'upper_outer' || i.region === 'upper_inner')) return true;
  return false;
}

export function hasVisibleFootwear(
  detections: DetectedClothingItem[],
  frameCoverage?: string,
  feetVisible?: boolean
): boolean {
  if (detections.some(i => i.region === 'feet')) return true;
  if (feetVisible) return true;
  if (frameCoverage === 'full_body') return true;
  if (detections.some(i => bboxBottom(i) > 0.78)) return true;
  if (detections.some(i => i.region === 'lower')) return true;
  if (detections.some(i => i.region === 'upper_outer' || i.region === 'upper_inner')) return true;
  return false;
}

export function describeDetectedItems(items: DetectedClothingItem[]): string[] {
  return filterDetectedOutfitItems(items).map((item) => `${item.color} ${item.subcategory}`.trim());
}
