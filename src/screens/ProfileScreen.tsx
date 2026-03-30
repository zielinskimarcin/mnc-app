import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  TextInput,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { theme } from "../ui/theme";
import AuthScreen from "./AuthScreen";

type Profile = { name: string | null; email: string | null };

export default function ProfileScreen({
  onClose,
}: {
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<Profile>({
    name: null,
    email: null,
  });

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const loadProfile = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      setLoggedIn(false);
      return;
    }

    setLoggedIn(true);

    const { data: row } = await supabase
      .from("profiles")
      .select("name, email")
      .eq("id", user.id)
      .single();

    setProfile({
      name: row?.name ?? "",
      email: row?.email ?? user.email ?? "",
    });

    setNewName(row?.name ?? "");
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const saveName = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ name: newName })
      .eq("id", data.user.id);

    if (error) {
      Alert.alert(error.message);
      return;
    }

    setProfile((p) => ({ ...p, name: newName }));
    setEditingName(false);
  };

  const savePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert("Hasło musi mieć min. 6 znaków");
      return;
    }

    if (newPassword !== repeatPassword) {
      Alert.alert("Hasła nie są takie same");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      Alert.alert(error.message);
      return;
    }

    Alert.alert("Hasło zostało zmienione");
    setPasswordOpen(false);
    setNewPassword("");
    setRepeatPassword("");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setLoggedIn(false);
  };

  const deleteAccount = async () => {
  Alert.alert(
    "Usuń konto",
    "To spowoduje trwałe usunięcie konta i punktów.",
    [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Usuń",
        style: "destructive",
        onPress: async () => {
          // DIAG: upewnijmy się że sesja istnieje
          const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
          if (sessErr || !sessionData.session) {
            Alert.alert("Błąd", "Brak aktywnej sesji (nie jesteś zalogowany).");
            return;
          }

          const { data, error } = await supabase.functions.invoke("delete_user", {
            body: {}, // nic nie wysyłamy, user ma być z JWT
          });

          if (error) {
            Alert.alert("Błąd", error.message);
            return;
          }

          if (!data?.success) {
            Alert.alert("Błąd", "Funkcja nie zwróciła success:true");
            return;
          }

          Alert.alert("Konto zostało usunięte");
          // po usunięciu user i tak jest martwy, ale czyścimy lokalnie
          await supabase.auth.signOut();
          onClose();
        },
      },
    ]
  );
};

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PROFIL</Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color="#000" />
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* WYLOGOWANY */}
        {!loggedIn && (
          <View style={styles.card}>
            <Text style={styles.loggedOutHint}>
              Zaloguj się, aby zbierać punkty lojalnościowe
            </Text>

            <Pressable
              style={styles.primaryBtn}
              onPress={() => setAuthOpen(true)}
            >
              <Text style={styles.primaryText}>
                ZAREJESTRUJ / ZALOGUJ
              </Text>
            </Pressable>
          </View>
        )}

        {/* ZALOGOWANY */}
        {loggedIn && (
          <>
            <View style={styles.card}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatarBox}>
                  <Feather name="user" size={28} color="#000" />
                </View>
              </View>

              <View style={{ gap: 16 }}>
                <View style={{ alignItems: "center", gap: 6 }}>
                  <Text style={styles.smallLabel}>IMIĘ</Text>

                  {editingName ? (
                    <>
                      <TextInput
                        value={newName}
                        onChangeText={setNewName}
                        style={styles.input}
                      />
                      <Pressable onPress={saveName}>
                        <Text style={styles.link}>ZAPISZ</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      style={styles.nameRow}
                      onPress={() => setEditingName(true)}
                    >
                      <Text
                        style={[
                          styles.nameText,
                          !profile.name && styles.namePlaceholder,
                        ]}
                      >
                        {profile.name
                          ? profile.name.toUpperCase()
                          : "USTAW SWOJE IMIĘ"}
                      </Text>
                      <Feather
                        name="edit-2"
                        size={14}
                        color="#6B7280"
                      />
                    </Pressable>
                  )}
                </View>

                <View style={{ alignItems: "center", gap: 4 }}>
                  <Text style={styles.smallLabel}>EMAIL</Text>
                  <Text style={styles.emailText}>
                    {profile.email ?? ""}
                  </Text>
                </View>
              </View>
            </View>

            {/* ZMIANA HASŁA (ROZWIJANE) */}
            <Pressable
              onPress={() => setPasswordOpen(!passwordOpen)}
              style={styles.actionBtn}
            >
              <Feather name="lock" size={16} color="#000" />
              <Text style={styles.actionText}>ZMIANA HASŁA</Text>
            </Pressable>

            {passwordOpen && (
              <View style={styles.passwordBox}>
                <TextInput
                  placeholder="Nowe hasło"
                  secureTextEntry
                  style={styles.inputFull}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TextInput
                  placeholder="Powtórz hasło"
                  secureTextEntry
                  style={styles.inputFull}
                  value={repeatPassword}
                  onChangeText={setRepeatPassword}
                />
                <Pressable style={styles.primaryBtn} onPress={savePassword}>
                  <Text style={styles.primaryText}>ZAPISZ</Text>
                </Pressable>
              </View>
            )}

            <Pressable onPress={logout} style={styles.actionBtn}>
              <Feather name="log-out" size={16} color="#000" />
              <Text style={styles.actionText}>WYLOGUJ SIĘ</Text>
            </Pressable>

            <Pressable onPress={deleteAccount} style={styles.actionBtn}>
              <Feather name="trash-2" size={16} color="#DC2626" />
              <Text style={styles.dangerText}>USUŃ KONTO</Text>
            </Pressable>
          </>
        )}

        <Text style={styles.version}>Wersja 1.0.0</Text>
      </View>

      <Modal visible={authOpen} animationType="fade" transparent>
        <AuthScreen
          onClose={async () => {
            setAuthOpen(false);
            await loadProfile();
          }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.c.bg },

  header: {
    borderBottomWidth: theme.s.border,
    borderColor: theme.c.border,
    paddingHorizontal: theme.s.pad,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontFamily: theme.f.medium,
    fontSize: 14,
    letterSpacing: 2,
  },

  closeBtn: { position: "absolute", right: theme.s.pad, top: 18 },

  content: { padding: theme.s.pad, gap: 18 },

  card: {
    borderWidth: theme.s.border,
    borderColor: theme.c.border,
    padding: 20,
    gap: 18,
  },

  loggedOutHint: {
    fontFamily: theme.f.regular,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 12,
  },

  avatarWrap: { alignItems: "center" },

  avatarBox: {
    width: 72,
    height: 72,
    borderWidth: theme.s.border,
    borderColor: theme.c.border,
    alignItems: "center",
    justifyContent: "center",
  },

  smallLabel: {
    fontFamily: theme.f.regular,
    fontSize: 12,
    color: "#6B7280",
    letterSpacing: 1,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  nameText: {
    fontFamily: theme.f.medium,
    fontSize: 16,
    letterSpacing: 2,
  },

  namePlaceholder: {
    color: "#9CA3AF",
  },

  emailText: {
    fontFamily: theme.f.regular,
    fontSize: 14,
  },

  input: {
    borderWidth: 1,
    borderColor: "#000",
    padding: 12,
    width: 200,
    textAlign: "center",
  },

  inputFull: {
    borderWidth: 1,
    borderColor: "#000",
    padding: 12,
  },

  passwordBox: {
    borderWidth: theme.s.border,
    borderColor: theme.c.border,
    padding: 16,
    gap: 12,
  },

  link: {
    marginTop: 6,
    fontFamily: theme.f.medium,
    letterSpacing: 2,
  },

  actionBtn: {
    borderWidth: theme.s.border,
    borderColor: theme.c.border,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },

  actionText: {
    fontFamily: theme.f.medium,
    letterSpacing: 2,
  },

  dangerText: {
    fontFamily: theme.f.medium,
    letterSpacing: 2,
    color: "#DC2626",
  },

  primaryBtn: {
    backgroundColor: "#000",
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryText: {
    color: "#FFF",
    fontFamily: theme.f.medium,
    letterSpacing: 2,
  },

  version: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 6,
  },
});