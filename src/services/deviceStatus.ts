export const READING_FRESHNESS_MS = 5 * 60 * 1000;
export function isReadingFresh(timestamp: number, now = Date.now()): boolean {
  return Number.isFinite(timestamp) && timestamp > 0 && timestamp <= now && now - timestamp <= READING_FRESHNESS_MS;
}
