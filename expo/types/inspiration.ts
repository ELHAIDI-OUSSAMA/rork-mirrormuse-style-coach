export type InspirationSource = 'pinterest' | 'fallback';
export type SwipeAction = 'like' | 'dislike' | 'save' | 'similar';

export type InspirationCard = {
  id: string;
  source: InspirationSource;
  imageUrl: string;
  thumbnailUrl?: string;
  linkUrl?: string;
  title?: string;
  gender: 'men' | 'women';
  tags?: string[];
  occasion?: string;
  palette?: string[];
};

export type SwipeEvent = {
  cardId: string;
  action: SwipeAction;
  ts: string;
  gender: 'men' | 'women';
  tags?: string[];
};

export type InspirationCalibration = {
  isCalibrated: boolean;
  swipesToCalibrate: number;
  progress: number;
};

export type InspirationPersistentState = {
  gender: 'men' | 'women';
  likes: string[];
  saves: string[];
  tagWeights: Record<string, number>;
  isCalibrated: boolean;
  swipesToCalibrate: number;
  progress: number;
  lastFetchTs: string | null;
};

export const DEFAULT_INSPIRE_CALIBRATION: InspirationCalibration = {
  isCalibrated: false,
  swipesToCalibrate: 20,
  progress: 0,
};

export const DEFAULT_INSPIRE_STATE: InspirationPersistentState = {
  gender: 'women',
  likes: [],
  saves: [],
  tagWeights: {},
  isCalibrated: false,
  swipesToCalibrate: 20,
  progress: 0,
  lastFetchTs: null,
};
