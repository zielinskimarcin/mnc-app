import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { User } from "lucide-react-native";
import { theme } from "../ui/theme";
import { tenant } from "../config/tenant";

export function MncHeader({ onProfile }: { onProfile?: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 18 }]}>
      {/* Brand */}
      <View style={styles.brandRow}>
        <Text style={styles.brandText}>{tenant.brandName}</Text>
        {tenant.brandMark ? <Text style={styles.tm}>{tenant.brandMark}</Text> : null}
      </View>

      {/* Profile */}
      <Pressable onPress={onProfile} hitSlop={12} style={styles.profileBtn}>
        <User size={20} strokeWidth={1.6} color={theme.c.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.c.bg,
    borderBottomWidth: 1,
    borderColor: theme.c.borderStrong,
    paddingBottom: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  brandText: {
    fontFamily: theme.t.brand.fontFamily,
    fontSize: theme.t.brand.fontSize,
    letterSpacing: theme.t.brand.letterSpacing,
    color: theme.t.brand.color,
  },

  tm: {
    marginLeft: 4,
    marginTop: 4,
    fontSize: 12,
    fontFamily: theme.f.regular,
    color: theme.c.text,
  },

  profileBtn: {
    position: "absolute",
    right: theme.s.pad,
    bottom: 26,
  },

});
