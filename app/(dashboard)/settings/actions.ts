"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(
  fullName: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (!fullName.trim()) return { error: "Name cannot be empty." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName.trim() })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function changePassword(
  newPassword: string,
  confirmPassword: string
): Promise<{ success: true } | { error: string }> {
  if (newPassword !== confirmPassword) return { error: "Passwords do not match." };
  if (newPassword.length < 6) return { error: "Password must be at least 6 characters." };

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) return { error: error.message };
  return { success: true };
}

export async function addBlockedDate(
  date: string,
  reason: string,
  mode: "whole-day" | "time-range" = "whole-day",
  startTime?: string,
  endTime?: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Invalid date format." };

  const isTimeRange = mode === "time-range";
  if (isTimeRange) {
    if (!startTime || !endTime) return { error: "Choose both start and end time." };
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return { error: "Invalid time format." };
    }
    if (startTime >= endTime) return { error: "End time must be after start time." };
  }

  const { error } = await supabase
    .from("blocked_dates")
    .upsert(
      {
        date,
        reason: reason.trim() || null,
        start_time: isTimeRange ? startTime : null,
        end_time: isTimeRange ? endTime : null,
        created_by: user.id,
      },
      { onConflict: "date" }
    );

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function removeBlockedDate(
  date: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("blocked_dates")
    .delete()
    .eq("date", date);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function updateMaxSelfShootsPerDay(
  value: number | null
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (value !== null && (!Number.isInteger(value) || value < 1)) {
    return { error: "Cap must be a whole number of 1 or more, or empty for unlimited." };
  }

  const { error } = await supabase
    .from("studio_settings")
    .upsert(
      { id: 1, max_self_shoots_per_day: value, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}
