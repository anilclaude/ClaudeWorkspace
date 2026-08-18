/** Normalizes an email for storage and lookup — comparison is case-insensitive. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Sleep, for backoff. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Exponential backoff delay for attempt N (1-based), capped. */
export function backoffMs(attempt: number, baseMs = 100, capMs = 5000): number {
  return Math.min(capMs, baseMs * 2 ** attempt);
}
