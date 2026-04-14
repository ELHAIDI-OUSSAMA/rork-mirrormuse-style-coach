import { PRODUCT_CATALOG, CatalogProduct } from '@/mocks/productCatalog';

export type ProductResult = {
  id: string;
  title: string;
  brand: string;
  imageUrl: string;
  price?: number;
  currency?: string;
  sourceUrl?: string;
  categoryHint?: string;
  colorHint?: string;
  subcategory?: string;
  tags?: string[];
  relevanceScore?: number;
};

const BRAND_ALIASES: Record<string, string[]> = {
  nike: ['nike'],
  adidas: ['adidas'],
  uniqlo: ['uniqlo'],
  "levi's": ['levis', "levi's", 'levi'],
  zara: ['zara'],
  'h&m': ['hm', 'h&m', 'h and m'],
  cos: ['cos'],
  mango: ['mango'],
  'new balance': ['new balance', 'nb', 'newbalance'],
  converse: ['converse'],
  vans: ['vans'],
  'ralph lauren': ['ralph lauren', 'polo ralph', 'polo'],
  'tommy hilfiger': ['tommy', 'tommy hilfiger'],
  'carhartt wip': ['carhartt', 'carhartt wip'],
  patagonia: ['patagonia'],
  'the north face': ['north face', 'tnf', 'the north face'],
  'dr. martens': ['dr martens', 'doc martens', 'dr. martens'],
  'common projects': ['common projects', 'cp'],
  'all saints': ['allsaints', 'all saints'],
  champion: ['champion'],
  stüssy: ['stussy', 'stüssy'],
  'ray-ban': ['ray ban', 'ray-ban', 'rayban'],
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  sneakers: ['sneakers', 'sneaker', 'trainers', 'trainer', 'kicks'],
  shoes: ['shoes', 'shoe', 'footwear'],
  boots: ['boots', 'boot'],
  hoodie: ['hoodie', 'hoodies', 'hoody'],
  't-shirt': ['t-shirt', 'tshirt', 'tee', 'tees', 't shirt'],
  shirt: ['shirt', 'shirts', 'button-down', 'button down', 'dress shirt'],
  jeans: ['jeans', 'jean', 'denim'],
  pants: ['pants', 'trousers', 'trouser', 'chinos', 'chino', 'slacks'],
  shorts: ['shorts', 'short'],
  jacket: ['jacket', 'jackets'],
  blazer: ['blazer', 'blazers', 'sport coat'],
  coat: ['coat', 'coats', 'overcoat'],
  sweater: ['sweater', 'sweaters', 'jumper', 'jumpers', 'knit', 'pullover', 'sweatshirt', 'crewneck'],
  dress: ['dress', 'dresses'],
  skirt: ['skirt', 'skirts'],
  bag: ['bag', 'bags', 'tote', 'backpack', 'crossbody'],
  belt: ['belt', 'belts'],
  watch: ['watch', 'watches'],
  accessory: ['accessory', 'accessories', 'sunglasses', 'cap', 'hat', 'scarf'],
};

const COLOR_ALIASES: Record<string, string[]> = {
  black: ['black', 'blk'],
  white: ['white', 'wht'],
  blue: ['blue', 'navy', 'indigo'],
  gray: ['gray', 'grey', 'charcoal', 'silver'],
  brown: ['brown', 'tan', 'camel', 'khaki', 'beige'],
  red: ['red', 'burgundy', 'maroon'],
  green: ['green', 'olive', 'sage', 'forest'],
  cream: ['cream', 'ivory', 'off-white', 'offwhite'],
  pink: ['pink', 'blush', 'rose'],
};

function normalizeQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s'-]/g, '');
}

function tokenize(text: string): string[] {
  return normalizeQuery(text).split(/\s+/).filter(Boolean);
}

function singularize(word: string): string {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('ses') || word.endsWith('zes')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function matchesBrand(queryTokens: string[], productBrand: string): boolean {
  const brandLower = productBrand.toLowerCase();
  for (const [canonical, aliases] of Object.entries(BRAND_ALIASES)) {
    if (brandLower.includes(canonical) || aliases.some(a => brandLower.includes(a))) {
      const queryStr = queryTokens.join(' ');
      if (aliases.some(a => queryStr.includes(a)) || queryStr.includes(canonical)) {
        return true;
      }
    }
  }
  return queryTokens.some(t => brandLower.includes(t) || brandLower.includes(singularize(t)));
}

function matchesCategory(queryTokens: string[], productCategory: string, productSubcategory?: string): boolean {
  const catLower = productCategory.toLowerCase();
  const subLower = (productSubcategory || '').toLowerCase();

  for (const [, aliases] of Object.entries(CATEGORY_ALIASES)) {
    const productMatchesCategory = aliases.some(a => catLower.includes(a) || subLower.includes(a));
    if (productMatchesCategory) {
      const queryStr = queryTokens.join(' ');
      if (aliases.some(a => queryStr.includes(a) || queryTokens.some(t => a.includes(t) || t === singularize(a) || singularize(t) === singularize(a)))) {
        return true;
      }
    }
  }

  return queryTokens.some(t => catLower.includes(t) || catLower.includes(singularize(t)));
}

function matchesColor(queryTokens: string[], productColor: string): boolean {
  const colorLower = productColor.toLowerCase();
  for (const [, aliases] of Object.entries(COLOR_ALIASES)) {
    const productMatchesColor = aliases.some(a => colorLower.includes(a));
    if (productMatchesColor) {
      if (queryTokens.some(t => aliases.some(a => a === t || a === singularize(t)))) {
        return true;
      }
    }
  }
  return queryTokens.some(t => colorLower.includes(t));
}

function scoreProduct(queryTokens: string[], queryRaw: string, product: CatalogProduct): number {
  let score = 0;
  const titleLower = product.title.toLowerCase();
  const queryNorm = normalizeQuery(queryRaw);

  if (titleLower.includes(queryNorm)) score += 50;

  const brandMatch = matchesBrand(queryTokens, product.brand);
  if (brandMatch) score += 30;

  const categoryMatch = matchesCategory(queryTokens, product.category, product.subcategory);
  if (categoryMatch) score += 25;

  const colorMatch = matchesColor(queryTokens, product.color);
  if (colorMatch) score += 15;

  const allTags = product.tags.join(' ');
  for (const token of queryTokens) {
    const singular = singularize(token);
    if (titleLower.includes(token) || titleLower.includes(singular)) score += 10;
    if (allTags.includes(token) || allTags.includes(singular)) score += 5;
  }

  const matchedTokens = queryTokens.filter(t => {
    const s = singularize(t);
    const searchSpace = `${titleLower} ${product.brand.toLowerCase()} ${product.category.toLowerCase()} ${product.color.toLowerCase()} ${allTags}`;
    return searchSpace.includes(t) || searchSpace.includes(s);
  });
  const coverage = matchedTokens.length / Math.max(queryTokens.length, 1);
  score += coverage * 20;

  return score;
}

const searchCache = new Map<string, { results: ProductResult[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function catalogToResult(product: CatalogProduct, score: number): ProductResult {
  return {
    id: product.id,
    title: product.title,
    brand: product.brand,
    imageUrl: product.imageUrl,
    price: product.price,
    currency: product.currency,
    sourceUrl: product.sourceUrl,
    categoryHint: product.category,
    colorHint: product.color,
    subcategory: product.subcategory,
    tags: product.tags,
    relevanceScore: score,
  };
}

export async function searchProducts(query: string): Promise<ProductResult[]> {
  const normalized = normalizeQuery(query);
  if (!normalized || normalized.length < 2) return [];

  const cached = searchCache.get(normalized);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[ProductSearch] cache hit for:', normalized);
    return cached.results;
  }

  console.log('[ProductSearch] searching for:', normalized);
  const tokens = tokenize(normalized);

  const scored = PRODUCT_CATALOG.map(product => ({
    product,
    score: scoreProduct(tokens, query, product),
  }));

  const filtered = scored
    .filter(s => s.score > 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  const results = filtered.map(s => catalogToResult(s.product, s.score));

  searchCache.set(normalized, { results, timestamp: Date.now() });
  console.log(`[ProductSearch] found ${results.length} results for "${normalized}"`);

  return results;
}

export async function getProductById(id: string): Promise<ProductResult | null> {
  const product = PRODUCT_CATALOG.find(p => p.id === id);
  if (!product) return null;
  return catalogToResult(product, 100);
}

export function clearSearchCache(): void {
  searchCache.clear();
}
