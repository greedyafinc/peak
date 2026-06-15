import { mono } from "../theme";

// Simulated iOS status bar + dynamic-island notch (part of the Peak aesthetic).
export function StatusBar() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 50,
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 30px 0",
          pointerEvents: "none",
        }}
      >
        <div style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: "#f4f5f3", letterSpacing: "-0.5px" }}>9:41</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 11 }}>
            {[5, 7, 9, 11].map((h) => (
              <div key={h} style={{ width: 3, height: h, background: "#f4f5f3", borderRadius: 1 }} />
            ))}
          </div>
          <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: "#f4f5f3" }}>5G</div>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <div style={{ width: 22, height: 11, border: "1.5px solid rgba(244,245,243,0.6)", borderRadius: 3, padding: 1.5 }}>
              <div style={{ width: "100%", height: "100%", background: "#c6ff3d", borderRadius: 1 }} />
            </div>
            <div style={{ width: 1.5, height: 4, background: "rgba(244,245,243,0.6)", borderRadius: 1 }} />
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 11,
          left: "50%",
          transform: "translateX(-50%)",
          width: 120,
          height: 30,
          background: "#000",
          borderRadius: 18,
          zIndex: 41,
        }}
      />
    </>
  );
}
