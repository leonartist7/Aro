import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, User } from "../src/api";
import { useTheme } from "../src/ThemeContext";
import { Palette, radius, spacing } from "../src/theme";
import Avatar from "../src/Avatar";

export default function QuickMessage() {
  const router = useRouter();
  const { c, f } = useTheme();
  const styles = makeStyles(c, f);
  const inputRef = useRef<TextInput>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await api.get<User[]>("/users");
      setUsers(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }, [load]),
  );

  async function sendIt() {
    if (!selected || !text.trim() || sending) return;
    setSending(true);
    try {
      const chat = await api.post<{ id: string }>("/chats", { other_user_id: selected.id });
      await api.post(`/chats/${chat.id}/messages`, {
        chat_id: chat.id,
        type: "text",
        text: text.trim(),
      });
      router.replace(`/chat/${chat.id}`);
    } catch {
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Dismiss area */}
        <Pressable style={styles.dismissArea} onPress={() => router.back()} />

        <View style={styles.card}>
          <View style={styles.cardHandle} />

          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Quick message</Text>
            <Pressable onPress={() => router.back()} style={styles.close} testID="new-msg-close">
              <Ionicons name="close" size={20} color={c.text} />
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>To</Text>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={c.primary} />
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.contactRow}
            >
              {users.map((u) => {
                const isOn = selected?.id === u.id;
                return (
                  <Pressable
                    key={u.id}
                    onPress={() => setSelected(isOn ? null : u)}
                    style={styles.contact}
                    testID={`contact-${u.id}`}
                  >
                    <View
                      style={[
                        styles.avatarRing,
                        isOn && { borderColor: c.primary },
                      ]}
                    >
                      <Avatar name={u.name} seed={u.id} size={56} />
                      {isOn ? (
                        <View style={styles.checkDot}>
                          <Ionicons name="checkmark" size={12} color={c.textInverse} />
                        </View>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.contactName,
                        isOn && { color: c.primary, fontFamily: f.bodyBold },
                      ]}
                      numberOfLines={1}
                    >
                      {u.name.split(" ")[0]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <Text style={styles.sectionLabel}>Message</Text>
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder={selected ? `Say hi to ${selected.name.split(" ")[0]}…` : "Type a message…"}
              placeholderTextColor={c.textTertiary}
              style={styles.input}
              multiline
              testID="quick-message-input"
            />
            <Pressable
              onPress={sendIt}
              disabled={!selected || !text.trim() || sending}
              style={({ pressed }) => [
                styles.sendBtn,
                (!selected || !text.trim()) && { opacity: 0.4 },
                pressed && { transform: [{ scale: 0.95 }] },
              ]}
              testID="quick-send"
            >
              {sending ? (
                <ActivityIndicator color={c.textInverse} />
              ) : (
                <Ionicons name="arrow-up" size={20} color={c.textInverse} />
              )}
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              if (!selected) return;
              api.post<{ id: string }>("/chats", { other_user_id: selected.id }).then((chat) => {
                router.replace(`/chat/${chat.id}`);
              });
            }}
            style={styles.openChat}
            disabled={!selected}
            testID="open-full-chat"
          >
            <Text style={[styles.openChatText, !selected && { opacity: 0.4 }]}>
              Or open the full chat  ›
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette, f: any) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.overlay },
    dismissArea: { flex: 1 },
    card: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
    },
    cardHandle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      marginVertical: spacing.sm,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    cardTitle: { fontFamily: f.heading, fontSize: 22, color: c.text, letterSpacing: -0.3 },
    close: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionLabel: {
      fontFamily: f.bodyBold,
      fontSize: 11,
      color: c.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 1.3,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    loadingRow: { height: 80, alignItems: "center", justifyContent: "center" },
    contactRow: { gap: spacing.md, paddingBottom: spacing.sm, paddingRight: spacing.lg },
    contact: { alignItems: "center", width: 72 },
    avatarRing: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "transparent",
      marginBottom: 6,
    },
    checkDot: {
      position: "absolute",
      right: 0,
      bottom: 0,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: c.bg,
    },
    contactName: {
      fontFamily: f.body,
      fontSize: 12,
      color: c.textSecondary,
      maxWidth: 72,
      textAlign: "center",
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      paddingLeft: spacing.md,
      paddingRight: 6,
      paddingVertical: 6,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      fontFamily: f.body,
      fontSize: 15,
      color: c.text,
      paddingVertical: 10,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    openChat: { marginTop: spacing.md, alignSelf: "center", padding: spacing.sm },
    openChatText: { fontFamily: f.bodyMedium, color: c.textSecondary, fontSize: 13 },
  });
