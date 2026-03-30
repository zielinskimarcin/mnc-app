import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Coffee, Gift } from "lucide-react-native";

import MenuScreen from "../screens/MenuScreen";
import PointsScreen from "../screens/PointsScreen";
import { theme } from "../ui/theme";

const Tab = createBottomTabNavigator();

// wysokość “części widocznej” bez safe-area
const CONTENT_H = 78;


function MncTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const active = state.index;

  return (
    <View style={styles.bar}>
      {state.routes.map((route: any, idx: number) => {
        const isActive = idx === active;
        const Icon = route.name === "MENU" ? Coffee : Gift;

        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={[
              styles.tab,
              isActive ? styles.tabActive : styles.tabInactive,
              idx === 0 ? styles.leftDivider : null,
              { paddingBottom: insets.bottom }, // 🔑 kolor tab-a idzie do samego dołu
            ]}
          >
            <View style={styles.inner}>
              <Icon
                size={18}
                strokeWidth={2.0} // 🔑 minimalnie grubsze niż było
                color={isActive ? "#FFF" : "#000"}
              />
              <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
                {route.name}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <MncTabBar {...props} />}>
      <Tab.Screen name="MENU" component={MenuScreen} />
      <Tab.Screen name="PUNKTY" component={PointsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#000",
    backgroundColor: "#FFF",
  },

  tab: {
  flex: 1,
  height: CONTENT_H,
  justifyContent: "center",
  paddingTop: 12, // ⬅️ było 8
},


  tabActive: { backgroundColor: "#000" },
  tabInactive: { backgroundColor: "#FFF" },

  leftDivider: { borderRightWidth: 1, borderColor: "#000" },

  // 🔑 ikonka po LEWEJ stronie napisu
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  label: {
  fontFamily: theme.f.semibold, // ⬅️ lekko grubiej niż medium
  fontSize: 16,                 // ⬅️ minimalnie większe
  letterSpacing: 1.8,           // ⬅️ zachowuje „wysokie” litery
},

  labelActive: { color: "#FFF" },
  labelInactive: { color: "#000" },
});
