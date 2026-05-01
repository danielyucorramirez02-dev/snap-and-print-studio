import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Layers } from "lucide-react";
import type { Service, UserRole } from "@/types";
import ServicesClient from "@/components/services/ServicesClient";

export default async function ServicesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .order("category")
    .order("price", { ascending: true });

  const allServices = (services ?? []) as Service[];
  const userRole = (profile?.role ?? "staff") as UserRole;

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
          <Layers size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Services &amp; Packages</h1>
          <p className="text-charcoal-400 text-sm">
            {allServices.filter((s) => s.is_active).length} active package
            {allServices.filter((s) => s.is_active).length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <ServicesClient services={allServices} userRole={userRole} />
    </div>
  );
}
