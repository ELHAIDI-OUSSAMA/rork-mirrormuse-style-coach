import { TopPreferences } from '@/lib/preferenceModel';
import { seededShuffle } from '@/lib/shuffle';
import { InspirationItem } from '@/types/inspiration';

function scoreItem(item: InspirationItem, prefs: TopPreferences): number {
  const normalizedTags = item.vibeTags.map((tag) => tag.trim().toLowerCase());
  let score = 0;

  for (const vibe of prefs.topVibes) {
    if (normalizedTags.includes(vibe.trim().toLowerCase())) {
      score += 3;
    }
  }

  if (prefs.topOccasion && item.occasion === prefs.topOccasion) {
    score += 2;
  }

  if (prefs.topSeason && item.season === prefs.topSeason) {
    score += 1;
  }

  return score;
}

export function rankAndShuffleInspiration(
  items: InspirationItem[],
  prefs: TopPreferences,
  seed: string
): InspirationItem[] {
  const buckets = new Map<number, InspirationItem[]>();

  for (const item of items) {
    const score = scoreItem(item, prefs);
    const bucket = buckets.get(score) ?? [];
    bucket.push(item);
    buckets.set(score, bucket);
  }

  const orderedScores = [...buckets.keys()].sort((a, b) => b - a);
  const ranked: InspirationItem[] = [];

  for (const score of orderedScores) {
    const bucket = buckets.get(score) ?? [];
    ranked.push(...seededShuffle(bucket, `${seed}:score:${score}`));
  }

  return ranked;
}
