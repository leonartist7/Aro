import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "./theme";

const PALETTE = ["#C3AB95", "#A98C70", "#8C7158", "#B89A7E", "#D4BFA6", "#9C8268"];

function initials(name?: string | null) {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name[0].toUpperCase();
}

function colorFor(seed?: string | null) {
  if (!seed) return PALETTE[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function Avatar({
  name,
  size = 48,
  seed,
}: {
  name?: string | null;
  size?: number;
  seed?: string | null;
}) {
  const bg = colorFor(seed || name);
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.txt, { fontSize: size * 0.36 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  txt: { color: colors.textInverse, fontFamily: fonts.bodyBold, letterSpacing: 0.5 },
});
