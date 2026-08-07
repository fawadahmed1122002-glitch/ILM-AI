"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { authStorage } from "@/lib/auth";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";

interface DailyTrendPoint {
  date: string;
  total_attempts: number;
  correct: number;
  accuracy_percent: number;
}

interface SubjectBreakdown {
  subject: string;
  total_attempts: number;
  correct_count: number;
  accuracy_percent: number;
}

interface ActivityPoint {
  date: string;
  attempts: number;
}

interface AnalyticsData {
  daily_trend: DailyTrendPoint[];
  subject_breakdown: SubjectBreakdown[];
  activity: ActivityPoint[];
  current_streak: number;
  longest_streak: number;
}

const SUBJECT_COLORS: Record<string, string> = {
  Biology: "#10b981",
  Chemistry: "#3b82f6",
  Physics: "#f59e0b",
  Mathematics: "#8b5cf6",
  "Computer Science": "#ec4899",
};

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function AccuracyColor(percent: number): string {
  if (percent >= 80) return "text-green-600 dark:text-green-400";
  if (percent >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const token = authStorage.getToken();
    api.get<AnalyticsData>("/query/analytics/me", token || undefined)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load analytics"))
      .finally(() => setDataLoading(false));
  }, [user]);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) return null;

  const hasAnyData = data && (data.daily_trend.length > 0 || data.subject_breakdown.length > 0);

  const trendChartData = data?.daily_trend.map((d) => ({
    ...d,
    label: formatDateShort(d.date),
  })) ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 animate-fade-up">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Analytics
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Your study performance over time
        </p>
      </div>

      {dataLoading && (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-3">Loading analytics...</p>
        </div>
      )}

      {error && !dataLoading && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      {!dataLoading && !error && !hasAnyData && (
        <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No study activity yet. Complete a few MCQ sessions to see your analytics here.
          </p>
        </div>
      )}

      {!dataLoading && !error && data && hasAnyData && (
        <div className="space-y-6">
          {/* Streak summary row */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
                🔥 {data.current_streak}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Current Streak</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 text-center">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                {data.longest_streak}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Longest Streak</p>
            </div>
          </div>

          {/* Accuracy trend line chart */}
          {trendChartData.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Accuracy Trend
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                Last 30 days — days with no activity aren't shown
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
                  <Tooltip
                    formatter={(value) => [`${value ?? 0}%`, "Accuracy"]}
                    contentStyle={{ borderRadius: 8, fontSize: 13 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="accuracy_percent"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#0d9488" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Subject breakdown bar chart */}
          {data.subject_breakdown.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Accuracy by Subject
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                All-time performance
              </p>
              <ResponsiveContainer width="100%" height={Math.max(200, data.subject_breakdown.length * 50)}>
                <BarChart data={data.subject_breakdown} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
                  <YAxis type="category" dataKey="subject" tick={{ fontSize: 12 }} width={110} stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
                  <Tooltip
                    formatter={(value) => [`${value ?? 0}%`, "Accuracy"]}
                    contentStyle={{ borderRadius: 8, fontSize: 13 }}
                  />
                  <Bar dataKey="accuracy_percent" radius={[0, 6, 6, 0]}>
                    {data.subject_breakdown.map((entry, i) => (
                      <Cell key={i} fill={SUBJECT_COLORS[entry.subject] || "#64748b"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Subject detail rows below the chart */}
              <div className="mt-4 space-y-2">
                {data.subject_breakdown.map((s) => (
                  <div key={s.subject} className="flex items-center justify-between text-sm py-2 border-t border-slate-100 dark:border-slate-800 first:border-t-0">
                    <span className="text-slate-600 dark:text-slate-300">{s.subject}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {s.correct_count}/{s.total_attempts} correct
                      </span>
                      <span className={`font-semibold ${AccuracyColor(s.accuracy_percent)}`}>
                        {s.accuracy_percent}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity history */}
          {data.activity.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Activity
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                MCQ sessions per day, last 30 days
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data.activity.map((a) => ({ ...a, label: formatDateShort(a.date) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                  <Bar dataKey="attempts" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}