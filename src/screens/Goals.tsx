import { usePeak } from "../store";
import { decorateGoals } from "../goals";
import { Stepper } from "../viz/Stepper";
import { mono } from "../theme";

export function Goals() {
  const s = usePeak();
  const { primary: p, others } = decorateGoals(s.data.goals);

  // Tap a milestone node: complete through it, or roll back if it was already done.
  const pick = (goalId: string, completed: number) => (i: number) =>
    s.setGoalProgress(goalId, i < completed ? i : i + 1);

  return (
    <div style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "58px 0 104px", animation: "scrIn .28s ease" }}>
      {/* HEADER */}
      <div style={{ padding: "6px 22px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "2px", color: "#6b7178", textTransform: "uppercase" }}>Your missions</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#f4f5f3", letterSpacing: "-1px", marginTop: 2 }}>Goals</div>
        </div>
        <button onClick={() => s.set({ goalOpen: true })} style={{ fontSize: 13, fontWeight: 700, padding: "9px 14px", borderRadius: 30, cursor: "pointer", border: "1px solid rgba(198,255,61,0.3)", background: "rgba(198,255,61,0.1)", color: "#c6ff3d" }}>
          + New
        </button>
      </div>

      {/* PRIMARY GOAL HERO */}
      {p && (
        <div style={{ margin: "0 18px 22px", background: "linear-gradient(155deg,#1c2417,#15171d)", border: "1px solid rgba(198,255,61,0.2)", borderRadius: 22, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#c6ff3d" }}>★ Primary goal</span>
            <span style={{ fontFamily: mono, fontSize: 11, color: "#9aa0a6" }}>{p.eta}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{ fontSize: 26 }}>{p.icon}</span>
            <div style={{ fontSize: 23, fontWeight: 700, color: "#f4f5f3", letterSpacing: "-0.6px" }}>{p.name}</div>
          </div>
          <div style={{ margin: "22px 2px 6px" }}>
            <Stepper milestones={p.milestones} completed={p.completed} locked={p.locked} onPick={pick(p.id, p.completed)} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18, background: "rgba(0,0,0,0.28)", borderRadius: 14, padding: "12px 14px" }}>
            <div>
              <div style={{ fontSize: 10, color: "#6b7178", textTransform: "uppercase", letterSpacing: "0.8px" }}>Next milestone</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f4f5f3", marginTop: 2 }}>{p.currentMilestone}</div>
              <div style={{ fontFamily: mono, fontSize: 11, color: "#c6ff3d", marginTop: 2 }}>{p.progressText}</div>
            </div>
            <button onClick={() => s.go("coach")} style={{ fontSize: 13, fontWeight: 700, padding: "11px 16px", borderRadius: 12, border: "none", cursor: "pointer", background: "#c6ff3d", color: "#0a0b0d" }}>
              View plan
            </button>
          </div>
        </div>
      )}

      {/* ALL GOALS */}
      <div style={{ padding: "0 18px" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#f4f5f3", letterSpacing: "-0.3px", marginBottom: 12 }}>All goals</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {others.map((g) => (
            <div key={g.id} style={{ background: g.cardBg, border: "1px solid " + g.cardBd, borderRadius: 18, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: g.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{g.icon}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: g.nameColor, letterSpacing: "-0.3px" }}>{g.name}</div>
                    <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: g.catColor, marginTop: 2 }}>{g.cat}</div>
                  </div>
                </div>
                <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: g.statusColor }}>{g.status}</span>
              </div>
              <div style={{ margin: "18px 2px 4px" }}>
                <Stepper milestones={g.milestones} completed={g.completed} locked={g.locked} onPick={pick(g.id, g.completed)} />
              </div>
              <div style={{ fontFamily: mono, fontSize: 11, color: "#9aa0a6", marginTop: 8 }}>{g.nextLabel}</div>
            </div>
          ))}
        </div>

        {/* DATA CONTROLS */}
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#6b7178", marginBottom: 10 }}>Everything here is saved on this device.</div>
          <button
            onClick={() => { if (confirm("Reset all Peak data back to the sample content? This can’t be undone.")) s.resetData(); }}
            style={{ fontSize: 12, fontWeight: 600, padding: "8px 14px", borderRadius: 30, cursor: "pointer", border: "1px solid rgba(255,77,61,0.3)", background: "rgba(255,77,61,0.08)", color: "#ff8a3d" }}
          >
            Reset sample data
          </button>
        </div>
      </div>
    </div>
  );
}
