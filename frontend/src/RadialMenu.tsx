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
import { useTheme } from "./ThemeContext";
import { Palette } from "./theme";

export type RadialAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

const { width, height } = Dimensions.get("window");

export default function RadialMenu({
  visible,
  onClose,
  actions,
  anchor,
}: {
  visible: boolean;
  onClose: () => void;
  actions: RadialAction[];
  anchor?: { x: number; y: number };
}) {
  const { c, f } = useTheme();
  const styles = makeStyles(c);

  // Default to center-bottom (just above the tab bar) so nodes arc upward.
  const a = anchor ?? { x: width / 2, y: height - 96 };
  // Determine arc direction: if anchor is near bottom, arc upward (180° → 360°);
  // otherwise use the original down-left arc.
  const archUpward = a.y > height * 0.6;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} testID="radial-overlay">
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {actions.map((act, i) => (
            <RadialNode
              key={act.key}
              index={i}
              total={actions.length}
              anchor={a}
              archUpward={archUpward}
              visible={visible}
              action={act}
              c={c}
              fBody={f.bodyMedium}
              onSelect={() => {
                onClose();
                setTimeout(() => act.onPress(), 80);
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
  archUpward,
  visible,
  action,
  c,
  fBody,
  onSelect,
}: {
  index: number;
  total: number;
  anchor: { x: number; y: number };
  archUpward: boolean;
  visible: boolean;
  action: RadialAction;
  c: Palette;
  fBody: string;
  onSelect: () => void;
}) {
  const progress = useSharedValue(0);
  const [startDeg, endDeg] = archUpward ? [200, 340] : [200, 280];
  const step = total > 1 ? (endDeg - startDeg) / (total - 1) : 0;
  const angle = ((startDeg + step * index) * Math.PI) / 180;
  const radius = 120;

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
        nodeStyles.wrap,
        { left: anchor.x - 40, top: anchor.y - 40 },
        style,
      ]}
    >
      <Pressable
        onPress={onSelect}
        style={({ pressed }) => [
          nodeStyles.node,
          { backgroundColor: c.surface },
          pressed && { transform: [{ scale: 0.95 }] },
        ]}
        testID={`radial-${action.key}`}
      >
        <Ionicons name={action.icon} size={22} color={c.text} />
      </Pressable>
      <Text
        style={[nodeStyles.label, { color: c.textInverse, fontFamily: fBody }]}
        numberOfLines={1}
      >
        {action.label}
      </Text>
    </Animated.View>
  );
}

const nodeStyles = StyleSheet.create({
  wrap: {
    position: "absolute",
    width: 80,
    alignItems: "center",
  },
  node: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    textAlign: "center",
  },
});

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
    },
  });
