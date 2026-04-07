export type MarketplaceListing = {
  id: string;
  sellerId: string;
  closetItemId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  condition: 'new' | 'excellent' | 'good' | 'fair';
  brand?: string;
  size?: string;
  category: string;
  color?: string;
  images: string[];
  status: 'active' | 'sold' | 'cancelled';
  createdAt: string;
  updatedAt: string;
};

export type MarketplaceOrder = {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  price: number;
  platformFee: number;
  sellerPayout: number;
  status:
    | 'pending_payment'
    | 'paid'
    | 'awaiting_shipment'
    | 'shipped'
    | 'delivered'
    | 'completed'
    | 'cancelled';
  paymentIntentId?: string;
  trackingNumber?: string;
  createdAt: string;
};

export type SellerProfile = {
  userId: string;
  rating: number;
  totalSales: number;
  responseTime: string;
  joinDate: string;
  stripeAccountId?: string;
};

export type DonationRecommendation = {
  closetItemId: string;
  organizationName?: string;
  itemCategory: string;
  suggestedReason: string;
};

export type MarketplaceSearchQuery = {
  id: string;
  query: string;
  timestamp: string;
  category?: string;
  brand?: string;
  size?: string;
  color?: string;
  userId?: string;
};

export type DemandLevel = 'low' | 'medium' | 'high';

export type DemandInsight = {
  queryKey: string;
  query: string;
  score: number;
  frequency: number;
  demandLevel: DemandLevel;
  category?: string;
  brand?: string;
  size?: string;
  color?: string;
};

export type DemandNotification = {
  id: string;
  createdAt: string;
  closetItemId: string;
  queryKey: string;
  message: string;
  demandLevel: DemandLevel;
  estimatedResaleValue: number;
  seen?: boolean;
};
