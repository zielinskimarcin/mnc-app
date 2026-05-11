import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MenuScreen from "../screens/MenuScreen";
import PointsScreen from "../screens/PointsScreen";
import { theme } from "../ui/theme";
import { localizedText, tenant } from "../config/tenant";
import { useLanguage } from "../i18n/LanguageProvider";

const Tab = createBottomTabNavigator();

const CONTENT_H = 78;

const TABS = [
  {
    routeName: tenant.tabs.menu.routeName,
    label: tenant.tabs.menu.label,
    Icon: tenant.tabs.menu.Icon,
    component: MenuScreen,
  },
  {
    routeName: tenant.tabs.points.routeName,
    label: tenant.tabs.points.label,
    Icon: tenant.tabs.points.Icon,
    component: PointsScreen,
  },
];


function MncTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const active = state.index;

  return (
    <View style={styles.bar}>
      {state.routes.map((route: any, idx: number) => {
        const isActive = idx === active;
        const tab = TABS.find((item) => item.routeName === route.name) ?? TABS[idx];
        const Icon = tab.Icon;

        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={[
              styles.tab,
              isActive ? styles.tabActive : styles.tabInactive,
              idx === 0 ? styles.leftDivider : null,
              { paddingBottom: insets.bottom },
            ]}
          >
            <View style={styles.inner}>
              <Icon
                size={18}
                strokeWidth={2.0}
                color={isActive ? theme.c.primaryText : theme.c.primary}
              />
              <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
                {localizedText(tab.label, language)}
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
      {TABS.map((tab) => (
        <Tab.Screen key={tab.routeName} name={tab.routeName} component={tab.component} />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: theme.c.borderStrong,
    backgroundColor: theme.c.surface,
  },

  tab: {
    flex: 1,
    height: CONTENT_H,
    justifyContent: "center",
    paddingTop: 12,
  },


  tabActive: { backgroundColor: theme.c.primary },
  tabInactive: { backgroundColor: theme.c.surface },

  leftDivider: { borderRightWidth: 1, borderColor: theme.c.borderStrong },

  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  label: {
    fontFamily: theme.f.semibold,
    fontSize: 16,
    letterSpacing: 1.8,
  },

  labelActive: { color: theme.c.primaryText },
  labelInactive: { color: theme.c.primary },
});
