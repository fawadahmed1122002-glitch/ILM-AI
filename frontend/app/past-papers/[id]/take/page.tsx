"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { authStorage } from "@/lib/auth";

interface DetailQuestion {
  question_id: string;
  question_number: number;
  subject_tag: string | null;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  selected_option: string | null;
}

interface DetailResponse {
  attempt_id: string;
  paper_id: string;
  exam_type: string;
  university: string;
  year: number;
  question_count: number;
  duration_minutes: number;
  status: string;
  started_at: string;
  questions: DetailQuestion[];
}

interface SubmitResponse {
  attempt_id: string;
  score: number;
  correct_count: number;
  question_count: number;
  time_taken_seconds: number;
}

const OPTIONS = ["A", "B", "C", "D"] as const;
type Option = (typeof OPTIONS)[number];

function getOptionText(q: DetailQuestion, opt: Option) {
  return { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }[opt];
}

function formatTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

interface SubjectSection {
  subject: string;
  firstNumber: number;
  lastNumber: number;
}

// Collapse consecutive same-subject questions into paper sections
// (e.g. Physics Q1–30, Mathematics Q31–60) preserving original order.
function buildSections(questions: DetailQuestion[]): SubjectSection[] {
  const sections: SubjectSection[] = [];
  for (const q of questions) {
    const subject = q.subject_tag || "General";
    const last = sections[sections.length - 1];
    if (last && last.subject === subject) {
      last.lastNumber = q.question_number;
    } else {
      sections.push({ subject, firstNumber: q.question_number, lastNumber: q.question_number });
    }
  }
  return sections;
}

export default function PastPaperTakePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const attemptId = params.id as string;

  const [attempt, setAttempt] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, Option>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const questionStartRef = useRef<number>(Date.now());
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const fetchDetail = useCallback(async () => {
    setDetailLoading(true);
    setError("");
    try {
      const token = authStorage.getToken();
      const data = await api.get<DetailResponse>(`/past-papers/attempts/${attemptId}`, token || undefined);
      if (data.status === "completed") {
        router.push(`/past-papers/${attemptId}/results`);
        return;
      }
      setAttempt(data);
      const initialAnswers: Record<string, Option> = {};
      data.questions.forEach((q) => {
        if (q.selected_option) initialAnswers[q.question_id] = q.selected_option as Option;
      });
      setAnswers(initialAnswers);
      const elapsedSec = Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000);
      const totalSec = data.duration_minutes * 60;
      setSecondsLeft(Math.max(totalSec - elapsedSec, 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load paper");
    } finally {
      setDetailLoading(false);
    }
  }, [attemptId, router]);

  useEffect(() => {
    if (user) fetchDetail();
  }, [user, fetchDetail]);

  useEffect(() => {
    if (secondsLeft === null) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft !== null]);

  const sections = useMemo(
    () => (attempt ? buildSections(attempt.questions) : []),
    [attempt]
  );

  const saveAnswer = async (questionId: string, opt: Option) => {
    try {
      const token = authStorage.getToken();
      await api.patch(
        `/past-papers/attempts/${attemptId}/answer`,
        { question_id: questionId, selected_option: opt },
        token || undefined
      );
    } catch (err) {
      console.error("Autosave failed:", err);
    }
  };

  const handleSelect = (opt: Option) => {
    if (!attempt) return;
    const q = attempt.questions[currentIndex];
    setAnswers((prev) => ({ ...prev, [q.question_id]: opt }));
    saveAnswer(q.question_id, opt);
  };

  const goTo = (index: number) => {
    if (!attempt) return;
    if (index < 0 || index >= attempt.questions.length) return;
    setCurrentIndex(index);
    questionStartRef.current = Date.now();
  };

  const handleSubmit = async (auto = false) => {
    if (!attempt) return;
    if (!auto) {
      const confirmed = window.confirm(
        `Submit paper? ${Object.keys(answers).length}/${attempt.question_count} answered.`
      );
      if (!confirmed) return;
    }
    setSubmitting(true);
    setError("");
    try {
      const token = authStorage.getToken();
      await api.post<SubmitResponse>(`/past-papers/attempts/${attemptId}/submit`, {}, token || undefined);
      router.push(`/past-papers/${attemptId}/results`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "ALREADY_SUBMITTED") {
        router.push(`/past-papers/${attemptId}/results`);
      } else {
        setError(err instanceof Error ? err.message : "Failed to submit");
        setSubmitting(false);
      }
    }
  };

  // Time's up: lock the UI and auto-submit without the confirm prompt.
  useEffect(() => {
    if (secondsLeft === 0 && attempt && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      handleSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft === 0, attempt]);

  if (loading || detailLoading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) return null;

  if (error && !attempt) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-xl">
          {error}
        </div>
      </div>
    );
  }

  if (!attempt) return null;

  const q = attempt.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const timeCritical = secondsLeft !== null && secondsLeft < 300;
  const expired = secondsLeft !== null && secondsLeft <= 0;
  const currentSection = sections.find(
    (s) => q.question_number >= s.firstNumber && q.question_number <= s.lastNumber
  );
  const sectionStartsNew =
    currentSection && q.question_number === currentSection.firstNumber;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      {/* Sticky header: timer + progress */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 -mx-4 px-4 py-3 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {attempt.exam_type} {attempt.year} · Question {currentIndex + 1} of {attempt.question_count}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{answeredCount} answered</p>
        </div>
        <div
          className={`font-display text-lg font-bold tabular-nums ${
            timeCritical ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"
          }`}
        >
          {secondsLeft !== null ? formatTime(secondsLeft) : "--:--"}
        </div>
      </div>

      {expired ? (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm rounded-xl text-center">
          Time&apos;s up — {submitting ? "submitting your answers..." : "your answers have been submitted."}
        </div>
      ) : (
        timeCritical && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm rounded-xl text-center">
            Less than 5 minutes left — the paper will be submitted automatically when the timer reaches zero.
          </div>
        )
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Question navigator dots */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {attempt.questions.map((qq, i) => (
          <button
            key={qq.question_id}
            onClick={() => goTo(i)}
            disabled={expired}
            className={`w-7 h-7 rounded-full text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              i === currentIndex
                ? "bg-teal-700 dark:bg-teal-600 text-white"
                : answers[qq.question_id]
                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
            }`}
          >
            {qq.question_number}
          </button>
        ))}
      </div>

      {/* Subject section header — shown at the start of each paper section */}
      {currentSection && sectionStartsNew && (
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          <h2 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
            {currentSection.subject} · Questions {currentSection.firstNumber}–{currentSection.lastNumber}
          </h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>
      )}

      {/* Question card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm mb-6">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          Q{q.question_number} · {q.subject_tag || "General"}
        </span>

        <p className="text-slate-900 dark:text-slate-100 font-medium text-sm mt-3 mb-4">{q.question_text}</p>

        <div className="space-y-2">
          {OPTIONS.map((opt) => {
            const isSelected = answers[q.question_id] === opt;
            return (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                disabled={expired}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isSelected
                    ? "border-2 border-teal-500 bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300"
                    : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-400 dark:hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                }`}
              >
                <span className="font-semibold mr-2">{opt}.</span>
                {getOptionText(q, opt)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Nav buttons */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0 || expired}
          className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        {currentIndex < attempt.questions.length - 1 ? (
          <button
            onClick={() => goTo(currentIndex + 1)}
            disabled={expired}
            className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Paper"}
          </button>
        )}
      </div>

      {currentIndex < attempt.questions.length - 1 && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-2 text-xs text-slate-400 dark:text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit paper now (before finishing all questions)"}
        </button>
      )}
    </div>
  );
}
