"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { formatPeso, formatDate, formatTime } from "@/lib/utils/formatters";
import { Download, TrendingUp, Users, Wallet, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { MonthRevenue, PackageStat, UpcomingBooking } from "@/app/(dashboard)/reports/page";

interface ReportsClientProps {
  monthlyRevenue: MonthRevenue[];
  packageStats: PackageStat[];
  upcomingBookings: UpcomingBooking[];
  totalRevenue: number;
  totalOutstanding: number;
  inventoryValue: number;
  totalBookings: number;
  paidCount: number;
}

const STATUS_STYLES: Record<string, string> = {
  paid:    "bg-green-500/15 text-green-400",
  partial: "bg-amber-500/15 text-amber-400",
  unpaid:  "bg-red-500/15 text-red-400",
};

const CHART_COLORS = ["#f59e0b", "#f97316", "#eab308", "#84cc16", "#22d3ee", "#a78bfa"];

// Custom tooltip for the revenue chart
function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-charcoal-900 border border-charcoal-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-charcoal-400 mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-white">
          <span className="text-charcoal-500">{p.name === "total" ? "Expected" : "Collected"}: </span>
          {formatPeso(p.value)}
        </p>
      ))}
    </div>
  );
}

function PackageTooltip({ active, payload }: { active?: boolean; payload?: { value: number; payload: PackageStat }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-charcoal-900 border border-charcoal-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-white font-medium mb-1">{d.name}</p>
      <p className="text-charcoal-400">{d.count} booking{d.count !== 1 ? "s" : ""}</p>
      <p className="text-brand-400">{formatPeso(d.revenue)} revenue</p>
    </div>
  );
}

function exportPDF(
  monthlyRevenue: MonthRevenue[],
  packageStats: PackageStat[],
  upcomingBookings: UpcomingBooking[],
  totalRevenue: number,
  totalOutstanding: number,
  totalBookings: number,
) {
  const doc = new jsPDF();
  const gold = [245, 158, 11] as [number, number, number];

  doc.setFontSize(18);
  doc.setTextColor(245, 158, 11);
  doc.text("Snap & Print Studio", 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(120, 120, 120);
  doc.text("Business Report — " + new Date().toLocaleDateString("en-PH", { dateStyle: "long" }), 14, 26);

  // Summary
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`Total Bookings: ${totalBookings}`, 14, 38);
  doc.text(`Revenue Collected: ${formatPeso(totalRevenue)}`, 80, 38);
  doc.text(`Outstanding: ${formatPeso(totalOutstanding)}`, 150, 38);

  // Monthly revenue table
  doc.setFontSize(12);
  doc.setTextColor(...gold);
  doc.text("Monthly Revenue", 14, 52);
  autoTable(doc, {
    startY: 56,
    head: [["Month", "Expected (₱)", "Collected (₱)"]],
    body: monthlyRevenue.map((r) => [r.month, formatPeso(r.total), formatPeso(r.collected)]),
    headStyles: { fillColor: gold, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    styles: { fontSize: 9 },
  });

  // Package popularity table
  const afterRevenue = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setTextColor(...gold);
  doc.text("Package Popularity", 14, afterRevenue);
  autoTable(doc, {
    startY: afterRevenue + 4,
    head: [["Package", "Bookings", "Revenue (₱)"]],
    body: packageStats.map((p) => [p.name, p.count, formatPeso(p.revenue)]),
    headStyles: { fillColor: gold, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    styles: { fontSize: 9 },
  });

  // Upcoming bookings table
  const afterPackages = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setTextColor(...gold);
  doc.text("Upcoming Bookings (Next 7 Days)", 14, afterPackages);
  autoTable(doc, {
    startY: afterPackages + 4,
    head: [["Client", "Date", "Time", "Package", "Status", "Balance (₱)"]],
    body: upcomingBookings.length
      ? upcomingBookings.map((b) => [
          b.client_name,
          formatDate(b.booking_date),
          formatTime(b.booking_time),
          b.service_name,
          b.payment_status,
          formatPeso(b.balance),
        ])
      : [["No upcoming bookings", "", "", "", "", ""]],
    headStyles: { fillColor: gold, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    styles: { fontSize: 9 },
  });

  doc.save("snap-print-report.pdf");
}

export default function ReportsClient({
  monthlyRevenue,
  packageStats,
  upcomingBookings,
  totalRevenue,
  totalOutstanding,
  inventoryValue,
  totalBookings,
  paidCount,
}: ReportsClientProps) {
  return (
    <div className="space-y-6">
      {/* Export button */}
      <div className="flex justify-end">
        <Button
          onClick={() => exportPDF(monthlyRevenue, packageStats, upcomingBookings, totalRevenue, totalOutstanding, totalBookings)}
          variant="outline"
          className="border-charcoal-700 text-charcoal-300 hover:text-white hover:bg-charcoal-800 text-sm"
        >
          <Download size={15} className="mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={15} className="text-brand-400" />
            <p className="text-xs text-charcoal-500">Revenue Collected</p>
          </div>
          <p className="text-white text-xl font-bold">{formatPeso(totalRevenue)}</p>
        </div>
        <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={15} className="text-amber-400" />
            <p className="text-xs text-charcoal-500">Outstanding</p>
          </div>
          <p className="text-amber-400 text-xl font-bold">{formatPeso(totalOutstanding)}</p>
        </div>
        <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={15} className="text-brand-400" />
            <p className="text-xs text-charcoal-500">Total Bookings</p>
          </div>
          <p className="text-white text-xl font-bold">{totalBookings}</p>
          <p className="text-xs text-charcoal-500 mt-0.5">{paidCount} fully paid</p>
        </div>
        <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package size={15} className="text-brand-400" />
            <p className="text-xs text-charcoal-500">Inventory Value</p>
          </div>
          <p className="text-white text-xl font-bold">{formatPeso(inventoryValue)}</p>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-1">Monthly Revenue</h2>
        <p className="text-charcoal-500 text-xs mb-5">Expected vs. collected over the last 6 months</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyRevenue} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "#6b6b8a", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: "#6b6b8a", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
              width={45}
            />
            <Tooltip content={<RevenueTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="total" name="total" fill="#f59e0b" opacity={0.3} radius={[4, 4, 0, 0]} />
            <Bar dataKey="collected" name="collected" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1.5 text-xs text-charcoal-500">
            <span className="w-3 h-3 rounded-sm bg-brand-500 opacity-30 inline-block" />
            Expected
          </div>
          <div className="flex items-center gap-1.5 text-xs text-charcoal-500">
            <span className="w-3 h-3 rounded-sm bg-brand-500 inline-block" />
            Collected
          </div>
        </div>
      </div>

      {/* Package popularity */}
      <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-1">Package Popularity</h2>
        <p className="text-charcoal-500 text-xs mb-5">Number of bookings per package</p>
        {packageStats.length === 0 ? (
          <p className="text-charcoal-600 text-sm text-center py-8">No bookings yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={packageStats} layout="vertical" barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#6b6b8a", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fill: "#9999bb", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip content={<PackageTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {packageStats.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Upcoming bookings */}
      <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-1">Upcoming Bookings</h2>
        <p className="text-charcoal-500 text-xs mb-4">Next 7 days</p>
        {upcomingBookings.length === 0 ? (
          <p className="text-charcoal-600 text-sm text-center py-6">No bookings in the next 7 days.</p>
        ) : (
          <div className="space-y-2">
            {upcomingBookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-4 px-3 py-2.5 rounded-lg bg-charcoal-800/60 border border-charcoal-800"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{b.client_name}</p>
                  <p className="text-charcoal-500 text-xs mt-0.5 truncate">
                    {formatDate(b.booking_date)} · {formatTime(b.booking_time)} · {b.service_name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[b.payment_status]}`}>
                    {b.payment_status}
                  </span>
                  {b.balance > 0 && (
                    <p className="text-amber-400 text-xs mt-0.5">{formatPeso(b.balance)} due</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
