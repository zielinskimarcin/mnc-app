import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Leaf, CupSoda, Utensils } from "lucide-react-native";
import { theme } from "../ui/theme";

const ITEMS = [
  { key: "MATCHA", label: "MATCHA", Icon: Leaf },
  { key: "NAPOJE", label: "NAPOJE", Icon: CupSoda },
  { key: "JEDZENIE", label: "JEDZENIE", Icon: Utensils },
] as const;

export type CategoryKey = (typeof ITEMS)[number]["key"];

export function CategoryBar({
  value,
  onChange,
}: {
  value: CategoryKey;
  onChange: (k: CategoryKey) => void;
}) {
  return (
    <View style={styles.row}>
      {ITEMS.map((it, idx) => {
        const active = it.key === value;
        const Icon = it.Icon;

        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={[
              styles.item,
              active ? styles.itemActive : styles.itemInactive,
              idx === 1 ? styles.itemMid : null,
            ]}
          >
            <Icon
              size={18}
              strokeWidth={1.75}
              color={active ? "#FFFFFF" : "#000000"}
            />
            <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.c.borderStrong ?? "#000",
    backgroundColor: "#FFF",
  },

  item: {
    flex: 1,
    height: 82, // bardzo podobne do Twojego mocka
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  itemMid: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.c.borderStrong ?? "#000",
  },

  itemActive: { backgroundColor: "#000" },
  itemInactive: { backgroundColor: "#FFF" },

  label: {
    fontFamily: theme.t.catLabel.fontFamily,
    fontSize: 12,
    letterSpacing: 2, // to daje ten “premium” look z mocka
  },
  labelActive: { color: "#FFF" },
  labelInactive: { color: "#000" },
});
