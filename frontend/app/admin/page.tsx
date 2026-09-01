"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { authStorage } from "@/lib/auth";

// ------------------------------------------------------------------
// Response shapes (subsets of what the existing admin endpoints return)
// ------------------------------------------------------------------

interface SubjectMcqCounts {
  approved: number;
  pending: number;
}

interface DashboardStats {
  mcqs: {
    total_approved: number;
    total_pending: number;
    by_subject: Record<string, SubjectMcqCounts>;
  };
  users: {
    total: number;
    by_plan: Record<string, number>;
  };
}

interface CoverageSubject {
  subject: string;
  total_chunks: number;
  chapter_count: number;
}

interface CoverageResponse {
  total_chunks: number;
  subjects: CoverageSubject[];
}

interface RevenueDay {
  day: string;
  transactions: number;
  revenue_pkr: number;
}

interface RevenueResponse {
  total_revenue_pkr: number;
  total_transactions: number;
  active_pro_users: number;
  daily_last_30_days: RevenueDay[];
}

interface IngestJob {
  id: string;
  subject: string;
  chapter_number: number;
  chapter_name: string;
  status: "pending" | "processing" | "ready" | "failed";
  completed_at: string | null;
  created_at: string | null;
}

const SUBJECTS = ["Biology", "Chemistry", "Physics", "Mathematics", "Computer Science"];

const ADMIN_PAGES = [
  {
    href: "/admin/mcqs/generate",
    title: "Bulk MCQ Generation",
    description: "Kick off AI MCQ generation per chapter and poll the outcome.",
  },
  {
    href: "/admin/mcqs",
    title: "MCQ Review",
    description: "Approve or reject pending AI-generated questions.",
  },
  {
    href: "/admin/mcqs/bank",
    title: "MCQ Bank Browser",
    description: "Browse the full MCQ bank with chapter and status filters.",
  },
  {
    href: "/admin/ingestion",
    title: "Chapter Ingestion",
    description: "Ingest chapter PDFs and inspect vector store coverage.",
  },
];

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
  // Same convention as /admin/ingestion: DB stores "ready" for finished jobs.
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

function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [coverage, setCoverage] = useState<CoverageResponse | null>(null);
  const [revenue, setRevenue] = useState<RevenueResponse | null>(null);
  const [jobs, setJobs] = useState<IngestJob[]>([]);
  const [sectionErrors, setSectionErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const token = authStorage.getToken() || undefined;
    const errors: string[] = [];

    // All four sections are independent: one failing fetch should not
    // blank out the rest of the dashboard.
    Promise.allSettled([
      api.get<DashboardStats>("/admin/stats", token),
      api.get<CoverageResponse>("/admin/coverage", token),
      api.get<RevenueResponse>("/admin/revenue", token),
      api.get<{ jobs: IngestJob[] }>("/admin/ingest/status", token),
    ]).then(([statsRes, coverageRes, revenueRes, jobsRes]) => {
      if (statsRes.status === "fulfilled") setStats(statsRes.value);
      else errors.push(`Stats: ${statsRes.reason instanceof Error ? statsRes.reason.message : "failed to load"}`);

      if (coverageRes.status === "fulfilled") setCoverage(coverageRes.value);
      else errors.push(`Coverage: ${coverageRes.reason instanceof Error ? coverageRes.reason.message : "failed to load"}`);

      if (revenueRes.status === "fulfilled") setRevenue(revenueRes.value);
      else errors.push(`Revenue: ${revenueRes.reason instanceof Error ? revenueRes.reason.message : "failed to load"}`);

      if (jobsRes.status === "fulfilled") setJobs(jobsRes.value.jobs);
      else errors.push(`Ingestion jobs: ${jobsRes.reason instanceof Error ? jobsRes.reason.message : "failed to load"}`);

      setSectionErrors(errors);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) return null;

  // This month's gross revenue, straight from the daily breakdown the
  // /admin/revenue endpoint already computes (no new aggregation here).
  const monthPrefix = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const monthRevenue = (revenue?.daily_last_30_days || [])
    .filter((d) => d.day.startsWith(monthPrefix))
    .reduce((sum, d) => sum + d.revenue_pkr, 0);

  const totalChapters = (coverage?.subjects || []).reduce((sum, s) => sum + s.chapter_count, 0);
  const coverageBySubject = new Map((coverage?.subjects || []).map((s) => [s.subject, s]));
  const bySubject = stats?.mcqs.by_subject || {};
  const recentJobs = jobs.slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Platform overview and shortcuts to every admin tool.
        </p>
      </div>

      {sectionErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-xl">
          {sectionErrors.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      )}

      {/* ---- Stat tiles ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile
          label="Approved MCQs"
          value={stats ? stats.mcqs.total_approved.toLocaleString() : "…"}
          detail={stats ? `${stats.mcqs.total_pending.toLocaleString()} pending review` : undefined}
        />
        <StatTile
          label="Registered Users"
          value={stats ? stats.users.total.toLocaleString() : "…"}
          detail={
            stats
              ? `${(stats.users.by_plan["pro"] || 0).toLocaleString()} pro · ${(stats.users.by_plan["free"] || 0).toLocaleString()} free`
              : undefined
          }
        />
        <StatTile
          label="Active Paid Subs"
          value={revenue ? revenue.active_pro_users.toLocaleString() : "…"}
          detail={revenue ? `${revenue.total_transactions.toLocaleString()} completed payments all-time` : undefined}
        />
        <StatTile
          label="Revenue This Month"
          value={revenue ? `PKR ${monthRevenue.toLocaleString()}` : "…"}
          detail={revenue ? `PKR ${revenue.total_revenue_pkr.toLocaleString()} all-time` : undefined}
        />
      </div>

      {/* ---- MCQ bank by subject ---- */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-3">
          MCQ Bank by Subject
        </h2>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium text-center">Approved</th>
                <th className="px-4 py-3 font-medium text-center">Pending Review</th>
              </tr>
            </thead>
            <tbody>
              {SUBJECTS.map((s) => {
                const counts = bySubject[s];
                return (
                  <tr key={s} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-medium">{s}</td>
                    <td className="px-4 py-3 text-center text-emerald-700 dark:text-emerald-400 font-medium">
                      {counts ? counts.approved.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">
                      {counts ? counts.pending.toLocaleString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Content coverage (ground truth from ChromaDB) ---- */}
      <div className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
            Content Coverage
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {coverage ? `${totalChapters.toLocaleString()} chapters · ${coverage.total_chunks.toLocaleString()} chunks` : ""}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium text-center">Chapters Ingested</th>
                <th className="px-4 py-3 font-medium text-center">Chunks</th>
              </tr>
            </thead>
            <tbody>
              {SUBJECTS.map((s) => {
                const entry = coverageBySubject.get(s);
                return (
                  <tr key={s} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-medium">{s}</td>
                    <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">
                      {entry ? entry.chapter_count.toLocaleString() : "0"}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">
                      {entry ? entry.total_chunks.toLocaleString() : "0"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-4 py-3 border-t border-slate-100 dark:border-slate-800/50 text-xs text-slate-400 dark:text-slate-500">
            No canonical syllabus chapter totals are tracked in the codebase, so only ingested
            counts are shown. See Chapter Ingestion for the per-chapter breakdown.
          </p>
        </div>
      </div>

      {/* ---- Recent activity: last 5 ingestion jobs ---- */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-3">
          Recent Ingestion Jobs
        </h2>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          {recentJobs.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              No ingestion jobs recorded yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Chapter</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((j) => (
                  <tr key={j.id} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-medium">{j.subject}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {j.chapter_number} · {j.chapter_name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusPill status={j.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                      {formatTime(j.completed_at || j.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ---- Admin tools navigation ---- */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-3">
          Admin Tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ADMIN_PAGES.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-teal-600 dark:hover:border-teal-500 transition-colors group"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400">
                {page.title}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{page.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
