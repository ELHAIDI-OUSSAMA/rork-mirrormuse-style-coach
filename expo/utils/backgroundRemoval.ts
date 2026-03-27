import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { makeBackgroundTransparent } from "./pngTransparency";

const IMAGE_EDIT_URL = "https://toolkit.rork.com/images/edit/";

export interface BackgroundRemovalResult {
  success: boolean;
  stickerUri?: string;
  error?: string;
}

/**
 * Converts an image URI to base64 (without data: prefix).
 */
async function imageToBase64(uri: string): Promise<string> {
  // Web: fetch -> blob -> FileReader
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

  // Native: FileSystem
  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/**
 * Saves base64 image as:
 * - Web: data URI
 * - Native: a file in cacheDirectory (file://...)
 */
async function saveBase64ToFile(
  base64Data: string,
  mimeType: string
): Promise<string> {
  const safeMime = mimeType || "image/png";

  if (Platform.OS === "web") {
    return `data:${safeMime};base64,${base64Data}`;
  }

  const ext =
    safeMime.includes("png") ? "png" :
    safeMime.includes("jpg") || safeMime.includes("jpeg") ? "jpg" :
    "png";

  const fileUri = `${FileSystem.cacheDirectory}stickers/sticker-${Date.now()}.${ext}`;

  // Ensure directory exists
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

/**
 * Safely parse JSON even if server returns HTML/text.
 */
function safeJsonParse(rawText: string): any {
  try {
    return JSON.parse(rawText);
  } catch (e) {
    // Add a short preview to help debugging
    const preview = rawText?.slice(0, 200)?.replace(/\s+/g, " ");
    throw new Error(
      `Invalid JSON response. First 200 chars: "${preview}"`
    );
  }
}

/**
 * Extract image payload from various possible API shapes.
 */
function extractImagePayload(result: any): { base64Data: string; mimeType: string } {
  // Common shapes:
  // 1) { image: { base64Data, mimeType } }
  if (result?.image?.base64Data) {
    return {
      base64Data: result.image.base64Data,
      mimeType: result.image.mimeType || "image/png",
    };
  }

  // 2) { images: [ { base64Data, mimeType } ] }
  if (Array.isArray(result?.images) && result.images[0]?.base64Data) {
    return {
      base64Data: result.images[0].base64Data,
      mimeType: result.images[0].mimeType || "image/png",
    };
  }

  // 3) { data: { image: { base64Data } } }
  if (result?.data?.image?.base64Data) {
    return {
      base64Data: result.data.image.base64Data,
      mimeType: result.data.image.mimeType || "image/png",
    };
  }

  throw new Error("No image base64Data found in API response.");
}

export async function removeBackground(imageUri: string, isGarmentOnly: boolean = true): Promise<BackgroundRemovalResult> {
  try {
    console.log("[BackgroundRemoval] Starting for:", imageUri);

    const base64Image = await imageToBase64(imageUri);
    console.log("[BackgroundRemoval] Converted to base64");

    const prompt = isGarmentOnly
      ? "Extract ONLY the clothing/garment item and place it on a SOLID BRIGHT MAGENTA/PINK (#FF00FF) background. CRITICAL: Remove ALL human body parts (no hands, arms, legs, face, torso, skin). Output only the fabric/garment itself on a perfectly uniform magenta (#FF00FF) background. The magenta must be pure #FF00FF everywhere except the garment."
      : "Isolate the clothing item in this image and place it on a SOLID BRIGHT MAGENTA/PINK (#FF00FF) background. Keep the item natural and preserve all details. The background must be pure magenta (#FF00FF) everywhere.";

    const requestBody = {
      prompt,
      images: [{ type: "image", image: base64Image }],
      aspectRatio: "1:1",
    };

    console.log("[BackgroundRemoval] POST", IMAGE_EDIT_URL);

    const response = await fetch(IMAGE_EDIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const rawText = await response.text();

    if (!response.ok) {
      console.log("[BackgroundRemoval] API error (will use original):", response.status);
      return {
        success: false,
        error: `Background removal unavailable`,
      };
    }

    // ✅ Parse safely (prevents “; expected” crashes)
    const result = safeJsonParse(rawText);
    console.log("[BackgroundRemoval] Parsed response OK");

    let { base64Data, mimeType } = extractImagePayload(result);

    console.log("[BackgroundRemoval] Response mimeType:", mimeType);

    // Post-process: replace the solid green background with actual alpha transparency
    try {
      console.log("[BackgroundRemoval] Applying transparency post-processing...");
      base64Data = makeBackgroundTransparent(base64Data, 'auto');
      mimeType = "image/png";
      console.log("[BackgroundRemoval] Transparency applied successfully");
    } catch (ppErr) {
      console.log("[BackgroundRemoval] Post-processing failed, using as-is:", ppErr instanceof Error ? ppErr.message : ppErr);
    }

    const stickerUri = await saveBase64ToFile(base64Data, mimeType);
    console.log("[BackgroundRemoval] Sticker saved:", stickerUri);

    return { success: true, stickerUri };
  } catch (error) {
    console.log("[BackgroundRemoval] Skipping (will use original):", error instanceof Error ? error.message : "Unknown");
    return {
      success: false,
      error: "Background removal unavailable",
    };
  }
}

export async function processClothingImage(imageUri: string): Promise<{
  stickerUri: string | null;
  originalUri: string;
}> {
  const result = await removeBackground(imageUri);

  return {
    stickerUri: result.success ? result.stickerUri ?? null : imageUri,
    originalUri: imageUri,
  };
}

export async function removeBackgroundWithRetry(
  imageUri: string,
  onProgress?: (message: string) => void,
  isGarmentOnly: boolean = true
): Promise<BackgroundRemovalResult> {
  onProgress?.("Removing background (pass 1)...");
  
  const firstPassResult = await removeBackground(imageUri, isGarmentOnly);

  if (firstPassResult.success && firstPassResult.stickerUri) {
    console.log("[BackgroundRemoval] First pass successful");
    return firstPassResult;
  }

  console.log("[BackgroundRemoval] First pass failed, trying refined pass...");
  onProgress?.("Refining edges (pass 2)...");

  await new Promise((resolve) => setTimeout(resolve, 500));

  const secondPassResult = await removeBackground(imageUri, isGarmentOnly);

  if (secondPassResult.success && secondPassResult.stickerUri) {
    console.log("[BackgroundRemoval] Second pass successful");
    return secondPassResult;
  }

  console.log("[BackgroundRemoval] Both passes failed");
  return {
    success: false,
    error: "Could not isolate clothing item after multiple attempts",
  };
}