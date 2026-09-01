"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { authStorage } from "@/lib/auth";
import { getProduct, DIAGNOSTIC_TRACK_IDS } from "@/lib/products";

// Settings page -- lets a student change their diagnostic (target tracks
// + current class) at any time. Reuses the same POST /users/me/diagnostic
// endpoint as the post-signup screen, so the choice is never one-time.
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

export default function SettingsPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [tracks, setTracks] = useState<string[]>(user?.target_tracks ?? []);
  const [currentClass, setCurrentClass] = useState<string | null>(user?.current_class ?? null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!user) {
    router.push("/login");
    return null;
  }

  const handleSave = async () => {
    setMessage(null);
    setSaving(true);
    try {
      const token = authStorage.getToken();
      await api.post(
        "/users/me/diagnostic",
        { target_tracks: tracks, current_class: currentClass },
        token || undefined
      );
      await refreshUser();
      setMessage({ kind: "success", text: "Preferences saved." });
    } catch (err: unknown) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Failed to save your preferences",
      });
    } finally {
      setSaving(false);
    }
  };

  const chipClass = (selected: boolean) =>
    `px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${
      selected
        ? "bg-teal-600 dark:bg-teal-500 border-teal-600 dark:border-teal-500 text-white"
        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-300 dark:hover:border-teal-700"
    }`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 animate-fade-up">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Settings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Manage your account and test-prep preferences
        </p>
      </div>

      {/* Account info (read-only) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Account</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">Name</dt>
            <dd className="text-slate-900 dark:text-slate-100 font-medium text-right break-all">{user.full_name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">Email</dt>
            <dd className="text-slate-900 dark:text-slate-100 font-medium text-right break-all">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">Plan</dt>
            <dd className="text-teal-600 dark:text-teal-400 font-semibold uppercase">{user.plan}</dd>
          </div>
        </dl>
      </div>

      {/* Diagnostic preferences */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Test-prep preferences</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">
          These personalize your dashboard and upgrade suggestions — they never limit what you can study.
        </p>

        {message && (
          <div
            className={`mb-5 px-4 py-3 rounded-lg text-sm border ${
              message.kind === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400"
                : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Which test(s) are you preparing for?
            </label>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-2.5">
              Select all that apply — leave empty if you&apos;re just exploring.
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
            className="w-full sm:w-auto py-3 px-6 bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/20"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
