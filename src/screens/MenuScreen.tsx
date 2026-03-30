import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
} from "react-native";
import { Leaf, CupSoda, Utensils } from "lucide-react-native";

import { theme } from "../ui/theme";
import { supabase } from "../lib/supabase";
import { MncHeader } from "../components/MncHeader";
import ProfileScreen from "./ProfileScreen";
import { MenuCategory, MenuItemT } from "../components/MenuCategory";

type DbItem = {
  id: string;
  category: string;
  section: string;
  title: string;
  description: string | null;
  price: number;
  order_index: number;
};

const CATS = [
  { key: "MATCHA", label: "MATCHA", Icon: Leaf },
  { key: "NAPOJE", label: "NAPOJE", Icon: CupSoda },
  { key: "JEDZENIE", label: "JEDZENIE", Icon: Utensils },
] as const;

type CatKey = (typeof CATS)[number]["key"];

export default function MenuScreen() {
  const [cat, setCat] = useState<CatKey>("MATCHA");
  const [items, setItems] = useState<DbItem[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadMenu = useCallback(async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("id, category, section, title, description, price, order_index")
      .order("category", { ascending: true })
      .order("section", { ascending: true })
      .order("order_index", { ascending: true });

    if (error) {
      Alert.alert("Menu error", error.message);
      return;
    }
    setItems((data ?? []) as DbItem[]);
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadMenu();
    } finally {
      setRefreshing(false);
    }
  }, [loadMenu]);

  const filtered = useMemo(() => items.filter((x) => x.category === cat), [items, cat]);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItemT[]>();
    for (const it of filtered) {
      if (!map.has(it.section)) map.set(it.section, []);
      map.get(it.section)!.push({
        id: it.id,
        title: it.title,
        description: it.description,
        price: it.price,
      });
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <View style={styles.root}>
      <MncHeader onProfile={() => setProfileOpen(true)} />

      {/* Pasek MATCHA / NAPOJE / JEDZENIE */}
      <View style={styles.catRow}>
        {CATS.map((c, idx) => {
          const active = c.key === cat;
          const Icon = c.Icon;

          return (
            <Pressable
              key={c.key}
              onPress={() => setCat(c.key)}
              style={[
                styles.catItem,
                active ? styles.catItemActive : styles.catItemInactive,
                idx === 1 ? styles.catMidBorders : null,
              ]}
            >
              <Icon size={18} strokeWidth={1.75} color={active ? "#FFF" : "#000"} />
              <Text style={[styles.catLabel, active ? styles.catLabelActive : styles.catLabelInactive]}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: theme.s.pad, paddingBottom: 120 }}
      >
        {grouped.map(([sectionTitle, sectionItems]) => (
          <MenuCategory key={sectionTitle} sectionTitle={sectionTitle} items={sectionItems} defaultOpen />
        ))}

        {grouped.length === 0 && <Text style={{ color: theme.c.muted }}>Brak pozycji w tej kategorii.</Text>}
      </ScrollView>

      <Modal visible={profileOpen} animationType="slide" onRequestClose={() => setProfileOpen(false)}>
        <ProfileScreen onClose={() => setProfileOpen(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.c.bg },

  catRow: {
    flexDirection: "row",
    // ✅ USUNIĘTA górna kreska, żeby nie dublować z headerem
    borderBottomWidth: 1,
    borderColor: theme.c.borderStrong,
    backgroundColor: "#FFF",
  },

  catItem: {
    flex: 1,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  catMidBorders: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.c.borderStrong,
  },

  catItemActive: { backgroundColor: "#000" },
  catItemInactive: { backgroundColor: "#FFF" },

  catLabel: {
    fontFamily: theme.f.medium,
    fontSize: theme.t.catLabel.fontSize,
    letterSpacing: theme.t.catLabel.letterSpacing,
  },
  catLabelActive: { color: "#FFF" },
  catLabelInactive: { color: "#000" },
});