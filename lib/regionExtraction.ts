import { DetectedClothingItem } from '@/types';
import { cropByBBox, NormalizedBBox } from '@/lib/cropImage';
import { removeBackgroundWithRetry } from '@/utils/backgroundRemoval';
import { validateGarmentOnlySticker } from '@/utils/closetExtraction';

export async function extractItemStickerFromRegion(
  imageUri: string,
  bbox: NormalizedBBox,
  itemPrompt: string
): Promise<{ success: boolean; stickerUri?: string; croppedUri?: string; error?: string }> {
  try {
    const croppedUri = await cropByBBox(imageUri, bbox, 0.14);
    const bg = await removeBackgroundWithRetry(croppedUri, undefined, true, {
      itemDescription: itemPrompt,
    });
    if (!bg.success || !bg.stickerUri) {
      return { success: false, error: bg.error || 'Background removal failed' };
    }
    const valid = await validateGarmentOnlySticker(bg.stickerUri, itemPrompt);
    if (!valid.valid) {
      const strictRetry = await removeBackgroundWithRetry(croppedUri, undefined, true, {
        itemDescription: itemPrompt,
        strictMode: true,
      });
      if (!strictRetry.success || !strictRetry.stickerUri) {
        return { success: false, error: valid.reason || 'Failed strict retry' };
      }
      const strictValidation = await validateGarmentOnlySticker(strictRetry.stickerUri, itemPrompt);
      if (!strictValidation.valid) {
        return { success: false, error: strictValidation.reason || 'Contains person/body' };
      }
      return { success: true, stickerUri: strictRetry.stickerUri, croppedUri };
    }
    return { success: true, stickerUri: bg.stickerUri, croppedUri };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Region extraction failed',
    };
  }
}

export function buildRegionPrompt(item: DetectedClothingItem): string {
  return `Extract ONLY the ${item.color} ${item.subcategory} from the image. Remove the person completely (no face, no hands, no legs, no body). Remove ALL background. Output a clean transparent PNG sticker of the ${item.subcategory} only.`;
}
