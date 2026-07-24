"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[60px] flex items-center justify-between">

        {/* Logo */}
        <Link href={user ? "/dashboard" : "/"} className="no-underline flex items-center gap-2 flex-shrink-0" onClick={() => setMenuOpen(false)}>
          <Image src="/pxm-logo.png" alt="PrepXMentor" width={32} height={32} className="w-8 h-8" priority />
          <span className="font-display text-[20px] sm:text-[22px] font-bold text-teal-700 dark:text-teal-400 tracking-tight">
            PrepXMentor
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-5 mx-4">
          <Link href="/universities"
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 transition-colors no-underline whitespace-nowrap">
            Universities
          </Link>
          <Link href="/merit-calculator"
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 transition-colors no-underline whitespace-nowrap">
            Merit Calculator
          </Link>
          <Link href="/blog"
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 transition-colors no-underline whitespace-nowrap">
            Blog
          </Link>
          <Link href="/contact"
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 transition-colors no-underline whitespace-nowrap">
            Contact us
          </Link>
        </div>

        {/* Desktop right side */}
        <div className="hidden lg:flex items-center gap-4 flex-shrink-0">

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
              <span className="text-sm text-slate-500 dark:text-slate-400 max-w-[100px] truncate">
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

        {/* Mobile/tablet right side: theme toggle + hamburger */}
        <div className="flex lg:hidden items-center gap-2">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium"
              title="Toggle theme"
            >
              {theme === "dark" ? "L" : "D"}
            </button>
          )}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <span className="text-lg leading-none">×</span>
            ) : (
              <span className="flex flex-col gap-1">
                <span className="block w-4 h-0.5 bg-current" />
                <span className="block w-4 h-0.5 bg-current" />
                <span className="block w-4 h-0.5 bg-current" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile/tablet dropdown panel */}
      {menuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-3">
          <Link href="/universities" onClick={() => setMenuOpen(false)}
            className="block text-sm font-medium text-slate-600 dark:text-slate-300 py-2 no-underline">
            Universities
          </Link>
          <Link href="/merit-calculator" onClick={() => setMenuOpen(false)}
            className="block text-sm font-medium text-slate-600 dark:text-slate-300 py-2 no-underline">
            Merit Calculator
          </Link>
          <Link href="/blog" onClick={() => setMenuOpen(false)}
            className="block text-sm font-medium text-slate-600 dark:text-slate-300 py-2 no-underline">
            Blog
          </Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)}
            className="block text-sm font-medium text-slate-600 dark:text-slate-300 py-2 no-underline">
            Contact us
          </Link>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            {user ? (
              <>
                <div className="flex items-center justify-between pb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{user.full_name}</span>
                  <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex-shrink-0 ml-2">
                    {user.plan}
                  </span>
                </div>
                <Link href="/study" onClick={() => setMenuOpen(false)}
                  className="block text-sm font-medium text-slate-600 dark:text-slate-300 py-2 no-underline">
                  Study
                </Link>
                <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                  className="block text-sm font-medium text-slate-600 dark:text-slate-300 py-2 no-underline">
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left text-sm text-red-500 dark:text-red-400 py-2 bg-transparent border-none cursor-pointer"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)}
                  className="block text-sm font-medium text-slate-600 dark:text-slate-300 py-2 no-underline">
                  Login
                </Link>
                <Link href="/register" onClick={() => setMenuOpen(false)}
                  className="block text-center text-sm font-semibold text-white bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 px-4 py-2.5 rounded-lg transition-colors no-underline mt-2">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}