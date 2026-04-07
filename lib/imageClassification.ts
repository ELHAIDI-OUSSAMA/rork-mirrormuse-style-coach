import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { imageToBase64 } from '@/lib/cropImage';

export type ImageInputType = 'single_item' | 'outfit' | 'unknown';

export interface ImageClassificationResult {
  type: ImageInputType;
  isScreenshotLike: boolean;
  confidence: number;
  personVisible: boolean;
  reasoning: string;
}

const schema = z.object({
  type: z.enum(['single_item', 'outfit', 'unknown']),
  personVisible: z.boolean(),
  isScreenshotLike: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export async function classifyImageInput(imageUri: string): Promise<ImageClassificationResult> {
  try {
    const base64Image = await imageToBase64(imageUri);
    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Classify this fashion image:
- single_item: one dominant standalone garment, no person visible
- outfit: person visible OR multiple worn pieces
- unknown: unclear

Rules:
- If a person is visible, choose outfit.
- If uncertain, choose outfit.
- Detect screenshot-like UI overlays (Pinterest app bars/buttons/captions).`,
            },
            { type: 'image', image: base64Image },
          ],
        },
      ],
      schema,
    });

    const normalizedType: ImageInputType =
      result.personVisible ? 'outfit' : result.type === 'unknown' ? 'outfit' : result.type;

    return {
      type: normalizedType,
      isScreenshotLike: result.isScreenshotLike,
      confidence: result.confidence,
      personVisible: result.personVisible,
      reasoning: result.reasoning,
    };
  } catch (error) {
    console.log('[ImageClassification] failed, defaulting to outfit:', error);
    return {
      type: 'outfit',
      isScreenshotLike: false,
      confidence: 0,
      personVisible: true,
      reasoning: 'Fallback classification due to error',
    };
  }
}
