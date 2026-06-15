// Peak — Score screen (§2.6, §4.5): the soul of the product. Renders the
// build-relative headline (or per-leaf tier placements when the MIN_HEADLINE
// floor isn't met), a capability radar, and the dimension → sub-category → leaf
// tree with per-leaf provenance + confidence and Test prompts for untested leaves.

import { useMemo, type CSSProperties } from "react";
import { usePeak } from "../store";
import type { DimensionRollup, SubcategoryRollup } from "../engine/rollup";
import type { DimensionId, LeafScore } from "../types";
import {
  DIM_META,
  SUBCAT_LABEL,
  leavesForSubcategory,
  LEAF_BY_ID,
} from "../data/capabilityTree";
import { BENCHMARK_BY_LEAF } from "../data/benchmarks";
import { Radar } from "../viz/Radar";
import { C, mono, sans } from "../theme";
import {
  Card,
  ConfidenceMeter,
  Kicker,
  PercentileBar,
  SectionTitle,
  SourceTag,
  StatTile,
  TierBadge,
  pct100,
  pctLabel,
  score100,
  tierColor,
  tierLabel,
} from "../components/ui";

// Short axis labels for the radar.
const DIM_ABBR: Record<DimensionId, string> = {
  strength: "STR",
  power: "PWR",
  muscular_endurance: "END",
  aerobic: "AER",
  anaerobic: "ANA",
  mobility: "MOB",
  balance: "BAL",
  agility: "AGI",
  body_composition: "COMP",
  consistency: "CON",
};

const pageWrap: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflowY: "auto",
  padding: "58px 0 104px",
  animation: "scrIn .28s ease",
};
const content: CSSProperties = { padding: "0 18px" };

export function Score() {
  const s = usePeak();
  const { headline, dimensions } = s.derived;
  const { leafScores, consistency, biometric } = s.data;

  const build = biometric?.build;
  const cohortLabel = build
    ? `vs ${build.sex === "unspecified" ? "your build" : build.sex + "s"}, ${Math.round(build.heightCm)}cm, ${build.ageYears}`
    : null;

  // Performed dimensions only (consistency is not in `dimensions`, but guard anyway).
  const performed = dimensions.filter((d) => d.dimension !== "consistency");
  const tested = performed.filter((d) => d.percentile != null);

  // Radar axes: drive the shape off tested dimensions (0 for untested keeps a
  // clean polygon while honestly showing the gaps).
  const radarMetrics = useMemo(
    () =>
      performed.map((d) => ({
        abbr: DIM_ABBR[d.dimension] ?? d.dimension.slice(0, 3).toUpperCase(),
        val: pct100(d.percentile),
      })),
    [performed],
  );

  // The tested leaves, for the per-leaf placement fallback.
  const testedLeafScores = useMemo(
    () =>
      Object.values(leafScores)
        .filter((ls): ls is LeafScore => ls.percentileRaw != null)
        .sort((a, b) => (b.percentileRaw as number) - (a.percentileRaw as number)),
    [leafScores],
  );

  return (
    <div style={pageWrap}>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div style={content}>
        {headline.rendered ? (
          <HeadlineHero headline={headline} consistency={consistency} cohortLabel={cohortLabel} />
        ) : (
          <PlacementHero
            leafScores={testedLeafScores}
            needed={Math.max(0, 3 - headline.testedLeaves)}
            cohortLabel={cohortLabel}
            consistency={consistency}
            onTest={(leafId) => s.set({ benchOpen: true, benchLeaf: leafId })}
          />
        )}
      </div>

      {/* ── RADAR ────────────────────────────────────────────────────────── */}
      {tested.length > 0 && (
        <div style={{ ...content, marginTop: 22 }}>
          <Card style={{ padding: "14px 10px 6px" }}>
            <div style={{ padding: "0 8px 4px" }}>
              <Kicker>Capability radar</Kicker>
            </div>
            <Radar metrics={radarMetrics} />
          </Card>
        </div>
      )}

      {/* ── DIMENSION TREE ───────────────────────────────────────────────── */}
      <div style={{ ...content, marginTop: 24 }}>
        <SectionTitle sub="Tap any dimension to walk its sub-categories and leaves.">Capability tree</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {performed.map((d) => (
            <DimensionRow
              key={d.dimension}
              dim={d}
              expanded={s.selDimension === d.dimension}
              onToggle={() => s.selectDimension(s.selDimension === d.dimension ? null : d.dimension)}
              leafScores={leafScores}
              onTest={(leafId) => s.set({ benchOpen: true, benchLeaf: leafId })}
            />
          ))}
        </div>
      </div>

      {/* ── METHODOLOGY ──────────────────────────────────────────────────── */}
      <div style={{ ...content, marginTop: 22 }}>
        <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.55, padding: "0 4px" }}>
          Strength uses height-conditioned population data — your bodyweight is deliberately excluded. Every score is
          labeled with its data source; tap any leaf to see it. Coverage is shown alongside your score, never folded into it.
        </div>
      </div>
    </div>
  );
}

// ── Headline hero (rendered Peak Score) ─────────────────────────────────────
function HeadlineHero({
  headline,
  consistency,
  cohortLabel,
}: {
  headline: import("../types").Headline;
  consistency: import("../types").ConsistencyTrack;
  cohortLabel: string | null;
}) {
  const score = score100(headline.peakScore);
  const coverage = Math.round(headline.coverage * 100);
  const momentum = Math.round(consistency.momentum * 100);
  return (
    <Card glow={C.accent} style={{ padding: "20px 18px", position: "relative", overflow: "hidden" }}>
      {/* subtle accent gradient */}
      <div
        style={{
          position: "absolute",
          top: -60,
          right: -50,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.accent}22 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <Kicker>Peak Score</Kicker>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 6 }}>
        <div style={{ fontFamily: sans, fontSize: 64, fontWeight: 800, letterSpacing: "-3px", lineHeight: 0.9, color: C.ink }}>
          {score}
        </div>
        <div style={{ fontFamily: mono, fontSize: 15, color: C.muted, paddingBottom: 9 }}>/100</div>
      </div>
      <div style={{ fontSize: 13.5, color: C.sub, marginTop: 8, lineHeight: 1.4 }}>
        How good you are across everything you've tested, for your build.
      </div>
      {cohortLabel && (
        <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, marginTop: 3, letterSpacing: "0.3px" }}>{cohortLabel}</div>
      )}

      {/* coverage + peak badges */}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <StatTile value={`${coverage}%`} label="of your picture mapped" color={C.blue} />
        <StatTile
          value={
            <span>
              {headline.peakBadges} <span style={{ color: C.accent }}>★</span>
            </span>
          }
          label="Peak capabilities"
          color={C.ink}
        />
      </div>

      {/* momentum — SEPARATE from capability (§2.7) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 12,
          padding: "11px 14px",
          borderRadius: 13,
          background: C.inner,
          border: `1px solid ${C.line2}`,
        }}
      >
        <div style={{ fontSize: 11.5, color: C.muted }}>
          Momentum <span style={{ color: C.muted2 }}>· not capability</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: C.mint }}>{momentum}%</span>
          <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: C.orange }}>
            🔥 {consistency.currentStreakDays}d
          </span>
        </div>
      </div>
    </Card>
  );
}

// ── Placement hero (fewer than MIN_HEADLINE_LEAVES — §4.5) ──────────────────
function PlacementHero({
  leafScores,
  needed,
  cohortLabel,
  consistency,
  onTest,
}: {
  leafScores: LeafScore[];
  needed: number;
  cohortLabel: string | null;
  consistency: import("../types").ConsistencyTrack;
  onTest: (leafId: string) => void;
}) {
  const momentum = Math.round(consistency.momentum * 100);
  const hasAny = leafScores.length > 0;
  return (
    <div>
      <div style={{ marginBottom: 4 }}>
        <Kicker>{hasAny ? "Your placements" : "Welcome to Peak"}</Kicker>
      </div>

      {hasAny ? (
        <>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.ink, letterSpacing: "-0.6px", lineHeight: 1.15, margin: "8px 0 4px" }}>
            Here's where you stand for your build.
          </div>
          {cohortLabel && (
            <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, marginBottom: 14, letterSpacing: "0.3px" }}>{cohortLabel}</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {leafScores.map((ls) => {
              const leaf = LEAF_BY_ID[ls.leafId];
              return (
                <Card key={ls.leafId} glow={ls.isPeak ? C.accent : undefined} style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>{leaf?.label ?? ls.leafId}</div>
                      <div style={{ fontSize: 13, color: C.sub, marginTop: 3 }}>
                        You're <span style={{ color: tierColor(ls.tier), fontWeight: 700 }}>{tierLabel(ls.tier)}</span> for your build
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: tierColor(ls.tier) }}>
                        {pctLabel(ls.percentileRaw)}
                      </div>
                      <TierBadge tier={ls.tier} small />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 20, fontWeight: 700, color: C.ink, letterSpacing: "-0.4px", lineHeight: 1.3, margin: "8px 0 16px" }}>
          Test a few capabilities to see where you stand for your build.
        </div>
      )}

      {/* The unlock prompt */}
      <Card style={{ marginTop: 14, padding: 16 }} glow={C.accent}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>
          {needed > 0 ? `Test ${needed} more capabilit${needed === 1 ? "y" : "ies"} to unlock your Peak Score` : "Almost there — keep testing"}
        </div>
        <div style={{ fontSize: 12.5, color: C.sub, marginTop: 5, lineHeight: 1.45 }}>
          Your headline Peak Score appears once you've tested 3 capabilities across 2 dimensions.
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {["strength.bench_1rm", "muscular_endurance.pushups_max", "aerobic.5k"].map((leafId) => (
            <button
              key={leafId}
              onClick={() => onTest(leafId)}
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                padding: "8px 12px",
                borderRadius: 11,
                border: "none",
                cursor: "pointer",
                background: `${C.accent}1f`,
                color: C.accent,
              }}
            >
              + {LEAF_BY_ID[leafId]?.label ?? leafId}
            </button>
          ))}
        </div>
      </Card>

      {momentum > 0 || consistency.currentStreakDays > 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
            padding: "11px 14px",
            borderRadius: 13,
            background: C.inner,
            border: `1px solid ${C.line2}`,
          }}
        >
          <div style={{ fontSize: 11.5, color: C.muted }}>Momentum · not capability</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: C.mint }}>{momentum}%</span>
            <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: C.orange }}>🔥 {consistency.currentStreakDays}d</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Dimension row (collapsible) ─────────────────────────────────────────────
function DimensionRow({
  dim,
  expanded,
  onToggle,
  leafScores,
  onTest,
}: {
  dim: DimensionRollup;
  expanded: boolean;
  onToggle: () => void;
  leafScores: Record<string, LeafScore>;
  onTest: (leafId: string) => void;
}) {
  const meta = DIM_META[dim.dimension];
  const col = meta?.color ?? C.accent;
  const tested = dim.percentile != null;
  const lowConf = meta?.lowConfidence;

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div onClick={onToggle} style={{ padding: 14, cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: 5, background: col, flexShrink: 0 }} />
            <span style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>{dim.label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
            {tested && <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: col }}>{pctLabel(dim.percentile)}</span>}
            <TierBadge tier={dim.tier} small />
            <span style={{ color: C.muted, fontSize: 12, transform: expanded ? "rotate(90deg)" : "none", transition: "transform .2s" }}>›</span>
          </div>
        </div>

        <div style={{ marginTop: 11 }}>
          <PercentileBar percentile={dim.percentile} confidence={dim.confidence} color={col} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ fontSize: 11, color: C.muted, fontFamily: mono }}>
            {dim.testedLeaves}/{dim.eligibleLeaves} tested
          </span>
          {lowConf && (
            <span style={{ fontSize: 10.5, color: C.orange, fontWeight: 600 }}>low-confidence · thin norms</span>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${C.line2}`, background: C.innerAlt, padding: "6px 14px 12px", animation: "fadeIn .2s ease" }}>
          {dim.subcats.map((sc) => (
            <SubcategoryBlock key={sc.subCategory} sub={sc} color={col} leafScores={leafScores} onTest={onTest} />
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Sub-category block with its leaves ──────────────────────────────────────
function SubcategoryBlock({
  sub,
  color,
  leafScores,
  onTest,
}: {
  sub: SubcategoryRollup;
  color: string;
  leafScores: Record<string, LeafScore>;
  onTest: (leafId: string) => void;
}) {
  const leaves = leavesForSubcategory(sub.subCategory);
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
        <span style={{ fontSize: 11, color: C.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px" }}>
          {SUBCAT_LABEL[sub.subCategory] ?? sub.subCategory}
        </span>
        {sub.percentile != null && (
          <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>{pctLabel(sub.percentile)}</span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {leaves.map((leaf) => (
          <LeafRow key={leaf.id} leaf={leaf} score={leafScores[leaf.id]} color={color} onTest={onTest} />
        ))}
      </div>
    </div>
  );
}

// ── Leaf row ────────────────────────────────────────────────────────────────
function LeafRow({
  leaf,
  score,
  color,
  onTest,
}: {
  leaf: import("../types").CapabilityLeaf;
  score: LeafScore | undefined;
  color: string;
  onTest: (leafId: string) => void;
}) {
  const tested = score != null && score.percentileRaw != null;
  const hasBenchmark = !!BENCHMARK_BY_LEAF[leaf.id];
  const isInferred = leaf.kind === "inferred";

  if (!tested) {
    // Untested → greyed, with a Test affordance (direct + has protocol) or a
    // "train it" note for inferred muscle leaves.
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "9px 11px",
          borderRadius: 11,
          background: C.lockCard,
          border: `1px dashed ${C.line2}`,
        }}
      >
        <span style={{ fontSize: 13, color: C.muted, minWidth: 0 }}>{leaf.label}</span>
        {hasBenchmark && !isInferred ? (
          <button
            onClick={() => onTest(leaf.id)}
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              padding: "6px 12px",
              borderRadius: 9,
              border: "none",
              cursor: "pointer",
              background: `${color}26`,
              color,
              flexShrink: 0,
            }}
          >
            Test
          </button>
        ) : (
          <span style={{ fontSize: 10.5, color: C.muted2, textAlign: "right", flexShrink: 0, maxWidth: 150, lineHeight: 1.3 }}>
            Train it — inferred from logged sets
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "9px 11px",
        borderRadius: 11,
        background: C.inner,
        border: `1px solid ${score.isPeak ? `${C.accent}55` : C.line2}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{leaf.label}</span>
          {score.isPeak && <span style={{ fontSize: 11, color: C.accent }}>★</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 700, color: tierColor(score.tier) }}>
            {pctLabel(score.percentileRaw)}
          </span>
          <TierBadge tier={score.tier} small />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 7 }}>
        <ConfidenceMeter confidence={score.confidence} />
        {score.distributionSource && <SourceTag provenance={score.distributionSource} />}
      </div>
    </div>
  );
}
