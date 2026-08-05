"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { authStorage } from "@/lib/auth";

interface ProgressData {
  current_streak: number;
  longest_streak: number;
}

// Persistent streak indicator, fixed to the top-right corner on desktop.
// Self-contained: fetches its own data rather than relying on individual
// pages to pass it down, so it shows consistently across every
// authenticated page (not just Dashboard) without per-page wiring.
//
// Desktop only (lg:flex) -- on mobile this would collide with the existing
// top bar's logo + hamburger menu (see Sidebar.tsx). Dashboard's own
// streak banner remains the mobile-visible version for now.
export default function StreakBadge() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const token = authStorage.getToken();
    api.get<ProgressData>("/query/progress/me", token || undefined)
      .then((data) => setStreak(data.current_streak))
      .catch(() => setStreak(null));
  }, [user]);

  if (!user || !streak || streak < 1) return null;

  return (
    <div className="hidden lg:flex fixed top-4 right-4 z-30 items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/40 border border-orange-200 dark:border-orange-900 shadow-sm">
      <span className="text-sm">🔥</span>
      <span className="text-sm font-bold text-orange-700 dark:text-orange-400">
        {streak}
      </span>
      <span className="text-xs text-orange-600 dark:text-orange-500">
        day{streak !== 1 ? "s" : ""}
      </span>
    </div>
  );
}