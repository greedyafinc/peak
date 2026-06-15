import { usePeak } from "../store";
import { peakScore, symmetryPct, formatVolume } from "../model";
import { BodyMap } from "../viz/BodyMap";
import { Radar } from "../viz/Radar";
import { heat, mono } from "../theme";

export function Body() {
  const s = usePeak();
  const muscles = s.bodyView === "front" ? s.data.muscles.front : s.data.muscles.back;
  const sel = muscles.find((m) => m.id === s.selMuscle) || null;
  const selColor = sel ? heat(sel.score) : "#fff";

  const peak = peakScore(s.data);
  const tiles = [
    { v: String(peak), k: "Peak score", color: "#c6ff3d" },
    { v: symmetryPct(s.data) + "%", k: "L / R symmetry", color: "#3dffb0" },
    { v: formatVolume(s.data.profile.weeklyVolume), k: "Weekly volume (kg)", color: "#f4f5f3" },
  ];

  const seg = (active: boolean): React.CSSProperties => ({
    fontSize: 13,
    fontWeight: 600,
    padding: "7px 18px",
    borderRadius: 24,
    border: "none",
    cursor: "pointer",
    background: active ? "#c6ff3d" : "transparent",
    color: active ? "#0a0b0d" : "#9aa0a6",
  });

  const stepBtn: React.CSSProperties = {
    width: 26,
    height: 26,
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#0f1115",
    color: "#f4f5f3",
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "58px 0 104px", animation: "scrIn .28s ease" }}>
      {/* HEADER */}
      <div style={{ padding: "6px 22px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "2px", color: "#6b7178", textTransform: "uppercase" }}>Body composition</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#f4f5f3", letterSpacing: "-1px", marginTop: 2 }}>Heat Map</div>
        </div>
        <div style={{ textAlign: "center", background: "#16181d", border: "1px solid rgba(198,255,61,0.2)", borderRadius: 16, padding: "8px 14px" }}>
          <div style={{ fontFamily: mono, fontSize: 24, fontWeight: 700, color: "#c6ff3d", lineHeight: 1 }}>{peak}</div>
          <div style={{ fontSize: 9, color: "#6b7178", textTransform: "uppercase", letterSpacing: "1px", marginTop: 3 }}>Peak score</div>
        </div>
      </div>

      {/* TOGGLE + LEGEND */}
      <div style={{ padding: "0 18px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", background: "#16181d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 30, padding: 4 }}>
          <button onClick={() => s.set({ bodyView: "front", selMuscle: null })} style={seg(s.bodyView === "front")}>Front</button>
          <button onClick={() => s.set({ bodyView: "back", selMuscle: null })} style={seg(s.bodyView === "back")}>Back</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: "#6b7178", textTransform: "uppercase", letterSpacing: "1px" }}>Weak</span>
          <div style={{ width: 70, height: 7, borderRadius: 4, background: "linear-gradient(90deg,#3f54a8,#2fb89a,#8fd14f,#ffd23f,#ff8a3d,#ff4d3d)" }} />
          <span style={{ fontSize: 10, color: "#6b7178", textTransform: "uppercase", letterSpacing: "1px" }}>Strong</span>
        </div>
      </div>

      {/* BODY MAP */}
      <div style={{ padding: "8px 0 4px" }}>
        <BodyMap muscles={muscles} selected={s.selMuscle} onSelect={s.selectMuscle} view={s.bodyView} />
      </div>

      {/* SELECTED MUSCLE */}
      <div style={{ padding: "0 18px" }}>
        {sel ? (
          <div style={{ background: "#16181d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 16, animation: "fadeIn .2s ease" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: 4, background: selColor, boxShadow: "0 0 12px " + selColor }} />
                <span style={{ fontSize: 19, fontWeight: 700, color: "#f4f5f3", letterSpacing: "-0.3px" }}>{sel.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button aria-label="Decrease score" onClick={() => s.bumpMuscle(s.bodyView, sel.id, -1)} style={stepBtn}>−</button>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: selColor }}>{sel.score}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#c6ff3d" }}>{sel.trend}</span>
                </div>
                <button aria-label="Increase score" onClick={() => s.bumpMuscle(s.bodyView, sel.id, 1)} style={stepBtn}>+</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <div style={{ flex: 1, background: "#0f1115", borderRadius: 12, padding: "11px 12px" }}>
                <div style={{ fontSize: 10, color: "#6b7178", textTransform: "uppercase", letterSpacing: "0.8px" }}>Top lift</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#f4f5f3", marginTop: 3 }}>{sel.lift}</div>
                <div style={{ fontFamily: mono, fontSize: 13, color: "#c6ff3d", marginTop: 1 }}>{sel.best}</div>
              </div>
              <div style={{ flex: 1, background: "#0f1115", borderRadius: 12, padding: "11px 12px" }}>
                <div style={{ fontSize: 10, color: "#6b7178", textTransform: "uppercase", letterSpacing: "0.8px" }}>Vs. bodyweight</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#f4f5f3", marginTop: 3 }}>{sel.ratio}</div>
                <div style={{ fontFamily: mono, fontSize: 13, color: "#9aa0a6", marginTop: 1 }}>{sel.pct} percentile</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: "#6b7178", textTransform: "uppercase", letterSpacing: "0.8px", margin: "14px 0 8px" }}>Trains this muscle</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {sel.ex.map((e) => (
                <span key={e} style={{ fontSize: 12, color: "#cdd2d6", background: "#0f1115", border: "1px solid rgba(255,255,255,0.07)", padding: "6px 11px", borderRadius: 8 }}>{e}</span>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background: "#16181d", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 18, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#cdd2d6" }}>Tap a muscle to inspect it</div>
            <div style={{ fontSize: 12, color: "#6b7178", marginTop: 3 }}>Strength is scored from your logged lifts relative to bodyweight & population data.</div>
          </div>
        )}
      </div>

      {/* STAT TILES */}
      <div style={{ padding: "16px 18px 4px", display: "flex", gap: 10 }}>
        {tiles.map((t) => (
          <div key={t.k} style={{ flex: 1, background: "#16181d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "13px 12px" }}>
            <div style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: t.color }}>{t.v}</div>
            <div style={{ fontSize: 10, color: "#6b7178", textTransform: "uppercase", letterSpacing: "0.6px", marginTop: 4, lineHeight: 1.3 }}>{t.k}</div>
          </div>
        ))}
      </div>

      {/* ATHLETICISM */}
      <div style={{ margin: "14px 18px 0", background: "#16181d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "18px 16px 16px" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#f4f5f3", letterSpacing: "-0.3px" }}>Athleticism</div>
        <div style={{ fontSize: 12, color: "#9aa0a6", marginTop: 1 }}>Six measured dimensions of performance</div>
        <div style={{ margin: "6px 0 4px" }}>
          <Radar metrics={s.data.metrics} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 6 }}>
          {s.data.metrics.map((m) => {
            const color = heat(m.val);
            return (
              <div key={m.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: "#cdd2d6", fontWeight: 500 }}>{m.label}</span>
                  <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color }}>{m.val}</span>
                </div>
                <div style={{ height: 6, borderRadius: 4, background: "#0f1115", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: m.val + "%", background: color, borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* GAPS */}
      <div style={{ padding: "22px 18px 0" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#f4f5f3", letterSpacing: "-0.3px", marginBottom: 12 }}>Gaps & next moves</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {s.data.gaps.map((g) => {
            const on = !!s.data.added[g.id];
            return (
              <div key={g.id} style={{ background: "#16181d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "15px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 3, background: g.dot }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#f4f5f3" }}>{g.title}</span>
                </div>
                <div style={{ fontSize: 13, color: "#9aa0a6", margin: "5px 0 12px", lineHeight: 1.45 }}>{g.reason}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0f1115", borderRadius: 12, padding: "10px 12px" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#f4f5f3" }}>{g.workout}</div>
                    <div style={{ fontSize: 11, color: "#6b7178", fontFamily: mono, marginTop: 1 }}>{g.dur} · {g.tag}</div>
                  </div>
                  <button
                    onClick={() => s.toggleAdded(g.id)}
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: "none",
                      cursor: "pointer",
                      background: on ? "rgba(198,255,61,0.15)" : "#c6ff3d",
                      color: on ? "#c6ff3d" : "#0a0b0d",
                    }}
                  >
                    {on ? "Added ✓" : "Add"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
