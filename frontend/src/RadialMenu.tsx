import React, { useEffect } from "react";
import { Modal, Pressable, View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, shadows } from "./theme";

export type RadialAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

const { width } = Dimensions.get("window");

export default function RadialMenu({
  visible,
  onClose,
  actions,
  anchor = { x: width - 48, y: 110 },
}: {
  visible: boolean;
  onClose: () => void;
  actions: RadialAction[];
  anchor?: { x: number; y: number };
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} testID="radial-overlay">
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {actions.map((a, i) => (
            <RadialNode
              key={a.key}
              index={i}
              total={actions.length}
              anchor={anchor}
              visible={visible}
              action={a}
              onSelect={() => {
                onClose();
                setTimeout(() => a.onPress(), 80);
              }}
            />
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

function RadialNode({
  index,
  total,
  anchor,
  visible,
  action,
  onSelect,
}: {
  index: number;
  total: number;
  anchor: { x: number; y: number };
  visible: boolean;
  action: RadialAction;
  onSelect: () => void;
}) {
  const progress = useSharedValue(0);
  // Arc from ~200° to ~280° (down-left of anchor button)
  const startDeg = 200;
  const endDeg = 280;
  const step = total > 1 ? (endDeg - startDeg) / (total - 1) : 0;
  const angle = ((startDeg + step * index) * Math.PI) / 180;
  const radius = 110;

  useEffect(() => {
    progress.value = withDelay(
      visible ? index * 45 : 0,
      withTiming(visible ? 1 : 0, {
        duration: 260,
        easing: Easing.bezier(0.175, 0.885, 0.32, 1.275),
      }),
    );
  }, [visible, index, progress]);

  const style = useAnimatedStyle(() => {
    const dx = Math.cos(angle) * radius * progress.value;
    const dy = Math.sin(angle) * radius * progress.value;
    return {
      opacity: progress.value,
      transform: [{ translateX: dx }, { translateY: dy }, { scale: 0.6 + 0.4 * progress.value }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.nodeWrap,
        { left: anchor.x - 28, top: anchor.y - 28 },
        style,
      ]}
    >
      <Pressable
        onPress={onSelect}
        style={({ pressed }) => [styles.node, pressed && { transform: [{ scale: 0.95 }] }]}
        testID={`radial-${action.key}`}
      >
        <Ionicons name={action.icon} size={22} color={colors.text} />
      </Pressable>
      <Text style={styles.nodeLabel} numberOfLines={1}>
        {action.label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  nodeWrap: {
    position: "absolute",
    width: 80,
    alignItems: "center",
  },
  node: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.elevated,
  },
  nodeLabel: {
    marginTop: 6,
    color: colors.textInverse,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    textAlign: "center",
  },
});
