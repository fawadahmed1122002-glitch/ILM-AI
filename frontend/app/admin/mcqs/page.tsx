"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { authStorage } from "@/lib/auth";
import MathText from "@/components/MathText";

interface PendingMcq {
  id: string;
  subject: string;
  chapter_number: number;
  topic: string;
  difficulty: string;
  question_text: string;
  question_text_ur: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
}

const SUBJECTS = ["Biology", "Chemistry", "Physics", "Mathematics", "Computer Science"];
const OPTIONS = ["A", "B", "C", "D"] as const;

export default function AdminMcqReviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [subject, setSubject] = useState("Biology");
  const [mcqs, setMcqs] = useState<PendingMcq[]>([]);
  const [mcqsLoading, setMcqsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const fetchPending = async () => {
    setMcqsLoading(true);
    setError("");
    try {
      const token = authStorage.getToken();
      const data = await api.get<PendingMcq[]>(`/admin/mcqs/pending?subject=${encodeURIComponent(subject)}`, token || undefined);
      setMcqs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pending MCQs");
    } finally {
      setMcqsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, subject]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const token = authStorage.getToken();
      await api.patch(`/admin/mcqs/${id}/approve`, {}, token || undefined);
      setMcqs((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Reason for rejecting this MCQ:");
    if (reason === null) return;
    setProcessingId(id);
    try {
      const token = authStorage.getToken();
      await api.patch(`/admin/mcqs/${id}/reject`, { reason }, token || undefined);
      setMcqs((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setProcessingId(null);
    }
  };

  const getOptionText = (mcq: PendingMcq, opt: typeof OPTIONS[number]) =>
    ({ A: mcq.option_a, B: mcq.option_b, C: mcq.option_c, D: mcq.option_d }[opt]);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          MCQ Review
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {mcqsLoading ? "Loading..." : `${mcqs.length} pending`}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {SUBJECTS.map((s) => (
          <button
            key={s}
            onClick={() => setSubject(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              subject === s
                ? "bg-teal-700 dark:bg-teal-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      {mcqsLoading && (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!mcqsLoading && mcqs.length === 0 && !error && (
        <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No pending MCQs for {subject}. Generate some or switch subjects.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {mcqs.map((mcq) => (
          <div key={mcq.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                Ch.{mcq.chapter_number} — {mcq.topic}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                mcq.difficulty === "easy" ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" :
                mcq.difficulty === "medium" ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400" :
                "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
              }`}>
                {mcq.difficulty}
              </span>
            </div>

            <MathText className="text-slate-900 dark:text-slate-100 font-medium text-sm mb-1" text={mcq.question_text} />
            <MathText className="font-urdu text-slate-500 dark:text-slate-400 text-sm leading-loose text-right mb-4" dir="rtl" text={mcq.question_text_ur} />

            <div className="space-y-1.5 mb-4">
              {OPTIONS.map((opt) => (
                <div
                  key={opt}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    mcq.correct_option === opt
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-medium"
                      : "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <span className="font-semibold mr-2">{opt}.</span>
                  <MathText inline text={getOptionText(mcq, opt)} />
                  {mcq.correct_option === opt && <span className="ml-2 text-xs">✓ correct</span>}
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              <span className="font-medium">Explanation:</span> <MathText inline text={mcq.explanation} />
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(mcq.id)}
                disabled={processingId === mcq.id}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {processingId === mcq.id ? "..." : "Approve"}
              </button>
              <button
                onClick={() => handleReject(mcq.id)}
                disabled={processingId === mcq.id}
                className="flex-1 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}