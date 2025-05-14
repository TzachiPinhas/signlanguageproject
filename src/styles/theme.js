// Theme configuration for the Sign Language App
// This file contains colors, typography, and common styles to maintain consistency

// Light theme colors
const LIGHT_COLORS = {
  // Primary colors
  primary: '#4c6ef5',      // Main brand color (blue)
  primaryDark: '#3b5bdb',  // Darker shade for pressed states
  primaryLight: '#dbe4ff', // Lighter shade for backgrounds

  // Secondary accent colors
  accent: '#4ade80',       // Green for success states
  warning: '#fcc419',      // Yellow for warnings
  error: '#fa5252',        // Red for errors

  // Neutrals
  background: '#f8f9fa',   // Light background
  card: '#ffffff',         // Card/container background
  text: '#2a3a4c',         // Primary text
  textSecondary: '#5d7083', // Secondary text
  textMuted: '#9ca3af',    // Muted/hint text
  
  // UI Elements
  border: '#e9ecef',       // Border color
  divider: '#f1f3f5',      // Divider lines
  inactive: '#d1d1d6',     // Inactive state
  shadow: 'rgba(0, 0, 0, 0.08)' // Shadow color
};

// Dark theme colors
const DARK_COLORS = {
  // Primary colors
  primary: '#5c7cfa',      // Main brand color (brighter blue for dark mode)
  primaryDark: '#4263eb',  // Darker shade for pressed states
  primaryLight: '#364fc7', // Darker shade for backgrounds in dark mode

  // Secondary accent colors
  accent: '#51cf66',       // Green for success states
  warning: '#ffc078',      // Yellow for warnings
  error: '#ff6b6b',        // Red for errors

  // Neutrals
  background: '#1a1c20',   // Dark background
  card: '#2a2d35',         // Card/container background
  text: '#f1f3f5',         // Primary text
  textSecondary: '#e9ecef', // Secondary text
  textMuted: '#adb5bd',    // Muted/hint text
  
  // UI Elements
  border: '#343a40',       // Border color
  divider: '#343a40',      // Divider lines
  inactive: '#6c757d',     // Inactive state
  shadow: 'rgba(0, 0, 0, 0.25)' // Shadow color
};

// Default is light theme
export let COLORS = LIGHT_COLORS;

// Function to toggle theme
export const toggleTheme = (isDarkMode) => {
  COLORS = isDarkMode ? DARK_COLORS : LIGHT_COLORS;
  return COLORS;
};

// Get current theme colors
export const getThemeColors = (isDarkMode) => {
  return isDarkMode ? DARK_COLORS : LIGHT_COLORS;
};

export const TYPOGRAPHY = {
  // Font weights
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  
  // Font sizes
  heading1: 28,
  heading2: 24,
  heading3: 20,
  body: 16,
  bodySmall: 14,
  caption: 12,
};

export const SPACING = {
  tiny: 4,
  small: 8,
  medium: 16,
  large: 24,
  extraLarge: 32,
  huge: 48,
};

export const LAYOUTS = {
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: SPACING.large,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
};

export const SHADOWS = {
  small: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const BUTTONS = {
  primary: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.large,
    borderRadius: 12,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  secondary: {
    backgroundColor: COLORS.card,
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.large,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    ...SHADOWS.small,
  },
  textButton: {
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
  },
  icon: {
    fontSize: 22,
    marginBottom: SPACING.tiny,
  },
  text: {
    color: COLORS.card,
    fontSize: TYPOGRAPHY.body,
    fontWeight: TYPOGRAPHY.semiBold,
  },
  textSecondary: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.body,
    fontWeight: TYPOGRAPHY.semiBold,
  },
};

export const CARDS = {
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.large,
    ...SHADOWS.medium,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.medium,
  },
  iconContainer: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    marginRight: SPACING.medium,
  },
};