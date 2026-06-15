// Sample content for Peak. Authored realistic data, lifted from the Peak.dc design —
// easy to swap for real inputs / a backend later.

export type Muscle = {
  id: string;
  name: string;
  score: number;
  lift: string;
  best: string;
  ratio: string;
  pct: string;
  trend: string;
  ex: string[];
};

export const FRONT_MUSCLES: Muscle[] = [
  { id: "delts", name: "Shoulders", score: 71, lift: "Overhead Press", best: "55 kg", ratio: "0.7× BW", pct: "66th", trend: "+4%", ex: ["Overhead Press", "Lateral Raise", "Arnold Press"] },
  { id: "chest", name: "Chest", score: 84, lift: "Bench Press", best: "95 kg", ratio: "1.2× BW", pct: "81st", trend: "+6%", ex: ["Bench Press", "Incline DB Press", "Cable Fly"] },
  { id: "biceps", name: "Biceps", score: 88, lift: "Barbell Curl", best: "48 kg", ratio: "0.6× BW", pct: "88th", trend: "+9%", ex: ["Barbell Curl", "Hammer Curl", "Chin-up"] },
  { id: "forearms", name: "Forearms", score: 63, lift: "Wrist Curl", best: "30 kg", ratio: "0.4× BW", pct: "58th", trend: "+3%", ex: ["Wrist Curl", "Farmer Carry", "Dead Hang"] },
  { id: "abs", name: "Core", score: 76, lift: "Cable Crunch", best: "70 kg", ratio: "—", pct: "74th", trend: "+5%", ex: ["Hanging Leg Raise", "Cable Crunch", "Ab Wheel"] },
  { id: "obliques", name: "Obliques", score: 58, lift: "Pallof Press", best: "35 kg", ratio: "—", pct: "55th", trend: "+2%", ex: ["Pallof Press", "Side Plank", "Wood Chop"] },
  { id: "quads", name: "Quads", score: 80, lift: "Back Squat", best: "140 kg", ratio: "1.8× BW", pct: "78th", trend: "+5%", ex: ["Back Squat", "Leg Press", "Lunge"] },
  { id: "shins", name: "Shins / Tibialis", score: 42, lift: "Tib Raise", best: "25 kg", ratio: "—", pct: "34th", trend: "+1%", ex: ["Tibialis Raise", "Banded Dorsiflexion"] },
];

export const BACK_MUSCLES: Muscle[] = [
  { id: "traps", name: "Traps", score: 74, lift: "Barbell Shrug", best: "120 kg", ratio: "—", pct: "70th", trend: "+4%", ex: ["Barbell Shrug", "Rack Pull", "Face Pull"] },
  { id: "rdelts", name: "Rear Delts", score: 66, lift: "Reverse Fly", best: "22 kg", ratio: "—", pct: "62nd", trend: "+3%", ex: ["Reverse Fly", "Face Pull", "Band Pull-apart"] },
  { id: "lats", name: "Lats", score: 70, lift: "Weighted Pull-up", best: "+30 kg", ratio: "—", pct: "69th", trend: "+6%", ex: ["Pull-up", "Lat Pulldown", "Barbell Row"] },
  { id: "triceps", name: "Triceps", score: 82, lift: "Close-grip Bench", best: "80 kg", ratio: "1.0× BW", pct: "79th", trend: "+5%", ex: ["Close-grip Bench", "Skullcrusher", "Dips"] },
  { id: "forearms", name: "Forearms", score: 63, lift: "Wrist Curl", best: "30 kg", ratio: "0.4× BW", pct: "58th", trend: "+3%", ex: ["Wrist Curl", "Farmer Carry", "Dead Hang"] },
  { id: "lowerback", name: "Lower Back", score: 52, lift: "Deadlift", best: "150 kg", ratio: "1.9× BW", pct: "51st", trend: "+2%", ex: ["Deadlift", "Back Extension", "Good Morning"] },
  { id: "glutes", name: "Glutes", score: 78, lift: "Hip Thrust", best: "160 kg", ratio: "2.0× BW", pct: "76th", trend: "+7%", ex: ["Hip Thrust", "Romanian Deadlift", "Cable Kickback"] },
  { id: "hams", name: "Hamstrings", score: 60, lift: "Romanian DL", best: "100 kg", ratio: "1.3× BW", pct: "57th", trend: "+3%", ex: ["Romanian Deadlift", "Leg Curl", "Nordic Curl"] },
  { id: "calves", name: "Calves", score: 49, lift: "Calf Raise", best: "90 kg", ratio: "—", pct: "41st", trend: "+1%", ex: ["Standing Calf Raise", "Seated Calf Raise", "Jump Rope"] },
];

export type Exercise = { name: string; detail: string; pr?: boolean };
export type Workout = {
  title: string;
  type: "Gym" | "Cardio" | "Sport" | "Mobility";
  color: string;
  tagBg: string;
  time: string;
  dur: string;
  sub: string;
  stats: { v: string; k: string }[];
  exercises?: Exercise[];
};

export const FEED: Workout[] = [
  { title: "Push Day", type: "Gym", color: "#c6ff3d", tagBg: "rgba(198,255,61,0.12)", time: "7:10 AM", dur: "52 min", sub: "Chest · Shoulders · Triceps", stats: [{ v: "8", k: "exercises" }, { v: "14.2k", k: "kg volume" }, { v: "+3", k: "PRs" }], exercises: [{ name: "Bench Press", detail: "4×8 · 95kg", pr: true }, { name: "Incline DB Press", detail: "3×10 · 32kg" }, { name: "Overhead Press", detail: "4×8 · 55kg", pr: true }, { name: "Cable Fly", detail: "3×12 · 22kg" }, { name: "Lateral Raise", detail: "3×15 · 12kg" }, { name: "Triceps Pushdown", detail: "3×15 · 35kg" }, { name: "Skullcrusher", detail: "3×10 · 30kg", pr: true }, { name: "Dips", detail: "3×12 · BW" }] },
  { title: "Morning Run", type: "Cardio", color: "#3dffb0", tagBg: "rgba(61,255,176,0.12)", time: "6:02 AM", dur: "32 min", sub: "Riverside loop · Zone 2", stats: [{ v: "5.2", k: "km" }, { v: "6:09", k: "/km pace" }, { v: "148", k: "avg bpm" }] },
  { title: "Pickup Basketball", type: "Sport", color: "#ff8a3d", tagBg: "rgba(255,138,61,0.12)", time: "Yesterday", dur: "70 min", sub: "5v5 · The Yard", stats: [{ v: "612", k: "cal" }, { v: "4.1", k: "km moved" }, { v: "High", k: "intensity" }] },
  { title: "Mobility Flow", type: "Mobility", color: "#5aa9ff", tagBg: "rgba(90,169,255,0.12)", time: "Yesterday", dur: "18 min", sub: "Hips & T-spine", stats: [{ v: "9", k: "positions" }, { v: "+4°", k: "hip ROM" }, { v: "Done", k: "recovery" }] },
  { title: "Pull Day", type: "Gym", color: "#c6ff3d", tagBg: "rgba(198,255,61,0.12)", time: "Tue", dur: "48 min", sub: "Back · Biceps", stats: [{ v: "7", k: "exercises" }, { v: "11.8k", k: "kg volume" }, { v: "+1", k: "PRs" }], exercises: [{ name: "Weighted Pull-up", detail: "4×6 · +20kg", pr: true }, { name: "Barbell Row", detail: "4×8 · 80kg" }, { name: "Lat Pulldown", detail: "3×10 · 60kg" }, { name: "Barbell Curl", detail: "3×10 · 40kg" }, { name: "Hammer Curl", detail: "3×12 · 16kg" }, { name: "Face Pull", detail: "3×15 · 25kg" }, { name: "Barbell Shrug", detail: "4×12 · 120kg" }] },
];

export const METRIC_DEFS: [string, number][] = [
  ["Strength", 82], ["Power", 74], ["Speed", 61], ["Stamina", 68], ["Mobility", 47], ["Balance", 55],
];

export const RADAR = {
  labels: ["STR", "POW", "SPD", "STA", "MOB", "BAL"],
  vals: [82, 74, 61, 68, 47, 55],
};

export type Drill = { name: string; focus: string; vol: string; diff: string; diffColor: string };
export const DRILL_SETS: Record<string, Drill[]> = {
  Basketball: [
    { name: "Form Shooting", focus: "One-hand release, square to rim", vol: "5 × 10 makes", diff: "Easy", diffColor: "#8fd14f" },
    { name: "Crossover Series", focus: "Low, explosive handle changes", vol: "4 × 30 sec", diff: "Medium", diffColor: "#ffd23f" },
    { name: "Defensive Slides", focus: "Lateral speed & low stance", vol: "6 × 20 m", diff: "Hard", diffColor: "#ff8a3d" },
  ],
  Soccer: [
    { name: "Cone Dribbling", focus: "Close control at speed", vol: "5 × full lane", diff: "Medium", diffColor: "#ffd23f" },
    { name: "First Touch Wall", focus: "Receive & redirect", vol: "4 × 2 min", diff: "Easy", diffColor: "#8fd14f" },
    { name: "Sprint–Pass Combo", focus: "Decision-making fatigued", vol: "8 reps", diff: "Hard", diffColor: "#ff8a3d" },
  ],
  Tennis: [
    { name: "Shadow Swings", focus: "Topspin path & follow-through", vol: "4 × 20", diff: "Easy", diffColor: "#8fd14f" },
    { name: "Split-step Reaction", focus: "First-step explosiveness", vol: "6 × 30 sec", diff: "Medium", diffColor: "#ffd23f" },
    { name: "Serve Toss Calibration", focus: "Consistent contact point", vol: "50 tosses", diff: "Easy", diffColor: "#8fd14f" },
  ],
  Calisthenics: [
    { name: "Tuck Hold Progression", focus: "Straight-arm scapular strength", vol: "5 × 15 sec", diff: "Hard", diffColor: "#ff8a3d" },
    { name: "Hollow Body Rocks", focus: "Core line for skills", vol: "4 × 30 sec", diff: "Medium", diffColor: "#ffd23f" },
    { name: "Wall Handstand Kick", focus: "Balance entry & alignment", vol: "10 kick-ups", diff: "Medium", diffColor: "#ffd23f" },
  ],
};

export type Goal = {
  id: string;
  name: string;
  cat: string;
  catColor: string;
  icon: string;
  eta: string;
  completed: number;
  milestones: string[];
  locked?: boolean;
};

export const GOALS: Goal[] = [
  { id: "marathon", name: "Run a Marathon", cat: "Endurance", catColor: "#3dffb0", icon: "🏃", eta: "Race day · Oct 12", completed: 2, milestones: ["5K", "10K", "Half", "30K", "Full"] },
  { id: "handstand", name: "Freestanding Handstand", cat: "Balance", catColor: "#5aa9ff", icon: "🤸", eta: "~3 weeks out", completed: 3, milestones: ["Wall Hold", "Kick-ups", "Heel Pulls", "5s Free", "30s Hold"] },
  { id: "flag", name: "The Human Flag", cat: "Skill", catColor: "#ff8a3d", icon: "🏴", eta: "~9 weeks out", completed: 1, milestones: ["Support", "Vertical", "Tuck", "1-Leg", "Full Flag"] },
  { id: "muscleup", name: "First Muscle-Up", cat: "Strength", catColor: "#c6ff3d", icon: "💪", eta: "Not started", completed: 0, milestones: ["10 Pull-ups", "10 Dips", "High Pull", "Transition", "Muscle-Up"] },
  { id: "backflip", name: "Standing Backflip", cat: "Power", catColor: "#ff5a3c", icon: "🔄", eta: "Locked", completed: 0, locked: true, milestones: ["Box Jump", "Back Roll", "Tuck Jump", "Spotted", "Solo Flip"] },
];

export const LIVE_METRICS = [
  { label: "Release Angle", note: "Target 48–54°", val: "52°", color: "#8fd14f" },
  { label: "Elbow Alignment", note: "Under the ball", val: "88%", color: "#8fd14f" },
  { label: "Follow-through", note: "Hold the gooseneck", val: "76%", color: "#ffd23f" },
  { label: "Balance on Landing", note: "Slight drift left", val: "69%", color: "#ff8a3d" },
];

// AI Coach: smart canned responses keyed to the user's goals.
export function coachReply(t: string): string {
  const s = (t || "").toLowerCase();
  if (/marathon|run|5k|10k|endurance|cardio/.test(s)) return "Endurance it is. Your stamina sits at 68 and weekly mileage is low, so I'll build a 16-week base: 3 easy runs, 1 tempo, 1 long run that grows ~10%/week. I'll also slot in calf & tibialis work — they're your weak link for impact. Want me to drop it into your plan?";
  if (/flag|handstand|backflip|skill|calisthenic|muscle.?up|planche/.test(s)) return "Skill work — love it. The human flag needs strong lats, obliques and straight-arm strength. You're solid on biceps but obliques (58) and lats (70) need priority. I'd run a 10-week progression: tuck holds → support holds → vertical → full. Add it?";
  if (/weak|gap|fix|imbalance|balance|behind/.test(s)) return "Your three biggest gaps are Mobility (47), Shins/Tibialis (42) and Calves (49). I'd add 2 mobility flows and 1 lower-leg/plyo block per week — that lifts your Peak Score fastest and protects your knees. Want the block?";
  if (/strong|bench|chest|arm|muscle|hypertrophy|big/.test(s)) return "You're already strong up top — chest 84, biceps 88. To keep progressing without overuse, I'd push posterior chain (hamstrings 60, lower back 52) and keep upper-body volume steady. Push/Pull/Legs split, 4 days. Sound good?";
  if (/week|plan|schedule|routine/.test(s)) return "Here's a balanced week: Mon Push · Tue Mobility + Run · Wed Pull · Thu Sport drills · Fri Legs · Sat long cardio · Sun rest. It targets your gaps while protecting your streak. Want it on your calendar?";
  return "Got it. Tell me your timeline and main goal — strength, a skill, endurance, or a sport — and I'll draft a week-by-week plan around your current body map.";
}
