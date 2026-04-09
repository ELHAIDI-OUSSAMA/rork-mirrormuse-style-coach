import { z } from 'zod';
import menSeed from '../assets/data/pinterest_seed_men.json';
import womenSeed from '../assets/data/pinterest_seed_women.json';
import { Gender, InspirationItem } from '@/types/inspiration';

const SeedItemSchema = z.object({
  id: z.string().min(1),
  gender: z.enum(['men', 'women']),
  imageUrl: z.string().url(),
  pinUrl: z.string().url(),
  vibeTags: z.array(z.string()).min(1),
  season: z.enum(['summer', 'winter', 'spring', 'fall', 'all']),
  occasion: z.enum(['casual', 'work', 'date', 'streetwear', 'formal', 'athletic', 'travel', 'party']),
  createdAt: z.string().min(1),
  source: z.literal('pinterest_seed'),
});

const SeedArraySchema = z.array(SeedItemSchema);

const rawByGender: Record<Gender, unknown[]> = {
  men: menSeed as unknown[],
  women: womenSeed as unknown[],
};

const memoryCache: Partial<Record<Gender, InspirationItem[]>> = {};

function validateSeedItems(items: unknown[], gender: Gender): InspirationItem[] {
  const parsed = SeedArraySchema.safeParse(items);
  if (parsed.success) {
    return parsed.data.filter((item) => item.gender === gender);
  }

  console.log('[InspirationSeed] Validation issues detected, skipping invalid entries');
  const valid: InspirationItem[] = [];
  for (const candidate of items) {
    const single = SeedItemSchema.safeParse(candidate);
    if (!single.success) continue;
    if (!single.data.imageUrl || !single.data.pinUrl) continue;
    if (single.data.gender !== gender) continue;
    valid.push(single.data);
  }
  return valid;
}

export function loadSeedDataset(gender: Gender): InspirationItem[] {
  if (memoryCache[gender]) {
    return memoryCache[gender]!;
  }

  const validated = validateSeedItems(rawByGender[gender], gender);
  const deduped: InspirationItem[] = [];
  const seenPinUrls = new Set<string>();

  for (const item of validated) {
    if (seenPinUrls.has(item.pinUrl)) continue;
    seenPinUrls.add(item.pinUrl);
    deduped.push(item);
  }

  memoryCache[gender] = deduped;
  return deduped;
}

