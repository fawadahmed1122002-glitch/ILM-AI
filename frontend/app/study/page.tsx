"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { authStorage } from "@/lib/auth";

const SUBJECTS = ["Biology", "Chemistry", "Physics", "Mathematics", "Computer Science"];

interface ExplainResponse {
  explanation: string;
  normalized_query: string;
  subject: string;
  cached: boolean;
}

interface McqItem {
  question_en: string;
  question_ur: string;
  opt_a: string;
  opt_b: string;
  opt_c: string;
  opt_d: string;
  correct: string;
  explanation_en: string;
  difficulty: string;
}

interface McqResponse {
  mcqs: McqItem[];
  subject: string;
  topic: string;
  count: number;
}

function parseExplanation(raw: string) {
  const sections: Record<string, string> = {};
  const patterns = [
    { key: "english", label: "ENGLISH" },
    { key: "urdu", label: "URDU" },
    { key: "keyPoint", label: "KEY EXAM POINT" },
    { key: "example", label: "REAL-LIFE EXAMPLE" },
  ];
  for (let i = 0; i < patterns.length; i++) {
    const start = raw.indexOf(`${patterns[i].label}:`);
    if (start === -1) continue;
    const contentStart = start + patterns[i].label.length + 1;
    const nextPattern = patterns[i + 1] ? raw.indexOf(`${patterns[i + 1].label}:`) : -1;
    const content = nextPattern !== -1 ? raw.slice(contentStart, nextPattern) : raw.slice(contentStart);
    sections[patterns[i].key] = content.trim();
  }
  return sections;
}

const OPTIONS = ["A", "B", "C", "D"] as const;
type Option = typeof OPTIONS[number];

function getOptionText(mcq: McqItem, opt: Option): string {
  return { A: mcq.opt_a, B: mcq.opt_b, C: mcq.opt_c, D: mcq.opt_d }[opt];
}

export default function StudyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Explain state
  const [subject, setSubject] = useState("Biology");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ExplainResponse | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState("");

  // MCQ state
  const [mcqs, setMcqs] = useState<McqItem[]>([]);
  const [mcqLoading, setMcqLoading] = useState(false);
  const [mcqError, setMcqError] = useState("");
  const [answers, setAnswers] = useState<Record<number, Option>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) return null;

  const handleExplain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setExplainError("");
    setResult(null);
    setMcqs([]);
    setAnswers({});
    setSubmitted(false);
    setExplainLoading(true);
    try {
      const token = authStorage.getToken();
      const data = await api.post<ExplainResponse>("/query/explain", { subject, query: query.trim() }, token || undefined);
      setResult(data);
    } catch (err: unknown) {
      setExplainError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setExplainLoading(false);
    }
  };

  const handleGetMcqs = async () => {
    if (!result) return;
    setMcqError("");
    setMcqs([]);
    setAnswers({});
    setSubmitted(false);
    setMcqLoading(true);
    try {
      const token = authStorage.getToken();
      const data = await api.post<McqResponse>("/query/mcqs", { subject, topic: result.normalized_query }, token || undefined);
      setMcqs(data.mcqs);
    } catch (err: unknown) {
      setMcqError(err instanceof Error ? err.message : "Failed to generate MCQs");
    } finally {
      setMcqLoading(false);
    }
  };

  const handleSubmitMcqs = async () => {
  const answersPayload = mcqs.map((mcq, i) => ({
    mcq_index: i,
    selected_option: answers[i] || "A",
    is_correct: answers[i] === mcq.correct,
    time_spent_ms: null,
  }));

  const correct = answersPayload.filter(a => a.is_correct).length;
  setScore(correct);
  setSubmitted(true);

  // Save to backend
  try {
    const token = authStorage.getToken();
    await api.post("/query/mcq/submit", {
      subject,
      topic: result?.normalized_query || query,
      answers: answersPayload,
    }, token || undefined);
  } catch (err) {
    console.error("Failed to save MCQ attempt:", err);
  }
};

  const sections = result ? parseExplanation(result.explanation) : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-up">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Study</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Ask any topic in English or Roman Urdu</p>
      </div>

      {/* Query Form */}
      <form onSubmit={handleExplain} className="space-y-4 mb-8">
        <div className="flex gap-2 flex-wrap">
          {SUBJECTS.map((s) => (
            <button key={s} type="button" onClick={() => setSubject(s)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                subject === s ? "bg-teal-700 dark:bg-teal-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={`Ask about ${subject}... (English ya Roman Urdu mein)`}
            maxLength={500}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors" />
          <button type="submit" disabled={explainLoading || !query.trim()}
            className="px-6 py-2.5 bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">
            {explainLoading ? "..." : "Ask"}
          </button>
        </div>
      </form>

      {/* Explain Error */}
      {explainError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-xl">{explainError}</div>
      )}

      {/* Loading */}
      {explainLoading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-3">Generating explanation...</p>
        </div>
      )}

      {/* Explanation Result */}
      {sections && !explainLoading && (
        <div className="space-y-4 mb-8">
          {sections.english && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">English</h3>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{sections.english}</p>
            </div>
          )}
          {sections.urdu && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">اردو</h3>
              <p className="font-urdu text-slate-700 dark:text-slate-300 text-sm text-right" dir="rtl">{sections.urdu}</p>
            </div>
          )}
          {sections.keyPoint && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">🎯 Key Exam Point</h3>
              <p className="text-amber-900 text-sm font-medium">{sections.keyPoint}</p>
            </div>
          )}
          {sections.example && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">💡 Real-Life Example</h3>
              <p className="text-blue-900 text-sm">{sections.example}</p>
            </div>
          )}

          {/* Practice MCQs Button */}
          <button onClick={handleGetMcqs} disabled={mcqLoading}
            className="w-full py-3 border-2 border-teal-600 dark:border-teal-500 text-teal-700 dark:text-teal-400 rounded-xl text-sm font-semibold hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {mcqLoading ? "Generating MCQs..." : "🧠 Practice MCQs on this topic"}
          </button>

          {mcqError && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{mcqError}</div>
          )}
        </div>
      )}

      {/* MCQ Quiz */}
      {mcqs.length > 0 && !mcqLoading && (
        <div className="space-y-6">
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            Practice MCQs — {result?.normalized_query}
          </h2>

          {mcqs.map((mcq, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              {/* Difficulty badge */}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                mcq.difficulty === "Easy" ? "bg-green-100 text-green-700" :
                mcq.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
              }`}>
                {mcq.difficulty}
              </span>

              {/* Question */}
              <p className="text-slate-900 dark:text-slate-100 font-medium text-sm mt-3 mb-1">{mcq.question_en}</p>
              <p className="font-urdu text-slate-500 dark:text-slate-400 text-sm text-right mb-4" dir="rtl">{mcq.question_ur}</p>

              {/* Options */}
              <div className="space-y-2">
                {OPTIONS.map((opt) => {
                  const isSelected = answers[i] === opt;
                  const isCorrect = mcq.correct === opt;
                  const showResult = submitted;

                  let optClass = "border border-gray-200 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50";
                  if (showResult && isCorrect) optClass = "border-2 border-emerald-500 bg-emerald-50 text-emerald-800";
                  else if (showResult && isSelected && !isCorrect) optClass = "border-2 border-red-400 bg-red-50 text-red-800";
                  else if (isSelected) optClass = "border-2 border-emerald-500 bg-emerald-50 text-emerald-800";

                  return (
                    <button key={opt} disabled={submitted}
                      onClick={() => setAnswers({ ...answers, [i]: opt })}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${optClass}`}>
                      <span className="font-semibold mr-2">{opt}.</span>
                      {getOptionText(mcq, opt)}
                    </button>
                  );
                })}
              </div>

              {/* Explanation (after submit) */}
              {submitted && (
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Explanation</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{mcq.explanation_en}</p>
                </div>
              )}
            </div>
          ))}

          {/* Submit / Score */}
          {!submitted ? (
            <button onClick={() => { handleSubmitMcqs(); }}
              disabled={Object.keys(answers).length < mcqs.length}
              className="w-full py-3 bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">
              Submit Answers ({Object.keys(answers).length}/{mcqs.length} answered)
            </button>
          ) : (
            <div className={`p-6 rounded-2xl text-center ${
              score === mcqs.length ? "bg-emerald-50 border border-emerald-200" :
              score >= mcqs.length / 2 ? "bg-yellow-50 border border-yellow-200" :
              "bg-red-50 border border-red-200"
            }`}>
              <p className="font-display text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{score}/{mcqs.length}</p>
              <p className="text-gray-600 text-sm mt-1">
                {score === mcqs.length ? "Perfect score! 🎉" :
                 score >= mcqs.length / 2 ? "Good work! Keep practicing 💪" :
                 "Need more practice 📚"}
              </p>
              <button onClick={() => { setMcqs([]); setAnswers({}); setSubmitted(false); }}
                className="mt-4 text-sm text-teal-600 dark:text-teal-400 hover:underline">
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}