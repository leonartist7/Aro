import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "./theme";

export function VoiceMessageBubble({
  durationMs,
  outgoing,
}: {
  durationMs: number;
  outgoing: boolean;
}) {
  const seconds = Math.max(1, Math.round(durationMs / 1000));
  const bars = 22;
  // deterministic pseudo-waveform
  const heights = Array.from({ length: bars }, (_, i) => {
    const h = Math.abs(Math.sin(i * 1.7 + seconds)) * 16 + 6;
    return h;
  });
  return (
    <View style={styles.voiceWrap}>
      <Pressable style={styles.playBtn}>
        <Ionicons name="play" size={14} color={colors.textInverse} />
      </Pressable>
      <View style={styles.waveform}>
        {heights.map((h, i) => (
          <View
            key={i}
            style={{
              width: 2.5,
              height: h,
              borderRadius: 2,
              marginHorizontal: 1.5,
              backgroundColor: i < bars * 0.4 ? colors.primary : colors.border,
            }}
          />
        ))}
      </View>
      <Text style={styles.voiceTime}>0:{seconds.toString().padStart(2, "0")}</Text>
    </View>
  );
}

export function FilePreviewCard({
  fileName,
  fileSize,
  type,
}: {
  fileName?: string | null;
  fileSize?: number | null;
  type: "file" | "image";
}) {
  const icon = type === "image" ? "image-outline" : "document-text-outline";
  const sizeLabel = fileSize
    ? fileSize > 1024
      ? `${(fileSize / 1024).toFixed(1)} KB`
      : `${fileSize} B`
    : "";
  return (
    <View style={styles.fileWrap}>
      <View style={styles.fileIcon}>
        <Ionicons name={icon as any} size={22} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.fileName} numberOfLines={1}>
          {fileName || "file"}
        </Text>
        <Text style={styles.fileMeta}>{sizeLabel || (type === "image" ? "Image" : "File")}</Text>
      </View>
      <Ionicons name="arrow-down-outline" size={18} color={colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  voiceWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 200,
  },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    height: 28,
  },
  voiceTime: {
    marginLeft: spacing.sm,
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  fileWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    minWidth: 220,
    gap: spacing.sm,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryBgSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  fileName: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  fileMeta: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
});
