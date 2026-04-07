import * as FileSystem from 'expo-file-system/legacy';
import { DetectedClothingItem, ImportedOutfit } from '@/types';
import { detectOutfitItems, auditDetectionCoverage } from '@/lib/outfitDetection';

interface ShareImportPayload {
  sourceUrl: string;
  mediaUrl?: string;
  postUrl?: string;
  thumbnailUrl?: string;
}

function normalize(value?: string): string {
  return (value || '').trim();
}

function hash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

export function getSourceFingerprint(sourceUrl: string): string {
  return `src_${hash(normalize(sourceUrl).toLowerCase())}`;
}

export function inferPlatform(sourceUrl: string): ImportedOutfit['sourcePlatform'] {
  const lower = sourceUrl.toLowerCase();
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('tiktok.com')) return 'tiktok';
  if (lower.includes('pinterest.com') || lower.includes('pin.it')) return 'pinterest';
  if (lower.includes('http://') || lower.includes('https://')) return 'safari';
  return 'other';
}

function looksLikeImageUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp'].some((ext) => lower.includes(ext));
}

function looksLikeLocalImageUri(uri?: string): boolean {
  if (!uri) return false;
  const lower = uri.toLowerCase();
  return lower.startsWith('file://') && ['.jpg', '.jpeg', '.png', '.webp', '.heic'].some((ext) => lower.includes(ext));
}

async function ensureImportDir(): Promise<string> {
  const dir = `${FileSystem.documentDirectory}imports`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  return dir;
}

async function downloadToCache(url: string, fingerprint: string): Promise<string> {
  const dir = await ensureImportDir();
  const output = `${dir}/${fingerprint}-${Date.now()}.jpg`;
  await FileSystem.downloadAsync(url, output);
  return output;
}

function parseOgImage(html: string): string | undefined {
  const og =
    html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
  return og ? og.replace(/&amp;/g, '&') : undefined;
}

async function fetchPreviewImage(payload: ShareImportPayload, fingerprint: string): Promise<string> {
  const mediaUrl = normalize(payload.mediaUrl);
  const thumbnail = normalize(payload.thumbnailUrl);
  const sourceUrl = normalize(payload.sourceUrl);

  if (looksLikeLocalImageUri(mediaUrl)) return mediaUrl;
  if (looksLikeLocalImageUri(thumbnail)) return thumbnail;
  if (looksLikeLocalImageUri(sourceUrl)) return sourceUrl;
  if (looksLikeImageUrl(mediaUrl)) return downloadToCache(mediaUrl, fingerprint);
  if (looksLikeImageUrl(thumbnail)) return downloadToCache(thumbnail, fingerprint);
  if (looksLikeImageUrl(sourceUrl)) return downloadToCache(sourceUrl, fingerprint);

  if (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://')) {
    try {
      const html = await fetch(sourceUrl).then((r) => r.text());
      const ogImage = parseOgImage(html);
      if (ogImage && looksLikeImageUrl(ogImage)) {
        return downloadToCache(ogImage, fingerprint);
      }
    } catch (error) {
      console.log('[ImportedOutfit] preview fetch failed:', error);
    }
  }
  throw new Error('No preview image available from this shared link');
}

export async function importOutfitFromSharedPayload(
  payload: ShareImportPayload
): Promise<ImportedOutfit> {
  const sourceUrl = normalize(payload.sourceUrl);
  if (!sourceUrl) throw new Error('Missing source URL');
  const sourceFingerprint = getSourceFingerprint(sourceUrl);
  const imageUri = await fetchPreviewImage(payload, sourceFingerprint);
  const detected = await detectOutfitItems(imageUri);
  const audited = await auditDetectionCoverage(imageUri, detected);
  const detectedItems: DetectedClothingItem[] = audited.items;
  if (detectedItems.length === 0) {
    throw new Error('We could not extract an outfit from this post. Try another link or upload a screenshot.');
  }

  return {
    id: `imported_outfit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    sourcePlatform: inferPlatform(sourceUrl),
    sourceUrl,
    postUrl: normalize(payload.postUrl) || undefined,
    mediaUrl: normalize(payload.mediaUrl) || undefined,
    thumbnailUri: normalize(payload.thumbnailUrl) || undefined,
    imageUri,
    detectedItems,
    createdAt: new Date().toISOString(),
    sourceFingerprint,
  };
}
