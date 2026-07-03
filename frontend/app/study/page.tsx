"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { authStorage } from "@/lib/auth";

const SUBJECTS = [
  "Biology",
  "Chemistry",
  "Physics",
  "Mathematics",
  "Computer Science",
];

interface ExplainResponse {
  explanation: string;
  normalized_query: string;
  subject: string;
  cached: boolean;
}

function parseExplanation(raw: string) {
  const sections: Record<string, string> = {};
  const patterns = [
    { key: "english", label: "ENGLISH" },
    { key: "urdu", label: "URDU" },
    { key: "keyPoint", label: "KEY EXAM POINT" },
    { key: "example", label: "REAL-LIFE EXAMPLE" },
  ];

  for (let i = 0; i < patterns.length; i++) {
    const start = raw.indexOf(`${patterns[i].label}:`);
    if (start === -1) continue;
    const contentStart = start + patterns[i].label.length + 1;
    const nextPattern = patterns[i + 1]
      ? raw.indexOf(`${patterns[i + 1].label}:`)
      : -1;
    const content =
      nextPattern !== -1
        ? raw.slice(contentStart, nextPattern)
        : raw.slice(contentStart);
    sections[patterns[i].key] = content.trim();
  }
  return sections;
}

export default function StudyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [subject, setSubject] = useState("Biology");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ExplainResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setError("");
    setResult(null);
    setIsLoading(true);

    try {
      const token = authStorage.getToken();
      const data = await api.post<ExplainResponse>(
        "/query/explain",
        { subject, query: query.trim() },
        token || undefined
      );
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const sections = result ? parseExplanation(result.explanation) : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Study</h1>
        <p className="text-gray-500 text-sm mt-1">
          Ask any topic in English or Roman Urdu
        </p>
      </div>

      {/* Query Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        {/* Subject Selector */}
        <div className="flex gap-2 flex-wrap">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSubject(s)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                subject === s
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Query Input */}
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Ask about ${subject}... (English ya Roman Urdu mein)`}
            maxLength={500}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "..." : "Ask"}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm mt-3">
            Generating explanation...
          </p>
        </div>
      )}

      {/* Result */}
      {sections && !isLoading && (
        <div className="space-y-4">
          {/* Cache badge */}
          {result?.cached && (
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              ⚡ Cached response
            </span>
          )}

          {/* English Explanation */}
          {sections.english && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                English
              </h3>
              <p className="text-gray-800 text-sm leading-relaxed">
                {sections.english}
              </p>
            </div>
          )}

          {/* Urdu Explanation */}
          {sections.urdu && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                اردو
              </h3>
              <p
                className="text-gray-800 text-sm leading-relaxed text-right"
                dir="rtl"
              >
                {sections.urdu}
              </p>
            </div>
          )}

          {/* Key Exam Point */}
          {sections.keyPoint && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                🎯 Key Exam Point
              </h3>
              <p className="text-amber-900 text-sm font-medium">
                {sections.keyPoint}
              </p>
            </div>
          )}

          {/* Real-life Example */}
          {sections.example && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                💡 Real-Life Example
              </h3>
              <p className="text-blue-900 text-sm">{sections.example}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}