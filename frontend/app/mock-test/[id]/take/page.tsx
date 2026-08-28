"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { authStorage } from "@/lib/auth";

interface DetailQuestion {
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
  selected_option: string | null;
}

interface DetailResponse {
  id: string;
  test_type: string;
  subject: string | null;
  question_count: number;
  time_limit_minutes: number;
  status: string;
  started_at: string;
  questions: DetailQuestion[];
}

interface SubmitResponse {
  id: string;
  score: number;
  correct_count: number;
  question_count: number;
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

export default function MockTestTakePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;

  const [test, setTest] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, Option>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
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
      const data = await api.get<DetailResponse>(`/mock-tests/${testId}`, token || undefined);
      if (data.status === "completed") {
        router.push(`/mock-test/${testId}/results`);
        return;
      }
      setTest(data);
      const initialAnswers: Record<string, Option> = {};
      data.questions.forEach((q) => {
        if (q.selected_option) initialAnswers[q.mcq_id] = q.selected_option as Option;
      });
      setAnswers(initialAnswers);
      const elapsedSec = Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000);
      const totalSec = data.time_limit_minutes * 60;
      setSecondsLeft(Math.max(totalSec - elapsedSec, 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load test");
    } finally {
      setDetailLoading(false);
    }
  }, [testId, router]);

  useEffect(() => {
    if (user) fetchDetail();
  }, [user, fetchDetail]);

  useEffect(() => {
    if (secondsLeft === null) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft !== null]);

  const saveAnswer = async (mcqId: string, opt: Option) => {
    const timeSpent = Date.now() - questionStartRef.current;
    try {
      const token = authStorage.getToken();
      await api.patch(`/mock-tests/${testId}/answer`, { mcq_id: mcqId, selected_option: opt, time_spent_ms: timeSpent }, token || undefined);
    } catch (err) {
      console.error("Autosave failed:", err);
    }
  };

  const handleSelect = (opt: Option) => {
    if (!test) return;
    const q = test.questions[currentIndex];
    setAnswers((prev) => ({ ...prev, [q.mcq_id]: opt }));
    saveAnswer(q.mcq_id, opt);
  };

  const goTo = (index: number) => {
    if (!test) return;
    if (index < 0 || index >= test.questions.length) return;
    setCurrentIndex(index);
    questionStartRef.current = Date.now();
  };

  const handleSubmit = async (auto = false) => {
    if (!test) return;
    if (!auto) {
      const confirmed = window.confirm(
        `Submit test? ${Object.keys(answers).length}/${test.question_count} answered.`
      );
      if (!confirmed) return;
    }
    setSubmitting(true);
    setSubmitFailed(false);
    setError("");
    try {
      const token = authStorage.getToken();
      const answersPayload = test.questions
        .filter((q) => answers[q.mcq_id])
        .map((q) => ({ mcq_id: q.mcq_id, selected_option: answers[q.mcq_id] }));
      await api.post<SubmitResponse>(`/mock-tests/${testId}/submit`, { answers: answersPayload }, token || undefined);
      router.push(`/mock-test/${testId}/results`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "ALREADY_SUBMITTED") {
        router.push(`/mock-test/${testId}/results`);
      } else {
        setError(err instanceof Error ? err.message : "Failed to submit");
        setSubmitFailed(true);
        setSubmitting(false);
      }
    }
  };

  // Time's up: lock the UI and auto-submit without the confirm prompt.
  useEffect(() => {
    if (secondsLeft === 0 && test && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      handleSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft === 0, test]);

  if (loading || detailLoading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) return null;

  if (error && !test) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-xl">
          {error}
        </div>
      </div>
    );
  }

  if (!test) return null;

  const q = test.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const timeCritical = secondsLeft !== null && secondsLeft < 300;
  const expired = secondsLeft !== null && secondsLeft <= 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      {/* Sticky header: timer + progress */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 -mx-4 px-4 py-3 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Question {currentIndex + 1} of {test.question_count}
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
          Time&apos;s up —{" "}
          {submitting
            ? "submitting your answers..."
            : submitFailed
            ? "auto-submit failed, so your answers are NOT submitted yet. Your saved answers are safe."
            : "your answers have been submitted."}
          {submitFailed && !submitting && (
            <button
              onClick={() => handleSubmit(true)}
              className="ml-3 font-semibold underline hover:no-underline"
            >
              Retry submit
            </button>
          )}
        </div>
      ) : (
        timeCritical && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm rounded-xl text-center">
            Less than 5 minutes left — the test will be submitted automatically when the timer reaches zero.
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
        {test.questions.map((qq, i) => (
          <button
            key={qq.mcq_id}
            onClick={() => goTo(i)}
            disabled={expired}
            className={`w-7 h-7 rounded-full text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              i === currentIndex
                ? "bg-teal-700 dark:bg-teal-600 text-white"
                : answers[qq.mcq_id]
                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm mb-6">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          {q.subject} · Ch.{q.chapter_number}
        </span>

        <p className="text-slate-900 dark:text-slate-100 font-medium text-sm mt-3 mb-1">{q.question_text}</p>
        {q.question_text_ur && (
          <p className="font-urdu text-slate-500 dark:text-slate-400 text-sm leading-loose text-right mb-4" dir="rtl">
            {q.question_text_ur}
          </p>
        )}

        <div className="space-y-2">
          {OPTIONS.map((opt) => {
            const isSelected = answers[q.mcq_id] === opt;
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
        {currentIndex < test.questions.length - 1 ? (
          <button
            onClick={() => goTo(currentIndex + 1)}
            disabled={expired}
            className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        ) : (
          <button
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Test"}
          </button>
        )}
      </div>

      {currentIndex < test.questions.length - 1 && (
        <button
          onClick={() => handleSubmit()}
          disabled={submitting}
          className="w-full py-2 text-xs text-slate-400 dark:text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit test now (before finishing all questions)"}
        </button>
      )}
    </div>
  );
}