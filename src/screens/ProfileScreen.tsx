import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";

import { supabase } from "../lib/supabase";
import { theme } from "../ui/theme";
import AuthScreen from "./AuthScreen";
import type { AppLanguage } from "../i18n/types";
import { useLanguage } from "../i18n/LanguageProvider";

type Profile = { name: string | null; email: string | null };

export default function ProfileScreen({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useLanguage();

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

  const loadProfile = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveName = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ name: newName })
      .eq("id", data.user.id);

    if (error) {
      Alert.alert(t.common.error, error.message);
      return;
    }

    setProfile((p) => ({ ...p, name: newName }));
    setEditingName(false);
  };

  const savePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert(t.common.error, t.profile.passwordMin);
      return;
    }

    if (newPassword !== repeatPassword) {
      Alert.alert(t.common.error, t.profile.passwordsMismatch);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      Alert.alert(t.common.error, error.message);
      return;
    }

    Alert.alert(t.profile.passwordChanged);
    setPasswordOpen(false);
    setNewPassword("");
    setRepeatPassword("");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setLoggedIn(false);
  };

  const deleteAccount = async () => {
    Alert.alert(t.profile.deleteTitle, t.profile.deleteMessage, [
      { text: t.profile.cancel, style: "cancel" },
      {
        text: t.profile.deleteConfirm,
        style: "destructive",
        onPress: async () => {
          const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
          if (sessErr || !sessionData.session) {
            Alert.alert(t.common.error, t.profile.noSession);
            return;
          }

          const { data, error } = await supabase.functions.invoke("delete_user", {
            body: {},
          });

          if (error) {
            Alert.alert(t.common.error, error.message);
            return;
          }

          if (!data?.success) {
            Alert.alert(t.common.error, t.profile.functionFailure);
            return;
          }

          Alert.alert(t.profile.deleted);
          await supabase.auth.signOut();
          onClose();
        },
      },
    ]);
  };

  const languageOptions: { value: AppLanguage; label: string }[] = [
    { value: "pl", label: t.profile.polish },
    { value: "en", label: t.profile.english },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.profile.title}</Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color="#000" />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.languageCard}>
          <Text style={styles.smallLabel}>{t.profile.languageTitle}</Text>
          <View style={styles.languageRow}>
            {languageOptions.map((option) => {
              const active = option.value === language;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setLanguage(option.value)}
                  style={[styles.languageBtn, active ? styles.languageBtnActive : null]}
                >
                  <Text style={[styles.languageText, active ? styles.languageTextActive : null]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {!loggedIn && (
          <View style={styles.card}>
            <Text style={styles.loggedOutHint}>{t.profile.loginHint}</Text>

            <Pressable style={styles.primaryBtn} onPress={() => setAuthOpen(true)}>
              <Text style={styles.primaryText}>{t.profile.authButton}</Text>
            </Pressable>
          </View>
        )}

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
                  <Text style={styles.smallLabel}>{t.profile.nameLabel}</Text>

                  {editingName ? (
                    <>
                      <TextInput value={newName} onChangeText={setNewName} style={styles.input} />
                      <Pressable onPress={saveName}>
                        <Text style={styles.link}>{t.common.save}</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable style={styles.nameRow} onPress={() => setEditingName(true)}>
                      <Text style={[styles.nameText, !profile.name && styles.namePlaceholder]}>
                        {profile.name ? profile.name.toUpperCase() : t.profile.setName}
                      </Text>
                      <Feather name="edit-2" size={14} color="#6B7280" />
                    </Pressable>
                  )}
                </View>

                <View style={{ alignItems: "center", gap: 4 }}>
                  <Text style={styles.smallLabel}>{t.profile.emailLabel}</Text>
                  <Text style={styles.emailText}>{profile.email ?? ""}</Text>
                </View>
              </View>
            </View>

            <Pressable onPress={() => setPasswordOpen(!passwordOpen)} style={styles.actionBtn}>
              <Feather name="lock" size={16} color="#000" />
              <Text style={styles.actionText}>{t.profile.changePassword}</Text>
            </Pressable>

            {passwordOpen && (
              <View style={styles.passwordBox}>
                <TextInput
                  placeholder={t.profile.newPasswordPlaceholder}
                  secureTextEntry
                  style={styles.inputFull}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TextInput
                  placeholder={t.profile.repeatPasswordPlaceholder}
                  secureTextEntry
                  style={styles.inputFull}
                  value={repeatPassword}
                  onChangeText={setRepeatPassword}
                />
                <Pressable style={styles.primaryBtn} onPress={savePassword}>
                  <Text style={styles.primaryText}>{t.common.save}</Text>
                </Pressable>
              </View>
            )}

            <Pressable onPress={logout} style={styles.actionBtn}>
              <Feather name="log-out" size={16} color="#000" />
              <Text style={styles.actionText}>{t.profile.logout}</Text>
            </Pressable>

            <Pressable onPress={deleteAccount} style={styles.actionBtn}>
              <Feather name="trash-2" size={16} color="#DC2626" />
              <Text style={styles.dangerText}>{t.profile.deleteAccount}</Text>
            </Pressable>
          </>
        )}

        <Text style={styles.version}>{t.profile.version}</Text>
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

  languageCard: {
    borderWidth: theme.s.border,
    borderColor: theme.c.border,
    padding: 14,
    gap: 12,
  },

  languageRow: {
    flexDirection: "row",
    gap: 10,
  },

  languageBtn: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },

  languageBtnActive: { backgroundColor: "#000" },

  languageText: {
    fontFamily: theme.f.medium,
    fontSize: 12,
    letterSpacing: 1.5,
    color: "#000",
  },

  languageTextActive: { color: "#FFF" },

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
