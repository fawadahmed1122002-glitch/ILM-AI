"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { authStorage } from "@/lib/auth";

interface BankMcq {
  id: string;
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
  is_verified: boolean;
  rejected_at: string | null;
}

const SUBJECTS = ["Biology", "Chemistry", "Physics", "Mathematics", "Computer Science"];
const OPTIONS = ["A", "B", "C", "D"] as const;
const PAGE_SIZE = 50;

interface BankMeta {
  chapters: number[];
  counts: { total: number; verified: number; pending: number; rejected: number };
}

type StatusFilter = "all" | "verified" | "pending" | "rejected";

function getMcqStatus(m: BankMcq): "verified" | "pending" | "rejected" {
  if (m.rejected_at) return "rejected";
  if (m.is_verified) return "verified";
  return "pending";
}

export default function AdminMcqBankPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [subject, setSubject] = useState("Biology");
  const [mcqs, setMcqs] = useState<BankMcq[]>([]);
  const [mcqsLoading, setMcqsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [selectedChapter, setSelectedChapter] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [chapterNumbers, setChapterNumbers] = useState<number[]>([]);
  const [counts, setCounts] = useState<BankMeta["counts"]>({
    total: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
  });
  const [processingId, setProcessingId] = useState<string | null>(null);
  const fetchSeq = useRef(0);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // Debounce the search box so typing doesn't fire a fetch per keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const buildBankQuery = (offset: number) => {
    const params = new URLSearchParams({
      subject,
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (selectedChapter !== "all") params.set("chapter_number", String(selectedChapter));
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (debouncedSearch) params.set("q", debouncedSearch);
    return params.toString();
  };

  const fetchBank = async (offset: number, replace: boolean) => {
    const seq = ++fetchSeq.current;
    if (replace) {
      setMcqsLoading(true);
      setError("");
    } else {
      setLoadingMore(true);
    }
    try {
      const token = authStorage.getToken();
      const rows = await api.get<BankMcq[]>(
        `/admin/mcqs/bank?${buildBankQuery(offset)}`,
        token || undefined
      );
      if (seq !== fetchSeq.current) return;
      if (replace) {
        setMcqs(rows);
      } else {
        // Guard against any duplicate rows across pages
        setMcqs((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...rows.filter((r) => !seen.has(r.id))];
        });
      }
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      if (seq === fetchSeq.current) {
        setError(err instanceof Error ? err.message : "Failed to load MCQ bank");
      }
    } finally {
      if (seq === fetchSeq.current) {
        setMcqsLoading(false);
        setLoadingMore(false);
      }
    }
  };

  const fetchMeta = async () => {
    try {
      const token = authStorage.getToken();
      const meta = await api.get<BankMeta>(
        `/admin/mcqs/bank/meta?subject=${encodeURIComponent(subject)}`,
        token || undefined
      );
      setChapterNumbers(meta.chapters);
      setCounts(meta.counts);
    } catch {
      // counts/chapters are supplementary; list errors surface via fetchBank
    }
  };

  useEffect(() => {
    if (user) fetchBank(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, subject, selectedChapter, statusFilter, debouncedSearch]);

  useEffect(() => {
    if (user) fetchMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, subject]);

  const shiftCounts = (
    from: "verified" | "pending" | "rejected",
    to: "verified" | "pending" | "rejected"
  ) => {
    if (from === to) return;
    setCounts((prev) => ({ ...prev, [from]: prev[from] - 1, [to]: prev[to] + 1 }));
  };

  const handleApprove = async (id: string) => {
    const target = mcqs.find((m) => m.id === id);
    setProcessingId(id);
    try {
      const token = authStorage.getToken();
      await api.patch(`/admin/mcqs/${id}/approve`, {}, token || undefined);
      if (target) shiftCounts(getMcqStatus(target), "verified");
      setMcqs((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_verified: true, rejected_at: null } : m))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Reason for rejecting this MCQ:");
    if (reason === null) return;
    const target = mcqs.find((m) => m.id === id);
    setProcessingId(id);
    try {
      const token = authStorage.getToken();
      await api.patch(`/admin/mcqs/${id}/reject`, { reason }, token || undefined);
      if (target) shiftCounts(getMcqStatus(target), "rejected");
      setMcqs((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, is_verified: false, rejected_at: new Date().toISOString() } : m
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setProcessingId(null);
    }
  };

  const getOptionText = (mcq: BankMcq, opt: (typeof OPTIONS)[number]) =>
    ({ A: mcq.option_a, B: mcq.option_b, C: mcq.option_c, D: mcq.option_d }[opt]);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          MCQ Bank
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {mcqsLoading
            ? "Loading..."
            : `${counts.total} total · ${counts.verified} verified · ${counts.pending} pending · ${counts.rejected} rejected`}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {SUBJECTS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setSubject(s);
              setSelectedChapter("all");
            }}
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

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={selectedChapter}
          onChange={(e) =>
            setSelectedChapter(e.target.value === "all" ? "all" : Number(e.target.value))
          }
          className="px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
        >
          <option value="all">All chapters</option>
          {chapterNumbers.map((n) => (
            <option key={n} value={n}>
              Ch.{n}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
        >
          <option value="all">All statuses</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search question text..."
          className="flex-1 min-w-[160px] px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
        />
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
            No MCQs match the current filters.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {mcqs.map((mcq) => {
          const status = getMcqStatus(mcq);
          return (
            <div
              key={mcq.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  Ch.{mcq.chapter_number}
                  {mcq.topic ? ` — ${mcq.topic}` : ""}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    mcq.difficulty === "easy"
                      ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                      : mcq.difficulty === "medium"
                      ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400"
                      : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                  }`}
                >
                  {mcq.difficulty}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    status === "verified"
                      ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                      : status === "rejected"
                      ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                      : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                  }`}
                >
                  {status}
                </span>
              </div>

              <p className="text-slate-900 dark:text-slate-100 font-medium text-sm mb-1">
                {mcq.question_text}
              </p>
              {mcq.question_text_ur && (
                <p
                  className="font-urdu text-slate-500 dark:text-slate-400 text-sm leading-loose text-right mb-4"
                  dir="rtl"
                >
                  {mcq.question_text_ur}
                </p>
              )}

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
                    {getOptionText(mcq, opt)}
                    {mcq.correct_option === opt && <span className="ml-2 text-xs">✓ correct</span>}
                  </div>
                ))}
              </div>

              {mcq.explanation && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                  <span className="font-medium">Explanation:</span> {mcq.explanation}
                </p>
              )}

              <div className="flex gap-2">
                {status !== "verified" && (
                  <button
                    onClick={() => handleApprove(mcq.id)}
                    disabled={processingId === mcq.id}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {processingId === mcq.id ? "..." : "Approve"}
                  </button>
                )}
                {status !== "rejected" && (
                  <button
                    onClick={() => handleReject(mcq.id)}
                    disabled={processingId === mcq.id}
                    className="flex-1 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                  >
                    {processingId === mcq.id ? "..." : "Reject"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!mcqsLoading && hasMore && !error && (
        <button
          onClick={() => fetchBank(mcqs.length, false)}
          disabled={loadingMore}
          className="mt-4 w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          {loadingMore ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
}