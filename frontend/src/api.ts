import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
const TOKEN_KEY = "connect_token";

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${path}`, { ...options, headers });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = data?.detail ?? data ?? "Request failed";
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((e: any) => e?.msg || JSON.stringify(e)).join(" ")
          : JSON.stringify(detail);
    throw new Error(message);
  }
  return data as T;
}

export const api = {
  get: <T = any>(p: string) => request<T>(p),
  post: <T = any>(p: string, body?: any) =>
    request<T>(p, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
};

export type User = {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  bio?: string;
  created_at?: string;
};

export type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  type: "text" | "voice" | "image" | "file";
  text?: string | null;
  media?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  duration_ms?: number | null;
  created_at: string;
};

export type Chat = {
  id: string;
  type: string;
  other: User | null;
  last_message: Message | null;
  updated_at: string;
};
