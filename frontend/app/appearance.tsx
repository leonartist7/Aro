import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "../src/ThemeContext";
import { Palette, palettes, ThemeName, themeMeta, radius, spacing, fontPairs, FontPair } from "../src/theme";

export default function AppearanceScreen() {
  const router = useRouter();
  const { c, f, themeName, setTheme, fontKey, setFontKey } = useTheme();
  const styles = makeStyles(c, f);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.back} testID="appearance-back">
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </Pressable>
        <Text style={styles.topTitle}>Appearance</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heroTitle}>Make it feel like yours.</Text>
        <Text style={styles.heroBody}>Every surface, chosen for warmth.</Text>

        {/* Live preview card */}
        <View style={styles.previewCard}>
          <Text style={styles.previewKicker}>Live preview</Text>
          <View style={styles.previewBubbleRow}>
            <View style={[styles.previewBubble, { backgroundColor: c.surface, alignSelf: "flex-start" }]}>
              <Text style={styles.previewText}>morning ☀️ how did it go?</Text>
            </View>
          </View>
          <View style={styles.previewBubbleRow}>
            <View
              style={[
                styles.previewBubble,
                { backgroundColor: c.surfaceElevated, alignSelf: "flex-end" },
              ]}
            >
              <Text style={styles.previewText}>slow and quiet, just how I like.</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Palette</Text>
        <View style={styles.themeGrid}>
          {themeMeta.map((t) => {
            const p = palettes[t.name];
            const selected = t.name === themeName;
            return (
              <Pressable
                key={t.name}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setTheme(t.name as ThemeName);
                }}
                style={({ pressed }) => [
                  styles.themeCard,
                  { backgroundColor: p.surface, borderColor: selected ? p.primary : "transparent" },
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
                testID={`theme-${t.name}`}
              >
                <View style={styles.swatchRow}>
                  <View style={[styles.swatch, { backgroundColor: p.bg }]} />
                  <View style={[styles.swatch, { backgroundColor: p.surfaceElevated }]} />
                  <View style={[styles.swatch, { backgroundColor: p.primary }]} />
                  <View style={[styles.swatch, { backgroundColor: p.primaryDark }]} />
                </View>
                <View style={styles.themeMeta}>
                  <Text style={[styles.themeLabel, { color: p.text }]}>{t.label}</Text>
                  <Text style={[styles.themeTag, { color: p.textSecondary }]}>{t.tagline}</Text>
                </View>
                {selected ? (
                  <View style={[styles.checkDot, { backgroundColor: p.primary }]}>
                    <Ionicons name="checkmark" size={14} color={p.textInverse} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Typography</Text>
        <View style={styles.fontList}>
          {(Object.keys(fontPairs) as FontPair[]).map((key) => {
            const pair = fontPairs[key];
            const selected = key === fontKey;
            return (
              <Pressable
                key={key}
                onPress={() => setFontKey(key)}
                style={({ pressed }) => [
                  styles.fontRow,
                  selected && { borderColor: c.primary },
                  pressed && { opacity: 0.9 },
                ]}
                testID={`font-${key}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fontSample, { fontFamily: pair.heading }]}>A quieter place.</Text>
                  <Text style={[styles.fontLabel, { fontFamily: pair.body }]}>{pair.label}</Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    { borderColor: selected ? c.primary : c.border },
                  ]}
                >
                  {selected ? <View style={[styles.radioDot, { backgroundColor: c.primary }]} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.footnote}>
          Your theme and font are saved to this device and applied everywhere.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette, f: any) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    back: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
    },
    topTitle: { fontFamily: f.heading, fontSize: 18, color: c.text },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
    heroTitle: {
      fontFamily: f.heading,
      fontSize: 30,
      color: c.text,
      letterSpacing: -0.5,
      marginBottom: 6,
    },
    heroBody: {
      fontFamily: f.body,
      fontSize: 15,
      color: c.textSecondary,
      marginBottom: spacing.lg,
    },
    previewCard: {
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.xl,
      padding: spacing.md,
      marginBottom: spacing.xl,
    },
    previewKicker: {
      fontFamily: f.bodyMedium,
      fontSize: 10,
      color: c.textTertiary,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: spacing.sm,
    },
    previewBubbleRow: { marginBottom: 8 },
    previewBubble: {
      maxWidth: "80%",
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 20,
    },
    previewText: { fontFamily: f.body, fontSize: 14, color: c.text },
    sectionTitle: {
      fontFamily: f.bodyBold,
      fontSize: 12,
      color: c.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 1.3,
      marginBottom: spacing.sm,
      marginLeft: spacing.xs,
    },
    themeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    themeCard: {
      width: "47%",
      flexGrow: 1,
      borderRadius: radius.xl,
      padding: spacing.md,
      borderWidth: 2,
      minHeight: 130,
    },
    swatchRow: { flexDirection: "row", gap: 4, marginBottom: spacing.md },
    swatch: { flex: 1, height: 28, borderRadius: 8 },
    themeMeta: { marginTop: "auto" },
    themeLabel: { fontFamily: f.heading, fontSize: 18, marginBottom: 2 },
    themeTag: { fontFamily: f.body, fontSize: 11 },
    checkDot: {
      position: "absolute",
      top: spacing.md,
      right: spacing.md,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    fontList: { gap: spacing.sm, marginBottom: spacing.lg },
    fontRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 2,
      borderColor: "transparent",
      gap: spacing.md,
    },
    fontSample: { fontSize: 20, color: c.text, letterSpacing: -0.3, marginBottom: 2 },
    fontLabel: { fontSize: 12, color: c.textSecondary },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    radioDot: { width: 10, height: 10, borderRadius: 5 },
    footnote: {
      marginTop: spacing.md,
      textAlign: "center",
      color: c.textTertiary,
      fontFamily: f.body,
      fontSize: 12,
    },
  });
