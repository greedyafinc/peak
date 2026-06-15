import { useEffect, useState, type ReactNode } from "react";
import { usePeak } from "../store";
import { catColor, mono } from "../theme";
import { formatVolume, type Stat } from "../model";

// Shared bottom-sheet shell, matching the ActionSheet's look.
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "absolute", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.55)", animation: "fadeIn .2s ease", display: "flex", alignItems: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", background: "#16181d", borderTop: "1px solid rgba(255,255,255,0.1)", borderRadius: "28px 28px 0 0", padding: "12px 18px 30px", animation: "sheetUp .3s cubic-bezier(.2,.8,.2,1)", maxHeight: "88%", overflowY: "auto" }}
      >
        <div style={{ width: 38, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.2)", margin: "0 auto 18px" }} />
        <div style={{ fontSize: 20, fontWeight: 700, color: "#f4f5f3", letterSpacing: "-0.5px", marginBottom: 16 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: "#6b7178", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6, display: "block" };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", fontSize: 15, color: "#f4f5f3", background: "#0f1115", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", outline: "none" };
const primaryBtn: React.CSSProperties = { width: "100%", marginTop: 18, fontSize: 15, fontWeight: 700, padding: 14, borderRadius: 14, border: "none", cursor: "pointer", background: "#c6ff3d", color: "#0a0b0d" };
const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

// ── Log a session ────────────────────────────────────────────────────────────
export function LogSheet() {
  const s = usePeak();
  const type = s.logType;
  const [title, setTitle] = useState("");
  const [sub, setSub] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [volume, setVolume] = useState("");

  // Reset the form each time the sheet opens for a (possibly different) type.
  useEffect(() => {
    setTitle("");
    setSub("");
    setMinutes("30");
    setVolume("");
  }, [type]);

  if (!type) return null;
  const close = () => s.set({ logType: null });

  const submit = () => {
    const mins = Math.max(1, parseInt(minutes, 10) || 30);
    const volumeKg = type === "Gym" ? Math.max(0, parseInt(volume, 10) || 0) : 0;
    const stats: Stat[] = [{ v: String(mins), k: "minutes" }];
    if (type === "Gym" && volumeKg > 0) stats.push({ v: formatVolume(volumeKg), k: "kg volume" });
    s.logWorkout({
      type,
      title: title.trim(),
      sub: sub.trim() || (type === "Gym" ? "Strength session" : type === "Cardio" ? "Conditioning" : type === "Sport" ? "Sport session" : "Recovery flow"),
      dur: `${mins} min`,
      stats,
      volumeKg,
    });
    s.set({ logType: null, tab: "feed", filter: "all" });
  };

  return (
    <Sheet title={`Log ${type} Session`} onClose={close}>
      <Field label="Title">
        <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${type} Session`} autoFocus />
      </Field>
      <Field label="Focus / notes">
        <input style={inputStyle} value={sub} onChange={(e) => setSub(e.target.value)} placeholder={type === "Gym" ? "Chest · Shoulders · Triceps" : "What did you do?"} />
      </Field>
      <Field label="Duration (minutes)">
        <input style={inputStyle} value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="numeric" />
      </Field>
      {type === "Gym" && (
        <Field label="Total volume (kg) — optional">
          <input style={inputStyle} value={volume} onChange={(e) => setVolume(e.target.value)} inputMode="numeric" placeholder="e.g. 12000" />
        </Field>
      )}
      <button style={primaryBtn} onClick={submit}>Save session</button>
    </Sheet>
  );
}

// ── Create a goal ────────────────────────────────────────────────────────────
const CATS = ["Strength", "Endurance", "Skill", "Balance", "Power", "Mobility", "Speed"];

export function GoalSheet() {
  const s = usePeak();
  const open = s.goalOpen;
  const [name, setName] = useState("");
  const [cat, setCat] = useState("Strength");
  const [icon, setIcon] = useState("🎯");
  const [milestones, setMilestones] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setCat("Strength");
      setIcon("🎯");
      setMilestones("");
    }
  }, [open]);

  if (!open) return null;
  const close = () => s.set({ goalOpen: false });

  const submit = () => {
    const ms = milestones
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    s.addGoal({ name, cat, icon: icon.trim() || "🎯", milestones: ms });
    s.set({ goalOpen: false, tab: "goals" });
  };

  return (
    <Sheet title="Set a Goal" onClose={close}>
      <Field label="Goal name">
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Touch the rim" autoFocus />
      </Field>
      <Field label="Category">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CATS.map((c) => {
            const a = cat === c;
            const col = catColor(c);
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{ fontSize: 13, fontWeight: 600, padding: "7px 13px", borderRadius: 30, cursor: "pointer", border: "1px solid " + (a ? col : "rgba(255,255,255,0.1)"), background: a ? col : "#0f1115", color: a ? "#0a0b0d" : "#9aa0a6" }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Icon (emoji)">
        <input style={{ ...inputStyle, width: 90, textAlign: "center", fontSize: 22 }} value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} />
      </Field>
      <Field label="Milestones (comma-separated) — optional">
        <input style={inputStyle} value={milestones} onChange={(e) => setMilestones(e.target.value)} placeholder="Base, Build, Peak, Achieve" />
      </Field>
      <div style={{ fontFamily: mono, fontSize: 11, color: "#6b7178", marginTop: 2 }}>Leave milestones blank for a default 4-step track.</div>
      <button style={primaryBtn} onClick={submit}>Create goal</button>
    </Sheet>
  );
}
