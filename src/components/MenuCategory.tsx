import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../ui/theme";

export type MenuItemT = {
  id: string;
  title: string;
  description: string | null;
  price: number;
};

export function MenuCategory({
  sectionTitle,
  items,
  defaultOpen = false, // ✅ ZAWSZE ZWINIĘTE DOMYŚLNIE
}: {
  sectionTitle: string;
  items: MenuItemT[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(false); // ✅ ZAWSZE ZWINIĘTE

  const formatted = useMemo(
    () =>
      items.map((it) => ({
        ...it,
        priceText: `${(it.price / 100).toFixed(2).replace(".", ",")} zł`,
      })),
    [items]
  );

  return (
    <View style={styles.wrap}>
      {/* HEADER */}
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.trigger}>
        <Text style={styles.triggerText}>{sectionTitle}</Text>
        <Text style={styles.triggerTextSymbol}>{open ? "—" : "+"}</Text>
      </Pressable>

      {/* LINIA ODDZIELAJĄCA */}
      <View style={styles.divider} />

      {/* CONTENT */}
      {open && (
        <View style={styles.content}>
          {formatted.map((it, idx) => (
            <View
              key={it.id}
              style={[
                styles.itemRow,
                idx === formatted.length - 1 && styles.itemLast,
              ]}
            >
              <View style={styles.topRow}>
                <Text style={styles.itemTitle}>{it.title}</Text>
                <Text style={styles.price}>{it.priceText}</Text>
              </View>

              {!!it.description && (
                <Text style={styles.desc}>{it.description}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: "#000",
    marginBottom: 14,
    backgroundColor: "#FFF",
  },

  trigger: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
  },

  triggerText: {
    fontFamily: theme.f.medium,
    fontSize: 14,
    letterSpacing: 2,
    color: "#000",
  },

  triggerTextSymbol: {
    fontFamily: theme.f.medium,
    fontSize: 16,
    letterSpacing: 1,
    color: "#000",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 14,
  },

  content: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 6,
  },

  itemRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },

  itemLast: {
    borderBottomWidth: 0,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  itemTitle: {
    fontFamily: theme.f.regular,
    fontSize: 16,
    color: "#000",
    flex: 1,
  },

  price: {
    fontFamily: theme.f.medium,
    fontSize: 16,
    color: "#000",
  },

  desc: {
    marginTop: 6,
    color: "#6B7280",
    fontFamily: theme.f.regular,
    fontSize: 13,
    lineHeight: 18,
  },
});