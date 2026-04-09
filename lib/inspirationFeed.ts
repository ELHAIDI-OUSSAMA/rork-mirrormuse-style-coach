import { Image } from 'expo-image';
import { fetchInspirationFeed } from '@/lib/inspirationProvider';
import { InspirationCard } from '@/types/inspiration';

type FeedResponse = {
  items: InspirationCard[];
  nextCursor?: string;
};

function inferOccasion(tags?: string[]) {
  if (!tags || tags.length === 0) return undefined;
  const lower = tags.map((t) => t.toLowerCase());
  if (lower.some((t) => t.includes('work') || t.includes('office'))) return 'Work';
  if (lower.some((t) => t.includes('date'))) return 'Date';
  if (lower.some((t) => t.includes('formal') || t.includes('old money'))) return 'Formal';
  if (lower.some((t) => t.includes('gym') || t.includes('athleisure'))) return 'Gym';
  return 'Casual';
}

function passesHeuristics(item: {
  width: number;
  height: number;
  styleTags: string[];
  keyPieces: string[];
}) {
  const ratio = item.height / Math.max(item.width, 1);
  const portraitEnough = ratio >= 1.15 && ratio <= 2.3;
  const hasOutfitSignals = item.keyPieces.length >= 2 || item.styleTags.length > 0;
  return portraitEnough && hasOutfitSignals;
}

function optimizeImageUrl(url: string, width: number) {
  if (!url) return url;
  if (url.includes('images.pexels.com')) {
    const base = url.split('?')[0];
    return `${base}?auto=compress&cs=tinysrgb&w=${Math.round(width)}&dpr=1`;
  }
  if (url.includes('images.unsplash.com')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}auto=format&fit=crop&w=${Math.round(width)}&q=80`;
  }
  return url;
}

export async function fetchInspiration(
  gender: 'men' | 'women',
  query?: string,
  cursor?: string,
): Promise<FeedResponse> {
  const page = Number(cursor || '1');
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const items = await fetchInspirationFeed(gender, safePage, query);

  const mapped: InspirationCard[] = items
    .filter((item) => passesHeuristics(item))
    .map((item) => ({
      id: item.id,
      source: 'fallback',
      imageUrl: optimizeImageUrl(item.imageUrl, 960),
      thumbnailUrl: optimizeImageUrl(item.thumbnailUrl || item.imageUrl, 420),
      linkUrl: item.sourceUrl,
      title: item.styleTags?.[0] ? `${item.styleTags[0]} look` : 'Outfit inspiration',
      gender,
      tags: item.styleTags,
      occasion: inferOccasion(item.styleTags),
      palette: item.colorPalette,
    }));

  return {
    items: mapped.slice(0, 12),
    nextCursor: String(safePage + 1),
  };
}

export async function prefetchInspirationImages(items: InspirationCard[], fromIndex: number) {
  const urls = items
    .slice(fromIndex, fromIndex + 3)
    .map((item) => item.imageUrl)
    .filter(Boolean);
  if (urls.length === 0) return;
  await Promise.allSettled(urls.map((url) => Image.prefetch(url)));
}
