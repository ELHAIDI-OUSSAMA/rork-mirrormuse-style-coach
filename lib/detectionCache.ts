import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DetectedClothingItem } from '@/types';
import { ImageClassificationResult } from '@/lib/imageClassification';

const CACHE_STORAGE_KEY = '@detection_cache_v1';
const MAX_CACHE_ENTRIES = 50;
const FINGERPRINT_SAMPLE_SIZE = 2048;

interface CachedDetection {
  fingerprint: string;
  timestamp: number;
  classification: ImageClassificationResult;
  detectedItems: DetectedClothingItem[];
}

let memoryCache = new Map<string, CachedDetection>();
let loaded = false;

function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

export async function computeImageFingerprint(imageUri: string): Promise<string> {
  try {
    const info = await FileSystem.getInfoAsync(imageUri);
    const fileSize = (info as any).size || 0;

    let sampleHash = '0';
    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = (reader.result as string) || '';
          resolve(b64.slice(0, FINGERPRINT_SAMPLE_SIZE));
        };
        reader.onerror = () => reject(new Error('read failed'));
        reader.readAsDataURL(blob);
      });
      sampleHash = djb2Hash(text);
    } else {
      const b64Full = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const sample = b64Full.slice(0, FINGERPRINT_SAMPLE_SIZE);
      sampleHash = djb2Hash(sample);
    }

    const fp = `fp_${fileSize}_${sampleHash}`;
    return fp;
  } catch (error) {
    console.log('[DetectionCache] fingerprint error, using fallback:', error);
    return `fp_fallback_${Date.now()}`;
  }
}

async function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(CACHE_STORAGE_KEY);
    if (raw) {
      const entries: CachedDetection[] = JSON.parse(raw);
      for (const entry of entries) {
        memoryCache.set(entry.fingerprint, entry);
      }
      console.log(`[DetectionCache] loaded ${entries.length} cached entries`);
    }
  } catch (error) {
    console.log('[DetectionCache] load error:', error);
  }
}

async function persistCache() {
  try {
    const entries = Array.from(memoryCache.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_CACHE_ENTRIES);
    memoryCache = new Map(entries.map(e => [e.fingerprint, e]));
    await AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.log('[DetectionCache] persist error:', error);
  }
}

export async function getCachedDetection(
  fingerprint: string
): Promise<{ classification: ImageClassificationResult; detectedItems: DetectedClothingItem[] } | null> {
  await ensureLoaded();
  const entry = memoryCache.get(fingerprint);
  if (!entry) return null;
  console.log(`[DetectionCache] HIT for ${fingerprint}: ${entry.detectedItems.length} items`);
  return {
    classification: entry.classification,
    detectedItems: entry.detectedItems,
  };
}

export async function setCachedDetection(
  fingerprint: string,
  classification: ImageClassificationResult,
  detectedItems: DetectedClothingItem[]
): Promise<void> {
  await ensureLoaded();
  const entry: CachedDetection = {
    fingerprint,
    timestamp: Date.now(),
    classification,
    detectedItems,
  };
  memoryCache.set(fingerprint, entry);
  console.log(`[DetectionCache] SET for ${fingerprint}: ${detectedItems.length} items`);
  persistCache();
}

export function clearDetectionCache() {
  memoryCache.clear();
  AsyncStorage.removeItem(CACHE_STORAGE_KEY);
  console.log('[DetectionCache] cleared');
}
