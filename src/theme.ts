// Peak — "performance-tech" dark theme tokens, lifted from the Peak.dc design.
export const C = {
  accent: "#c6ff3d", // lime
  mint: "#3dffb0",
  blue: "#5aa9ff",
  orange: "#ff8a3d",
  red: "#ff4d3d",
  redAlt: "#ff5a3c",

  screen: "#0a0b0d",
  card: "#16181d",
  inner: "#0f1115",
  innerAlt: "#0e1014",
  lockCard: "#121316",

  ink: "#f4f5f3", // primary text
  ink2: "#e8eaec",
  ink3: "#cdd2d6",
  sub: "#9aa0a6", // secondary text
  muted: "#6b7178",
  muted2: "#5a6066",

  line: "rgba(255,255,255,0.07)",
  line2: "rgba(255,255,255,0.08)",
  line3: "rgba(255,255,255,0.06)",
} as const;

export const mono = "'JetBrains Mono', monospace";
export const sans = "'Space Grotesk', sans-serif";

// Strength → thermal color ramp (cold blue → hot red).
export function heat(s: number): string {
  if (s >= 88) return "#ff4d3d";
  if (s >= 78) return "#ff8a3d";
  if (s >= 66) return "#ffd23f";
  if (s >= 52) return "#8fd14f";
  if (s >= 38) return "#2fb89a";
  return "#3f54a8";
}

import type { WorkoutType } from "./model";

// Each workout type owns an accent — derived here so a freshly logged session
// picks up the right color without storing it on every record.
export const WORKOUT_THEME: Record<WorkoutType, { color: string; tagBg: string }> = {
  Gym: { color: "#c6ff3d", tagBg: "rgba(198,255,61,0.12)" },
  Cardio: { color: "#3dffb0", tagBg: "rgba(61,255,176,0.12)" },
  Sport: { color: "#ff8a3d", tagBg: "rgba(255,138,61,0.12)" },
  Mobility: { color: "#5aa9ff", tagBg: "rgba(90,169,255,0.12)" },
};

// Goal category → accent, used when the user creates a new goal.
const CAT_COLORS: Record<string, string> = {
  Endurance: "#3dffb0",
  Balance: "#5aa9ff",
  Skill: "#ff8a3d",
  Strength: "#c6ff3d",
  Power: "#ff5a3c",
  Mobility: "#5aa9ff",
  Speed: "#ffd23f",
};
export function catColor(cat: string): string {
  return CAT_COLORS[cat] ?? C.accent;
}
