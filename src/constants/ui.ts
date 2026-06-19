// Peak — UI constants registry. The single source of truth for the layering of
// overlays/sheets and the shared enter-animation strings, replacing magic numbers
// previously inlined across the overlay components. Values are unchanged — this is
// a named-constant registry, not a re-layering.

/**
 * Stacking order for the app's floating surfaces. Higher sits on top. These are the
 * values that were previously inlined as `zIndex: <n>` in each overlay component.
 *
 * (For reference, lower-numbered chrome lives outside this registry: StatusBar 40/41,
 * BottomNav 50.)
 */
export const Z_INDEX = {
  miniBar: 48,         // minimized "resume workout" bar (ActiveSession)
  sheet: 70,           // bottom Sheet scrim (ui.tsx)
  recovery: 75,        // full-page muscle recovery / readiness view (Recovery)
  sessionDetail: 76,   // logged-session detail page (SessionDetail)
  exerciseDetail: 78,  // exercise/effort detail page (ExerciseDetail)
  activeSession: 80,   // full-screen live workout (ActiveSession)
  sessionEditor: 82,   // logged-session editor (SessionEditor)
  picker: 90,          // exercise picker modal (ExercisePickerModal)
  modal: 95,           // confirm/save modal above the live workout (ActiveSession)
} as const;

/**
 * Shared enter-animation timing fragments. Components prepend the keyframe name,
 * e.g. `animation: \`scrIn ${ANIMATIONS.screenIn}\``.
 */
export const ANIMATIONS = {
  screenIn: ".28s ease",
  overlayIn: ".26s ease",
} as const;

/** Misc UI timings (seconds unless noted). */
export const TIMINGS = {
  restDefaultSec: 90,
} as const;
