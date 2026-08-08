"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

interface VerifyEmailResponse {
  success: boolean;
  message: string;
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { refreshUser, user } = useAuth();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    api.get<VerifyEmailResponse>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        setStatus(res.success ? "success" : "error");
        setMessage(res.message);
        // If the person is currently logged in on this device, refresh
        // their session so is_email_verified flips immediately -- no need
        // to log out/in again to see full access unlocked.
        if (res.success && user) {
          await refreshUser();
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong while verifying your email. Please try again.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-[calc(100dvh-60px)] flex items-center justify-center px-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-[420px] text-center animate-fade-up">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
          {status === "loading" && (
            <>
              <div className="inline-block w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">Verifying your email...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Email Verified!
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{message}</p>
              <Link
                href="/dashboard"
                className="inline-block w-full py-3 px-4 bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors no-underline"
              >
                Go to Dashboard
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">×</span>
              </div>
              <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Verification Failed
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{message}</p>
              <Link
                href="/dashboard"
                className="inline-block w-full py-3 px-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors no-underline"
              >
                Back to Dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}