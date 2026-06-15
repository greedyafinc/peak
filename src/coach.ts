// AI Coach: smart canned responses keyed to the user's goals. Logic, not data —
// kept out of the persisted store.
export function coachReply(t: string): string {
  const s = (t || "").toLowerCase();
  if (/marathon|run|5k|10k|endurance|cardio/.test(s)) return "Endurance it is. Your stamina sits at 68 and weekly mileage is low, so I'll build a 16-week base: 3 easy runs, 1 tempo, 1 long run that grows ~10%/week. I'll also slot in calf & tibialis work — they're your weak link for impact. Want me to drop it into your plan?";
  if (/flag|handstand|backflip|skill|calisthenic|muscle.?up|planche/.test(s)) return "Skill work — love it. The human flag needs strong lats, obliques and straight-arm strength. You're solid on biceps but obliques (58) and lats (70) need priority. I'd run a 10-week progression: tuck holds → support holds → vertical → full. Add it?";
  if (/weak|gap|fix|imbalance|balance|behind/.test(s)) return "Your three biggest gaps are Mobility (47), Shins/Tibialis (42) and Calves (49). I'd add 2 mobility flows and 1 lower-leg/plyo block per week — that lifts your Peak Score fastest and protects your knees. Want the block?";
  if (/strong|bench|chest|arm|muscle|hypertrophy|big/.test(s)) return "You're already strong up top — chest 84, biceps 88. To keep progressing without overuse, I'd push posterior chain (hamstrings 60, lower back 52) and keep upper-body volume steady. Push/Pull/Legs split, 4 days. Sound good?";
  if (/week|plan|schedule|routine/.test(s)) return "Here's a balanced week: Mon Push · Tue Mobility + Run · Wed Pull · Thu Sport drills · Fri Legs · Sat long cardio · Sun rest. It targets your gaps while protecting your streak. Want it on your calendar?";
  return "Got it. Tell me your timeline and main goal — strength, a skill, endurance, or a sport — and I'll draft a week-by-week plan around your current body map.";
}
