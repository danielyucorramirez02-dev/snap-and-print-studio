import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import type { InventoryItem, UserRole } from "@/types";
import InventoryClient from "@/components/inventory/InventoryClient";

export default async function InventoryPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: items } = await supabase
    .from("inventory")
    .select("*")
    .order("item_name", { ascending: true });

  const allItems = (items ?? []) as InventoryItem[];
  const userRole = (profile?.role ?? "staff") as UserRole;
  const lowStockCount = allItems.filter((i) => i.quantity <= i.low_stock_threshold).length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
          <Package size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory</h1>
          <p className="text-charcoal-400 text-sm">
            {allItems.length} item{allItems.length !== 1 ? "s" : ""}
            {lowStockCount > 0 && (
              <span className="ml-2 text-amber-400">· {lowStockCount} low stock</span>
            )}
          </p>
        </div>
      </div>

      <InventoryClient items={allItems} userRole={userRole} />
    </div>
  );
}
