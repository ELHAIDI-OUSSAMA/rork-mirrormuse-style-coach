import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { generateObject } from "@rork-ai/toolkit-sdk";
import { z } from "zod";
import { DetectedClothingItem, ClosetItem, ClothingCategory, ClothingSubcategory } from "@/types";
import { removeBackgroundWithRetry } from "./backgroundRemoval";
import { makeBackgroundTransparent } from "./pngTransparency";

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
  const fileUri = `${FileSystem.cacheDirectory}stickers/sticker-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
  const dirUri = `${FileSystem.cacheDirectory}stickers`;
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

async function validateGarmentOnlySticker(
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

    if (result.confidence < 0.7) {
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

export async function cropItemFromOutfit(
  outfitImageUri: string,
  itemDescription: string,
  region: string,
): Promise<{ success: boolean; croppedUri?: string; error?: string }> {
  return cropItemRegionFromOutfit(outfitImageUri, itemDescription, region);
}

async function cropItemRegionFromOutfit(
  outfitImageUri: string,
  itemDescription: string,
  region: string,
  onProgress?: (message: string) => void
): Promise<{ success: boolean; croppedUri?: string; error?: string }> {
  try {
    onProgress?.(`Cropping ${itemDescription}...`);
    const base64Image = await imageToBase64(outfitImageUri);
    
    const prompt = `Extract and crop ONLY the ${itemDescription} garment from the ${region} region and place it on a SOLID BRIGHT MAGENTA/PINK (#FF00FF) background. CRITICAL RULES:
- Remove the person COMPLETELY (no face, no hands, no arms, no legs, no body, no skin)
- The background must be pure magenta (#FF00FF) everywhere
- Output ONLY the ${itemDescription} garment itself on the magenta background
- The result must be the clothing item isolated, NOT a person wearing it
- Focus on the fabric and garment only, exclude all human elements`;
    
    const requestBody = {
      prompt,
      images: [{ type: "image", image: base64Image }],
      aspectRatio: "1:1",
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
    let base64Data = result?.image?.base64Data || result?.images?.[0]?.base64Data || result?.data?.image?.base64Data;
    let mimeType = result?.image?.mimeType || result?.images?.[0]?.mimeType || "image/png";

    if (!base64Data) {
      return { success: false, error: "No image data" };
    }

    try {
      base64Data = makeBackgroundTransparent(base64Data, 'auto');
      mimeType = "image/png";
    } catch (e) {
      console.log(`[RegionCrop] Transparency post-processing failed for ${itemDescription}`);
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
  try {
    console.log('[OutfitDetection] Starting grounded detection');
    
    const base64Image = await imageToBase64(outfitImageUri);

    const visibilitySchema = z.object({
      feetVisible: z.boolean().describe('Are feet/shoes clearly visible in the bottom 25% of the image?'),
      outerwearVisible: z.boolean().describe('Is there a visible outer layer (jacket/coat/blazer) on top of other clothing?'),
      topVisible: z.boolean().describe('Is an upper body garment (shirt/t-shirt/sweater) visible?'),
      bottomVisible: z.boolean().describe('Are lower body garments (pants/jeans/shorts) visible?'),
      accessoriesVisible: z.boolean().describe('Are any accessories (belt/bag/watch) clearly visible?'),
    });

    console.log('[OutfitDetection] Step 1: Checking region visibility');
    const visibility = await generateObject({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this outfit photo and determine which clothing regions are ACTUALLY VISIBLE in the image. Do not guess or infer hidden items. Only mark as visible if you can clearly see the item.' },
            { type: 'image', image: base64Image },
          ],
        },
      ],
      schema: visibilitySchema,
    });

    console.log('[OutfitDetection] Visibility:', visibility);

    const itemSchema = z.object({
      subcategory: z.enum([
        'Jacket', 'Coat', 'Blazer', 'Overshirt',
        'Sweater', 'T-shirt', 'Shirt', 'Hoodie',
        'Pants', 'Jeans', 'Shorts',
        'Sneakers', 'Loafers', 'Boots', 'Shoes',
        'Belt', 'Bag', 'Watch'
      ]).describe('Specific clothing subcategory'),
      color: z.string().describe('Primary color'),
      confidence: z.number().min(0).max(1).describe('Detection confidence 0-1'),
    });

    const detectionSchema = z.object({
      outerwear: z.array(itemSchema).optional().describe('Outer layer clothing if outerwearVisible=true'),
      top: z.array(itemSchema).optional().describe('Upper body garments if topVisible=true'),
      bottom: z.array(itemSchema).optional().describe('Lower body garments if bottomVisible=true'),
      footwear: z.array(itemSchema).optional().describe('Shoes/boots if feetVisible=true'),
      accessories: z.array(itemSchema).optional().describe('Accessories if accessoriesVisible=true'),
    });

    console.log('[OutfitDetection] Step 2: Detecting items in visible regions only');
    const detected = await generateObject({
      messages: [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: `Detect clothing items in this outfit photo. STRICT RULES:
- Outerwear: Only detect if outerwearVisible=${visibility.outerwearVisible}
- Top: Only detect if topVisible=${visibility.topVisible}
- Bottom: Only detect if bottomVisible=${visibility.bottomVisible}
- Footwear: Only detect if feetVisible=${visibility.feetVisible}
- Accessories: Only detect if accessoriesVisible=${visibility.accessoriesVisible}

Do NOT hallucinate items that are not visible. If a region is not visible, return empty array for that region.` 
            },
            { type: 'image', image: base64Image },
          ],
        },
      ],
      schema: detectionSchema,
    });

    console.log('[OutfitDetection] Raw detection:', detected);

    const items: DetectedClothingItem[] = [];

    if (visibility.outerwearVisible && detected.outerwear) {
      detected.outerwear.forEach(item => {
        if (item.confidence >= 0.60) {
          items.push({
            category: 'Outerwear',
            subcategory: item.subcategory as ClothingSubcategory,
            color: item.color,
            confidence: item.confidence,
            visibility: 'visible',
            region: 'upper_outer',
            evidence: `${item.color} ${item.subcategory} visible as outer layer`,
            bbox: { x: 0.2, y: 0.15, w: 0.6, h: 0.35 },
          });
        }
      });
    }

    if (visibility.topVisible && detected.top) {
      detected.top.forEach(item => {
        if (item.confidence >= 0.60) {
          items.push({
            category: 'Top',
            subcategory: item.subcategory as ClothingSubcategory,
            color: item.color,
            confidence: item.confidence,
            visibility: 'visible',
            region: 'upper_inner',
            evidence: `${item.color} ${item.subcategory} visible on upper body`,
            bbox: { x: 0.25, y: 0.2, w: 0.5, h: 0.3 },
          });
        }
      });
    }

    if (visibility.bottomVisible && detected.bottom) {
      detected.bottom.forEach(item => {
        if (item.confidence >= 0.60) {
          items.push({
            category: 'Bottom',
            subcategory: item.subcategory as ClothingSubcategory,
            color: item.color,
            confidence: item.confidence,
            visibility: 'visible',
            region: 'lower',
            evidence: `${item.color} ${item.subcategory} visible on lower body`,
            bbox: { x: 0.25, y: 0.5, w: 0.5, h: 0.45 },
          });
        }
      });
    }

    if (visibility.feetVisible && detected.footwear) {
      detected.footwear.forEach(item => {
        if (item.confidence >= 0.75) {
          items.push({
            category: 'Footwear',
            subcategory: item.subcategory as ClothingSubcategory,
            color: item.color,
            confidence: item.confidence,
            visibility: 'visible',
            region: 'feet',
            evidence: `${item.color} ${item.subcategory} visible at feet`,
            bbox: { x: 0.2, y: 0.85, w: 0.6, h: 0.15 },
          });
        }
      });
    }

    if (visibility.accessoriesVisible && detected.accessories) {
      detected.accessories.forEach(item => {
        if (item.confidence >= 0.70) {
          items.push({
            category: 'Accessory',
            subcategory: item.subcategory as ClothingSubcategory,
            color: item.color,
            confidence: item.confidence,
            visibility: 'visible',
            region: 'accessory',
            evidence: `${item.color} ${item.subcategory} visible as accessory`,
            bbox: { x: 0.3, y: 0.4, w: 0.4, h: 0.2 },
          });
        }
      });
    }

    console.log(`[OutfitDetection] Final result: ${items.length} items detected`);
    return items;
  } catch (error) {
    console.log('[OutfitDetection] Error:', error);
    return [];
  }
}
