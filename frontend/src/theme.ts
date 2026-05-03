// Connect — Theme presets (warm, low blue-light)
// Exports presets + a simple type. The `useTheme()` hook lives in ThemeContext.

export type ThemeName = "warm" | "dune" | "evening" | "charcoal";

export type Palette = {
  bg: string;
  surface: string;
  surfaceElevated: string;
  overlay: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryBgSubtle: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  border: string;
  error: string;
  errorBg: string;
  success: string;
  // flag to tweak tab bar icon/text contrast in dark themes
  isDark: boolean;
};

// Warm — the default. Cream, beige, soft gold, brown.
const warm: Palette = {
  bg: "#FBF9F6",
  surface: "#F2EFE9",
  surfaceElevated: "#EBE6DC",
  overlay: "rgba(60, 53, 45, 0.4)",
  primary: "#A98C70",
  primaryDark: "#8C7158",
  primaryLight: "#C3AB95",
  primaryBgSubtle: "#F0EAE3",
  text: "#3C352D",
  textSecondary: "#8B8276",
  textTertiary: "#AFA79D",
  textInverse: "#FBF9F6",
  border: "#E6E1D6",
  error: "#C47365",
  errorBg: "#F6E8E6",
  success: "#738061",
  isDark: false,
};

// Dune — lighter, more sand/ivory, softer primary.
const dune: Palette = {
  bg: "#F7F3EC",
  surface: "#EFE8DB",
  surfaceElevated: "#E6DDCB",
  overlay: "rgba(80, 66, 52, 0.4)",
  primary: "#C29C6B",
  primaryDark: "#A07F54",
  primaryLight: "#DCBE95",
  primaryBgSubtle: "#F1E6D4",
  text: "#4A3F32",
  textSecondary: "#8E8270",
  textTertiary: "#B2A58F",
  textInverse: "#FAF6EE",
  border: "#DDD3BF",
  error: "#C17A5C",
  errorBg: "#F4E4DA",
  success: "#7A8868",
  isDark: false,
};

// Evening — dusk mode, deep walnut and muted brass.
const evening: Palette = {
  bg: "#2B2520",
  surface: "#3A3229",
  surfaceElevated: "#4A4036",
  overlay: "rgba(0, 0, 0, 0.5)",
  primary: "#D4B792",
  primaryDark: "#B89773",
  primaryLight: "#E7D1AE",
  primaryBgSubtle: "#4A4036",
  text: "#F0E8DC",
  textSecondary: "#B9AC9A",
  textTertiary: "#85796A",
  textInverse: "#2B2520",
  border: "#4A4036",
  error: "#D98F7A",
  errorBg: "#4A332C",
  success: "#A3AE88",
  isDark: true,
};

// Charcoal — ink + parchment, for readers.
const charcoal: Palette = {
  bg: "#1E1B17",
  surface: "#2A2520",
  surfaceElevated: "#372F28",
  overlay: "rgba(0, 0, 0, 0.55)",
  primary: "#E8D9BF",
  primaryDark: "#BFAD8E",
  primaryLight: "#F4E9D3",
  primaryBgSubtle: "#372F28",
  text: "#F2EADB",
  textSecondary: "#A9A090",
  textTertiary: "#716858",
  textInverse: "#1E1B17",
  border: "#372F28",
  error: "#D8897A",
  errorBg: "#3C2A25",
  success: "#9EB085",
  isDark: true,
};

export const palettes: Record<ThemeName, Palette> = {
  warm,
  dune,
  evening,
  charcoal,
};

export const themeMeta: { name: ThemeName; label: string; tagline: string }[] = [
  { name: "warm", label: "Warm", tagline: "Cream and soft gold" },
  { name: "dune", label: "Dune", tagline: "Sun-warmed ivory" },
  { name: "evening", label: "Evening", tagline: "Walnut and brass" },
  { name: "charcoal", label: "Charcoal", tagline: "Ink and parchment" },
];

// Back-compat default export (warm) for any file that imports { colors }.
export const colors: Palette = warm;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  full: 9999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export type FontPair = "fraunces" | "serifed" | "sans";

export const fontPairs: Record<
  FontPair,
  { heading: string; headingRegular: string; body: string; bodyMedium: string; bodyBold: string; label: string }
> = {
  fraunces: {
    heading: "Fraunces_600SemiBold",
    headingRegular: "Fraunces_400Regular",
    body: "DMSans_400Regular",
    bodyMedium: "DMSans_500Medium",
    bodyBold: "DMSans_600SemiBold",
    label: "Fraunces · DM Sans",
  },
  serifed: {
    heading: "Fraunces_400Regular",
    headingRegular: "Fraunces_400Regular",
    body: "Fraunces_400Regular",
    bodyMedium: "Fraunces_600SemiBold",
    bodyBold: "Fraunces_600SemiBold",
    label: "Fraunces all the way",
  },
  sans: {
    heading: "DMSans_600SemiBold",
    headingRegular: "DMSans_500Medium",
    body: "DMSans_400Regular",
    bodyMedium: "DMSans_500Medium",
    bodyBold: "DMSans_600SemiBold",
    label: "DM Sans only",
  },
};

// Default (for static imports that still use `fonts`).
export const fonts = fontPairs.fraunces;

export const shadows = {
  soft: {
    shadowColor: "#3C352D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  elevated: {
    shadowColor: "#3C352D",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 6,
  },
};
