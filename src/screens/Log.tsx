// Peak — LOG screen (§6.4 + §2.7).
//   Hero: consistency / momentum — a behavioral signal, separate from capability.
//   Feed: per-set session history — the irreplaceable fuel that sharpens scores.
import { useMemo } from "react";
import { usePeak } from "../store";
import { C, mono, WORKOUT_THEME } from "../theme";
import { Card, SectionTitle, Kicker, PrimaryButton, GhostButton } from "../components/ui";
import { EXERCISE_BY_ID } from "../data/exercises";
import { isPerArm } from "../data/exerciseCatalog";
import { fmtClock, fmtDistanceKm, kgToDisplay, paceLabel, weightUnit } from "../units";
import type { Session, ConsistencyTrack } from "../types";

const SCREEN: React.CSSProperties = {
  position: "absolute", inset: 0, overflowY: "auto", padding: "58px 0 104px",
  animation: "scrIn .28s ease",
};
const PAD: React.CSSProperties = { padding: "0 18px" };

function localDayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const est1RM = (weight: number, reps: number) => weight * (1 + reps / 30);

export function Log() {
  const s = usePeak();
  const { data } = s;
  const c = data.consistency;
  const sessions = data.sessions;

  // last 14 local days, lit when a session exists for that day
  const days14 = useMemo(() => {
    const activeDays = new Set(sessions.map((x) => x.localDay));
    const out: { key: string; label: string; active: boolean }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = localDayKey(d);
      out.push({ key, label: String(d.getDate()), active: activeDays.has(key) });
    }
    return out;
  }, [sessions]);

  return (
    <div style={SCREEN}>
      <div style={PAD}>
        <Kicker>Consistency · §2.7</Kicker>
        <div style={{ height: 8 }} />
        <MomentumHero c={c} days14={days14} />
      </div>

      <div style={{ ...PAD, paddingTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        {s.activeSession ? (
          <button
            onClick={() => s.set({ activeOpen: true })}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "13px 16px", borderRadius: 15, cursor: "pointer", border: `1px solid ${C.accent}55`, background: `${C.accent}12` }}
          >
            <span style={{ width: 9, height: 9, borderRadius: 5, background: C.accent, animation: "pulseDot 1.6s ease-in-out infinite", flexShrink: 0 }} />
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Workout in progress</div>
              <div style={{ fontSize: 11, color: C.muted }}>{s.activeSession.title || "Untitled"}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.5px" }}>Resume</span>
          </button>
        ) : (
          <PrimaryButton onClick={() => s.set({ startOpen: true })}>＋ Start a workout</PrimaryButton>
        )}
        <GhostButton color={C.sub} onClick={() => s.set({ logOpen: true })} style={{ width: "100%", textAlign: "center", background: "transparent", border: `1px solid ${C.line2}` }}>
          Quick log a past session or cardio
        </GhostButton>
      </div>

      <div style={{ ...PAD, paddingTop: 20 }}>
        <SectionTitle sub="Every set you log sharpens your muscle map and feeds your capability scores.">
          Session feed
        </SectionTitle>
      </div>

      {sessions.length === 0 ? (
        <div style={PAD}>
          <Card style={{ textAlign: "center", padding: "30px 20px" }}>
            <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.55 }}>
              No sessions yet. Log your first to start sharpening your muscle map and momentum.
            </div>
          </Card>
        </div>
      ) : (
        <div style={{ ...PAD, display: "flex", flexDirection: "column", gap: 12 }}>
          {sessions.map((sess) => <SessionCard key={sess.id} sess={sess} />)}
        </div>
      )}
    </div>
  );
}

// ── Momentum hero (§2.7) — a streak you don't want to break ───────────────────
function MomentumHero({ c, days14 }: { c: ConsistencyTrack; days14: { key: string; label: string; active: boolean }[] }) {
  const momentum100 = Math.round(c.momentum * 100);
  return (
    <Card glow={c.currentStreakDays > 0 ? C.accent : undefined} style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: mono, fontSize: 40, fontWeight: 700, color: C.accent, lineHeight: 1 }}>{c.currentStreakDays}</span>
            <span style={{ fontSize: 13, color: C.sub }}>day streak</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.7px", marginTop: 8 }}>
            Momentum · behavioral, not capability
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: mono, fontSize: 26, fontWeight: 700, color: C.mint, lineHeight: 1 }}>{momentum100}</div>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", marginTop: 4 }}>/ 100</div>
        </div>
      </div>

      {/* momentum bar */}
      <div style={{ height: 8, borderRadius: 4, background: C.inner, overflow: "hidden", marginTop: 14 }}>
        <div style={{ width: `${momentum100}%`, height: "100%", background: `linear-gradient(90deg, ${C.accent}, ${C.mint})`, borderRadius: 4 }} />
      </div>

      {/* 14-day activity chart */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, marginTop: 16, height: 36 }}>
        {days14.map((d) => (
          <div key={d.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: "100%", borderRadius: 3,
              height: d.active ? 28 : 8,
              background: d.active ? C.accent : C.inner,
              boxShadow: d.active ? `0 0 6px ${C.accent}88` : "none",
              transition: "height .2s",
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 9.5, color: C.muted, fontFamily: mono }}>14 days ago</span>
        <span style={{ fontSize: 9.5, color: C.muted, fontFamily: mono }}>today</span>
      </div>

      {/* sub stats */}
      <div style={{ display: "flex", gap: 18, marginTop: 16, borderTop: `1px solid ${C.line2}`, paddingTop: 14 }}>
        <HeroStat value={`${c.activeDaysTrailing28}`} label="Active / 28d" />
        <HeroStat value={`${c.longestStreakDays}`} label="Longest streak" />
        <HeroStat value={c.adherenceTrailing28 != null ? `${Math.round(c.adherenceTrailing28 * 100)}%` : "—"} label="Adherence" />
      </div>
    </Card>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: C.ink }}>{value}</div>
      <div style={{ fontSize: 9.5, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 3 }}>{label}</div>
    </div>
  );
}

// ── Session card with per-set detail (§6.4) ───────────────────────────────────
function SessionCard({ sess }: { sess: Session }) {
  const s = usePeak();
  const sys = s.data.unitSystem;
  const wUnit = weightUnit(sys);
  const theme = WORKOUT_THEME[sess.type];
  const time = new Date(sess.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 12px", borderLeft: `3px solid ${theme.color}` }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px",
              padding: "2px 8px", borderRadius: 6, color: theme.color, background: theme.tagBg,
            }}>{sess.type}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{sess.title}</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 5, fontFamily: mono }}>
            {sess.localDay} · {time}{sess.durationMin ? ` · ${sess.durationMin} min` : ""}
          </div>
        </div>
      </div>

      {/* body */}
      <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        {sess.entries.map((entry) => {
          const ex = EXERCISE_BY_ID[entry.exerciseId];
          const perArm = ex ? isPerArm(ex) : false;
          return (
            <div key={entry.id}>
              {/* tap an exercise → its in-depth detail (trajectory, percentile, history, tips) */}
              <button
                onClick={() => ex && s.set({ exDetail: { kind: "strength", exerciseId: entry.exerciseId } })}
                disabled={!ex}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 6, marginBottom: 6,
                  background: "none", border: "none", padding: 0, textAlign: "left",
                  cursor: ex ? "pointer" : "default",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: C.ink2 }}>{ex?.name ?? entry.exerciseId}</span>
                {perArm && (
                  <span style={{ fontSize: 8.5, fontWeight: 700, color: C.blue, background: `${C.blue}1f`, padding: "1px 5px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    Per arm
                  </span>
                )}
                {ex && <span style={{ marginLeft: "auto", color: C.muted, fontSize: 16, fontWeight: 700, lineHeight: 1 }}>›</span>}
              </button>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {entry.sets.map((set, i) => {
                  const w = set.weight?.value;
                  const e1 = w != null && w > 0 ? est1RM(w, set.reps) : null;
                  return (
                    <div key={set.id} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: mono, fontSize: 12 }}>
                      <span style={{ color: C.muted, width: 18 }}>{i + 1}</span>
                      <span style={{ color: C.ink }}>
                        {w != null ? `${Number(kgToDisplay(w, sys, 1))}${wUnit}${perArm ? "/arm" : ""} × ${set.reps}` : `${set.reps} reps`}
                      </span>
                      {set.rpe != null && <span style={{ color: C.orange }}>@{set.rpe}</span>}
                      {e1 != null && <span style={{ color: C.muted, marginLeft: "auto" }}>~{kgToDisplay(e1, sys, 0)}{wUnit} 1RM</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {sess.cardio?.map((cs) => {
          const durSec = cs.duration.value * 60; // cardio duration canonical = minutes
          return (
            <button
              key={cs.id}
              onClick={() => s.set({ exDetail: { kind: "cardio", sessionId: sess.id, cardioId: cs.id } })}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, fontFamily: mono, fontSize: 13, color: C.ink, flexWrap: "wrap", background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
            >
              {cs.distance && <span>{fmtDistanceKm(cs.distance.value, sys)}</span>}
              {cs.distance && <span style={{ color: C.muted }}>·</span>}
              <span>{fmtClock(durSec)}</span>
              {cs.distance && cs.distance.value > 0 && (
                <><span style={{ color: C.muted }}>·</span><span style={{ color: C.muted }}>{paceLabel(cs.distance.value, durSec, sys)}</span></>
              )}
              {cs.avgHr && <><span style={{ color: C.muted }}>·</span><span style={{ color: C.red }}>{cs.avgHr.value} bpm</span></>}
              <span style={{ marginLeft: "auto", color: C.muted, fontSize: 16, fontWeight: 700, lineHeight: 1 }}>›</span>
            </button>
          );
        })}

        {sess.notes && <div style={{ fontSize: 12, color: C.sub, fontStyle: "italic", lineHeight: 1.5 }}>{sess.notes}</div>}
      </div>
    </Card>
  );
}
