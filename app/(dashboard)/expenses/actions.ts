"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { expenseSchema, type ExpenseFormData } from "@/lib/validations/expense";

export async function createExpense(
  data: ExpenseFormData
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = expenseSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid form data." };

  const { error } = await supabase.from("expenses").insert({
    ...parsed.data,
    notes: parsed.data.notes || null,
    recorded_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/expenses");
  return { success: true };
}

export async function deleteExpense(
  id: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("expenses").delete().eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/expenses");
  return { success: true };
}
