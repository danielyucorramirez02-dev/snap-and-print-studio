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
