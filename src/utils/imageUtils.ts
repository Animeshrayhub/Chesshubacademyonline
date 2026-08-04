/**
 * Utility to process and fix image URLs, including auto-converting Google Drive sharing links
 * into direct, publicly viewable image CDN URLs.
 */
export function fixGoogleDriveUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Handle Google Drive file/d/ID/view format
  if (trimmed.includes('drive.google.com') && trimmed.includes('/file/d/')) {
    const idMatch = trimmed.match(/\/file\/d\/([^\/]+)/);
    if (idMatch && idMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
    }
  }

  // Handle Google Drive id=ID format
  if (trimmed.includes('drive.google.com') && trimmed.includes('id=')) {
    const idMatch = trimmed.match(/id=([^&]+)/);
    if (idMatch && idMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
    }
  }

  // Handle Google Drive uc?id=ID format
  if (trimmed.includes('drive.google.com') && trimmed.includes('uc?')) {
    const idMatch = trimmed.match(/id=([^&]+)/);
    if (idMatch && idMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
    }
  }

  return trimmed;
}
