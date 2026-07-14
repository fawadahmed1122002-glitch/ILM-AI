"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { authStorage } from "@/lib/auth";

interface TopicStat {
  subject: string;
  topic: string;
  total_attempts: number;
  correct_count: number;
  score_percent: number;
  weak_topic: boolean;
  last_attempt_at: string | null;
}

interface ProgressData {
  topics: TopicStat[];
  total_sessions: number;
  weak_topics: TopicStat[];
}

function AccuracyBadge({ score }: { score: number }) {
  if (score >= 80) return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      {score}%
    </span>
  );
  if (score >= 60) return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      {score}%
    </span>
  );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
      {score}%
    </span>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const token = authStorage.getToken();
    api.get<ProgressData>("/query/progress/me", token || undefined)
      .then(setProgress)
      .catch(console.error)
      .finally(() => setProgressLoading(false));
  }, [user]);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) return null;

  const avgScore = progress?.topics.length
    ? Math.round(progress.topics.reduce((sum, t) => sum + t.score_percent, 0) / progress.topics.length)
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 animate-fade-up">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight break-words">
          Welcome, {user.full_name}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Plan: <span className="font-medium text-teal-600 dark:text-teal-400 uppercase">{user.plan}</span>
        </p>
      </div>

      {/* Weak Topic Alert */}
      {progress && progress.weak_topics.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
            Weak Topics — Need More Practice
          </h3>
          <div className="flex flex-wrap gap-2">
            {progress.weak_topics.map((t, i) => (
              <span key={i} className="text-xs bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 px-3 py-1 rounded-full">
                {t.subject}: {t.topic} ({t.score_percent}%)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-5 shadow-sm text-center">
          <p className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            {progressLoading ? "—" : progress?.total_sessions || 0}
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">Topics Studied</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-5 shadow-sm text-center">
          <p className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            {progressLoading ? "—" : avgScore > 0 ? `${avgScore}%` : "—"}
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">Avg Accuracy</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-5 shadow-sm text-center">
          <p className="text-xl sm:text-3xl font-bold text-red-500 dark:text-red-400">
            {progressLoading ? "—" : progress?.weak_topics.length || 0}
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">Weak Topics</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link href="/study"
          className="p-5 bg-teal-700 rounded-2xl text-white hover:bg-teal-600 transition-colors">
          <h3 className="font-semibold">Start Studying</h3>
          <p className="text-sm text-teal-100 mt-1">Ask any topic in English or Roman Urdu</p>
        </Link>
        <div className={`p-5 rounded-2xl border ${
          user.plan === "free"
            ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        }`}>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {user.plan === "free" ? "Upgrade to Pro" : "Pro Member"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {user.plan === "free"
              ? "Unlimited topics + MCQs for PKR 799/mo"
              : "Enjoy unlimited access"}
          </p>
          {user.plan === "free" && (
            <Link href="/upgrade"
              className="inline-block mt-3 text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors">
              Upgrade Now
            </Link>
          )}
        </div>
      </div>

      {/* Topic History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Study History</h2>
        </div>

        {progressLoading ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">Loading progress...</div>
        ) : !progress || progress.topics.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-400 dark:text-slate-500 text-sm">No topics studied yet.</p>
            <Link href="/study"
              className="inline-block mt-3 text-sm text-teal-600 dark:text-teal-400 hover:underline">
              Start your first study session →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Topic</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Attempts</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Correct</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Accuracy</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {progress.topics.map((topic, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{topic.subject}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100 max-w-xs truncate">
                      {topic.topic}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 text-center">{topic.total_attempts}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 text-center">{topic.correct_count}</td>
                    <td className="px-6 py-4 text-center">
                      <AccuracyBadge score={topic.score_percent} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      {topic.weak_topic ? (
                        <span className="text-xs text-red-600 dark:text-red-400">Weak</span>
                      ) : (
                        <span className="text-xs text-green-600 dark:text-green-400">Good</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}