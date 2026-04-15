import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '@/constants/theme';

describe('Theme constants — NAV-03 dark mode assertions', () => {
  describe('COLORS', () => {
    it('COLORS.background is pure black (#000000)', () => {
      expect(COLORS.background).toBe('#000000');
    });

    it('COLORS.backgroundAlt is near-black (#0A0A0A)', () => {
      expect(COLORS.backgroundAlt).toBe('#0A0A0A');
    });

    it('COLORS.surface is dark surface (#121214) per Phase 20 revamp', () => {
      expect(COLORS.surface).toBe('#121214');
    });

    it('COLORS.surfaceElevated is the hero-card surface (#18181B)', () => {
      expect(COLORS.surfaceElevated).toBe('#18181B');
    });

    it('COLORS.text is white (#FFFFFF)', () => {
      expect(COLORS.text).toBe('#FFFFFF');
    });

    it('COLORS.textSecondary is muted gray (#8E8E93)', () => {
      expect(COLORS.textSecondary).toBe('#8E8E93');
    });

    it('COLORS.primary is sage green (#87A878) per D-03', () => {
      expect(COLORS.primary).toBe('#87A878');
    });

    it('COLORS.primaryDark is the deep-green accent (#2E4A2A) per Phase 20 revamp', () => {
      expect(COLORS.primaryDark).toBe('#2E4A2A');
    });

    it('background role colors do NOT use white (#FFFFFF) as a background', () => {
      // NAV-03: no light backgrounds allowed
      expect(COLORS.background).not.toBe('#FFFFFF');
      expect(COLORS.backgroundAlt).not.toBe('#FFFFFF');
      expect(COLORS.surface).not.toBe('#FFFFFF');
    });
  });

  describe('SPACING', () => {
    it('SPACING.xs is 4 (4px base scale per D-02)', () => {
      expect(SPACING.xs).toBe(4);
    });

    it('SPACING.sm is 8', () => {
      expect(SPACING.sm).toBe(8);
    });

    it('SPACING.md is 12', () => {
      expect(SPACING.md).toBe(12);
    });

    it('SPACING.lg is 16', () => {
      expect(SPACING.lg).toBe(16);
    });
  });

  describe('RADIUS', () => {
    it('RADIUS.sm is 6 per Phase 20 revamp', () => {
      expect(RADIUS.sm).toBe(6);
    });

    it('RADIUS.md is 10 per Phase 20 revamp', () => {
      expect(RADIUS.md).toBe(10);
    });

    it('RADIUS.lg is 14 per Phase 20 revamp', () => {
      expect(RADIUS.lg).toBe(14);
    });

    it('RADIUS.xl is 20 per Phase 20 revamp', () => {
      expect(RADIUS.xl).toBe(20);
    });

    it('RADIUS.xxl is 28 (hero cards + ring container)', () => {
      expect(RADIUS.xxl).toBe(28);
    });

    it('RADIUS.pill is 999 (floating nav bar)', () => {
      expect(RADIUS.pill).toBe(999);
    });
  });

  describe('TYPOGRAPHY', () => {
    it('TYPOGRAPHY.size.sm is 13 (tab label size)', () => {
      expect(TYPOGRAPHY.size.sm).toBe(13);
    });

    it('TYPOGRAPHY.size.lg is 17 (heading size)', () => {
      expect(TYPOGRAPHY.size.lg).toBe(17);
    });

    it('TYPOGRAPHY.weight.regular is "400"', () => {
      expect(TYPOGRAPHY.weight.regular).toBe('400');
    });

    it('TYPOGRAPHY.weight.semibold is "600"', () => {
      expect(TYPOGRAPHY.weight.semibold).toBe('600');
    });
  });
});
