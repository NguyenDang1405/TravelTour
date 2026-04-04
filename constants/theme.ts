export const COLORS = {
  // Primary colors
  primary: "#0EA5E9", // Sky blue - travel theme
  primaryDark: "#0284C7", // Darker blue for hover states
  primaryLight: "#38BDF8", // Lighter blue for accents
  secondary: "#06B6D4", // Cyan
  secondaryDark: "#0891B2",
  
  // Background colors
  background: "#F8FAFC", // Light gray background
  backgroundDark: "#0F172A", // Dark background (for dark mode)
  surface: "#FFFFFF", // White cards
  surfaceLight: "#F1F5F9", // Light gray for subtle backgrounds
  surfaceDark: "#1E293B", // Dark surface
  
  // Text colors
  text: "#0F172A", // Dark text
  textSecondary: "#475569", // Medium gray text
  textTertiary: "#94A3B8", // Light gray text
  textInverse: "#FFFFFF", // White text for dark backgrounds
  
  // Status colors
  success: "#10B981", // Green
  successLight: "#D1FAE5",
  error: "#EF4444", // Red
  errorLight: "#FEE2E2",
  warning: "#F59E0B", // Orange
  warningLight: "#FEF3C7",
  info: "#3B82F6", // Blue
  infoLight: "#DBEAFE",
  
  // Neutral colors
  white: "#FFFFFF",
  black: "#000000",
  grey: "#64748B", // Slate gray
  greyLight: "#CBD5E1",
  greyDark: "#334155",
  
  // Border colors
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  borderDark: "#CBD5E1",
} as const;

// Spacing scale
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Border radius
export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

// Typography
export const TYPOGRAPHY = {
  h1: {
    fontSize: 32,
    fontWeight: '800' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  captionBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
} as const;

// Shadows
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
