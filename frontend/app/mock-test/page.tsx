"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { authStorage } from "@/lib/auth";

interface CompositionState {
  runnable: boolean;
  reason: string | null;
  question_count: number;
  nominal_question_count: number;
  available_percent: number;
  time_limit_minutes: number;
  nominal_time_limit_minutes: number;
  missing_subjects: string[];
}

interface Availability {
  subjects: Record<string, number>;
  single_subject: Record<string, CompositionState>;
  min_runnable_percent: number;
  full_ecat: CompositionState;
  full_mdcat: CompositionState;
  has_used_free_test: boolean;
}

interface MockTestStartResponse {
  id: string;
  test_type: string;
  subject: string | null;
  question_count: number;
  time_limit_minutes: number;
}

const SUBJECTS = ["Biology", "Chemistry", "Physics", "Mathematics", "Computer Science"];

export default function MockTestSetupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const fetchAvailability = async () => {
      setAvailabilityLoading(true);
      try {
        const token = authStorage.getToken();
        const data = await api.get<Availability>("/mock-tests/availability", token || undefined);
        setAvailability(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load availability");
      } finally {
        setAvailabilityLoading(false);
      }
    };
    fetchAvailability();
  }, [user]);

  const isPro = user?.plan === "pro";
  const freeTestUsed = availability?.has_used_free_test && !isPro;

  const startTest = async (test_type: string, subject?: string) => {
    setError("");
    setStarting(true);
    try {
      const token = authStorage.getToken();
      const data = await api.post<MockTestStartResponse>(
        "/mock-tests/start",
        { test_type, subject },
        token || undefined
      );
      router.push(`/mock-test/${data.id}/take`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "MOCK_TEST_LIMIT_REACHED") {
        setError("LIMIT_REACHED");
      } else {
        setError(err instanceof Error ? err.message : "Failed to start test");
      }
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) return null;

  const selectedSingle = selectedSubject ? availability?.single_subject?.[selectedSubject] : undefined;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Mock Test
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Timed practice tests that simulate the real exam
        </p>
      </div>

      {freeTestUsed && (
        <div className="mb-6 p-5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
            Free mock test used
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
            Free plan includes 1 mock test. Upgrade to Pro for unlimited mock tests.
          </p>
          <a
            href="/upgrade"
            className="inline-block px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors no-underline"
          >
            Upgrade to Pro — PKR 799/mo
          </a>
        </div>
      )}

      {error && error !== "LIMIT_REACHED" && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      {availabilityLoading && (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {availability && !availabilityLoading && (
        <div className="space-y-6">
          {/* Full-length tests */}
          <div>
            <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">
              Full-Length Tests
            </h2>
            <div className="space-y-3">
              {(
                [
                  { key: "full_ecat", label: "Full ECAT Test", data: availability.full_ecat },
                  { key: "full_mdcat", label: "Full MDCAT Test", data: availability.full_mdcat },
                ] as const
              ).map(({ key, label, data }) => {
                const disabled = !data.runnable || freeTestUsed || starting;
                const partial = data.question_count < data.nominal_question_count;
                return (
                  <div
                    key={key}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{label}</h3>
                      {!data.runnable && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                          Not available yet
                        </span>
                      )}
                    </div>
                    {data.runnable ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                        {data.question_count} questions · {data.time_limit_minutes} min
                        {partial && (
                          <span className="text-amber-600 dark:text-amber-400">
                            {" "}
                            — partial test: {data.question_count} of {data.nominal_question_count}{" "}
                            questions available ({data.available_percent}%), so the timer is{" "}
                            {data.time_limit_minutes} min instead of {data.nominal_time_limit_minutes}
                            {data.missing_subjects?.length > 0 &&
                              ` · ${data.missing_subjects.join(", ")} not stocked yet`}
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                        <span className="text-amber-600 dark:text-amber-400">
                          Only {data.question_count} of {data.nominal_question_count} questions
                          available ({data.available_percent}%) — below the{" "}
                          {availability.min_runnable_percent}% needed to run a meaningful test.
                          More content coming soon.
                        </span>
                      </p>
                    )}
                    <button
                      onClick={() => startTest(key)}
                      disabled={disabled}
                      className="w-full py-2.5 bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {starting ? "Starting..." : "Start Test"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Single subject */}
          <div>
            <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">
              Single Subject
            </h2>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <div className="flex gap-2 flex-wrap mb-4">
                {SUBJECTS.map((s) => {
                  const runnable = availability.single_subject?.[s]?.runnable ?? false;
                  return (
                    <button
                      key={s}
                      onClick={() => runnable && setSelectedSubject(s)}
                      disabled={!runnable}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        selectedSubject === s
                          ? "bg-teal-700 dark:bg-teal-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {s}
                      {!runnable && <span className="ml-1 text-xs">(soon)</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                {selectedSingle
                  ? `${selectedSingle.question_count} questions · ${selectedSingle.time_limit_minutes} minutes`
                  : "25 questions · 30 minutes"}
                {selectedSingle && selectedSingle.question_count < selectedSingle.nominal_question_count && (
                  <span className="text-amber-600 dark:text-amber-400">
                    {" "}
                    — partial test: {selectedSingle.question_count} of{" "}
                    {selectedSingle.nominal_question_count} questions available, so the timer is{" "}
                    {selectedSingle.time_limit_minutes} min instead of{" "}
                    {selectedSingle.nominal_time_limit_minutes}
                  </span>
                )}
              </p>
              <button
                onClick={() => selectedSubject && startTest("subject", selectedSubject)}
                disabled={!selectedSubject || freeTestUsed || starting}
                className="w-full py-2.5 bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {starting ? "Starting..." : selectedSubject ? `Start ${selectedSubject} Test` : "Pick a subject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}