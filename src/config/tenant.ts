import type { ComponentType } from "react";
import { Coffee, CupSoda, Gift, Leaf, Utensils } from "lucide-react-native";
import type { AppLanguage } from "../i18n/types";

type IconComponent = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

type LocalizedText = Record<AppLanguage, string>;

export type MenuCategoryConfig = {
  key: string;
  label: LocalizedText;
  Icon: IconComponent;
};

export const tenant = {
  brandName: "MNC CONCEPT",
  brandMark: "™",
  appScheme: "mncconcept",
  menuCategories: [
    { key: "MATCHA", label: { pl: "MATCHA", en: "MATCHA" }, Icon: Leaf },
    { key: "NAPOJE", label: { pl: "NAPOJE", en: "DRINKS" }, Icon: CupSoda },
    { key: "JEDZENIE", label: { pl: "JEDZENIE", en: "FOOD" }, Icon: Utensils },
  ],
  tabs: {
    menu: { routeName: "MENU", label: { pl: "MENU", en: "MENU" }, Icon: Coffee },
    points: { routeName: "PUNKTY", label: { pl: "PUNKTY", en: "POINTS" }, Icon: Gift },
  },
  loyalty: {
    maxPoints: 10,
    copy: {
      pl: {
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
      en: {
        rewardReadyText: "Your reward is ready!",
        pointsUntilRewardSuffix: "until your reward",
        steps: [
          "Collect points with every matcha purchase",
          "10 points = a free matcha",
          "Show the app at checkout",
        ],
        pointWords: {
          singular: "point",
          few: "points",
          many: "points",
        },
      },
    },
  },
} satisfies {
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
