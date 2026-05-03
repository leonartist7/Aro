import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/AuthContext";
import { colors, fonts, radius, spacing } from "../../src/theme";
import Avatar from "../../src/Avatar";

export default function YouScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  function confirmSignOut() {
    if (Platform.OS === "web") {
      signOut().then(() => router.replace("/login"));
      return;
    }
    Alert.alert("Sign out", "You can sign back in any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  }

  const items: { icon: keyof typeof Ionicons.glyphMap; label: string; sub: string }[] = [
    { icon: "color-palette-outline", label: "Appearance", sub: "Calm · warm" },
    { icon: "notifications-outline", label: "Notifications", sub: "Quiet hours on" },
    { icon: "lock-closed-outline", label: "Privacy", sub: "End-to-end is coming" },
    { icon: "sparkles-outline", label: "Spaces (soon)", sub: "Shared rooms in Phase 2" },
    { icon: "help-circle-outline", label: "Help & feedback", sub: "We read everything" },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Account</Text>
          <Text style={styles.title}>You</Text>
        </View>

        <View style={styles.profileCard}>
          <Avatar name={user?.name} seed={user?.id} size={72} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
          </View>
        </View>

        <View style={styles.list}>
          {items.map((it) => (
            <Pressable
              key={it.label}
              style={({ pressed }) => [
                styles.row,
                pressed && { backgroundColor: colors.primaryBgSubtle },
              ]}
              testID={`settings-${it.label}`}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={it.icon} size={18} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{it.label}</Text>
                <Text style={styles.rowSub}>{it.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>

        <Pressable onPress={confirmSignOut} style={styles.signOut} testID="sign-out-btn">
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>

        <Text style={styles.version}>Connect · v0.1 · made quietly</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.lg },
  kicker: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textTertiary,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: { fontFamily: fonts.heading, fontSize: 32, color: colors.text, letterSpacing: -0.5 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
  },
  name: { fontFamily: fonts.heading, fontSize: 22, color: colors.text },
  email: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  bio: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 8 },
  list: { backgroundColor: colors.surface, borderRadius: radius.xl, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primaryBgSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  rowSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.errorBg,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
  },
  signOutText: { color: colors.error, fontFamily: fonts.bodyBold, fontSize: 15 },
  version: {
    textAlign: "center",
    color: colors.textTertiary,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: spacing.xl,
  },
});
