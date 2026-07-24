"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UNIVERSITIES } from "../universities/data";
import type { University, MeritWeights, FormulaConfidence } from "../universities/data";

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

// Only pre-fill the test's total when we actually have a real, positive
// question count. Universities with no test (totalQuestions: 0) or an
// unresearched count (totalQuestions: null) must NOT be seeded here --
// String(0) and String(null) both produce a value that silently makes
// this field permanently invalid before the user has typed anything.
function seedTestMarks(uni: University | undefined): MarksState {
  const seedTotal = uni?.totalQuestions && uni.totalQuestions > 0 ? String(uni.totalQuestions) : "";
  return { obtained: "", total: seedTotal };
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