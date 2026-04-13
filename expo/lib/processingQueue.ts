import { AvatarProfile, ClosetItem, ClothingCategory, VirtualTryOnRender } from '@/types';
import { removeBackgroundWithRetry } from '@/utils/backgroundRemoval';
import {
  detectClothingMetadata,
  cropItemFromOutfit,
} from '@/utils/closetExtraction';
import * as FileSystem from 'expo-file-system/legacy';
import { createAvatar, renderTryOn } from '@/lib/virtualTryOn';

const MAX_CONCURRENT = 2;
const STEP_TIMEOUT_MS = 90_000;
const TASK_TIMEOUT_MS = 180_000;

type UpdateFn = (itemId: string, updates: Partial<ClosetItem>) => void;
type RemoveFn = (itemId: string) => void;

interface OutfitContext {
  itemDescription: string;
  region: string;
  sourceImageUri?: string;
  detectedCategory?: string;
  detectedColor?: string;
  bbox?: { x: number; y: number; w: number; h: number };
  notes?: string;
}

interface QueueTask {
  itemId: string;
  imageUri: string;
  outfitContext?: OutfitContext;
  remoteImageUrl?: string;
  jobType?: 'DETECT_OUTFIT_ITEMS' | 'EXTRACT_ITEM_STICKER' | 'REMOVE_BACKGROUND_SINGLE' | 'PREPROCESS_SCREENSHOT';
}

let queue: QueueTask[] = [];
let running = 0;
let updateClosetItemRef: UpdateFn | null = null;
let removeClosetItemRef: RemoveFn | null = null;

interface AvatarCreateJob {
  type: 'AVATAR_CREATE';
  avatarId: string;
  faceImageUri: string;
  bodyImageUri: string;
  attempts: number;
}

interface TryOnRenderJob {
  type: 'TRYON_RENDER';
  renderId: string;
  avatar: AvatarProfile;
  outfitId?: string;
  closetItems: ClosetItem[];
  source: 'outfit_builder' | 'fit_check';
  attempts: number;
}

type TwinJob = AvatarCreateJob | TryOnRenderJob;

interface TwinQueueHandlers {
  onAvatarJobStart?: (avatarId: string) => void;
  onAvatarJobSuccess?: (avatarId: string, avatar: AvatarProfile) => void;
  onAvatarJobError?: (avatarId: string, message: string) => void;
  onTryOnJobStart?: (renderId: string) => void;
  onTryOnJobSuccess?: (renderId: string, render: VirtualTryOnRender) => void;
  onTryOnJobError?: (renderId: string, message: string) => void;
}

const MAX_TWIN_CONCURRENT = 1;
const MAX_TWIN_RETRIES = 2;
let twinQueue: TwinJob[] = [];
let twinRunning = 0;
let twinHandlers: TwinQueueHandlers = {};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);

    promise
      .then((result) => resolve(result))
      .catch((error) => reject(error))
      .finally(() => clearTimeout(timeoutId));
  });
}

export function setQueueUpdater(fn: UpdateFn) {
  updateClosetItemRef = fn;
}

export function setQueueRemover(fn: RemoveFn) {
  removeClosetItemRef = fn;
}

export function setTwinQueueHandlers(handlers: TwinQueueHandlers) {
  twinHandlers = handlers;
}

function update(itemId: string, updates: Partial<ClosetItem>) {
  updateClosetItemRef?.(itemId, updates);
}

async function processSingleItem(task: QueueTask) {
  const { itemId } = task;
  let imageUri = task.imageUri;

  update(itemId, { processingStatus: 'processing', processingStep: 'scanning' });

  if (task.remoteImageUrl || imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
    const remoteUrl = task.remoteImageUrl || imageUri;
    const stickersDir = `${FileSystem.documentDirectory}stickers`;
    const dirInfo = await FileSystem.getInfoAsync(stickersDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(stickersDir, { intermediates: true });
    }
    const localUri = `${stickersDir}/source-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    await withTimeout(
      FileSystem.downloadAsync(remoteUrl, localUri),
      STEP_TIMEOUT_MS,
      'Remote image download'
    );
    imageUri = localUri;
    update(itemId, { imageUri, imageRemoteUrl: remoteUrl });
  }

  // Metadata detection (non-blocking — use defaults on failure)
  try {
    const metadata = await withTimeout(
      detectClothingMetadata(imageUri),
      30_000,
      'Metadata detection'
    );
    update(itemId, {
      category: metadata.category,
      color: metadata.color,
      processingStep: 'removing_bg',
    });
  } catch (metaErr) {
    console.log(`[Queue] ${itemId} metadata detection failed (using defaults):`, metaErr instanceof Error ? metaErr.message : metaErr);
    update(itemId, { processingStep: 'removing_bg' });
  }

  const result = await withTimeout(
    removeBackgroundWithRetry(imageUri, (msg) => {
      if (msg.includes('pass 2') || msg.includes('Refining')) {
        update(itemId, { processingStep: 'creating_sticker' });
      }
    }),
    STEP_TIMEOUT_MS,
    'Background removal'
  );

  if (!result.success || !result.stickerUri) {
    // Fallback: use original image as sticker if BG removal fails
    console.log(`[Queue] ${itemId} BG removal failed, using original image as fallback`);
    return imageUri;
  }

  return result.stickerUri;
}

async function processOutfitItem(task: QueueTask) {
  const { itemId, imageUri, outfitContext } = task;
  const { itemDescription, region, sourceImageUri, detectedCategory, detectedColor, bbox, notes } = outfitContext!;
  const outfitImageUri = sourceImageUri || imageUri;

  console.log(`[ExtractJob] ====== START ${itemId} ======`);
  console.log(`[ExtractJob] item=${itemDescription} region=${region}`);
  console.log(`[ExtractJob] bbox=${JSON.stringify(bbox)}`);
  console.log(`[ExtractJob] category=${detectedCategory} color=${detectedColor}`);

  update(itemId, { processingStatus: 'processing', processingStep: 'scanning' });

  // --- STEP 1: Crop item from outfit ---
  let croppedUri: string | null = null;
  try {
    const cropResult = await withTimeout(
      cropItemFromOutfit(outfitImageUri, itemDescription, region, bbox, {
        tightMode: false,
        strictItemOnly: false,
      }),
      STEP_TIMEOUT_MS,
      'Outfit crop'
    );
    if (cropResult.success && cropResult.croppedUri) {
      croppedUri = cropResult.croppedUri;
      console.log(`[ExtractJob] ${itemId} crop OK`);
    } else {
      console.log(`[ExtractJob] ${itemId} crop returned no image: ${cropResult.error}`);
    }
  } catch (cropErr) {
    console.log(`[ExtractJob] ${itemId} crop error (will use source image):`, cropErr instanceof Error ? cropErr.message : cropErr);
  }

  // Fallback: use the original outfit image if crop failed
  const imageForBgRemoval = croppedUri || outfitImageUri;
  if (croppedUri) {
    update(itemId, { imageUri: croppedUri, processingStep: 'removing_bg' });
  } else {
    update(itemId, { processingStep: 'removing_bg' });
  }

  // --- STEP 2: Remove background ---
  let finalSticker: string | null = null;
  try {
    const bgResult = await withTimeout(
      removeBackgroundWithRetry(imageForBgRemoval, (msg) => {
        if (msg.includes('pass 2') || msg.includes('Refining')) {
          update(itemId, { processingStep: 'creating_sticker' });
        }
      }, true, { itemDescription, region }),
      STEP_TIMEOUT_MS,
      'Background removal'
    );
    if (bgResult.success && bgResult.stickerUri) {
      finalSticker = bgResult.stickerUri;
      console.log(`[ExtractJob] ${itemId} bg removal OK`);
    } else {
      console.log(`[ExtractJob] ${itemId} bg removal returned no sticker: ${bgResult.error}`);
    }
  } catch (bgErr) {
    console.log(`[ExtractJob] ${itemId} bg removal error:`, bgErr instanceof Error ? bgErr.message : bgErr);
  }

  // If BG removal failed but we have a cropped image, use that as the sticker
  if (!finalSticker && croppedUri) {
    console.log(`[ExtractJob] ${itemId} using cropped image as sticker fallback`);
    finalSticker = croppedUri;
  }

  // If everything failed, throw to trigger retry
  if (!finalSticker) {
    throw new Error('Both crop and background removal failed');
  }

  // --- STEP 3: Detect metadata (non-blocking — use defaults on failure) ---
  update(itemId, { processingStep: 'finalizing' });

  let metadataCategory = detectedCategory as ClothingCategory | undefined;
  let metadataColor = detectedColor;

  if (!metadataCategory || !metadataColor) {
    try {
      const metadata = await withTimeout(
        detectClothingMetadata(croppedUri || imageForBgRemoval),
        30_000,
        'Metadata detection'
      );
      if (!metadataCategory) metadataCategory = metadata.category;
      if (!metadataColor) metadataColor = metadata.color;
    } catch (metaErr) {
      console.log(`[ExtractJob] ${itemId} metadata detection failed (using defaults):`, metaErr instanceof Error ? metaErr.message : metaErr);
    }
  }

  update(itemId, {
    category: metadataCategory || ('T-shirt' as ClothingCategory),
    color: metadataColor || 'Unknown',
  });

  console.log(`[ExtractJob] ${itemId} ACCEPTED (region=${region})`);
  return finalSticker;
}

async function processTask(task: QueueTask, attempt: number = 1) {
  const { itemId } = task;
  const MAX_TASK_ATTEMPTS = 2;

  try {
    const stickerUri = await withTimeout(
      task.outfitContext ? processOutfitItem(task) : processSingleItem(task),
      TASK_TIMEOUT_MS,
      'Item processing'
    );

    update(itemId, { processingStep: 'finalizing' });
    await new Promise(r => setTimeout(r, 300));
    update(itemId, {
      stickerPngUri: stickerUri,
      processingStatus: 'done',
      processingStep: undefined,
      isProcessing: false,
      processingError: undefined,
    });
    console.log(`[Queue] ✓ ${itemId} done (attempt ${attempt})`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.log(`[Queue] ✗ ${itemId} attempt ${attempt} error: ${errorMessage}`);

    if (attempt < MAX_TASK_ATTEMPTS) {
      console.log(`[Queue] ↻ ${itemId} auto-retrying (attempt ${attempt + 1}/${MAX_TASK_ATTEMPTS})`);
      update(itemId, {
        processingStatus: 'processing',
        processingStep: 'retrying',
        processingError: undefined,
      });
      await new Promise(r => setTimeout(r, 1000));
      await processTask(task, attempt + 1);
      return;
    }

    update(itemId, {
      processingStatus: 'failed',
      processingStep: undefined,
      isProcessing: false,
      processingError: `${errorMessage} (after ${attempt} attempts)`,
    });
    console.log(`[Queue] ✗ ${itemId} PERMANENTLY FAILED after ${attempt} attempts`);
  } finally {
    if (attempt === 1) {
      running--;
      drain();
    }
  }
}

function drain() {
  while (running < MAX_CONCURRENT && queue.length > 0) {
    const task = queue.shift()!;
    running++;
    console.log(`[Queue] drain: starting ${task.itemId} (running=${running} pending=${queue.length})`);
    processTask(task);
  }
}

export function enqueueProcessing(
  itemId: string,
  imageUri: string,
  outfitContext?: OutfitContext,
  remoteImageUrl?: string,
  jobType?: QueueTask['jobType']
) {
  const resolvedJobType =
    jobType || (outfitContext ? 'EXTRACT_ITEM_STICKER' : 'REMOVE_BACKGROUND_SINGLE');
  queue.push({ itemId, imageUri, outfitContext, remoteImageUrl, jobType: resolvedJobType });
  console.log(
    `[Queue] + ${itemId} queued (${resolvedJobType}) (pending=${queue.length} running=${running})${outfitContext ? ' [outfit]' : ''}`
  );
  drain();
}

export function retryProcessing(
  itemId: string,
  imageUri: string,
  outfitContext?: OutfitContext,
  remoteImageUrl?: string,
  jobType?: QueueTask['jobType']
) {
  update(itemId, {
    processingStatus: 'queued',
    processingStep: 'adding',
    isProcessing: true,
    processingError: undefined,
    stickerPngUri: undefined,
  });
  enqueueProcessing(itemId, imageUri, outfitContext, remoteImageUrl, jobType);
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
    enqueueProcessing(item.id, item.imageUri, item.outfitContext, item.imageRemoteUrl);
  }

  if (pending.length > 0) {
    console.log(`[Queue] Resumed ${pending.length} pending items`);
  }
}

async function processTwinJob(job: TwinJob) {
  try {
    if (job.type === 'AVATAR_CREATE') {
      twinHandlers.onAvatarJobStart?.(job.avatarId);
      const avatar = await withTimeout(
        createAvatar(job.faceImageUri, job.bodyImageUri),
        TASK_TIMEOUT_MS,
        'Avatar creation'
      );
      twinHandlers.onAvatarJobSuccess?.(job.avatarId, avatar);
      return;
    }

    twinHandlers.onTryOnJobStart?.(job.renderId);
    const render = await withTimeout(
      renderTryOn(job.avatar, {
        outfitId: job.outfitId,
        closetItems: job.closetItems,
        source: job.source,
      }),
      TASK_TIMEOUT_MS,
      'Try-on render'
    );
    twinHandlers.onTryOnJobSuccess?.(job.renderId, { ...render, id: job.renderId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const nextAttempts = job.attempts + 1;
    if (nextAttempts <= MAX_TWIN_RETRIES) {
      twinQueue.push({ ...job, attempts: nextAttempts });
    } else if (job.type === 'AVATAR_CREATE') {
      twinHandlers.onAvatarJobError?.(job.avatarId, message);
    } else {
      twinHandlers.onTryOnJobError?.(job.renderId, message);
    }
  } finally {
    twinRunning -= 1;
    drainTwinQueue();
  }
}

function drainTwinQueue() {
  while (twinRunning < MAX_TWIN_CONCURRENT && twinQueue.length > 0) {
    const job = twinQueue.shift()!;
    twinRunning += 1;
    processTwinJob(job);
  }
}

export function enqueueAvatarCreateJob(avatarId: string, faceImageUri: string, bodyImageUri: string) {
  twinQueue.push({
    type: 'AVATAR_CREATE',
    avatarId,
    faceImageUri,
    bodyImageUri,
    attempts: 0,
  });
  drainTwinQueue();
}

export function enqueueTryOnRenderJob(
  renderId: string,
  avatar: AvatarProfile,
  source: 'outfit_builder' | 'fit_check',
  closetItems: ClosetItem[],
  outfitId?: string
) {
  twinQueue.push({
    type: 'TRYON_RENDER',
    renderId,
    avatar,
    source,
    closetItems,
    outfitId,
    attempts: 0,
  });
  drainTwinQueue();
}
