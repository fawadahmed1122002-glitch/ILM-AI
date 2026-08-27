"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { authStorage } from "@/lib/auth";

interface PastPaper {
  id: string;
  exam_type: string;
  university: string;
  year: number;
  total_questions: number;
  duration_minutes: number;
  status: string;
}

interface StartResponse {
  attempt_id: string;
  paper_id: string;
  question_count: number;
  duration_minutes: number;
}

export default function PastPapersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [papers, setPapers] = useState<PastPaper[]>([]);
  const [papersLoading, setPapersLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const fetchPapers = async () => {
      setPapersLoading(true);
      try {
        const token = authStorage.getToken();
        const data = await api.get<PastPaper[]>("/past-papers", token || undefined);
        setPapers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load past papers");
      } finally {
        setPapersLoading(false);
      }
    };
    fetchPapers();
  }, [user]);

  const startPaper = async (paperId: string) => {
    setError("");
    setStartingId(paperId);
    try {
      const token = authStorage.getToken();
      const data = await api.post<StartResponse>(
        `/past-papers/${paperId}/start`,
        {},
        token || undefined
      );
      router.push(`/past-papers/${data.attempt_id}/take`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "ATTEMPT_IN_PROGRESS") {
        // Resume the existing attempt instead of showing an error
        const detail = err.detail as { attempt_id?: string };
        if (detail?.attempt_id) {
          router.push(`/past-papers/${detail.attempt_id}/take`);
          return;
        }
      }
      setError(err instanceof Error ? err.message : "Failed to start paper");
      setStartingId(null);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Past Papers
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Practice on real entry-test papers, exactly as printed — original question order and sections
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      {papersLoading && (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!papersLoading && papers.length === 0 && (
        <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No past papers available yet — more papers coming soon.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {papers.map((paper) => (
          <div
            key={paper.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {paper.exam_type} {paper.year}
              </h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400">
                {paper.university}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              {paper.total_questions} questions · {paper.duration_minutes} min · timed, no pause
            </p>
            <button
              onClick={() => startPaper(paper.id)}
              disabled={startingId !== null}
              className="w-full py-2.5 bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {startingId === paper.id ? "Starting..." : "Start Paper"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
