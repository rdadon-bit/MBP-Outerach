// Pacific-time helpers. All scheduling is anchored to America/Los_Angeles
// so DST is handled correctly regardless of server timezone.

const PT = "America/Los_Angeles";

function ptParts(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: PT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) p[part.type] = part.value;
  return {
    year: +p.year,
    month: +p.month,
    day: +p.day,
    hour: +p.hour % 24,
    minute: +p.minute,
  };
}

/** Current UTC offset of Pacific time in minutes (e.g. -420 for PDT). */
function ptOffsetMinutes(d: Date): number {
  const local = ptParts(d);
  const asUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  return Math.round((asUtc - d.getTime()) / 60000);
}

/** Date object for today's date in PT at the given PT hour:minute. */
export function ptToday(hour: number, minute = 0): Date {
  const now = new Date();
  const { year, month, day } = ptParts(now);
  // first guess using current offset, then correct (handles DST edges)
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute) - ptOffsetMinutes(now) * 60000);
  guess = new Date(Date.UTC(year, month - 1, day, hour, minute) - ptOffsetMinutes(guess) * 60000);
  return guess;
}

/** YYYY-MM-DD string for today's date in PT. */
export function ptDateString(d = new Date()): string {
  const { year, month, day } = ptParts(d);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isWeekdayPT(d = new Date()): boolean {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: PT, weekday: "short" }).format(d);
  return !["Sat", "Sun"].includes(wd);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000);
}

/**
 * Spread n sends evenly across the PT window [startHour, endHour),
 * with light jitter so sends don't look robotic.
 */
export function spreadAcrossWindow(n: number, startHour: number, endHour: number): Date[] {
  if (n <= 0) return [];
  const start = ptToday(startHour).getTime();
  const end = ptToday(endHour).getTime();
  const span = end - start;
  const step = span / n;
  const out: Date[] = [];
  for (let i = 0; i < n; i++) {
    const jitter = (Math.random() - 0.5) * step * 0.5;
    out.push(new Date(start + i * step + step / 2 + jitter));
  }
  return out;
}
