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

  async function registerPushToken(token: string, accessToken?: string) {
    try {
      const { error } = await supabase.functions.invoke("register_push_token", {
        body: {
          expo_push_token: token,
          platform: Platform.OS,
          device_id: Device.modelName ?? "unknown",
          device: Device.modelName ?? "unknown",
        },
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      });

      if (error) {
        console.log("register_push_token error:", error.message);
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
          await registerPushToken(expoTokenRef.current, s?.access_token);
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

      await registerPushToken(token, session?.access_token);
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

        const { error } = await supabase.functions.invoke("track_push_open", {
          body: {
            campaign_id: campaignId,
            expo_push_token: expoTokenRef.current,
          },
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        });

        if (error) {
          console.log("track_push_open error:", error.message);
        } else {
          console.log("Push open zapisany");
        }
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
