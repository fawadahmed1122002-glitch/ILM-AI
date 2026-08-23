"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { authStorage } from "@/lib/auth";

interface ResultQuestion {
  mcq_id: string;
  question_order: number;
  subject: string;
  chapter_number: number;
  topic: string | null;
  difficulty: string;
  question_text: string;
  question_text_ur: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  selected_option: string | null;
  is_correct: boolean | null;
}

interface ResultsResponse {
  id: string;
  test_type: string;
  subject: string | null;
  question_count: number;
  score: number | null;
  correct_count: number | null;
  status: string;
  started_at: string;
  submitted_at: string | null;
  questions: ResultQuestion[];
}

const OPTIONS = ["A", "B", "C", "D"] as const;
type Option = (typeof OPTIONS)[number];

function getOptionText(q: ResultQuestion, opt: Option) {
  return { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }[opt];
}

function testTypeLabel(t: string) {
  return { subject: "Single Subject", full_ecat: "Full ECAT Test", full_mdcat: "Full MDCAT Test" }[t] || t;
}

export default function MockTestResultsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;

  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "incorrect" | "unanswered">("all");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const fetchResults = async () => {
      setResultsLoading(true);
      setError("");
      try {
        const token = authStorage.getToken();
        const data = await api.get<ResultsResponse>(`/mock-tests/${testId}/results`, token || undefined);
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load results");
      } finally {
        setResultsLoading(false);
      }
    };
    fetchResults();
  }, [user, testId]);

  if (loading || resultsLoading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) return null;

  if (error || !results) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-xl">
          {error || "Results not found"}
        </div>
      </div>
    );
  }

  if (results.status !== "completed") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">This test hasn&apos;t been submitted yet.</p>
        <button
          onClick={() => router.push(`/mock-test/${testId}/take`)}
          className="px-6 py-2.5 bg-teal-700 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Resume Test
        </button>
      </div>
    );
  }

  const score = results.score ?? 0;
  const correctCount = results.correct_count ?? 0;
  const unansweredCount = results.questions.filter((q) => q.selected_option === null).length;
  const incorrectCount = results.question_count - correctCount - unansweredCount;

  const filteredQuestions = results.questions.filter((q) => {
    if (filter === "incorrect") return q.selected_option !== null && !q.is_correct;
    if (filter === "unanswered") return q.selected_option === null;
    return true;
  });

  const scoreColor =
    score >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : score >= 50
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6">
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
          {testTypeLabel(results.test_type)}
          {results.subject ? ` — ${results.subject}` : ""}
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Results
        </h1>
      </div>

      {/* Score summary card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 mb-6 text-center">
        <p className={`font-display text-5xl font-bold tracking-tight ${scoreColor}`}>{score}%</p>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
          {correctCount} of {results.question_count} correct
        </p>
        <div className="flex justify-center gap-6 mt-5 text-xs">
          <div>
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">{correctCount}</p>
            <p className="text-slate-400 dark:text-slate-500">Correct</p>
          </div>
          <div>
            <p className="font-semibold text-red-600 dark:text-red-400">{incorrectCount}</p>
            <p className="text-slate-400 dark:text-slate-500">Incorrect</p>
          </div>
          <div>
            <p className="font-semibold text-slate-500 dark:text-slate-400">{unansweredCount}</p>
            <p className="text-slate-400 dark:text-slate-500">Unanswered</p>
          </div>
        </div>
        <button
          onClick={() => router.push("/mock-test")}
          className="mt-6 px-6 py-2.5 bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Take Another Test
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(
          [
            { key: "all", label: `All (${results.question_count})` },
            { key: "incorrect", label: `Incorrect (${incorrectCount})` },
            { key: "unanswered", label: `Unanswered (${unansweredCount})` },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-teal-700 dark:bg-teal-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Question review */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 && (
          <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <p className="text-slate-500 dark:text-slate-400 text-sm">Nothing to show here.</p>
          </div>
        )}

        {filteredQuestions.map((q) => (
          <div
            key={q.mcq_id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                Q{q.question_order + 1} · {q.subject} · Ch.{q.chapter_number}
              </span>
              {q.selected_option === null ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                  Unanswered
                </span>
              ) : q.is_correct ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                  Correct
                </span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
                  Incorrect
                </span>
              )}
            </div>

            <p className="text-slate-900 dark:text-slate-100 font-medium text-sm mb-1">{q.question_text}</p>
            {q.question_text_ur && (
              <p className="font-urdu text-slate-500 dark:text-slate-400 text-sm leading-loose text-right mb-4" dir="rtl">
                {q.question_text_ur}
              </p>
            )}

            <div className="space-y-1.5 mb-4">
              {OPTIONS.map((opt) => {
                const isCorrectOpt = q.correct_option === opt;
                const isSelectedOpt = q.selected_option === opt;
                let cls =
                  "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border border-transparent";
                if (isCorrectOpt) {
                  cls =
                    "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-medium";
                } else if (isSelectedOpt && !isCorrectOpt) {
                  cls =
                    "bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300";
                }
                return (
                  <div key={opt} className={`px-3 py-2 rounded-lg text-sm ${cls}`}>
                    <span className="font-semibold mr-2">{opt}.</span>
                    {getOptionText(q, opt)}
                    {isCorrectOpt && <span className="ml-2 text-xs">✓ correct answer</span>}
                    {isSelectedOpt && !isCorrectOpt && <span className="ml-2 text-xs">✗ your answer</span>}
                  </div>
                );
              })}
            </div>

            {q.explanation && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                <span className="font-medium">Explanation:</span> {q.explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}