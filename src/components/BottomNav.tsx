import { usePeak, type Tab } from "../store";
import { C } from "../theme";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "score", label: "Score", icon: "◎" },
  { id: "body", label: "Body", icon: "❡" },
  { id: "log", label: "Log", icon: "≡" },
  { id: "improve", label: "Improve", icon: "↗" },
];

const navBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 3,
  flex: 1,
  padding: "6px 0",
};

export function BottomNav() {
  const s = usePeak();
  if (!s.data.onboarded) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(12,13,16,0.92)",
        backdropFilter: "blur(18px)",
        borderTop: `1px solid ${C.line2}`,
        display: "flex",
        alignItems: "center",
        padding: "8px 14px max(14px, env(safe-area-inset-bottom))",
        zIndex: 50,
      }}
    >
      {TABS.slice(0, 2).map((t) => (
        <NavBtn key={t.id} t={t} active={s.tab === t.id} onClick={() => s.go(t.id)} />
      ))}
      <button
        onClick={() => (s.activeSession ? s.set({ activeOpen: true }) : s.set({ startOpen: true }))}
        aria-label={s.activeSession ? "Resume workout" : "Start a workout"}
        style={{
          width: 52,
          height: 52,
          borderRadius: 18,
          border: "none",
          cursor: "pointer",
          background: C.accent,
          color: "#0a0b0d",
          fontSize: 28,
          fontWeight: 300,
          lineHeight: 1,
          margin: "0 6px",
          boxShadow: `0 6px 20px -6px ${C.accent}88`,
          flexShrink: 0,
        }}
      >
        +
      </button>
      {TABS.slice(2).map((t) => (
        <NavBtn key={t.id} t={t} active={s.tab === t.id} onClick={() => s.go(t.id)} />
      ))}
    </div>
  );
}

function NavBtn({ t, active, onClick }: { t: { id: Tab; label: string; icon: string }; active: boolean; onClick: () => void }) {
  const col = active ? C.accent : C.muted2;
  return (
    <button onClick={onClick} style={navBtn} aria-label={t.label} aria-current={active}>
      <span style={{ fontSize: 19, color: col, lineHeight: 1 }}>{t.icon}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: col, letterSpacing: "0.3px" }}>{t.label}</span>
    </button>
  );
}
