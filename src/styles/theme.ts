export const theme = {
  colors: {
    bg: "#070A0B",              // near-black
    surface: "rgba(255,255,255,0.03)",
    surfaceStrong: "rgba(255,255,255,0.06)",

    text: "rgba(255,255,255,0.92)",
    textMuted: "rgba(255,255,255,0.72)",
    textFaint: "rgba(255,255,255,0.54)",

    border: "rgba(255,255,255,0.10)",
    borderStrong: "rgba(255,255,255,0.18)",

    lime: "#B6FF4D"            // neon lime accent (BoltBlue)
  },

  radius: {
    sm: 10,
    md: 14,
    lg: 18
  },

  shadow: {
    card: "0 10px 30px rgba(0,0,0,0.55)",
    glowLime: "0 0 18px rgba(182,255,77,0.14)"
  },

  font: {
    title: 28
  },

  spacing: {
    pageX: 24
  }
} as const;