"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  // The landing page's hero is unconditionally dark (bg-slate-950), independent
  // of the site's light/dark theme toggle -- so the navbar needs its own dark
  // variant here regardless of `theme`, rather than relying on the usual
  // `dark:` classes which only respond to the user's actual theme preference.
  // Every other route keeps its existing light/theme-aware styling untouched.
  const onLanding = pathname === "/";

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    router.push("/login");
  };

  const navShell = onLanding
    ? "border-white/10 bg-slate-950/70"
    : "border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80";

  const logoText = onLanding ? "text-teal-400" : "text-teal-700 dark:text-teal-400";

  const navLink = onLanding
    ? "text-slate-300 hover:text-white"
    : "text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400";

  const themeToggleBtn = onLanding
    ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700";

  const mutedText = onLanding ? "text-slate-400" : "text-slate-500 dark:text-slate-400";

  const planBadge = onLanding
    ? "bg-teal-500/10 text-teal-400 border-teal-500/30"
    : "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800";

  const signOutText = onLanding
    ? "text-slate-400 hover:text-rose-400"
    : "text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400";

  const ctaBtn = onLanding
    ? "text-slate-950 bg-teal-500 hover:bg-teal-400"
    : "text-white bg-teal-700 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500";

  const mobileMenuPanel = onLanding
    ? "border-white/10 bg-slate-950"
    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";

  const mobileDivider = onLanding ? "border-white/10" : "border-slate-100 dark:border-slate-800";

  return (
    <nav className={`sticky top-0 z-50 border-b backdrop-blur-md transition-colors ${navShell}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[60px] flex items-center justify-between">

        {/* Logo */}
        <Link href={user ? "/dashboard" : "/"} className="no-underline flex items-center gap-2 flex-shrink-0" onClick={() => setMenuOpen(false)}>
          <Image src="/pxm-logo.png" alt="PrepXMentor" width={32} height={32} className="w-8 h-8" priority />
          <span className={`font-display text-[20px] sm:text-[22px] font-bold tracking-tight ${logoText}`}>
            PrepXMentor
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-5 mx-4">
          <Link href="/universities" className={`text-sm font-medium transition-colors no-underline whitespace-nowrap ${navLink}`}>
            Universities
          </Link>
          <Link href="/merit-calculator" className={`text-sm font-medium transition-colors no-underline whitespace-nowrap ${navLink}`}>
            Merit Calculator
          </Link>
          <Link href="/blog" className={`text-sm font-medium transition-colors no-underline whitespace-nowrap ${navLink}`}>
            Blog
          </Link>
          <Link href="/contact" className={`text-sm font-medium transition-colors no-underline whitespace-nowrap ${navLink}`}>
            Contact us
          </Link>
        </div>

        {/* Desktop right side */}
        <div className="hidden lg:flex items-center gap-4 flex-shrink-0">

          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors text-sm font-medium ${themeToggleBtn}`}
              title="Toggle theme"
            >
              {theme === "dark" ? "L" : "D"}
            </button>
          )}

          {user ? (
            <>
              <Link href="/study" className={`text-sm font-medium transition-colors no-underline ${navLink}`}>
                Study
              </Link>
              <Link href="/dashboard" className={`text-sm font-medium transition-colors no-underline ${navLink}`}>
                Dashboard
              </Link>
              <span className={`text-sm max-w-[100px] truncate ${mutedText}`}>
                {user.full_name}
              </span>
              <span className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${planBadge}`}>
                {user.plan}
              </span>
              <button
                onClick={handleLogout}
                className={`text-sm transition-colors bg-transparent border-none cursor-pointer ${signOutText}`}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={`text-sm font-medium transition-colors no-underline ${navLink}`}>
                Login
              </Link>
              <Link href="/register" className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors no-underline ${ctaBtn}`}>
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
              className={`w-9 h-9 flex items-center justify-center rounded-lg border text-sm font-medium ${themeToggleBtn}`}
              title="Toggle theme"
            >
              {theme === "dark" ? "L" : "D"}
            </button>
          )}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`w-9 h-9 flex items-center justify-center rounded-lg border ${themeToggleBtn}`}
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
        <div className={`lg:hidden border-t px-4 py-4 space-y-3 ${mobileMenuPanel}`}>
          <Link href="/universities" onClick={() => setMenuOpen(false)} className={`block text-sm font-medium py-2 no-underline ${navLink}`}>
            Universities
          </Link>
          <Link href="/merit-calculator" onClick={() => setMenuOpen(false)} className={`block text-sm font-medium py-2 no-underline ${navLink}`}>
            Merit Calculator
          </Link>
          <Link href="/blog" onClick={() => setMenuOpen(false)} className={`block text-sm font-medium py-2 no-underline ${navLink}`}>
            Blog
          </Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)} className={`block text-sm font-medium py-2 no-underline ${navLink}`}>
            Contact us
          </Link>

          <div className={`border-t pt-3 ${mobileDivider}`}>
            {user ? (
              <>
                <div className="flex items-center justify-between pb-2">
                  <span className={`text-sm truncate ${navLink}`}>{user.full_name}</span>
                  <span className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border flex-shrink-0 ml-2 ${planBadge}`}>
                    {user.plan}
                  </span>
                </div>
                <Link href="/study" onClick={() => setMenuOpen(false)} className={`block text-sm font-medium py-2 no-underline ${navLink}`}>
                  Study
                </Link>
                <Link href="/dashboard" onClick={() => setMenuOpen(false)} className={`block text-sm font-medium py-2 no-underline ${navLink}`}>
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className={`block w-full text-left text-sm py-2 bg-transparent border-none cursor-pointer ${signOutText}`}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)} className={`block text-sm font-medium py-2 no-underline ${navLink}`}>
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className={`block text-center text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors no-underline mt-2 ${ctaBtn}`}
                >
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