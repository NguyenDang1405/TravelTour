import { StyleSheet, Platform } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';

// Shared button styles
export const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: COLORS.primaryDark,
          transform: 'translateY(-1px)',
          ...SHADOWS.lg,
        },
        ':active': {
          transform: 'translateY(0)',
        },
      },
    }),
  },
  primaryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  secondary: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          borderColor: COLORS.primary,
          backgroundColor: COLORS.surfaceLight,
        },
      },
    }),
  },
  secondaryText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  outline: {
    backgroundColor: 'transparent',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: `${COLORS.primary}10`,
        },
      },
    }),
  },
  outlineText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

// Shared card styles
export const cardStyles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
    ...Platform.select({
      web: {
        transition: 'all 0.3s ease',
        ':hover': {
          ...SHADOWS.lg,
          transform: 'translateY(-2px)',
        },
      },
    }),
  },
  elevated: {
    ...SHADOWS.lg,
  },
  bordered: {
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
});

// Shared input styles
export const inputStyles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    ...Platform.select({
      web: {
        outline: 'none',
        transition: 'all 0.2s ease',
        ':focus': {
          borderColor: COLORS.primary,
          boxShadow: `0 0 0 3px ${COLORS.primary}20`,
        },
      },
    }),
  },
  error: {
    borderColor: COLORS.error,
    ...Platform.select({
      web: {
        ':focus': {
          borderColor: COLORS.error,
          boxShadow: `0 0 0 3px ${COLORS.errorLight}`,
        },
      },
    }),
  },
  disabled: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.borderLight,
    opacity: 0.6,
  },
});

// Shared text styles
export const textStyles = StyleSheet.create({
  h1: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.text,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  captionBold: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textTertiary,
    lineHeight: 16,
  },
});

// Shared container styles
export const containerStyles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
  },
  card: {
    ...cardStyles.base,
    marginBottom: SPACING.md,
  },
});

// Shared navigation styles
export const navStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...Platform.select({
      web: {
        position: 'sticky',
        top: 0,
        zIndex: 100,
        ...SHADOWS.sm,
      },
    }),
  },
  link: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    ...Platform.select({
      web: {
        transition: 'color 0.2s ease',
      },
    }),
  },
  linkTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});

