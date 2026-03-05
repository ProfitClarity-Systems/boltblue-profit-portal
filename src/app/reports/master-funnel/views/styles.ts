// src/app/reports/master-funnel/views/styles.ts
// Master Funnel shared view styles
// Target: solid, “header-layer” look (no glow, no blur, no gradients)

export const mf = {
  // Outer cards (left funnel / right metrics / compare / trend wrappers)
  card: {
    padding: 16,
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.10)",
  } as const,

  // Funnel stage panels
  stage: {
    position: "relative" as const,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.12)",
    padding: 14,
    textAlign: "center" as const,
  },

  stageHi: {
    position: "relative" as const,
    borderRadius: 18,
    border: "1px solid rgba(164,255,0,0.45)",
    background: "rgba(0,0,0,0.12)",
    padding: 14,
    textAlign: "center" as const,
  },

  // Badges (e.g. “Unqualified”)
  badgeBase: {
    position: "absolute" as const,
    top: 10,
    right: 10,
    fontSize: 11,
    fontWeight: 800,
    borderRadius: 999,
    padding: "4px 8px",
    whiteSpace: "nowrap" as const,
    letterSpacing: 0.2,
  } as const,

  badgeMuted: {
    color: "var(--text-muted)",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
  } as const,

  badgeWarn: {
    color: "rgba(255,210,120,0.95)",
    border: "1px solid rgba(255,210,120,0.35)",
    background: "rgba(0,0,0,0.18)",
  } as const,

  // Arrow pill between stages
  arrowPill: {
    wrap: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(0,0,0,0.18)",
      padding: "8px 12px",
    } as const,
    divider: { width: 1, height: 18, background: "rgba(255,255,255,0.10)" } as const,
    pct: {
      fontSize: 13,
      fontWeight: 950,
      letterSpacing: 0.2,
      fontVariantNumeric: "tabular-nums",
    } as const,
    iconStroke: "rgba(164,255,0,0.85)",
  } as const,

  // Dial card (container + label)
  dial: {
    card: {
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(0,0,0,0.12)",
      padding: 16,
    } as const,
    label: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginBottom: 12,
      textTransform: "uppercase",
      letterSpacing: 0.35,
      textAlign: "center" as const,
    } as const,
    trackStroke: "rgba(255,255,255,0.10)",
    progressStroke: "rgba(164,255,0,0.70)",
  } as const,
};