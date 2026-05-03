import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, Message, User } from "../../src/api";
import { colors, fonts, radius, spacing } from "../../src/theme";

type FileMsg = Message & { sender: User | null };

const SECTIONS = ["Recent", "By person", "Categories"] as const;
type Section = (typeof SECTIONS)[number];

const CATEGORIES: { key: "image" | "file" | "voice"; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "image", label: "Images", icon: "image-outline" },
  { key: "file", label: "Documents", icon: "document-text-outline" },
  { key: "voice", label: "Audio", icon: "musical-notes-outline" },
];

function fmtBytes(b?: number | null) {
  if (!b) return "";
  if (b > 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  if (b > 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${b} B`;
}

function dateLabel(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function FilesScreen() {
  const [section, setSection] = useState<Section>("Recent");
  const [files, setFiles] = useState<FileMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<null | "image" | "file" | "voice">(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<FileMsg[]>("/files");
      setFiles(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const byPerson = useMemo(() => {
    const map = new Map<string, { user: User; items: FileMsg[] }>();
    for (const f of files) {
      if (!f.sender) continue;
      const k = f.sender.id;
      if (!map.has(k)) map.set(k, { user: f.sender, items: [] });
      map.get(k)!.items.push(f);
    }
    return Array.from(map.values());
  }, [files]);

  const filtered = useMemo(() => {
    if (section === "Categories" && activeCat) return files.filter((f) => f.type === activeCat);
    return files;
  }, [files, section, activeCat]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Library</Text>
        <Text style={styles.title}>Files</Text>
      </View>

      <View style={styles.segmentRow}>
        {SECTIONS.map((s) => (
          <Pressable
            key={s}
            onPress={() => {
              setSection(s);
              setActiveCat(null);
            }}
            style={[styles.segment, section === s && styles.segmentActive]}
            testID={`files-segment-${s}`}
          >
            <Text style={[styles.segmentText, section === s && styles.segmentTextActive]}>
              {s}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : section === "Categories" && !activeCat ? (
        <ScrollView contentContainerStyle={styles.catGrid}>
          {CATEGORIES.map((c) => {
            const count = files.filter((f) => f.type === c.key).length;
            return (
              <Pressable
                key={c.key}
                onPress={() => setActiveCat(c.key)}
                style={({ pressed }) => [
                  styles.catCard,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
                testID={`category-${c.key}`}
              >
                <View style={styles.catIcon}>
                  <Ionicons name={c.icon} size={26} color={colors.primaryDark} />
                </View>
                <Text style={styles.catLabel}>{c.label}</Text>
                <Text style={styles.catCount}>{count} items</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : section === "By person" ? (
        <FlatList
          data={byPerson}
          keyExtractor={(p) => p.user.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.personCard}>
              <Text style={styles.personName}>{item.user.name}</Text>
              <Text style={styles.personMeta}>{item.items.length} items</Text>
              <View style={styles.personFiles}>
                {item.items.slice(0, 3).map((f) => (
                  <FileRow key={f.id} f={f} />
                ))}
              </View>
            </View>
          )}
          ListEmptyComponent={<EmptyHint label="No shared files yet." />}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(f) => f.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <FileRow f={item} showSender />}
          ListEmptyComponent={<EmptyHint label="Nothing here yet." />}
          ListHeaderComponent={
            section === "Categories" && activeCat ? (
              <Pressable onPress={() => setActiveCat(null)} style={styles.backLink}>
                <Ionicons name="chevron-back" size={16} color={colors.primary} />
                <Text style={styles.backText}>All categories</Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function FileRow({ f, showSender = false }: { f: FileMsg; showSender?: boolean }) {
  const icon =
    f.type === "image" ? "image-outline" : f.type === "voice" ? "musical-notes-outline" : "document-text-outline";
  const title =
    f.file_name || (f.type === "voice" ? "Voice message" : f.type === "image" ? "Image" : "File");
  return (
    <View style={styles.fileRow}>
      <View style={styles.fileIcon}>
        <Ionicons name={icon as any} size={20} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.fileTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.fileSub} numberOfLines={1}>
          {showSender && f.sender ? `${f.sender.name} · ` : ""}
          {fmtBytes(f.file_size) || dateLabel(f.created_at)}
        </Text>
      </View>
      <Text style={styles.fileDate}>{dateLabel(f.created_at)}</Text>
    </View>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  kicker: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textTertiary,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: { fontFamily: fonts.heading, fontSize: 32, color: colors.text, letterSpacing: -0.5 },
  segmentRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  segment: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textSecondary, fontFamily: fonts.bodyMedium, fontSize: 13 },
  segmentTextActive: { color: colors.textInverse },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryBgSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  fileTitle: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  fileSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  fileDate: { fontFamily: fonts.body, fontSize: 12, color: colors.textTertiary },
  catGrid: {
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  catCard: {
    width: "48%",
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    justifyContent: "space-between",
  },
  catIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primaryBgSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: { fontFamily: fonts.heading, fontSize: 22, color: colors.text },
  catCount: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  personCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  personName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  personMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  personFiles: { marginTop: spacing.sm, gap: spacing.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { padding: spacing.xl, alignItems: "center" },
  emptyText: { fontFamily: fonts.body, color: colors.textSecondary },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  backText: { color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 14, marginLeft: 4 },
});
