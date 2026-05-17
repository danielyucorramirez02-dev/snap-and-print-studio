"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Camera, Wand2, Flame, CheckCircle2, ChevronRight } from "lucide-react";
import { markPostedToday } from "@/app/(dashboard)/actions";

interface TodayPostCardProps {
  postedToday: boolean;
  postsThisWeek: number;
}

export default function TodayPostCard({
  postedToday,
  postsThisWeek,
}: TodayPostCardProps) {
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleMark = (type: "fresh-shoot" | "fill-in") => {
    setError(null);
    startTransition(async () => {
      const result = await markPostedToday(type);
      if ("error" in result) {
        setError(result.error);
        setPicking(false);
      }
    });
  };

  // ---- Posted state ---------------------------------------------------
  if (postedToday) {
    return (
      <div className="rounded-xl bg-green-500/[0.07] border border-green-500/25 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-500/15 text-green-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold">Posted today — streak alive 🔥</p>
            <p className="text-charcoal-400 text-xs mt-0.5">
              {postsThisWeek} {postsThisWeek === 1 ? "post" : "posts"} in the last 7 days · aim for 5–7
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---- Not-posted state -----------------------------------------------
  return (
    <div className="rounded-xl bg-charcoal-900 border border-brand-500/30 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-charcoal-800">
        <h2 className="text-sm font-semibold text-white">📸 Today&apos;s Post</h2>
        <span className="flex items-center gap-1 text-xs font-semibold text-brand-400">
          <Flame size={13} />
          {postsThisWeek}/7 this week
        </span>
      </div>

      <div className="p-4">
        <p className="text-charcoal-300 text-sm">
          Haven&apos;t posted yet today. Keep the page alive — fresh shoot or a fill-in post.
        </p>

        {/* Tool shortcuts */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Link
            href="/photo-tool"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 hover:border-brand-500/40 transition-colors"
          >
            <Camera size={16} className="text-brand-400 shrink-0" />
            <span className="text-white text-xs font-medium">Instax Maker</span>
          </Link>
          <Link
            href="/caption"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 hover:border-brand-500/40 transition-colors"
          >
            <Wand2 size={16} className="text-brand-400 shrink-0" />
            <span className="text-white text-xs font-medium">Caption Writer</span>
          </Link>
        </div>

        {/* Mark posted */}
        {!picking ? (
          <button
            onClick={() => setPicking(true)}
            className="mt-3 w-full flex items-center justify-center gap-1 px-3 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
          >
            Mark as posted <ChevronRight size={15} />
          </button>
        ) : (
          <div className="mt-3">
            <p className="text-charcoal-400 text-xs mb-2">What did you post?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleMark("fresh-shoot")}
                disabled={isPending}
                className="px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 hover:border-brand-500/40 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                {isPending ? "…" : "📸 Fresh shoot"}
              </button>
              <button
                onClick={() => handleMark("fill-in")}
                disabled={isPending}
                className="px-3 py-2.5 rounded-lg bg-charcoal-800 border border-charcoal-700 hover:border-brand-500/40 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                {isPending ? "…" : "✨ Fill-in post"}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>
    </div>
  );
}
