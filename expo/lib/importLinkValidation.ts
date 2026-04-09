export function isValidImportLink(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function inferImportLinkSource(url: string): 'instagram' | 'tiktok' | 'pinterest' | 'web' | 'unsupported' {
  const lower = url.toLowerCase();
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('tiktok.com')) return 'tiktok';
  if (lower.includes('pinterest.com') || lower.includes('pin.it')) return 'pinterest';
  if (lower.startsWith('http://') || lower.startsWith('https://')) return 'web';
  return 'unsupported';
}
