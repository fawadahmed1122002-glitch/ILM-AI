"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { authStorage } from "@/lib/auth";

interface IngestJob {
  id: string;
  subject: string;
  chapter_number: number;
  chapter_name: string;
  source_filename: string | null;
  file_path: string | null;
  status: "pending" | "processing" | "ready" | "failed";
  chunk_count: number;
  error_message: string | null;
  created_at: string | null;
  completed_at: string | null;
}

interface CoverageChapter {
  chapter_number: number;
  chunk_count: number;
  chapter_name: string | null;
}

interface CoverageSubject {
  subject: string;
  total_chunks: number;
  chapter_count: number;
  chapters: CoverageChapter[];
}

interface CoverageResponse {
  total_chunks: number;
  subjects: CoverageSubject[];
}

const SUBJECTS = ["Biology", "Chemistry", "Physics", "Mathematics", "Computer Science"];
// Poll while a job is pending/processing; stop once nothing is in-flight.
const POLL_INTERVAL_MS = 3000;

// "1, 2, 3, 13, 14, ... 21" -> "1–3, 13–21"
function compressRanges(numbers: number[]): string {
  if (numbers.length === 0) return "—";
  const sorted = [...numbers].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (const n of sorted.slice(1)) {
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
    start = prev = n;
  }
  ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
  return ranges.join(", ");
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusPill({ status }: { status: IngestJob["status"] }) {
  // The DB stores "ready" for a finished ingestion; show it as "complete".
  const label = status === "ready" ? "complete" : status;
  const classes =
    status === "ready"
      ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
      : status === "processing"
      ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 animate-pulse"
      : status === "failed"
      ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${classes}`}>
      {label}
    </span>
  );
}

export default function AdminIngestionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Upload form state
  const [subject, setSubject] = useState("Biology");
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  // Set when the backend rejects with CHAPTER_EXISTS -- the user must
  // explicitly confirm before the chapter is re-ingested and replaced.
  const [pendingConfirm, setPendingConfirm] = useState(false);

  // Data state
  const [coverage, setCoverage] = useState<CoverageResponse | null>(null);
  const [jobs, setJobs] = useState<IngestJob[]>([]);
  // "" = All subjects (compressed-range view); otherwise one entry from SUBJECTS.
  const [coverageFilter, setCoverageFilter] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const fetchCoverage = async () => {
    try {
      const token = authStorage.getToken();
      const data = await api.get<CoverageResponse>("/admin/coverage", token || undefined);
      setCoverage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load coverage");
    }
  };

  const fetchJobs = async () => {
    try {
      const token = authStorage.getToken();
      const data = await api.get<{ jobs: IngestJob[] }>("/admin/ingest/status", token || undefined);
      setJobs(data.jobs);
      return data.jobs;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ingestion status");
      return [];
    }
  };

  useEffect(() => {
    if (user) {
      fetchCoverage();
      fetchJobs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Poll every few seconds only while a job is pending/processing;
  // stop once nothing is in-flight.
  const inFlight = jobs.some((j) => j.status === "pending" || j.status === "processing");
  useEffect(() => {
    if (!user || !inFlight) return;
    pollRef.current = window.setInterval(async () => {
      await fetchJobs();
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, inFlight]);

  const submitIngest = async (replace: boolean) => {
    if (!file) {
      setError("Choose a PDF file to ingest.");
      return;
    }
    const chapterNum = parseInt(chapterNumber, 10);
    if (!chapterNum || chapterNum < 1) {
      setError("Enter a valid chapter number.");
      return;
    }
    if (!chapterName.trim()) {
      setError("Enter a chapter name.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");
    setPendingConfirm(false);

    const form = new FormData();
    form.append("file", file);
    form.append("subject", subject);
    form.append("chapter_number", String(chapterNum));
    form.append("chapter_name", chapterName.trim());
    form.append("replace", String(replace));

    try {
      const token = authStorage.getToken();
      const job = await api.postForm<IngestJob>("/admin/ingest", form, token || undefined);
      // Sync endpoint -- the response is the finished job row.
      if (job.status === "failed") {
        setError(`Ingestion failed: ${job.error_message || "unknown error"}`);
      } else {
        setSuccess(`${job.subject} chapter ${job.chapter_number} ingested — ${job.chunk_count} chunks stored.`);
        setFile(null);
        setChapterName("");
        fetchCoverage();
      }
      fetchJobs();
    } catch (err) {
      if (err instanceof ApiError && err.code === "CHAPTER_EXISTS") {
        // Needs explicit re-ingest confirmation before replacing.
        setError(err.message);
        setPendingConfirm(true);
      } else {
        setError(err instanceof Error ? err.message : "Ingestion failed");
      }
      fetchJobs();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async (job: IngestJob) => {
    if (!job.file_path) {
      setError("No source file recorded for this job — upload the PDF again.");
      return;
    }
    setRetryingId(job.id);
    setError("");
    setSuccess("");

    const form = new FormData();
    form.append("source_path", job.file_path);
    form.append("subject", job.subject);
    form.append("chapter_number", String(job.chapter_number));
    form.append("chapter_name", job.chapter_name);
    form.append("replace", "true");

    try {
      const token = authStorage.getToken();
      const result = await api.postForm<IngestJob>("/admin/ingest", form, token || undefined);
      if (result.status === "failed") {
        setError(`Retry failed: ${result.error_message || "unknown error"}`);
      } else {
        setSuccess(`${result.subject} chapter ${result.chapter_number} ingested — ${result.chunk_count} chunks stored.`);
        fetchCoverage();
      }
      fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
      fetchJobs();
    } finally {
      setRetryingId(null);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) return null;

  const coverageBySubject = new Map((coverage?.subjects || []).map((s) => [s.subject, s]));
  const inFlightCount = jobs.filter((j) => j.status === "pending" || j.status === "processing").length;

  // Per-chapter breakdown for the selected subject. The codebase tracks no
  // canonical syllabus chapter count, so the expected range is inferred as
  // 1..(max chapter number seen across ingestion jobs + the vector store).
  const selectedCoverage = coverageFilter ? coverageBySubject.get(coverageFilter) : undefined;
  const observedMax = Math.max(
    0,
    ...(selectedCoverage?.chapters.map((c) => c.chapter_number) || []),
    ...jobs.filter((j) => j.subject === coverageFilter).map((j) => j.chapter_number),
  );
  const ingestedByNumber = new Map((selectedCoverage?.chapters || []).map((c) => [c.chapter_number, c]));
  const chapterRows = Array.from({ length: observedMax }, (_, i) => i + 1);
  const missingCount = chapterRows.filter((n) => !ingestedByNumber.has(n)).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Chapter Ingestion
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Ingest chapter PDFs into the knowledge base and see exactly what is stored.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-xl">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl">
          {success}
        </div>
      )}

      {/* ---- Coverage summary (ground truth from ChromaDB) ---- */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
            Vector Store Coverage
          </h2>
          <div className="flex items-center gap-3">
            {/* Subject filter -- reuses the same SUBJECTS list as the upload form */}
            <select
              value={coverageFilter}
              onChange={(e) => setCoverageFilter(e.target.value)}
              aria-label="Filter coverage by subject"
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="">All subjects</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              onClick={fetchCoverage}
              className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline"
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Chapters Present</th>
                <th className="px-4 py-3 font-medium text-center">Chunks</th>
              </tr>
            </thead>
            <tbody>
              {SUBJECTS.map((s) => {
                const entry = coverageBySubject.get(s);
                return (
                  <tr key={s} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-medium">{s}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {entry ? compressRanges(entry.chapters.map((c) => c.chapter_number)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">
                      {entry ? entry.total_chunks : 0}
                    </td>
                  </tr>
                );
              })}
              {/* Any subjects in the store outside the fixed list */}
              {(coverage?.subjects || [])
                .filter((s) => !SUBJECTS.includes(s.subject))
                .map((s) => (
                  <tr key={s.subject} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-medium">{s.subject}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {compressRanges(s.chapters.map((c) => c.chapter_number))}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">{s.total_chunks}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* ---- Per-chapter breakdown for the filtered subject ---- */}
        {coverageFilter && (
          <div className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {coverageFilter} — Chapter Detail
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {missingCount > 0 && (
                  <>
                    <span className="font-semibold text-red-600 dark:text-red-400">{missingCount} missing</span>
                    {" · "}
                  </>
                )}
                expected range inferred from highest chapter on record (no tracked syllabus count)
              </span>
            </div>
            {observedMax === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                No ingestion activity recorded for {coverageFilter} yet.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-2.5 font-medium w-16">Ch.</th>
                    <th className="px-4 py-2.5 font-medium">Chapter Name</th>
                    <th className="px-4 py-2.5 font-medium text-center">Chunks</th>
                    <th className="px-4 py-2.5 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {chapterRows.map((n) => {
                    const entry = ingestedByNumber.get(n);
                    return entry ? (
                      <tr key={n} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                        <td className="px-4 py-2.5 text-slate-900 dark:text-slate-100 font-medium">{n}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                          {entry.chapter_name || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-center text-slate-500 dark:text-slate-400">
                          {entry.chunk_count}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                            done
                          </span>
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={n}
                        className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 bg-red-50/70 dark:bg-red-950/20"
                      >
                        <td className="px-4 py-2.5 text-red-600 dark:text-red-400 font-medium">{n}</td>
                        <td className="px-4 py-2.5 text-red-400 dark:text-red-500/70 italic">Not ingested</td>
                        <td className="px-4 py-2.5 text-center text-red-300 dark:text-red-800">—</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
                            missing
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ---- Upload form ---- */}
      <div className="mb-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-4">
          Ingest a Chapter
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Subject</span>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Chapter number</span>
            <input
              type="number"
              min={1}
              value={chapterNumber}
              onChange={(e) => setChapterNumber(e.target.value)}
              placeholder="e.g. 15"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Chapter name</span>
            <input
              type="text"
              value={chapterName}
              onChange={(e) => setChapterName(e.target.value)}
              placeholder="e.g. Physical Optics"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">PDF file</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setPendingConfirm(false);
              }}
              className="mt-1 w-full text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-600 dark:file:text-slate-300 hover:file:bg-slate-200 dark:hover:file:bg-slate-700"
            />
          </label>
        </div>

        {pendingConfirm ? (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              This subject + chapter already exists in the store. Re-ingesting will replace its chunks.
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => submitIngest(true)}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Re-ingest and replace
              </button>
              <button
                onClick={() => setPendingConfirm(false)}
                disabled={submitting}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => submitIngest(false)}
            disabled={submitting || !file}
            className="mt-4 w-full py-3 bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Ingesting…" : "Ingest Chapter"}
          </button>
        )}
      </div>

      {/* ---- Ingestion jobs ---- */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
            Ingestion Jobs
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {inFlightCount > 0
              ? `${inFlightCount} in flight — polling every ${POLL_INTERVAL_MS / 1000}s`
              : "No jobs in flight"}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Ch.</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium text-center">Chunks</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    No ingestion jobs yet.
                  </td>
                </tr>
              )}
              {jobs.map((j) => (
                <tr key={j.id} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 align-top">
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-medium">{j.subject}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{j.chapter_number}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {j.chapter_name}
                    {j.source_filename && (
                      <div className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[16rem]" title={j.source_filename}>
                        {j.source_filename}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">
                    {j.status === "ready" ? j.chunk_count : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusPill status={j.status} />
                    {j.status === "failed" && j.error_message && (
                      <div className="mt-1 text-xs text-red-600 dark:text-red-400 text-left max-w-[14rem]">
                        {j.error_message}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                    {formatTime(j.completed_at || j.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {j.status === "failed" && (
                      <button
                        onClick={() => handleRetry(j)}
                        disabled={retryingId === j.id}
                        className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {retryingId === j.id ? "Retrying…" : "Retry"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
