// Returns the user's current browser timezone (IANA string, e.g. 'Africa/Maputo').
export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Returns today's date as YYYY-MM-DD in the user's local timezone.
// Use everywhere instead of new Date().toISOString().slice(0, 10) (which gives UTC date).
export function todayLocal(tz?: string): string {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: tz ?? browserTimezone(),
  });
}

// Returns yesterday's date as YYYY-MM-DD in the user's local timezone.
export function yesterdayLocal(tz?: string): string {
  return new Date(Date.now() - 86_400_000).toLocaleDateString('sv-SE', {
    timeZone: tz ?? browserTimezone(),
  });
}
