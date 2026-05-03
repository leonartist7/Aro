import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api, Chat } from "../../src/api";
import { colors, fonts, radius, spacing } from "../../src/theme";
import Avatar from "../../src/Avatar";
import RadialMenu, { RadialAction } from "../../src/RadialMenu";

function timeAgo(iso?: string) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function previewText(chat: Chat) {
  const lm = chat.last_message;
  if (!lm) return "Start a conversation";
  if (lm.type === "text") return lm.text || "";
  if (lm.type === "voice") return "Voice message";
  if (lm.type === "image") return "Photo";
  if (lm.type === "file") return lm.file_name || "File";
  return "";
}

export default function HomeScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Chat[]>("/chats");
      setChats(data);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const radialActions: RadialAction[] = [
    {
      key: "new-message",
      label: "New message",
      icon: "chatbubble-ellipses-outline",
      onPress: () => router.push("/new-message"),
    },
    {
      key: "voice-memo",
      label: "Voice memo",
      icon: "mic-outline",
      onPress: () => router.push("/new-message?mode=voice"),
    },
    {
      key: "share-file",
      label: "Send file",
      icon: "document-attach-outline",
      onPress: () => router.push("/new-message?mode=file"),
    },
    {
      key: "shared-space",
      label: "Shared space",
      icon: "sparkles-outline",
      onPress: () => {
        // Phase 2 placeholder
      },
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Today</Text>
          <Text style={styles.title}>Connect</Text>
        </View>
        <Pressable
          onPress={() => router.push("/new-message")}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            setMenuOpen(true);
          }}
          delayLongPress={220}
          style={({ pressed }) => [
            styles.fab,
            pressed && { transform: [{ scale: 0.96 }] },
          ]}
          testID="quick-action-button"
        >
          <Ionicons name="add" size={26} color={colors.textInverse} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyText}>Tap the + to start one.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/chat/${item.id}`)}
              style={({ pressed }) => [
                styles.row,
                pressed && { backgroundColor: colors.primaryBgSubtle },
              ]}
              testID={`chat-row-${item.id}`}
            >
              <Avatar name={item.other?.name} seed={item.other?.id} size={52} />
              <View style={styles.rowMain}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {item.other?.name || "Unknown"}
                  </Text>
                  <Text style={styles.rowTime}>{timeAgo(item.updated_at)}</Text>
                </View>
                <Text style={styles.rowPreview} numberOfLines={1}>
                  {previewText(item)}
                </Text>
              </View>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}

      <RadialMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        actions={radialActions}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  kicker: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textTertiary,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 32,
    color: colors.text,
    letterSpacing: -0.5,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
    borderRadius: radius.lg,
  },
  rowMain: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowName: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  rowTime: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textTertiary,
  },
  rowPreview: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sep: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg, opacity: 0.5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { padding: spacing.xl, alignItems: "center" },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
