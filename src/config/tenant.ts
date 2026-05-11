import type { ComponentType } from "react";
import { Coffee, CupSoda, Gift, Leaf, Utensils } from "lucide-react-native";

type IconComponent = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

export type MenuCategoryConfig = {
  key: string;
  label: string;
  Icon: IconComponent;
};

export const tenant = {
  brandName: "MNC CONCEPT",
  brandMark: "™",
  appScheme: "mncconcept",
  menuCategories: [
    { key: "MATCHA", label: "MATCHA", Icon: Leaf },
    { key: "NAPOJE", label: "NAPOJE", Icon: CupSoda },
    { key: "JEDZENIE", label: "JEDZENIE", Icon: Utensils },
  ],
  tabs: {
    menu: { routeName: "MENU", label: "MENU", Icon: Coffee },
    points: { routeName: "PUNKTY", label: "PUNKTY", Icon: Gift },
  },
  loyalty: {
    maxPoints: 10,
    rewardReadyText: "Gratulacje! Odbierz darmową matchę!",
    pointsUntilRewardSuffix: "do nagrody",
    steps: [
      "Zbieraj punkty przy każdym zakupie matchy",
      "10 punktów = matcha gratis",
      "Pokaż aplikację przy kasie",
    ],
    pointWords: {
      singular: "punkt",
      few: "punkty",
      many: "punktów",
    },
  },
} satisfies {
  brandName: string;
  brandMark: string;
  appScheme: string;
  menuCategories: MenuCategoryConfig[];
  tabs: {
    menu: { routeName: string; label: string; Icon: IconComponent };
    points: { routeName: string; label: string; Icon: IconComponent };
  };
  loyalty: {
    maxPoints: number;
    rewardReadyText: string;
    pointsUntilRewardSuffix: string;
    steps: string[];
    pointWords: {
      singular: string;
      few: string;
      many: string;
    };
  };
};

export type MenuCategoryKey = (typeof tenant.menuCategories)[number]["key"];

export const defaultMenuCategory = tenant.menuCategories[0].key;

export function formatPointWord(count: number) {
  const abs = Math.abs(count);
  if (abs === 1) return tenant.loyalty.pointWords.singular;

  const lastDigit = abs % 10;
  const lastTwoDigits = abs % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) {
    return tenant.loyalty.pointWords.few;
  }

  return tenant.loyalty.pointWords.many;
}
