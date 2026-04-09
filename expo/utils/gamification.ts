import { ClosetItem } from '@/types';
import {
  BadgeDefinition,
  GamificationState,
  ScoreDayEntry,
  WardrobeCoverageMap,
  XpProgress,
} from '@/types/gamification';

export const GAMIFICATION_STORAGE_KEY = 'mirrormuse_gamification_v1';
const MAX_AWARDED_ANALYSIS_IDS = 10;
const MAX_LAST_7D_SCORES = 7;

const XP_OUTFIT_CHECK = 10;
const XP_DAILY_FIRST_CHECK_BONUS = 5;
const XP_PER_CLOSET_ITEM = 3;
const XP_CLOSET_DAILY_CAP = 15; // xp
const XP_OUTFIT_SAVE = 8;
const XP_OUTFIT_SAVE_DAILY_CAP = 24; // xp

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'streak_3', title: 'Consistent', description: 'Maintain a 3-day check streak', iconName: 'CalendarCheck2' },
  { id: 'streak_7', title: 'Dedicated', description: 'Maintain a 7-day check streak', iconName: 'Flame' },
  { id: 'streak_30', title: 'Unbreakable', description: 'Maintain a 30-day check streak', iconName: 'Shield' },
  { id: 'closet_top_100', title: 'Curated Tops', description: 'Complete Tops coverage', iconName: 'Shirt' },
  { id: 'closet_all_60', title: 'Wardrobe Builder', description: 'Reach 60% overall wardrobe coverage', iconName: 'LayoutGrid' },
  { id: 'closet_all_100', title: 'Wardrobe Curator', description: 'Reach full wardrobe coverage', iconName: 'Briefcase' },
  { id: 'score_90_week', title: 'High Standards', description: 'Maintain 9.0+ average over 7 days', iconName: 'Star' },
  { id: 'diversity_starter', title: 'Explorer', description: 'Add at least 10 closet items', iconName: 'Compass' },
];

export const DEFAULT_GAMIFICATION_STATE: GamificationState = {
  xp: 0,
  level: 1,
  streak: {
    current: 0,
    best: 0,
    lastCheckDate: null,
  },
  badges: [],
  stats: {
    outfitChecksCount: 0,
    outfitsBuiltCount: 0,
    closetItemsAddedCount: 0,
    avgScore7d: null,
    last7dScores: [],
  },
  lastAwarded: {
    lastXpAwardDate: null,
    closetItemsXpDate: null,
    closetItemsXpCount: 0,
    outfitSavedXpDate: null,
    outfitSavedXpCount: 0,
    awardedAnalysisIds: [],
  },
};

export function getLocalDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getYesterdayDateString(today = new Date()): string {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return getLocalDateString(yesterday);
}

export function getLevelFromXp(xp: number): number {
  let level = 1;
  let remaining = Math.max(0, Math.floor(xp));
  let neededForLevel = 50;

  while (remaining >= neededForLevel) {
    remaining -= neededForLevel;
    level += 1;
    neededForLevel = 50 + (level - 1) * 25;
  }

  return level;
}

export function getXpProgress(xp: number, level: number): XpProgress {
  let consumed = 0;
  for (let lvl = 1; lvl < level; lvl++) {
    consumed += 50 + (lvl - 1) * 25;
  }
  const needed = 50 + (level - 1) * 25;
  const current = Math.max(0, Math.floor(xp - consumed));
  return {
    current,
    needed,
    pct: needed > 0 ? Math.min(current / needed, 1) : 0,
  };
}

export function normalizeGamificationState(raw: unknown): GamificationState {
  if (!raw || typeof raw !== 'object') return DEFAULT_GAMIFICATION_STATE;
  const input = raw as Partial<GamificationState>;
  const xp = typeof input.xp === 'number' && input.xp >= 0 ? Math.floor(input.xp) : 0;
  const level = getLevelFromXp(xp);
  return {
    xp,
    level,
    streak: {
      current: input.streak?.current ?? 0,
      best: input.streak?.best ?? 0,
      lastCheckDate: input.streak?.lastCheckDate ?? null,
    },
    badges: Array.isArray(input.badges) ? input.badges.slice(0, 32) : [],
    stats: {
      outfitChecksCount: input.stats?.outfitChecksCount ?? 0,
      outfitsBuiltCount: input.stats?.outfitsBuiltCount ?? 0,
      closetItemsAddedCount: input.stats?.closetItemsAddedCount ?? 0,
      avgScore7d: input.stats?.avgScore7d ?? null,
      last7dScores: normalizeLast7dScores(input.stats?.last7dScores),
    },
    lastAwarded: {
      lastXpAwardDate: input.lastAwarded?.lastXpAwardDate ?? null,
      closetItemsXpDate: input.lastAwarded?.closetItemsXpDate ?? null,
      closetItemsXpCount: input.lastAwarded?.closetItemsXpCount ?? 0,
      outfitSavedXpDate: input.lastAwarded?.outfitSavedXpDate ?? null,
      outfitSavedXpCount: input.lastAwarded?.outfitSavedXpCount ?? 0,
      awardedAnalysisIds: Array.isArray(input.lastAwarded?.awardedAnalysisIds)
        ? input.lastAwarded!.awardedAnalysisIds.slice(0, MAX_AWARDED_ANALYSIS_IDS)
        : [],
    },
  };
}

function normalizeLast7dScores(scores: ScoreDayEntry[] | undefined): ScoreDayEntry[] {
  if (!Array.isArray(scores)) return [];
  return scores.slice(0, MAX_LAST_7D_SCORES).map((entry) => ({
    date: entry.date,
    score10: Number(entry.score10.toFixed(1)),
  }));
}

export function unlockBadge(state: GamificationState, badgeId: string): GamificationState {
  if (state.badges.includes(badgeId)) return state;
  return { ...state, badges: [...state.badges, badgeId] };
}

function applyXp(state: GamificationState, delta: number): { next: GamificationState; leveledUp: boolean } {
  if (delta <= 0) return { next: state, leveledUp: false };
  const nextXp = state.xp + delta;
  const nextLevel = getLevelFromXp(nextXp);
  return {
    next: { ...state, xp: nextXp, level: nextLevel },
    leveledUp: nextLevel > state.level,
  };
}

function updateScoreHistory(scores: ScoreDayEntry[], date: string, score10: number): ScoreDayEntry[] {
  const roundedScore = Number(score10.toFixed(1));
  const withoutDate = scores.filter((s) => s.date !== date);
  const next = [{ date, score10: roundedScore }, ...withoutDate];
  return next.slice(0, MAX_LAST_7D_SCORES);
}

export function onOutfitCheckCompleted(
  state: GamificationState,
  score10: number,
  analysisId?: string
): { next: GamificationState; xpGained: number; leveledUp: boolean; newBadges: string[] } {
  const today = getLocalDateString();
  const yesterday = getYesterdayDateString();
  let next = { ...state, stats: { ...state.stats }, streak: { ...state.streak }, lastAwarded: { ...state.lastAwarded } };
  const newBadges: string[] = [];
  let xpGained = 0;

  if (analysisId && next.lastAwarded.awardedAnalysisIds.includes(analysisId)) {
    return { next, xpGained: 0, leveledUp: false, newBadges: [] };
  }

  next.stats.outfitChecksCount += 1;
  next.stats.last7dScores = updateScoreHistory(next.stats.last7dScores, today, score10);
  if (next.stats.last7dScores.length > 0) {
    const avg = next.stats.last7dScores.reduce((sum, s) => sum + s.score10, 0) / next.stats.last7dScores.length;
    next.stats.avgScore7d = Number(avg.toFixed(1));
  }

  if (next.streak.lastCheckDate === null) {
    next.streak.current = 1;
  } else if (next.streak.lastCheckDate === today) {
    next.streak.current = next.streak.current;
  } else if (next.streak.lastCheckDate === yesterday) {
    next.streak.current += 1;
  } else {
    next.streak.current = 1;
  }
  next.streak.best = Math.max(next.streak.best, next.streak.current);
  next.streak.lastCheckDate = today;

  xpGained += XP_OUTFIT_CHECK;
  if (next.lastAwarded.lastXpAwardDate !== today) {
    xpGained += XP_DAILY_FIRST_CHECK_BONUS;
    next.lastAwarded.lastXpAwardDate = today;
  }

  if (analysisId) {
    const ids = [analysisId, ...next.lastAwarded.awardedAnalysisIds.filter((id) => id !== analysisId)];
    next.lastAwarded.awardedAnalysisIds = ids.slice(0, MAX_AWARDED_ANALYSIS_IDS);
  }

  if (next.streak.current >= 3 && !next.badges.includes('streak_3')) newBadges.push('streak_3');
  if (next.streak.current >= 7 && !next.badges.includes('streak_7')) newBadges.push('streak_7');
  if (next.streak.current >= 30 && !next.badges.includes('streak_30')) newBadges.push('streak_30');
  if ((next.stats.avgScore7d ?? 0) >= 9 && !next.badges.includes('score_90_week')) newBadges.push('score_90_week');

  for (const badge of newBadges) {
    next = unlockBadge(next, badge);
  }

  const xpApplied = applyXp(next, xpGained);
  next = xpApplied.next;
  return { next, xpGained, leveledUp: xpApplied.leveledUp, newBadges };
}

export function onClosetItemsAdded(
  state: GamificationState,
  count: number
): { next: GamificationState; xpGained: number; leveledUp: boolean } {
  if (count <= 0) return { next: state, xpGained: 0, leveledUp: false };

  const today = getLocalDateString();
  let next = { ...state, stats: { ...state.stats }, lastAwarded: { ...state.lastAwarded } };
  next.stats.closetItemsAddedCount += count;

  if (next.lastAwarded.closetItemsXpDate !== today) {
    next.lastAwarded.closetItemsXpDate = today;
    next.lastAwarded.closetItemsXpCount = 0;
  }

  const remainingXpBudget = Math.max(0, XP_CLOSET_DAILY_CAP - next.lastAwarded.closetItemsXpCount);
  const requestedXp = count * XP_PER_CLOSET_ITEM;
  const xpGained = Math.min(requestedXp, remainingXpBudget);
  next.lastAwarded.closetItemsXpCount += xpGained;

  const xpApplied = applyXp(next, xpGained);
  return { next: xpApplied.next, xpGained, leveledUp: xpApplied.leveledUp };
}

export function onOutfitSaved(
  state: GamificationState
): { next: GamificationState; xpGained: number; leveledUp: boolean } {
  const today = getLocalDateString();
  let next = { ...state, stats: { ...state.stats }, lastAwarded: { ...state.lastAwarded } };
  next.stats.outfitsBuiltCount += 1;

  if (next.lastAwarded.outfitSavedXpDate !== today) {
    next.lastAwarded.outfitSavedXpDate = today;
    next.lastAwarded.outfitSavedXpCount = 0;
  }

  const remainingXpBudget = Math.max(0, XP_OUTFIT_SAVE_DAILY_CAP - next.lastAwarded.outfitSavedXpCount);
  const xpGained = Math.min(XP_OUTFIT_SAVE, remainingXpBudget);
  next.lastAwarded.outfitSavedXpCount += xpGained;

  const xpApplied = applyXp(next, xpGained);
  return { next: xpApplied.next, xpGained, leveledUp: xpApplied.leveledUp };
}

export function buildWardrobeCoverageMap(closetItems: ClosetItem[]): WardrobeCoverageMap {
  const groups = [
    { key: 'tops' as const, label: 'Tops', target: 8, categories: ['T-shirt', 'Shirt', 'Hoodie', 'Sweater'] },
    { key: 'bottoms' as const, label: 'Bottoms', target: 5, categories: ['Jeans', 'Pants', 'Shorts'] },
    { key: 'outerwear' as const, label: 'Outerwear', target: 4, categories: ['Jacket', 'Blazer', 'Coat'] },
    { key: 'shoes' as const, label: 'Shoes', target: 4, categories: ['Sneakers', 'Shoes', 'Boots'] },
    { key: 'accessories' as const, label: 'Accessories', target: 3, categories: ['Belt', 'Bag', 'Watch'] },
  ];

  const categories = groups.map((group) => {
    const count = closetItems.filter((item) => group.categories.includes(item.category)).length;
    const coveragePct = Math.min(count / group.target, 1);
    return { key: group.key, label: group.label, count, target: group.target, coveragePct };
  });

  const overallCoveragePct =
    categories.reduce((sum, item) => sum + item.coveragePct, 0) / Math.max(categories.length, 1);

  const missingCategory = categories.find((item) => item.coveragePct < 1);
  return {
    categories,
    overallCoveragePct,
    missingNext: missingCategory ? missingCategory.label : null,
  };
}

