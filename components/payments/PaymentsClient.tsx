"use client";

import { useState, useMemo } from "react";
import { formatDate, formatTime, formatPeso } from "@/lib/utils/formatters";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Banknote,
  Smartphone,
  Building2,
  Search,
} from "lucide-react";
import PaymentModal from "@/components/payments/PaymentModal";
import type { Booking, PaymentHistory, UserRole, PaymentStatus, PaymentMethod } from "@/types";

interface PaymentsClientProps {
  bookings: Booking[];
  paymentHistory: PaymentHistory[];
  userRole: UserRole;
  totalRevenue: number;
  totalOutstanding: number;
}

const STATUS_STYLES: Record<PaymentStatus, string> = {
  paid:    "bg-green-500/15 text-green-400 border-green-500/25",
  partial: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  unpaid:  "bg-red-500/15 text-red-400 border-red-500/25",
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "Paid", partial: "Partial", unpaid: "Unpaid",
};

const METHOD_ICON: Record<PaymentMethod, React.ReactNode> = {
  cash:  <Banknote size={13} />,
  gcash: <Smartphone size={13} />,
  bank:  <Building2 size={13} />,
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash", gcash: "GCash", bank: "Bank Transfer",
};

const FILTERS: { id: "all" | PaymentStatus; label: string }[] = [
  { id: "all",     label: "All" },
  { id: "unpaid",  label: "Unpaid" },
  { id: "partial", label: "Partial" },
  { id: "paid",    label: "Paid" },
];

interface BookingRowProps {
  booking: Booking;
  payments: PaymentHistory[];
  onAddPayment: (b: Booking) => void;
}

function BookingRow({ booking, payments, onAddPayment }: BookingRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-charcoal-800 rounded-xl overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-4 px-4 py-3 bg-charcoal-900 hover:bg-charcoal-800/50 transition-colors">
        {/* Client + date */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{booking.client_name}</p>
          <p className="text-charcoal-500 text-xs mt-0.5">
            {formatDate(booking.booking_date)} · {formatTime(booking.booking_time)}
            {booking.service && (
              <span className="ml-1 text-charcoal-600">· {booking.service.name}</span>
            )}
          </p>
        </div>

        {/* Amounts */}
        <div className="hidden sm:flex items-center gap-6 text-right shrink-0">
          <div>
            <p className="text-xs text-charcoal-500">Total</p>
            <p className="text-white text-sm font-medium">{formatPeso(booking.total_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-charcoal-500">Paid</p>
            <p className="text-green-400 text-sm font-medium">{formatPeso(booking.downpayment_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-charcoal-500">Balance</p>
            <p className={`text-sm font-medium ${booking.balance <= 0 ? "text-charcoal-400" : "text-amber-400"}`}>
              {formatPeso(booking.balance)}
            </p>
          </div>
        </div>

        {/* Status + actions */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[booking.payment_status]}`}>
            {STATUS_LABELS[booking.payment_status]}
          </span>

          {booking.payment_status !== "paid" && (
            <Button
              onClick={() => onAddPayment(booking)}
              className="h-7 px-2.5 text-xs bg-brand-500 hover:bg-brand-600 text-white"
            >
              <Plus size={12} className="mr-1" />
              Add
            </Button>
          )}

          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 text-charcoal-500 hover:text-white transition-colors"
            title="View payment history"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Payment history (expanded) */}
      {expanded && (
        <div className="border-t border-charcoal-800 bg-charcoal-950">
          {payments.length === 0 ? (
            <p className="px-4 py-3 text-charcoal-600 text-xs">No payments logged yet.</p>
          ) : (
            <div className="divide-y divide-charcoal-800">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex items-center gap-1.5 text-charcoal-400 shrink-0">
                    {METHOD_ICON[p.payment_method]}
                    <span className="text-xs">{METHOD_LABEL[p.payment_method]}</span>
                  </div>
                  <p className="text-green-400 text-sm font-medium shrink-0">
                    {formatPeso(p.amount)}
                  </p>
                  <p className="text-charcoal-500 text-xs">{formatDate(p.payment_date)}</p>
                  {p.notes && (
                    <p className="text-charcoal-600 text-xs truncate flex-1">{p.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PaymentsClient({
  bookings,
  paymentHistory,
  userRole: _userRole,
  totalRevenue,
  totalOutstanding,
}: PaymentsClientProps) {
  const [filter, setFilter] = useState<"all" | PaymentStatus>("all");
  const [search, setSearch] = useState("");
  const [activeBooking, setActiveBooking] = useState<Booking | undefined>(undefined);

  // Group payments by booking_id
  const paymentsByBooking = useMemo(() => {
    const map = new Map<string, PaymentHistory[]>();
    for (const p of paymentHistory) {
      if (!map.has(p.booking_id)) map.set(p.booking_id, []);
      map.get(p.booking_id)!.push(p);
    }
    return map;
  }, [paymentHistory]);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const matchesStatus = filter === "all" || b.payment_status === filter;
      const matchesSearch =
        search.trim() === "" ||
        b.client_name.toLowerCase().includes(search.toLowerCase()) ||
        b.client_phone?.includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [bookings, filter, search]);

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-4">
          <p className="text-xs text-charcoal-500 mb-1">Total Bookings</p>
          <p className="text-white text-xl font-bold">{bookings.length}</p>
        </div>
        <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-4">
          <p className="text-xs text-charcoal-500 mb-1">Revenue Collected</p>
          <p className="text-green-400 text-xl font-bold">{formatPeso(totalRevenue)}</p>
        </div>
        <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-4">
          <p className="text-xs text-charcoal-500 mb-1">Outstanding Balance</p>
          <p className="text-amber-400 text-xl font-bold">{formatPeso(totalOutstanding)}</p>
        </div>
        <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-4">
          <p className="text-xs text-charcoal-500 mb-1">Payments Logged</p>
          <p className="text-white text-xl font-bold">{paymentHistory.length}</p>
        </div>
      </div>

      {/* Filter + Search */}
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
        <div className="relative sm:ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client..."
            className="pl-8 pr-3 py-1.5 rounded-lg bg-charcoal-900 border border-charcoal-700 text-white text-xs placeholder:text-charcoal-500 focus:outline-none focus:border-brand-500 w-full sm:w-48"
          />
        </div>
      </div>

      {/* Booking list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-charcoal-600 text-sm">
            No bookings found.
          </div>
        ) : (
          filtered.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              payments={paymentsByBooking.get(booking.id) ?? []}
              onAddPayment={setActiveBooking}
            />
          ))
        )}
      </div>

      {/* Add Payment Modal */}
      {activeBooking && (
        <PaymentModal
          booking={activeBooking}
          onClose={() => setActiveBooking(undefined)}
        />
      )}
    </>
  );
}
