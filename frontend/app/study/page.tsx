"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import { authStorage } from "@/lib/auth";
import { subjectsForField } from "@/lib/academicFields";
import StudyChatDrawer from "@/components/StudyChatDrawer";

interface ExplainResponse {
  explanation: string;
  normalized_query: string;
  subject: string;
  cached: boolean;
}

interface McqItem {
  id?: string; // bank MCQ id; absent for live-generated sets
  question_en: string;
  question_ur: string;
  opt_a: string;
  opt_b: string;
  opt_c: string;
  opt_d: string;
  // No longer served by the fetch endpoint (answers are withheld until
  // submission); kept only because the submit payload still references
  // them as a fallback field for live-generated sets.
  correct?: string;
  explanation_en?: string;
  difficulty: string;
}

interface McqResponse {
  mcqs: McqItem[];
  subject: string;
  topic: string;
  count: number;
}

// Per-question grading feedback returned by POST /query/mcq/submit --
// the single source of truth for post-submit highlighting/explanations.
interface McqGradedQuestion {
  mcq_index: number;
  is_correct: boolean;
  correct_option: string | null;
  explanation_en: string | null;
}

interface McqSubmitResponse {
  total: number;
  correct: number;
  score_percent: number;
  weak_topic: boolean;
  questions: McqGradedQuestion[];
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
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // Subjects available to this student, filtered by their registered
  // academic field / explicit subject selection (falls back to the full
  // subject list if neither is set).
  const SUBJECTS = subjectsForField(user?.field, user?.subjects);

  // Explain state
  const [subject, setSubject] = useState(SUBJECTS[0] || "Biology");
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
  // Server grading results from the submit response, keyed lookup by
  // mcq_index -- drives highlighting + explanations after submission.
  const [gradedQuestions, setGradedQuestions] = useState<McqGradedQuestion[] | null>(null);

  // Study Chat drawer state
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // Honor ?subject= deep links (e.g. dashboard "Your Subjects" cards) --
  // only accepted when the value is one of this student's visible
  // subjects; anything else silently falls back to the default subject.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("subject");
    if (param && SUBJECTS.includes(param)) setSubject(param);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setGradedQuestions(null);
    setChatOpen(false);
    setExplainLoading(true);
    try {
      const token = authStorage.getToken();
      const data = await api.post<ExplainResponse>("/query/explain", { subject, query: query.trim() }, token || undefined);
      setResult(data);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === "EXPLAIN_LIMIT_REACHED") {
        setExplainError("LIMIT_REACHED");
      } else if (err instanceof ApiError && err.status === 401) {
        // Session expired or invalid mid-use -- clean logout + redirect
        // instead of showing the raw "Invalid or expired token" error text.
        logout();
        router.push("/login?reason=session_expired");
      } else {
        setExplainError(err instanceof Error ? err.message : "Something went wrong");
      }
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
    setGradedQuestions(null);
    setMcqLoading(true);
    try {
      const token = authStorage.getToken();
      const data = await api.post<McqResponse>("/query/mcqs", { subject, topic: result.normalized_query }, token || undefined);
      setMcqs(data.mcqs);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === "MCQ_LIMIT_REACHED") {
        setMcqError("LIMIT_REACHED");
      } else if (err instanceof ApiError && err.status === 401) {
        logout();
        router.push("/login?reason=session_expired");
      } else {
        setMcqError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setMcqLoading(false);
    }
  };

  const handleSubmitMcqs = async () => {
    const answersPayload = mcqs.map((mcq, i) => ({
      mcq_index: i,
      mcq_id: mcq.id ?? null,
      selected_option: answers[i] || "A",
      is_correct: answers[i] === mcq.correct,
      time_spent_ms: null,
    }));

    const correct = answersPayload.filter(a => a.is_correct).length;
    setScore(correct);
    setSubmitted(true);

    try {
      const token = authStorage.getToken();
      const data = await api.post<McqSubmitResponse>("/query/mcq/submit", {
        subject,
        topic: result?.normalized_query || query,
        answers: answersPayload,
      }, token || undefined);
      // Server grading is authoritative: its per-question results drive
      // the highlighting/explanations and its count updates the score.
      setGradedQuestions(data.questions ?? []);
      setScore(data.correct);
    } catch (err) {
      console.error("Failed to save MCQ attempt:", err);
    }
  };

  const sections = result ? parseExplanation(result.explanation) : null;
  const topicNotFound = result?.explanation?.includes("not in our current knowledge base") ?? false;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 animate-fade-up">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Study</h1>
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
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={`Ask about ${subject}... (English ya Roman Urdu mein)`}
            maxLength={500}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors" />
          <button type="submit" disabled={explainLoading || !query.trim()}
            className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">
            {explainLoading ? "..." : "Ask"}
          </button>
        </div>
      </form>

      {/* Explain Error */}
      {explainError && (
        explainError === "LIMIT_REACHED" ? (
          <div className="mb-6 p-5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
              Daily limit reached
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
              Free plan allows 3 explanations per day. Upgrade to Pro for unlimited access.
            </p>
            <a href="/upgrade" className="inline-block px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors no-underline">
              Upgrade to Pro — PKR 799/mo
            </a>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-xl">{explainError}</div>
        )
      )}

      {/* Loading */}
      {explainLoading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-3">Generating explanation...</p>
        </div>
      )}

      {/* Topic Not Found */}
      {result && topicNotFound && !explainLoading && (
        <div className="mb-8 p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-center">
          <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">
            This topic isn't in our knowledge base yet for {subject}.
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
            Try rephrasing, or ask about a different topic — we're adding new content regularly.
          </p>
        </div>
      )}

      {/* Explanation Result */}
      {sections && !topicNotFound && !explainLoading && (
        <div className="space-y-4 mb-8">
          {sections.english && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">English</h3>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{sections.english}</p>
            </div>
          )}
          {sections.urdu && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">اردو</h3>
              <p className="font-urdu text-slate-700 dark:text-slate-300 text-sm leading-loose text-right" dir="rtl">{sections.urdu}</p>
            </div>
          )}
          {sections.keyPoint && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">Key Exam Point</h3>
              <p className="text-amber-900 dark:text-amber-200 text-sm font-medium">{sections.keyPoint}</p>
            </div>
          )}
          {sections.example && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">Real-Life Example</h3>
              <p className="text-blue-900 dark:text-blue-200 text-sm">{sections.example}</p>
            </div>
          )}

          {/* Continue in chat + Practice MCQs Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => setChatOpen(true)}
              className="flex-1 py-3 bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/20">
              Continue in chat
            </button>
            <button onClick={handleGetMcqs} disabled={mcqLoading}
              className="flex-1 py-3 border-2 border-teal-600 dark:border-teal-500 text-teal-700 dark:text-teal-400 rounded-xl text-sm font-semibold hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {mcqLoading ? "Generating MCQs..." : "Practice MCQs on this topic"}
            </button>
          </div>

          {mcqError && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm rounded-xl">{mcqError}</div>
          )}
        </div>
      )}

      {/* MCQ Quiz */}
      {mcqs.length > 0 && !mcqLoading && (
        <div className="space-y-6">
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 break-words">
            Practice MCQs — {result?.normalized_query}
          </h2>

          {mcqs.map((mcq, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
              {/* Difficulty badge */}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                mcq.difficulty === "Easy" ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" :
                mcq.difficulty === "Medium" ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400" :
                "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
              }`}>
                {mcq.difficulty}
              </span>

              {/* Question */}
              <p className="text-slate-900 dark:text-slate-100 font-medium text-sm mt-3 mb-1">{mcq.question_en}</p>
              <p className="font-urdu text-slate-500 dark:text-slate-400 text-sm leading-loose text-right mb-4" dir="rtl">{mcq.question_ur}</p>

              {/* Options */}
              <div className="space-y-2">
                {OPTIONS.map((opt) => {
                  const isSelected = answers[i] === opt;
                  const graded = gradedQuestions?.find(q => q.mcq_index === i);
                  const isCorrect = (graded ? graded.correct_option : mcq.correct) === opt;
                  const showResult = submitted;

                  let optClass = "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-400 dark:hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20";
                  if (showResult && isCorrect) optClass = "border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300";
                  else if (showResult && isSelected && !isCorrect) optClass = "border-2 border-red-400 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300";
                  else if (isSelected) optClass = "border-2 border-teal-500 bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300";

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

              {/* Explanation (after submit) -- from the submit response */}
              {submitted && (
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Explanation</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {(gradedQuestions?.find(q => q.mcq_index === i)?.explanation_en) ?? "No explanation available for this question."}
                  </p>
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
              score === mcqs.length ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800" :
              score >= mcqs.length / 2 ? "bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800" :
              "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
            }`}>
              <p className="font-display text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{score}/{mcqs.length}</p>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                {score === mcqs.length ? "Perfect score!" :
                 score >= mcqs.length / 2 ? "Good work! Keep practicing" :
                 "Need more practice"}
              </p>
              <button onClick={() => { setMcqs([]); setAnswers({}); setSubmitted(false); setGradedQuestions(null); }}
                className="mt-4 text-sm text-teal-600 dark:text-teal-400 hover:underline">
                Try again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Study Chat drawer -- persistent per (subject, topic) */}
      {result && !topicNotFound && (
        <StudyChatDrawer
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          subject={result.subject}
          topic={result.normalized_query}
          onUnauthorized={() => {
            logout();
            router.push("/login?reason=session_expired");
          }}
        />
      )}
    </div>
  );
}