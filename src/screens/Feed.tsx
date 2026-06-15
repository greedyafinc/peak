import { usePeak } from "../store";
import type { WorkoutType } from "../model";
import { decorateGoals } from "../goals";
import { Stepper } from "../viz/Stepper";
import { mono, WORKOUT_THEME } from "../theme";

const CHIPS: { key: string; label: string; accent: string }[] = [
  { key: "all", label: "All", accent: "#c6ff3d" },
  { key: "gym", label: "Gym", accent: "#c6ff3d" },
  { key: "cardio", label: "Cardio", accent: "#3dffb0" },
  { key: "sport", label: "Sport", accent: "#ff8a3d" },
  { key: "mobility", label: "Mobility", accent: "#5aa9ff" },
];
const FILTER_MAP: Record<string, WorkoutType | null> = { all: null, gym: "Gym", cardio: "Cardio", sport: "Sport", mobility: "Mobility" };

function todayLabel(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
  const md = now.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${weekday} · ${md}`;
}

export function Feed() {
  const s = usePeak();
  const streak = s.data.streak;
  const primary = decorateGoals(s.data.goals).primary;
  const want = FILTER_MAP[s.filter];
  const feed = want ? s.data.feed.filter((f) => f.type === want) : s.data.feed;

  return (
    <div style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "58px 0 104px", animation: "scrIn .28s ease" }}>
      {/* HEADER */}
      <div style={{ padding: "6px 22px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "2px", color: "#6b7178", textTransform: "uppercase" }}>{todayLabel()}</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#f4f5f3", letterSpacing: "-1px", marginTop: 2 }}>Today</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#16181d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 30, padding: "7px 13px 7px 10px" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#ff8a3d,#ff4d3d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🔥</div>
          <span style={{ fontFamily: mono, fontWeight: 700, color: "#f4f5f3", fontSize: 15 }}>{streak.count}</span>
        </div>
      </div>

      {/* CONSISTENCY */}
      <div style={{ margin: "0 18px 16px", background: "linear-gradient(150deg,#1b2417,#15171d)", border: "1px solid rgba(198,255,61,0.18)", borderRadius: 22, padding: "18px 18px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "1.5px", color: "#c6ff3d", textTransform: "uppercase" }}>Consistency</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#f4f5f3", marginTop: 4, letterSpacing: "-0.5px" }}>{streak.count}-day streak</div>
            <div style={{ fontSize: 13, color: "#9aa0a6", marginTop: 2 }}>{streak.rate}% on-plan this month</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: mono, fontSize: 26, fontWeight: 700, color: "#c6ff3d", lineHeight: 1 }}>
              {streak.weekDone}
              <span style={{ color: "#6b7178", fontSize: 16 }}>/{streak.weekTarget}</span>
            </div>
            <div style={{ fontSize: 11, color: "#6b7178", marginTop: 3, textTransform: "uppercase", letterSpacing: "1px" }}>this week</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 42, marginTop: 16 }}>
          {streak.bars.map((b, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: "100%", height: b.h, borderRadius: 5, background: b.on ? "#c6ff3d" : "rgba(255,255,255,0.10)" }} />
              <div style={{ fontFamily: mono, fontSize: 9, color: "#6b7178" }}>{b.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PRIMARY GOAL */}
      {primary && (
        <div onClick={() => s.go("goals")} style={{ margin: "0 18px 16px", background: "#16181d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 16, cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#c6ff3d" }}>★ Primary goal</span>
            <span style={{ fontSize: 12, color: "#6b7178", fontFamily: mono }}>{primary.progressText}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 20 }}>{primary.icon}</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#f4f5f3", letterSpacing: "-0.4px" }}>{primary.name}</div>
          </div>
          <div style={{ margin: "16px 2px 4px" }}>
            <Stepper milestones={primary.milestones} completed={primary.completed} locked={primary.locked} />
          </div>
          <div style={{ fontFamily: mono, fontSize: 11, color: "#9aa0a6", marginTop: 8 }}>Next: {primary.currentMilestone}</div>
        </div>
      )}

      {/* GAP TEASER */}
      <div onClick={() => s.go("body")} style={{ margin: "0 18px 18px", background: "#16181d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "15px 16px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(90,169,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #5aa9ff" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#f4f5f3" }}>Mobility is your biggest gap</div>
          <div style={{ fontSize: 12, color: "#9aa0a6", marginTop: 1 }}>See your full body breakdown →</div>
        </div>
      </div>

      {/* FILTER CHIPS */}
      <div style={{ display: "flex", gap: 8, padding: "0 18px 14px", overflowX: "auto" }}>
        {CHIPS.map((c) => {
          const a = s.filter === c.key;
          return (
            <button
              key={c.key}
              onClick={() => s.set({ filter: c.key })}
              style={{
                flexShrink: 0,
                fontSize: 13,
                fontWeight: 600,
                padding: "8px 15px",
                borderRadius: 30,
                cursor: "pointer",
                border: "1px solid " + (a ? c.accent : "rgba(255,255,255,0.08)"),
                background: a ? c.accent : "#16181d",
                color: a ? "#0a0b0d" : "#9aa0a6",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* FEED LIST */}
      <div style={{ padding: "0 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        {feed.length === 0 && (
          <div style={{ background: "#16181d", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 18, padding: 18, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#cdd2d6" }}>
              {want ? `No ${want} sessions yet` : "Nothing logged here yet"}
            </div>
            <div style={{ fontSize: 12, color: "#6b7178", marginTop: 3 }}>Tap + to log a session — it’s saved on your device.</div>
          </div>
        )}
        {feed.map((w) => {
          const theme = WORKOUT_THEME[w.type];
          const ex = (w.exercises || []).map((e) => ({ ...e, dot: e.pr ? "#c6ff3d" : "rgba(255,255,255,0.28)" }));
          const moreCount = Math.max(0, ex.length - 4);
          const preview = ex.slice(0, 4);
          return (
            <div key={w.id} style={{ background: "#16181d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: 16, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: theme.color }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: theme.color, background: theme.tagBg, padding: "4px 8px", borderRadius: 6 }}>{w.type}</span>
                  <span style={{ fontSize: 12, color: "#6b7178", fontFamily: mono }}>{w.time}</span>
                </div>
                <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: "#f4f5f3" }}>{w.dur}</div>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#f4f5f3", letterSpacing: "-0.3px" }}>{w.title}</div>
              <div style={{ fontSize: 13, color: "#9aa0a6", marginTop: 3 }}>{w.sub}</div>

              {preview.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 13 }}>
                  {preview.map((e, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0f1115", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "9px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: e.dot }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#e8eaec" }}>{e.name}</span>
                      </div>
                      <span style={{ fontFamily: mono, fontSize: 12, color: "#9aa0a6", whiteSpace: "nowrap", flexShrink: 0, paddingLeft: 10 }}>{e.detail}</span>
                    </div>
                  ))}
                  {moreCount > 0 && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7178", padding: "3px 2px 0", letterSpacing: "0.2px" }}>+{moreCount} more exercises</div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 18, marginTop: 13, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {w.stats.map((st, i) => (
                  <div key={i}>
                    <div style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: "#f4f5f3" }}>{st.v}</div>
                    <div style={{ fontSize: 10, color: "#6b7178", textTransform: "uppercase", letterSpacing: "0.8px", marginTop: 1 }}>{st.k}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
