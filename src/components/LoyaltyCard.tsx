import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { theme } from "../ui/theme";

export function LoyaltyCard({ points, maxPoints }: { points: number; maxPoints: number }) {
  const remaining = Math.max(0, maxPoints - points);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.title}>TWOJE PUNKTY</Text>
        <Text style={styles.big}>
          {points} / {maxPoints}
        </Text>
      </View>

      <View style={styles.grid}>
        {Array.from({ length: maxPoints }).map((_, idx) => {
          const filled = idx < points;
          return (
            <View key={idx} style={[styles.cell, filled ? styles.cellFilled : styles.cellEmpty]}>
              <Feather name="coffee" size={22} color={filled ? "#FFF" : "#000"} />
            </View>
          );
        })}
      </View>

      <View style={styles.bottom}>
        <Text style={styles.bottomText}>
          {remaining === 0 ? "Gratulacje! Odbierz darmową kawę!" : `Jeszcze ${remaining} do nagrody`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderColor: theme.c.border,
    padding: 18,
    backgroundColor: theme.c.bg,
  },
  top: { alignItems: "center", marginBottom: 16, gap: 6 },
  title: { fontWeight: "800", letterSpacing: 1 },
  big: { fontSize: 34, fontWeight: "700", letterSpacing: 2 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  cell: {
    width: "18.2%", // 5 kolumn mniej więcej (działa dobrze bez mierzenia)
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: theme.c.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cellFilled: { backgroundColor: "#000" },
  cellEmpty: { backgroundColor: "#FFF" },

  bottom: { borderTopWidth: 1, borderColor: theme.c.border, paddingTop: 12, alignItems: "center" },
  bottomText: { fontSize: 13 },
});