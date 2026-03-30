export const theme = {
  c: {
    bg: "#FFFFFF",
    text: "#0A0A0A",
    muted: "#717182",
    divider: "#E5E7EB",
    border: "rgba(0,0,0,0.10)", // cienkie linie
    borderStrong: "#000000",     // tylko tam gdzie ma być “mocna” rama
  },

  s: {
    pad: 24,
    border: 1,
    tabBaseH: 64,
  },

  f: {
    regular: "Inter_400Regular" as const,
    medium: "Inter_500Medium" as const,
    semibold: "Inter_600SemiBold" as const,
  },

  t: {
  // LOGO / brand jak na screenie (mniejszy spacing, cieńsze)
  brand: {
    fontFamily: "Inter_500Medium" as const, // cieniej niż 600
    fontSize: 30,                           // “wyższe”
    letterSpacing: 1.2,                     // mniejszy spacing między literami
    color: "#0A0A0A",
  },

  catLabel: {
    fontFamily: "Inter_500Medium" as const,
    fontSize: 12,
    letterSpacing: 2,
  },
},

};
