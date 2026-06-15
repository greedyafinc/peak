import { usePeak } from "../store";

type SheetItem = {
  label: string;
  desc: string;
  color: string;
  iconBg: string;
  shape: string;
  onClick: () => void;
};

export function ActionSheet() {
  const s = usePeak();
  if (!s.sheet) return null;

  const close = () => s.set({ sheet: false });
  const items: SheetItem[] = [
    { label: "Gym Session", desc: "Log lifts, sets & PRs", color: "#c6ff3d", iconBg: "rgba(198,255,61,0.14)", shape: "4px", onClick: () => s.set({ sheet: false, logType: "Gym" }) },
    { label: "Cardio", desc: "Run, ride, row or swim", color: "#3dffb0", iconBg: "rgba(61,255,176,0.14)", shape: "50%", onClick: () => s.set({ sheet: false, logType: "Cardio" }) },
    { label: "Sport", desc: "Track a game or session", color: "#ff8a3d", iconBg: "rgba(255,138,61,0.14)", shape: "4px", onClick: () => s.set({ sheet: false, logType: "Sport" }) },
    { label: "Mobility", desc: "Stretch, recover & flow", color: "#5aa9ff", iconBg: "rgba(90,169,255,0.14)", shape: "4px", onClick: () => s.set({ sheet: false, logType: "Mobility" }) },
    { label: "Ask the AI Coach", desc: "Build a plan from your goals", color: "#5aa9ff", iconBg: "rgba(90,169,255,0.14)", shape: "50%", onClick: () => s.set({ sheet: false, tab: "coach", coachTab: "chat" }) },
    { label: "Set a Goal", desc: "Pick a milestone-based mission", color: "#c6ff3d", iconBg: "rgba(198,255,61,0.14)", shape: "4px", onClick: () => s.set({ sheet: false, goalOpen: true }) },
  ];

  return (
    <div
      onClick={close}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 60,
        background: "rgba(0,0,0,0.55)",
        animation: "fadeIn .2s ease",
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "#16181d",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "28px 28px 0 0",
          padding: "12px 18px 36px",
          animation: "sheetUp .3s cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <div style={{ width: 38, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.2)", margin: "0 auto 18px" }} />
        <div style={{ fontSize: 20, fontWeight: 700, color: "#f4f5f3", letterSpacing: "-0.5px", marginBottom: 14 }}>Start something</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((si) => (
            <button
              key={si.label}
              onClick={si.onClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                textAlign: "left",
                background: "#0f1115",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 16,
                padding: "14px 15px",
                cursor: "pointer",
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 13, background: si.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: si.shape, background: si.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#f4f5f3" }}>{si.label}</div>
                <div style={{ fontSize: 12, color: "#9aa0a6", marginTop: 1 }}>{si.desc}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="#6b7178" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
