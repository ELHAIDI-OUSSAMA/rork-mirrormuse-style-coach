import * as FileSystem from 'expo-file-system/legacy';
import { ClosetItem } from '@/types';

async function ensureDir(path: string) {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

async function persistDataUri(dataUri: string, prefix: string): Promise<string> {
  const [, meta, payload] = dataUri.match(/^data:(.*?);base64,(.*)$/) || [];
  const ext = meta?.includes('png') ? 'png' : 'jpg';
  const baseDir = `${FileSystem.documentDirectory}stickers`;
  await ensureDir(baseDir);
  const uri = `${baseDir}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await FileSystem.writeAsStringAsync(uri, payload || '', {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}

export async function migrateClosetStorage(items: ClosetItem[]): Promise<{ items: ClosetItem[]; changed: boolean }> {
  let changed = false;
  const next: ClosetItem[] = [];
  const oldCacheDir = `${FileSystem.cacheDirectory}stickers`;
  const persistentDir = `${FileSystem.documentDirectory}stickers`;

  await ensureDir(persistentDir);

  const migrateUriToPersistent = async (uri?: string, prefix?: string): Promise<string | undefined> => {
    if (!uri) return uri;
    if (!uri.startsWith(oldCacheDir)) return uri;

    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      // Cache file was purged by OS. Keep URI as-is for now; caller may still have fallback image.
      return uri;
    }

    const extMatch = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    const ext = extMatch?.[1] || 'png';
    const dest = `${persistentDir}/${prefix || 'sticker'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    changed = true;
    return dest;
  };

  for (const item of items) {
    const clone = { ...item };

    if (clone.imageUri?.startsWith('data:image/')) {
      clone.imageUri = await persistDataUri(clone.imageUri, 'image');
      changed = true;
    }
    if (clone.stickerPngUri?.startsWith('data:image/')) {
      clone.stickerPngUri = await persistDataUri(clone.stickerPngUri, 'sticker');
      changed = true;
    }

    clone.imageUri = await migrateUriToPersistent(clone.imageUri, 'image');
    clone.stickerPngUri = await migrateUriToPersistent(clone.stickerPngUri, 'sticker');

    next.push(clone);
  }

  return { items: next, changed };
}

export async function cleanupOrphanStickerFiles(items: ClosetItem[]) {
  const dir = `${FileSystem.documentDirectory}stickers`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists || !info.isDirectory) return;

  const active = new Set(
    items
      .flatMap((item) => [item.imageUri, item.stickerPngUri])
      .filter((uri): uri is string => typeof uri === 'string' && uri.startsWith(dir))
  );

  const entries = await FileSystem.readDirectoryAsync(dir);
  await Promise.all(
    entries.map(async (name) => {
      const uri = `${dir}/${name}`;
      if (active.has(uri)) return;
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch {
        // ignore cleanup failures
      }
    })
  );
}
