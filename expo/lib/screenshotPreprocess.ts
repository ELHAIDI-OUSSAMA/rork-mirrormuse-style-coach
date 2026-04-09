import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { cropScreenshotChrome, imageToBase64 } from '@/lib/cropImage';

const schema = z.object({
  screenshotLike: z.boolean(),
  topUiLikely: z.boolean(),
  bottomUiLikely: z.boolean(),
  feetNearBottom: z.boolean(),
  confidence: z.number().min(0).max(1),
});

export interface ScreenshotPreprocessResult {
  cleanedImageUri: string;
  applied: boolean;
  topCropPct: number;
  bottomCropPct: number;
}

export async function preprocessImageForDetection(imageUri: string): Promise<ScreenshotPreprocessResult> {
  try {
    const base64Image = await imageToBase64(imageUri);
    const analysis = await generateObject({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Check if this fashion image looks like a screenshot with app UI overlays.
Detect:
- top header/status bars
- bottom caption/save buttons/ui chrome
- whether shoes are close to bottom edge
Return conservative booleans only.`,
            },
            { type: 'image', image: base64Image },
          ],
        },
      ],
      schema,
    });

    if (!analysis.screenshotLike || (!analysis.topUiLikely && !analysis.bottomUiLikely)) {
      return { cleanedImageUri: imageUri, applied: false, topCropPct: 0, bottomCropPct: 0 };
    }

    const topCropPct = analysis.topUiLikely ? 0.1 : 0;
    // Keep shoes safe: if feet are near bottom, crop less.
    const bottomCropPct = analysis.bottomUiLikely ? (analysis.feetNearBottom ? 0.08 : 0.22) : 0;

    const cleanedImageUri = await cropScreenshotChrome(imageUri, topCropPct, bottomCropPct);
    return {
      cleanedImageUri,
      applied: cleanedImageUri !== imageUri,
      topCropPct,
      bottomCropPct,
    };
  } catch (error) {
    console.log('[ScreenshotPreprocess] failed, using original image:', error);
    return { cleanedImageUri: imageUri, applied: false, topCropPct: 0, bottomCropPct: 0 };
  }
}
