import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import * as Crypto from "expo-crypto";

const KEY = "mnc_device_id_v1";

export async function getDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY);
  if (existing) return existing;

  const id = Crypto.randomUUID(); // stabilne, unikalne
  await SecureStore.setItemAsync(KEY, id);
  return id;
}

export function getPlatform(): "ios" | "android" {
  return Platform.OS === "android" ? "android" : "ios";
}