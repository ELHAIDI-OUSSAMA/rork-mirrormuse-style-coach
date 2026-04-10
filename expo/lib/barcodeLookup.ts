import { ProductResult } from '@/lib/productSearch';

const MOCK_BY_CODE: Record<string, ProductResult> = {
  '012345678905': {
    id: 'bc-1',
    title: 'Slim Fit White Tee',
    brand: 'H&M',
    imageUrl: 'https://images.pexels.com/photos/6311396/pexels-photo-6311396.jpeg?auto=compress&cs=tinysrgb&w=1000',
    price: 19,
    currency: 'USD',
    sourceUrl: 'https://www.hm.com',
    categoryHint: 'T-shirt',
    colorHint: 'White',
  },
  '978020137962': {
    id: 'bc-2',
    title: 'Straight Blue Jeans',
    brand: 'Levis',
    imageUrl: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=1000',
    price: 79,
    currency: 'USD',
    sourceUrl: 'https://www.levi.com',
    categoryHint: 'Jeans',
    colorHint: 'Blue',
  },
};

export async function lookupBarcode(code: string): Promise<ProductResult | null> {
  const normalized = code.trim();
  if (!normalized) return null;
  return MOCK_BY_CODE[normalized] || null;
}

