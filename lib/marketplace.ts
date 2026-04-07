import { MarketplaceOrder } from '@/types';

export const PLATFORM_FEE_RATE = 0.1;

export function calculateMarketplaceFees(price: number): {
  platformFee: number;
  sellerPayout: number;
} {
  const safePrice = Math.max(0, price || 0);
  const platformFee = Math.round(safePrice * PLATFORM_FEE_RATE * 100) / 100;
  const sellerPayout = Math.round((safePrice - platformFee) * 100) / 100;
  return { platformFee, sellerPayout };
}

export function canAutoCompleteOrder(order: MarketplaceOrder): boolean {
  if (order.status !== 'shipped') return false;
  const shippedAt = new Date(order.createdAt).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - shippedAt > sevenDaysMs;
}
