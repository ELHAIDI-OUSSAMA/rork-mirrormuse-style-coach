import { 
  AnalysisResult, 
  StyleVibe, 
  Occasion, 
  DetectedClothingItem, 
  ClothingCategory,
  ClosetItem,
  PlannedOutfit,
  PlannedOutfitItem,
  WeatherSnapshot,
  MissingPiecesAnalysis,
  MissingPieceItem,
  OutfitCombination,
  RecreatedOutfit,
  PlanningOccasion,
} from '@/types';

const summaries = [
  "You're serving effortless chic today! The proportions are balanced and the colors work beautifully together.",
  "Love this vibe! There's a great foundation here with just a few tweaks to elevate the look.",
  "This outfit has amazing potential! A few strategic changes will take it from good to stunning.",
  "You've got a strong style instinct showing here. Let's polish it up a bit!",
];

const quickFixesByVibe: Record<StyleVibe, string[]> = {
  'Clean Girl': [
    'Tuck in your top slightly at the front for a more polished silhouette',
    'Roll up sleeves once or twice for an effortless touch',
    'Add a slicked-back hair moment to complete the vibe',
  ],
  'Streetwear': [
    'Try cuffing your pants at the ankle for better sneaker visibility',
    'Layer a simple chain necklace for added edge',
    'Half-tuck for that relaxed-but-intentional look',
  ],
  'Soft Girl': [
    'Add a dainty hair clip or bow for extra sweetness',
    'Try pushing sleeves up slightly for a cozy feel',
    'Consider a light cardigan draped over shoulders',
  ],
  'Minimal': [
    'Ensure all items are pressed and wrinkle-free',
    'Tuck in fully for clean lines',
    'Remove any unnecessary accessories',
  ],
  'Modest': [
    'Layer a structured blazer for added polish',
    'Consider a silk scarf as an elegant accent',
    'Ensure layers sit smoothly without bunching',
  ],
  'Glam': [
    'Add statement earrings if not already wearing',
    'Consider a bold lip color to elevate',
    'Ensure hair is styled to frame your face',
  ],
  'Office': [
    'Add a structured bag for a professional touch',
    'Consider a watch or minimal bracelet',
    'Ensure blouse is fully tucked and smooth',
  ],
  'Athleisure': [
    'Match your sneakers to an accent color in your outfit',
    'Add a baseball cap for street-style edge',
    'Layer with a cropped hoodie or jacket',
  ],
  'Old Money': [
    'Ensure fit is impeccable - no wrinkles or bunching',
    'Add a quality leather belt if not wearing one',
    'Consider a classic watch as the statement piece',
  ],
  'Business Casual': [
    'Roll sleeves neatly to forearm for relaxed professionalism',
    'Add a leather strap watch for polish',
    'Ensure shirt collar is crisp and sitting properly',
  ],
  'Formal': [
    'Check all buttons and adjust tie if applicable',
    'Ensure jacket shoulders align perfectly',
    'Add a pocket square for refined detail',
  ],
  'Smart Casual': [
    'Half-tuck the front of your shirt',
    'Add a quality leather belt',
    'Roll up sleeves for relaxed sophistication',
  ],
  'Casual': [
    'Cuff jeans slightly for cleaner leg line',
    'Layer with a light jacket for dimension',
    'Add minimal accessories - less is more',
  ],
};

const upgradesByBudget: Record<string, string[]> = {
  '$': [
    'Swap basic tee for a ribbed tank in same color family',
    'Add a canvas tote bag from a thrift store',
    'Layer with a vintage oversized button-up',
  ],
  '$$': [
    'Invest in quality basics - a silk cami would elevate this',
    'Consider structured leather accessories',
    'Try a cashmere blend cardigan for luxury feel',
  ],
  '$$$': [
    'A designer belt would anchor this look beautifully',
    'Consider Italian leather loafers for the finishing touch',
    'A structured designer bag would complete the silhouette',
  ],
};

const alternativeLooks = [
  {
    title: 'Elevated Casual',
    items: ['Oversized blazer', 'Fitted ribbed top', 'Wide-leg trousers', 'Loafers'],
    whyItWorks: 'The blazer adds structure while keeping the relaxed vibe you love',
  },
  {
    title: 'Weekend Ready',
    items: ['Cropped cardigan', 'High-waisted jeans', 'White sneakers', 'Mini crossbody bag'],
    whyItWorks: 'Comfortable yet put-together for running errands or brunch',
  },
  {
    title: 'Date Night',
    items: ['Slip midi dress', 'Strappy heels', 'Delicate gold jewelry', 'Clutch bag'],
    whyItWorks: 'Romantic and effortlessly elegant',
  },
];

const avoidItems = [
  'Avoid mixing more than 3 patterns in one outfit',
  'Skip the chunky shoes with this silhouette',
  'Avoid adding more warm tones - the balance is perfect',
];

const vibeTags: Record<Occasion, string[]> = {
  'Work': ['Professional', 'Polished', 'Confident'],
  'School': ['Trendy', 'Comfortable', 'Effortless'],
  'Date': ['Romantic', 'Alluring', 'Put-together'],
  'Gym': ['Sporty', 'Functional', 'Energetic'],
  'Party': ['Bold', 'Statement', 'Fun'],
  'Casual': ['Relaxed', 'Easy', 'Approachable'],
  'Brunch': ['Fresh', 'Chic', 'Social'],
  'Travel': ['Practical', 'Comfortable', 'Versatile'],
};

const clothingDetectionTemplates: DetectedClothingItem[][] = [
  [
    { 
      category: 'Outerwear',
      subcategory: 'Jacket',
      color: 'Black',
      confidence: 0.88,
      visibility: 'visible' as const,
      region: 'upper_outer' as const,
      evidence: 'Black denim jacket visible as outer layer on torso and sleeves',
      bbox: { x: 0.2, y: 0.15, w: 0.6, h: 0.35 }
    },
    { 
      category: 'Top',
      subcategory: 'T-shirt',
      color: 'White',
      confidence: 0.72,
      visibility: 'partial' as const,
      region: 'upper_inner' as const,
      evidence: 'White t-shirt partially visible under jacket at neckline',
      bbox: { x: 0.3, y: 0.18, w: 0.4, h: 0.15 }
    },
    { 
      category: 'Bottom',
      subcategory: 'Jeans',
      color: 'Dark Blue',
      confidence: 0.91,
      visibility: 'visible' as const,
      region: 'lower' as const,
      evidence: 'Dark wash denim jeans clearly visible from waist to ankles',
      bbox: { x: 0.25, y: 0.5, w: 0.5, h: 0.45 }
    },
    { 
      category: 'Footwear',
      subcategory: 'Sneakers',
      color: 'White',
      confidence: 0.85,
      visibility: 'visible' as const,
      region: 'feet' as const,
      evidence: 'White sneakers clearly visible at bottom of frame',
      bbox: { x: 0.2, y: 0.9, w: 0.6, h: 0.1 }
    },
  ],
  [
    { 
      category: 'Outerwear',
      subcategory: 'Blazer',
      color: 'Navy',
      confidence: 0.92,
      visibility: 'visible' as const,
      region: 'upper_outer' as const,
      evidence: 'Navy blazer with structured shoulders and lapels visible',
      bbox: { x: 0.15, y: 0.12, w: 0.7, h: 0.4 }
    },
    { 
      category: 'Top',
      subcategory: 'Shirt',
      color: 'White',
      confidence: 0.88,
      visibility: 'partial' as const,
      region: 'upper_inner' as const,
      evidence: 'White collared shirt visible under blazer',
      bbox: { x: 0.3, y: 0.15, w: 0.4, h: 0.25 }
    },
    { 
      category: 'Bottom',
      subcategory: 'Pants',
      color: 'Gray',
      confidence: 0.86,
      visibility: 'visible' as const,
      region: 'lower' as const,
      evidence: 'Gray dress pants visible from waist down',
      bbox: { x: 0.3, y: 0.52, w: 0.4, h: 0.43 }
    },
    { 
      category: 'Footwear',
      subcategory: 'Loafers',
      color: 'Brown',
      confidence: 0.78,
      visibility: 'visible' as const,
      region: 'feet' as const,
      evidence: 'Brown leather loafers visible at bottom',
      bbox: { x: 0.25, y: 0.92, w: 0.5, h: 0.08 }
    },
    { 
      category: 'Accessory',
      subcategory: 'Belt',
      color: 'Black',
      confidence: 0.68,
      visibility: 'partial' as const,
      region: 'accessory' as const,
      evidence: 'Black leather belt partially visible at waist',
      bbox: { x: 0.35, y: 0.51, w: 0.3, h: 0.02 }
    },
  ],
  [
    { 
      category: 'Top',
      subcategory: 'Sweater',
      color: 'Charcoal',
      confidence: 0.94,
      visibility: 'visible' as const,
      region: 'upper_inner' as const,
      evidence: 'Charcoal gray crewneck sweater clearly visible on upper body',
      bbox: { x: 0.2, y: 0.15, w: 0.6, h: 0.35 }
    },
    { 
      category: 'Bottom',
      subcategory: 'Jeans',
      color: 'Black',
      confidence: 0.89,
      visibility: 'visible' as const,
      region: 'lower' as const,
      evidence: 'Black slim-fit jeans visible from waist to ankles',
      bbox: { x: 0.3, y: 0.5, w: 0.4, h: 0.45 }
    },
    { 
      category: 'Footwear',
      subcategory: 'Boots',
      color: 'Brown',
      confidence: 0.81,
      visibility: 'visible' as const,
      region: 'feet' as const,
      evidence: 'Brown leather boots visible at bottom of frame',
      bbox: { x: 0.25, y: 0.88, w: 0.5, h: 0.12 }
    },
  ],
  [
    { 
      category: 'Outerwear',
      subcategory: 'Coat',
      color: 'Tan',
      confidence: 0.90,
      visibility: 'visible' as const,
      region: 'upper_outer' as const,
      evidence: 'Tan trench coat visible as outer layer with collar and belt',
      bbox: { x: 0.1, y: 0.1, w: 0.8, h: 0.6 }
    },
    { 
      category: 'Top',
      subcategory: 'Hoodie',
      color: 'Gray',
      confidence: 0.65,
      visibility: 'partial' as const,
      region: 'upper_inner' as const,
      evidence: 'Gray hoodie partially visible under coat',
      bbox: { x: 0.3, y: 0.15, w: 0.4, h: 0.2 }
    },
    { 
      category: 'Bottom',
      subcategory: 'Jeans',
      color: 'Blue',
      confidence: 0.83,
      visibility: 'visible' as const,
      region: 'lower' as const,
      evidence: 'Blue denim jeans visible below coat',
      bbox: { x: 0.3, y: 0.65, w: 0.4, h: 0.3 }
    },
    { 
      category: 'Footwear',
      subcategory: 'Sneakers',
      color: 'Black',
      confidence: 0.45,
      visibility: 'not_visible' as const,
      region: 'feet' as const,
      evidence: 'Feet cropped out of frame',
      bbox: { x: 0, y: 0, w: 0, h: 0 }
    },
  ],
  [
    { 
      category: 'Top',
      subcategory: 'T-shirt',
      color: 'White',
      confidence: 0.96,
      visibility: 'visible' as const,
      region: 'upper_inner' as const,
      evidence: 'White crew neck t-shirt clearly visible on torso',
      bbox: { x: 0.25, y: 0.2, w: 0.5, h: 0.3 }
    },
    { 
      category: 'Bottom',
      subcategory: 'Pants',
      color: 'Beige',
      confidence: 0.92,
      visibility: 'visible' as const,
      region: 'lower' as const,
      evidence: 'Beige chino pants visible from waist to ankles',
      bbox: { x: 0.3, y: 0.5, w: 0.4, h: 0.45 }
    },
    { 
      category: 'Footwear',
      subcategory: 'Sneakers',
      color: 'White',
      confidence: 0.87,
      visibility: 'visible' as const,
      region: 'feet' as const,
      evidence: 'White canvas sneakers clearly visible at bottom',
      bbox: { x: 0.25, y: 0.92, w: 0.5, h: 0.08 }
    },
  ],
  [
    { 
      category: 'Outerwear',
      subcategory: 'Jacket',
      color: 'Olive',
      confidence: 0.89,
      visibility: 'visible' as const,
      region: 'upper_outer' as const,
      evidence: 'Olive utility jacket with multiple pockets visible on upper body',
      bbox: { x: 0.15, y: 0.12, w: 0.7, h: 0.4 }
    },
    { 
      category: 'Top',
      subcategory: 'T-shirt',
      color: 'Black',
      confidence: 0.75,
      visibility: 'partial' as const,
      region: 'upper_inner' as const,
      evidence: 'Black t-shirt partially visible beneath jacket',
      bbox: { x: 0.3, y: 0.18, w: 0.4, h: 0.15 }
    },
    { 
      category: 'Bottom',
      subcategory: 'Jeans',
      color: 'Black',
      confidence: 0.93,
      visibility: 'visible' as const,
      region: 'lower' as const,
      evidence: 'Black denim jeans clearly visible on lower body',
      bbox: { x: 0.28, y: 0.52, w: 0.44, h: 0.43 }
    },
    { 
      category: 'Footwear',
      subcategory: 'Boots',
      color: 'Black',
      confidence: 0.82,
      visibility: 'visible' as const,
      region: 'feet' as const,
      evidence: 'Black combat boots visible at bottom of frame',
      bbox: { x: 0.22, y: 0.9, w: 0.56, h: 0.1 }
    },
    { 
      category: 'Accessory',
      subcategory: 'Watch',
      color: 'Silver',
      confidence: 0.62,
      visibility: 'partial' as const,
      region: 'accessory' as const,
      evidence: 'Silver watch partially visible on left wrist',
      bbox: { x: 0.15, y: 0.45, w: 0.05, h: 0.03 }
    },
  ],
];

export function generateMockAnalysis(
  vibe: StyleVibe,
  occasion: Occasion,
  budget: string,
  closetItems?: { category: string; color: string }[],
  options?: {
    seed?: string;
    detectedClothingItems?: DetectedClothingItem[];
  }
): AnalysisResult {
  const seed = options?.seed || `${vibe}-${occasion}-${budget}`;
  const random = createSeededRandom(seed);

  const fallbackTemplate = clothingDetectionTemplates[
    Math.floor(random() * clothingDetectionTemplates.length)
  ];

  const feetVisible = random() > 0.3;
  const outerwearVisible = random() > 0.4;
  const accessoriesVisible = random() > 0.6;

  const fallbackDetectedItems = fallbackTemplate.filter(item => {
    if (item.region === 'feet' && !feetVisible) return false;
    if (item.region === 'upper_outer' && !outerwearVisible) return false;
    if (item.region === 'accessory' && !accessoriesVisible) return false;
    if (item.visibility === 'visible' && item.confidence >= 0.70) return true;
    if (item.visibility === 'partial' && item.confidence >= 0.80) return true;
    return false;
  });

  const detectedClothingItems =
    options?.detectedClothingItems && options.detectedClothingItems.length > 0
      ? options.detectedClothingItems
      : fallbackDetectedItems;

  const fitScore = calculateDeterministicFitScore(detectedClothingItems, random);

  let closetRecommendations: string[] = [];
  if (closetItems && closetItems.length > 0) {
    closetRecommendations = [
      `Try pairing with your ${closetItems[0]?.color} ${closetItems[0]?.category} from your closet`,
      closetItems.length > 1 
        ? `Your ${closetItems[1]?.color} ${closetItems[1]?.category} would also work great here`
        : 'Add more items to your closet for personalized recommendations',
    ];
  } else {
    closetRecommendations = [
      'Add items to your closet to get personalized recommendations',
      'Scan more outfits to build your digital wardrobe',
    ];
  }

  return {
    summary: summaries[Math.floor(random() * summaries.length)],
    fitScore,
    vibeTags: vibeTags[occasion] || ['Stylish', 'Balanced', 'Intentional'],
    quickFixes: quickFixesByVibe[vibe] || quickFixesByVibe['Minimal'],
    upgrades: upgradesByBudget[budget] || upgradesByBudget['$$'],
    alternativeLooks: alternativeLooks.slice(0, 2 + Math.floor(random() * 2)),
    avoid: avoidItems.slice(0, 2),
    confidenceNote: fitScore >= 4
      ? "I can see your full outfit clearly - these suggestions are spot on!"
      : "Some details were harder to read, so confidence is moderate.",
    detectedClothingItems,
    closetRecommendations,
  };
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seedInput: string): () => number {
  let seed = hashString(seedInput || 'default-seed');
  return () => {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function calculateDeterministicFitScore(
  detectedItems: DetectedClothingItem[],
  random: () => number
): number {
  if (!detectedItems || detectedItems.length === 0) {
    return 3;
  }

  const considered = detectedItems.filter(item => item.visibility !== 'not_visible');
  const avgConfidence = considered.length
    ? considered.reduce((sum, item) => sum + item.confidence, 0) / considered.length
    : 0.65;

  const coreRegions = ['upper_inner', 'upper_outer', 'lower', 'feet'];
  const visibleCoreRegions = new Set(
    considered
      .filter(item => coreRegions.includes(item.region))
      .map(item => item.region)
  );

  const coreCoverageScore = clamp(visibleCoreRegions.size / 3, 0, 1);
  const itemCountScore = clamp(considered.length / 4, 0, 1);
  const qualityScore = (avgConfidence * 0.55) + (coreCoverageScore * 0.25) + (itemCountScore * 0.2);
  const deterministicJitter = (random() - 0.5) * 0.3;
  const score = 2.6 + (qualityScore * 2.2) + deterministicJitter;

  return Number(clamp(score, 1, 5).toFixed(1));
}

export const loadingTips = [
  "Analyzing color harmony...",
  "Checking proportions...",
  "Evaluating silhouette...",
  "Matching to your vibe...",
  "Finding styling opportunities...",
  "Detecting clothing items...",
  "Building closet recommendations...",
  "Curating suggestions...",
];

const outfitWhyItWorks: Record<PlanningOccasion, string[]> = {
  'Casual': [
    'Relaxed yet put-together - perfect for everyday activities',
    'Comfortable pieces that still look intentional',
    'Easy layers that work together seamlessly',
  ],
  'Work': [
    'Professional and polished while still showing personality',
    'Smart pieces that command respect',
    'Clean lines and structured silhouette for the office',
  ],
  'Date': [
    'Romantic and confident - you\'ll make a great impression',
    'Flattering pieces that show off your style',
    'Elevated look that\'s still approachable',
  ],
  'Party': [
    'Statement pieces that will turn heads',
    'Fun and bold - perfect for making memories',
    'Eye-catching combination that\'s celebration-ready',
  ],
  'Gym': [
    'Functional and stylish - look good while you work out',
    'Performance pieces that move with you',
    'Sporty combo that\'s Instagram-ready',
  ],
  'Travel': [
    'Comfortable for long journeys but still chic',
    'Versatile pieces that can be styled multiple ways',
    'Practical yet put-together for any destination',
  ],
  'School': [
    'Trendy but practical for a full day',
    'Comfortable pieces that still show style',
    'Easy to move around in while looking great',
  ],
  'Brunch': [
    'Effortlessly chic for catching up with friends',
    'Relaxed elegance perfect for weekend vibes',
    'Fresh and social-media ready',
  ],
  'Custom': [
    'Personalized combination based on your unique needs',
    'Versatile pieces that work for any occasion',
    'Curated look tailored to your preferences',
  ],
};

export function generatePlannedOutfit(
  closetItems: ClosetItem[],
  occasion: PlanningOccasion,
  customOccasion: string | undefined,
  weather: WeatherSnapshot | undefined
): PlannedOutfit | null {
  if (closetItems.length < 2) {
    return null;
  }

  const tops = closetItems.filter(i => 
    ['T-shirt', 'Shirt', 'Hoodie', 'Sweater', 'Blazer'].includes(i.category)
  );
  const bottoms = closetItems.filter(i => 
    ['Jeans', 'Pants', 'Shorts', 'Skirt'].includes(i.category)
  );
  const outerwear = closetItems.filter(i => 
    ['Jacket', 'Coat', 'Blazer'].includes(i.category)
  );
  const shoes = closetItems.filter(i => 
    ['Sneakers', 'Shoes', 'Boots'].includes(i.category)
  );
  const accessories = closetItems.filter(i => 
    ['Bag', 'Belt', 'Watch', 'Accessory'].includes(i.category)
  );

  const selectedItems: PlannedOutfitItem[] = [];
  const selectedIds = new Set<string>();

  const pickRandomItem = (items: ClosetItem[]): ClosetItem | null => {
    if (!items.length) return null;
    const available = items.filter(item => !selectedIds.has(item.id));
    if (!available.length) return null;
    return available[Math.floor(Math.random() * available.length)];
  };

  const addItem = (item: ClosetItem | null) => {
    if (!item || selectedIds.has(item.id)) return;
    selectedIds.add(item.id);
    selectedItems.push({
      closetItemId: item.id,
      category: item.category,
      color: item.color,
      imageUri: item.imageUri,
    });
  };

  const temp = weather?.temperature;
  const rain = weather?.rainProbability ?? 0;
  const isVeryCold = typeof temp === 'number' && temp <= 8;
  const isCold = typeof temp === 'number' && temp < 15;
  const isMild = typeof temp === 'number' && temp >= 15 && temp <= 24;
  const isHot = typeof temp === 'number' && temp >= 25;
  const isRainy = rain >= 45;

  const warmTops = tops.filter(i => ['Hoodie', 'Sweater'].includes(i.category));
  const lightTops = tops.filter(i => ['T-shirt', 'Shirt'].includes(i.category));
  const practicalBottoms = bottoms.filter(i => ['Jeans', 'Pants'].includes(i.category));
  const lightBottoms = bottoms.filter(i => ['Shorts', 'Skirt'].includes(i.category));
  const boots = shoes.filter(i => i.category === 'Boots');
  const sneakers = shoes.filter(i => i.category === 'Sneakers');
  const classicShoes = shoes.filter(i => i.category === 'Shoes');
  const rainOuterwear = outerwear.filter(i => ['Jacket', 'Coat'].includes(i.category));
  const bags = accessories.filter(i => i.category === 'Bag');

  if (isVeryCold && warmTops.length > 0) {
    addItem(pickRandomItem(warmTops));
  } else if (isHot && lightTops.length > 0) {
    addItem(pickRandomItem(lightTops));
  } else {
    addItem(pickRandomItem(tops));
  }

  if ((isCold || isRainy) && practicalBottoms.length > 0) {
    addItem(pickRandomItem(practicalBottoms));
  } else if (isHot && !isRainy && lightBottoms.length > 0) {
    addItem(pickRandomItem(lightBottoms));
  } else {
    addItem(pickRandomItem(bottoms));
  }

  const shouldLayerOuterwear =
    isVeryCold ||
    isCold ||
    (isRainy && rainOuterwear.length > 0) ||
    (isMild && rain >= 65);

  if (shouldLayerOuterwear && outerwear.length > 0) {
    addItem(pickRandomItem(isRainy ? rainOuterwear : outerwear));
  }

  if (isRainy) {
    addItem(pickRandomItem(boots.length ? boots : sneakers.length ? sneakers : shoes));
  } else if (isCold) {
    addItem(pickRandomItem(boots.length ? boots : sneakers.length ? sneakers : shoes));
  } else if (isHot) {
    addItem(pickRandomItem(classicShoes.length ? classicShoes : sneakers.length ? sneakers : shoes));
  } else {
    addItem(pickRandomItem(shoes));
  }

  const accessoryChance = isRainy ? 0.25 : isCold ? 0.65 : 0.5;
  if (accessories.length > 0 && Math.random() < accessoryChance) {
    addItem(pickRandomItem(isRainy && bags.length > 0 ? bags : accessories));
  }

  if (selectedItems.length < 2) {
    const remaining = closetItems.filter(i => !selectedItems.find(s => s.closetItemId === i.id));
    const needed = Math.min(2 - selectedItems.length, remaining.length);
    for (let i = 0; i < needed; i++) {
      const item = remaining[i];
      addItem(item);
    }
  }

  const whyOptions = outfitWhyItWorks[occasion] || outfitWhyItWorks['Custom'];
  const whyItWorks = whyOptions[Math.floor(Math.random() * whyOptions.length)];

  let weatherNote = '';
  if (weather) {
    if (isVeryCold) {
      weatherNote = ` Built with extra layering for ${weather.temperature}°C weather.`;
    } else if (isCold) {
      weatherNote = ` Added warmer pieces to keep you comfortable at ${weather.temperature}°C.`;
    } else if (isHot) {
      weatherNote = ` Kept the look breathable for ${weather.temperature}°C heat.`;
    }

    if (isRainy) {
      weatherNote += ` Rain-aware picks included for a ${weather.rainProbability}% rain chance.`;
    }
  }

  return {
    id: `planned_${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    occasion,
    customOccasion,
    weather,
    items: selectedItems,
    confidenceScore: Math.floor(Math.random() * 20) + 80,
    whyItWorks: whyItWorks + weatherNote,
    createdAt: new Date().toISOString(),
  };
}

export function generateOutfitFromCloset(closetItems: ClosetItem[]): OutfitCombination | null {
  if (closetItems.length < 2) {
    return null;
  }

  const result = generatePlannedOutfit(closetItems, 'Casual', undefined, undefined);
  if (!result) return null;

  const occasions: Occasion[] = ['Casual', 'Work', 'Date'];
  const randomOccasions = occasions
    .sort(() => Math.random() - 0.5)
    .slice(0, 2) as Occasion[];

  return {
    id: `combo_${Date.now()}`,
    items: result.items,
    confidenceScore: result.confidenceScore,
    occasionTags: randomOccasions,
    whyItWorks: result.whyItWorks,
    createdAt: new Date().toISOString(),
  };
}

export function analyzeMissingPieces(closetItems: ClosetItem[]): MissingPiecesAnalysis {
  const categories = closetItems.map(i => i.category);
  const missingItems: MissingPieceItem[] = [];

  const essentials: { category: ClothingCategory; reason: string; priority: 'high' | 'medium' | 'low' }[] = [
    { category: 'T-shirt', reason: 'A basic tee is the foundation of most casual outfits', priority: 'high' },
    { category: 'Jeans', reason: 'Versatile denim pairs with almost everything', priority: 'high' },
    { category: 'Sneakers', reason: 'Clean sneakers complete casual and smart-casual looks', priority: 'high' },
    { category: 'Blazer', reason: 'Instantly elevates any outfit for work or dates', priority: 'medium' },
    { category: 'Jacket', reason: 'Essential layering piece for cooler weather', priority: 'medium' },
    { category: 'Shirt', reason: 'Button-ups add polish to any look', priority: 'medium' },
    { category: 'Belt', reason: 'Small detail that ties an outfit together', priority: 'low' },
    { category: 'Watch', reason: 'Classic accessory that shows attention to detail', priority: 'low' },
  ];

  for (const essential of essentials) {
    if (!categories.includes(essential.category)) {
      missingItems.push({
        item: `${essential.category}`,
        category: essential.category,
        reason: essential.reason,
        priority: essential.priority,
      });
    }
  }

  const hasWhite = closetItems.some(i => i.color.toLowerCase().includes('white'));
  const hasBlack = closetItems.some(i => i.color.toLowerCase().includes('black'));
  const hasNeutral = closetItems.some(i => 
    ['beige', 'cream', 'gray', 'grey', 'navy'].some(c => i.color.toLowerCase().includes(c))
  );

  if (!hasWhite && closetItems.length >= 3) {
    missingItems.push({
      item: 'White basics',
      category: 'T-shirt',
      reason: 'White pieces are incredibly versatile and match everything',
      priority: 'medium',
    });
  }

  if (!hasBlack && closetItems.length >= 3) {
    missingItems.push({
      item: 'Black staples',
      category: 'Pants',
      reason: 'Black items anchor outfits and add sophistication',
      priority: 'medium',
    });
  }

  if (!hasNeutral && closetItems.length >= 5) {
    missingItems.push({
      item: 'Neutral tones',
      category: 'Sweater',
      reason: 'Neutrals help bridge different pieces in your wardrobe',
      priority: 'low',
    });
  }

  return {
    missingItems: missingItems.slice(0, 5),
    analyzedAt: new Date().toISOString(),
  };
}

export function recreateInspirationOutfit(
  inspirationId: string,
  inspirationImageUrl: string,
  closetItems: ClosetItem[]
): RecreatedOutfit {
  const matchedItems: PlannedOutfitItem[] = [];
  const missingItems: string[] = [];

  const neededCategories: ClothingCategory[] = ['T-shirt', 'Jeans', 'Sneakers', 'Jacket'];

  for (const category of neededCategories) {
    const matchingItem = closetItems.find(i => i.category === category);
    if (matchingItem) {
      matchedItems.push({
        closetItemId: matchingItem.id,
        category: matchingItem.category,
        color: matchingItem.color,
        imageUri: matchingItem.imageUri,
      });
    } else {
      missingItems.push(`${category} (similar to inspiration)`);
    }
  }

  if (matchedItems.length === 0 && closetItems.length > 0) {
    const randomItems = closetItems.slice(0, Math.min(3, closetItems.length));
    for (const item of randomItems) {
      matchedItems.push({
        closetItemId: item.id,
        category: item.category,
        color: item.color,
        imageUri: item.imageUri,
      });
    }
  }

  const confidenceScore = Math.round((matchedItems.length / neededCategories.length) * 100);

  return {
    id: `recreated_${Date.now()}`,
    inspirationId,
    inspirationImageUrl,
    matchedItems,
    missingItems,
    confidenceScore: Math.max(confidenceScore, 40),
    createdAt: new Date().toISOString(),
  };
}

export function getMockWeather(date?: string): WeatherSnapshot {
  const conditions: Array<{ condition: WeatherSnapshot['condition']; temp: number; rain: number }> = [
    { condition: 'sunny', temp: 22, rain: 5 },
    { condition: 'cloudy', temp: 18, rain: 30 },
    { condition: 'rainy', temp: 14, rain: 80 },
    { condition: 'sunny', temp: 28, rain: 0 },
    { condition: 'cloudy', temp: 16, rain: 40 },
  ];

  const selected = conditions[Math.floor(Math.random() * conditions.length)];
  const tempVariation = Math.floor(Math.random() * 6) - 3;

  return {
    temperature: selected.temp + tempVariation,
    condition: selected.condition,
    rainProbability: selected.rain,
    date: date || new Date().toISOString().split('T')[0],
    location: 'Your location',
  };
}
