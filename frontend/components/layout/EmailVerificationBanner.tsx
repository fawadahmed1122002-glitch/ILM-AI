"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

interface ResendResponse {
  success: boolean;
  message: string;
}

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  if (!user || user.is_email_verified || dismissed) return null;

  // Register response flagged the signup email as unsent -- tell the
  // student up front instead of leaving them waiting for a missing email.
  const sendFailedAtSignup = user.verification_email_sent === false;

  const handleResend = async () => {
    setSending(true);
    setError("");
    try {
      const res = await api.post<ResendResponse>("/auth/resend-verification", { email: user.email });
      if (res.success) setSent(true);
      else setError(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 px-4 py-3">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          {sent
            ? "Verification email sent — check your inbox (and spam folder)."
            : sendFailedAtSignup
            ? "We couldn't send your verification email during signup — use Resend below to try again."
            : "Please verify your email to unlock unlimited access on your plan."}
        </p>
        <div className="flex items-center gap-3 flex-shrink-0">
          {!sent && (
            <button
              onClick={handleResend}
              disabled={sending}
              className="text-xs font-semibold text-amber-800 dark:text-amber-300 underline hover:no-underline disabled:opacity-50"
            >
              {sending ? "Sending..." : "Resend email"}
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="text-xs text-amber-600 dark:text-amber-500 hover:text-amber-800 dark:hover:text-amber-300"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
      {error && (
        <p className="max-w-4xl mx-auto text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}