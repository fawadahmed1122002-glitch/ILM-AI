"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSidebar } from "@/context/SidebarContext";

// Authenticated-app sidebar. Rendered instead of the public Navbar once a
// user is logged in (see AppChrome.tsx). Desktop: fixed left rail,
// collapsible to an icon-only strip. Mobile: top bar + slide-out drawer
// (drawer is always full-width when open -- collapse only applies to the
// desktop rail, since a "collapsed" mobile drawer doesn't make sense).
//
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", short: "D" },
  { href: "/study", label: "Study", short: "S" },
  { href: "/mock-test", label: "Mock Test", short: "M" },
  { href: "/past-papers", label: "Past Papers", short: "P" },
  { href: "/analytics", label: "Analytics", short: "A" },
  { href: "/settings", label: "Settings", short: "Se" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { collapsed, toggle } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleLogout = () => {
    setDrawerOpen(false);
    logout();
    router.push("/login");
  };

  if (!user) return null;

  const navLinkClass = (href: string) => {
    const active = pathname === href;
    return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors ${
      active
        ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400"
        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
    }`;
  };

  const NavLinks = ({ showLabels }: { showLabels: boolean }) => (
    <>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setDrawerOpen(false)}
          title={showLabels ? undefined : item.label}
          className={navLinkClass(item.href)}
        >
          <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
            {item.short}
          </span>
          {showLabels && <span className="truncate">{item.label}</span>}
        </Link>
      ))}
    </>
  );

  const UserBlock = ({ showLabels }: { showLabels: boolean }) => (
    <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
      {showLabels ? (
        <div className="flex items-center justify-between px-3 mb-3">
          <span className="text-sm text-slate-600 dark:text-slate-300 truncate">
            {user.full_name}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800 flex-shrink-0 ml-2">
            {user.plan}
          </span>
        </div>
      ) : (
        <div className="flex justify-center mb-3" title={`${user.full_name} — ${user.plan}`}>
          <span className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-bold">
            {user.full_name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {mounted && (
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={showLabels ? undefined : (theme === "dark" ? "Light mode" : "Dark mode")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${!showLabels ? "justify-center" : ""}`}
        >
          {showLabels ? (theme === "dark" ? "Light mode" : "Dark mode") : (theme === "dark" ? "L" : "D")}
        </button>
      )}

      <button
        onClick={handleLogout}
        title={showLabels ? undefined : "Sign out"}
        className={`w-full text-left px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-transparent border-none cursor-pointer ${!showLabels ? "text-center" : ""}`}
      >
        {showLabels ? "Sign out" : "×"}
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop: fixed left rail, collapsible */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:border-r lg:border-slate-200 lg:dark:border-slate-800 lg:bg-white lg:dark:bg-slate-900 lg:py-6 lg:z-40 transition-all duration-200 ${
          collapsed ? "lg:w-16 lg:px-2" : "lg:w-64 lg:px-4"
        }`}
      >
        <div className={`flex items-center mb-6 ${collapsed ? "justify-center px-0" : "gap-2 px-3"}`}>
          <Link href="/dashboard" className="flex items-center gap-2 no-underline">
            <Image src="/pxm-logo.png" alt="PrepXMentor" width={28} height={28} className="w-7 h-7 flex-shrink-0" priority />
            {!collapsed && (
              <span className="font-display text-lg font-bold tracking-tight text-teal-700 dark:text-teal-400 whitespace-nowrap">
                PrepXMentor
              </span>
            )}
          </Link>
        </div>

        <nav className="flex-1 space-y-1">
          <NavLinks showLabels={!collapsed} />
        </nav>

        <UserBlock showLabels={!collapsed} />

        {/* Collapse/expand toggle */}
        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
        >
          {collapsed ? "»" : "« Collapse"}
        </button>
      </aside>

      {/* Mobile: top bar (no collapse -- drawer is always full width when open) */}
      <div className="lg:hidden sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="h-[60px] px-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 no-underline" onClick={() => setDrawerOpen(false)}>
            <Image src="/pxm-logo.png" alt="PrepXMentor" width={28} height={28} className="w-7 h-7" priority />
            <span className="font-display text-lg font-bold tracking-tight text-teal-700 dark:text-teal-400">
              PrepXMentor
            </span>
          </Link>
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            aria-label="Toggle menu"
          >
            {drawerOpen ? (
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

        {/* Mobile drawer panel -- always shows full labels */}
        {drawerOpen && (
          <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-4 bg-white dark:bg-slate-900">
            <nav className="space-y-1">
              <NavLinks showLabels={true} />
            </nav>
            <UserBlock showLabels={true} />
          </div>
        )}
      </div>
    </>
  );
}