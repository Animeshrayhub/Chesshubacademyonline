type ClassValue = string | undefined | null | false | Record<string, boolean>;

/**
 * Merges Tailwind class names conditionally.
 * Lightweight alternative to clsx for this project.
 */
export function cn(...classes: ClassValue[]): string {
  return classes
    .flatMap((c) => {
      if (!c) return [];
      if (typeof c === 'string') return [c];
      return Object.entries(c)
        .filter(([, v]) => v)
        .map(([k]) => k);
    })
    .join(' ');
}
