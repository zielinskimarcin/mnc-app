import { clientConfig } from "../config/client";

const clientTheme = clientConfig.theme;

export const theme = {
  c: {
    bg: clientTheme.colors.background,
    surface: clientTheme.colors.surface,
    text: clientTheme.colors.text,
    muted: clientTheme.colors.muted,
    divider: clientTheme.colors.divider,
    border: clientTheme.colors.border,
    borderStrong: clientTheme.colors.borderStrong,
    primary: clientTheme.colors.primary,
    primaryText: clientTheme.colors.primaryText,
    danger: clientTheme.colors.danger,
  },

  s: {
    pad: clientTheme.spacing.page,
    border: 1,
    tabBaseH: 64,
    cardRadius: clientTheme.radii.card,
    buttonRadius: clientTheme.radii.button,
    sheetRadius: clientTheme.radii.sheet,
  },

  f: {
    regular: "Inter_400Regular" as const,
    medium: "Inter_500Medium" as const,
    semibold: "Inter_600SemiBold" as const,
  },

  t: {
    brand: {
      fontFamily: "Inter_500Medium" as const,
      fontSize: clientTheme.typography.brandFontSize,
      letterSpacing: clientTheme.typography.brandLetterSpacing,
      color: clientTheme.colors.text,
    },

    catLabel: {
      fontFamily: "Inter_500Medium" as const,
      fontSize: clientTheme.typography.categoryFontSize,
      letterSpacing: clientTheme.typography.categoryLetterSpacing,
    },
  },
};
