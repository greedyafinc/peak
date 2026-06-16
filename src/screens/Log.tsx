// Peak — LOG screen (§6.4 + §2.7).
//   Hero: the combined "This Week" card — streak + on-plan rate + weekly routine
//         agenda in one (a behavioral signal, separate from capability).
//   Feed: per-set session history — the irreplaceable fuel that sharpens scores.
import { usePeak } from "../store";
import { est1RM } from "../engine/math";
import { SCREEN_STYLE, contentPad } from "./layoutPresets";
import { C, mono, WORKOUT_THEME } from "../theme";
import { Card, SectionTitle, Kicker, PrimaryButton, GhostButton, PerArmBadge } from "../components/ui";
import { WeeklyAgenda } from "../components/WeeklyAgenda";
import { EllipsisMenu } from "../components/SessionMenu";
import { EXERCISE_BY_ID } from "../data/exercises";
import { isPerArm } from "../data/exerciseCatalog";
import { fmtClock, fmtDistanceKm, kgToDisplay, paceLabel, weightUnit } from "../units";
import type { Session } from "../types";

// Feed cards stay glanceable: a session shows at most this many exercises inline,
// and the rest live in the full-page session detail (tap the card / "+N more").
const MAX_FEED_EXERCISES = 3;

export function Log() {
  const s = usePeak();
  const { data } = s;
  const sessions = data.sessions;

  const now = new Date();
  const weekdayLong = now.toLocaleDateString(undefined, { weekday: "long" });
  const monthDay = now.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div style={SCREEN_STYLE}>
      <div style={contentPad()}>
        <Kicker>{weekdayLong} · {monthDay}</Kicker>
        <div style={{ fontSize: 28, fontWeight: 700, color: C.ink, letterSpacing: "-0.6px", margin: "2px 0 14px" }}>Today</div>
        <WeeklyAgenda />
      </div>

      <div style={{ ...contentPad(), paddingTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
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

      <div style={{ ...contentPad(), paddingTop: 20 }}>
        <SectionTitle sub="Every set you log sharpens your muscle map and feeds your capability scores.">
          Session feed
        </SectionTitle>
      </div>

      {sessions.length === 0 ? (
        <div style={contentPad()}>
          <Card style={{ textAlign: "center", padding: "30px 20px" }}>
            <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.55 }}>
              No sessions yet. Log your first to start sharpening your muscle map and momentum.
            </div>
          </Card>
        </div>
      ) : (
        <div style={{ ...contentPad(), display: "flex", flexDirection: "column", gap: 12 }}>
          {sessions.map((sess) => <SessionCard key={sess.id} sess={sess} />)}
        </div>
      )}
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
      {/* header — tap to expand into the full-page detail; ⋯ to edit / remove */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 12px", borderLeft: `3px solid ${theme.color}` }}>
        <button
          onClick={() => s.set({ sessionDetailId: sess.id })}
          style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{
              flexShrink: 0, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px",
              padding: "2px 8px", borderRadius: 6, color: theme.color, background: theme.tagBg,
            }}>{sess.type}</span>
            <span style={{ minWidth: 0, fontSize: 15, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sess.title}</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 5, fontFamily: mono }}>
            {sess.localDay} · {time}{sess.durationMin ? ` · ${sess.durationMin} min` : ""}
          </div>
        </button>
        <EllipsisMenu
          actions={[
            { label: "View details", onClick: () => s.set({ sessionDetailId: sess.id }) },
            { label: "Edit", onClick: () => s.set({ sessionEditId: sess.id }) },
            { label: "Remove", danger: true, confirmLabel: "Tap to confirm remove", onClick: () => s.removeSession(sess.id) },
          ]}
        />
      </div>

      {/* body */}
      <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        {sess.entries.slice(0, MAX_FEED_EXERCISES).map((entry) => {
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
                {perArm && <PerArmBadge />}
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

        {/* overflow → the full session detail holds the rest */}
        {sess.entries.length > MAX_FEED_EXERCISES && (
          <button
            onClick={() => s.set({ sessionDetailId: sess.id })}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              background: "none", border: "none", padding: "2px 0", cursor: "pointer",
              fontFamily: mono, fontSize: 12, fontWeight: 700, letterSpacing: "0.3px", color: C.sub,
            }}
          >
            +{sess.entries.length - MAX_FEED_EXERCISES} more exercise{sess.entries.length - MAX_FEED_EXERCISES === 1 ? "" : "s"}
            <span style={{ color: C.muted, fontSize: 15, fontWeight: 700, lineHeight: 1 }}>›</span>
          </button>
        )}

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
