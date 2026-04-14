import { COPY } from '@/lib/copy';

// Exclamation marks are banned except in ironic cases. Ironic uses must be
// flagged with /* ironic */ in the string table. As of Phase 19 there are none.
const ALLOWED_EXCLAMATIONS = new Set<string>([]);

function collectStrings(node: unknown, path = ''): { path: string; value: string }[] {
  if (typeof node === 'string') {
    return [{ path, value: node }];
  }
  if (typeof node === 'function') {
    // Call with neutral args to smoke-test formatters.
    try {
      const out = (node as (...args: unknown[]) => unknown)(0, 'x', 'y');
      if (typeof out === 'string') return [{ path, value: out }];
    } catch {
      // formatters that require specific arg shapes are skipped
    }
    return [];
  }
  if (node && typeof node === 'object') {
    return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
      collectStrings(v, path ? `${path}.${k}` : k)
    );
  }
  return [];
}

describe('COPY table', () => {
  it('exposes the expected top-level sections', () => {
    expect(COPY.auth).toBeDefined();
    expect(COPY.today).toBeDefined();
    expect(COPY.history).toBeDefined();
    expect(COPY.profile).toBeDefined();
    expect(COPY.foods).toBeDefined();
    expect(COPY.log).toBeDefined();
    expect(COPY.entries).toBeDefined();
    expect(COPY.errors).toBeDefined();
  });

  it('carries the D-22 flagship empty states verbatim', () => {
    expect(COPY.today.emptyEntries).toBe('An empty log. What a glorious, untouched canvas.');
  });

  it('exposes core strings and formatters', () => {
    expect(typeof COPY.auth.signIn.submit).toBe('string');
    expect(typeof COPY.log.sheet.titleAdd).toBe('string');
    expect(typeof COPY.log.sheet.titleEdit).toBe('string');
    expect(typeof COPY.profile.openLibraryWithCount).toBe('function');
    expect(COPY.profile.openLibraryWithCount(5)).toBe('Food library (5)');
    expect(typeof COPY.totals.remaining).toBe('function');
    expect(COPY.totals.remaining(123)).toContain('123');
    expect(typeof COPY.entries.deleteLabel).toBe('function');
    expect(COPY.entries.deleteLabel('Oats')).toBe('Delete Oats');
  });

  it('contains no exclamation marks (except flagged ironic cases)', () => {
    const strings = collectStrings(COPY);
    const violations = strings.filter(
      (s) => s.value.includes('!') && !ALLOWED_EXCLAMATIONS.has(s.path)
    );
    expect(violations).toEqual([]);
  });

  it('errors state what to do next, never "An error occurred"', () => {
    const strings = collectStrings(COPY.errors);
    for (const { value } of strings) {
      expect(value.toLowerCase()).not.toContain('an error occurred');
      expect(value.toLowerCase()).not.toContain('unknown error');
    }
  });
});
