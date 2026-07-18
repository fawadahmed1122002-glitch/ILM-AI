"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { UNIVERSITIES, University } from "../universities/data";

// Same confidence badge visual language used on /universities and the
// university detail pages -- kept local here since there's no shared
// components folder yet. Worth extracting later if a third page needs it.
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

// Parses a percentage input string. Returns null if empty or out of 0-100 range.
function parsePercent(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (Number.isNaN(n) || n < 0 || n > 100) return null;
  return n;
}

function PercentField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const parsed = parsePercent(value);
  const invalid = value.trim() !== "" && parsed === null;
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
        {label}
      </label>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={100}
        step={0.01}
        placeholder="0-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 transition
          ${invalid
            ? "border-rose-300 dark:border-rose-700 focus:ring-rose-400 dark:focus:ring-rose-600"
            : "border-slate-200 dark:border-slate-700 focus:ring-teal-400 dark:focus:ring-teal-600"
          }`}
      />
      {invalid ? (
        <p className="text-rose-500 dark:text-rose-400 text-[11px] mt-1">Enter a number between 0 and 100.</p>
      ) : hint ? (
        <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

export default function MeritCalculatorClient() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [matricInput, setMatricInput] = useState("");
  const [fscInput, setFscInput] = useState("");
  const [testInput, setTestInput] = useState("");

  const selectedUni: University | undefined = useMemo(
    () => UNIVERSITIES.find((u) => u.slug === selectedSlug),
    [selectedSlug]
  );

  function selectUniversity(slug: string) {
    setSelectedSlug(slug);
    setMatricInput("");
    setFscInput("");
    setTestInput("");
  }

  const matricPct = parsePercent(matricInput);
  const fscPct = parsePercent(fscInput);
  const testPct = parsePercent(testInput);

  const meritScore = useMemo(() => {
    if (!selectedUni?.meritWeights) return null;
    if (matricPct === null || fscPct === null || testPct === null) return null;
    const w = selectedUni.meritWeights;
    return matricPct * w.matric + fscPct * w.fsc + testPct * w.test;
  }, [selectedUni, matricPct, fscPct, testPct]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-16 animate-fade-up">

      {/* Header */}
      <div className="mb-6 text-center">
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-3">
          Admission Planning
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-3">
          Merit Calculator
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
          Estimate your aggregate merit score using each university's official formula.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="mb-10 max-w-2xl mx-auto bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-center">
        <p className="text-amber-700 dark:text-amber-400 text-xs leading-relaxed">
          This estimates the open-merit aggregate only. It doesn't account for domicile
          quotas, reserved seats, or year-to-year changes in the cutoff &mdash; confirm
          your result against the official university website before making decisions.
        </p>
      </div>

      {/* University selector */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">
          1. Choose your university
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {UNIVERSITIES.map((u) => {
            const isSelected = u.slug === selectedSlug;
            return (
              <button
                key={u.slug}
                onClick={() => selectUniversity(u.slug)}
                className={`text-left rounded-2xl border p-4 transition-all
                  ${isSelected
                    ? "bg-teal-50 dark:bg-teal-900/20 border-teal-400 dark:border-teal-600 ring-1 ring-teal-400 dark:ring-teal-600"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700"
                  }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {u.name}
                  </h3>
                  <ConfidenceBadge confidence={u.formulaConfidence} />
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-xs">{u.test} &middot; {u.city}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calculator */}
      {selectedUni && (
        <div className="mb-14">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">
            2. Enter your scores
          </p>

          {!selectedUni.meritWeights ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center">
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                We haven't been able to verify an official merit formula for{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedUni.name}</span> yet,
                so we won't guess one here. Please check{" "}
                <a
                  href={selectedUni.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 dark:text-teal-400 hover:underline"
                >
                  {selectedUni.website.replace("https://", "")}
                </a>{" "}
                directly for the current admission criteria.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <PercentField
                  label={`${selectedUni.meritWeights.matricLabel} %`}
                  hint={`Weighted ${Math.round(selectedUni.meritWeights.matric * 100)}%`}
                  value={matricInput}
                  onChange={setMatricInput}
                />
                <PercentField
                  label={`${selectedUni.meritWeights.fscLabel} %`}
                  hint={`Weighted ${Math.round(selectedUni.meritWeights.fsc * 100)}%`}
                  value={fscInput}
                  onChange={setFscInput}
                />
                <PercentField
                  label={`${selectedUni.test} %`}
                  hint={`Weighted ${Math.round(selectedUni.meritWeights.test * 100)}% \u00b7 score \u00f7 total marks \u00d7 100`}
                  value={testInput}
                  onChange={setTestInput}
                />
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-5 text-center">
                {meritScore !== null ? (
                  <>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                      Estimated merit score
                    </p>
                    <p className="font-display text-4xl font-bold text-teal-700 dark:text-teal-400">
                      {meritScore.toFixed(2)}%
                    </p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-2">
                      Min. aggregate cited by {selectedUni.name}: {selectedUni.minAggregate}
                    </p>
                    {selectedUni.formulaConfidence === "low" && (
                      <p className="text-amber-600 dark:text-amber-400 text-xs mt-3">
                        This formula has only one supporting source so far &mdash; confirm against the official prospectus before making decisions based on it.
                      </p>
                    )}
                    {selectedUni.formulaConfidence === "medium" && (
                      <p className="text-amber-600 dark:text-amber-400 text-xs mt-3">
                        This formula is reasonably well-supported but not 100% confirmed &mdash; double-check against the current official prospectus.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 text-sm">
                    Enter all three scores above to see your estimated merit.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 dark:from-teal-700 dark:to-teal-800 p-8 text-center">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">
          Improve your test score with PrepXMentor
        </h2>
        <p className="text-teal-100 text-sm max-w-lg mx-auto mb-6">
          Bilingual AI explanations and human-reviewed MCQ practice &mdash; the biggest
          lever in most merit formulas.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-teal-700 font-semibold text-sm hover:bg-teal-50 transition-colors no-underline"
          >
            Start free trial
          </Link>
          <Link
            href="/universities"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-teal-500/30 text-white font-semibold text-sm hover:bg-teal-500/50 transition-colors no-underline border border-teal-400/40"
          >
            Browse universities
          </Link>
        </div>
      </div>
    </div>
  );
}