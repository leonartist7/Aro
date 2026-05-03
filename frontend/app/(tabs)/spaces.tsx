import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Palette, radius, spacing } from "../../src/theme";
import { useTheme } from "../../src/ThemeContext";
import { useAuth } from "../../src/AuthContext";
import Avatar from "../../src/Avatar";

export default function SpacesScreen() {
  const router = useRouter();
  const { c, f } = useTheme();
  const { user } = useAuth();
  const styles = makeStyles(c, f);

  const placeholders = [
    { icon: "people-outline" as const, title: "Group rooms", sub: "Weekend planning with the close ones." },
    { icon: "musical-notes-outline" as const, title: "Shared playback", sub: "Listen together, pause together." },
    { icon: "book-outline" as const, title: "Book clubs", sub: "A quiet shelf to talk over pages." },
    { icon: "cafe-outline" as const, title: "Daily rituals", sub: "A warm check-in for the ones you love." },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.push("/you")} style={styles.profileBtn} testID="profile-button">
          <Avatar name={user?.name} seed={user?.id} size={40} />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.kicker}>Phase two</Text>
          <Text style={styles.title}>Spaces</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="planet-outline" size={28} color={c.primaryDark} />
          </View>
          <Text style={styles.heroTitle}>Rooms with a little more room.</Text>
          <Text style={styles.heroBody}>
            Spaces are small, intentional rooms for the people and moments that deserve them. Shared
            playback, group presence, gentle check-ins.
          </Text>
          <View style={styles.soonPill}>
            <Ionicons name="sparkles-outline" size={14} color={c.primaryDark} />
            <Text style={styles.soonText}>Coming in Phase 2</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>What you&apos;ll be able to build</Text>
        <View style={styles.grid}>
          {placeholders.map((p) => (
            <View key={p.title} style={styles.card} testID={`space-card-${p.title}`}>
              <View style={styles.cardIcon}>
                <Ionicons name={p.icon} size={22} color={c.primaryDark} />
              </View>
              <Text style={styles.cardTitle}>{p.title}</Text>
              <Text style={styles.cardSub}>{p.sub}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.waitlist, pressed && { opacity: 0.85 }]}
          testID="spaces-waitlist"
        >
          <Ionicons name="notifications-outline" size={16} color={c.textInverse} />
          <Text style={styles.waitlistText}>Nudge me when Spaces opens</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette, f: any) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    profileBtn: { width: 40, height: 40, borderRadius: 20, overflow: "hidden" },
    titleBlock: { flex: 1, alignItems: "center" },
    kicker: {
      fontFamily: f.bodyMedium,
      fontSize: 11,
      color: c.textTertiary,
      letterSpacing: 1.4,
      textTransform: "uppercase",
      marginBottom: 2,
    },
    title: { fontFamily: f.heading, fontSize: 22, color: c.text, letterSpacing: -0.3 },
    scroll: { padding: spacing.lg, paddingBottom: 140 },
    hero: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      alignItems: "flex-start",
      marginBottom: spacing.xl,
    },
    heroIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: c.primaryBgSubtle,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
    },
    heroTitle: {
      fontFamily: f.heading,
      fontSize: 28,
      color: c.text,
      letterSpacing: -0.5,
      lineHeight: 34,
      marginBottom: spacing.sm,
    },
    heroBody: {
      fontFamily: f.body,
      fontSize: 15,
      color: c.textSecondary,
      lineHeight: 22,
      marginBottom: spacing.md,
    },
    soonPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.primaryBgSubtle,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    soonText: { fontFamily: f.bodyBold, fontSize: 12, color: c.primaryDark, letterSpacing: 0.2 },
    sectionTitle: {
      fontFamily: f.bodyBold,
      fontSize: 13,
      color: c.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 1.3,
      marginBottom: spacing.md,
      marginLeft: spacing.xs,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    card: {
      width: "47%",
      flexGrow: 1,
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      padding: spacing.md,
      minHeight: 140,
    },
    cardIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: c.primaryBgSubtle,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.sm,
    },
    cardTitle: { fontFamily: f.heading, fontSize: 18, color: c.text, marginBottom: 4 },
    cardSub: { fontFamily: f.body, fontSize: 12, color: c.textSecondary, lineHeight: 18 },
    waitlist: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.primary,
      paddingVertical: 14,
      borderRadius: radius.lg,
    },
    waitlistText: { color: c.textInverse, fontFamily: f.bodyBold, fontSize: 15 },
  });
