// Peak — guided weekly-routine templates (§6.4). Reference data that seeds the
// weekly-plan editor: pick one to populate the week, then tweak any day. Gym days
// link to a BUILTIN_ROUTINES id so "Start" can pre-fill the live session; cardio
// days carry a free title + detail. Templates are scaffolding — the honest record
// is still whatever the user actually logs.

import type { WorkoutType } from "../types";

export type TemplateItem = { type: WorkoutType; routineId?: string; title: string; detail?: string };

export type WeeklyTemplate = {
  id: string;
  name: string;
  blurb: string;
  days: TemplateItem[][]; // length 7, index 0 = Monday … 6 = Sunday
};

const G = (routineId: string, title: string): TemplateItem => ({ type: "Gym", routineId, title });
const REST: TemplateItem[] = [];

export const WEEKLY_TEMPLATES: WeeklyTemplate[] = [
  {
    id: "ppl",
    name: "Push / Pull / Legs",
    blurb: "Classic 6-day split.",
    days: [
      [G("routine.push", "Push Day")],
      [G("routine.pull", "Pull Day")],
      [G("routine.legs", "Leg Day")],
      [G("routine.push", "Push Day")],
      [G("routine.pull", "Pull Day")],
      [G("routine.legs", "Leg Day")],
      REST,
    ],
  },
  {
    id: "upper-lower",
    name: "Upper / Lower",
    blurb: "Four balanced lifting days.",
    days: [
      [G("routine.upper", "Upper Body")],
      [G("routine.lower", "Lower Body")],
      REST,
      [G("routine.upper", "Upper Body")],
      [G("routine.lower", "Lower Body")],
      REST,
      REST,
    ],
  },
  {
    id: "full-x3",
    name: "Full Body ×3",
    blurb: "Three full-body days — great to start.",
    days: [
      [G("routine.fullbody", "Full Body")],
      REST,
      [G("routine.fullbody", "Full Body")],
      REST,
      [G("routine.fullbody", "Full Body")],
      REST,
      REST,
    ],
  },
];
