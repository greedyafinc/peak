// Peak — exercise picker popup (live Gym session §6.4).
//
// One modal, two modes:
//   • "add"  — multi-select; pick several, "Add" commits them to the session.
//   • "swap" — single-tap; replaces one exercise with an alternative, defaulting
//              to a data-ranked "Best alternatives" list (e.g. Bench → DB Bench).
// Exercises group under body-part CATEGORIES (alphabetical) with live search and
// category quick-filters — the "sort by categories alphabetical + search" ask.

import { useEffect, useMemo, useState } from "react";
import { C, mono, radius } from "../theme";
import { inputStyle } from "./ui";
import { EXERCISE_BY_ID } from "../data/exercises";
import {
  GYM_EXERCISES, GYM_CATEGORIES, muscleSections, matchesQuery, alternativesFor,
  exerciseSubtitle, type ExerciseCategory,
} from "../data/exerciseCatalog";
import type { ExerciseDef } from "../types";
import { Z_INDEX } from "../constants/ui";

type Filter = "Best" | "All" | ExerciseCategory;

export function ExercisePickerModal({
  open,
  mode,
  swapForExerciseId,
  existingExerciseIds = [],
  onClose,
  onAdd,
  onSwap,
}: {
  open: boolean;
  mode: "add" | "swap";
  swapForExerciseId?: string;
  existingExerciseIds?: string[];
  onClose: () => void;
  onAdd?: (ids: string[]) => void;
  onSwap?: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>(mode === "swap" ? "Best" : "All");
  const [selected, setSelected] = useState<string[]>([]);

  // Fresh state every time the modal opens.
  useEffect(() => {
    if (open) {
      setQ("");
      setFilter(mode === "swap" ? "Best" : "All");
      setSelected([]);
    }
  }, [open, mode]);

  const baseEx = swapForExerciseId ? EXERCISE_BY_ID[swapForExerciseId] : undefined;
  const existing = useMemo(() => new Set(existingExerciseIds), [existingExerciseIds]);

  const sections = useMemo<{ title: string | null; items: ExerciseDef[] }[]>(() => {
    const searching = q.trim().length > 0;
    // In swap mode, hide the exercise being swapped AND anything already in the
    // workout, so a swap never produces a duplicate.
    const hide = (list: ExerciseDef[]) =>
      mode === "swap" ? list.filter((e) => e.id !== swapForExerciseId && !existing.has(e.id)) : list;

    // Search → flat hits, still grouped under their "Category · Muscle" sub-headers.
    if (searching) {
      const pool = hide(GYM_EXERCISES.filter((e) => matchesQuery(e, q)));
      return muscleSections(GYM_CATEGORIES, pool).map((s) => ({ title: s.label, items: s.items }));
    }
    // Swap → data-ranked alternatives as one flat list (no muscle split).
    if (mode === "swap" && filter === "Best" && swapForExerciseId) {
      return [{ title: "Best alternatives", items: hide(alternativesFor(swapForExerciseId)) }];
    }
    // Browse → region chip selects which categories show; each splits into muscle sub-headers.
    const cats: ExerciseCategory[] = filter === "All" || filter === "Best" ? GYM_CATEGORIES : [filter];
    return muscleSections(cats, GYM_EXERCISES)
      .map((s) => ({ title: s.label, items: hide(s.items) }))
      .filter((s) => s.items.length > 0);
  }, [q, filter, mode, swapForExerciseId, existing]);

  if (!open) return null;

  const chips: Filter[] = mode === "swap" ? ["Best", "All", ...GYM_CATEGORIES] : ["All", ...GYM_CATEGORIES];

  const toggleSelect = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const onRow = (id: string) => {
    if (mode === "swap") { onSwap?.(id); onClose(); }
    else toggleSelect(id);
  };

  const commitAdd = () => {
    if (selected.length === 0) return;
    onAdd?.(selected);
    onClose();
  };

  const title = mode === "swap"
    ? `Swap${baseEx ? ` · ${baseEx.name}` : ""}`
    : "Add exercises";

  return (
    <div
      onClick={onClose}
      style={{ position: "absolute", inset: 0, zIndex: Z_INDEX.picker, background: "rgba(0,0,0,0.62)", animation: "fadeIn .2s ease", display: "flex", alignItems: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", background: C.card, borderTop: `1px solid ${C.line}`,
          borderRadius: "28px 28px 0 0", animation: "sheetUp .3s cubic-bezier(.2,.8,.2,1)",
          height: "88%", display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* ── Pinned header: handle, title, search, category chips ── */}
        <div style={{ flexShrink: 0, padding: "12px 18px 10px", borderBottom: `1px solid ${C.line2}` }}>
          <div style={{ width: 38, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.2)", margin: "0 auto 14px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: C.ink, letterSpacing: "-0.4px" }}>{title}</div>
            <button onClick={onClose} aria-label="Close"
              style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 2 }}>×</button>
          </div>
          {mode === "swap" && baseEx && (
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 10, lineHeight: 1.4 }}>
              Pick a movement that trains the same muscles. Your set count and reps carry over — re-enter the load.
            </div>
          )}
          <input
            value={q}
            placeholder="Search exercises…"
            onChange={(e) => setQ(e.target.value)}
            style={{ ...inputStyle, marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2, WebkitOverflowScrolling: "touch" }}>
            {chips.map((c) => {
              const on = filter === c && q.trim() === "";
              return (
                <button
                  key={c}
                  onClick={() => { setFilter(c); setQ(""); }}
                  style={{
                    flexShrink: 0, fontSize: 12, fontWeight: 700, padding: "6px 13px", borderRadius: radius.pill, cursor: "pointer",
                    border: `1px solid ${on ? C.accent : C.line2}`,
                    background: on ? C.accent : C.inner,
                    color: on ? "#0a0b0d" : C.sub,
                    fontFamily: c === "Best" ? mono : undefined,
                  }}
                >
                  {c === "Best" ? "★ Best" : c}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Scrollable result list ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px 16px" }}>
          {sections.every((s) => s.items.length === 0) ? (
            <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "40px 20px" }}>
              No exercises match “{q.trim()}”.
            </div>
          ) : (
            sections.map((sec, si) => (
              <div key={(sec.title ?? "flat") + si} style={{ marginBottom: 14 }}>
                {sec.title && (
                  <div style={{ fontSize: 10.5, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px", margin: "8px 4px 8px", fontFamily: mono }}>
                    {sec.title === "Best alternatives" ? "★ Best alternatives" : sec.title}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {sec.items.map((ex) => (
                    <ExerciseRow
                      key={ex.id}
                      ex={ex}
                      mode={mode}
                      selected={selected.includes(ex.id)}
                      inWorkout={existing.has(ex.id)}
                      onClick={() => onRow(ex.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Pinned footer (add mode) ── */}
        {mode === "add" && (
          <div style={{ flexShrink: 0, padding: "12px 18px max(16px, env(safe-area-inset-bottom))", borderTop: `1px solid ${C.line2}`, background: C.card }}>
            <button
              onClick={commitAdd}
              disabled={selected.length === 0}
              style={{
                width: "100%", fontSize: 15, fontWeight: 700, padding: 14, borderRadius: 14, border: "none",
                cursor: selected.length === 0 ? "default" : "pointer",
                background: selected.length === 0 ? C.lockCard : C.accent,
                color: selected.length === 0 ? C.muted : "#0a0b0d",
              }}
            >
              {selected.length === 0 ? "Select exercises to add" : `Add ${selected.length} exercise${selected.length > 1 ? "s" : ""}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ExerciseRow({
  ex, mode, selected, inWorkout, onClick,
}: {
  ex: ExerciseDef; mode: "add" | "swap"; selected: boolean; inWorkout: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12, textAlign: "left", width: "100%",
        padding: "11px 13px", borderRadius: 13, cursor: "pointer",
        border: `1px solid ${selected ? C.accent : C.line2}`,
        background: selected ? `${C.accent}14` : C.inner,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.name}</span>
          {inWorkout && (
            <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, color: C.mint, background: `${C.mint}1f`, padding: "2px 6px", borderRadius: 5, textTransform: "uppercase", letterSpacing: "0.4px" }}>
              In workout
            </span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{exerciseSubtitle(ex)}</div>
      </div>
      {mode === "add" ? (
        <span
          aria-hidden
          style={{
            flexShrink: 0, width: 24, height: 24, borderRadius: 12,
            border: `2px solid ${selected ? C.accent : C.muted2}`,
            background: selected ? C.accent : "transparent",
            color: "#0a0b0d", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 900, lineHeight: 1,
          }}
        >
          {selected ? "✓" : ""}
        </span>
      ) : (
        <span style={{ flexShrink: 0, color: C.muted, fontSize: 18 }}>→</span>
      )}
    </button>
  );
}
