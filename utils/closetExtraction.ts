import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { generateObject } from "@rork-ai/toolkit-sdk";
import { z } from "zod";
import { DetectedClothingItem, ClosetItem, ClothingCategory } from "@/types";
import { removeBackgroundWithRetry } from "./backgroundRemoval";
import { detectOutfitItems as detectOutfitItemsUnified } from "@/lib/outfitDetection";

const IMAGE_EDIT_URL = "https://toolkit.rork.com/images/edit/";

async function imageToBase64(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(",")[1] || "";
        resolve(base64Data);
      };
      reader.onerror = () => reject(new Error("Failed to read image as base64"));
      reader.readAsDataURL(blob);
    });
  }
  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

async function saveBase64ToFile(base64Data: string, mimeType: string): Promise<string> {
  const safeMime = mimeType || "image/png";
  if (Platform.OS === "web") {
    return `data:${safeMime};base64,${base64Data}`;
  }
  const ext = safeMime.includes("png") ? "png" : safeMime.includes("jpg") || safeMime.includes("jpeg") ? "jpg" : "png";
  const fileUri = `${FileSystem.documentDirectory}stickers/sticker-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
  const dirUri = `${FileSystem.documentDirectory}stickers`;
  const dirInfo = await FileSystem.getInfoAsync(dirUri);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
  }
  await FileSystem.writeAsStringAsync(fileUri, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return fileUri;
}

export async function classifyPhotoType(
  imageUri: string
): Promise<'single_item_photo' | 'outfit_photo'> {
  try {
    console.log('[PhotoClassifier] Analyzing photo type');
    const base64Image = await imageToBase64(imageUri);

    const classificationSchema = z.object({
      photoType: z.enum(['single_item_photo', 'outfit_photo']).describe('Type of photo: single_item_photo (one garment on plain background, no person) or outfit_photo (person wearing clothes or multiple items on body)'),
      personVisible: z.boolean().describe('Is a human body/person visible in the image?'),
      reasoning: z.string().describe('Brief explanation of classification'),
    });

    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: 'Classify this image as either:\n1) single_item_photo: A single garment/clothing item photographed on a plain background with NO person visible\n2) outfit_photo: A person wearing clothes (full body, selfie, etc.) OR multiple items being worn\n\nBe strict: if you see ANY part of a human body/person, classify as outfit_photo.' 
            },
            { type: 'image', image: base64Image },
          ],
        },
      ],
      schema: classificationSchema,
    });

    console.log('[PhotoClassifier] Result:', result.photoType, '-', result.reasoning);
    return result.photoType;
  } catch (error) {
    console.log('[PhotoClassifier] Error, defaulting to outfit_photo:', error);
    return 'outfit_photo';
  }
}

export async function validateGarmentOnlySticker(
  stickerUri: string,
  itemDescription: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    console.log(`[GarmentValidation] Validating ${itemDescription} sticker`);
    const base64Image = await imageToBase64(stickerUri);

    const validationSchema = z.object({
      containsGarmentOnly: z.boolean().describe('Does this image contain ONLY the garment/clothing item with NO visible human body parts (no face, hands, legs, torso, skin)?'),
      humanPartsVisible: z.array(z.string()).describe('List any human body parts visible (face, hands, arms, legs, torso, skin, etc.). Empty array if none.'),
      confidence: z.number().min(0).max(1).describe('Confidence in this assessment'),
    });

    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: `Validate this extracted ${itemDescription} sticker. It should contain ONLY the garment with transparent background.\n\nRULES:\n- REJECT if you see any human body parts (face, hands, arms, legs, torso, skin)\n- ACCEPT only if it's purely the clothing item\n- Be strict: even partial body parts = REJECT` 
            },
            { type: 'image', image: base64Image },
          ],
        },
      ],
      schema: validationSchema,
    });

    console.log(`[GarmentValidation] ${itemDescription}: containsGarmentOnly=${result.containsGarmentOnly}, humanParts=${result.humanPartsVisible.join(', ')}`);

    if (!result.containsGarmentOnly || result.humanPartsVisible.length > 0) {
      return {
        valid: false,
        reason: `Contains human body parts: ${result.humanPartsVisible.join(', ')}`,
      };
    }

    if (result.confidence < 0.45) {
      return {
        valid: false,
        reason: 'Low confidence in garment extraction',
      };
    }

    return { valid: true };
  } catch (error) {
    console.log(`[GarmentValidation] Error for ${itemDescription}:`, error);
    return { valid: false, reason: 'Validation error' };
  }
}

export async function validateExtractionQuality(
  stickerUri: string,
  itemDescription: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const base64Image = await imageToBase64(stickerUri);
    const qualitySchema = z.object({
      singleGarment: z.boolean(),
      torsoLikeCrop: z.boolean(),
      humanVisible: z.boolean(),
      clippedOrTiny: z.boolean(),
      confidence: z.number().min(0).max(1),
      notes: z.string().optional(),
    });

    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Quality check this ${itemDescription} sticker for use in a digital closet.

REJECT if any of these are true:
- It looks like a full person, torso crop, or multiple garments merged together
- It contains visible human body (face, hands, arms, legs, torso, skin)
- It has large background areas (not cleanly isolated)
- It is a rectangular crop of a photo rather than an isolated garment silhouette
- Multiple different clothing categories are visible (e.g. jacket AND pants)

ACCEPT only if:
- It contains one single garment type (e.g. just a jacket, just pants, just shoes)
- The garment is mostly isolated with minimal background
- It looks like a clean e-commerce product cutout or wardrobe sticker`,
            },
            { type: 'image', image: base64Image },
          ],
        },
      ],
      schema: qualitySchema,
    });

    if (result.humanVisible) return { valid: false, reason: 'Human body visible' };
    if (result.torsoLikeCrop) return { valid: false, reason: 'Torso/person crop' };
    if (!result.singleGarment) return { valid: false, reason: 'Multiple garments merged' };
    if (result.clippedOrTiny) return { valid: false, reason: 'Clipped or tiny output' };
    if (result.confidence < 0.45) return { valid: false, reason: 'Low extraction quality confidence' };
    return { valid: true };
  } catch (error) {
    console.log(`[ExtractionQuality] Error for ${itemDescription}:`, error);
    return { valid: false, reason: 'Quality validation error' };
  }
}

export async function cropItemFromOutfit(
  outfitImageUri: string,
  itemDescription: string,
  region: string,
  bbox?: { x: number; y: number; w: number; h: number },
  options?: { tightMode?: boolean; strictItemOnly?: boolean }
): Promise<{ success: boolean; croppedUri?: string; error?: string }> {
  return cropItemRegionFromOutfit(outfitImageUri, itemDescription, region, bbox, undefined, options);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function fallbackBBoxByRegion(region: string): { x: number; y: number; w: number; h: number } {
  if (region === 'upper_outer') return { x: 0.14, y: 0.08, w: 0.72, h: 0.42 };
  if (region === 'upper_inner') return { x: 0.2, y: 0.16, w: 0.6, h: 0.34 };
  if (region === 'lower') return { x: 0.2, y: 0.46, w: 0.6, h: 0.36 };
  if (region === 'feet') return { x: 0.18, y: 0.82, w: 0.64, h: 0.18 };
  return { x: 0.22, y: 0.22, w: 0.56, h: 0.42 };
}

function paddingForRegion(region: string, tightMode?: boolean): number {
  if (region === 'upper_outer') return tightMode ? 0.08 : 0.11;
  if (region === 'upper_inner') return tightMode ? 0.06 : 0.09;
  if (region === 'lower') return tightMode ? 0.06 : 0.09;
  if (region === 'feet') return tightMode ? 0.04 : 0.07;
  if (region === 'accessory') return tightMode ? 0.04 : 0.06;
  return tightMode ? 0.08 : 0.11;
}

function capBBoxSizeByRegion(
  region: string,
  box: { x: number; y: number; w: number; h: number }
): { x: number; y: number; w: number; h: number } {
  const caps =
    region === 'upper_outer'
      ? { maxW: 0.75, maxH: 0.45 }
      : region === 'upper_inner'
      ? { maxW: 0.65, maxH: 0.38 }
      : region === 'lower'
      ? { maxW: 0.70, maxH: 0.48 }
      : region === 'feet'
      ? { maxW: 0.68, maxH: 0.30 }
      : region === 'accessory'
      ? { maxW: 0.40, maxH: 0.30 }
      : { maxW: 0.70, maxH: 0.45 };

  const nextW = Math.min(box.w, caps.maxW);
  const nextH = Math.min(box.h, caps.maxH);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const nextX = clamp01(cx - nextW / 2);
  const nextY = clamp01(cy - nextH / 2);

  let finalY = nextY;
  let finalH = nextH;

  // For lower region: ensure bbox bottom never extends past y=0.84 (shoe zone starts there)
  if (region === 'lower') {
    const bboxBottom = finalY + finalH;
    if (bboxBottom > 0.84) {
      finalH = Math.max(0.15, 0.84 - finalY);
    }
  }

  return {
    x: nextX,
    y: finalY,
    w: Math.max(0.05, Math.min(1 - nextX, nextW)),
    h: Math.max(0.05, Math.min(1 - finalY, finalH)),
  };
}

function normalizeBBox(
  region: string,
  bbox?: { x: number; y: number; w: number; h: number },
  padding?: number,
  tightMode?: boolean
): { x: number; y: number; w: number; h: number } {
  const source = capBBoxSizeByRegion(region, bbox || fallbackBBoxByRegion(region));
  const pad = padding ?? paddingForRegion(region, tightMode);
  const paddedX = clamp01(source.x - pad * 0.5);
  const paddedY = clamp01(source.y - pad * 0.5);
  const paddedW = clamp01(source.w + pad);
  const paddedH = clamp01(source.h + pad);
  const maxW = clamp01(1 - paddedX);
  const maxH = clamp01(1 - paddedY);
  return {
    x: paddedX,
    y: paddedY,
    w: Math.max(0.05, Math.min(maxW, paddedW)),
    h: Math.max(0.05, Math.min(maxH, paddedH)),
  };
}

function buildCropPrompt(
  itemDescription: string,
  region: string,
  safeBBox: { x: number; y: number; w: number; h: number },
  options?: { tightMode?: boolean; strictItemOnly?: boolean }
): string {
  const bboxStr = `${safeBBox.x.toFixed(3)}, ${safeBBox.y.toFixed(3)}, ${safeBBox.w.toFixed(3)}, ${safeBBox.h.toFixed(3)}`;
  const realGarmentRule = `\nCRITICAL: Extract the EXACT garment as it appears in the source photo. Preserve its real texture, folds, wrinkles, stitching, and proportions. Do NOT redesign, redraw, illustrate, or generate a cleaner version. The output must look like a photo cutout, NOT a product render or illustration.`;
  const strict = options?.strictItemOnly ? '\nSTRICT MODE: crop extremely tight around the garment edges only.' : '';

  if (region === 'upper_outer') {
    return `Crop this outfit image to extract ONLY the outerwear (jacket/coat/blazer).
Target item: ${itemDescription}
Bounding box (x,y,w,h): ${bboxStr}

MUST INCLUDE: only the jacket/coat/blazer silhouette.
MUST EXCLUDE: the person's face, hands, legs, pants, shoes, inner shirt/t-shirt, and ALL background.
Do NOT return a torso crop or full upper-body crop. Return ONLY the outer garment.${realGarmentRule}${strict}`;
  }

  if (region === 'upper_inner') {
    return `Crop this outfit image to extract ONLY the inner top (shirt/t-shirt/sweater).
Target item: ${itemDescription}
Bounding box (x,y,w,h): ${bboxStr}

MUST INCLUDE: only the inner top garment silhouette.
MUST EXCLUDE: jacket/outerwear over it, face, hands, belt, pants, and ALL background.
If a jacket covers part of the shirt, crop only the visible shirt area.
Do NOT return a torso crop. Return ONLY the inner garment.${realGarmentRule}${strict}`;
  }

  if (region === 'lower') {
    return `Crop this outfit image to extract ONLY the pants/trousers/jeans.
Target item: ${itemDescription}
Bounding box (x,y,w,h): ${bboxStr}

MUST INCLUDE: only the pants/trousers from waistband to ankle hem.
MUST EXCLUDE: shoes/sneakers/boots (these will be extracted separately), upper body garments, belt, hands, floor, and ALL background.
Do NOT include the person's torso, jacket, or shirt in this crop.
Do NOT include any footwear — cut off at the ankle line.${realGarmentRule}${strict}`;
  }

  if (region === 'feet') {
    return `Crop this outfit image to extract ONLY the footwear (shoes/sneakers/boots).
Target item: ${itemDescription}
Bounding box (x,y,w,h): ${bboxStr}

MUST INCLUDE: only the shoes/sneakers/boots.
MUST EXCLUDE: legs above ankle, pants, floor/ground, and ALL background.
Return a tight crop of ONLY the footwear.${realGarmentRule}${strict}`;
  }

  if (region === 'accessory') {
    return `Crop this outfit image to extract ONLY the accessory.
Target item: ${itemDescription}
Bounding box (x,y,w,h): ${bboxStr}

MUST INCLUDE: only the ${itemDescription}.
MUST EXCLUDE: person, clothing, and ALL background.
Return a tight crop of ONLY the accessory.${realGarmentRule}${strict}`;
  }

  return `Crop this outfit image around the target garment only.
Target item: ${itemDescription}
Target region: ${region}
Bounding box (x,y,w,h): ${bboxStr}

MUST INCLUDE: only the ${itemDescription} silhouette.
MUST EXCLUDE: face, hands, body skin, legs, unrelated garments, and ALL background.
Do NOT return a full outfit or large torso section.${realGarmentRule}${strict}`;
}

async function cropItemRegionFromOutfit(
  outfitImageUri: string,
  itemDescription: string,
  region: string,
  bbox?: { x: number; y: number; w: number; h: number },
  onProgress?: (message: string) => void,
  options?: { tightMode?: boolean; strictItemOnly?: boolean }
): Promise<{ success: boolean; croppedUri?: string; error?: string }> {
  try {
    onProgress?.(`Cropping ${itemDescription}...`);
    const base64Image = await imageToBase64(outfitImageUri);
    const safeBBox = normalizeBBox(region, bbox, undefined, options?.tightMode);

    const bboxArea = safeBBox.w * safeBBox.h;
    if (bboxArea > 0.40) {
      console.log(`[RegionCrop] WARNING: bbox area ${bboxArea.toFixed(3)} is large for ${region} ${itemDescription}, tightening`);
      const tighterBBox = normalizeBBox(region, bbox, undefined, true);
      Object.assign(safeBBox, tighterBBox);
    }

    const prompt = buildCropPrompt(itemDescription, region, safeBBox, options);

    const requestBody = {
      prompt,
      images: [{ type: "image", image: base64Image }],
    };

    const response = await fetch(IMAGE_EDIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.log(`[RegionCrop] Failed for ${itemDescription}:`, response.status);
      return { success: false, error: "Crop failed" };
    }

    const result = await response.json();
    const base64Data = result?.image?.base64Data || result?.images?.[0]?.base64Data || result?.data?.image?.base64Data;
    const mimeType = result?.image?.mimeType || result?.images?.[0]?.mimeType || "image/png";

    if (!base64Data) {
      return { success: false, error: "No image data" };
    }

    const croppedUri = await saveBase64ToFile(base64Data, mimeType);
    console.log(`[RegionCrop] Success for ${itemDescription}`);
    return { success: true, croppedUri };
  } catch (error) {
    console.log(`[RegionCrop] Error for ${itemDescription}:`, error);
    return { success: false, error: "Crop error" };
  }
}

const categoryMap: Record<string, ClothingCategory> = {
  'T-shirt': 'T-shirt',
  'Shirt': 'Shirt',
  'Hoodie': 'Hoodie',
  'Sweater': 'Sweater',
  'Jacket': 'Jacket',
  'Blazer': 'Blazer',
  'Coat': 'Coat',
  'Overshirt': 'Jacket',
  'Pants': 'Pants',
  'Jeans': 'Jeans',
  'Shorts': 'Shorts',
  'Sneakers': 'Sneakers',
  'Loafers': 'Shoes',
  'Boots': 'Boots',
  'Shoes': 'Shoes',
  'Belt': 'Belt',
  'Bag': 'Bag',
  'Watch': 'Watch',
};

export async function extractAndSaveClosetItemsFromOutfit(
  outfitImageUri: string,
  detectedItems: DetectedClothingItem[],
  onProgress?: (current: number, total: number, message: string) => void,
  onItemComplete?: (item: ClosetItem) => void
): Promise<{ successCount: number; failedCount: number; items: ClosetItem[] }> {
  const items: ClosetItem[] = [];
  let successCount = 0;
  let failedCount = 0;

  console.log(`[OutfitExtraction] Starting unified pipeline for ${detectedItems.length} items`);

  for (let i = 0; i < detectedItems.length; i++) {
    const detectedItem = detectedItems[i];
    const itemDescription = `${detectedItem.color} ${detectedItem.subcategory}`;
    
    onProgress?.(i + 1, detectedItems.length, `Processing ${itemDescription}...`);

    console.log(`[OutfitExtraction] Step 1: Cropping ${itemDescription} from ${detectedItem.region}`);
    const cropResult = await cropItemRegionFromOutfit(
      outfitImageUri,
      itemDescription,
      detectedItem.region,
      detectedItem.bbox,
      (msg) => onProgress?.(i + 1, detectedItems.length, msg)
    );

    if (!cropResult.success || !cropResult.croppedUri) {
      console.log(`[OutfitExtraction] Crop failed for ${itemDescription}`);
      failedCount++;
      await new Promise(resolve => setTimeout(resolve, 300));
      continue;
    }

    console.log(`[OutfitExtraction] Step 2: Running closet pipeline on cropped ${itemDescription}`);
    onProgress?.(i + 1, detectedItems.length, `Creating sticker for ${itemDescription}...`);

    const stickerResult = await removeBackgroundWithRetry(
      cropResult.croppedUri,
      (msg) => onProgress?.(i + 1, detectedItems.length, msg),
      true
    );

    if (!stickerResult.success || !stickerResult.stickerUri) {
      console.log(`[OutfitExtraction] Sticker creation failed for ${itemDescription}`);
      failedCount++;
      await new Promise(resolve => setTimeout(resolve, 300));
      continue;
    }

    console.log(`[OutfitExtraction] Step 2.5: Validating garment-only sticker for ${itemDescription}`);
    onProgress?.(i + 1, detectedItems.length, `Validating ${itemDescription}...`);
    
    const validation = await validateGarmentOnlySticker(
      stickerResult.stickerUri,
      itemDescription
    );

    if (!validation.valid) {
      console.log(`[OutfitExtraction] Validation failed for ${itemDescription}: ${validation.reason}`);
      failedCount++;
      await new Promise(resolve => setTimeout(resolve, 300));
      continue;
    }

    console.log(`[OutfitExtraction] Step 3: Detecting metadata for ${itemDescription}`);
    const metadata = await detectClothingMetadata(cropResult.croppedUri);
    
    const category = categoryMap[detectedItem.subcategory] || metadata.category;
    
    const generateRandomPosition = () => ({
      x: Math.random() * 200 + 16,
      y: Math.random() * 300,
      rotation: (Math.random() - 0.5) * 16,
      scale: 0.85 + Math.random() * 0.25,
    });

    const newItem: ClosetItem = {
      id: `closet_outfit_${Date.now()}_${i}`,
      imageUri: cropResult.croppedUri,
      stickerPngUri: stickerResult.stickerUri,
      category,
      color: metadata.color || detectedItem.color,
      styleTags: [],
      createdAt: new Date().toISOString(),
      source: 'auto_extracted',
      position: generateRandomPosition(),
      usageCount: 0,
      outlineEnabled: true,
      isProcessing: false,
    };

    items.push(newItem);
    successCount++;
    onItemComplete?.(newItem);
    
    console.log(`[OutfitExtraction] Success for ${itemDescription}`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`[OutfitExtraction] Complete: ${successCount} success, ${failedCount} failed`);
  return { successCount, failedCount, items };
}

export async function detectClothingMetadata(imageUri: string): Promise<{
  category: ClothingCategory;
  color: string;
}> {
  try {
    console.log('[MetadataDetection] Starting detection');
    
    const base64Image = await imageToBase64(imageUri);

    const detectionSchema = z.object({
      category: z.enum([
        'T-shirt', 'Shirt', 'Hoodie', 'Sweater', 'Jacket', 'Blazer', 'Coat',
        'Jeans', 'Pants', 'Shorts', 'Dress', 'Skirt', 'Suit',
        'Sneakers', 'Shoes', 'Boots', 'Bag', 'Belt', 'Watch', 'Accessory'
      ]).describe('The category of the clothing item'),
      color: z.string().describe('The primary color of the clothing item (e.g., Black, White, Navy, Blue, Gray, Brown, Beige, Red, Pink, Green, Yellow, Orange, Purple)'),
    });

    const result = await generateObject({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this clothing item image and identify: 1) The category (exact type like T-shirt, Hoodie, Jeans, Sneakers, etc.), 2) The primary color. Be specific and accurate.' },
            { type: 'image', image: base64Image },
          ],
        },
      ],
      schema: detectionSchema,
    });

    console.log('[MetadataDetection] Detected:', result);
    return {
      category: result.category as ClothingCategory,
      color: result.color,
    };
  } catch (error) {
    console.log('[MetadataDetection] Error:', error);
    return {
      category: 'T-shirt',
      color: 'Black',
    };
  }
}

export async function detectItemsInOutfitImage(
  outfitImageUri: string
): Promise<DetectedClothingItem[]> {
  return detectOutfitItemsUnified(outfitImageUri);
}
