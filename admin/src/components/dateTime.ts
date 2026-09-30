const pad = (value: number) => String(value).padStart(2, "0");

// Keep the database's local wall-clock time; never convert through UTC.
export function localDateTime(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
export function parseDateTime(value: string): Date | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match
    .slice(1)
    .map((part) => Number(part || 0));
  if (year < 1000 || year > 9999) return null;
  const date = new Date(year, month - 1, day, hour, minute, second);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute &&
    date.getSeconds() === second
    ? date
    : null;
}
export function monthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from(
    { length: 42 },
    (_, index) => new Date(year, month, 1 - offset + index),
  );
}
export function shiftMonth(date: Date, amount: number): Date {
  const next = new Date(
    date.getFullYear(),
    date.getMonth() + amount,
    1,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  );
  next.setDate(
    Math.min(
      date.getDate(),
      new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate(),
    ),
  );
  return next;
}
