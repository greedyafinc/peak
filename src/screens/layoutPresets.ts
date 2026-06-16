// Peak — shared screen-shell layout presets. Every top-level screen is an absolutely
// positioned, scrollable column with a fixed top/bottom safe area and a horizontal
// content gutter. These two presets replace the per-screen SCREEN/PAD (a.k.a.
// pageWrap/content) consts so the chrome stays identical across screens.

import type { CSSProperties } from "react";
import { ANIMATIONS } from "../constants/ui";

/** The scrolling screen shell: fixed top offset + bottom nav clearance + enter anim. */
export const SCREEN_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflowY: "auto",
  padding: "58px 0 104px",
  animation: `scrIn ${ANIMATIONS.screenIn}`,
};

/** Horizontal content gutter (default 18px; Onboarding uses 22). */
export const contentPad = (x = 18): CSSProperties => ({ padding: `0 ${x}px` });
