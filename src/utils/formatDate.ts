/**
 * Formats an ISO date string into a human-readable format.
 * Example: "2024-03-15" → "March 15, 2024"
 */
export function formatDate(dateString: string | Date): string {
  if (!dateString) return '';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(dateString: string | Date): string {
  if (!dateString) return '';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Returns reading time estimate.
 * Assumes 200 words per minute average reading speed.
 */
export function getReadingTime(content: string): string {
  const wordCount = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(wordCount / 200);
  return `${minutes} min read`;
}
