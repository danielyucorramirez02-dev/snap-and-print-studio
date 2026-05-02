"use client";

import { useState, useMemo, useTransition } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatPeso } from "@/lib/utils/formatters";
import { deleteExpense } from "@/app/(dashboard)/expenses/actions";
import ExpenseModal from "@/components/expenses/ExpenseModal";
import type { Expense, ExpenseCategory, UserRole } from "@/types";

interface ExpensesClientProps {
  expenses: Expense[];
  userRole: UserRole;
  thisMonthTotal: number;
  allTimeTotal: number;
}

const CATEGORY_STYLES: Record<ExpenseCategory, string> = {
  supplies:  "bg-blue-500/15 text-blue-400",
  utilities: "bg-yellow-500/15 text-yellow-400",
  equipment: "bg-purple-500/15 text-purple-400",
  other:     "bg-charcoal-700 text-charcoal-400",
};

const CATEGORY_EMOJI: Record<ExpenseCategory, string> = {
  supplies: "🛒", utilities: "💡", equipment: "📷", other: "📦",
};

const FILTERS: { id: "all" | ExpenseCategory; label: string }[] = [
  { id: "all",       label: "All" },
  { id: "supplies",  label: "🛒 Supplies" },
  { id: "utilities", label: "💡 Utilities" },
  { id: "equipment", label: "📷 Equipment" },
  { id: "other",     label: "📦 Other" },
];

export default function ExpensesClient({
  expenses,
  userRole: _userRole,
  thisMonthTotal,
  allTimeTotal,
}: ExpensesClientProps) {
  const [filter, setFilter] = useState<"all" | ExpenseCategory>("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchesCategory = filter === "all" || e.category === filter;
      const matchesSearch =
        search.trim() === "" ||
        e.description.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [expenses, filter, search]);

  const filteredTotal = filtered.reduce((s, e) => s + e.amount, 0);

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteExpense(id);
      setDeletingId(null);
    });
  };

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-4">
          <p className="text-xs text-charcoal-500 mb-1">This Month</p>
          <p className="text-white text-xl font-bold">{formatPeso(thisMonthTotal)}</p>
        </div>
        <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-4">
          <p className="text-xs text-charcoal-500 mb-1">All Time</p>
          <p className="text-white text-xl font-bold">{formatPeso(allTimeTotal)}</p>
        </div>
        <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-4">
          <p className="text-xs text-charcoal-500 mb-1">Total Entries</p>
          <p className="text-white text-xl font-bold">{expenses.length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                filter === f.id
                  ? "bg-brand-500/15 text-brand-400 border-brand-500/30"
                  : "bg-charcoal-900 text-charcoal-400 border-charcoal-700 hover:text-white hover:border-charcoal-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 sm:ml-auto">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-charcoal-900 border border-charcoal-700 text-white text-xs placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500 w-40"
            />
          </div>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm shrink-0"
          >
            <Plus size={15} className="mr-1.5" />
            Log Expense
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-charcoal-600 text-sm">
            {expenses.length === 0 ? "No expenses logged yet." : "No expenses match your filter."}
          </div>
        ) : (
          <>
            <div className="divide-y divide-charcoal-800">
              {filtered.map((expense) => (
                <div key={expense.id} className="flex items-center gap-4 px-4 py-3 hover:bg-charcoal-800/40 transition-colors">
                  {/* Category badge */}
                  <span className={`shrink-0 text-lg`}>
                    {CATEGORY_EMOJI[expense.category]}
                  </span>

                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{expense.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${CATEGORY_STYLES[expense.category]}`}>
                        {expense.category}
                      </span>
                      <span className="text-charcoal-500 text-xs">{formatDate(expense.expense_date)}</span>
                      {expense.notes && (
                        <span className="text-charcoal-600 text-xs truncate">{expense.notes}</span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <p className="text-white font-semibold text-sm shrink-0">{formatPeso(expense.amount)}</p>

                  {/* Delete */}
                  {deletingId === expense.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleDelete(expense.id)}
                        disabled={isPending}
                        className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20"
                      >
                        {isPending ? "…" : "Yes"}
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="text-xs text-charcoal-400 hover:text-white px-1.5 py-0.5"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(expense.id)}
                      className="p-1.5 text-charcoal-600 hover:text-red-400 hover:bg-charcoal-700 rounded transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Footer total */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-charcoal-800 bg-charcoal-950/50">
              <p className="text-charcoal-500 text-xs">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </p>
              <p className="text-white text-sm font-semibold">{formatPeso(filteredTotal)}</p>
            </div>
          </>
        )}
      </div>

      {modalOpen && <ExpenseModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
