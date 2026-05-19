"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import RainbowCursor from "@/components/shared/RainbowCursor";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark";

export default function AuthThemeFrame({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const isDark = theme === "dark";

  useEffect(() => {
    const saved = window.localStorage.getItem("studio-auth-theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      return;
    }

    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.body.classList.toggle("dark", isDark);

    return () => {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    };
  }, [isDark]);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      window.localStorage.setItem("studio-auth-theme", next);
      return next;
    });
  }

  return (
    <div
      className={cn(
        isDark && "dark",
        "relative flex min-h-screen items-center justify-center overflow-x-hidden px-4 py-6 text-charcoal-950 transition-colors duration-500 auth-rainbow-cursor",
        "bg-[#f7f5ef] dark:bg-[#11100e] dark:text-white"
      )}
    >
      <RainbowCursor />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(65,185,178,0.18),transparent_34%),radial-gradient(circle_at_12%_86%,rgba(228,169,36,0.14),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.88),rgba(239,237,230,0.72))] transition-opacity duration-500 dark:opacity-0" />
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 dark:opacity-100 dark:bg-[radial-gradient(circle_at_50%_18%,rgba(65,185,178,0.16),transparent_32%),radial-gradient(circle_at_14%_86%,rgba(228,169,36,0.11),transparent_30%),linear-gradient(135deg,rgba(27,25,22,0.95),rgba(14,13,12,0.98))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/80 to-transparent transition-opacity duration-500 dark:from-white/5" />
      <div className="pointer-events-none absolute -left-24 top-24 h-56 w-56 rounded-full border border-charcoal-950/10 transition-colors duration-500 dark:border-white/10" />
      <div className="pointer-events-none absolute -right-28 bottom-16 h-72 w-72 rounded-full border border-[#43b8b2]/20 transition-colors duration-500 dark:border-[#43b8b2]/25" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] transition-opacity duration-500 dark:opacity-[0.055]">
        <div className="h-full w-full bg-[linear-gradient(90deg,#111_1px,transparent_1px),linear-gradient(#111_1px,transparent_1px)] bg-[size:44px_44px] dark:bg-[linear-gradient(90deg,#fff_1px,transparent_1px),linear-gradient(#fff_1px,transparent_1px)]" />
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-charcoal-950/10 bg-white/75 text-charcoal-700 shadow-lg shadow-charcoal-950/10 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-charcoal-950 focus:outline-none focus:ring-2 focus:ring-[#43b8b2]/40 dark:border-white/10 dark:bg-white/10 dark:text-charcoal-200 dark:hover:bg-white/15 dark:hover:text-white"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Light mode" : "Dark mode"}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
