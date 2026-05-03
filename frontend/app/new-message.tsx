import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, User } from "../src/api";
import { colors, fonts, radius, spacing } from "../src/theme";
import Avatar from "../src/Avatar";

export default function NewMessage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers(await api.get<User[]>("/users"));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = users.filter((u) =>
    [u.name, u.email].some((s) => s.toLowerCase().includes(q.toLowerCase())),
  );

  async function startChat(u: User) {
    if (creating) return;
    setCreating(true);
    try {
      const c = await api.post<{ id: string }>("/chats", { other_user_id: u.id });
      router.replace(`/chat/${c.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>New message</Text>
        <Pressable onPress={() => router.back()} style={styles.close} testID="new-msg-close">
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search someone"
          placeholderTextColor={colors.textTertiary}
          style={styles.search}
          testID="new-msg-search"
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => startChat(item)}
              style={({ pressed }) => [
                styles.row,
                pressed && { backgroundColor: colors.primaryBgSubtle },
              ]}
              testID={`user-${item.id}`}
            >
              <Avatar name={item.name} seed={item.id} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.email}>{item.email}</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.textTertiary} />
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: colors.textSecondary, fontFamily: fonts.body }}>
                No one matches.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontFamily: fonts.heading, fontSize: 26, color: colors.text },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    height: 48,
  },
  search: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text },
  list: { paddingHorizontal: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  name: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  email: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
});
