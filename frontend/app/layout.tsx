import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "ILMAI — AI Tutor for ECAT and MDCAT",
  description: "Pakistan's first bilingual AI-powered exam preparation platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <ThemeProvider attribute="class" defaultTheme="light">
          <AuthProvider>
            <Navbar />
            <main className="min-h-[calc(100vh-60px)]">
              {children}
            </main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
