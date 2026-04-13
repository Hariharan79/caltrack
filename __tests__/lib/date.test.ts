import { dayKey, todayKey, parseDayKey, formatDayLabel, formatTime } from '@/lib/date';

describe('dayKey', () => {
  it('returns YYYY-MM-DD in local time', () => {
    const d = new Date(2026, 3, 13, 14, 30, 0); // April 13, 2026 local
    expect(dayKey(d)).toBe('2026-04-13');
  });

  it('zero-pads single-digit months and days', () => {
    const d = new Date(2026, 0, 5, 9, 0, 0); // Jan 5
    expect(dayKey(d)).toBe('2026-01-05');
  });

  it('handles end-of-year correctly', () => {
    const d = new Date(2026, 11, 31, 23, 59, 59);
    expect(dayKey(d)).toBe('2026-12-31');
  });
});

describe('todayKey', () => {
  it('matches dayKey(new Date())', () => {
    expect(todayKey()).toBe(dayKey(new Date()));
  });

  it('returns a string in YYYY-MM-DD shape', () => {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('parseDayKey', () => {
  it('round-trips with dayKey', () => {
    const original = new Date(2026, 5, 15);
    const key = dayKey(original);
    const parsed = parseDayKey(key);
    expect(dayKey(parsed)).toBe(key);
  });

  it('parses Jan 1', () => {
    const date = parseDayKey('2026-01-01');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(1);
  });
});

describe('formatDayLabel', () => {
  it('returns "Today" when key matches now', () => {
    const now = new Date(2026, 3, 13);
    expect(formatDayLabel('2026-04-13', now)).toBe('Today');
  });

  it('returns "Yesterday" for one day before now', () => {
    const now = new Date(2026, 3, 13);
    expect(formatDayLabel('2026-04-12', now)).toBe('Yesterday');
  });

  it('returns a weekday/month/day string for older keys', () => {
    const now = new Date(2026, 3, 13);
    const label = formatDayLabel('2026-04-01', now);
    expect(label).not.toBe('Today');
    expect(label).not.toBe('Yesterday');
    expect(label.length).toBeGreaterThan(0);
  });
});

describe('formatTime', () => {
  it('renders an hour:minute string from an ISO timestamp', () => {
    const iso = new Date(2026, 3, 13, 14, 35).toISOString();
    const result = formatTime(iso);
    expect(result).toMatch(/\d/);
    expect(result.length).toBeGreaterThan(0);
  });
});
