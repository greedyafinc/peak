// Peak — weekly routine plan editor (§6.4). Assign each weekday (Mon–Sun) to
// saved/built-in routines and/or runs; multiple items per day are allowed, an
// empty day is a rest day. Guided template chips seed the week, then every day is
// freely customizable (the "guided builder, easily customizable" ask).

import { useEffect, useRef, useState } from "react";
import { usePeak } from "../store";
import { C, mono, WORKOUT_THEME, radius } from "../theme";
import { Sheet, Chip, PrimaryButton, inputStyle, fieldLabelStyle } from "./ui";
import { BUILTIN_ROUTINES, ROUTINE_BY_ID } from "../data/routines";
import { WEEKLY_TEMPLATES } from "../data/weeklyTemplates";
import { ENABLED_WORKOUT_TYPES } from "../data/capabilityTree";
import type { WeeklyPlanItem, WorkoutType } from "../types";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
// Non-Gym session types still offered when planning the week (product cut).
const OTHER_PLAN_TYPES: WorkoutType[] = ENABLED_WORKOUT_TYPES.filter((t) => t !== "Gym");
const blankWeek = (): WeeklyPlanItem[][] => [[], [], [], [], [], [], []];

export function WeeklyPlanEditor() {
  const s = usePeak();
  const [days, setDays] = useState<WeeklyPlanItem[][]>(blankWeek);
  const [assignDay, setAssignDay] = useState<number | null>(null);
  const seq = useRef(0);
  const tmpId = () => `tmp_${(seq.current += 1)}`;

  // Seed from the current plan each time the editor opens.
  useEffect(() => {
    if (!s.planEditorOpen) return;
    const plan = s.data.weeklyPlan;
    setDays(plan ? plan.days.map((day) => day.map((it) => ({ ...it }))) : blankWeek());
    setAssignDay(null);
  }, [s.planEditorOpen, s.data.weeklyPlan]);

  if (!s.planEditorOpen) return null;

  const addItem = (dayIdx: number, item: Omit<WeeklyPlanItem, "id">) =>
    setDays((cur) => cur.map((day, i) => (i === dayIdx ? [...day, { ...item, id: tmpId() }] : day)));
  const removeItem = (dayIdx: number, itemId: string) =>
    setDays((cur) => cur.map((day, i) => (i === dayIdx ? day.filter((it) => it.id !== itemId) : day)));
  const applyTemplate = (templateDays: typeof WEEKLY_TEMPLATES[number]["days"]) =>
    setDays(templateDays.map((day) => day.map((it) => ({ ...it, id: tmpId() }))));

  const totalItems = days.reduce((n, day) => n + day.length, 0);

  const resolveDetail = (it: WeeklyPlanItem): string | undefined => {
    if (it.routineId) {
      const r = ROUTINE_BY_ID[it.routineId] ?? s.data.routines.find((x) => x.id === it.routineId);
      if (r) return `${r.exercises.length} exercise${r.exercises.length === 1 ? "" : "s"}`;
    }
    return it.detail;
  };

  return (
    <Sheet title="Weekly routine" onClose={() => s.closePlanEditor()}>
      {/* guided templates */}
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 9 }}>
        Start from a template
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 18 }}>
        {WEEKLY_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => applyTemplate(t.days)}
            style={{ flexShrink: 0, textAlign: "left", padding: "10px 13px", borderRadius: 13, cursor: "pointer", border: `1px solid ${C.line2}`, background: C.inner, minWidth: 138 }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{t.name}</div>
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 3, lineHeight: 1.35 }}>{t.blurb}</div>
          </button>
        ))}
      </div>

      {/* the week */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px" }}>Your week</div>
        {totalItems > 0 && (
          <button
            onClick={() => setDays(blankWeek())}
            style={{ fontSize: 11, fontWeight: 700, color: C.muted, background: "none", border: "none", cursor: "pointer" }}
          >
            Clear all
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
        {DAY_NAMES.map((name, i) => (
          <div key={name} style={{ background: C.inner, border: `1px solid ${C.line2}`, borderRadius: 14, padding: "11px 13px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: days[i].length ? 9 : 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: days[i].length ? C.ink : C.muted }}>{name}</span>
              <button
                onClick={() => setAssignDay(i)}
                style={{ fontSize: 11.5, fontWeight: 700, color: C.accent, background: `${C.accent}14`, border: `1px solid ${C.accent}44`, borderRadius: radius.md, padding: "4px 10px", cursor: "pointer" }}
              >
                ＋ Add
              </button>
            </div>
            {days[i].length === 0 ? null : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {days[i].map((it) => {
                  const color = WORKOUT_THEME[it.type].color;
                  const detail = resolveDetail(it);
                  return (
                    <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 9, background: C.card, border: `1px solid ${C.line2}`, borderRadius: 10, padding: "8px 10px" }}>
                      <span style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: color, minHeight: 24 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</div>
                        <div style={{ fontSize: 10.5, color: C.muted, fontFamily: mono, marginTop: 1 }}>
                          {it.type}{detail ? ` · ${detail}` : ""}
                        </div>
                      </div>
                      <button onClick={() => removeItem(i, it.id)} aria-label="Remove" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px" }}>×</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <PrimaryButton onClick={() => s.saveWeeklyPlan(days)}>
        {totalItems > 0 ? "Save weekly routine" : "Save (no plan)"}
      </PrimaryButton>

      {assignDay != null && (
        <AssignSheet
          dayName={DAY_NAMES[assignDay]}
          onClose={() => setAssignDay(null)}
          onAdd={(item) => { addItem(assignDay, item); setAssignDay(null); }}
        />
      )}
    </Sheet>
  );
}

// ── Assign sheet: pick a routine, or add a custom run / sport / mobility item ──
function AssignSheet({ dayName, onClose, onAdd }: {
  dayName: string;
  onClose: () => void;
  onAdd: (item: Omit<WeeklyPlanItem, "id">) => void;
}) {
  const s = usePeak();
  // Only show the Routine/Other tabs when non-Gym types are part of the cut.
  const allowOther = OTHER_PLAN_TYPES.length > 0;
  const [tab, setTab] = useState<"routine" | "other">("routine");
  const [otherType, setOtherType] = useState<WorkoutType>(OTHER_PLAN_TYPES[0] ?? "Cardio");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");

  const userRoutines = s.data.routines;
  const addOther = () => {
    if (!title.trim()) return;
    onAdd({ type: otherType, title: title.trim(), detail: detail.trim() || undefined });
  };

  return (
    <Sheet title={`Add to ${dayName}`} onClose={onClose}>
      {allowOther && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <Chip active={tab === "routine"} onClick={() => setTab("routine")}>Routine</Chip>
          <Chip active={tab === "other"} onClick={() => setTab("other")}>Run / Other</Chip>
        </div>
      )}

      {!allowOther || tab === "routine" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {userRoutines.length > 0 && (
            <div style={{ fontSize: 10.5, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px" }}>Your routines</div>
          )}
          {userRoutines.map((r) => (
            <RoutineRow key={r.id} name={r.name} sub={`${r.exercises.length} exercise${r.exercises.length === 1 ? "" : "s"}`} onClick={() => onAdd({ type: "Gym", routineId: r.id, title: r.name })} />
          ))}
          <div style={{ fontSize: 10.5, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px", marginTop: userRoutines.length ? 6 : 0 }}>Built-in</div>
          {BUILTIN_ROUTINES.map((r) => (
            <RoutineRow key={r.id} name={r.name} sub={r.focus ?? `${r.exercises.length} exercises`} onClick={() => onAdd({ type: "Gym", routineId: r.id, title: r.name })} />
          ))}
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Type</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {OTHER_PLAN_TYPES.map((t) => (
              <Chip key={t} active={otherType === t} color={WORKOUT_THEME[t].color} onClick={() => setOtherType(t)}>{t}</Chip>
            ))}
          </div>
          <div style={fieldLabelStyle}>Name</div>
          <input value={title} placeholder="e.g. Run · 5K" onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
          <div style={fieldLabelStyle}>Detail (optional)</div>
          <input value={detail} placeholder="e.g. Tempo · 28 min" onChange={(e) => setDetail(e.target.value)} style={{ ...inputStyle, marginBottom: 18 }} />
          <PrimaryButton disabled={!title.trim()} onClick={addOther}>Add to {dayName}</PrimaryButton>
        </>
      )}
    </Sheet>
  );
}

function RoutineRow({ name, sub, onClick }: { name: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10, background: C.inner, border: `1px solid ${C.line2}`, borderRadius: radius.lg, padding: "12px 13px", cursor: "pointer" }}
    >
      <span style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: C.accent, minHeight: 28 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{name}</div>
        <div style={{ fontSize: 11, color: C.muted, fontFamily: mono, marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ fontSize: 16, fontWeight: 700, color: C.accent, lineHeight: 1 }}>＋</span>
    </button>
  );
}
