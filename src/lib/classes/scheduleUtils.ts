/**
 * Schedule & Date Utilities for ChessHub Classes
 * Pure utility functions safe for both Client and Server Components.
 */

/**
 * Normalizes input date strings into a valid ISO 8601 string.
 * Supports ISO strings, locale datetime formats (DD-MM-YYYY, DD/MM/YYYY, etc.).
 */
export function normalizeToIsoDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();

  // Try standard parse
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  // Try DD-MM-YYYY HH:mm or DD/MM/YYYY HH:mm
  const dmyMatch = dateStr.match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[\sT](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
  );
  if (dmyMatch) {
    const [, d, m, y, h = '0', min = '0', s = '0'] = dmyMatch;
    const constructed = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(h),
      Number(min),
      Number(s)
    );
    if (!isNaN(constructed.getTime())) {
      return constructed.toISOString();
    }
  }

  return dateStr;
}

/**
 * Generates an array of ISO dates for recurring weekly schedule.
 */
export function generateRecurringDates(
  initialDateStr: string,
  daysOfWeek: number[], // 0 = Sun, 1 = Mon, ..., 6 = Sat
  totalWeeks: number
): string[] {
  const normalizedStr = normalizeToIsoDate(initialDateStr);
  const initialDate = new Date(normalizedStr);
  if (isNaN(initialDate.getTime())) return [initialDateStr];

  const dates: string[] = [];
  const hours = initialDate.getHours();
  const minutes = initialDate.getMinutes();

  for (let week = 0; week < totalWeeks; week++) {
    for (const day of daysOfWeek) {
      const d = new Date(initialDate);
      const dayDiff = day - initialDate.getDay();
      d.setDate(initialDate.getDate() + dayDiff + week * 7);
      d.setHours(hours, minutes, 0, 0);

      if (d.getTime() >= initialDate.getTime() - 60000) {
        dates.push(d.toISOString());
      }
    }
  }

  const uniqueSorted = Array.from(new Set(dates)).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );
  return uniqueSorted.length > 0 ? uniqueSorted : [initialDateStr];
}
