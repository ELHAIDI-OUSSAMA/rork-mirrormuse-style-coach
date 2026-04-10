/**
 * Inspiration Provider — Pexels + Unsplash with AI-powered outfit quality filtering
 *
 * Pipeline:
 * 1. Fetch images using fashion-intent search queries (biased toward full-body outfits)
 * 2. Run AI batch validation to classify outfit quality
 * 3. Filter by usefulness, framing, and visible clothing items
 * 4. Rank using composite score (usefulness + framing bonus + style match)
 * 5. Apply diversity logic to avoid repetitive similar images
 */

import { InspirationItem } from '@/types';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';

/* ── API Keys (leave empty to use curated fallback) ── */
const PEXELS_API_KEY = 'u5HoXQcHSkf9QguXzS68hQLUPhMbhxQOOFoJtu6O4mv03rZSaMndhDcC';
const UNSPLASH_ACCESS_KEY = '';

/* ── Pipeline Thresholds ── */
const VALIDATION_BATCH_SIZE = 5;
const MIN_CLARITY_SCORE = 0.78;
const RELAXED_CLARITY_SCORE = 0.65;
const TARGET_ITEMS_PER_PAGE = 12;
const AI_TIMEOUT_MS = 15000;

/* ── Fashion-Intent Base Queries (no chip selected) ── */
const FASHION_BASE_QUERIES: Record<'men' | 'women', string[]> = {
  women: [
    'street style women full body outfit',
    'women outfit street style full body',
    'fashion week street style women',
    'minimal outfit women full body',
    'casual outfit women full body street style',
  ],
  men: [
    'men street style full body outfit',
    'men outfit street style full body',
    'fashion week street style men',
    'old money outfit men full body',
    'minimal outfit men full body street style',
  ],
};

/* ── Chip Query Expansions (fashion-intent, gender-specific) ── */
const QUERY_EXPANSIONS: Record<string, Record<'men' | 'women', string[]>> = {
  Minimal: {
    women: ['minimal outfit women full body street style', 'capsule wardrobe women outfit full body', 'neutral outfit women full body look'],
    men: ['minimal outfit men full body street style', 'capsule wardrobe men outfit full body', 'neutral outfit men full body look'],
  },
  Work: {
    women: ['business casual women full body outfit street style', 'office outfit women full body look', 'workwear women smart casual full body'],
    men: ['business casual men full body outfit street style', 'office outfit men full body look', 'workwear men smart casual full body'],
  },
  Date: {
    women: ['date night outfit women full body', 'dinner outfit women full body street style', 'evening outfit women full body look'],
    men: ['date night outfit men full body', 'dinner outfit men full body street style', 'evening outfit men full body look'],
  },
  Streetwear: {
    women: ['streetwear women full body outfit', 'urban fashion women street style full body', 'street style women outfit lookbook'],
    men: ['streetwear men full body outfit', 'urban fashion men street style full body', 'street style men outfit lookbook'],
  },
  'Old Money': {
    women: ['old money outfit women full body', 'quiet luxury women street style full body', 'preppy outfit women full body look'],
    men: ['old money outfit men full body', 'quiet luxury men street style full body', 'preppy outfit men full body look'],
  },
  Gym: {
    women: ['athleisure outfit women full body', 'gym wear women full body look', 'sporty outfit women street style full body'],
    men: ['athleisure outfit men full body', 'gym wear men full body look', 'sporty outfit men street style full body'],
  },
  Party: {
    women: ['party outfit women full body', 'night out women full body outfit look', 'club outfit women full body street style'],
    men: ['party outfit men full body', 'night out men full body outfit look', 'going out men full body street style'],
  },
  Casual: {
    women: ['casual outfit women full body street style', 'everyday outfit women full body', 'weekend outfit women full body look'],
    men: ['casual outfit men full body street style', 'everyday outfit men full body', 'weekend outfit men full body look'],
  },
  Formal: {
    women: ['formal outfit women full body', 'elegant women outfit full body look', 'gala outfit women full body street style'],
    men: ['formal suit men full body', 'elegant men outfit full body look', 'tuxedo men full body street style'],
  },
  'Smart Casual': {
    women: ['smart casual women full body outfit', 'polished casual women street style full body', 'elevated casual women full body look'],
    men: ['smart casual men full body outfit', 'polished casual men street style full body', 'elevated casual men full body look'],
  },
  'Clean Girl': {
    women: ['clean girl aesthetic outfit full body', 'model off duty women outfit full body', 'effortless outfit women full body street style'],
    men: ['clean aesthetic men outfit full body', 'model off duty men outfit full body', 'effortless outfit men full body street style'],
  },
  Glam: {
    women: ['glamorous outfit women full body', 'evening glam women full body look', 'glam women outfit street style full body'],
    men: ['dapper outfit men full body', 'formal evening men full body look', 'elegant men outfit full body street style'],
  },
  Office: {
    women: ['office outfit women full body street style', 'workwear women full body look', 'corporate outfit women full body'],
    men: ['office outfit men full body street style', 'workwear men full body look', 'corporate outfit men full body'],
  },
  Modest: {
    women: ['modest outfit women full body', 'modest fashion women street style full body', 'covered outfit women full body look'],
    men: ['modest outfit men full body', 'modest fashion men street style full body', 'modest menswear full body look'],
  },
  Athleisure: {
    women: ['athleisure women full body outfit', 'sporty chic women street style full body', 'athletic casual women full body look'],
    men: ['athleisure men full body outfit', 'sporty chic men street style full body', 'athletic casual men full body look'],
  },
};

/* ── Style Tags & Metadata ── */
const STYLE_TAGS = [
  'Minimal', 'Old Money', 'Streetwear', 'Casual', 'Formal',
  'Athleisure', 'Smart Casual', 'Clean Girl', 'Preppy', 'Vintage',
  'Edgy', 'Classic', 'Relaxed', 'Polished', 'Bohemian',
];

const KEY_PIECES = [
  'jacket', 'blazer', 'jeans', 'sneakers', 'loafers', 'trousers',
  'hoodie', 'tee', 'polo', 'sweater', 'cardigan', 'boots',
  'dress', 'skirt', 'shorts', 'coat', 'vest', 'heels',
  'bag', 'watch', 'sunglasses', 'scarf', 'belt',
];

const COLOR_PALETTES = [
  ['#F5F5DC', '#D2B48C', '#8B7355'],
  ['#1A1A1A', '#4A4A4A', '#F5F5F5'],
  ['#2C3E50', '#FFFFFF', '#BDC3C7'],
  ['#556B2F', '#8B4513', '#DEB887'],
  ['#000000', '#FFFFFF', '#808080'],
  ['#4A6741', '#F5F5DC', '#D4A574'],
  ['#1E3A5F', '#87CEEB', '#FFFFFF'],
  ['#D2B48C', '#FFFFF0', '#C9907D'],
  ['#708090', '#B0C4DE', '#FFFFFF'],
  ['#8B0000', '#1A1A1A', '#F5F5F5'],
];

/* ── AI Outfit Intent Classifier Schema ── */
const OutfitIntentSchema = z.object({
  evaluations: z.array(z.object({
    imageIndex: z.number().describe('Zero-based index of the image in the batch'),
    isOutfitInspiration: z.boolean().describe('True ONLY if this shows a single person wearing a clear outfit combination that someone could recreate'),
    framing: z.enum(['full_body', 'three_quarter', 'upper_body', 'close_up']).describe(
      'full_body=head to toe visible. three_quarter=head to knees/mid-calf. upper_body=waist up only. close_up=face/accessory detail only.'
    ),
    outfitClarityScore: z.number().min(0).max(1).describe(
      'How clearly the outfit is visible and identifiable. 1.0=every piece is crystal clear. 0.0=cannot tell what they are wearing. Be very strict.'
    ),
    visiblePieces: z.object({
      top: z.boolean().describe('A top garment (shirt/blouse/tee/sweater/tank) is clearly visible'),
      bottom: z.boolean().describe('A bottom garment (pants/jeans/skirt/shorts) is clearly visible'),
      outerwear: z.boolean().describe('A jacket/coat/blazer/cardigan is visible'),
      footwear: z.boolean().describe('Shoes/boots/sneakers/heels are visible'),
      dress: z.boolean().describe('A dress/jumpsuit/romper is visible (replaces top+bottom requirement)'),
    }),
    detectedKeyPieces: z.array(z.string()).describe(
      'List the specific clothing items visible, e.g. ["blazer", "white tee", "slim jeans", "white sneakers"]. Max 5 items.'
    ),
    peopleCount: z.number().min(0).describe('How many people are visible in the image. 0=no people, 1=single person, 2+=group'),
    backgroundComplexity: z.enum(['simple', 'moderate', 'complex']).describe(
      'simple=plain wall/studio/clean street. moderate=urban setting with some elements. complex=busy crowd/heavy scenery/cluttered.'
    ),
    rejectReason: z.enum([
      'none', 'portrait', 'group_shot', 'scenery', 'face_focused',
      'product_only', 'flat_lay', 'low_clarity', 'accessory_only', 'too_far',
    ]).describe(
      'Why this image should be rejected. "none" if it passes. portrait=face dominant. group_shot=2+ people. scenery=landscape/background focused. face_focused=close-up of face. product_only=item without person. flat_lay=clothes laid flat. low_clarity=blurry/unclear outfit. accessory_only=just shoes/bag/watch. too_far=person too small to see outfit.'
    ),
  })),
});

type OutfitEvaluation = z.infer<typeof OutfitIntentSchema>['evaluations'][number];

/* ── Caches ── */
const evaluationCache = new Map<string, OutfitEvaluation>();
const tagCache = new Map<string, { styleTags: string[]; keyPieces: string[]; colorPalette: string[] }>();

/* ── Utilities ── */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateTags(query: string, photoId: string) {
  if (tagCache.has(photoId)) return tagCache.get(photoId)!;
  const h = simpleHash(photoId + query);
  const q = query.toLowerCase();

  const matched = STYLE_TAGS.filter(t => q.includes(t.toLowerCase()));
  const styleTags = matched.length > 0
    ? matched.slice(0, 3)
    : [STYLE_TAGS[h % STYLE_TAGS.length], STYLE_TAGS[(h * 7) % STYLE_TAGS.length]].filter((v, i, a) => a.indexOf(v) === i);

  const pieces: string[] = [];
  for (let i = 0; i < 2 + (h % 3); i++) pieces.push(KEY_PIECES[(h * (i + 3)) % KEY_PIECES.length]);

  const result = {
    styleTags,
    keyPieces: [...new Set(pieces)],
    colorPalette: COLOR_PALETTES[h % COLOR_PALETTES.length],
  };
  tagCache.set(photoId, result);
  return result;
}

async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = () => reject(new Error('base64 conversion failed'));
    reader.readAsDataURL(blob);
  });
}

/* ─────────────────────────────────────────────
   Curated fallback photos from Pexels (no API key needed)
   ───────────────────────────────────────────── */

interface CuratedPhoto {
  id: number;
  author: string;
  tags: string[];
  w: number;
  h: number;
}

function pexelsUrl(id: number, width: number): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}&dpr=1`;
}

const CURATED_MEN: CuratedPhoto[] = [
  { id: 1043473, author: 'Chloe', tags: ['Formal', 'Classic'], w: 800, h: 1200 },
  { id: 1043471, author: 'Chloe', tags: ['Formal', 'Smart Casual'], w: 800, h: 1100 },
  { id: 1865557, author: 'Wellington Lacerda', tags: ['Casual', 'Streetwear'], w: 800, h: 1200 },
  { id: 3374765, author: 'Eric W.', tags: ['Casual', 'Minimal'], w: 800, h: 1100 },
  { id: 1300550, author: 'Simon Robben', tags: ['Smart Casual', 'Classic'], w: 800, h: 1200 },
  { id: 842811, author: 'Andrea Piacquadio', tags: ['Polished', 'Formal'], w: 800, h: 1100 },
  { id: 1040945, author: 'mentatdgt', tags: ['Casual', 'Relaxed'], w: 800, h: 1300 },
  { id: 2379004, author: 'cottonbro studio', tags: ['Streetwear', 'Edgy'], w: 800, h: 1200 },
  { id: 1484806, author: 'Michael Block', tags: ['Smart Casual', 'Old Money'], w: 800, h: 1100 },
  { id: 1681010, author: 'JUNO MACK', tags: ['Streetwear', 'Casual'], w: 800, h: 1200 },
  { id: 7026780, author: 'cottonbro studio', tags: ['Streetwear', 'Casual'], w: 800, h: 1200 },
  { id: 7643772, author: 'Вальдемар', tags: ['Edgy', 'Streetwear'], w: 800, h: 1100 },
  { id: 4611700, author: 'Anna Shvets', tags: ['Formal', 'Classic'], w: 800, h: 1300 },
  { id: 1192609, author: 'Justin Shaifer', tags: ['Smart Casual', 'Polished'], w: 800, h: 1200 },
  { id: 1222271, author: 'Justin Shaifer', tags: ['Casual', 'Relaxed'], w: 800, h: 1100 },
  { id: 1183266, author: 'Nicholas Swatz', tags: ['Formal', 'Old Money'], w: 800, h: 1200 },
  { id: 1342609, author: 'Nicholas Green', tags: ['Minimal', 'Casual'], w: 800, h: 1100 },
  { id: 2897883, author: 'Derick Santos', tags: ['Streetwear', 'Casual'], w: 800, h: 1200 },
  { id: 1656684, author: 'Damar Vinicius', tags: ['Smart Casual', 'Polished'], w: 800, h: 1100 },
  { id: 1021693, author: 'Nicholas Green', tags: ['Casual', 'Minimal'], w: 800, h: 1300 },
  { id: 2955305, author: 'Savvas Stavrinos', tags: ['Casual', 'Relaxed'], w: 800, h: 1200 },
  { id: 3622614, author: 'Chloe', tags: ['Formal', 'Classic'], w: 800, h: 1100 },
  { id: 2887766, author: 'Luis Quintero', tags: ['Streetwear', 'Edgy'], w: 800, h: 1200 },
  { id: 1212984, author: 'Terje Sollie', tags: ['Formal', 'Old Money'], w: 800, h: 1100 },
  { id: 2232981, author: 'Willy D', tags: ['Athleisure', 'Casual'], w: 800, h: 1200 },
  { id: 1346187, author: 'Gabriel Porras', tags: ['Smart Casual', 'Minimal'], w: 800, h: 1100 },
  { id: 839011, author: 'Trần Long', tags: ['Casual', 'Vintage'], w: 800, h: 1300 },
  { id: 1035685, author: 'Marlon Schmeiski', tags: ['Streetwear', 'Casual'], w: 800, h: 1200 },
  { id: 2232979, author: 'Willy D', tags: ['Athleisure', 'Casual'], w: 800, h: 1100 },
  { id: 1722198, author: 'Chinmay Singh', tags: ['Formal', 'Polished'], w: 800, h: 1200 },
];

const CURATED_WOMEN: CuratedPhoto[] = [
  { id: 1036623, author: 'Godisable Jacob', tags: ['Clean Girl', 'Minimal'], w: 800, h: 1200 },
  { id: 985635, author: 'Godisable Jacob', tags: ['Casual', 'Bohemian'], w: 800, h: 1100 },
  { id: 1126993, author: 'Oleg Magni', tags: ['Fashion', 'Polished'], w: 800, h: 1200 },
  { id: 1468379, author: 'Timothy Paule II', tags: ['Streetwear', 'Casual'], w: 800, h: 1100 },
  { id: 1375849, author: 'Andrea Piacquadio', tags: ['Casual', 'Relaxed'], w: 800, h: 1300 },
  { id: 2681751, author: 'Murat Esibatir', tags: ['Glam', 'Formal'], w: 800, h: 1200 },
  { id: 1536619, author: 'Luis Quintero', tags: ['Smart Casual', 'Classic'], w: 800, h: 1100 },
  { id: 2220316, author: 'Daria Shevtsova', tags: ['Minimal', 'Clean Girl'], w: 800, h: 1200 },
  { id: 14984388, author: 'Hana Krazit', tags: ['Athleisure', 'Casual'], w: 800, h: 1200 },
  { id: 18968353, author: 'Natasha S', tags: ['Glam', 'Streetwear'], w: 800, h: 1100 },
  { id: 19101456, author: 'Jesus Fajardo', tags: ['Streetwear', 'Edgy'], w: 800, h: 1300 },
  { id: 1758144, author: 'Dalila Dalprat', tags: ['Casual', 'Vintage'], w: 800, h: 1200 },
  { id: 1055691, author: 'Renato Abati', tags: ['Clean Girl', 'Polished'], w: 800, h: 1100 },
  { id: 2613260, author: 'Christina Morillo', tags: ['Office', 'Smart Casual'], w: 800, h: 1200 },
  { id: 1462637, author: 'Daria Shevtsova', tags: ['Minimal', 'Relaxed'], w: 800, h: 1100 },
  { id: 1308881, author: 'Daria Shevtsova', tags: ['Clean Girl', 'Casual'], w: 800, h: 1200 },
  { id: 2220321, author: 'Daria Shevtsova', tags: ['Minimal', 'Classic'], w: 800, h: 1100 },
  { id: 1587009, author: 'Engin Akyurt', tags: ['Glam', 'Formal'], w: 800, h: 1300 },
  { id: 1926769, author: 'Diego Rezende', tags: ['Bohemian', 'Casual'], w: 800, h: 1200 },
  { id: 2584269, author: 'Wellington Lacerda', tags: ['Streetwear', 'Edgy'], w: 800, h: 1100 },
  { id: 1821095, author: 'Felipe Cespedes', tags: ['Smart Casual', 'Polished'], w: 800, h: 1200 },
  { id: 2773977, author: 'Godisable Jacob', tags: ['Casual', 'Bohemian'], w: 800, h: 1100 },
  { id: 2235071, author: 'Thgusstavo Santana', tags: ['Clean Girl', 'Minimal'], w: 800, h: 1200 },
  { id: 2681726, author: 'Murat Esibatir', tags: ['Glam', 'Formal'], w: 800, h: 1100 },
  { id: 1689731, author: 'Murat Esibatir', tags: ['Office', 'Smart Casual'], w: 800, h: 1300 },
  { id: 2887718, author: 'Luis Quintero', tags: ['Streetwear', 'Casual'], w: 800, h: 1200 },
  { id: 1858488, author: 'Wellington Lacerda', tags: ['Formal', 'Classic'], w: 800, h: 1100 },
  { id: 2043590, author: 'Derick Santos', tags: ['Casual', 'Relaxed'], w: 800, h: 1200 },
  { id: 1755385, author: 'Dalila Dalprat', tags: ['Bohemian', 'Vintage'], w: 800, h: 1100 },
  { id: 2459168, author: 'Godisable Jacob', tags: ['Casual', 'Clean Girl'], w: 800, h: 1200 },
];

/* ── Mock Feed Generator (curated fallback) ── */
function generateMockFeed(
  gender: 'men' | 'women',
  page: number,
  chipTag?: string,
): InspirationItem[] {
  const curated = gender === 'men' ? CURATED_MEN : CURATED_WOMEN;
  const perPage = 10;

  let pool = [...curated];

  if (chipTag) {
    const chipLower = chipTag.toLowerCase();
    const tagged = pool.filter(p =>
      p.tags.some(t => t.toLowerCase().includes(chipLower) || chipLower.includes(t.toLowerCase()))
    );
    const rest = pool.filter(p => !tagged.includes(p));
    pool = [...tagged, ...rest];
  }

  const shuffleSeed = page * 31 + (chipTag ? simpleHash(chipTag) : 0);
  pool = pool.map((item, i) => ({
    item,
    sort: simpleHash(`${shuffleSeed}-${i}-${item.id}`),
  }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);

  const start = ((page - 1) * perPage) % pool.length;
  const slice = [];
  for (let i = 0; i < perPage; i++) {
    slice.push(pool[(start + i) % pool.length]);
  }

  return slice.map((photo, i) => {
    const heightVariation = 1.0 + (simpleHash(`${photo.id}-${page}-${i}`) % 40) / 100;
    const h = Math.round(photo.h * heightVariation);
    const tags = generateTags(chipTag || `${gender} outfit`, `pexels-${photo.id}-${page}`);
    const allTags = [...new Set([...photo.tags, ...tags.styleTags])].slice(0, 3);

    return {
      id: `pexels-${photo.id}-p${page}-${i}`,
      imageUrl: pexelsUrl(photo.id, 800),
      thumbnailUrl: pexelsUrl(photo.id, 400),
      width: photo.w,
      height: h,
      source: 'pexels' as const,
      author: photo.author,
      authorUrl: `https://www.pexels.com/@${photo.author.toLowerCase().replace(/\s+/g, '-')}`,
      sourceUrl: `https://www.pexels.com/photo/${photo.id}/`,
      styleTags: allTags,
      keyPieces: tags.keyPieces,
      colorPalette: tags.colorPalette,
      genderTarget: gender,
      query: chipTag ? `${gender} ${chipTag.toLowerCase()} outfit` : `${gender} outfit ideas`,
    };
  });
}

/* ── Pexels API Fetch ── */
async function fetchPexels(
  query: string, page: number, perPage: number, gender: 'men' | 'women',
): Promise<InspirationItem[]> {
  if (!PEXELS_API_KEY) return [];
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=portrait`;
    const resp = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!data.photos?.length) return [];

    return data.photos.map((photo: any) => {
      const tags = generateTags(query, `pexels-${photo.id}`);
      return {
        id: `pexels-${photo.id}`,
        imageUrl: photo.src.large2x || photo.src.large,
        thumbnailUrl: photo.src.medium,
        width: photo.width, height: photo.height,
        source: 'pexels' as const,
        author: photo.photographer, authorUrl: photo.photographer_url,
        sourceUrl: photo.url,
        styleTags: tags.styleTags, keyPieces: tags.keyPieces, colorPalette: tags.colorPalette,
        genderTarget: gender, query,
      };
    });
  } catch { return []; }
}

/* ── Unsplash API Fetch ── */
async function fetchUnsplash(
  query: string, page: number, perPage: number, gender: 'men' | 'women',
): Promise<InspirationItem[]> {
  if (!UNSPLASH_ACCESS_KEY) return [];
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=portrait`;
    const resp = await fetch(url, { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!data.results?.length) return [];

    return data.results.map((photo: any) => {
      const tags = generateTags(query, `unsplash-${photo.id}`);
      return {
        id: `unsplash-${photo.id}`,
        imageUrl: photo.urls.regular, thumbnailUrl: photo.urls.small,
        width: photo.width, height: photo.height,
        source: 'unsplash' as const,
        author: photo.user.name, authorUrl: photo.user.links?.html || '',
        sourceUrl: photo.links?.html || '',
        styleTags: tags.styleTags, keyPieces: tags.keyPieces, colorPalette: tags.colorPalette,
        genderTarget: gender, query,
      };
    });
  } catch { return []; }
}

/* ── Deduplication ── */
function deduplicateItems(items: InspirationItem[]): InspirationItem[] {
  const seen = new Set<string>();
  return items.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; });
}

/* ─────────────────────────────────────────────
   AI-Powered Outfit Quality Validation
   ───────────────────────────────────────────── */

async function evaluateBatch(
  items: InspirationItem[],
): Promise<Map<string, OutfitEvaluation>> {
  const results = new Map<string, OutfitEvaluation>();

  const uncached: InspirationItem[] = [];
  for (const item of items) {
    const cached = evaluationCache.get(item.id);
    if (cached) {
      results.set(item.id, cached);
    } else {
      uncached.push(item);
    }
  }

  if (uncached.length === 0) return results;

  try {
    const base64Results = await Promise.allSettled(
      uncached.map(item => urlToBase64(item.thumbnailUrl))
    );

    const validItems: { item: InspirationItem; base64: string }[] = [];
    base64Results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value) {
        validItems.push({ item: uncached[i], base64: result.value });
      }
    });

    if (validItems.length === 0) return results;

    const content: Array<{ type: string; text?: string; image?: string }> = [{
      type: 'text',
      text: `You are an outfit inspiration curator. Evaluate these ${validItems.length} images.\n` +
        'Goal: only keep images that look like Pinterest outfit search results — clear, single-person outfit photos.\n\n' +
        'For each image evaluate:\n' +
        '1. Is this a SINGLE PERSON wearing a clearly visible outfit? (isOutfitInspiration)\n' +
        '2. Body framing: full_body (head to toe), three_quarter (head to knees), upper_body (waist up), close_up (detail)\n' +
        '3. Outfit clarity score 0-1: how clearly can you identify each clothing piece?\n' +
        '4. Which pieces are visible: top, bottom, outerwear, footwear, dress\n' +
        '5. List the specific detected key pieces (e.g. "blazer", "slim jeans", "white sneakers")\n' +
        '6. People count: exactly how many people are in the frame\n' +
        '7. Background complexity: simple/moderate/complex\n' +
        '8. Reject reason if applicable\n\n' +
        'STRICT RULES:\n' +
        '- outfitClarityScore >= 0.8 ONLY for clear full/three-quarter body shots where you can name every clothing item\n' +
        '- outfitClarityScore < 0.4 for portraits, headshots, beauty shots, face-focused images\n' +
        '- outfitClarityScore < 0.5 for upper-body-only, stock poses, unclear outfits\n' +
        '- REJECT (rejectReason != "none") if: 2+ people (group_shot), face fills >50% of frame (face_focused), no person (product_only/flat_lay), outfit unclear (low_clarity), just accessories (accessory_only), person too far away to see outfit (too_far), landscape/scenery dominant (scenery)\n' +
        '- A good outfit inspiration image = 1 person, full or three-quarter body, outfit clearly visible, clean background',
    }];

    validItems.forEach((vi, i) => {
      content.push({ type: 'text', text: `Image ${i}:` });
      content.push({ type: 'image', image: vi.base64 });
    });

    const response = await generateObject({
      messages: [{ role: 'user', content }],
      schema: OutfitIntentSchema,
    });

    for (const ev of response.evaluations) {
      if (ev.imageIndex >= 0 && ev.imageIndex < validItems.length) {
        const matchedItem = validItems[ev.imageIndex];
        evaluationCache.set(matchedItem.item.id, ev);
        results.set(matchedItem.item.id, ev);
      }
    }
  } catch (error) {
    console.log('[Inspiration] AI batch evaluation failed:', error);
    for (const item of uncached) {
      if (!results.has(item.id)) {
        const fallback: OutfitEvaluation = {
          imageIndex: 0,
          isOutfitInspiration: true,
          framing: 'three_quarter',
          outfitClarityScore: 0.7,
          visiblePieces: { top: true, bottom: true, footwear: false, outerwear: false, dress: false },
          detectedKeyPieces: [],
          peopleCount: 1,
          backgroundComplexity: 'moderate',
          rejectReason: 'none',
        };
        results.set(item.id, fallback);
      }
    }
  }

  return results;
}

/* ── Quality Filter (hard gate) ── */
function passesQualityFilter(ev: OutfitEvaluation, relaxed: boolean = false): boolean {
  if (ev.rejectReason !== 'none') return false;

  if (!ev.isOutfitInspiration) return false;

  if (ev.peopleCount !== 1) return false;

  const threshold = relaxed ? RELAXED_CLARITY_SCORE : MIN_CLARITY_SCORE;
  if (ev.outfitClarityScore < threshold) return false;

  if (ev.framing !== 'full_body' && ev.framing !== 'three_quarter') return false;

  const hasOutfitVisibility =
    (ev.visiblePieces.top && ev.visiblePieces.bottom) || ev.visiblePieces.dress;
  if (!hasOutfitVisibility) return false;

  return true;
}

/* ── Ranking (outfitClarityScore is king) ── */
function calculateFinalScore(ev: OutfitEvaluation): number {
  const framingBonus =
    ev.framing === 'full_body' ? 1.0 :
    ev.framing === 'three_quarter' ? 0.7 : 0.2;

  const bgBonus =
    ev.backgroundComplexity === 'simple' ? 1.0 :
    ev.backgroundComplexity === 'moderate' ? 0.7 : 0.3;

  const pieceCountBonus = Math.min(ev.detectedKeyPieces.length / 4, 1.0);

  return (
    ev.outfitClarityScore * 0.50 +
    framingBonus * 0.20 +
    bgBonus * 0.15 +
    pieceCountBonus * 0.15
  );
}

/* ── Diversity Filter ── */
interface ScoredItem {
  item: InspirationItem;
  score: number;
  ev: OutfitEvaluation;
}

function applyDiversityFilter(items: ScoredItem[]): InspirationItem[] {
  if (items.length <= 2) return items.map(i => enrichItem(i));

  const selected: ScoredItem[] = [items[0]];

  for (let i = 1; i < items.length && selected.length < TARGET_ITEMS_PER_PAGE; i++) {
    const candidate = items[i];
    let tooSimilar = false;

    const recent = selected.slice(-3);
    for (const prev of recent) {
      const colorOverlap = candidate.item.colorPalette.filter(
        c => prev.item.colorPalette.includes(c)
      ).length;
      const maxColors = Math.max(candidate.item.colorPalette.length, prev.item.colorPalette.length, 1);
      const colorSim = colorOverlap / maxColors;

      const tagOverlap = candidate.item.styleTags.filter(
        t => prev.item.styleTags.includes(t)
      ).length;
      const maxTags = Math.max(candidate.item.styleTags.length, prev.item.styleTags.length, 1);
      const tagSim = tagOverlap / maxTags;

      const piecesOverlap = candidate.ev.detectedKeyPieces.filter(
        p => prev.ev.detectedKeyPieces.some(pp => pp.toLowerCase() === p.toLowerCase())
      ).length;
      const maxPieces = Math.max(candidate.ev.detectedKeyPieces.length, prev.ev.detectedKeyPieces.length, 1);
      const piecesSim = piecesOverlap / maxPieces;

      const sameAuthor = candidate.item.author === prev.item.author ? 0.4 : 0;

      const similarity = colorSim * 0.2 + tagSim * 0.2 + piecesSim * 0.3 + sameAuthor * 0.3;
      if (similarity > 0.6) {
        tooSimilar = true;
        break;
      }
    }

    if (!tooSimilar) selected.push(candidate);
  }

  if (selected.length < 6 && items.length > selected.length) {
    const selectedIds = new Set(selected.map(s => s.item.id));
    for (const item of items) {
      if (selected.length >= TARGET_ITEMS_PER_PAGE) break;
      if (!selectedIds.has(item.item.id)) {
        selected.push(item);
        selectedIds.add(item.item.id);
      }
    }
  }

  return selected.map(s => enrichItem(s));
}

function enrichItem(scored: ScoredItem): InspirationItem {
  const aiPieces = scored.ev.detectedKeyPieces;
  if (aiPieces.length > 0) {
    return { ...scored.item, aiDetectedPieces: aiPieces.slice(0, 4) };
  }
  return scored.item;
}

/* ── Full Validation + Filter + Rank + Diversify Pipeline ── */
async function validateAndFilterImages(items: InspirationItem[]): Promise<InspirationItem[]> {
  const batches: InspirationItem[][] = [];
  for (let i = 0; i < items.length; i += VALIDATION_BATCH_SIZE) {
    batches.push(items.slice(i, i + VALIDATION_BATCH_SIZE));
  }

  const batchResults = await Promise.allSettled(
    batches.map(batch => evaluateBatch(batch))
  );

  const allEvaluations = new Map<string, OutfitEvaluation>();
  for (const result of batchResults) {
    if (result.status === 'fulfilled') {
      for (const [id, ev] of result.value) {
        allEvaluations.set(id, ev);
      }
    }
  }

  let filtered = items.filter(item => {
    const ev = allEvaluations.get(item.id);
    if (!ev) return true;
    return passesQualityFilter(ev);
  });

  if (filtered.length < 6) {
    const strictIds = new Set(filtered.map(i => i.id));
    const relaxedExtra = items.filter(item => {
      if (strictIds.has(item.id)) return false;
      const ev = allEvaluations.get(item.id);
      if (!ev) return false;
      return passesQualityFilter(ev, true);
    });
    filtered = [...filtered, ...relaxedExtra];
  }

  const scored: ScoredItem[] = filtered.map(item => {
    const ev = allEvaluations.get(item.id) || {
      imageIndex: 0, isOutfitInspiration: true, framing: 'three_quarter' as const,
      outfitClarityScore: 0.7,
      visiblePieces: { top: true, bottom: true, footwear: false, outerwear: false, dress: false },
      detectedKeyPieces: [], peopleCount: 1,
      backgroundComplexity: 'moderate' as const, rejectReason: 'none' as const,
    };
    return { item, score: calculateFinalScore(ev), ev };
  }).sort((a, b) => b.score - a.score);

  return applyDiversityFilter(scored);
}

async function validateWithTimeout(items: InspirationItem[]): Promise<InspirationItem[]> {
  try {
    const result = await Promise.race([
      validateAndFilterImages(items),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), AI_TIMEOUT_MS)
      ),
    ]);
    if (result && result.length > 0) return result;
  } catch (error) {
    console.log('[Inspiration] AI validation timed out or failed, using unfiltered results');
  }
  return items.slice(0, TARGET_ITEMS_PER_PAGE);
}

/* ─────────────────────────────────────────────
   Public API
   ───────────────────────────────────────────── */

export function buildSearchQueries(gender: 'men' | 'women', chipTag?: string): string[] {
  if (!chipTag) {
    return FASHION_BASE_QUERIES[gender].slice(0, 3);
  }
  const expansions = QUERY_EXPANSIONS[chipTag]?.[gender];
  if (!expansions) {
    return [`${gender} ${chipTag.toLowerCase()} outfit full body street style`];
  }
  return expansions;
}

export async function fetchInspirationFeed(
  gender: 'men' | 'women',
  page: number = 1,
  chipTag?: string,
): Promise<InspirationItem[]> {
  const hasApiKeys = !!PEXELS_API_KEY || !!UNSPLASH_ACCESS_KEY;

  if (!hasApiKeys) {
    return generateMockFeed(gender, page, chipTag);
  }

  const queries = buildSearchQueries(gender, chipTag);
  const perPage = Math.ceil(30 / queries.length);

  const allFetches = queries.flatMap(q => [
    fetchPexels(q, page, perPage, gender),
    fetchUnsplash(q, page, Math.max(2, Math.floor(perPage / 2)), gender),
  ]);

  const results = await Promise.allSettled(allFetches);
  const allItems: InspirationItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') allItems.push(...r.value);
  }

  if (allItems.length === 0) {
    return generateMockFeed(gender, page, chipTag);
  }

  const deduplicated = deduplicateItems(allItems);
  return validateWithTimeout(deduplicated);
}

export function getInspirationChips(gender: 'men' | 'women'): string[] {
  return gender === 'men'
    ? ['Minimal', 'Work', 'Date', 'Streetwear', 'Old Money', 'Gym', 'Casual', 'Formal', 'Smart Casual']
    : ['Minimal', 'Work', 'Date', 'Streetwear', 'Clean Girl', 'Gym', 'Glam', 'Casual', 'Office'];
}
