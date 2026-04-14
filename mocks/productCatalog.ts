export interface CatalogProduct {
  id: string;
  title: string;
  brand: string;
  imageUrl: string;
  price?: number;
  currency: string;
  sourceUrl?: string;
  category: string;
  subcategory?: string;
  color: string;
  tags: string[];
}

export const PRODUCT_CATALOG: CatalogProduct[] = [
  // ── Nike ──
  { id: 'nike-af1-white', title: 'Air Force 1 \'07', brand: 'Nike', imageUrl: 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=600&q=80', price: 110, currency: 'USD', category: 'Sneakers', color: 'White', tags: ['sneakers', 'white', 'classic', 'leather', 'low-top'] },
  { id: 'nike-dunk-low-black', title: 'Dunk Low Retro', brand: 'Nike', imageUrl: 'https://images.unsplash.com/photo-1597045566677-8cf032ed6634?w=600&q=80', price: 115, currency: 'USD', category: 'Sneakers', color: 'Black', tags: ['sneakers', 'black', 'white', 'retro', 'low-top', 'dunk'] },
  { id: 'nike-tech-fleece', title: 'Tech Fleece Joggers', brand: 'Nike', imageUrl: 'https://images.unsplash.com/photo-1562183241-b937e95585b6?w=600&q=80', price: 120, currency: 'USD', category: 'Pants', subcategory: 'Joggers', color: 'Gray', tags: ['joggers', 'fleece', 'tech', 'gray', 'grey', 'athleisure', 'sweatpants'] },
  { id: 'nike-hoodie-black', title: 'Sportswear Club Fleece Hoodie', brand: 'Nike', imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&q=80', price: 65, currency: 'USD', category: 'Hoodie', color: 'Black', tags: ['hoodie', 'black', 'fleece', 'pullover', 'casual'] },
  { id: 'nike-windrunner', title: 'Windrunner Jacket', brand: 'Nike', imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80', price: 100, currency: 'USD', category: 'Jacket', color: 'Black', tags: ['jacket', 'windbreaker', 'black', 'lightweight'] },
  { id: 'nike-am90', title: 'Air Max 90', brand: 'Nike', imageUrl: 'https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=600&q=80', price: 130, currency: 'USD', category: 'Sneakers', color: 'White', tags: ['sneakers', 'air max', 'white', 'retro', 'running'] },

  // ── Adidas ──
  { id: 'adidas-samba-og', title: 'Samba OG', brand: 'Adidas', imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&q=80', price: 100, currency: 'USD', category: 'Sneakers', color: 'White', tags: ['sneakers', 'samba', 'white', 'black', 'classic', 'leather'] },
  { id: 'adidas-ultraboost', title: 'Ultraboost 22', brand: 'Adidas', imageUrl: 'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=600&q=80', price: 190, currency: 'USD', category: 'Sneakers', color: 'Black', tags: ['sneakers', 'running', 'black', 'boost', 'ultraboost'] },
  { id: 'adidas-hoodie-grey', title: 'Essentials Fleece Hoodie', brand: 'Adidas', imageUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&q=80', price: 55, currency: 'USD', category: 'Hoodie', color: 'Gray', tags: ['hoodie', 'grey', 'gray', 'fleece', 'essential', 'pullover'] },
  { id: 'adidas-track-pants', title: 'Essentials 3-Stripes Pants', brand: 'Adidas', imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600&q=80', price: 45, currency: 'USD', category: 'Pants', subcategory: 'Track pants', color: 'Black', tags: ['pants', 'track', 'black', 'three stripes', 'athletic'] },

  // ── Uniqlo ──
  { id: 'uniqlo-oxford-white', title: 'Oxford Slim-Fit Shirt', brand: 'Uniqlo', imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736c10?w=600&q=80', price: 30, currency: 'USD', category: 'Shirt', color: 'White', tags: ['shirt', 'oxford', 'white', 'slim', 'button-down', 'dress shirt'] },
  { id: 'uniqlo-overshirt-brown', title: 'Flannel Overshirt', brand: 'Uniqlo', imageUrl: 'https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=600&q=80', price: 50, currency: 'USD', category: 'Shirt', subcategory: 'Overshirt', color: 'Brown', tags: ['overshirt', 'brown', 'flannel', 'layering', 'casual'] },
  { id: 'uniqlo-crew-tee-black', title: 'Supima Cotton Crew Neck T-Shirt', brand: 'Uniqlo', imageUrl: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&q=80', price: 15, currency: 'USD', category: 'T-shirt', color: 'Black', tags: ['t-shirt', 'tee', 'black', 'crew neck', 'basic', 'cotton'] },
  { id: 'uniqlo-crew-tee-white', title: 'Supima Cotton Crew Neck T-Shirt', brand: 'Uniqlo', imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80', price: 15, currency: 'USD', category: 'T-shirt', color: 'White', tags: ['t-shirt', 'tee', 'white', 'crew neck', 'basic', 'cotton'] },
  { id: 'uniqlo-chino-beige', title: 'Stretch Slim-Fit Chino Pants', brand: 'Uniqlo', imageUrl: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&q=80', price: 40, currency: 'USD', category: 'Pants', subcategory: 'Chinos', color: 'Beige', tags: ['chinos', 'beige', 'khaki', 'slim', 'stretch'] },
  { id: 'uniqlo-puffer-navy', title: 'Ultra Light Down Puffer Jacket', brand: 'Uniqlo', imageUrl: 'https://images.unsplash.com/photo-1544923246-77307dd270b1?w=600&q=80', price: 80, currency: 'USD', category: 'Jacket', subcategory: 'Puffer', color: 'Navy', tags: ['puffer', 'down', 'navy', 'blue', 'lightweight', 'winter'] },

  // ── Levi's ──
  { id: 'levis-501-original', title: '501 Original Fit Jeans', brand: "Levi's", imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80', price: 70, currency: 'USD', category: 'Jeans', color: 'Blue', tags: ['jeans', 'denim', 'blue', '501', 'original', 'straight', 'classic'] },
  { id: 'levis-511-slim', title: '511 Slim Fit Jeans', brand: "Levi's", imageUrl: 'https://images.unsplash.com/photo-1604176354204-9268737828e4?w=600&q=80', price: 70, currency: 'USD', category: 'Jeans', color: 'Dark Blue', tags: ['jeans', 'denim', 'dark', 'slim', '511', 'skinny'] },
  { id: 'levis-trucker-jacket', title: 'Trucker Jacket', brand: "Levi's", imageUrl: 'https://images.unsplash.com/photo-1601333144130-8cbb312386b6?w=600&q=80', price: 98, currency: 'USD', category: 'Jacket', subcategory: 'Denim Jacket', color: 'Blue', tags: ['jacket', 'denim', 'blue', 'trucker', 'classic'] },
  { id: 'levis-501-black', title: '501 Original Fit Jeans', brand: "Levi's", imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&q=80', price: 70, currency: 'USD', category: 'Jeans', color: 'Black', tags: ['jeans', 'denim', 'black', '501', 'original', 'straight'] },

  // ── Zara ──
  { id: 'zara-blazer-navy', title: 'Textured Suit Blazer', brand: 'Zara', imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80', price: 90, currency: 'USD', category: 'Blazer', color: 'Navy', tags: ['blazer', 'navy', 'suit', 'formal', 'textured'] },
  { id: 'zara-linen-shirt', title: 'Relaxed Fit Linen Shirt', brand: 'Zara', imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80', price: 50, currency: 'USD', category: 'Shirt', color: 'White', tags: ['shirt', 'linen', 'white', 'relaxed', 'summer'] },
  { id: 'zara-knit-sweater', title: 'Basic Knit Sweater', brand: 'Zara', imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80', price: 46, currency: 'USD', category: 'Sweater', color: 'Gray', tags: ['sweater', 'knit', 'grey', 'gray', 'crew neck', 'basic'] },
  { id: 'zara-bomber-jacket', title: 'Nylon Bomber Jacket', brand: 'Zara', imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80', price: 70, currency: 'USD', category: 'Jacket', subcategory: 'Bomber', color: 'Black', tags: ['bomber', 'jacket', 'black', 'nylon', 'casual'] },
  { id: 'zara-wide-pants', title: 'Wide-Leg Trousers', brand: 'Zara', imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80', price: 50, currency: 'USD', category: 'Pants', color: 'Black', tags: ['pants', 'trousers', 'wide-leg', 'black', 'dressy'] },

  // ── H&M ──
  { id: 'hm-oversized-tee', title: 'Oversized T-shirt', brand: 'H&M', imageUrl: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&q=80', price: 13, currency: 'USD', category: 'T-shirt', color: 'White', tags: ['t-shirt', 'tee', 'oversized', 'white', 'basic', 'cotton'] },
  { id: 'hm-slim-jeans-black', title: 'Slim Jeans', brand: 'H&M', imageUrl: 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=600&q=80', price: 25, currency: 'USD', category: 'Jeans', color: 'Black', tags: ['jeans', 'slim', 'black', 'denim', 'skinny'] },
  { id: 'hm-cardigan-cream', title: 'Knit Cardigan', brand: 'H&M', imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cda3a38?w=600&q=80', price: 35, currency: 'USD', category: 'Sweater', subcategory: 'Cardigan', color: 'Cream', tags: ['cardigan', 'cream', 'beige', 'knit', 'layering'] },
  { id: 'hm-shorts-khaki', title: 'Regular Fit Shorts', brand: 'H&M', imageUrl: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600&q=80', price: 18, currency: 'USD', category: 'Shorts', color: 'Khaki', tags: ['shorts', 'khaki', 'beige', 'regular', 'summer', 'casual'] },

  // ── COS ──
  { id: 'cos-wool-coat', title: 'Wool-Blend Overcoat', brand: 'COS', imageUrl: 'https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?w=600&q=80', price: 250, currency: 'USD', category: 'Coat', color: 'Camel', tags: ['coat', 'overcoat', 'camel', 'wool', 'winter', 'premium'] },
  { id: 'cos-wide-trousers', title: 'Wide-Leg Tailored Trousers', brand: 'COS', imageUrl: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600&q=80', price: 89, currency: 'USD', category: 'Pants', color: 'Black', tags: ['trousers', 'wide-leg', 'black', 'tailored', 'minimal'] },

  // ── Mango ──
  { id: 'mango-blazer-beige', title: 'Structured Linen Blazer', brand: 'Mango', imageUrl: 'https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=600&q=80', price: 120, currency: 'USD', category: 'Blazer', color: 'Beige', tags: ['blazer', 'beige', 'linen', 'structured', 'summer'] },
  { id: 'mango-dress-black', title: 'Midi Satin Dress', brand: 'Mango', imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80', price: 80, currency: 'USD', category: 'Dress', color: 'Black', tags: ['dress', 'black', 'midi', 'satin', 'elegant'] },

  // ── New Balance ──
  { id: 'nb-550-white', title: '550', brand: 'New Balance', imageUrl: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&q=80', price: 110, currency: 'USD', category: 'Sneakers', color: 'White', tags: ['sneakers', 'white', '550', 'retro', 'basketball'] },
  { id: 'nb-2002r-grey', title: '2002R', brand: 'New Balance', imageUrl: 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=600&q=80', price: 140, currency: 'USD', category: 'Sneakers', color: 'Gray', tags: ['sneakers', 'grey', 'gray', 'running', 'retro', '2002r'] },

  // ── Converse ──
  { id: 'converse-chuck-70-black', title: 'Chuck 70 High Top', brand: 'Converse', imageUrl: 'https://images.unsplash.com/photo-1494496195158-c3becb4f2475?w=600&q=80', price: 85, currency: 'USD', category: 'Sneakers', color: 'Black', tags: ['sneakers', 'chuck', 'high-top', 'black', 'canvas', 'classic'] },
  { id: 'converse-chuck-white', title: 'Chuck Taylor All Star', brand: 'Converse', imageUrl: 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=600&q=80', price: 60, currency: 'USD', category: 'Sneakers', color: 'White', tags: ['sneakers', 'chuck taylor', 'white', 'low-top', 'canvas'] },

  // ── Vans ──
  { id: 'vans-old-skool', title: 'Old Skool', brand: 'Vans', imageUrl: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&q=80', price: 70, currency: 'USD', category: 'Sneakers', color: 'Black', tags: ['sneakers', 'old skool', 'black', 'white', 'skate', 'classic'] },

  // ── Ralph Lauren ──
  { id: 'polo-pique-navy', title: 'Custom Slim Fit Piqué Polo', brand: 'Ralph Lauren', imageUrl: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=600&q=80', price: 110, currency: 'USD', category: 'Shirt', subcategory: 'Polo', color: 'Navy', tags: ['polo', 'navy', 'slim', 'pique', 'preppy', 'classic'] },
  { id: 'polo-cable-knit', title: 'Cable-Knit Cotton Sweater', brand: 'Ralph Lauren', imageUrl: 'https://images.unsplash.com/photo-1614975059251-992f11792571?w=600&q=80', price: 148, currency: 'USD', category: 'Sweater', color: 'Cream', tags: ['sweater', 'cable-knit', 'cream', 'cotton', 'preppy'] },

  // ── Tommy Hilfiger ──
  { id: 'tommy-flag-tee', title: 'Flag Logo T-Shirt', brand: 'Tommy Hilfiger', imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80', price: 40, currency: 'USD', category: 'T-shirt', color: 'White', tags: ['t-shirt', 'logo', 'white', 'casual', 'preppy'] },

  // ── Carhartt ──
  { id: 'carhartt-wip-hoodie', title: 'Hooded Chase Sweatshirt', brand: 'Carhartt WIP', imageUrl: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=600&q=80', price: 95, currency: 'USD', category: 'Hoodie', color: 'Green', tags: ['hoodie', 'green', 'workwear', 'streetwear', 'fleece'] },
  { id: 'carhartt-detroit-jacket', title: 'Detroit Jacket', brand: 'Carhartt WIP', imageUrl: 'https://images.unsplash.com/photo-1551318181-655e9748c0a1?w=600&q=80', price: 190, currency: 'USD', category: 'Jacket', color: 'Brown', tags: ['jacket', 'brown', 'workwear', 'detroit', 'canvas'] },

  // ── Patagonia ──
  { id: 'patagonia-better-sweater', title: 'Better Sweater Fleece Jacket', brand: 'Patagonia', imageUrl: 'https://images.unsplash.com/photo-1559551409-dadc959f76b8?w=600&q=80', price: 139, currency: 'USD', category: 'Jacket', subcategory: 'Fleece', color: 'Navy', tags: ['fleece', 'jacket', 'navy', 'outdoor', 'sustainable'] },

  // ── North Face ──
  { id: 'tnf-puffer-black', title: 'Nuptse Down Jacket', brand: 'The North Face', imageUrl: 'https://images.unsplash.com/photo-1547624643-3bf761b09502?w=600&q=80', price: 300, currency: 'USD', category: 'Jacket', subcategory: 'Puffer', color: 'Black', tags: ['puffer', 'down', 'black', 'nuptse', 'winter', 'warm'] },

  // ── Doc Martens ──
  { id: 'drmartens-1460-black', title: '1460 Smooth Leather Boots', brand: 'Dr. Martens', imageUrl: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=600&q=80', price: 170, currency: 'USD', category: 'Boots', color: 'Black', tags: ['boots', 'black', 'leather', '1460', 'lace-up', 'classic'] },

  // ── Birkenstock ──
  { id: 'birkenstock-arizona', title: 'Arizona Soft Footbed', brand: 'Birkenstock', imageUrl: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600&q=80', price: 135, currency: 'USD', category: 'Shoes', subcategory: 'Sandals', color: 'Brown', tags: ['sandals', 'brown', 'suede', 'summer', 'comfort'] },

  // ── Stüssy ──
  { id: 'stussy-stock-tee', title: 'Basic Stüssy Tee', brand: 'Stüssy', imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80', price: 40, currency: 'USD', category: 'T-shirt', color: 'Black', tags: ['t-shirt', 'black', 'streetwear', 'logo', 'skate'] },

  // ── General basics ──
  { id: 'gen-black-hoodie', title: 'Classic Black Hoodie', brand: 'Essentials', imageUrl: 'https://images.unsplash.com/photo-1509942774463-acf339cf87d5?w=600&q=80', price: 45, currency: 'USD', category: 'Hoodie', color: 'Black', tags: ['hoodie', 'black', 'basic', 'pullover', 'essential'] },
  { id: 'gen-white-sneakers', title: 'White Leather Sneakers', brand: 'Common Projects', imageUrl: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&q=80', price: 425, currency: 'USD', category: 'Sneakers', color: 'White', tags: ['sneakers', 'white', 'leather', 'minimal', 'premium', 'luxury'] },
  { id: 'gen-gray-sweatshirt', title: 'French Terry Crewneck Sweatshirt', brand: 'Champion', imageUrl: 'https://images.unsplash.com/photo-1578768079470-c937d3de8ce4?w=600&q=80', price: 50, currency: 'USD', category: 'Sweater', subcategory: 'Sweatshirt', color: 'Gray', tags: ['sweatshirt', 'grey', 'gray', 'crew neck', 'classic', 'fleece'] },
  { id: 'gen-leather-belt', title: 'Classic Leather Belt', brand: 'COS', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80', price: 59, currency: 'USD', category: 'Belt', color: 'Brown', tags: ['belt', 'leather', 'brown', 'classic', 'accessory'] },
  { id: 'gen-black-blazer', title: 'Slim Fit Black Blazer', brand: 'Zara', imageUrl: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=600&q=80', price: 90, currency: 'USD', category: 'Blazer', color: 'Black', tags: ['blazer', 'black', 'slim', 'formal', 'suit'] },
  { id: 'gen-white-shirt', title: 'Classic White Dress Shirt', brand: 'Charles Tyrwhitt', imageUrl: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=600&q=80', price: 70, currency: 'USD', category: 'Shirt', color: 'White', tags: ['shirt', 'white', 'dress', 'formal', 'button-down', 'classic'] },
  { id: 'gen-black-coat', title: 'Wool Overcoat', brand: 'COS', imageUrl: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=600&q=80', price: 225, currency: 'USD', category: 'Coat', color: 'Black', tags: ['coat', 'overcoat', 'black', 'wool', 'winter', 'formal'] },
  { id: 'gen-tote-bag', title: 'Canvas Tote Bag', brand: 'L.L.Bean', imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80', price: 30, currency: 'USD', category: 'Bag', color: 'Beige', tags: ['bag', 'tote', 'canvas', 'beige', 'casual'] },
  { id: 'gen-watch-minimal', title: 'Minimalist Watch', brand: 'Daniel Wellington', imageUrl: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&q=80', price: 179, currency: 'USD', category: 'Watch', color: 'Silver', tags: ['watch', 'silver', 'minimal', 'accessory', 'leather'] },
  { id: 'gen-denim-shorts', title: 'Denim Shorts', brand: "Levi's", imageUrl: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=600&q=80', price: 45, currency: 'USD', category: 'Shorts', color: 'Blue', tags: ['shorts', 'denim', 'blue', 'summer', 'casual'] },
  { id: 'gen-striped-tee', title: 'Breton Striped T-Shirt', brand: 'Saint James', imageUrl: 'https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?w=600&q=80', price: 80, currency: 'USD', category: 'T-shirt', color: 'White', tags: ['t-shirt', 'striped', 'breton', 'white', 'navy', 'french'] },
  { id: 'gen-polo-white', title: 'Cotton Polo Shirt', brand: 'Lacoste', imageUrl: 'https://images.unsplash.com/photo-1625910513413-5fc36d01ce27?w=600&q=80', price: 90, currency: 'USD', category: 'Shirt', subcategory: 'Polo', color: 'White', tags: ['polo', 'white', 'cotton', 'classic', 'casual'] },
  { id: 'gen-black-dress', title: 'Little Black Dress', brand: 'Mango', imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80', price: 60, currency: 'USD', category: 'Dress', color: 'Black', tags: ['dress', 'black', 'little black dress', 'elegant', 'classic'] },
  { id: 'gen-flannel-red', title: 'Plaid Flannel Shirt', brand: 'L.L.Bean', imageUrl: 'https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=600&q=80', price: 50, currency: 'USD', category: 'Shirt', color: 'Red', tags: ['shirt', 'flannel', 'plaid', 'red', 'casual', 'check'] },
  { id: 'gen-chino-navy', title: 'Slim Chino Pants', brand: 'J.Crew', imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&q=80', price: 80, currency: 'USD', category: 'Pants', subcategory: 'Chinos', color: 'Navy', tags: ['chinos', 'navy', 'slim', 'cotton', 'smart casual'] },
  { id: 'gen-sneakers-black', title: 'Black Running Sneakers', brand: 'Nike', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', price: 95, currency: 'USD', category: 'Sneakers', color: 'Red', tags: ['sneakers', 'red', 'running', 'athletic', 'sport'] },
  { id: 'gen-suit-charcoal', title: 'Charcoal Wool Suit', brand: 'Hugo Boss', imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80', price: 600, currency: 'USD', category: 'Suit', color: 'Gray', tags: ['suit', 'charcoal', 'gray', 'grey', 'wool', 'formal', 'business'] },
  { id: 'gen-skirt-midi', title: 'Pleated Midi Skirt', brand: 'COS', imageUrl: 'https://images.unsplash.com/photo-1583496661160-fb5886a0uj38?w=600&q=80', price: 99, currency: 'USD', category: 'Skirt', color: 'Black', tags: ['skirt', 'midi', 'pleated', 'black', 'elegant'] },
  { id: 'gen-leather-jacket', title: 'Leather Biker Jacket', brand: 'AllSaints', imageUrl: 'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?w=600&q=80', price: 380, currency: 'USD', category: 'Jacket', subcategory: 'Leather Jacket', color: 'Black', tags: ['leather', 'jacket', 'biker', 'black', 'premium', 'edgy'] },
  { id: 'gen-chelsea-boots', title: 'Chelsea Boots', brand: 'Clarks', imageUrl: 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=600&q=80', price: 150, currency: 'USD', category: 'Boots', color: 'Brown', tags: ['boots', 'chelsea', 'brown', 'suede', 'classic'] },
  { id: 'gen-crossbody-bag', title: 'Crossbody Bag', brand: 'COS', imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80', price: 79, currency: 'USD', category: 'Bag', color: 'Black', tags: ['bag', 'crossbody', 'black', 'leather', 'accessory'] },
  { id: 'gen-sunglasses', title: 'Wayfarer Sunglasses', brand: 'Ray-Ban', imageUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80', price: 161, currency: 'USD', category: 'Accessory', color: 'Black', tags: ['sunglasses', 'wayfarer', 'black', 'classic', 'accessory'] },
  { id: 'gen-cap-black', title: 'Baseball Cap', brand: 'New Era', imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=600&q=80', price: 35, currency: 'USD', category: 'Accessory', subcategory: 'Cap', color: 'Black', tags: ['cap', 'hat', 'baseball', 'black', 'casual', 'accessory'] },
  { id: 'gen-loafers-brown', title: 'Leather Loafers', brand: 'G.H. Bass', imageUrl: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&q=80', price: 110, currency: 'USD', category: 'Shoes', subcategory: 'Loafers', color: 'Brown', tags: ['loafers', 'brown', 'leather', 'classic', 'smart casual', 'shoes'] },
];

export const TRENDING_SEARCHES = [
  'Nike Air Force 1',
  'Levi\'s 501',
  'black hoodie',
  'white sneakers',
  'Zara blazer',
  'Uniqlo overshirt',
  'leather jacket',
  'Chelsea boots',
];
