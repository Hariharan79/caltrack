import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '@/constants/theme';

describe('Theme constants — NAV-03 dark mode assertions', () => {
  describe('COLORS', () => {
    it('COLORS.background is pure black (#000000)', () => {
      expect(COLORS.background).toBe('#000000');
    });

    it('COLORS.backgroundAlt is near-black (#0A0A0A)', () => {
      expect(COLORS.backgroundAlt).toBe('#0A0A0A');
    });

    it('COLORS.surface is dark surface (#1C1C1E)', () => {
      expect(COLORS.surface).toBe('#1C1C1E');
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

    it('COLORS.primaryDark is phthalo green (#123524) per D-04', () => {
      expect(COLORS.primaryDark).toBe('#123524');
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
    it('RADIUS.sm is 4', () => {
      expect(RADIUS.sm).toBe(4);
    });

    it('RADIUS.md is 8', () => {
      expect(RADIUS.md).toBe(8);
    });

    it('RADIUS.lg is 12', () => {
      expect(RADIUS.lg).toBe(12);
    });

    it('RADIUS.xl is 16', () => {
      expect(RADIUS.xl).toBe(16);
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
