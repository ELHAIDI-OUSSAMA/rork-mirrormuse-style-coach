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
};

const MOCK_PRODUCTS: ProductResult[] = [
  {
    id: 'p1',
    title: 'White Oxford Shirt',
    brand: 'Uniqlo',
    imageUrl: 'https://images.pexels.com/photos/9978789/pexels-photo-9978789.jpeg?auto=compress&cs=tinysrgb&w=1000',
    price: 39,
    currency: 'USD',
    sourceUrl: 'https://www.uniqlo.com',
    categoryHint: 'Shirt',
    colorHint: 'White',
  },
  {
    id: 'p2',
    title: 'Black Wide Leg Trousers',
    brand: 'COS',
    imageUrl: 'https://images.pexels.com/photos/7852979/pexels-photo-7852979.jpeg?auto=compress&cs=tinysrgb&w=1000',
    price: 89,
    currency: 'USD',
    sourceUrl: 'https://www.cos.com',
    categoryHint: 'Pants',
    colorHint: 'Black',
  },
  {
    id: 'p3',
    title: 'Grey Crewneck Sweater',
    brand: 'Zara',
    imageUrl: 'https://images.pexels.com/photos/7679651/pexels-photo-7679651.jpeg?auto=compress&cs=tinysrgb&w=1000',
    price: 55,
    currency: 'USD',
    sourceUrl: 'https://www.zara.com',
    categoryHint: 'Sweater',
    colorHint: 'Gray',
  },
  {
    id: 'p4',
    title: 'Minimal Leather Sneakers',
    brand: 'Veja',
    imageUrl: 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=1000',
    price: 120,
    currency: 'USD',
    sourceUrl: 'https://www.veja-store.com',
    categoryHint: 'Sneakers',
    colorHint: 'White',
  },
  {
    id: 'p5',
    title: 'Structured Navy Blazer',
    brand: 'Mango',
    imageUrl: 'https://images.pexels.com/photos/2965270/pexels-photo-2965270.jpeg?auto=compress&cs=tinysrgb&w=1000',
    price: 140,
    currency: 'USD',
    sourceUrl: 'https://shop.mango.com',
    categoryHint: 'Blazer',
    colorHint: 'Navy',
  },
];

function normalize(v: string) {
  return v.trim().toLowerCase();
}

export async function searchProducts(query: string): Promise<ProductResult[]> {
  const q = normalize(query);
  if (!q) return MOCK_PRODUCTS;

  return MOCK_PRODUCTS.filter((p) => {
    const target = `${p.title} ${p.brand} ${p.categoryHint || ''} ${p.colorHint || ''}`.toLowerCase();
    return q.split(/\s+/).every((token) => target.includes(token));
  });
}

export async function getProductById(id: string): Promise<ProductResult | null> {
  return MOCK_PRODUCTS.find((p) => p.id === id) || null;
}

