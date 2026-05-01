"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { serviceSchema, type ServiceFormData } from "@/lib/validations/service";

export async function createService(data: ServiceFormData) {
  const supabase = await createClient();

  const parsed = serviceSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid form data." };

  const inclusions = parsed.data.inclusions
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const { error } = await supabase.from("services").insert({
    name: parsed.data.name,
    category: parsed.data.category,
    description: parsed.data.description || null,
    price: parsed.data.price,
    duration_minutes: parsed.data.duration_minutes,
    inclusions,
    is_active: true,
  });

  if (error) return { error: error.message };
  revalidatePath("/services");
  return { success: true };
}

export async function updateService(id: string, data: ServiceFormData) {
  const supabase = await createClient();

  const parsed = serviceSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid form data." };

  const inclusions = parsed.data.inclusions
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const { error } = await supabase
    .from("services")
    .update({
      name: parsed.data.name,
      category: parsed.data.category,
      description: parsed.data.description || null,
      price: parsed.data.price,
      duration_minutes: parsed.data.duration_minutes,
      inclusions,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/services");
  return { success: true };
}

export async function toggleServiceActive(id: string, is_active: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("services")
    .update({ is_active })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/services");
  return { success: true };
}
