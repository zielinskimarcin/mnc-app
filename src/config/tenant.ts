import type { ComponentType } from "react";
import {
  Beef,
  Beer,
  CakeSlice,
  Coffee,
  Croissant,
  CupSoda,
  Gift,
  GlassWater,
  IceCreamBowl,
  Leaf,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  Star,
  Utensils,
  Wine,
} from "lucide-react-native";
import type { AppLanguage } from "../i18n/types";
import { clientConfig } from "./client";

type IconComponent = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

type LocalizedText = Record<AppLanguage, string>;
type IconName = keyof typeof iconRegistry;

export type MenuCategoryConfig = {
  key: string;
  label: LocalizedText;
  Icon: IconComponent;
};

const iconRegistry = {
  Beef,
  Beer,
  CakeSlice,
  Coffee,
  Croissant,
  CupSoda,
  Gift,
  GlassWater,
  IceCreamBowl,
  Leaf,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  Star,
  Utensils,
  Wine,
};

function resolveIcon(name: string): IconComponent {
  return iconRegistry[name as IconName] ?? Coffee;
}

export const tenant = {
  slug: clientConfig.slug,
  brandName: clientConfig.brand.name,
  brandMark: clientConfig.brand.mark,
  appScheme: clientConfig.native.scheme,
  menuCategories: clientConfig.menuCategories.map((category) => ({
    key: category.key,
    label: category.label,
    Icon: resolveIcon(category.icon),
  })),
  tabs: {
    menu: {
      routeName: clientConfig.tabs.menu.routeName,
      label: clientConfig.tabs.menu.label,
      Icon: resolveIcon(clientConfig.tabs.menu.icon),
    },
    points: {
      routeName: clientConfig.tabs.points.routeName,
      label: clientConfig.tabs.points.label,
      Icon: resolveIcon(clientConfig.tabs.points.icon),
    },
  },
  loyalty: clientConfig.loyalty,
} satisfies {
  slug: string;
  brandName: string;
  brandMark: string;
  appScheme: string;
  menuCategories: MenuCategoryConfig[];
  tabs: {
    menu: { routeName: string; label: LocalizedText; Icon: IconComponent };
    points: { routeName: string; label: LocalizedText; Icon: IconComponent };
  };
  loyalty: {
    maxPoints: number;
    copy: Record<
      AppLanguage,
      {
        rewardReadyText: string;
        pointsUntilRewardSuffix: string;
        steps: string[];
        pointWords: {
          singular: string;
          few: string;
          many: string;
        };
      }
    >;
  };
};

export function getLoyaltyCopy(language: AppLanguage) {
  return tenant.loyalty.copy[language];
}

export function formatPointWord(count: number, language: AppLanguage) {
  const words = getLoyaltyCopy(language).pointWords;

  if (language === "en") {
    return Math.abs(count) === 1 ? words.singular : words.many;
  }

  const abs = Math.abs(count);
  if (abs === 1) return words.singular;

  const lastDigit = abs % 10;
  const lastTwoDigits = abs % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) {
    return words.few;
  }

  return words.many;
}

export function localizedText(text: LocalizedText, language: AppLanguage) {
  return text[language] ?? text.pl;
}

export type MenuCategoryKey = (typeof tenant.menuCategories)[number]["key"];

export const defaultMenuCategory = tenant.menuCategories[0].key;
