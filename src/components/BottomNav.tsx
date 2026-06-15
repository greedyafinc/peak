import { usePeak } from "../store";

const navColor = (active: boolean) => (active ? "#c6ff3d" : "#5a6066");

const navBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 5,
  padding: 0,
  width: 54,
};
const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 600, letterSpacing: "0.3px" };

export function BottomNav() {
  const s = usePeak();

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        height: 90,
        background: "linear-gradient(0deg,#0a0b0d 62%,rgba(10,11,13,0.85) 100%)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-around", padding: "12px 14px 0", position: "relative" }}>
        <button onClick={() => s.go("feed")} style={{ ...navBtn, color: navColor(s.tab === "feed") }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="3.5" rx="1.5" fill="currentColor" />
            <rect x="3" y="10.5" width="18" height="3.5" rx="1.5" fill="currentColor" opacity="0.85" />
            <rect x="3" y="16" width="11" height="3.5" rx="1.5" fill="currentColor" opacity="0.7" />
          </svg>
          <span style={labelStyle}>Feed</span>
        </button>

        <button onClick={() => s.go("body")} style={{ ...navBtn, color: navColor(s.tab === "body") }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="5" r="2.6" fill="currentColor" />
            <path d="M12 8.5c-1.2 0-2.2.7-2.6 1.8L8 15h1.8l.5 5h3.4l.5-5H16l-1.4-4.7c-.4-1.1-1.4-1.8-2.6-1.8z" fill="currentColor" />
          </svg>
          <span style={labelStyle}>Body</span>
        </button>

        <button onClick={() => s.set({ sheet: true })} style={{ ...navBtn, marginTop: -4 }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 18,
              background: "#c6ff3d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 22px -4px rgba(198,255,61,0.5)",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M13 6v14M6 13h14" stroke="#0a0b0d" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </div>
        </button>

        <button onClick={() => s.go("coach")} style={{ ...navBtn, color: navColor(s.tab === "coach") }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z" fill="currentColor" />
          </svg>
          <span style={labelStyle}>Coach</span>
        </button>

        <button onClick={() => s.go("goals")} style={{ ...navBtn, color: navColor(s.tab === "goals") }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.2" />
            <circle cx="12" cy="12" r="3.4" fill="currentColor" />
          </svg>
          <span style={labelStyle}>Goals</span>
        </button>
      </div>
      <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", width: 130, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.22)" }} />
    </div>
  );
}
