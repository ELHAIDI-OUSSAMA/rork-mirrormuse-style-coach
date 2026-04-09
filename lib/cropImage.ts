import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const IMAGE_EDIT_URL = 'https://toolkit.rork.com/images/edit/';

export interface NormalizedBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export async function imageToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1] || '');
      };
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(blob);
    });
  }
  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function saveBase64ToFile(base64Data: string, mimeType: string): Promise<string> {
  const safeMime = mimeType || 'image/png';
  if (Platform.OS === 'web') {
    return `data:${safeMime};base64,${base64Data}`;
  }
  const ext = safeMime.includes('png')
    ? 'png'
    : safeMime.includes('jpg') || safeMime.includes('jpeg')
      ? 'jpg'
      : 'png';
  const stickersDir = `${FileSystem.documentDirectory}stickers`;
  const dirInfo = await FileSystem.getInfoAsync(stickersDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(stickersDir, { intermediates: true });
  }
  const fileUri = `${stickersDir}/crop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  await FileSystem.writeAsStringAsync(fileUri, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return fileUri;
}

function extractImagePayload(result: any): { base64Data: string; mimeType: string } {
  if (result?.image?.base64Data) {
    return { base64Data: result.image.base64Data, mimeType: result.image.mimeType || 'image/png' };
  }
  if (Array.isArray(result?.images) && result.images[0]?.base64Data) {
    return { base64Data: result.images[0].base64Data, mimeType: result.images[0].mimeType || 'image/png' };
  }
  if (result?.data?.image?.base64Data) {
    return { base64Data: result.data.image.base64Data, mimeType: result.data.image.mimeType || 'image/png' };
  }
  throw new Error('No image payload returned from crop API');
}

async function editImage(prompt: string, imageUri: string): Promise<string> {
  const base64Image = await imageToBase64(imageUri);
  const response = await fetch(IMAGE_EDIT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      prompt,
      images: [{ type: 'image', image: base64Image }],
    }),
  });
  if (!response.ok) {
    throw new Error(`Image edit failed (${response.status})`);
  }
  const payload = await response.json();
  const { base64Data, mimeType } = extractImagePayload(payload);
  return saveBase64ToFile(base64Data, mimeType);
}

export async function cropByBBox(imageUri: string, bbox: NormalizedBBox, padding = 0.14): Promise<string> {
  const x = clamp01(bbox.x - padding * 0.5);
  const y = clamp01(bbox.y - padding * 0.5);
  const width = clamp01(Math.min(1 - x, bbox.width + padding));
  const height = clamp01(Math.min(1 - y, bbox.height + padding));

  const prompt = `Crop this image strictly to this normalized bounding box with light padding:
x=${x.toFixed(3)}, y=${y.toFixed(3)}, width=${width.toFixed(3)}, height=${height.toFixed(3)}.
Return only the cropped image content.`;
  return editImage(prompt, imageUri);
}

export async function cropScreenshotChrome(imageUri: string, topPct: number, bottomPct: number): Promise<string> {
  const top = clamp01(topPct);
  const bottom = clamp01(bottomPct);
  const y = top;
  const height = clamp01(1 - top - bottom);
  if (height < 0.4) {
    return imageUri;
  }
  const prompt = `This may be a screenshot with UI overlays.
Crop the image to remove top/bottom app chrome while preserving the outfit and especially shoes.
Use normalized crop:
x=0.000, y=${y.toFixed(3)}, width=1.000, height=${height.toFixed(3)}.
If this crop would cut shoes, keep more bottom area and prioritize outfit visibility.`;
  try {
    return await editImage(prompt, imageUri);
  } catch (error) {
    console.log('[CropImage] screenshot crop failed, using original:', error);
    return imageUri;
  }
}
