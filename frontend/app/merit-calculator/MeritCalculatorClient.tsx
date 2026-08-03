"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { UNIVERSITIES, University, MeritWeights } from "../universities/data";
import {
  UET_CLOSING_MERITS,
  MeritCategory,
  ProgramOffering,
  getProjectedCutoff,
  getTrend,
  getTier,
  groupByProgram,
  TIER_LABELS,
} from "../universities/uet-closing-merits";

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const config: Record<string, { label: string; className: string }> = {
    high: { label: "Verified", className: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
    medium: { label: "Likely accurate", className: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
    low: { label: "Unconfirmed", className: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800" },
    unverified: { label: "Not verified", className: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700" },
  };
  const c = config[confidence] ?? config.unverified;
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

function TrendIndicator({ history }: { history: { year: number; pct: number }[] }) {
  if (history.length < 2) {
    return <span className="text-slate-400 dark:text-slate-500">only {history[0]?.year} on record</span>;
  }
  const trend = getTrend(history);
  const years = `${history[0].year}\u2013${history[history.length - 1].year}`;
  if (Math.abs(trend) < 0.3) {
    return <span className="text-slate-400 dark:text-slate-500">steady across {years}</span>;
  }
  if (trend > 0) {
    return <span className="text-rose-500 dark:text-rose-400">\u25B2 rising ~{trend.toFixed(1)}pt/yr ({years})</span>;
  }
  return <span className="text-emerald-600 dark:text-emerald-400">\u25BC falling ~{Math.abs(trend).toFixed(1)}pt/yr ({years})</span>;
}

function ProgramMatchCard({ program, offerings, userScore }: { program: string; offerings: ProgramOffering[]; userScore: number }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
      <h4 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">{program}</h4>
      <div className="space-y-2">
        {offerings.map((o, i) => {
          const projected = getProjectedCutoff(o.history);
          if (projected === null) return null;
          const tier = getTier(userScore, projected);
          const tierInfo = TIER_LABELS[tier];
          const latest = o.history[o.history.length - 1];
          return (
            <div key={i} className="flex items-center justify-between gap-3 text-xs py-1.5 border-t border-slate-100 dark:border-slate-800 first:border-t-0 first:pt-0">
              <div className="min-w-0">
                <p className="text-slate-700 dark:text-slate-300 font-medium truncate">
                  {o.campus}{o.session ? ` \u00b7 ${o.session}` : ""}
                </p>
                <p className="text-slate-400 dark:text-slate-500 mt-0.5">
                  <TrendIndicator history={o.history} /> &middot; {latest.year}: {latest.pct.toFixed(1)}%
                </p>
              </div>
              <span className={`flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full whitespace-nowrap ${
                tier === "safe" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" :
                tier === "likely" ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" :
                tier === "reach" ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400" :
                "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
              }`}>
                {tierInfo.emoji} {tierInfo.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Only rendered for UET (the only university we have real historical
// closing-merit data for). Groups the flat offering list by program, ranks
// programs by their single best (highest-margin) offering so the most
// achievable options surface first, and compares the user's score against
// each offering's *projected* next-cycle cutoff rather than a stale raw
// number -- see getProjectedCutoff in uet-closing-merits.ts.
function ProgramMatches({ userScore, category }: { userScore: number; category: MeritCategory }) {
  const grouped = useMemo(() => {
    const filtered = UET_CLOSING_MERITS.filter((o) => o.category === category);
    const byProgram = groupByProgram(filtered);
    const entries = Array.from(byProgram.entries());
    entries.sort(([, offeringsA], [, offeringsB]) => {
      const bestMargin = (offerings: ProgramOffering[]) =>
        Math.max(
          ...offerings.map((o) => {
            const projected = getProjectedCutoff(o.history);
            return projected === null ? -Infinity : userScore - projected;
          })
        );
      return bestMargin(offeringsB) - bestMargin(offeringsA);
    });
    return entries;
  }, [category, userScore]);

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {grouped.map(([program, offerings]) => (
          <ProgramMatchCard key={program} program={program} offerings={offerings} userScore={userScore} />
        ))}
      </div>
    </div>
  );
}

export default function MeritCalculatorClient() {
  const searchParams = useSearchParams();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [matricMarks, setMatricMarks] = useState<MarksState>(EMPTY_MARKS);
  const [fscMarks, setFscMarks] = useState<MarksState>(EMPTY_MARKS);
  const [testMarks, setTestMarks] = useState<MarksState>(EMPTY_MARKS);
  const [meritCategory, setMeritCategory] = useState<MeritCategory>("A1");

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
    // Only pre-fill the test's total when we actually have a real, positive
    // question count. Universities with no test (totalQuestions: 0) or an
    // unresearched count (totalQuestions: null) must NOT be seeded here --
    // String(0) and String(null) both produce a value that silently makes
    // this field permanently invalid before the user has typed anything.
    const seedTotal = uni?.totalQuestions && uni.totalQuestions > 0 ? String(uni.totalQuestions) : "";
    setTestMarks({ obtained: "", total: seedTotal });
  }

  const matricPct = computePercent(matricMarks);
  const fscPct = computePercent(fscMarks);
  const testPct = computePercent(testMarks);

  // Supports deep-linking from a university detail page's
  // "Calculate my merit for X" button (?university=slug). Only runs once on
  // load -- after that, the university picker below is the source of truth,
  // so we don't fight the user if they pick something else.
  useEffect(() => {
    const param = searchParams.get("university");
    if (param && UNIVERSITIES.some((u) => u.slug === param)) {
      selectUniversity(param);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

              {selectedUni.slug === "uet" && meritScore !== null && (
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Where this could get you in</h3>
                    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 flex-shrink-0">
                      {(["A1", "A2"] as MeritCategory[]).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setMeritCategory(cat)}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${meritCategory === cat ? "bg-teal-600 text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-400 dark:text-slate-500 text-[11px] mb-1">
                    {meritCategory === "A1" ? "Punjab-domicile, subsidized (lower fee) merit category." : "Punjab-domicile, higher-fee merit category."}
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 text-[11px] mb-4">
                    Based on UET&apos;s last 4 years of published closing merit (2022&ndash;2025) per program and campus. Tiers compare your score against a projected next-cycle cutoff, not last year&apos;s raw number, so a rapidly rising program shows up as harder than its old figure alone would suggest. This is directional, not a guarantee &mdash; confirm against UET&apos;s official merit list before making decisions.
                  </p>
                  <ProgramMatches userScore={meritScore} category={meritCategory} />
                </div>
              )}
            </div>
          )}
        </div>
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