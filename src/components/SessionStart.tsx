// Peak — "Start a workout" chooser + routines hub (§6.4). Start an empty session
// or seed one from a prebuilt / saved routine; create, edit, duplicate and delete
// your own routines here too. A quiet link still reaches the retrospective quick-log.

import { usePeak } from "../store";
import { C, mono, WORKOUT_THEME, radius } from "../theme";
import { Sheet } from "./ui";
import { BUILTIN_ROUTINES, ROUTINE_BY_ID } from "../data/routines";
import { EXERCISE_BY_ID } from "../data/exercises";
import { categoryOf } from "../data/exerciseCatalog";
import { mondayIndex } from "../engine";
import type { RoutineDef, WeeklyPlanItem } from "../types";

export function StartSheet() {
  const s = usePeak();
  if (!s.startOpen) return null;

  const close = () => s.set({ startOpen: false });
  const userRoutines = s.data.routines;

  return (
    <Sheet title="Start a workout" onClose={close}>
      {s.activeSession && (
        <button
          onClick={() => s.set({ startOpen: false, activeOpen: true })}
          style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 11, marginBottom: 16, padding: "13px 14px", borderRadius: 14, cursor: "pointer", border: `1px solid ${C.accent}55`, background: `${C.accent}12` }}
        >
          <span style={{ width: 9, height: 9, borderRadius: 5, background: C.accent, animation: "pulseDot 1.6s ease-in-out infinite" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>Workout in progress</div>
            <div style={{ fontSize: 11, color: C.muted }}>{s.activeSession.title || "Untitled"}</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.5px" }}>Resume</span>
        </button>
      )}

      <TodayPlan />

      <button
        onClick={() => s.startSession()}
        style={{ width: "100%", fontSize: 15, fontWeight: 700, padding: 15, borderRadius: 15, border: "none", cursor: "pointer", background: C.accent, color: "#0a0b0d", marginBottom: 6 }}
      >
        ＋ Start empty workout
      </button>
      <div style={{ fontSize: 11.5, color: C.muted, textAlign: "center", marginBottom: 16 }}>Build it as you go, or pick a routine below.</div>

      {/* Your routines */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Kicker>Your routines</Kicker>
        <button
          onClick={() => s.openRoutineEditor(null)}
          style={{ fontSize: 11.5, fontWeight: 700, padding: "5px 11px", borderRadius: 9, cursor: "pointer", border: `1px solid ${C.accent}55`, background: `${C.accent}14`, color: C.accent }}
        >
          ＋ New routine
        </button>
      </div>
      {userRoutines.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          {userRoutines.map((r) => (
            <RoutineCard
              key={r.id}
              r={r}
              onStart={() => s.startSession({ routineId: r.id })}
              onEdit={() => s.openRoutineEditor(r.id)}
              onRemove={() => s.removeRoutine(r.id)}
            />
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 18, padding: "0 2px" }}>
          Save your own templates — build one from scratch, duplicate a routine below, or save a finished workout from its menu.
        </div>
      )}

      {/* Built-in routines */}
      <Kicker>Routines</Kicker>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18, marginTop: 10 }}>
        {BUILTIN_ROUTINES.map((r) => (
          <RoutineCard
            key={r.id}
            r={r}
            onStart={() => s.startSession({ routineId: r.id })}
            onDuplicate={() => s.duplicateRoutine(r)}
          />
        ))}
      </div>

      <button
        onClick={() => s.set({ startOpen: false, logOpen: true })}
        style={{ width: "100%", fontSize: 13, fontWeight: 700, padding: "11px", borderRadius: radius.lg, cursor: "pointer", border: `1px solid ${C.line2}`, background: "transparent", color: C.sub }}
      >
        Log a past session or cardio instead
      </button>
    </Sheet>
  );
}

// Today's planned workouts (from the weekly routine) — surfaced first so starting
// a workout shows the day's plan before the full routine list.
function TodayPlan() {
  const s = usePeak();
  const items = s.data.weeklyPlan?.days[mondayIndex(new Date())] ?? [];
  if (items.length === 0) return null;

  const resolve = (it: WeeklyPlanItem) => {
    const color = WORKOUT_THEME[it.type].color;
    if (it.routineId) {
      const r = ROUTINE_BY_ID[it.routineId] ?? s.data.routines.find((x) => x.id === it.routineId);
      if (r) return { title: r.name, sub: `${r.exercises.length} exercise${r.exercises.length === 1 ? "" : "s"}`, color, routineId: r.id };
    }
    return { title: it.title, sub: it.detail, color, routineId: undefined as string | undefined };
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <Kicker>Today’s plan</Kicker>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 10 }}>
        {items.map((it) => {
          const r = resolve(it);
          return (
            <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.inner, border: `1px solid ${C.line2}`, borderRadius: 14, padding: "12px 13px" }}>
              <span style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: r.color, minHeight: 30 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{r.title}</div>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: mono, marginTop: 2 }}>{it.type}{r.sub ? ` · ${r.sub}` : ""}</div>
              </div>
              {r.routineId ? (
                <button
                  onClick={() => s.startSession({ routineId: r.routineId })}
                  style={{ fontSize: 12, fontWeight: 700, color: "#0a0b0d", background: C.accent, border: "none", borderRadius: 9, padding: "8px 13px", cursor: "pointer" }}
                >
                  Start
                </button>
              ) : (
                <button
                  onClick={() => s.set({ startOpen: false, logOpen: true })}
                  style={{ fontSize: 12, fontWeight: 700, color: r.color, background: `${r.color}1f`, border: "none", borderRadius: 9, padding: "8px 13px", cursor: "pointer" }}
                >
                  Log
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "1.5px", color: C.muted, textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

function RoutineCard({ r, onStart, onEdit, onDuplicate, onRemove }: {
  r: RoutineDef;
  onStart: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onRemove?: () => void;
}) {
  const exs = r.exercises.map((e) => EXERCISE_BY_ID[e.exerciseId]).filter(Boolean);
  const cats = [...new Set(exs.map((e) => categoryOf(e)))];
  const preview = exs.slice(0, 4).map((e) => e.name).join(" · ");
  const hasActions = !!(onEdit || onDuplicate || onRemove);

  return (
    <div style={{ background: C.inner, border: `1px solid ${C.line2}`, borderRadius: radius.xl, overflow: "hidden" }}>
      <button onClick={onStart} style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: "14px 15px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{r.name}</span>
          {r.focus && (
            <span style={{ fontSize: 9.5, fontWeight: 700, color: C.accent, background: `${C.accent}1c`, padding: "2px 7px", borderRadius: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>{r.focus}</span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: C.accent }}>Start →</span>
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontFamily: mono }}>
          {exs.length} exercise{exs.length === 1 ? "" : "s"}{cats.length ? ` · ${cats.join(", ")}` : ""}
        </div>
        {preview && <div style={{ fontSize: 11.5, color: C.sub, marginTop: 6, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{preview}</div>}
      </button>
      {hasActions && (
        <div style={{ display: "flex", borderTop: `1px solid ${C.line2}` }}>
          {[
            onEdit && { label: "Edit", onClick: onEdit },
            onDuplicate && { label: "Duplicate", onClick: onDuplicate },
            onRemove && { label: "Delete", onClick: onRemove, danger: true },
          ]
            .filter(Boolean)
            .map((a, i) => (
              <CardAction key={(a as { label: string }).label} first={i === 0} {...(a as { label: string; onClick: () => void; danger?: boolean })} />
            ))}
        </div>
      )}
    </div>
  );
}

function CardAction({ label, onClick, danger, first }: { label: string; onClick: () => void; danger?: boolean; first?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{ flex: 1, padding: "9px", background: "transparent", border: "none", borderLeft: first ? "none" : `1px solid ${C.line2}`, cursor: "pointer", fontSize: 12, fontWeight: 700, color: danger ? C.red : C.sub }}
    >
      {label}
    </button>
  );
}
