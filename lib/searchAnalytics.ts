type SearchEvent =
  | 'search_to_add_opened'
  | 'search_query_submitted'
  | 'search_result_clicked'
  | 'search_item_added'
  | 'search_item_add_failed'
  | 'search_empty_state_seen';

interface EventPayload {
  query?: string;
  productId?: string;
  brand?: string;
  category?: string;
  resultCount?: number;
  error?: string;
}

export function trackSearchEvent(event: SearchEvent, payload?: EventPayload): void {
  console.log(`[SearchAnalytics] ${event}`, payload ?? '');
}
