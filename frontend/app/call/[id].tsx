import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  Easing,
} from "react-native-reanimated";
import { api, User } from "../../src/api";
import Avatar from "../../src/Avatar";
import { colors, fonts, spacing } from "../../src/theme";

export default function CallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [other, setOther] = useState<User | null>(null);
  const [phase, setPhase] = useState<"ringing" | "connected" | "ended">("ringing");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const users = await api.get<User[]>("/users");
        const u = users.find((x) => x.id === id) || null;
        if (mounted) setOther(u);
      } catch {}
    })();
    const ringT = setTimeout(() => mounted && setPhase("connected"), 2000);
    return () => {
      mounted = false;
      clearTimeout(ringT);
    };
  }, [id]);

  useEffect(() => {
    if (phase !== "connected") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const ringScale1 = useSharedValue(1);
  const ringScale2 = useSharedValue(1);
  useEffect(() => {
    ringScale1.value = withRepeat(
      withTiming(1.4, { duration: 1800, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    ringScale2.value = withRepeat(
      withTiming(1.7, { duration: 2400, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
  }, [ringScale1, ringScale2]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale1.value }],
    opacity: 1 - (ringScale1.value - 1) / 0.4,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale2.value }],
    opacity: 1 - (ringScale2.value - 1) / 0.7,
  }));

  function endCall() {
    setPhase("ended");
    if (other) {
      api.post("/calls", {
        other_user_id: other.id,
        duration_sec: seconds,
        status: seconds > 0 ? "completed" : "missed",
      }).catch(() => {});
    }
    setTimeout(() => router.back(), 350);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.top}>
        <Text style={styles.kicker}>{phase === "ringing" ? "Calling…" : phase === "connected" ? "On call" : "Ending"}</Text>
        <Text style={styles.name}>{other?.name || "…"}</Text>
        <Text style={styles.timer}>
          {phase === "connected"
            ? `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`
            : phase === "ringing"
              ? "ringing softly"
              : "goodbye"}
        </Text>
      </View>

      <View style={styles.center}>
        <View style={styles.avatarWrap}>
          <Animated.View style={[styles.ring, ring2Style]} />
          <Animated.View style={[styles.ring, ring1Style]} />
          {other ? (
            <Avatar name={other.name} seed={other.id} size={140} />
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
        </View>
        {other?.bio ? <Text style={styles.bio}>{other.bio}</Text> : null}
      </View>

      <View style={styles.controls}>
        <RoundBtn icon="mic-off-outline" label="Mute" />
        <RoundBtn icon="volume-high-outline" label="Speaker" />
        <Pressable onPress={endCall} style={[styles.btn, styles.endBtn]} testID="end-call">
          <Ionicons name="call" size={26} color={colors.textInverse} style={{ transform: [{ rotate: "135deg" }] }} />
        </Pressable>
        <RoundBtn icon="videocam-outline" label="Video" />
        <RoundBtn icon="ellipsis-horizontal" label="More" />
      </View>
    </SafeAreaView>
  );
}

function RoundBtn({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <Pressable style={styles.btn}>
        <Ionicons name={icon} size={22} color={colors.text} />
      </Pressable>
      <Text style={styles.btnLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  top: {
    paddingTop: spacing.lg,
    alignItems: "center",
  },
  kicker: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.textTertiary,
    marginBottom: 6,
  },
  name: { fontFamily: fonts.heading, fontSize: 32, color: colors.text, letterSpacing: -0.5 },
  timer: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  avatarWrap: { width: 220, height: 220, alignItems: "center", justifyContent: "center" },
  ring: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
  },
  bio: {
    marginTop: spacing.lg,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontSize: 14,
    paddingHorizontal: spacing.xl,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  endBtn: { backgroundColor: colors.error, width: 64, height: 64, borderRadius: 32 },
  btnLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },
});
