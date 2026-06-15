import { usePeak, type CoachTab } from "../store";
import { Skeleton } from "../viz/Skeleton";
import { mono } from "../theme";

const COACH_TABS: { key: CoachTab; label: string }[] = [
  { key: "chat", label: "Chat" },
  { key: "live", label: "Live Coach" },
  { key: "drills", label: "Drills" },
];
const QUICK_PROMPTS = ["Help me run a marathon", "Fix my weak points", "Plan my week", "Get a human flag"];

export function Coach() {
  const s = usePeak();
  const sports = Object.keys(s.data.drills);
  const drills = s.data.drills[s.sport] || [];

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", animation: "scrIn .28s ease" }}>
      {/* HEADER */}
      <div style={{ padding: "58px 22px 10px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "2px", color: "#6b7178", textTransform: "uppercase" }}>AI Coach</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#f4f5f3", letterSpacing: "-1px", marginTop: 2 }}>Coach</div>
          </div>
          {s.coachTab === "chat" && s.data.chat.length > 1 && (
            <button onClick={() => s.resetChat()} style={{ fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 30, cursor: "pointer", border: "1px solid rgba(255,255,255,0.1)", background: "#16181d", color: "#9aa0a6" }}>
              Clear
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, background: "#16181d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 4, marginTop: 14 }}>
          {COACH_TABS.map((ct) => {
            const a = s.coachTab === ct.key;
            return (
              <button
                key={ct.key}
                onClick={() => s.set({ coachTab: ct.key })}
                style={{ flex: 1, fontSize: 13, fontWeight: 600, padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer", background: a ? "#c6ff3d" : "transparent", color: a ? "#0a0b0d" : "#9aa0a6" }}
              >
                {ct.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CHAT */}
      {s.coachTab === "chat" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 18px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
            {s.data.chat.map((m, i) => {
              const me = m.role === "me";
              return (
                <div key={i} style={{ display: "flex", justifyContent: me ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "78%", padding: "12px 14px", borderRadius: me ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: me ? "#c6ff3d" : "#16181d", color: me ? "#0a0b0d" : "#e8eaec", fontSize: 14, lineHeight: 1.5, border: me ? "none" : "1px solid rgba(255,255,255,0.08)" }}>
                    {m.text}
                  </div>
                </div>
              );
            })}
            {s.thinking && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ maxWidth: "78%", padding: "12px 14px", borderRadius: "18px 18px 18px 4px", background: "#16181d", color: "#6b7178", fontSize: 14, lineHeight: 1.5, border: "1px solid rgba(255,255,255,0.08)" }}>…</div>
              </div>
            )}
          </div>
          <div style={{ flexShrink: 0, padding: "0 18px 6px", display: "flex", gap: 8, overflowX: "auto" }}>
            {QUICK_PROMPTS.map((q) => (
              <button key={q} onClick={() => s.quick(q)} style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, padding: "8px 13px", borderRadius: 30, cursor: "pointer", border: "1px solid rgba(198,255,61,0.3)", background: "rgba(198,255,61,0.08)", color: "#c6ff3d" }}>
                {q}
              </button>
            ))}
          </div>
          <div style={{ flexShrink: 0, padding: "8px 18px 102px", display: "flex", gap: 9, alignItems: "center" }}>
            <input
              value={s.draft}
              onChange={(e) => s.set({ draft: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") s.send(); }}
              placeholder="Message your coach…"
              style={{ flex: 1, fontSize: 14, color: "#f4f5f3", background: "#16181d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "13px 16px", outline: "none" }}
            />
            <button onClick={() => s.send()} style={{ width: 46, height: 46, flexShrink: 0, borderRadius: "50%", border: "none", cursor: "pointer", background: "#c6ff3d", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 10h13M11 5l5 5-5 5" stroke="#0a0b0d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* LIVE */}
      {s.coachTab === "live" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 18px 104px" }}>
          <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", height: 360, background: "repeating-linear-gradient(135deg,#15171d,#15171d 11px,#181b22 11px,#181b22 22px)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ position: "absolute", top: 14, left: 14, display: "flex", alignItems: "center", gap: 7, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", padding: "6px 11px", borderRadius: 30 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff4d3d", animation: "pulseDot 1.2s infinite" }} />
              <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: "#f4f5f3", letterSpacing: "1px" }}>LIVE · ANALYZING</span>
            </div>
            <div style={{ position: "absolute", top: 14, right: 14, fontFamily: mono, fontSize: 10, color: "#6b7178", background: "rgba(0,0,0,0.4)", padding: "5px 9px", borderRadius: 8 }}>camera feed</div>
            <Skeleton />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 14, background: "linear-gradient(0deg,rgba(10,11,13,0.92),transparent)" }}>
              <div style={{ fontSize: 12, color: "#9aa0a6" }}>Drill</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#f4f5f3" }}>Jump Shot · Form Check</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {s.data.liveMetrics.map((lm) => (
              <div key={lm.label} style={{ background: "#16181d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "13px 15px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#f4f5f3" }}>{lm.label}</div>
                  <div style={{ fontSize: 12, color: "#9aa0a6", marginTop: 1 }}>{lm.note}</div>
                </div>
                <div style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: lm.color }}>{lm.val}</div>
              </div>
            ))}
          </div>
          <button style={{ width: "100%", marginTop: 14, fontSize: 15, fontWeight: 700, padding: 15, borderRadius: 16, border: "none", cursor: "pointer", background: "#c6ff3d", color: "#0a0b0d", display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#0a0b0d" }} />
            Record attempt
          </button>
        </div>
      )}

      {/* DRILLS */}
      {s.coachTab === "drills" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 18px 104px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
            {sports.map((sp) => {
              const a = s.sport === sp;
              return (
                <button key={sp} onClick={() => s.set({ sport: sp })} style={{ flexShrink: 0, fontSize: 13, fontWeight: 600, padding: "8px 15px", borderRadius: 30, cursor: "pointer", border: "1px solid " + (a ? "#ff8a3d" : "rgba(255,255,255,0.08)"), background: a ? "#ff8a3d" : "#16181d", color: a ? "#0a0b0d" : "#9aa0a6" }}>
                  {sp}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {drills.map((d) => (
              <div key={d.name} style={{ background: "#16181d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "15px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#f4f5f3", letterSpacing: "-0.3px" }}>{d.name}</div>
                  <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: d.diffColor, border: "1px solid " + d.diffColor, padding: "3px 8px", borderRadius: 6 }}>{d.diff}</span>
                </div>
                <div style={{ fontSize: 13, color: "#9aa0a6", marginTop: 4 }}>{d.focus}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontFamily: mono, fontSize: 13, color: "#cdd2d6" }}>{d.vol}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#c6ff3d" }}>Start drill →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
