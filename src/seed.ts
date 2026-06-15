// First-run sample content. This is the ONLY place authored data lives; it is
// written to device storage once, then the on-device copy becomes the source of
// truth. Editing a muscle, logging a session or completing a milestone mutates
// the stored copy — not this file. "Reset sample data" re-seeds from here.

import type { AppData } from "./model";

// Bump when a release needs to transform already-persisted documents. See
// migrate() in store.tsx. v2 strips the fabricated demo activity that v1 shipped.
export const DATA_VERSION = 2;

export const DEFAULT_DATA: AppData = {
  version: DATA_VERSION,

  muscles: {
    front: [
      { id: "delts", name: "Shoulders", score: 71, lift: "Overhead Press", best: "55 kg", ratio: "0.7× BW", pct: "66th", trend: "+4%", ex: ["Overhead Press", "Lateral Raise", "Arnold Press"] },
      { id: "chest", name: "Chest", score: 84, lift: "Bench Press", best: "95 kg", ratio: "1.2× BW", pct: "81st", trend: "+6%", ex: ["Bench Press", "Incline DB Press", "Cable Fly"] },
      { id: "biceps", name: "Biceps", score: 88, lift: "Barbell Curl", best: "48 kg", ratio: "0.6× BW", pct: "88th", trend: "+9%", ex: ["Barbell Curl", "Hammer Curl", "Chin-up"] },
      { id: "forearms", name: "Forearms", score: 63, lift: "Wrist Curl", best: "30 kg", ratio: "0.4× BW", pct: "58th", trend: "+3%", ex: ["Wrist Curl", "Farmer Carry", "Dead Hang"] },
      { id: "abs", name: "Core", score: 76, lift: "Cable Crunch", best: "70 kg", ratio: "—", pct: "74th", trend: "+5%", ex: ["Hanging Leg Raise", "Cable Crunch", "Ab Wheel"] },
      { id: "obliques", name: "Obliques", score: 58, lift: "Pallof Press", best: "35 kg", ratio: "—", pct: "55th", trend: "+2%", ex: ["Pallof Press", "Side Plank", "Wood Chop"] },
      { id: "quads", name: "Quads", score: 80, lift: "Back Squat", best: "140 kg", ratio: "1.8× BW", pct: "78th", trend: "+5%", ex: ["Back Squat", "Leg Press", "Lunge"] },
      { id: "shins", name: "Shins / Tibialis", score: 42, lift: "Tib Raise", best: "25 kg", ratio: "—", pct: "34th", trend: "+1%", ex: ["Tibialis Raise", "Banded Dorsiflexion"] },
    ],
    back: [
      { id: "traps", name: "Traps", score: 74, lift: "Barbell Shrug", best: "120 kg", ratio: "—", pct: "70th", trend: "+4%", ex: ["Barbell Shrug", "Rack Pull", "Face Pull"] },
      { id: "rdelts", name: "Rear Delts", score: 66, lift: "Reverse Fly", best: "22 kg", ratio: "—", pct: "62nd", trend: "+3%", ex: ["Reverse Fly", "Face Pull", "Band Pull-apart"] },
      { id: "lats", name: "Lats", score: 70, lift: "Weighted Pull-up", best: "+30 kg", ratio: "—", pct: "69th", trend: "+6%", ex: ["Pull-up", "Lat Pulldown", "Barbell Row"] },
      { id: "triceps", name: "Triceps", score: 82, lift: "Close-grip Bench", best: "80 kg", ratio: "1.0× BW", pct: "79th", trend: "+5%", ex: ["Close-grip Bench", "Skullcrusher", "Dips"] },
      { id: "bforearms", name: "Forearms", score: 63, lift: "Wrist Curl", best: "30 kg", ratio: "0.4× BW", pct: "58th", trend: "+3%", ex: ["Wrist Curl", "Farmer Carry", "Dead Hang"] },
      { id: "lowerback", name: "Lower Back", score: 52, lift: "Deadlift", best: "150 kg", ratio: "1.9× BW", pct: "51st", trend: "+2%", ex: ["Deadlift", "Back Extension", "Good Morning"] },
      { id: "glutes", name: "Glutes", score: 78, lift: "Hip Thrust", best: "160 kg", ratio: "2.0× BW", pct: "76th", trend: "+7%", ex: ["Hip Thrust", "Romanian Deadlift", "Cable Kickback"] },
      { id: "hams", name: "Hamstrings", score: 60, lift: "Romanian DL", best: "100 kg", ratio: "1.3× BW", pct: "57th", trend: "+3%", ex: ["Romanian Deadlift", "Leg Curl", "Nordic Curl"] },
      { id: "calves", name: "Calves", score: 49, lift: "Calf Raise", best: "90 kg", ratio: "—", pct: "41st", trend: "+1%", ex: ["Standing Calf Raise", "Seated Calf Raise", "Jump Rope"] },
    ],
  },

  metrics: [
    { label: "Strength", abbr: "STR", val: 82 },
    { label: "Power", abbr: "POW", val: 74 },
    { label: "Speed", abbr: "SPD", val: 61 },
    { label: "Stamina", abbr: "STA", val: 68 },
    { label: "Mobility", abbr: "MOB", val: 47 },
    { label: "Balance", abbr: "BAL", val: 55 },
  ],

  // No pre-seeded activity — the feed starts empty and fills only with sessions
  // the user logs through the app (stored on-device). See logWorkout in store.tsx.
  feed: [],

  goals: [
    { id: "marathon", name: "Run a Marathon", cat: "Endurance", catColor: "#3dffb0", icon: "🏃", eta: "Race day · Oct 12", completed: 2, milestones: ["5K", "10K", "Half", "30K", "Full"] },
    { id: "handstand", name: "Freestanding Handstand", cat: "Balance", catColor: "#5aa9ff", icon: "🤸", eta: "~3 weeks out", completed: 3, milestones: ["Wall Hold", "Kick-ups", "Heel Pulls", "5s Free", "30s Hold"] },
    { id: "flag", name: "The Human Flag", cat: "Skill", catColor: "#ff8a3d", icon: "🏴", eta: "~9 weeks out", completed: 1, milestones: ["Support", "Vertical", "Tuck", "1-Leg", "Full Flag"] },
    { id: "muscleup", name: "First Muscle-Up", cat: "Strength", catColor: "#c6ff3d", icon: "💪", eta: "Not started", completed: 0, milestones: ["10 Pull-ups", "10 Dips", "High Pull", "Transition", "Muscle-Up"] },
    { id: "backflip", name: "Standing Backflip", cat: "Power", catColor: "#ff5a3c", icon: "🔄", eta: "Locked", completed: 0, locked: true, milestones: ["Box Jump", "Back Roll", "Tuck Jump", "Spotted", "Solo Flip"] },
  ],

  drills: {
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
  },

  liveMetrics: [
    { label: "Release Angle", note: "Target 48–54°", val: "52°", color: "#8fd14f" },
    { label: "Elbow Alignment", note: "Under the ball", val: "88%", color: "#8fd14f" },
    { label: "Follow-through", note: "Hold the gooseneck", val: "76%", color: "#ffd23f" },
    { label: "Balance on Landing", note: "Slight drift left", val: "69%", color: "#ff8a3d" },
  ],

  gaps: [
    { id: "g1", title: "Mobility is your #1 gap", dot: "#5aa9ff", reason: "At 47 it’s well below your strength. Limited hip & T-spine range caps your squat depth and overhead position.", workout: "Hip & T-spine Flow", dur: "18 min", tag: "Mobility" },
    { id: "g2", title: "Calves lag behind quads", dot: "#ff8a3d", reason: "Quads 80 vs calves 49 — a 31-pt gap. This shows up as slow jumps and Achilles load when you run.", workout: "Calf & Plyometric Block", dur: "22 min", tag: "Power" },
    { id: "g3", title: "Build your posterior chain", dot: "#ffd23f", reason: "Lower back 52 and hamstrings 60 trail your front side. Adds injury risk and limits sprint speed.", workout: "Deadlift Progression", dur: "35 min", tag: "Strength" },
  ],

  // Consistency starts from zero — every figure here is earned by logging through
  // the app. weekTarget is the user's weekly goal, not activity, so it keeps a
  // sensible default; the bars are an empty week until sessions light them up.
  streak: {
    count: 0,
    weekDone: 0,
    weekTarget: 5,
    rate: 0,
    lastLog: null,
    bars: [
      { d: "M", h: 10, on: false }, { d: "T", h: 10, on: false }, { d: "W", h: 10, on: false }, { d: "T", h: 10, on: false },
      { d: "F", h: 10, on: false }, { d: "S", h: 10, on: false }, { d: "S", h: 10, on: false },
    ],
  },

  // symmetry comes from the body assessment (muscles); weeklyVolume accrues from
  // logged sessions, so it starts at 0.
  profile: { symmetry: 94, weeklyVolume: 0 },

  chat: [
    {
      role: "coach",
      text: "Hey — I'm your Peak coach. I've looked at your body map: strong arms and quads, but mobility and posterior chain are lagging. What are we working toward?",
    },
  ],

  added: {},
};
