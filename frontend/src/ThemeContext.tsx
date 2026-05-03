import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  palettes,
  ThemeName,
  Palette,
  fontPairs,
  FontPair,
} from "./theme";

type ThemeState = {
  c: Palette;
  themeName: ThemeName;
  setTheme: (t: ThemeName) => void;
  fontKey: FontPair;
  setFontKey: (f: FontPair) => void;
  f: typeof fontPairs["fraunces"];
};

const ThemeCtx = createContext<ThemeState | null>(null);

const THEME_KEY = "connect_theme";
const FONT_KEY = "connect_font";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>("warm");
  const [fontKey, setFontKeyState] = useState<FontPair>("fraunces");

  useEffect(() => {
    (async () => {
      const t = (await AsyncStorage.getItem(THEME_KEY)) as ThemeName | null;
      if (t && palettes[t]) setThemeName(t);
      const f = (await AsyncStorage.getItem(FONT_KEY)) as FontPair | null;
      if (f && fontPairs[f]) setFontKeyState(f);
    })();
  }, []);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeName(t);
    AsyncStorage.setItem(THEME_KEY, t).catch(() => {});
  }, []);

  const setFontKey = useCallback((f: FontPair) => {
    setFontKeyState(f);
    AsyncStorage.setItem(FONT_KEY, f).catch(() => {});
  }, []);

  const value = useMemo<ThemeState>(
    () => ({
      c: palettes[themeName],
      themeName,
      setTheme,
      fontKey,
      setFontKey,
      f: fontPairs[fontKey],
    }),
    [themeName, fontKey, setTheme, setFontKey],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeState {
  const v = useContext(ThemeCtx);
  if (!v) {
    // fallback so any accidental-out-of-provider calls don't crash
    return {
      c: palettes.warm,
      themeName: "warm",
      setTheme: () => {},
      fontKey: "fraunces",
      setFontKey: () => {},
      f: fontPairs.fraunces,
    };
  }
  return v;
}
