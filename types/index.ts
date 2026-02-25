export type Gender = 'female' | 'male';

export type StyleVibe = 
  | 'Clean Girl'
  | 'Streetwear'
  | 'Soft Girl'
  | 'Minimal'
  | 'Modest'
  | 'Glam'
  | 'Office'
  | 'Athleisure'
  | 'Old Money'
  | 'Business Casual'
  | 'Formal'
  | 'Smart Casual'
  | 'Casual';

export type Occasion = 
  | 'Work'
  | 'School'
  | 'Date'
  | 'Gym'
  | 'Party'
  | 'Casual'
  | 'Brunch'
  | 'Travel';

export type PlanningOccasion = Occasion | 'Custom';

export type ModestyLevel = 'Low' | 'Medium' | 'High';
export type BudgetLevel = '$' | '$$' | '$$$';
export type TonePreference = 'Gentle' | 'Blunt';

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy';

export type ClothingCategory =
  | 'T-shirt'
  | 'Shirt'
  | 'Hoodie'
  | 'Sweater'
  | 'Jacket'
  | 'Blazer'
  | 'Coat'
  | 'Jeans'
  | 'Pants'
  | 'Shorts'
  | 'Dress'
  | 'Skirt'
  | 'Suit'
  | 'Sneakers'
  | 'Shoes'
  | 'Boots'
  | 'Bag'
  | 'Belt'
  | 'Watch'
  | 'Accessory';

export interface ClosetItemPosition {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export type ProcessingStatus = 'queued' | 'processing' | 'done' | 'failed';
export type ProcessingStep = 'adding' | 'scanning' | 'removing_bg' | 'creating_sticker' | 'finalizing';

export interface ClosetItem {
  id: string;
  userId?: string;
  imageUri: string;
  stickerPngUri?: string;
  category: ClothingCategory;
  color: string;
  styleTags: string[];
  createdAt: string;
  source: 'manual' | 'auto_extracted';
  position?: ClosetItemPosition;
  usageCount: number;
  lastUsedAt?: string;
  outlineEnabled?: boolean;
  isProcessing?: boolean;
  processingStatus?: ProcessingStatus;
  processingStep?: ProcessingStep;
  processingError?: string;
}

export type ClothingRegion = 'upper_outer' | 'upper_inner' | 'lower' | 'feet' | 'accessory';

export type ClothingSubcategory = 
  | 'Jacket' | 'Coat' | 'Blazer' | 'Overshirt'
  | 'Sweater' | 'T-shirt' | 'Shirt' | 'Hoodie'
  | 'Pants' | 'Jeans' | 'Shorts'
  | 'Sneakers' | 'Loafers' | 'Boots' | 'Shoes'
  | 'Belt' | 'Bag' | 'Watch';

export interface DetectedClothingItem {
  category: 'Outerwear' | 'Top' | 'Bottom' | 'Footwear' | 'Accessory';
  subcategory: ClothingSubcategory;
  color: string;
  confidence: number;
  visibility: 'visible' | 'partial' | 'not_visible';
  region: ClothingRegion;
  evidence: string;
  bbox?: { x: number; y: number; w: number; h: number };
}

export interface UserPreferences {
  gender?: Gender;
  vibes: StyleVibe[];
  occasions: Occasion[];
  modestyLevel: ModestyLevel;
  budgetLevel: BudgetLevel;
  tone: TonePreference;
  onboardingComplete: boolean;
}

export interface NotificationSettings {
  dailySuggestionEnabled: boolean;
  weatherAlertsEnabled: boolean;
  closetAlertsEnabled: boolean;
  inspirationAlertsEnabled: boolean;
}

export interface AlternativeLook {
  title: string;
  items: string[];
  whyItWorks: string;
}

export interface AnalysisResult {
  summary: string;
  fitScore: number;
  vibeTags: string[];
  quickFixes: string[];
  upgrades: string[];
  alternativeLooks: AlternativeLook[];
  avoid: string[];
  confidenceNote: string;
  detectedClothingItems: DetectedClothingItem[];
  closetRecommendations: string[];
}

export interface LookAnalysis {
  id: string;
  imageUri: string;
  createdAt: string;
  occasion: Occasion;
  vibe: StyleVibe;
  results: AnalysisResult;
}

export interface User {
  id: string;
  email?: string;
  isGuest: boolean;
  createdAt: string;
  preferences: UserPreferences;
}

export interface InspirationItem {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  source: 'pexels' | 'unsplash';
  author: string;
  authorUrl: string;
  sourceUrl: string;
  styleTags: string[];
  keyPieces: string[];
  colorPalette: string[];
  genderTarget: 'men' | 'women' | 'neutral';
  query: string;
  aiDetectedPieces?: string[];
}

export interface SavedInspiration {
  id: string;
  inspirationId: string;
  imageUrl: string;
  thumbnailUrl: string;
  source: 'pexels' | 'unsplash';
  author: string;
  styleTags: string[];
  savedAt: string;
}

export interface WeatherSnapshot {
  temperature: number;
  condition: WeatherCondition;
  rainProbability: number;
  date: string;
  location?: string;
}

export interface PlannedOutfitItem {
  closetItemId: string;
  category: ClothingCategory;
  color: string;
  imageUri: string;
}

export interface PlannedOutfit {
  id: string;
  date: string;
  occasion: PlanningOccasion;
  customOccasion?: string;
  weather?: WeatherSnapshot;
  items: PlannedOutfitItem[];
  confidenceScore: number;
  whyItWorks: string;
  createdAt: string;
}

export interface OutfitCombination {
  id: string;
  items: PlannedOutfitItem[];
  confidenceScore: number;
  occasionTags: Occasion[];
  whyItWorks: string;
  createdAt: string;
}

export interface StickerPlacement {
  closetItemId: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex: number;
}

export interface ComposedOutfit {
  id: string;
  name?: string;
  stickers: StickerPlacement[];
  createdAt: string;
  updatedAt: string;
  aiReview?: OutfitAIReview;
}

export interface SwapSuggestion {
  reason: string;
  replace: string;
  withCategory: string;
  closetMatches: string[];
}

export interface OutfitAIReview {
  overallScore: number;
  summary: string;
  whatWorks: string[];
  improvements: string[];
  missingPieceSuggestions: string[];
  swapFromClosetSuggestions: SwapSuggestion[];
  styleDirection: string[];
  occasionFit: {
    bestOccasions: string[];
    avoidOccasions: string[];
  };
  analyzedAt: string;
}

export interface MissingPieceItem {
  item: string;
  category: ClothingCategory;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface MissingPiecesAnalysis {
  missingItems: MissingPieceItem[];
  analyzedAt: string;
}

export interface RecreatedOutfit {
  id: string;
  inspirationId: string;
  inspirationImageUrl: string;
  matchedItems: PlannedOutfitItem[];
  missingItems: string[];
  confidenceScore: number;
  createdAt: string;
}

export interface ClosetInsights {
  mostWornItem?: ClosetItem;
  leastUsedItem?: ClosetItem;
  recommendedItemToday?: ClosetItem;
  totalItems: number;
  categoryCounts: Record<string, number>;
}

export interface SavedPinterestPin {
  id: string;
  pinUrl: string;
  queryUsed: string;
  savedAt: string;
  source: 'pinterest';
}

export interface CreatorSettings {
  enabled: boolean;
}

export const FEMALE_STYLE_VIBES: StyleVibe[] = [
  'Clean Girl',
  'Streetwear',
  'Soft Girl',
  'Minimal',
  'Modest',
  'Glam',
  'Office',
  'Athleisure',
];

export const MALE_STYLE_VIBES: StyleVibe[] = [
  'Minimal',
  'Streetwear',
  'Old Money',
  'Casual',
  'Business Casual',
  'Formal',
  'Athleisure',
  'Smart Casual',
];

export const STYLE_VIBES: StyleVibe[] = [
  'Clean Girl',
  'Streetwear',
  'Soft Girl',
  'Minimal',
  'Modest',
  'Glam',
  'Office',
  'Athleisure',
];

export const OCCASIONS: Occasion[] = [
  'Work',
  'School',
  'Date',
  'Gym',
  'Party',
  'Casual',
  'Brunch',
  'Travel',
];

export const PLANNING_OCCASIONS: PlanningOccasion[] = [
  'Casual',
  'Work',
  'Date',
  'Party',
  'Gym',
  'Travel',
  'Custom',
];

export const CLOTHING_CATEGORIES: ClothingCategory[] = [
  'T-shirt',
  'Shirt',
  'Hoodie',
  'Sweater',
  'Jacket',
  'Blazer',
  'Coat',
  'Jeans',
  'Pants',
  'Shorts',
  'Dress',
  'Skirt',
  'Suit',
  'Sneakers',
  'Shoes',
  'Boots',
  'Bag',
  'Belt',
  'Watch',
  'Accessory',
];

export const MODESTY_LEVELS: ModestyLevel[] = ['Low', 'Medium', 'High'];
export const BUDGET_LEVELS: BudgetLevel[] = ['$', '$$', '$$$'];
export const TONE_PREFERENCES: TonePreference[] = ['Gentle', 'Blunt'];
