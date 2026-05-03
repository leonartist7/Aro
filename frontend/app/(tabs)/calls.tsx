import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, User } from "../../src/api";
import { colors, fonts, radius, spacing } from "../../src/theme";
import Avatar from "../../src/Avatar";

type Call = {
  id: string;
  duration_sec: number;
  status: "completed" | "missed" | "outgoing" | "incoming";
  initiator_id: string;
  members: string[];
  created_at: string;
  other: User | null;
};

function dur(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function dateLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function CallsScreen() {
  const router = useRouter();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Call[]>("/calls");
      setCalls(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.kicker}>History</Text>
        <Text style={styles.title}>Calls</Text>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No calls yet</Text>
              <Text style={styles.emptyText}>
                Open a chat and tap the call icon to start.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                item.other && router.push(`/call/${item.other.id}`)
              }
              style={({ pressed }) => [
                styles.row,
                pressed && { backgroundColor: colors.primaryBgSubtle },
              ]}
              testID={`call-row-${item.id}`}
            >
              <Avatar name={item.other?.name} seed={item.other?.id} size={48} />
              <View style={styles.rowMain}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.other?.name || "Unknown"}
                </Text>
                <View style={styles.rowSubLine}>
                  <Ionicons
                    name={item.status === "missed" ? "call-outline" : "checkmark-circle-outline"}
                    size={14}
                    color={item.status === "missed" ? colors.error : colors.success}
                  />
                  <Text style={styles.rowSub}>
                    {item.status === "missed" ? "Missed" : `${dur(item.duration_sec)}`}
                    {"  ·  "}
                    {dateLabel(item.created_at)}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  if (item.other) router.push(`/call/${item.other.id}`);
                }}
                style={styles.callBtn}
                testID={`call-back-${item.id}`}
              >
                <Ionicons name="call-outline" size={18} color={colors.primary} />
              </Pressable>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  kicker: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textTertiary,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: { fontFamily: fonts.heading, fontSize: 32, color: colors.text, letterSpacing: -0.5 },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
    borderRadius: radius.lg,
  },
  rowMain: { flex: 1 },
  rowName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  rowSubLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  rowSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryBgSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  sep: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg, opacity: 0.5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { padding: spacing.xl, alignItems: "center" },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, marginBottom: 6 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
