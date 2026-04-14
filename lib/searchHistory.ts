import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SEARCHES_KEY = 'mirrormuse_recent_searches';
const MAX_RECENT = 10;

export async function getRecentSearches(): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function addRecentSearch(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return await getRecentSearches();

  try {
    const existing = await getRecentSearches();
    const filtered = existing.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
    const updated = [trimmed, ...filtered].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [trimmed];
  }
}

export async function removeRecentSearch(query: string): Promise<string[]> {
  try {
    const existing = await getRecentSearches();
    const updated = existing.filter(s => s !== query);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export async function clearRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    console.log('[SearchHistory] Failed to clear recent searches');
  }
}
