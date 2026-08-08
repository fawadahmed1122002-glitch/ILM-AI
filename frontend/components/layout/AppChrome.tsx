"use client";

import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import StreakBadge from "@/components/layout/StreakBadge";
import EmailVerificationBanner from "@/components/layout/EmailVerificationBanner";

// Decides which layout chrome to render:
// - Logged out (or still loading auth state): public top Navbar + Footer,
//   exactly as before.
// - Logged in: authenticated Sidebar (collapsible), no Footer.
//
// While `loading` is true we default to the public Navbar rather than
// showing nothing, to avoid a blank-shell flash on first paint -- if the
// user turns out to be logged in, this swaps to the Sidebar as soon as
// AuthProvider resolves (typically near-instant, since it reads from
// localStorage first before any network call).
export default function AppChrome({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return (
      <SidebarProvider>
        <AuthedShell>{children}</AuthedShell>
      </SidebarProvider>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-60px)]">
        {children}
      </main>
      <Footer />
    </>
  );
}

// Separate inner component so it can read the collapsed state from
// SidebarContext (useSidebar must be called from inside SidebarProvider).
function AuthedShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <>
      <Sidebar />
      <StreakBadge />
      {/* Desktop padding tracks the sidebar's current width (w-64 expanded,
          w-16 collapsed). Mobile has no left offset since Sidebar renders
          as a top bar there instead of a fixed rail. */}
      <main className={`min-h-screen transition-all duration-200 ${collapsed ? "lg:pl-16" : "lg:pl-64"}`}>
        <EmailVerificationBanner />
        {children}
      </main>
    </>
  );
}