// Peak — the combined "This Week" Feed card (Weekly Routine Agenda design).
//
// One card unifies the consistency streak, the on-plan rate, and the weekly
// routine: the 7-day row doubles as both the plan and the adherence track. It
// sits collapsed at the top of the Feed and expands inline to the full agenda
// (every day, done/missed toggles, momentum, Start + Edit). When no plan is set
// it shows a quiet "plan your week" invite — nothing is pre-filled or faked.

import { useState } from "react";
import { usePeak } from "../store";
import { C, mono, WORKOUT_THEME, radius } from "../theme";
import { StreakBadge } from "./ui";
import { ROUTINE_BY_ID } from "../data/routines";
import { computeWeekStatus, type WeekDayStatus } from "../engine";
import type { WeeklyPlanItem } from "../types";

type ResolvedItem = { title: string; detail?: string; color: string };

export function WeeklyAgenda() {
  const s = usePeak();
  const { data } = s;
  const [expanded, setExpanded] = useState(false);

  // Computed inline (cheap + pure) so the agenda always reflects the live clock —
  // "today" advances across midnight without waiting on a data mutation.
  const week = computeWeekStatus(data.weeklyPlan, data.sessions, new Date());

  // Resolve a plan item to its live display (routine names/exercise counts stay
  // fresh; renamed or deleted routines fall back to the stored title).
  const resolve = (item: WeeklyPlanItem): ResolvedItem => {
    const color = WORKOUT_THEME[item.type].color;
    if (item.routineId) {
      const r = ROUTINE_BY_ID[item.routineId] ?? data.routines.find((x) => x.id === item.routineId);
      if (r) {
        const n = r.exercises.length;
        return { title: r.name, detail: `${n} exercise${n === 1 ? "" : "s"}`, color };
      }
    }
    return { title: item.title, detail: item.detail, color };
  };

  const streak = data.consistency.currentStreakDays;
  const onPlanPct = week.onPlanRate != null ? Math.round(week.onPlanRate * 100) : null;

  const subline = !week.hasPlan
    ? "Set up your weekly routine"
    : onPlanPct != null
      ? `${onPlanPct}% on-plan · ${week.weekRangeLabel}`
      : week.weekRangeLabel;

  const cardBorder = expanded ? `${C.accent}80` : "rgba(198,255,61,0.18)";

  // Header (shared by both states) — streak badge + subline on the left; plan
  // count + chevron on the right (chevron/count only when there's a plan).
  const header = (
    <div
      onClick={week.hasPlan ? () => setExpanded((v) => !v) : undefined}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 16px 13px", cursor: week.hasPlan ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
        <StreakBadge streak={streak} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.ink, letterSpacing: "-0.4px" }}>
            {streak > 0 ? `${streak}-day streak` : "This week"}
          </div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {subline}
          </div>
        </div>
      </div>
      {week.hasPlan && (
        <div style={{ display: "flex", alignItems: "center", gap: 11, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: C.accent, lineHeight: 1, whiteSpace: "nowrap" }}>
              {week.doneCount} / {week.planCount}
            </div>
            <div style={{ fontSize: 9, color: C.muted, marginTop: 3, textTransform: "uppercase", letterSpacing: "1px" }}>this week</div>
          </div>
          <div style={{ transform: `rotate(${expanded ? 180 : 0}deg)`, transition: "transform .2s" }}>
            <Chevron />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      background: "linear-gradient(150deg,#1b2417,#15171d)",
      border: `1px solid ${cardBorder}`,
      borderRadius: 22,
      overflow: "hidden",
      transition: "border-color .2s",
    }}>
      {header}

      {!week.hasPlan ? (
        <NoPlanBody onPlan={() => s.openPlanEditor()} />
      ) : !expanded ? (
        <CollapsedBody week={week} resolve={resolve} onExpand={() => setExpanded(true)} onStart={() => s.startTodayPlan()} />
      ) : (
        <ExpandedBody
          week={week}
          resolve={resolve}
          momentum={data.consistency.momentum}
          longestStreak={data.consistency.longestStreakDays}
          active28={data.consistency.activeDaysTrailing28}
          onToggleDay={(d) => { if (!d.isRest && !d.loggedSession && (d.isPast || d.isToday)) s.toggleDayDone(d.dateKey); }}
          onStart={() => s.startTodayPlan()}
          onEdit={() => s.openPlanEditor()}
        />
      )}
    </div>
  );
}

// ── No-plan invite ────────────────────────────────────────────────────────────
function NoPlanBody({ onPlan }: { onPlan: () => void }) {
  return (
    <div style={{ padding: "0 16px 16px" }}>
      <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.5, marginBottom: 13 }}>
        Set Mon–Sun to routines and runs. Your streak and on-plan rate track against it,
        and you can start each day's workout in a tap.
      </div>
      <button
        onClick={onPlan}
        style={{ width: "100%", height: 44, border: "none", borderRadius: 13, background: C.accent, color: "#0a0b0d", fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
      >
        Plan your week
      </button>
    </div>
  );
}

// ── Collapsed: mini 7-day row + today line ───────────────────────────────────
function CollapsedBody({ week, resolve, onExpand, onStart }: {
  week: ReturnType<typeof computeWeekStatus>;
  resolve: (i: WeeklyPlanItem) => ResolvedItem;
  onExpand: () => void;
  onStart: () => void;
}) {
  const today = week.days[week.todayIndex];
  const todaySummary = week.todayItems.length
    ? week.todayItems.map((i) => resolve(i).title).join(", ")
    : "Rest day";

  return (
    <div style={{ padding: "0 14px 15px" }}>
      <div onClick={onExpand} style={{ display: "flex", gap: 6, cursor: "pointer" }}>
        {week.days.map((d) => (
          <div key={d.dateKey} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
            padding: "8px 0", borderRadius: 11,
            background: d.isToday ? `${C.accent}21` : "transparent",
          }}>
            <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: d.isToday ? C.accent : d.isRest ? C.muted2 : C.ink3 }}>
              {d.dayLetter}
            </span>
            <MiniMarker d={d} resolve={resolve} />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 13, paddingTop: 13, borderTop: `1px solid ${C.line}` }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: today.isRest ? C.muted2 : C.accent, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, fontSize: 14, color: C.ink3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <span style={{ color: C.ink, fontWeight: 600 }}>Today</span> · {todaySummary}
        </div>
        {week.todayItems.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onStart(); }}
            style={{ display: "flex", alignItems: "center", background: `${C.accent}21`, borderRadius: 9, padding: "6px 12px", border: "none", cursor: "pointer" }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>Start</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Expanded: progress bar + full agenda + momentum + actions ────────────────
function ExpandedBody({ week, resolve, momentum, longestStreak, active28, onToggleDay, onStart, onEdit }: {
  week: ReturnType<typeof computeWeekStatus>;
  resolve: (i: WeeklyPlanItem) => ResolvedItem;
  momentum: number;
  longestStreak: number;
  active28: number;
  onToggleDay: (d: WeekDayStatus) => void;
  onStart: () => void;
  onEdit: () => void;
}) {
  return (
    <div style={{ padding: "0 16px 14px" }}>
      <div style={{ height: 5, borderRadius: radius.sm, background: "rgba(255,255,255,0.07)", overflow: "hidden", marginBottom: 4 }}>
        <div style={{ height: "100%", width: `${Math.round(week.pct * 100)}%`, background: C.accent, borderRadius: radius.sm, transition: "width .25s" }} />
      </div>

      {week.days.map((d) => {
        // Only past/today planned days can be ticked done — never a future day.
        const clickable = !d.isRest && !d.loggedSession && (d.isPast || d.isToday);
        const accentC = d.isRest ? C.muted2 : resolve(d.items[0]).color;
        return (
          <div
            key={d.dateKey}
            onClick={clickable ? () => onToggleDay(d) : undefined}
            style={{
              display: "flex", alignItems: "center", gap: 13, padding: "12px 0",
              borderBottom: `1px solid ${C.line3}`, cursor: clickable ? "pointer" : "default",
              opacity: d.isRest ? 0.55 : 1,
            }}
          >
            <div style={{ width: 36, flexShrink: 0 }}>
              <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: d.isToday ? C.accent : C.ink3 }}>{d.dayShort}</div>
              <div style={{ fontFamily: mono, fontSize: 10, color: C.muted2, marginTop: 1 }}>{d.dateLabel}</div>
            </div>
            <div style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: accentC }} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {d.isRest ? (
                <div style={{ fontSize: 14, fontWeight: 500, color: C.muted2 }}>Rest day</div>
              ) : (
                d.items.map((it) => {
                  const r = resolve(it);
                  return (
                    <div key={it.id}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, lineHeight: 1.2 }}>{r.title}</div>
                      {r.detail && <div style={{ fontSize: 11, color: r.color, fontFamily: mono, marginTop: 2 }}>{r.detail}</div>}
                    </div>
                  );
                })
              )}
            </div>
            <FullMarker d={d} />
          </div>
        );
      })}

      {/* momentum line — folds the consistency view into the combined card, kept
          light so the card still resolves to progress → agenda → actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 13, fontFamily: mono, fontSize: 11, flexWrap: "wrap" }}>
        <MomentumStat value={Math.round(momentum * 100)} label="momentum" />
        <span style={{ color: C.muted2 }}>·</span>
        <MomentumStat value={longestStreak} label="longest" />
        <span style={{ color: C.muted2 }}>·</span>
        <MomentumStat value={active28} label="active / 28d" />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button
          onClick={onStart}
          style={{ flex: 1, height: 46, border: "none", borderRadius: 13, background: C.accent, color: "#0a0b0d", fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          Start today’s plan
        </button>
        <button
          onClick={onEdit}
          style={{ height: 46, padding: "0 16px", border: `1px solid rgba(255,255,255,0.12)`, borderRadius: 13, background: C.inner, color: C.ink3, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          Edit
        </button>
      </div>
    </div>
  );
}

function MomentumStat({ value, label }: { value: number; label: string }) {
  return (
    <span>
      <span style={{ color: C.ink2, fontWeight: 700 }}>{value}</span>
      <span style={{ color: C.muted, marginLeft: 4 }}>{label}</span>
    </span>
  );
}

// ── Markers ───────────────────────────────────────────────────────────────────
function MiniMarker({ d, resolve }: { d: WeekDayStatus; resolve: (i: WeeklyPlanItem) => ResolvedItem }) {
  switch (d.kind) {
    case "done":
      return (
        <span style={{ width: 18, height: 18, borderRadius: 9, background: `${C.mint}29`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Check size={10} color={C.mint} stroke={3.6} />
        </span>
      );
    case "today":
      return <span style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${C.accent}`, boxSizing: "border-box" }} />;
    case "upcoming":
      return <span style={{ width: 8, height: 8, borderRadius: 4, background: resolve(d.items[0]).color }} />;
    case "missed":
      return <span style={{ width: 8, height: 8, borderRadius: 4, background: C.muted2 }} />;
    default: // rest
      return <span style={{ width: 9, height: 2, borderRadius: 2, background: "#3a4047" }} />;
  }
}

function FullMarker({ d }: { d: WeekDayStatus }) {
  switch (d.kind) {
    case "done":
      return (
        <span style={{ width: 24, height: 24, borderRadius: 12, background: `${C.mint}24`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Check size={13} color={C.mint} stroke={3} />
        </span>
      );
    case "today":
      return <span style={{ width: 24, height: 24, borderRadius: 12, border: `2px solid ${C.accent}`, boxSizing: "border-box", flexShrink: 0 }} />;
    case "missed":
      return <span style={{ width: 24, height: 24, borderRadius: 12, border: `1.5px solid ${C.red}66`, boxSizing: "border-box", flexShrink: 0 }} />;
    case "upcoming":
      return <span style={{ width: 24, height: 24, borderRadius: 12, border: `1.5px solid rgba(255,255,255,0.16)`, boxSizing: "border-box", flexShrink: 0 }} />;
    default: // rest
      return <span style={{ width: 22, height: 2, borderRadius: 2, background: "rgba(255,255,255,0.12)", flexShrink: 0 }} />;
  }
}

function Check({ size, color, stroke = 3.4 }: { size: number; color: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M6 9l6 6 6-6" stroke={C.sub} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
