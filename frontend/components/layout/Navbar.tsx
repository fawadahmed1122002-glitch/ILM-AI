"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-[60px] flex items-center justify-between">

        {/* Logo */}
        <Link href={user ? "/dashboard" : "/"} className="no-underline">
          <span className="font-display text-[22px] font-bold text-teal-700 dark:text-teal-400 tracking-tight">
            ILMAI
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-4">

          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
              title="Toggle theme"
            >
              {theme === "dark" ? "L" : "D"}
            </button>
          )}

          {user ? (
            <>
              <Link href="/study"
                className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 transition-colors no-underline">
                Study
              </Link>
              <Link href="/dashboard"
                className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 transition-colors no-underline">
                Dashboard
              </Link>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {user.full_name}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                {user.plan}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login"
                className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 transition-colors no-underline">
                Login
              </Link>
              <Link href="/register"
                className="text-sm font-semibold text-white bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 px-4 py-2 rounded-lg transition-colors no-underline">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
