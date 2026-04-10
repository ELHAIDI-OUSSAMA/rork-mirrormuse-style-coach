export type Gender = 'men' | 'women';
export type Season = 'summer' | 'winter' | 'spring' | 'fall' | 'all';
export type Occasion = 'casual' | 'work' | 'date' | 'streetwear' | 'formal' | 'athletic' | 'travel' | 'party';

export type InspirationItem = {
  id: string;
  gender: Gender;
  imageUrl: string;
  pinUrl: string;
  vibeTags: string[];
  season: Season;
  occasion: Occasion;
  createdAt: string;
  source: 'pinterest_seed';
};

export type PinFeedback = {
  id: string;
  pinUrl: string;
  imageUrl: string;
  gender: Gender;
  tags?: string[];
  likedAt?: string;
  savedAt?: string;
};

export type InspirationCard = InspirationItem;
export type SwipeAction = 'like' | 'dislike' | 'save' | 'similar';

export type SwipeEvent = {
  cardId: string;
  action: SwipeAction;
  ts: string;
  gender: Gender;
  tags?: string[];
};

export type InspirationCalibration = {
  isCalibrated: boolean;
  swipesToCalibrate: number;
  progress: number;
};

export type InspirationPersistentState = {
  gender: Gender;
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
