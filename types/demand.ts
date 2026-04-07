export type DemandSignal = {
  id: string;
  query: string;
  normalizedQuery: string;
  category?: string;
  brand?: string;
  color?: string;
  size?: string;
  count: number;
  demandScore: number;
  createdAt: string;
  updatedAt: string;
};

export type ClosetSellOpportunity = {
  id: string;
  closetItemId: string;
  demandSignalId?: string;
  title: string;
  message: string;
  estimatedResaleValue?: number;
  demandLevel: 'low' | 'medium' | 'high';
  reason: string;
  createdAt: string;
  dismissedUntil?: string;
};
