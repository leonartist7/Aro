// Calls — API helpers, WebSocket signaling client, types
import { Platform } from "react-native";
import { api, getToken, User } from "./api";

export type CallStatus = "ringing" | "active" | "completed" | "missed";

export type Call = {
  id: string;
  members: string[];
  initiator_id: string;
  status: CallStatus;
  duration_sec: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  other: User | null;
};

export type CallSignal =
  | { type: "incoming_call"; call: { id: string }; from: { id: string; name: string } }
  | { type: "call_accepted"; call_id: string }
  | { type: "call_declined"; call_id: string }
  | { type: "call_missed"; call_id: string }
  | { type: "call_ended"; call_id: string };

export type LiveKitJoin = { url: string; room: string; token: string };

export const callsApi = {
  list: () => api.get<Call[]>("/calls"),
  start: (other_user_id: string) => api.post<Call>("/calls", { other_user_id }),
  accept: (id: string) => api.post<Call>(`/calls/${id}/accept`),
  decline: (id: string) => api.post<Call>(`/calls/${id}/decline`),
  cancel: (id: string) => api.post<Call>(`/calls/${id}/cancel`),
  end: (id: string) => api.post<Call>(`/calls/${id}/end`),
  token: (id: string) => api.post<LiveKitJoin>(`/calls/${id}/token`),
};

const isDev = typeof (globalThis as any).__DEV__ !== "undefined" && (globalThis as any).__DEV__;
const DEFAULT_BACKEND = isDev
  ? Platform.OS === "android"
    ? "http://10.0.2.2:8000"
    : "http://127.0.0.1:8000"
  : "https://connect-mvp.preview.emergentagent.com";
const BASE = (process.env.EXPO_PUBLIC_BACKEND_URL || DEFAULT_BACKEND).replace(/\/$/, "");

export async function openCallSocket(onMessage: (msg: any) => void): Promise<WebSocket | null> {
  const token = await getToken();
  if (!token) return null;
  const wsBase = BASE.replace(/^http/, "ws");
  const ws = new WebSocket(`${wsBase}/api/ws/calls?token=${encodeURIComponent(token)}`);
  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data));
    } catch {}
  };
  ws.onerror = () => {};
  return ws;
}
