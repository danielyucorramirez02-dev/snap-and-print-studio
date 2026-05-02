"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { inventorySchema, type InventoryFormData } from "@/lib/validations/inventory";
import { logInventoryToSheet } from "@/lib/google-sheets";

export async function createInventoryItem(
  data: InventoryFormData
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = inventorySchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid form data." };

  const { error } = await supabase.from("inventory").insert({
    ...parsed.data,
    supplier: parsed.data.supplier || null,
    last_restocked: parsed.data.last_restocked || null,
  });

  if (error) return { error: error.message };

  await logInventoryToSheet({
    itemName: parsed.data.item_name,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    unitCost: parsed.data.unit_cost,
    sellingPrice: parsed.data.selling_price,
    supplier: parsed.data.supplier || "",
    lowStockThreshold: parsed.data.low_stock_threshold,
  });

  revalidatePath("/inventory");
  return { success: true };
}

export async function updateInventoryItem(
  id: string,
  data: InventoryFormData
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = inventorySchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid form data." };

  const { error } = await supabase
    .from("inventory")
    .update({
      ...parsed.data,
      supplier: parsed.data.supplier || null,
      last_restocked: parsed.data.last_restocked || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/inventory");
  return { success: true };
}

export async function updateQuantity(
  id: string,
  quantity: number
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("inventory")
    .update({ quantity, last_restocked: new Date().toISOString().split("T")[0] })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/inventory");
  return { success: true };
}

export async function deleteInventoryItem(
  id: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("inventory").delete().eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/inventory");
  return { success: true };
}
