import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../ui/theme";
import { localizedText, MenuCategoryKey, tenant } from "../config/tenant";
import { useLanguage } from "../i18n/LanguageProvider";

export type CategoryKey = MenuCategoryKey;

export function CategoryBar({
  value,
  onChange,
}: {
  value: CategoryKey;
  onChange: (k: CategoryKey) => void;
}) {
  const { language } = useLanguage();

  return (
    <View style={styles.row}>
      {tenant.menuCategories.map((it, idx) => {
        const active = it.key === value;
        const Icon = it.Icon;

        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={[
              styles.item,
              tenant.menuCategories.length <= 3 ? styles.itemFlexible : styles.itemFixed,
              active ? styles.itemActive : styles.itemInactive,
              idx > 0 ? styles.itemDivider : null,
            ]}
          >
            <Icon
              size={18}
              strokeWidth={1.75}
              color={active ? theme.c.primaryText : theme.c.primary}
            />
            <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
              {localizedText(it.label, language)}
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
    borderColor: theme.c.borderStrong,
    backgroundColor: theme.c.surface,
  },

  item: {
    height: 82,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  itemFlexible: { flex: 1 },
  itemFixed: { width: 112 },

  itemDivider: {
    borderLeftWidth: 1,
    borderColor: theme.c.borderStrong,
  },

  itemActive: { backgroundColor: theme.c.primary },
  itemInactive: { backgroundColor: theme.c.surface },

  label: {
    fontFamily: theme.t.catLabel.fontFamily,
    fontSize: 12,
    letterSpacing: 2,
  },
  labelActive: { color: theme.c.primaryText },
  labelInactive: { color: theme.c.primary },
});
