import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { supabase } from "../lib/supabase";
import { theme } from "../ui/theme";

WebBrowser.maybeCompleteAuthSession();

const { height } = Dimensions.get("window");
const SHEET_HEIGHT = height * 0.9;

function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </Svg>
  );
}

function randomNonce(len = 32) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AuthScreen({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  const [mode, setMode] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120) close();
        else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, []);

  const close = () => {
    Animated.timing(translateY, {
      toValue: SHEET_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(onClose);
  };

  const signUp = async () => {
    try {
      setBusy(true);
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      close();
    } catch (e: any) {
      Alert.alert("Błąd", e?.message ?? "Nieznany błąd");
    } finally {
      setBusy(false);
    }
  };

  const signIn = async () => {
    try {
      setBusy(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      close();
    } catch (e: any) {
      Alert.alert("Błąd", e?.message ?? "Nieznany błąd");
    } finally {
      setBusy(false);
    }
  };

  // ✅ NATIVE APPLE LOGIN (Expo + Supabase)
  const signInWithAppleNative = async () => {
    try {
      setBusy(true);

      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        Alert.alert("Apple", "Sign in with Apple jest dostępne tylko na iOS.");
        return;
      }

      // raw nonce -> hash -> Apple, raw -> Supabase
      const rawNonce = randomNonce(32);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error("Brak identityToken z Apple");
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) throw error;

      close();
    } catch (e: any) {
      // user cancelled -> nie pokazuj błędu
      if (e?.code === "ERR_REQUEST_CANCELED" || e?.message?.includes("canceled")) return;
      Alert.alert("Apple login error", e?.message ?? "Nieznany błąd");
    } finally {
      setBusy(false);
    }
  };
// ✅ GOOGLE LOGIN (Expo AuthSession + Supabase OAuth)
const signInWithGoogle = async () => {
  try {
    setBusy(true);

    const redirectTo = AuthSession.makeRedirectUri({
      scheme: "mncconcept",
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error("Brak URL Google");

    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectTo
    );

    if (result.type !== "success") return;

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(result.url);

    if (exchangeError) throw exchangeError;

    close();
  } catch (e: any) {
    Alert.alert("Google login error", e?.message ?? "Nieznany błąd");
  } finally {
    setBusy(false);
  }
};
  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={close} />

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} {...panResponder.panHandlers}>
        <Pressable style={styles.closeBtn} onPress={close} disabled={busy}>
          <Ionicons name="close" size={24} color="#000" />
        </Pressable>

        <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.formWrap}>
            <View style={styles.brandBlock}>
              <View style={styles.brandRow}>
                <Text style={styles.brandText}>MNC CONCEPT</Text>
                <Text style={styles.tm}>™</Text>
              </View>

              <Text style={styles.slogan}>
                {mode === "register"
                  ? "Zarejestruj się i zbieraj punkty lojalnościowe"
                  : "Zaloguj się i zbieraj punkty lojalnościowe"}
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>EMAIL</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="jan.kowalski@email.com"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  editable={!busy}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>HASŁO</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  editable={!busy}
                />
              </View>

              <Pressable onPress={mode === "register" ? signUp : signIn} style={styles.primary} disabled={busy}>
                <Text style={styles.primaryText}>
                  {busy ? "..." : mode === "register" ? "ZAREJESTRUJ SIĘ" : "ZALOGUJ SIĘ"}
                </Text>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>LUB</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* ✅ APPLE */}
              <Pressable style={styles.outlineBtn} onPress={signInWithAppleNative} disabled={busy}>
                <Ionicons name="logo-apple" size={18} color="#000" style={{ marginRight: 10 }} />
                <Text style={styles.outlineText}>{busy ? "..." : "KONTYNUUJ Z APPLE"}</Text>
              </Pressable>

              {/* Google zostawiamy na później, jak mówiłeś */}
              <Pressable style={styles.outlineBtn} onPress={signInWithGoogle} disabled={busy}>
                <View style={{ marginRight: 10 }}>
                  <GoogleG size={18} />
                </View>
                <Text style={styles.outlineText}>KONTYNUUJ Z GOOGLE</Text>
              </Pressable>

              <View style={styles.signupWrap}>
                {mode === "register" ? (
                  <>
                    <Text style={styles.signupHint}>Masz już konto?</Text>
                    <Pressable onPress={() => setMode("login")} disabled={busy}>
                      <Text style={styles.switchText}>ZALOGUJ SIĘ</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.signupHint}>Nie masz konta?</Text>
                    <Pressable onPress={() => setMode("register")} disabled={busy}>
                      <Text style={styles.switchText}>ZAREJESTRUJ SIĘ</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  backdrop: { flex: 1 },

  sheet: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: SHEET_HEIGHT,
    backgroundColor: theme.c.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  closeBtn: {
    position: "absolute",
    right: 24,
    top: 16,
    zIndex: 10,
  },

  root: { flex: 1 },

  formWrap: {
    flex: 1,
    paddingHorizontal: theme.s.pad,
    justifyContent: "flex-start",
    paddingTop: 30,
  },

  brandBlock: {
    alignItems: "center",
    marginBottom: 44,
  },

  brandRow: { flexDirection: "row", alignItems: "flex-start" },

  brandText: {
    fontFamily: theme.t.brand.fontFamily,
    fontSize: 28,
    letterSpacing: 1.2,
  },

  tm: { marginLeft: 4, marginTop: 4, fontSize: 12 },

  slogan: {
    marginTop: 20,
    fontFamily: theme.f.regular,
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },

  form: { gap: 14 },

  field: { gap: 8 },

  label: {
    fontFamily: theme.f.medium,
    fontSize: 12,
    letterSpacing: 2,
  },

  input: {
    borderWidth: 1,
    borderColor: "#000",
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontFamily: theme.f.regular,
    fontSize: 16,
  },

  primary: {
    marginTop: 8,
    height: 56,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryText: {
    fontFamily: theme.f.medium,
    fontSize: 14,
    letterSpacing: 2,
    color: "#FFF",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginVertical: 6,
  },

  dividerLine: { flex: 1, height: 1, backgroundColor: "#000" },

  dividerText: {
    fontFamily: theme.f.regular,
    fontSize: 14,
    letterSpacing: 2,
    color: "#6B7280",
  },

  outlineBtn: {
    height: 56,
    borderWidth: 1,
    borderColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  outlineText: {
    fontFamily: theme.f.medium,
    fontSize: 13,
    letterSpacing: 2,
  },

  signupWrap: { alignItems: "center", marginTop: 16 },

  signupHint: {
    fontFamily: theme.f.regular,
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 6,
  },

  switchText: {
    fontFamily: theme.f.medium,
    fontSize: 14,
    letterSpacing: 2,
  },
});