import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  RefreshControl,
} from "react-native";
import { Coffee, X } from "lucide-react-native";
import { theme } from "../ui/theme";
import { MncHeader } from "../components/MncHeader";
import { supabase } from "../lib/supabase";
import ProfileScreen from "./ProfileScreen";
import AuthScreen from "./AuthScreen";
import { formatPointWord, getLoyaltyCopy, tenant } from "../config/tenant";
import { useLanguage } from "../i18n/LanguageProvider";

type ProfileRow = {
  id: string;
  points: number | null;
  short_code: string | null;
};

export default function PointsScreen() {
  const { language, t } = useLanguage();
  const maxPoints = tenant.loyalty.maxPoints;
  const loyaltyCopy = getLoyaltyCopy(language);

  const [points, setPoints] = useState<number>(0);
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [codeOpen, setCodeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const [userLogged, setUserLogged] = useState(false);

  const steps = loyaltyCopy.steps;

  const left = useMemo(() => Math.max(0, maxPoints - points), [maxPoints, points]);
  const rewardReady = userLogged && points >= maxPoints;
  const codeButtonLabel = userLogged
    ? rewardReady
      ? t.points.redeemReward
      : t.points.showCode
    : t.points.register;

  const { width } = useWindowDimensions();
  const H_PADDING = theme.s.pad * 2;
  const GAP = 12;

  const gridWidth = width - H_PADDING;
  const base = Math.floor((gridWidth - GAP * 4) / 5);
  const cellSize = Math.max(44, base - 10);

  const loadProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserLogged(false);
      setPoints(0);
      setCode("");
      return;
    }

    setUserLogged(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, points, short_code")
      .eq("id", user.id)
      .single();

    if (error) {
      Alert.alert(t.points.profileErrorTitle, error.message);
      return;
    }

    const row = data as ProfileRow;
    setPoints(row.points ?? 0);
    setCode(row.short_code ?? "");
  }, [t.points.profileErrorTitle]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadProfile();
      setLoading(false);
    })();
  }, [loadProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, [loadProfile]);

  return (
    <View style={styles.root}>
      <MncHeader onProfile={() => setProfileOpen(true)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* KARTA PUNKTÓW */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.points.title}</Text>

          <Text style={styles.score}>
            {points} / {maxPoints}
          </Text>

          <View style={[styles.grid, { columnGap: GAP, rowGap: GAP }]}>
            {Array.from({ length: maxPoints }).map((_, i) => {
              const filled = i < points;
              return (
                <View
                  key={i}
                  style={[
                    styles.cell,
                    { width: cellSize, height: cellSize },
                    filled ? styles.cellFilled : styles.cellEmpty,
                  ]}
                >
                  <Coffee
                    size={Math.round(cellSize * 0.44)}
                    strokeWidth={2.0}
                    color={filled ? theme.c.primaryText : theme.c.primary}
                  />
                </View>
              );
            })}
          </View>

          <View style={styles.hr} />

          <Text style={styles.leftText}>
            {left === 0
              ? loyaltyCopy.rewardReadyText
              : `${t.points.remainingPrefix} ${left} ${formatPointWord(left, language)} ${loyaltyCopy.pointsUntilRewardSuffix}`}
          </Text>
        </View>

        {/* PRZYCISK */}
        <Pressable
          style={styles.codeBtn}
          onPress={() => {
            if (!userLogged) {
              setAuthOpen(true);
              return;
            }

            if (!code) {
              Alert.alert(t.points.missingCodeTitle, t.points.missingCodeMessage);
              return;
            }

            setCodeOpen(true);
          }}
        >
          <Text style={styles.codeBtnText}>
            {codeButtonLabel}
          </Text>
        </Pressable>

        {/* JAK TO DZIAŁA */}
        <Text style={styles.howTitle}>{t.points.howItWorks}</Text>

        <View style={styles.stepsWrap}>
          {steps.map((txt, idx) => (
            <View key={idx} style={styles.stepRow}>
              <View style={styles.stepNumBox}>
                <Text style={styles.stepNum}>{idx + 1}</Text>
              </View>
              <Text style={styles.stepText}>{txt}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* MODAL KODU */}
      <Modal visible={codeOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{rewardReady ? t.points.rewardCodeTitle : t.points.codeTitle}</Text>
              <Pressable onPress={() => setCodeOpen(false)}>
                <X size={18} strokeWidth={1.8} color={theme.c.text} />
              </Pressable>
            </View>

            <Text style={styles.modalInstruction}>
              {rewardReady ? t.points.rewardInstruction : t.points.codeInstruction}
            </Text>

            <View style={styles.modalCodeBox}>
              <Text style={styles.modalCode}>{code}</Text>
            </View>

            <Pressable style={styles.modalCloseBtn} onPress={() => setCodeOpen(false)}>
              <Text style={styles.modalCloseText}>{t.common.close}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL AUTH */}
      <Modal visible={authOpen} animationType="fade" transparent>
        <AuthScreen
          onClose={async () => {
            setAuthOpen(false);
            await loadProfile();
          }}
        />
      </Modal>

      {/* MODAL PROFIL */}
      <Modal visible={profileOpen} animationType="slide">
        <ProfileScreen onClose={() => setProfileOpen(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.c.bg },

  content: {
    padding: theme.s.pad,
    paddingBottom: 120,
  },

  card: {
    borderWidth: 1,
    borderColor: theme.c.borderStrong,
    borderRadius: theme.s.cardRadius,
    paddingVertical: 22,
    paddingHorizontal: 22,
    alignItems: "center",
  },

  cardTitle: {
    fontFamily: theme.f.medium,
    fontSize: 18,
    letterSpacing: 2,
    marginBottom: 8,
  },

  score: {
    fontFamily: theme.f.medium,
    fontSize: 42,
    letterSpacing: 2,
    marginBottom: 14,
  },

  grid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
  },

  cell: {
    borderWidth: 1,
    borderColor: theme.c.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },

  cellFilled: { backgroundColor: theme.c.primary },
  cellEmpty: { backgroundColor: theme.c.surface },

  hr: {
    height: 1,
    width: "100%",
    backgroundColor: theme.c.borderStrong,
    marginTop: 14,
    marginBottom: 12,
  },

  leftText: {
    fontFamily: theme.f.regular,
    fontSize: 14,
    textAlign: "center",
  },

  codeBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: theme.c.primary,
    backgroundColor: theme.c.primary,
    borderRadius: theme.s.buttonRadius,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },

  codeBtnText: {
    fontFamily: theme.f.medium,
    fontSize: 14,
    letterSpacing: 2,
    color: theme.c.primaryText,
  },

  howTitle: {
    marginTop: 26,
    marginBottom: 16,
    fontFamily: theme.f.medium,
    fontSize: 20,
    letterSpacing: 2,
    textAlign: "center",
  },

  stepsWrap: { gap: 14 },

  stepRow: {
    borderWidth: 1,
    borderColor: theme.c.borderStrong,
    borderRadius: theme.s.cardRadius,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 14,
  },

  stepNumBox: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: theme.c.borderStrong,
    borderRadius: theme.s.cardRadius,
    alignItems: "center",
    justifyContent: "center",
  },

  stepNum: {
    fontFamily: theme.f.medium,
    fontSize: 14,
  },

  stepText: {
    flex: 1,
    fontFamily: theme.f.regular,
    fontSize: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    padding: theme.s.pad,
  },

  modalCard: {
    backgroundColor: theme.c.surface,
    borderWidth: 1,
    borderColor: theme.c.borderStrong,
    borderRadius: theme.s.cardRadius,
    padding: 18,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  modalTitle: {
    fontFamily: theme.f.medium,
    fontSize: 16,
    letterSpacing: 2,
  },

  modalCodeBox: {
    borderWidth: 1,
    borderColor: theme.c.borderStrong,
    borderRadius: theme.s.cardRadius,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 16,
  },

  modalInstruction: {
    fontFamily: theme.f.regular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.c.muted,
    marginBottom: 14,
  },

  modalCode: {
    fontFamily: theme.f.medium,
    fontSize: 64,
    letterSpacing: 18,
  },

  modalCloseBtn: {
    height: 54,
    backgroundColor: theme.c.primary,
    borderRadius: theme.s.buttonRadius,
    alignItems: "center",
    justifyContent: "center",
  },

  modalCloseText: {
    fontFamily: theme.f.medium,
    fontSize: 14,
    letterSpacing: 2,
    color: theme.c.primaryText,
  },
});
