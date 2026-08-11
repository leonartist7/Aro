// Connect — Theme presets (warm, low blue-light)
// Exports presets + a simple type. The `useTheme()` hook lives in ThemeContext.

export type ThemeName = "warm" | "dune" | "honey" | "rose" | "sage" | "evening" | "charcoal" | "cocoa" | "moon";

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

// Honey — golden hour, warm amber and cream.
const honey: Palette = {
  bg: "#FBF6EC",
  surface: "#F4EBD9",
  surfaceElevated: "#EBDCC0",
  overlay: "rgba(74, 56, 28, 0.4)",
  primary: "#C9913D",
  primaryDark: "#A8762E",
  primaryLight: "#E0B96F",
  primaryBgSubtle: "#F6EBD6",
  text: "#4A3824",
  textSecondary: "#9C8A6E",
  textTertiary: "#BAA98B",
  textInverse: "#FBF6EC",
  border: "#E8DCC2",
  error: "#C47365",
  errorBg: "#F6E8E6",
  success: "#7A8A5C",
  isDark: false,
};

// Rose — soft blush and quiet mornings.
const rose: Palette = {
  bg: "#FDF8F6",
  surface: "#F8ECE9",
  surfaceElevated: "#F1DCD8",
  overlay: "rgba(90, 45, 45, 0.4)",
  primary: "#C77F8F",
  primaryDark: "#A75F72",
  primaryLight: "#E3B3BE",
  primaryBgSubtle: "#F7E7E7",
  text: "#4A3336",
  textSecondary: "#9E8589",
  textTertiary: "#BCA6AA",
  textInverse: "#FDF8F6",
  border: "#EDDCDD",
  error: "#C05656",
  errorBg: "#F8E3E1",
  success: "#7A8A5C",
  isDark: false,
};

// Sage — muted green calm, like a quiet garden.
const sage: Palette = {
  bg: "#F6F8F2",
  surface: "#ECF0E6",
  surfaceElevated: "#DEE4D2",
  overlay: "rgba(48, 66, 44, 0.4)",
  primary: "#7E8F68",
  primaryDark: "#63734F",
  primaryLight: "#A9BA93",
  primaryBgSubtle: "#EDF1E3",
  text: "#3A4032",
  textSecondary: "#858C79",
  textTertiary: "#A4AC97",
  textInverse: "#F6F8F2",
  border: "#DCE3D2",
  error: "#C47365",
  errorBg: "#F6E8E6",
  success: "#5F8A5F",
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

// Cocoa — deep chocolate, warm and enveloping.
const cocoa: Palette = {
  bg: "#241A12",
  surface: "#35281D",
  surfaceElevated: "#473728",
  overlay: "rgba(0, 0, 0, 0.5)",
  primary: "#D9B58B",
  primaryDark: "#B79167",
  primaryLight: "#EBD2B0",
  primaryBgSubtle: "#473728",
  text: "#F1E8DA",
  textSecondary: "#BCAD98",
  textTertiary: "#8A7B67",
  textInverse: "#241A12",
  border: "#473728",
  error: "#D98F7A",
  errorBg: "#4A332C",
  success: "#A3AE88",
  isDark: true,
};

// Moon — slate-blue night for late readers.
const moon: Palette = {
  bg: "#1B2026",
  surface: "#262D35",
  surfaceElevated: "#323B46",
  overlay: "rgba(0, 0, 0, 0.55)",
  primary: "#9FB6C9",
  primaryDark: "#7D97AD",
  primaryLight: "#BFD0DE",
  primaryBgSubtle: "#323B46",
  text: "#E8EDF2",
  textSecondary: "#A7B3BE",
  textTertiary: "#77838F",
  textInverse: "#1B2026",
  border: "#323B46",
  error: "#D8897A",
  errorBg: "#3C2A25",
  success: "#9EB085",
  isDark: true,
};

export const palettes: Record<ThemeName, Palette> = {
  warm,
  dune,
  honey,
  rose,
  sage,
  evening,
  charcoal,
  cocoa,
  moon,
};

export const themeMeta: { name: ThemeName; label: string; tagline: string }[] = [
  { name: "warm", label: "Warm", tagline: "Cream and soft gold" },
  { name: "dune", label: "Dune", tagline: "Sun-warmed ivory" },
  { name: "honey", label: "Honey", tagline: "Golden hour, always" },
  { name: "rose", label: "Rose", tagline: "Blush and quiet mornings" },
  { name: "sage", label: "Sage", tagline: "Soft green calm" },
  { name: "evening", label: "Evening", tagline: "Walnut and brass" },
  { name: "charcoal", label: "Charcoal", tagline: "Ink and parchment" },
  { name: "cocoa", label: "Cocoa", tagline: "Deep, warm chocolate" },
  { name: "moon", label: "Moon", tagline: "Slate-blue night" },
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
