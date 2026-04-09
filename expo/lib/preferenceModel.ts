import AsyncStorage from '@react-native-async-storage/async-storage';
import { InspirationItem } from '@/types/inspiration';

export type UserStyleProfile = {
  topVibes: Record<string, number>;
  topOccasions: Record<string, number>;
  topSeasons: Record<string, number>;
  updatedAt: string;
};

export type TopPreferences = {
  topVibes: string[];
  topOccasion: string | null;
  topSeason: string | null;
};

const STYLE_PROFILE_KEY = 'mirrormuse_style_profile';
const DECAY_FACTOR = 0.995;

const EMPTY_PROFILE: UserStyleProfile = {
  topVibes: {},
  topOccasions: {},
  topSeasons: {},
  updatedAt: new Date(0).toISOString(),
};

function applyDecay(weights: Record<string, number>): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [key, value] of Object.entries(weights)) {
    const decayed = Math.max(0, Number((value * DECAY_FACTOR).toFixed(3)));
    if (decayed > 0) {
      next[key] = decayed;
    }
  }
  return next;
}

function adjustWeight(weights: Record<string, number>, key: string, delta: number) {
  const normalized = key.trim().toLowerCase();
  if (!normalized) return;
  const next = Math.max(0, Number(((weights[normalized] || 0) + delta).toFixed(3)));
  if (next === 0) {
    delete weights[normalized];
    return;
  }
  weights[normalized] = next;
}

async function writeProfile(profile: UserStyleProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(STYLE_PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.log('[PreferenceModel] Failed to persist style profile:', error);
  }
}

export async function getUserStyleProfile(): Promise<UserStyleProfile> {
  try {
    const raw = await AsyncStorage.getItem(STYLE_PROFILE_KEY);
    if (!raw) return EMPTY_PROFILE;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return EMPTY_PROFILE;
    return {
      topVibes: typeof parsed.topVibes === 'object' && parsed.topVibes ? parsed.topVibes : {},
      topOccasions: typeof parsed.topOccasions === 'object' && parsed.topOccasions ? parsed.topOccasions : {},
      topSeasons: typeof parsed.topSeasons === 'object' && parsed.topSeasons ? parsed.topSeasons : {},
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : EMPTY_PROFILE.updatedAt,
    };
  } catch (error) {
    console.log('[PreferenceModel] Failed to read style profile:', error);
    return EMPTY_PROFILE;
  }
}

async function mutateProfile(
  pin: InspirationItem,
  deltas: { vibe: number; occasion: number; season: number },
  applyProfileDecay: boolean
): Promise<UserStyleProfile> {
  const current = await getUserStyleProfile();
  const next: UserStyleProfile = {
    topVibes: applyProfileDecay ? applyDecay(current.topVibes) : { ...current.topVibes },
    topOccasions: applyProfileDecay ? applyDecay(current.topOccasions) : { ...current.topOccasions },
    topSeasons: applyProfileDecay ? applyDecay(current.topSeasons) : { ...current.topSeasons },
    updatedAt: new Date().toISOString(),
  };

  for (const tag of pin.vibeTags) {
    adjustWeight(next.topVibes, tag, deltas.vibe);
  }
  adjustWeight(next.topOccasions, pin.occasion, deltas.occasion);
  adjustWeight(next.topSeasons, pin.season, deltas.season);

  await writeProfile(next);
  return next;
}

export async function updatePreferencesFromLike(pin: InspirationItem): Promise<UserStyleProfile> {
  return mutateProfile(pin, { vibe: 2, occasion: 1, season: 1 }, true);
}

export async function updatePreferencesFromUnlike(pin: InspirationItem): Promise<UserStyleProfile> {
  return mutateProfile(pin, { vibe: -2, occasion: -1, season: -1 }, false);
}

function getTopKeys(weights: Record<string, number>, count: number): string[] {
  return Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => key);
}

export function getTopPreferences(profile: UserStyleProfile): TopPreferences {
  return {
    topVibes: getTopKeys(profile.topVibes, 3),
    topOccasion: getTopKeys(profile.topOccasions, 1)[0] ?? null,
    topSeason: getTopKeys(profile.topSeasons, 1)[0] ?? null,
  };
}

export function buildPersonalizationContext(profile: UserStyleProfile): string {
  const prefs = getTopPreferences(profile);
  if (prefs.topVibes.length === 0 && !prefs.topOccasion && !prefs.topSeason) {
    return 'No strong learned style preferences yet.';
  }

  return [
    'User style preferences based on likes:',
    `- Top vibes: ${prefs.topVibes.length ? prefs.topVibes.join(', ') : 'Not enough data'}`,
    `- Occasion tendency: ${prefs.topOccasion ?? 'Not enough data'}`,
    `- Season tendency: ${prefs.topSeason ?? 'Not enough data'}`,
  ].join('\n');
}
