// Shared across every university's closing-merit dataset (UET, FAST, and any
// future addition). Deliberately has no knowledge of any one university's
// category/session conventions -- it only operates on a plain {year, pct}[]
// history and a program name, so a new university's data file just needs to
// produce those two shapes to get trend/projection/tier support for free.
export interface MeritHistoryPoint {
  year: number;
  pct: number;
}
export type Tier = "safe" | "likely" | "reach" | "unlikely";
// Average year-over-year change across however many consecutive years are
// available (1 point -> no trend / 0; 2+ points -> mean of the deltas).
// Deliberately simple (no regression) -- this is a directional signal for
// "rising/falling ~X%/year", not a statistical forecast. With only 2 points
// (e.g. FAST's 2025-2026) this is just the single year-over-year delta,
// which is a much weaker signal than UET's 4-point average -- surface that
// difference in the UI rather than presenting both with equal confidence.
export function getTrend(history: MeritHistoryPoint[]): number {
  if (history.length < 2) return 0;
  let totalDelta = 0;
  for (let i = 1; i < history.length; i++) {
    totalDelta += history[i].pct - history[i - 1].pct;
  }
  return totalDelta / (history.length - 1);
}
// Maximum year-over-year movement assumed when projecting next cycle's
// cutoff. Real closing merits can genuinely swing hard in one year -- see
// Islamabad Accounting & Finance, flagged in fast-closing-merits.ts as an
// unverified 31 -> 63.51 jump -- but projecting that raw +32.5 delta forward
// assumes the jump repeats, producing a ~96% projected cutoff that's above
// almost any realistically achievable score. Capping the assumed swing keeps
// the projection plausible even when the underlying trend is volatile or
// (as with FAST's 2-point histories) too thin to fully trust. getTrend()
// itself stays uncapped -- it's an honest "how much did it move" signal and
// should be shown as-is in the UI; only the projection step dampens it.
const MAX_PROJECTED_SWING = 10;

// Latest known cutoff plus one (capped) trend-step, clamped to a valid
// percentage. With only one data point this is just that point's value (no
// trend to add).
export function getProjectedCutoff(history: MeritHistoryPoint[]): number | null {
  if (history.length === 0) return null;
  const latest = history[history.length - 1].pct;
  const trend = getTrend(history);
  const cappedTrend = Math.max(-MAX_PROJECTED_SWING, Math.min(MAX_PROJECTED_SWING, trend));
  return Math.max(0, Math.min(100, latest + cappedTrend));
}
// Compares the user's computed merit score against the projected cutoff for
// next cycle (not last year's raw number) -- a rising program should look
// harder than its stale historical figure suggests, and vice versa.
export function getTier(userScore: number, projectedCutoff: number): Tier {
  const margin = userScore - projectedCutoff;
  if (margin >= 3) return "safe";
  if (margin >= 0) return "likely";
  if (margin >= -3) return "reach";
  return "unlikely";
}
export const TIER_LABELS: Record<Tier, { label: string; emoji: string }> = {
  safe: { label: "Safe", emoji: "\u{1F7E2}" },
  likely: { label: "Likely", emoji: "\u{1F7E1}" },
  reach: { label: "Reach", emoji: "\u{1F7E0}" },
  unlikely: { label: "Unlikely", emoji: "\u{1F534}" },
};
// Groups any flat offering list by program name, preserving insertion order
// of first appearance -- used to render one card per program with each
// campus/session/etc. as a sub-row, rather than one row per raw data record.
export function groupByProgram<T extends { program: string }>(offerings: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const o of offerings) {
    const list = map.get(o.program);
    if (list) {
      list.push(o);
    } else {
      map.set(o.program, [o]);
    }
  }
  return map;
}
