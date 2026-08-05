"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { AuthUser } from "@/lib/auth";

const SUBJECT_OPTIONS = ["Biology", "Chemistry", "Physics", "Mathematics", "Computer Science"];
const TEST_OPTIONS = [
  { value: "ECAT", label: "ECAT" },
  { value: "MDCAT", label: "MDCAT" },
  { value: "NET", label: "NUST NET" },
  { value: "FAST", label: "FAST" },
  { value: "Other", label: "Other" },
];

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    age: "",
    subjects: [] as string[],
    interested_tests: [] as string[],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.subjects.length === 0) {
      setError("Select at least one subject");
      return;
    }
    if (form.interested_tests.length === 0) {
      setError("Select at least one entry test");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        phone: form.phone || null,
        age: form.age ? parseInt(form.age, 10) : null,
        subjects: form.subjects,
        interested_tests: form.interested_tests,
      };
      const user = await api.post<AuthUser>("/auth/register", payload);
      login(user);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 dark:focus:border-teal-400 transition-colors";

  const chipClass = (selected: boolean) =>
    `px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${
      selected
        ? "bg-teal-600 dark:bg-teal-500 border-teal-600 dark:border-teal-500 text-white"
        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-300 dark:hover:border-teal-700"
    }`;

  return (
    <div className="min-h-[calc(100dvh-60px)] flex items-center justify-center px-4 bg-slate-50 dark:bg-slate-950 py-8">
      <div className="w-full max-w-[420px] animate-fade-up">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-2">
            Create your account
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-[15px]">
            Start preparing for ECAT and MDCAT today
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Your full name"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 6 characters"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="03001234567"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Age
                </label>
                <input
                  type="number"
                  min={13}
                  max={60}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  placeholder="17"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Which subjects are you studying?
              </label>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-2.5">
                Select all that apply — you can change this later.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_OPTIONS.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => setForm({ ...form, subjects: toggleInList(form.subjects, subject) })}
                    className={chipClass(form.subjects.includes(subject))}
                    aria-pressed={form.subjects.includes(subject)}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Which entry test(s) are you preparing for?
              </label>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-2.5">
                Select all that apply.
              </p>
              <div className="flex flex-wrap gap-2">
                {TEST_OPTIONS.map((test) => (
                  <button
                    key={test.value}
                    type="button"
                    onClick={() => setForm({ ...form, interested_tests: toggleInList(form.interested_tests, test.value) })}
                    className={chipClass(form.interested_tests.includes(test.value))}
                    aria-pressed={form.interested_tests.includes(test.value)}
                  >
                    {test.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/20"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-teal-700 dark:text-teal-400 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}