"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Manila date (UTC+8) — "today" for the studio.
function manilaToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

// Records a Facebook page post for today — feeds the daily-post streak.
export async function markPostedToday(
  postType?: "fresh-shoot" | "fill-in"
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const today = manilaToday();

  // Already logged a post today? Don't double-count the streak.
  const { data: existing } = await supabase
    .from("studio_posts")
    .select("id")
    .eq("posted_on", today)
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: "A post is already logged for today." };
  }

  const { error } = await supabase.from("studio_posts").insert({
    posted_on: today,
    post_type: postType ?? null,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}
