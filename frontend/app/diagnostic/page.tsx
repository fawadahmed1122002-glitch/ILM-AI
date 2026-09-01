"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { authStorage } from "@/lib/auth";
import { getProduct, DIAGNOSTIC_TRACK_IDS } from "@/lib/products";

// Post-signup diagnostic -- a lightweight track-selection screen shown
// once, right after registration (the register page redirects here).
// Purely personalization: selections reorder/highlight subjects on the
// dashboard and pre-select a matching product on /upgrade, but they
// never restrict free-tier access. Skipping is always allowed and leaves
// target_tracks empty on the backend.
const TRACK_OPTIONS = DIAGNOSTIC_TRACK_IDS.map((id) => ({
  value: id,
  label: getProduct(id)?.name ?? id,
}));

const CLASS_OPTIONS = [
  { value: "11", label: "Class 11" },
  { value: "12", label: "Class 12" },
  { value: "other", label: "Other" },
];

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function DiagnosticPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [tracks, setTracks] = useState<string[]>(user?.target_tracks ?? []);
  const [currentClass, setCurrentClass] = useState<string | null>(user?.current_class ?? null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) {
    router.push("/login");
    return null;
  }

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const token = authStorage.getToken();
      await api.post(
        "/users/me/diagnostic",
        { target_tracks: tracks, current_class: currentClass },
        token || undefined
      );
      // Pull the saved fields back into the session so the dashboard
      // personalization applies immediately without a re-login.
      await refreshUser();
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save your preferences");
      setSaving(false);
    }
  };

  // Skip: no backend call at all -- target_tracks stays NULL/empty and
  // nothing downstream breaks (dashboard/upgrade fall back to defaults).
  const handleSkip = () => router.push("/dashboard");

  const chipClass = (selected: boolean) =>
    `px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${
      selected
        ? "bg-teal-600 dark:bg-teal-500 border-teal-600 dark:border-teal-500 text-white"
        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-300 dark:hover:border-teal-700"
    }`;

  return (
    <div className="min-h-[calc(100dvh-60px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[420px] animate-fade-up">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-2">
            Let&apos;s personalize your prep
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-[15px]">
            Quick setup — you can change this anytime in Settings.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Which test(s) are you preparing for?
              </label>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-2.5">
                Select all that apply — you can change this later.
              </p>
              <div className="flex flex-wrap gap-2">
                {TRACK_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTracks(toggleInList(tracks, option.value))}
                    className={chipClass(tracks.includes(option.value))}
                    aria-pressed={tracks.includes(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                What class are you in?
              </label>
              <div className="flex flex-wrap gap-2">
                {CLASS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCurrentClass(currentClass === option.value ? null : option.value)}
                    className={chipClass(currentClass === option.value)}
                    aria-pressed={currentClass === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/20"
            >
              {saving ? "Saving..." : "Save & Continue"}
            </button>

            <button
              type="button"
              onClick={handleSkip}
              disabled={saving}
              className="w-full py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors bg-transparent border-none cursor-pointer disabled:opacity-50"
            >
              Skip for now — I&apos;ll explore first
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-5">
          This only personalizes your experience — it never limits what you can study.
        </p>
      </div>
    </div>
  );
}
