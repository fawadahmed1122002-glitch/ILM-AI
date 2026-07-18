"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

const JAZZCASH_LINK = "https://payment.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform";
const EASYPAISA_LINK = "https://easypaisa.com.pk";
const WHATSAPP_NUMBER = "923001234567";

export default function UpgradePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user?.plan === "pro") router.push("/dashboard");
  }, [user, loading, router]);

  if (loading || !user) return null;

  const whatsappMessage = encodeURIComponent(
    `Assalamu Alaikum, I want to upgrade my PrepXMentor account to Pro. My email is: ${user.email}`
  );

  return (
    <div className="min-h-[calc(100dvh-60px)] bg-slate-50 dark:bg-slate-950 px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto animate-fade-up">

        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-block px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
            Upgrade to Pro
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-3">
            Unlock unlimited preparation
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg">
            PKR 799/month — less than a single academy session
          </p>
        </div>

        {/* Plan comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Free */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Free
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              PKR 0
            </div>
            <ul className="space-y-2.5 text-sm">
              {[
                "3 topic explanations / day",
                "5 MCQ sessions / day",
                "English only",
                "Basic progress tracking",
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <span className="text-slate-300 dark:text-slate-600">—</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="bg-teal-700 dark:bg-teal-800 border border-teal-600 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-bl-xl">
              BEST VALUE
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-teal-300 mb-3">
              Pro
            </div>
            <div className="text-2xl font-bold text-white mb-4">
              PKR 799 <span className="text-sm font-normal text-teal-300">/ month</span>
            </div>
            <ul className="space-y-2.5 text-sm">
              {[
                "Unlimited topic explanations",
                "Unlimited MCQ practice",
                "Bilingual (English + Urdu)",
                "Full progress dashboard",
                "Weak topic detection",
                "Priority support",
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-white">
                  <span className="text-teal-300 font-bold">+</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Payment instructions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
            How to upgrade
          </h2>
          <ol className="space-y-3">
            {[
              "Send PKR 799 via JazzCash or EasyPaisa to the number below",
              "Send your payment screenshot on WhatsApp",
              "Your account will be upgraded within 2 hours",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <div className="mt-5 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Send payment to</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
              0300-1234567
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              JazzCash or EasyPaisa — account name: PrepXMentor
            </p>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="space-y-3">
          <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/20">
            Send Payment Confirmation on WhatsApp
          </a>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a href={JAZZCASH_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center py-3 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-all hover:-translate-y-0.5">
              Pay via JazzCash
            </a>
            <a href={EASYPAISA_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center py-3 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-all hover:-translate-y-0.5">
              Pay via EasyPaisa
            </a>
          </div>

          <Link href="/dashboard" className="flex items-center justify-center w-full py-3 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors no-underline">
            Continue with free plan
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          Questions? Contact us on WhatsApp at 0300-1234567
        </p>
      </div>
    </div>
  );
}
