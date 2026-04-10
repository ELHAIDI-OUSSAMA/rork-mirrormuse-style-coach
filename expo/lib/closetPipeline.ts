import { ClosetItem, DetectedClothingItem } from '@/types';
import { enqueueProcessing } from '@/lib/processingQueue';
import { classifyImageInput, ImageClassificationResult } from '@/lib/imageClassification';
import { preprocessImageForDetection } from '@/lib/screenshotPreprocess';
import {
  detectOutfitItems,
  detectOutfitItemsFallback,
  auditDetectionCoverage,
} from '@/lib/outfitDetection';
import { extractItemStickerFromRegion } from '@/lib/regionExtraction';
import { dedupeDetectedOutfitItems } from '@/utils/outfitDetection';
import {
  computeImageFingerprint,
  getCachedDetection,
  setCachedDetection,
} from '@/lib/detectionCache';

export { classifyImageInput, preprocessImageForDetection, detectOutfitItems, detectOutfitItemsFallback, extractItemStickerFromRegion };

export type PipelineSource = 'closet_upload' | 'closet_camera' | 'outfit_check';

export interface PipelineProgress {
  stage:
    | 'classifying'
    | 'preprocess'
    | 'detecting'
    | 'fallback_detecting'
    | 'creating_placeholders'
    | 'saving'
    | 'done';
  message: string;
}

interface AddClosetItemResult {
  added: boolean;
  duplicate?: boolean;
}

interface AddOutfitOptions {
  source: PipelineSource;
  imageUri: string;
  detectedItems: DetectedClothingItem[];
  addClosetItem: (item: ClosetItem) => AddClosetItemResult | undefined;
}

interface PipelineOptions {
  source: PipelineSource;
  imageUri: string;
  addClosetItem: (item: ClosetItem) => AddClosetItemResult | undefined;
  onProgress?: (progress: PipelineProgress) => void;
  preDetectedItems?: DetectedClothingItem[];
}

const CATEGORY_MAP: Record<string, string> = {
  'T-shirt': 'T-shirt',
  Shirt: 'Shirt',
  Hoodie: 'Hoodie',
  Sweater: 'Sweater',
  Jacket: 'Jacket',
  Blazer: 'Blazer',
  Coat: 'Coat',
  Overshirt: 'Jacket',
  Pants: 'Pants',
  Jeans: 'Jeans',
  Shorts: 'Shorts',
  Sneakers: 'Sneakers',
  Loafers: 'Shoes',
  Boots: 'Boots',
  Shoes: 'Shoes',
  Belt: 'Belt',
  Bag: 'Bag',
  Watch: 'Watch',
};

function generateRandomPosition() {
  return {
    x: Math.random() * 220 + 16,
    y: Math.random() * 300,
    rotation: (Math.random() - 0.5) * 16,
    scale: 0.85 + Math.random() * 0.25,
  };
}

export async function extractSingleItemSticker(
  imageUri: string,
  addClosetItem: (item: ClosetItem) => AddClosetItemResult | undefined
) {
  const id = `closet_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const placeholder: ClosetItem = {
    id,
    imageUri,
    category: 'T-shirt',
    color: 'Unknown',
    styleTags: [],
    createdAt: new Date().toISOString(),
    source: 'manual',
    position: generateRandomPosition(),
    usageCount: 0,
    outlineEnabled: true,
    isProcessing: true,
    processingStatus: 'queued',
    processingStep: 'adding',
  };
  const addResult = addClosetItem(placeholder);
  if (!addResult?.added) {
    return { addedCount: 0, duplicateCount: 1, failedCount: 0 };
  }
  enqueueProcessing(id, imageUri, undefined, undefined, 'REMOVE_BACKGROUND_SINGLE');
  return { addedCount: 1, duplicateCount: 0, failedCount: 0 };
}

export async function addOutfitItemsToCloset(options: AddOutfitOptions) {
  const { imageUri, detectedItems, addClosetItem } = options;
  let addedCount = 0;
  let duplicateCount = 0;
  let skippedCount = 0;

  console.log(`[ClosetPipeline] ====== ENQUEUE LOOP: ${detectedItems.length} items to process ======`);

  for (let i = 0; i < detectedItems.length; i++) {
    const item = detectedItems[i];

    if (item.visibility === 'not_visible') {
      console.log(`[ClosetPipeline] SKIP [${i}] ${item.subcategory}: not_visible`);
      skippedCount++;
      continue;
    }
    // Allow feet with 'partial' visibility when confidence is sufficient (pants/sneakers often under-detected)
    if (item.region === 'feet' && item.visibility !== 'visible' && item.visibility !== 'partial') {
      console.log(`[ClosetPipeline] SKIP [${i}] ${item.subcategory}: feet not_visible`);
      skippedCount++;
      continue;
    }
    if (item.region === 'feet' && item.visibility === 'partial' && item.confidence < 0.20) {
      console.log(`[ClosetPipeline] SKIP [${i}] ${item.subcategory}: feet partial but low confidence (${item.confidence?.toFixed(2)})`);
      skippedCount++;
      continue;
    }
    const minConf = item.region === 'lower' || item.region === 'feet' ? 0.18 : 0.22;
    if (!item.bbox || item.confidence < minConf) {
      console.log(`[ClosetPipeline] SKIP [${i}] ${item.subcategory}: weak detection (confidence=${item.confidence?.toFixed(2)}, bbox=${!!item.bbox})`);
      skippedCount++;
      continue;
    }

    const bboxArea = item.bbox.w * item.bbox.h;
    // More permissive for lower/feet — these are often filtered out incorrectly
    const maxArea = item.region === 'lower' ? 0.45 : item.region === 'feet' ? 0.48 : 0.38;
    if (bboxArea > maxArea) {
      console.log(`[ClosetPipeline] REJECT [${i}] ${item.subcategory} in ${item.region}: bbox area ${bboxArea.toFixed(3)} > ${maxArea}`);
      skippedCount++;
      continue;
    }

    const maxHeight = item.region === 'lower' ? 0.52 : item.region === 'feet' ? 0.32 : 0.50;
    if (item.bbox.h > maxHeight) {
      console.log(`[ClosetPipeline] REJECT [${i}] ${item.subcategory} in ${item.region}: bbox height ${item.bbox.h.toFixed(3)} > ${maxHeight}`);
      skippedCount++;
      continue;
    }

    console.log(`[ClosetPipeline] ACCEPT [${i}] ${item.subcategory} in ${item.region}: conf=${item.confidence.toFixed(2)}, bbox=[${item.bbox.x.toFixed(3)},${item.bbox.y.toFixed(3)},${item.bbox.w.toFixed(3)},${item.bbox.h.toFixed(3)}], area=${bboxArea.toFixed(3)}`);

    const id = `closet_outfit_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
    const category = CATEGORY_MAP[item.subcategory] || 'T-shirt';
    const outfitContext = {
      itemDescription: `${item.color} ${item.subcategory}`,
      region: item.region,
      sourceImageUri: imageUri,
      detectedCategory: category,
      detectedColor: item.color,
      bbox: item.bbox,
      notes: item.notes,
    };
    const placeholder: ClosetItem = {
      id,
      imageUri,
      category: category as any,
      color: item.color || 'Unknown',
      styleTags: [],
      createdAt: new Date().toISOString(),
      source: 'auto_extracted',
      position: generateRandomPosition(),
      usageCount: 0,
      outlineEnabled: true,
      isProcessing: true,
      processingStatus: 'queued',
      processingStep: 'adding',
      outfitContext,
    };
    const addResult = addClosetItem(placeholder);
    if (addResult?.added) {
      addedCount += 1;
      enqueueProcessing(id, imageUri, outfitContext, undefined, 'EXTRACT_ITEM_STICKER');
      console.log(`[ClosetPipeline] QUEUED [${i}] ${item.subcategory} as ${id}`);
    } else {
      duplicateCount += 1;
      console.log(`[ClosetPipeline] DUPLICATE [${i}] ${item.subcategory} — not added`);
    }
  }

  console.log(`[ClosetPipeline] ====== ENQUEUE DONE: added=${addedCount} duplicates=${duplicateCount} skipped=${skippedCount} total_input=${detectedItems.length} ======`);

  return {
    addedCount,
    duplicateCount,
    failedCount: Math.max(0, detectedItems.length - addedCount - duplicateCount),
    detectedCount: detectedItems.length,
    hasFootwear: detectedItems.some((item) => item.region === 'feet' && (item.visibility === 'visible' || item.visibility === 'partial')),
  };
}

export async function addImageToClosetPipeline(options: PipelineOptions): Promise<{
  classification: ImageClassificationResult;
  cleanedImageUri?: string;
  detectedItems?: DetectedClothingItem[];
  addedCount: number;
  duplicateCount: number;
  failedCount: number;
  hasFootwear?: boolean;
}> {
  const { source, imageUri, addClosetItem, onProgress, preDetectedItems } = options;

  // Fast path for Outfit Check: when we already have detected pieces on the results
  // screen, skip reclassification/redetection and immediately enqueue placeholders.
  if (preDetectedItems && preDetectedItems.length > 0) {
    const detectedItems = dedupeDetectedOutfitItems(preDetectedItems);
    const inferredClassification: ImageClassificationResult = {
      type: 'outfit',
      isScreenshotLike: false,
      confidence: 1,
      personVisible: true,
      reasoning: 'Using pre-detected outfit items from analysis results',
    };

    console.log('[ClosetPipeline] FAST PATH using preDetectedItems', {
      source,
      inputCount: preDetectedItems.length,
      dedupedCount: detectedItems.length,
    });

    onProgress?.({
      stage: 'creating_placeholders',
      message: `Creating stickers (1/${detectedItems.length})…`,
    });

    const outfit = await addOutfitItemsToCloset({
      source,
      imageUri,
      detectedItems,
      addClosetItem,
    });
    onProgress?.({ stage: 'done', message: 'Done' });

    return {
      classification: inferredClassification,
      cleanedImageUri: imageUri,
      detectedItems,
      addedCount: outfit.addedCount,
      duplicateCount: outfit.duplicateCount,
      failedCount: outfit.failedCount,
      hasFootwear: outfit.hasFootwear,
    };
  }

  // --- STEP 0: Compute stable image fingerprint ---
  const fingerprint = await computeImageFingerprint(imageUri);
  console.log('[ClosetPipeline] ====== PIPELINE START ======');
  console.log(`[ClosetPipeline] fingerprint: ${fingerprint}`);
  console.log('[ClosetPipeline] source:', source);

  // --- STEP 1: Check detection cache (only use strong results) ---
  const cached = await getCachedDetection(fingerprint);
  const cacheUsable = cached && cached.detectedItems.length >= 2 && !preDetectedItems;
  if (cached && !cacheUsable) {
    console.log(`[ClosetPipeline] CACHE SKIP: cached result too weak (${cached?.detectedItems.length || 0} items) — will re-detect`);
  }
  if (cacheUsable) {
    console.log(`[ClosetPipeline] CACHE HIT: reusing ${cached!.detectedItems.length} items from previous detection`);

    const cachedData = cached!;
    if (cachedData.classification.type === 'single_item') {
      onProgress?.({ stage: 'creating_placeholders', message: 'Creating sticker…' });
      const single = await extractSingleItemSticker(imageUri, addClosetItem);
      onProgress?.({ stage: 'done', message: 'Done' });
      return {
        classification: cachedData.classification,
        addedCount: single.addedCount,
        duplicateCount: single.duplicateCount,
        failedCount: single.failedCount,
      };
    }

    const detectedItems = cachedData.detectedItems;
    logCoverageSummary(fingerprint, detectedItems);

    onProgress?.({ stage: 'creating_placeholders', message: `Creating stickers (1/${detectedItems.length})…` });
    const outfit = await addOutfitItemsToCloset({
      source,
      imageUri,
      detectedItems,
      addClosetItem,
    });
    onProgress?.({ stage: 'done', message: 'Done' });

    return {
      classification: cachedData.classification,
      cleanedImageUri: imageUri,
      detectedItems,
      addedCount: outfit.addedCount,
      duplicateCount: outfit.duplicateCount,
      failedCount: outfit.failedCount,
      hasFootwear: outfit.hasFootwear,
    };
  }

  // --- STEP 2: Classify image ---
  onProgress?.({ stage: 'classifying', message: 'Classifying photo type…' });
  const classification = await classifyImageInput(imageUri);
  console.log(`[ClosetPipeline] [${fingerprint}] classification:`, JSON.stringify(classification));

  if (classification.type === 'single_item') {
    await setCachedDetection(fingerprint, classification, []);
    onProgress?.({ stage: 'creating_placeholders', message: 'Creating sticker…' });
    const single = await extractSingleItemSticker(imageUri, addClosetItem);
    onProgress?.({ stage: 'done', message: 'Done' });
    return {
      classification,
      addedCount: single.addedCount,
      duplicateCount: single.duplicateCount,
      failedCount: single.failedCount,
    };
  }

  // --- STEP 3: Preprocess ---
  onProgress?.({ stage: 'preprocess', message: 'Cleaning screenshot overlays…' });
  const preprocess = await preprocessImageForDetection(imageUri);
  const detectionInputUri = preprocess.cleanedImageUri;
  console.log(`[ClosetPipeline] [${fingerprint}] preprocess`, {
    applied: preprocess.applied,
    topCropPct: preprocess.topCropPct,
    bottomCropPct: preprocess.bottomCropPct,
  });

  // --- STEP 4: Detection (the non-deterministic part — cached after first run) ---
  onProgress?.({ stage: 'detecting', message: 'Detecting items…' });
  let detectedItems = preDetectedItems || (await detectOutfitItems(detectionInputUri));
  console.log(`[ClosetPipeline] [${fingerprint}] detectOutfitItems returned ${detectedItems.length} items`);
  detectedItems.forEach((item, idx) => {
    console.log(`  [${fingerprint}][${idx}] ${item.region}/${item.subcategory}: color=${item.color}, conf=${item.confidence.toFixed(2)}, vis=${item.visibility}, bbox=[${item.bbox?.x.toFixed(3)},${item.bbox?.y.toFixed(3)},${item.bbox?.w.toFixed(3)},${item.bbox?.h.toFixed(3)}]`);
  });

  // --- STEP 5: Coverage check + fallback ---
  const hasUpperBody = detectedItems.some(i => i.region === 'upper_outer' || i.region === 'upper_inner');
  const hasLowerBody = detectedItems.some(i => i.region === 'lower');
  const hasFootwearDet = detectedItems.some(i => i.region === 'feet');
  const missingLowerOrFeet = hasUpperBody && (!hasLowerBody || !hasFootwearDet);
  const shouldRunMirrorSelfieFallback = classification.personVisible && detectedItems.length < 4;

  if (detectedItems.length < 2 || shouldRunMirrorSelfieFallback || missingLowerOrFeet) {
    const fallbackReason =
      detectedItems.length < 2 ? 'sparse-detection'
        : missingLowerOrFeet ? 'missing-lower-or-feet'
        : 'mirror-selfie-tolerant-mode';
    console.log(`[ClosetPipeline] [${fingerprint}] Running fallback:`, fallbackReason);
    onProgress?.({ stage: 'fallback_detecting', message: 'Detecting lower body & shoes…' });
    const fallback = await detectOutfitItemsFallback(detectionInputUri);
    detectedItems = dedupeDetectedOutfitItems([...detectedItems, ...fallback]);
    console.log(`[ClosetPipeline] [${fingerprint}] after fallback: ${detectedItems.length} items`);
  }

  // --- STEP 6: Coverage audit ---
  const audited = await auditDetectionCoverage(detectionInputUri, detectedItems);
  detectedItems = audited.items;
  console.log(`[ClosetPipeline] [${fingerprint}] coverage audit: retriedLower=${audited.retriedLower} retriedFeet=${audited.retriedFeet} final=${detectedItems.length}`);

  if (detectedItems.length < 1) {
    console.log(`[ClosetPipeline] [${fingerprint}] FAIL: 0 items after all passes — NOT caching`);
    return {
      classification,
      cleanedImageUri: detectionInputUri,
      detectedItems,
      addedCount: 0,
      duplicateCount: 0,
      failedCount: 1,
      hasFootwear: false,
    };
  }

  // --- STEP 7: Cache only strong detection results (>= 2 items) ---
  if (detectedItems.length >= 2) {
    await setCachedDetection(fingerprint, classification, detectedItems);
  } else {
    console.log(`[ClosetPipeline] [${fingerprint}] Weak result (${detectedItems.length} items) — NOT caching, will retry on next upload`);
  }

  logCoverageSummary(fingerprint, detectedItems);

  // --- STEP 8: Create placeholders and enqueue extraction ---
  // Use the ORIGINAL imageUri for extraction (not the preprocessed one)
  // to ensure the file persists for all queued items.
  onProgress?.({ stage: 'creating_placeholders', message: `Creating stickers (1/${detectedItems.length})…` });
  const outfit = await addOutfitItemsToCloset({
    source,
    imageUri,
    detectedItems,
    addClosetItem,
  });
  onProgress?.({ stage: 'done', message: 'Done' });

  return {
    classification,
    cleanedImageUri: imageUri,
    detectedItems,
    addedCount: outfit.addedCount,
    duplicateCount: outfit.duplicateCount,
    failedCount: outfit.failedCount,
    hasFootwear: outfit.hasFootwear,
  };
}

function logCoverageSummary(fingerprint: string, detectedItems: DetectedClothingItem[]) {
  const regions = [...new Set(detectedItems.map(i => i.region))];
  console.log(`[ClosetPipeline] [${fingerprint}] ====== COVERAGE SUMMARY ======`);
  console.log(`[ClosetPipeline] [${fingerprint}] regions: ${regions.join(', ')}`);
  console.log(`[ClosetPipeline] [${fingerprint}] total: ${detectedItems.length}`);
  detectedItems.forEach(i => {
    console.log(`  -> ${i.region}/${i.subcategory}: ${i.color}, conf=${i.confidence.toFixed(2)}, bbox=[${i.bbox?.x.toFixed(3)},${i.bbox?.y.toFixed(3)},${i.bbox?.w.toFixed(3)},${i.bbox?.h.toFixed(3)}]`);
  });
}
