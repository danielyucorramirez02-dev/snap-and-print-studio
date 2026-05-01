import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import type { UserRole } from "@/types";

const pageTitles: Record<string, string> = {
  "/calendar":  "Calendar",
  "/payments":  "Payments",
  "/services":  "Services & Packages",
  "/inventory": "Inventory",
  "/reports":   "Reports",
  "/gallery":   "Client Gallery",
  "/expenses":  "Expense Tracker",
  "/settings":  "Settings",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const fullName = profile?.full_name ?? user.email ?? "User";
  const role = (profile?.role ?? "staff") as UserRole;

  return (
    <div className="flex min-h-screen bg-charcoal-950">
      <Sidebar userRole={role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header fullName={fullName} role={role} pageTitle="Dashboard" />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
