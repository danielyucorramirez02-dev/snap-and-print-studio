import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";
import { startOfMonth, endOfMonth } from "date-fns";
import type { Expense, UserRole } from "@/types";
import ExpensesClient from "@/components/expenses/ExpensesClient";

export default async function ExpensesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") redirect("/calendar");

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false });

  const allExpenses = (expenses ?? []) as Expense[];
  const userRole = (profile?.role ?? "owner") as UserRole;

  const monthStart = startOfMonth(new Date()).toISOString().split("T")[0];
  const monthEnd = endOfMonth(new Date()).toISOString().split("T")[0];
  const thisMonthTotal = allExpenses
    .filter((e) => e.expense_date >= monthStart && e.expense_date <= monthEnd)
    .reduce((s, e) => s + e.amount, 0);

  const allTimeTotal = allExpenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
          <Receipt size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-charcoal-400 text-sm">
            {allExpenses.length} expense{allExpenses.length !== 1 ? "s" : ""} logged
          </p>
        </div>
      </div>

      <ExpensesClient
        expenses={allExpenses}
        userRole={userRole}
        thisMonthTotal={thisMonthTotal}
        allTimeTotal={allTimeTotal}
      />
    </div>
  );
}
