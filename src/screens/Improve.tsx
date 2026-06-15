// Peak — IMPROVE screen (§1.2 "how do I get better" + §2.6.1 + §5.6).
//   Top opportunities (weakest tested leaves = most efficient path up),
//   coverage opportunities (high-value untested leaves), projections (proj/1),
//   goals, and methodology transparency (§5.6 — the trust differentiator).
import { useMemo } from "react";
import { usePeak } from "../store";
import { C, mono } from "../theme";
import {
  Card, TierBadge, SectionTitle, Kicker, GhostButton,
  SourceTag, PercentileBar, pctLabel,
} from "../components/ui";
import { LEAF_BY_ID, DIM_META } from "../data/capabilityTree";
import { BENCHMARK_BY_LEAF } from "../data/benchmarks";
import type { LeafScore, Projection, GoalV3, MethodologyNote } from "../types";

const SCREEN: React.CSSProperties = {
  position: "absolute", inset: 0, overflowY: "auto", padding: "58px 0 104px",
  animation: "scrIn .28s ease",
};
const PAD: React.CSSProperties = { padding: "0 18px" };

function projLabel(p: Projection): { text: string; color: string } {
  switch (p.state) {
    case "ok":
      return { text: `≈ ${p.etaWeeks.low}–${p.etaWeeks.high} wks${p.saturating ? " · slowing" : ""}`, color: C.mint };
    case "no_trend":
      return { text: "No current trend — keep logging", color: C.sub };
    case "insufficient_data":
      return { text: "Need more data to project", color: C.muted };
  }
}

export function Improve() {
  const s = usePeak();
  const { data } = s;

  const tested = useMemo(
    () => Object.values(data.leafScores).filter((l): l is LeafScore => l.percentileRaw != null),
    [data.leafScores],
  );

  // Weakest tested leaves → most efficient path up (§2.3).
  const weakest = useMemo(
    () => [...tested].sort((a, b) => (a.percentileRaw! - b.percentileRaw!)).slice(0, 4),
    [tested],
  );

  // High-value untested DIRECT leaves: has a benchmark protocol, not yet tested, not deferred.
  const coverage = useMemo(() => {
    return Object.keys(BENCHMARK_BY_LEAF)
      .filter((leafId) => {
        const leaf = LEAF_BY_ID[leafId];
        if (!leaf || leaf.deferred) return false;
        const ls = data.leafScores[leafId];
        return !ls || ls.percentileRaw == null;
      })
      .slice(0, 6);
  }, [data.leafScores]);

  return (
    <div style={SCREEN}>
      <div style={PAD}>
        <Kicker>Improve · §1.2</Kicker>
        <div style={{ height: 8 }} />
        <SectionTitle sub="The most efficient path up — raising your weakest tested capability moves your Peak Score the most.">
          Top opportunities
        </SectionTitle>
      </div>

      {weakest.length === 0 ? (
        <div style={PAD}>
          <Card style={{ textAlign: "center", padding: "26px 20px" }}>
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.55 }}>
              Test a few capabilities to reveal your most efficient paths to a higher score.
            </div>
          </Card>
        </div>
      ) : (
        <div style={{ ...PAD, display: "flex", flexDirection: "column", gap: 10 }}>
          {weakest.map((ls) => {
            const leaf = LEAF_BY_ID[ls.leafId];
            const dim = leaf ? DIM_META[leaf.dimension] : null;
            const proj = s.projectLeaf(ls.leafId);
            const pl = projLabel(proj);
            const hasBench = !!BENCHMARK_BY_LEAF[ls.leafId];
            return (
              <Card key={ls.leafId}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{leaf?.label ?? ls.leafId}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{dim?.label}</div>
                  </div>
                  <TierBadge tier={ls.tier} small />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
                  <div style={{ flex: 1 }}>
                    <PercentileBar percentile={ls.percentileRaw} confidence={ls.confidence} color={dim?.color} height={8} />
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: dim?.color ?? C.accent }}>{pctLabel(ls.percentileRaw)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontFamily: mono, color: pl.color }}>{pl.text}</span>
                  {hasBench && (
                    <GhostButton color={dim?.color} onClick={() => s.set({ benchOpen: true, benchLeaf: ls.leafId })}>Re-test</GhostButton>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Coverage opportunities ── */}
      {coverage.length > 0 && (
        <>
          <div style={{ ...PAD, paddingTop: 22 }}>
            <SectionTitle sub="Unlock more of your picture — each test adds coverage and is rewarded, never penalized.">
              Coverage opportunities
            </SectionTitle>
          </div>
          <div style={{ ...PAD, display: "flex", flexDirection: "column", gap: 8 }}>
            {coverage.map((leafId) => {
              const proto = BENCHMARK_BY_LEAF[leafId];
              const leaf = LEAF_BY_ID[leafId];
              const dim = leaf ? DIM_META[leaf.dimension] : null;
              return (
                <Card key={leafId} onClick={() => s.set({ benchOpen: true, benchLeaf: leafId })} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
                  <span style={{ fontSize: 22 }}>{proto.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{leaf?.label ?? leafId}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{dim?.label} · untested</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: dim?.color ?? C.accent }}>Unlock →</span>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ── Goals ── */}
      <div style={{ ...PAD, paddingTop: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <SectionTitle>Goals</SectionTitle>
          <GhostButton onClick={() => s.set({ goalOpen: true })}>＋ New goal</GhostButton>
        </div>
      </div>
      <div style={{ ...PAD }}>
        {data.goals.length === 0 ? (
          <Card style={{ textAlign: "center", padding: "22px 20px" }}>
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.5 }}>No goals yet. Set one to track a target and see a projected ETA.</div>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.goals.map((g) => <GoalCard key={g.id} goal={g} />)}
          </div>
        )}
      </div>

      {/* ── Methodology transparency (§5.6) ── */}
      <div style={{ ...PAD, paddingTop: 24 }}>
        <Kicker>Methodology · §5.6</Kicker>
        <div style={{ height: 8 }} />
        <SectionTitle sub="We show our work. Every percentile is labeled with its data source.">
          How your scores are made
        </SectionTitle>
      </div>
      <div style={{ ...PAD, display: "flex", flexDirection: "column", gap: 10 }}>
        {s.derived.methodology.length === 0 ? (
          <Card style={{ textAlign: "center", padding: "22px 20px" }}>
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.5 }}>
              Test or log capabilities and Peak will label exactly which population data and assumptions back each percentile.
            </div>
          </Card>
        ) : (
          s.derived.methodology.map((note) => <MethodologyCard key={note.distributionId} note={note} />)
        )}
        <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.55, padding: "4px 2px" }}>
          Composition percentiles draw on NHANES DEXA reference data; that dataset reflects an older population vintage,
          so we treat its band edges conservatively and show the caveat wherever it applies.
        </div>
      </div>
    </div>
  );
}

function GoalCard({ goal }: { goal: GoalV3 }) {
  const s = usePeak();
  const dim = DIM_META[goal.dimension];
  const targetLeaf = goal.target?.nodeId ? LEAF_BY_ID[goal.target.nodeId] : undefined;
  const proj = targetLeaf ? s.projectLeaf(targetLeaf.id) : null;
  const pl = proj ? projLabel(proj) : null;

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
          <span style={{ fontSize: 24 }}>{goal.icon}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{goal.name}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              {dim?.label}
              {targetLeaf && ` · ${targetLeaf.label}`}
              {goal.target?.targetPercentileRaw != null && ` → ${pctLabel(goal.target.targetPercentileRaw)}`}
            </div>
          </div>
        </div>
        <button
          onClick={() => s.removeGoal(goal.id)}
          style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, padding: 2, lineHeight: 1 }}
          aria-label="Remove goal"
        >×</button>
      </div>
      {pl && (
        <div style={{ marginTop: 11, paddingTop: 11, borderTop: `1px solid ${C.line2}`, fontSize: 11, fontFamily: mono, color: pl.color }}>
          Projected ETA · {pl.text}
        </div>
      )}
    </Card>
  );
}

function MethodologyCard({ note }: { note: MethodologyNote }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{note.dataSourceLabel}</div>
        <SourceTag provenance={note.provenance} />
      </div>
      {note.coldStartNote && (
        <div style={{ fontSize: 12, color: C.orange, lineHeight: 1.5, marginBottom: note.assumptions.length ? 8 : 0 }}>
          {note.coldStartNote}
        </div>
      )}
      {note.assumptions.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
          {note.assumptions.map((a, i) => (
            <li key={i} style={{ fontSize: 12, color: C.sub, lineHeight: 1.5 }}>{a}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
