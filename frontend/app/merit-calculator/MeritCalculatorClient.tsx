"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UNIVERSITIES, CATEGORIES } from "../universities/data";
import type { University, MeritWeights, FormulaConfidence, Category } from "../universities/data";
// UET's data file re-exports the shared trend/tier utilities (see its own
// header comment) so every closing-merit consumer in the app can pull them
// from one place without caring that the logic actually lives in
// merit-history-shared.ts.
import {
  UET_CLOSING_MERITS,
  type MeritCategory as UetFeeCategory,
  getProjectedCutoff,
  getTier,
  TIER_LABELS,
  type Tier,
} from "../universities/uet-closing-merits";
import { FAST_CLOSING_MERITS } from "../universities/fast-closing-merits";

function ConfidenceBadge({ confidence }: { confidence: FormulaConfidence }) {
  const config: Record<FormulaConfidence, { label: string; className: string }> = {
    high: { label: "Verified", className: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
    medium: { label: "Likely accurate", className: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
    low: { label: "Unconfirmed", className: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800" },
    unverified: { label: "Not verified", className: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700" },
  };
  const c = config[confidence];
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${c.className}`}>
      {c.label}
    </span>
  );
}

interface MarksState {
  obtained: string;
  total: string;
}

const EMPTY_MARKS: MarksState = { obtained: "", total: "" };

type FieldKey = "matric" | "fsc" | "test";

interface ActiveField {
  key: FieldKey;
  label: string;
  weight: number;
  note?: string;
}

// Only components with weight > 0 actually affect the merit score, and only
// those should be shown / required. Without this, universities with a 0%
// component (GIKI's FSc, UVAS's test) would force the user to fill in a
// meaningless field before they could see a result at all.
function getActiveFields(weights: MeritWeights, testFallbackLabel: string): ActiveField[] {
  const fields: ActiveField[] = [];
  if (weights.matric > 0) {
    fields.push({ key: "matric", label: weights.matricLabel, weight: weights.matric });
  }
  if (weights.fsc > 0) {
    fields.push({ key: "fsc", label: weights.fscLabel, weight: weights.fsc });
  }
  if (weights.test > 0) {
    fields.push({
      key: "test",
      label: weights.testLabel || testFallbackLabel,
      weight: weights.test,
      note: weights.testNote,
    });
  }
  return fields;
}

function parseNonNegativeNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function computePercent(marks: MarksState): number | null {
  const obtained = parseNonNegativeNumber(marks.obtained);
  const total = parseNonNegativeNumber(marks.total);
  if (obtained === null || total === null || total === 0) return null;
  if (obtained > total) return null;
  return (obtained / total) * 100;
}

function MarksField({
  id,
  label,
  weightPct,
  marks,
  onChange,
  note,
}: {
  id: string;
  label: string;
  weightPct: number;
  marks: MarksState;
  onChange: (marks: MarksState) => void;
  note?: string;
}) {
  const obtained = parseNonNegativeNumber(marks.obtained);
  const total = parseNonNegativeNumber(marks.total);
  const bothFilled = marks.obtained.trim() !== "" && marks.total.trim() !== "";
  const invalid = bothFilled && (obtained === null || total === null || total === 0 || obtained > total);
  const pct = computePercent(marks);
  const labelId = `${id}-label`;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span id={labelId} className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">Weighted {weightPct}%</span>
      </div>
      <div className="flex items-center gap-2" role="group" aria-labelledby={labelId}>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          placeholder="Obtained"
          aria-label={`${label} — obtained marks`}
          value={marks.obtained}
          onChange={(e) => onChange({ ...marks, obtained: e.target.value })}
          className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 transition ${invalid ? "border-rose-300 dark:border-rose-700 focus:ring-rose-400 dark:focus:ring-rose-600" : "border-slate-200 dark:border-slate-700 focus:ring-teal-400 dark:focus:ring-teal-600"}`}
        />
        <span className="text-slate-400 dark:text-slate-500 text-sm flex-shrink-0" aria-hidden="true">/</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          placeholder="Total"
          aria-label={`${label} — total marks`}
          value={marks.total}
          onChange={(e) => onChange({ ...marks, total: e.target.value })}
          className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 transition ${invalid ? "border-rose-300 dark:border-rose-700 focus:ring-rose-400 dark:focus:ring-rose-600" : "border-slate-200 dark:border-slate-700 focus:ring-teal-400 dark:focus:ring-teal-600"}`}
        />
      </div>
      {note && <p className="text-teal-600 dark:text-teal-400 text-[11px] mt-1">{note}</p>}
      {invalid ? (
        <p className="text-rose-500 dark:text-rose-400 text-[11px] mt-1">Obtained marks can&apos;t exceed total marks. Check your numbers.</p>
      ) : pct !== null ? (
        <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-1">= {pct.toFixed(2)}%</p>
      ) : (
        <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-1">Enter both fields</p>
      )}
    </div>
  );
}

// ============================================================================
// "Where this could get you in" -- projects the user's computed merit score
// against UET's and FAST's historical closing-merit data. UET and FAST have
// different underlying shapes (UET has A1/A2 fee category + session, FAST
// has neither), so each gets its own row-builder that normalizes down to
// this common OutlookRow shape for shared rendering.
// ============================================================================

interface OutlookRow {
  key: string;
  program: string;
  campus: string;
  // UET's session (Morning/Afternoon) where present; always null for FAST,
  // which has no such distinction.
  sublabel: string | null;
  pointCount: number;
  lastKnownPct: number;
  lastKnownYear: number;
  projectedCutoff: number;
  tier: Tier;
}

function buildUetOutlookRows(category: UetFeeCategory, meritScore: number): OutlookRow[] {
  const rows: OutlookRow[] = [];
  for (const o of UET_CLOSING_MERITS) {
    if (o.category !== category || o.history.length === 0) continue;
    const projectedCutoff = getProjectedCutoff(o.history);
    if (projectedCutoff === null) continue;
    const last = o.history[o.history.length - 1];
    rows.push({
      key: `${o.program}|${o.campus}|${o.category}|${o.session ?? ""}`,
      program: o.program,
      campus: o.campus,
      sublabel: o.session,
      pointCount: o.history.length,
      lastKnownPct: last.pct,
      lastKnownYear: last.year,
      projectedCutoff,
      tier: getTier(meritScore, projectedCutoff),
    });
  }
  return rows;
}

function buildFastOutlookRows(uniSlug: "fast" | "fast-engineering", meritScore: number): OutlookRow[] {
  const rows: OutlookRow[] = [];
  for (const o of FAST_CLOSING_MERITS) {
    if (o.universitySlug !== uniSlug || o.history.length === 0) continue;
    const projectedCutoff = getProjectedCutoff(o.history);
    if (projectedCutoff === null) continue;
    const last = o.history[o.history.length - 1];
    rows.push({
      key: `${o.program}|${o.campus}`,
      program: o.program,
      campus: o.campus,
      sublabel: null,
      pointCount: o.history.length,
      lastKnownPct: last.pct,
      lastKnownYear: last.year,
      projectedCutoff,
      tier: getTier(meritScore, projectedCutoff),
    });
  }
  return rows;
}

const TIER_ORDER: Tier[] = ["safe", "likely", "reach", "unlikely"];

const TIER_STYLES: Record<Tier, { border: string; bg: string; text: string }> = {
  safe: { border: "border-emerald-200 dark:border-emerald-800", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400" },
  likely: { border: "border-amber-200 dark:border-amber-800", bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-400" },
  reach: { border: "border-orange-200 dark:border-orange-800", bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-700 dark:text-orange-400" },
  unlikely: { border: "border-rose-200 dark:border-rose-800", bg: "bg-rose-50 dark:bg-rose-900/20", text: "text-rose-700 dark:text-rose-400" },
};

// Groups rows by tier, sorting each tier's rows by projected cutoff
// (descending) -- so within e.g. "Safe", the most competitive program the
// user comfortably clears surfaces first, not an arbitrary/alphabetical one.
function groupOutlookRows(rows: OutlookRow[]): Record<Tier, OutlookRow[]> {
  const buckets: Record<Tier, OutlookRow[]> = { safe: [], likely: [], reach: [], unlikely: [] };
  for (const row of rows) buckets[row.tier].push(row);
  for (const tier of TIER_ORDER) buckets[tier].sort((a, b) => b.projectedCutoff - a.projectedCutoff);
  return buckets;
}

function OutlookRowItem({ row }: { row: OutlookRow }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <p className="text-slate-800 dark:text-slate-200 text-sm font-medium truncate">{row.program}</p>
        <p className="text-slate-400 dark:text-slate-500 text-xs truncate">
          {row.campus}
          {row.sublabel ? ` \u00b7 ${row.sublabel}` : ""}
          {row.pointCount === 1 && " \u00b7 1yr data only"}
          {row.pointCount === 2 && " \u00b7 2yr data only"}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold">{row.projectedCutoff.toFixed(1)}%</p>
        <p className="text-slate-400 dark:text-slate-500 text-[10px]">proj. &middot; {row.lastKnownYear}: {row.lastKnownPct.toFixed(1)}%</p>
      </div>
    </div>
  );
}

function TierSection({ tier, rows }: { tier: Tier; rows: OutlookRow[] }) {
  const style = TIER_STYLES[tier];
  const { label, emoji } = TIER_LABELS[tier];
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span aria-hidden="true">{emoji}</span>
        <h3 className={`text-sm font-bold ${style.text}`}>{label}</h3>
        <span className="text-slate-400 dark:text-slate-500 text-xs">({rows.length})</span>
      </div>
      <div className={`rounded-xl border ${style.border} ${style.bg} divide-y divide-black/5 dark:divide-white/5 overflow-hidden`}>
        {rows.map((row) => (
          <OutlookRowItem key={row.key} row={row} />
        ))}
      </div>
    </div>
  );
}

// Renders only for universities with a closing-merit dataset (UET, FAST,
// FAST-Engineering) and only once a merit score exists to project against.
function ClosingMeritOutlook({ uni, meritScore }: { uni: University; meritScore: number }) {
  const [category, setCategory] = useState<UetFeeCategory>("A1");
  const [showUnlikely, setShowUnlikely] = useState(false);

  const isUet = uni.slug === "uet";
  const isFast = uni.slug === "fast" || uni.slug === "fast-engineering";

  const rows = useMemo(() => {
    if (isUet) return buildUetOutlookRows(category, meritScore);
    if (isFast) return buildFastOutlookRows(uni.slug as "fast" | "fast-engineering", meritScore);
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUet, isFast, uni.slug, category, meritScore]);

  const buckets = useMemo(() => groupOutlookRows(rows), [rows]);

  if (!isUet && !isFast) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Where this could get you in
        </h2>
        {isUet && (
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-semibold" role="group" aria-label="Fee category">
            {(["A1", "A2"] as UetFeeCategory[]).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`px-3 py-1.5 transition-colors ${category === c ? "bg-teal-600 dark:bg-teal-500 text-white" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-4 py-3 mb-5">
        <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
          {isUet
            ? "Based on 4 years (2022\u20132025) of UET's official closing-merit data. Projected cutoffs use each program's historical trend, not last year's raw number, so a rising program looks harder than its stale figure would suggest."
            : "Based on only 2 years (2025\u20132026) of FAST closing-merit data from a third-party source, not FAST's official portal. With just one year-over-year data point per program, these projections are a much weaker signal than UET's \u2014 treat them as a rough guide, not a forecast."}{" "}
          This estimates open merit only and ignores domicile quotas or reserved seats.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-slate-400 dark:text-slate-500 text-sm">No closing-merit data available for this selection.</p>
      ) : (
        <div className="space-y-6">
          {TIER_ORDER.filter((t) => t !== "unlikely").map(
            (tier) => buckets[tier].length > 0 && <TierSection key={tier} tier={tier} rows={buckets[tier]} />
          )}

          {buckets.unlikely.length > 0 && (
            <div>
              <button
                onClick={() => setShowUnlikely((v) => !v)}
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:underline"
              >
                {showUnlikely ? "Hide" : "Show"} {buckets.unlikely.length} unlikely {buckets.unlikely.length === 1 ? "option" : "options"}
              </button>
              {showUnlikely && (
                <div className="mt-3">
                  <TierSection tier="unlikely" rows={buckets.unlikely} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Only pre-fill the test's total when we actually have a real, positive
// question count. Universities with no test (totalQuestions: 0) or an
// unresearched count (totalQuestions: null) must NOT be seeded here --
// String(0) and String(null) both produce a value that silently makes
// this field permanently invalid before the user has typed anything.
function seedTestMarks(uni: University | undefined): MarksState {
  const seedTotal = uni?.totalQuestions && uni.totalQuestions > 0 ? String(uni.totalQuestions) : "";
  return { obtained: "", total: seedTotal };
}

// Compare-all mode asks for a single normalized "test performance %" rather
// than obtained/total marks, because every university runs its own,
// differently-scaled test (ECAT vs NU Test vs NTS vs MDCAT) -- there's no
// single real test score that would apply across all of them. This is a
// deliberate approximation (documented to the user), not an oversight.
function PctField({
  id,
  label,
  value,
  onChange,
  helpText,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  helpText: string;
}) {
  const parsed = parseNonNegativeNumber(value);
  const invalid = value.trim() !== "" && (parsed === null || parsed > 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span id={`${id}-label`} className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <div className="flex items-center">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step="any"
          placeholder="0\u2013100"
          aria-labelledby={`${id}-label`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 transition ${invalid ? "border-rose-300 dark:border-rose-700 focus:ring-rose-400 dark:focus:ring-rose-600" : "border-slate-200 dark:border-slate-700 focus:ring-teal-400 dark:focus:ring-teal-600"}`}
        />
        <span className="text-slate-400 dark:text-slate-500 text-sm ml-2 flex-shrink-0" aria-hidden="true">%</span>
      </div>
      {invalid ? (
        <p className="text-rose-500 dark:text-rose-400 text-[11px] mt-1">Enter a percentage between 0 and 100.</p>
      ) : (
        <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-1">{helpText}</p>
      )}
    </div>
  );
}

// ============================================================================
// "Compare across every university" -- the same Matric/FSc marks apply
// everywhere (those are already fixed by the time someone's using this), but
// there's no single real "test score" that applies everywhere, since every
// university runs its own test on its own scale. So this mode asks for a
// normalized test-performance % instead and applies it uniformly -- an
// explicit approximation, not a claim that e.g. 70% on UET's ECAT and 70% on
// FAST's NU Test mean the same thing.
// ============================================================================

interface CompareRow {
  uni: University;
  score: number | null;
  hasTest: boolean;
}

function computeCompareScore(weights: MeritWeights, matricPct: number | null, fscPct: number | null, testPct: number | null): number | null {
  let score = 0;
  if (weights.matric > 0) {
    if (matricPct === null) return null;
    score += matricPct * weights.matric;
  }
  if (weights.fsc > 0) {
    if (fscPct === null) return null;
    score += fscPct * weights.fsc;
  }
  if (weights.test > 0) {
    if (testPct === null) return null;
    score += testPct * weights.test;
  }
  return score;
}

type CompareSort = "score" | "alpha";

// Rolls a full program-by-program tier breakdown up into a single "X
// programs Safe/Likely" count for the compact compare-all row -- the full
// per-program detail is one click away via the existing single-university
// flow, not duplicated here.
function summarizeTiers(rows: { tier: Tier }[]): { comfortable: number; total: number } {
  const comfortable = rows.filter((r) => r.tier === "safe" || r.tier === "likely").length;
  return { comfortable, total: rows.length };
}

function CompareAllUniversities({ onViewUniversity }: { onViewUniversity: (slug: string) => void }) {
  const [matricMarks, setMatricMarks] = useState<MarksState>(EMPTY_MARKS);
  const [fscMarks, setFscMarks] = useState<MarksState>(EMPTY_MARKS);
  const [testPctInput, setTestPctInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "All">("All");
  const [sortBy, setSortBy] = useState<CompareSort>("score");

  const matricPct = computePercent(matricMarks);
  const fscPct = computePercent(fscMarks);
  const rawTestPct = parseNonNegativeNumber(testPctInput);
  const testPct = rawTestPct !== null && rawTestPct <= 100 ? rawTestPct : null;

  const verifiedUnis = useMemo(() => UNIVERSITIES.filter((u) => u.meritWeights !== null), []);
  const unverifiedUnis = useMemo(() => UNIVERSITIES.filter((u) => u.meritWeights === null), []);

  const rows: CompareRow[] = useMemo(() => {
    const filtered = categoryFilter === "All" ? verifiedUnis : verifiedUnis.filter((u) => u.category === categoryFilter);
    return filtered.map((uni) => ({
      uni,
      score: computeCompareScore(uni.meritWeights!, matricPct, fscPct, testPct),
      hasTest: uni.meritWeights!.test > 0,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifiedUnis, categoryFilter, matricPct, fscPct, testPct]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    if (sortBy === "alpha") {
      copy.sort((a, b) => a.uni.name.localeCompare(b.uni.name));
    } else {
      // Highest computed score first; rows still missing input sink to the
      // bottom rather than being sorted arbitrarily among themselves.
      copy.sort((a, b) => {
        if (a.score === null && b.score === null) return a.uni.name.localeCompare(b.uni.name);
        if (a.score === null) return 1;
        if (b.score === null) return -1;
        return b.score - a.score;
      });
    }
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortBy]);

  const filteredUnverified = categoryFilter === "All" ? unverifiedUnis : unverifiedUnis.filter((u) => u.category === categoryFilter);

  return (
    <div className="mb-14">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-4">Your marks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <MarksField id="compare-matric" label="Matric / SSC" weightPct={0} marks={matricMarks} onChange={setMatricMarks} />
          <MarksField id="compare-fsc" label="FSc / HSSC" weightPct={0} marks={fscMarks} onChange={setFscMarks} />
          <PctField
            id="compare-test"
            label="Entry test performance"
            value={testPctInput}
            onChange={setTestPctInput}
            helpText="Applied uniformly across every test (ECAT, NU Test, NTS, MDCAT...) since they're on different scales \u2014 treat this as a what-if, not a real score."
          />
        </div>
        <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-4">
          Universities with no entry test component (e.g. UVAS) ignore the test field entirely \u2014 their score is fixed by Matric/FSc alone.
        </p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {(["All", ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              aria-pressed={categoryFilter === c}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${categoryFilter === c ? "bg-teal-600 dark:bg-teal-500 text-white border-teal-600 dark:border-teal-500" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-semibold" role="group" aria-label="Sort by">
          {([["score", "Best fit"], ["alpha", "A\u2013Z"]] as [CompareSort, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              aria-pressed={sortBy === key}
              className={`px-3 py-1.5 transition-colors ${sortBy === key ? "bg-teal-600 dark:bg-teal-500 text-white" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {sortedRows.map(({ uni, score, hasTest }) => {
          const isUet = uni.slug === "uet";
          const isFast = uni.slug === "fast" || uni.slug === "fast-engineering";
          let tierSummary: { comfortable: number; total: number } | null = null;
          if (score !== null && isUet) tierSummary = summarizeTiers(buildUetOutlookRows("A1", score));
          if (score !== null && isFast) tierSummary = summarizeTiers(buildFastOutlookRows(uni.slug as "fast" | "fast-engineering", score));

          return (
            <button
              key={uni.slug}
              onClick={() => onViewUniversity(uni.slug)}
              className="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-teal-300 dark:hover:border-teal-700 transition-colors flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{uni.name}</span>
                  <ConfidenceBadge confidence={uni.formulaConfidence} />
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-xs">
                  {uni.category} &middot; {hasTest ? uni.test : "No entry test"} &middot; min. {uni.minAggregate}
                </p>
                {tierSummary && tierSummary.total > 0 && (
                  <p className="text-teal-600 dark:text-teal-400 text-[11px] mt-1 font-medium">
                    {tierSummary.comfortable} of {tierSummary.total} programs Safe/Likely{isUet ? " (A1)" : ""} &mdash; see full breakdown &rarr;
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                {score !== null ? (
                  <p className="font-display text-xl font-bold text-teal-700 dark:text-teal-400">{score.toFixed(1)}%</p>
                ) : (
                  <p className="text-slate-300 dark:text-slate-600 text-xs">Enter marks</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {filteredUnverified.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">
            Formula not yet verified ({filteredUnverified.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredUnverified.map((uni) => (
              <Link
                key={uni.slug}
                href={`/universities/${uni.slug}`}
                className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-4 py-3 no-underline hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">{uni.name}</p>
                <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5">Check the official site directly &rarr;</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeritCalculatorClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-select from ?university=<slug> if present and valid (e.g. arriving
  // via the "Calculate your merit" link on a university's detail page).
  // Falls back to no selection for a bare /merit-calculator visit or an
  // unrecognized slug -- never silently selects something the link didn't ask for.
  const initialSlugParam = searchParams.get("university");
  const initialSlug = UNIVERSITIES.some((u) => u.slug === initialSlugParam) ? initialSlugParam : null;

  const initialModeParam = searchParams.get("mode");
  const [mode, setMode] = useState<"single" | "compare">(initialModeParam === "compare" ? "compare" : "single");

  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialSlug);
  const [matricMarks, setMatricMarks] = useState<MarksState>(EMPTY_MARKS);
  const [fscMarks, setFscMarks] = useState<MarksState>(EMPTY_MARKS);
  const [testMarks, setTestMarks] = useState<MarksState>(
    initialSlug ? seedTestMarks(UNIVERSITIES.find((u) => u.slug === initialSlug)) : EMPTY_MARKS
  );

  const selectedUni: University | undefined = useMemo(() => UNIVERSITIES.find((u) => u.slug === selectedSlug), [selectedSlug]);

  const activeFields = useMemo(() => {
    if (!selectedUni?.meritWeights) return [];
    return getActiveFields(selectedUni.meritWeights, selectedUni.test);
  }, [selectedUni]);

  function selectUniversity(slug: string) {
    setSelectedSlug(slug);
    setMatricMarks(EMPTY_MARKS);
    setFscMarks(EMPTY_MARKS);
    const uni = UNIVERSITIES.find((u) => u.slug === slug);
    setTestMarks(seedTestMarks(uni));
    // Keep the URL in sync so the current selection is shareable/bookmarkable --
    // shallow, no scroll jump, no full navigation/remount.
    router.replace(`/merit-calculator?university=${encodeURIComponent(slug)}`, { scroll: false });
  }

  function switchMode(next: "single" | "compare") {
    setMode(next);
    if (next === "compare") {
      router.replace("/merit-calculator?mode=compare", { scroll: false });
    } else {
      router.replace(selectedSlug ? `/merit-calculator?university=${encodeURIComponent(selectedSlug)}` : "/merit-calculator", { scroll: false });
    }
  }

  // Handoff from a compare-all row into the existing single-university flow,
  // which has its own real per-university input shape (actual test question
  // counts etc.) -- deliberately not trying to carry the compare-mode's
  // normalized test % over, since that was always an approximation.
  function viewUniversityFromCompare(slug: string) {
    selectUniversity(slug);
    setMode("single");
  }

  const matricPct = computePercent(matricMarks);
  const fscPct = computePercent(fscMarks);
  const testPct = computePercent(testMarks);

  const pctByKey: Record<FieldKey, number | null> = { matric: matricPct, fsc: fscPct, test: testPct };
  const marksByKey: Record<FieldKey, MarksState> = { matric: matricMarks, fsc: fscMarks, test: testMarks };
  const setterByKey: Record<FieldKey, (m: MarksState) => void> = { matric: setMatricMarks, fsc: setFscMarks, test: setTestMarks };

  const meritScore = useMemo(() => {
    if (!selectedUni?.meritWeights || activeFields.length === 0) return null;
    let score = 0;
    for (const field of activeFields) {
      const pct = pctByKey[field.key];
      if (pct === null) return null;
      score += pct * field.weight;
    }
    return score;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUni, activeFields, matricPct, fscPct, testPct]);

  const gridColsClass = activeFields.length === 1 ? "sm:grid-cols-1" : activeFields.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3";

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-16 animate-fade-up">

      <div className="mb-6 text-center">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-3">Admission Planning</span>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-3">Merit Calculator</h1>
        <p className="text-slate-500 dark:text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">Enter your obtained and total marks &mdash; we&apos;ll work out the percentages and apply each university&apos;s official weighting for you.</p>
      </div>

      <div className="mb-10 max-w-2xl mx-auto bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-center">
        <p className="text-amber-700 dark:text-amber-400 text-xs leading-relaxed">This estimates the open-merit aggregate only. It doesn&apos;t account for domicile quotas, reserved seats, or year-to-year changes in the cutoff &mdash; confirm your result against the official university website before making decisions.</p>
      </div>

      <div className="flex justify-center mb-10">
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-sm font-semibold" role="group" aria-label="Calculator mode">
          <button
            onClick={() => switchMode("single")}
            aria-pressed={mode === "single"}
            className={`px-5 py-2.5 transition-colors ${mode === "single" ? "bg-teal-600 dark:bg-teal-500 text-white" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            One university
          </button>
          <button
            onClick={() => switchMode("compare")}
            aria-pressed={mode === "compare"}
            className={`px-5 py-2.5 transition-colors ${mode === "compare" ? "bg-teal-600 dark:bg-teal-500 text-white" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            Compare all universities
          </button>
        </div>
      </div>

      {mode === "compare" && <CompareAllUniversities onViewUniversity={viewUniversityFromCompare} />}

      {mode === "single" && (
      <>
      <div className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">1. Choose your university</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {UNIVERSITIES.map((u) => {
            const isSelected = u.slug === selectedSlug;
            return (
              <div
                key={u.slug}
                className={`rounded-2xl border overflow-hidden transition-all ${isSelected ? "bg-teal-50 dark:bg-teal-900/20 border-teal-400 dark:border-teal-600 ring-1 ring-teal-400 dark:ring-teal-600" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700"}`}
              >
                <button onClick={() => selectUniversity(u.slug)} aria-pressed={isSelected} className="w-full text-left p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{u.name}</h3>
                    <ConfidenceBadge confidence={u.formulaConfidence} />
                  </div>
                  <p className="text-slate-400 dark:text-slate-500 text-xs">{u.test} &middot; {u.city}</p>
                </button>
                <div className="px-4 pb-3 -mt-1">
                  <Link href={`/universities/${u.slug}`} className="text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:underline no-underline">
                    Full admission profile &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedUni && (
        <div className="mb-14">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">2. Enter your marks</h2>

          {!selectedUni.meritWeights ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center">
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                We haven&apos;t been able to verify an official merit formula for <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedUni.name}</span> yet, so we won&apos;t guess one here. Please check{" "}
                <a href={selectedUni.website} target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline">{selectedUni.website.replace("https://", "")}</a>{" "}
                directly for the current admission criteria.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <div className={`grid grid-cols-1 ${gridColsClass} gap-5 mb-6`}>
                {activeFields.map((field) => (
                  <MarksField
                    key={field.key}
                    id={`${selectedUni.slug}-${field.key}`}
                    label={field.label}
                    weightPct={Math.round(field.weight * 100)}
                    marks={marksByKey[field.key]}
                    onChange={setterByKey[field.key]}
                    note={field.note}
                  />
                ))}
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-5 text-center" aria-live="polite">
                {meritScore !== null ? (
                  <>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Estimated merit score</p>
                    <p className="font-display text-4xl font-bold text-teal-700 dark:text-teal-400">{meritScore.toFixed(2)}%</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-2">Min. aggregate cited by {selectedUni.name}: {selectedUni.minAggregate}</p>
                    {selectedUni.formulaConfidence === "low" && (
                      <p className="text-amber-600 dark:text-amber-400 text-xs mt-3">This formula has only one supporting source so far &mdash; confirm against the official prospectus before making decisions based on it.</p>
                    )}
                    {selectedUni.formulaConfidence === "medium" && (
                      <p className="text-amber-600 dark:text-amber-400 text-xs mt-3">This formula is reasonably well-supported but not 100% confirmed &mdash; double-check against the current official prospectus.</p>
                    )}
                  </>
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 text-sm">Enter obtained and total marks above to see your estimated merit.</p>
                )}
              </div>

              {meritScore !== null && <ClosingMeritOutlook uni={selectedUni} meritScore={meritScore} />}
            </div>
          )}
        </div>
      )}
      </>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 dark:from-teal-700 dark:to-teal-800 p-8 text-center">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">Improve your test score with PrepXMentor</h2>
        <p className="text-teal-100 text-sm max-w-lg mx-auto mb-6">Bilingual AI explanations and human-reviewed MCQ practice &mdash; the biggest lever in most merit formulas.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-teal-700 font-semibold text-sm hover:bg-teal-50 transition-colors no-underline">Start free trial</Link>
          <Link href="/universities" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-teal-500/30 text-white font-semibold text-sm hover:bg-teal-500/50 transition-colors no-underline border border-teal-400/40">Browse universities</Link>
        </div>
      </div>
    </div>
  );
}