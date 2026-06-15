import type { Goal } from "./model";

export type DecoratedGoal = Goal & {
  total: number;
  currentMilestone: string;
  pct: number;
  status: string;
  statusColor: string;
  nextLabel: string;
  progressText: string;
  cardBg: string;
  cardBd: string;
  nameColor: string;
  iconBg: string;
};

export function decorateGoal(g: Goal): DecoratedGoal {
  const total = g.milestones.length;
  const cm = g.completed < total ? g.milestones[g.completed] : "Complete";
  const pct = total ? Math.round((g.completed / total) * 100) : 0;

  let status: string;
  let statusColor: string;
  let nextLabel: string;
  let progressText: string;

  if (g.locked) {
    status = "Locked";
    statusColor = "#6b7178";
    nextLabel = "Unlock by building your Power base first";
    progressText = "Locked";
  } else if (g.completed === 0) {
    status = "Start";
    statusColor = "#c6ff3d";
    nextLabel = "Begin with: " + cm;
    progressText = "0 of " + total + " milestones";
  } else if (g.completed >= total) {
    status = "Done ✓";
    statusColor = "#3dffb0";
    nextLabel = "Goal complete";
    progressText = total + " of " + total + " · 100%";
  } else {
    status = g.completed + " / " + total;
    statusColor = g.catColor;
    nextLabel = "Now: " + cm + " · " + g.completed + " of " + total;
    progressText = "Milestone " + (g.completed + 1) + " of " + total + " · " + pct + "%";
  }

  return {
    ...g,
    total,
    currentMilestone: cm,
    pct,
    status,
    statusColor,
    nextLabel,
    progressText,
    cardBg: g.locked ? "#121316" : "#16181d",
    cardBd: "rgba(255,255,255,0.07)",
    nameColor: g.locked ? "#9aa0a6" : "#f4f5f3",
    iconBg: "rgba(255,255,255,0.05)",
  };
}

/** Decorate the user's goals; the first is treated as the primary/hero goal. */
export function decorateGoals(goals: Goal[]): { all: DecoratedGoal[]; primary: DecoratedGoal | null; others: DecoratedGoal[] } {
  const all = goals.map(decorateGoal);
  return { all, primary: all[0] ?? null, others: all.slice(1) };
}
