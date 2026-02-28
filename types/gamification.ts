export interface ScoreDayEntry {
  date: string; // YYYY-MM-DD
  score10: number;
}

export interface GamificationState {
  xp: number;
  level: number;
  streak: {
    current: number;
    best: number;
    lastCheckDate: string | null; // YYYY-MM-DD
  };
  badges: string[];
  stats: {
    outfitChecksCount: number;
    outfitsBuiltCount: number;
    closetItemsAddedCount: number;
    avgScore7d: number | null;
    last7dScores: ScoreDayEntry[];
  };
  lastAwarded: {
    lastXpAwardDate: string | null; // first daily outfit-check bonus date
    closetItemsXpDate: string | null;
    closetItemsXpCount: number;
    outfitSavedXpDate: string | null;
    outfitSavedXpCount: number;
    awardedAnalysisIds: string[];
  };
}

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  iconName:
    | 'CalendarCheck2'
    | 'Flame'
    | 'Shield'
    | 'Shirt'
    | 'LayoutGrid'
    | 'Briefcase'
    | 'Star'
    | 'Compass';
}

export interface WardrobeCoverageItem {
  key: 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories';
  label: string;
  count: number;
  target: number;
  coveragePct: number;
}

export interface WardrobeCoverageMap {
  categories: WardrobeCoverageItem[];
  overallCoveragePct: number;
  missingNext: string | null;
}

export interface XpProgress {
  current: number;
  needed: number;
  pct: number;
}

