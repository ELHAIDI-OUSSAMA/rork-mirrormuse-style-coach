export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  try {
    const normalized = path || '';
    const decoded = decodeURIComponent(normalized);
    const asUrl = decoded.startsWith('http') ? new URL(decoded) : null;
    const sharedUrl =
      asUrl?.searchParams.get('url') ||
      asUrl?.searchParams.get('sourceUrl') ||
      asUrl?.searchParams.get('text') ||
      (decoded.startsWith('http') ? decoded : '');
    const mediaUrl = asUrl?.searchParams.get('mediaUrl') || asUrl?.searchParams.get('media') || '';
    const thumbnailUrl = asUrl?.searchParams.get('thumbnail') || asUrl?.searchParams.get('thumbnailUrl') || '';
    const postUrl = asUrl?.searchParams.get('postUrl') || '';
    if (sharedUrl) {
      const params = new URLSearchParams();
      params.set('sourceUrl', sharedUrl);
      if (mediaUrl) params.set('mediaUrl', mediaUrl);
      if (thumbnailUrl) params.set('thumbnailUrl', thumbnailUrl);
      if (postUrl) params.set('postUrl', postUrl);
      return `/imported-outfit?${params.toString()}`;
    }
  } catch (error) {
    console.log('[NativeIntent] redirect parse error:', error);
  }
  return '/';
}