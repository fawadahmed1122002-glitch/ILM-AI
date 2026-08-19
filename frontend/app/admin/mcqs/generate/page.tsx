"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { authStorage } from "@/lib/auth";

interface ChapterStatus {
  document_id: string;
  chapter_number: number;
  chapter_title: string;
  chunk_count: number;
  mcq_total: number;
  mcq_verified: number;
  status: "empty" | "partial" | "done";
}

interface GenerateResult {
  generated?: number;
  invalid?: number;
  invalid_reasons?: string[];
  parse_error?: string | null;
  document_id?: string;
  chapter_title?: string;
}

interface LogEntry {
  chapter_number: number;
  chapter_title: string;
  status: "success" | "skipped" | "error" | "quota";
  message: string;
}

const SUBJECTS = ["Biology", "Chemistry", "Physics", "Mathematics", "Computer Science"];
const DELAY_MS = 4000;

export default function AdminMcqGeneratePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [subject, setSubject] = useState("Biology");
  const [chapters, setChapters] = useState<ChapterStatus[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [error, setError] = useState("");
  const [runningChapter, setRunningChapter] = useState<number | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const stopRequested = useRef(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const fetchChapters = async () => {
    setChaptersLoading(true);
    setError("");
    try {
      const token = authStorage.getToken();
      const data = await api.get<{ subject: string; chapters: ChapterStatus[] }>(
        `/admin/mcqs/chapter-status?subject=${encodeURIComponent(subject)}`,
        token || undefined
      );
      setChapters(data.chapters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chapters");
    } finally {
      setChaptersLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchChapters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, subject]);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const isQuotaError = (err: unknown): boolean => {
    if (!(err instanceof ApiError)) return false;
    const text = (err.message || "").toLowerCase();
    return (
      text.includes("rate_limit") ||
      text.includes("rate limit") ||
      text.includes("tokens per day") ||
      text.includes("tpd") ||
      text.includes("request too large") ||
      err.status === 429 ||
      err.status === 413
    );
  };

  const generateOne = async (
    chapter: ChapterStatus,
    force: boolean
  ): Promise<{ ok: boolean; quota: boolean }> => {
    const token = authStorage.getToken();
    try {
      const result = await api.post<GenerateResult>(
        `/admin/mcqs/generate?subject=${encodeURIComponent(subject)}&chapter_number=${chapter.chapter_number}&force=${force}`,
        {},
        token || undefined
      );
      if (result.parse_error) {
        setLog((prev) => [
          ...prev,
          {
            chapter_number: chapter.chapter_number,
            chapter_title: chapter.chapter_title,
            status: "error",
            message: `Parse error: ${result.parse_error.slice(0, 120)}...`,
          },
        ]);
        return { ok: false, quota: false };
      }
      setLog((prev) => [
        ...prev,
        {
          chapter_number: chapter.chapter_number,
          chapter_title: chapter.chapter_title,
          status: "success",
          message: `Generated ${result.generated ?? 0} MCQs`,
        },
      ]);
      return { ok: true, quota: false };
    } catch (err) {
      if (isQuotaError(err)) {
        setLog((prev) => [
          ...prev,
          {
            chapter_number: chapter.chapter_number,
            chapter_title: chapter.chapter_title,
            status: "quota",
            message: "Groq daily/rate quota reached — stopping run. Resume later.",
          },
        ]);
        return { ok: false, quota: true };
      }
      setLog((prev) => [
        ...prev,
        {
          chapter_number: chapter.chapter_number,
          chapter_title: chapter.chapter_title,
          status: "error",
          message: err instanceof Error ? err.message : "Generation failed",
        },
      ]);
      return { ok: false, quota: false };
    }
  };

  const handleGenerateSingle = async (chapter: ChapterStatus) => {
    setRunningChapter(chapter.chapter_number);
    await generateOne(chapter, chapter.mcq_total > 0);
    setRunningChapter(null);
    fetchChapters();
  };

  const handleGenerateAllMissing = async () => {
    const targets = chapters.filter((c) => c.status === "empty");
    if (targets.length === 0) return;
    setBulkRunning(true);
    stopRequested.current = false;
    setLog([]);

    for (const chapter of targets) {
      if (stopRequested.current) break;
      setRunningChapter(chapter.chapter_number);
      const { quota } = await generateOne(chapter, false);
      setRunningChapter(null);
      if (quota) break;
      await sleep(DELAY_MS);
    }

    setBulkRunning(false);
    fetchChapters();
  };

  const handleStop = () => {
    stopRequested.current = true;
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) return null;

  const emptyCount = chapters.filter((c) => c.status === "empty").length;
  const doneCount = chapters.filter((c) => c.status === "done").length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          MCQ Bulk Generation
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {chaptersLoading
            ? "Loading..."
            : `${doneCount} done · ${emptyCount} remaining of ${chapters.length} chapters`}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {SUBJECTS.map((s) => (
          <button
            key={s}
            onClick={() => !bulkRunning && setSubject(s)}
            disabled={bulkRunning}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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

      <div className="flex gap-3 mb-6">
        <button
          onClick={handleGenerateAllMissing}
          disabled={bulkRunning || emptyCount === 0 || chaptersLoading}
          className="flex-1 py-3 bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {bulkRunning
            ? `Generating... (Ch.${runningChapter ?? "?"})`
            : emptyCount === 0
            ? "All chapters have MCQs"
            : `Generate All Missing (${emptyCount} chapters)`}
        </button>
        {bulkRunning && (
          <button
            onClick={handleStop}
            className="px-6 py-3 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            Stop
          </button>
        )}
      </div>

      {log.length > 0 && (
        <div className="mb-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 max-h-64 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
            Run Log
          </p>
          <div className="space-y-1.5">
            {log.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span
                  className={`shrink-0 mt-0.5 ${
                    entry.status === "success"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : entry.status === "quota"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {entry.status === "success" ? "✓" : entry.status === "quota" ? "⏸" : "✗"}
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  <span className="font-medium">Ch.{entry.chapter_number} {entry.chapter_title}:</span>{" "}
                  {entry.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {chaptersLoading && (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!chaptersLoading && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Ch.</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium text-center">Chunks</th>
                <th className="px-4 py-3 font-medium text-center">MCQs</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {chapters.map((c) => (
                <tr
                  key={c.document_id}
                  className="border-b border-slate-100 dark:border-slate-800/50 last:border-0"
                >
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{c.chapter_number}</td>
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-medium">
                    {c.chapter_title}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">
                    {c.chunk_count}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">
                    {c.mcq_total}
                    {c.mcq_verified > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400"> ({c.mcq_verified} ✓)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        c.status === "done"
                          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                          : c.status === "partial"
                          ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleGenerateSingle(c)}
                      disabled={bulkRunning || runningChapter === c.chapter_number}
                      className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {runningChapter === c.chapter_number
                        ? "..."
                        : c.mcq_total > 0
                        ? "Regenerate"
                        : "Generate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}