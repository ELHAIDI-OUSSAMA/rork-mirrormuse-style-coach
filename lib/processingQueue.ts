import { ClosetItem, ClothingCategory } from '@/types';
import { removeBackgroundWithRetry } from '@/utils/backgroundRemoval';
import { detectClothingMetadata, cropItemFromOutfit } from '@/utils/closetExtraction';

const MAX_CONCURRENT = 2;

type UpdateFn = (itemId: string, updates: Partial<ClosetItem>) => void;

interface OutfitContext {
  itemDescription: string;
  region: string;
  detectedCategory?: string;
  detectedColor?: string;
}

interface QueueTask {
  itemId: string;
  imageUri: string;
  outfitContext?: OutfitContext;
}

let queue: QueueTask[] = [];
let running = 0;
let updateClosetItemRef: UpdateFn | null = null;

export function setQueueUpdater(fn: UpdateFn) {
  updateClosetItemRef = fn;
}

function update(itemId: string, updates: Partial<ClosetItem>) {
  updateClosetItemRef?.(itemId, updates);
}

async function processSingleItem(task: QueueTask) {
  const { itemId, imageUri } = task;

  update(itemId, { processingStatus: 'processing', processingStep: 'scanning' });

  const metadata = await detectClothingMetadata(imageUri);
  update(itemId, {
    category: metadata.category,
    color: metadata.color,
    processingStep: 'removing_bg',
  });

  const result = await removeBackgroundWithRetry(imageUri, (msg) => {
    if (msg.includes('pass 2') || msg.includes('Refining')) {
      update(itemId, { processingStep: 'creating_sticker' });
    }
  });

  if (!result.success || !result.stickerUri) {
    throw new Error(result.error || 'Background removal failed');
  }

  return result.stickerUri;
}

async function processOutfitItem(task: QueueTask) {
  const { itemId, imageUri, outfitContext } = task;
  const { itemDescription, region, detectedCategory, detectedColor } = outfitContext!;

  update(itemId, { processingStatus: 'processing', processingStep: 'scanning' });

  const cropResult = await cropItemFromOutfit(imageUri, itemDescription, region);
  if (!cropResult.success || !cropResult.croppedUri) {
    throw new Error(cropResult.error || 'Failed to extract item from outfit');
  }

  update(itemId, {
    imageUri: cropResult.croppedUri,
    processingStep: 'removing_bg',
  });

  const result = await removeBackgroundWithRetry(cropResult.croppedUri, (msg) => {
    if (msg.includes('pass 2') || msg.includes('Refining')) {
      update(itemId, { processingStep: 'creating_sticker' });
    }
  });

  if (!result.success || !result.stickerUri) {
    throw new Error(result.error || 'Background removal failed');
  }

  update(itemId, { processingStep: 'finalizing' });

  const metadata = await detectClothingMetadata(cropResult.croppedUri);
  const category = detectedCategory
    ? (detectedCategory as ClothingCategory)
    : metadata.category;

  update(itemId, {
    category,
    color: detectedColor || metadata.color,
  });

  return result.stickerUri;
}

async function processTask(task: QueueTask) {
  const { itemId } = task;

  try {
    const stickerUri = task.outfitContext
      ? await processOutfitItem(task)
      : await processSingleItem(task);

    update(itemId, { processingStep: 'finalizing' });
    await new Promise(r => setTimeout(r, 300));
    update(itemId, {
      stickerPngUri: stickerUri,
      processingStatus: 'done',
      processingStep: undefined,
      isProcessing: false,
      processingError: undefined,
    });
    console.log(`[Queue] ✓ ${itemId} done`);
  } catch (err) {
    update(itemId, {
      processingStatus: 'failed',
      processingStep: undefined,
      isProcessing: false,
      processingError: err instanceof Error ? err.message : 'Unknown error',
    });
    console.log(`[Queue] ✗ ${itemId} error:`, err);
  } finally {
    running--;
    drain();
  }
}

function drain() {
  while (running < MAX_CONCURRENT && queue.length > 0) {
    const task = queue.shift()!;
    running++;
    processTask(task);
  }
}

export function enqueueProcessing(itemId: string, imageUri: string, outfitContext?: OutfitContext) {
  queue.push({ itemId, imageUri, outfitContext });
  console.log(`[Queue] + ${itemId} queued (pending=${queue.length} running=${running})${outfitContext ? ' [outfit]' : ''}`);
  drain();
}

export function retryProcessing(itemId: string, imageUri: string) {
  update(itemId, {
    processingStatus: 'queued',
    processingStep: 'adding',
    isProcessing: true,
    processingError: undefined,
    stickerPngUri: undefined,
  });
  enqueueProcessing(itemId, imageUri);
}

let hasResumed = false;

/**
 * Resume any items stuck in queued/processing state (e.g. after app restart).
 * Only runs once per app lifecycle.
 */
export function resumePendingItems(items: ClosetItem[]) {
  if (hasResumed) return;
  hasResumed = true;

  const pending = items.filter(
    i =>
      i.imageUri &&
      (i.processingStatus === 'queued' || i.processingStatus === 'processing') &&
      !queue.some(t => t.itemId === i.id)
  );

  for (const item of pending) {
    enqueueProcessing(item.id, item.imageUri);
  }

  if (pending.length > 0) {
    console.log(`[Queue] Resumed ${pending.length} pending items`);
  }
}
