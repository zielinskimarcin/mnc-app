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
        <User size={20} strokeWidth={1.6} color="#000" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.c.bg,
    borderBottomWidth: 1,
    borderColor: theme.c.borderStrong ?? "#000",
    paddingBottom: 18,           // robi “dużo miejsca” jak na screenie
    alignItems: "center",
    justifyContent: "center",
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  brandText: {
  fontFamily: theme.t.brand.fontFamily,
  fontSize: 28,        // ⬅️ było 30
  letterSpacing: 1.2,
  color: "#0A0A0A",
},


  // ™ jako mały superscript, jak na logo
  tm: {
    marginLeft: 4,
    marginTop: 4,
    fontSize: 12,
    fontFamily: theme.f.regular,
    color: "#0A0A0A",
  },

  profileBtn: {
  position: "absolute",
  right: theme.s.pad,
  bottom: 26,   // ⬅️ było 18 → ikonka idzie do góry
},

});
