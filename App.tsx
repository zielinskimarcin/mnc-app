import "react-native-url-polyfill/auto";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Session } from "@supabase/supabase-js";

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";

import { supabase } from "./src/lib/supabase";
import AuthScreen from "./src/screens/AuthScreen";
import MainTabs from "./src/navigation/MainTabs";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function getExpoToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log("Push only works on physical device");
      return null;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      finalStatus = req.status;
    }

    if (finalStatus !== "granted") {
      console.log("Permission not granted");
      return null;
    }

    const projectId =
      (Constants.easConfig as any)?.projectId ??
      (Constants.expoConfig as any)?.extra?.eas?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    return tokenResponse.data ?? null;
  } catch (err) {
    console.log("getExpoToken error:", err);
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);

  const didRegisterRef = useRef(false);
  const expoTokenRef = useRef<string | null>(null);

  async function upsertTokenRow(token: string, userId: string | null) {
    try {
      const { error } = await supabase
        .from("push_tokens")
        .upsert(
          {
            expo_push_token: token,
            platform: Platform.OS,
            user_id: userId,
            device_id: Device.modelName ?? "unknown",
            device: Device.modelName ?? "unknown",
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "expo_push_token" }
        );

      if (error) {
        console.log("push_tokens upsert error:", error.message);
      } else {
        console.log("Push token zapisany poprawnie");
      }
    } catch (err) {
      console.log("upsertTokenRow error:", err);
    }
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setBooting(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);

        if (expoTokenRef.current) {
          await upsertTokenRow(
            expoTokenRef.current,
            s?.user?.id ?? null
          );
        }
      }
    );

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (booting) return;
    if (didRegisterRef.current) return;

    didRegisterRef.current = true;

    (async () => {
      const token = await getExpoToken();
      if (!token) return;

      expoTokenRef.current = token;
      console.log("Expo Push Token:", token);

      await upsertTokenRow(token, session?.user?.id ?? null);
    })();
  }, [booting]);

  // 🔥 LOGOWANIE KLIKNIĘCIA PUSH
useEffect(() => {
  const sub = Notifications.addNotificationResponseReceivedListener(
    async (response) => {
      try {
        const campaignId =
          response?.notification?.request?.content?.data?.campaign_id;

        if (!campaignId) return;

        await supabase.from("push_opens").insert({
          campaign_id: campaignId,
          expo_push_token: expoTokenRef.current,
          user_id: session?.user?.id ?? null,
        });

        console.log("Push open zapisany");
      } catch (e) {
        console.log("push open error:", e);
      }
    }
  );

  return () => sub.remove();
}, [session]);

  if (booting) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <MainTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
