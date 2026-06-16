import { C, mono, glow, hexA } from "../theme";

// Goal milestone ladder: completed steps show checks, the current one glows,
// upcoming ones are dim numbered nodes; the track fills lime through completed segments.
// When `onPick` is supplied the nodes become tappable so the user can mark
// progress (tap a node to complete through it; tap a done node to roll back).
export function Stepper({
  milestones,
  completed,
  locked = false,
  onPick,
}: {
  milestones: string[];
  completed: number;
  locked?: boolean;
  onPick?: (index: number) => void;
}) {
  const cur = locked ? -1 : completed;
  const interactive = !locked && !!onPick;

  return (
    <div style={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
      {milestones.map((label, i) => {
        const done = !locked && i < completed;
        const isCur = i === cur;

        let inner: React.ReactNode;
        if (done) {
          inner = (
            <svg width={13} height={13} viewBox="0 0 13 13" fill="none">
              <path d="M2.5 6.8l2.8 2.8 5-6" stroke={C.screen} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          );
        } else if (isCur) {
          inner = <div style={{ width: 9, height: 9, borderRadius: "50%", background: C.accent }} />;
        } else if (i === 0 && locked) {
          inner = (
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none">
              <rect x={4} y={11} width={16} height={10} rx={2} fill={C.muted} />
              <path d="M8 11V8a4 4 0 018 0v3" stroke={C.muted} strokeWidth={2.2} fill="none" />
            </svg>
          );
        } else {
          inner = <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: C.muted2 }}>{i + 1}</span>;
        }

        return (
          <div key={i} style={{ display: "contents" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 54 }}>
              <div
                onClick={interactive ? () => onPick!(i) : undefined}
                style={{
                  width: isCur ? 30 : 26,
                  height: isCur ? 30 : 26,
                  borderRadius: "50%",
                  background: done ? C.accent : C.innerAlt,
                  border: isCur ? `2.5px solid ${C.accent}` : done ? "none" : "1.5px solid rgba(255,255,255,0.14)",
                  boxShadow: isCur ? glow.box(hexA(C.accent, 0.55)) : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all .2s",
                  cursor: interactive ? "pointer" : "default",
                }}
              >
                {inner}
              </div>
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 600,
                  color: done ? C.ink3 : isCur ? C.accent : C.muted2,
                  textAlign: "center",
                  marginTop: 7,
                  lineHeight: 1.15,
                  letterSpacing: "0.2px",
                }}
              >
                {label}
              </div>
            </div>
            {i < milestones.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  marginTop: 13,
                  background: !locked && i < completed ? C.accent : "rgba(255,255,255,0.1)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
