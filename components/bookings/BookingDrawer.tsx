"use client";

import { useEffect, useState, useTransition } from "react";
import { X, CheckCircle2, AlertCircle, Trash2, Printer, Mail, Image, Clock, BadgeCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatTime, formatPeso } from "@/lib/utils/formatters";
import { markBookingPaid, updatePaymentStatus, deleteBooking, confirmBooking, addLateFee, sendConfirmationEmail, sendGalleryEmail } from "@/app/(dashboard)/calendar/actions";
import type { Booking, PaymentStatus } from "@/types";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface BookingDrawerProps {
  booking: Booking;
  onClose: () => void;
}

const STATUS_STYLES: Record<PaymentStatus, string> = {
  paid: "bg-green-500/15 text-green-400 border border-green-500/25",
  partial: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  unpaid: "bg-red-500/15 text-red-400 border border-red-500/25",
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-2">
      {children}
    </p>
  );
}

export default function BookingDrawer({ booking, onClose }: BookingDrawerProps) {
  const [newDownpayment, setNewDownpayment] = useState(booking.downpayment_amount);
  const [serverError, setServerError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [locallyConfirmed, setLocallyConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Reset input when a different booking is opened
  useEffect(() => {
    setNewDownpayment(booking.downpayment_amount);
    setServerError("");
    setSuccessMsg("");
    setConfirmCancel(false);
    setLocallyConfirmed(false);
  }, [booking.id, booking.downpayment_amount]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleUpdatePayment = () => {
    setServerError("");
    startTransition(async () => {
      const result = await updatePaymentStatus(booking.id, newDownpayment);
      if ("error" in result) {
        setServerError(result.error);
        return;
      }
      onClose();
    });
  };

  const handleMarkPaid = () => {
    setServerError("");
    startTransition(async () => {
      const result = await markBookingPaid(booking.id);
      if ("error" in result) {
        setServerError(result.error);
        return;
      }
      onClose();
    });
  };

  const handleConfirm = () => {
    setServerError(""); setSuccessMsg("");
    startTransition(async () => {
      const result = await confirmBooking(booking.id);
      if ("error" in result) { setServerError(result.error); return; }
      setLocallyConfirmed(true);
      setSuccessMsg("Booking confirmed — confirmation email sent to the client.");
    });
  };

  const handleLateFee = () => {
    setServerError(""); setSuccessMsg("");
    startTransition(async () => {
      const result = await addLateFee(booking.id);
      if ("error" in result) { setServerError(result.error); return; }
      setSuccessMsg("₱50 late fee added.");
    });
  };

  const handleSendConfirmation = () => {
    setServerError(""); setSuccessMsg("");
    startTransition(async () => {
      const result = await sendConfirmationEmail(booking.id);
      if ("error" in result) { setServerError(result.error); return; }
      setSuccessMsg("Confirmation email sent!");
    });
  };

  const handleSendGallery = () => {
    setServerError(""); setSuccessMsg("");
    startTransition(async () => {
      const result = await sendGalleryEmail(booking.id);
      if ("error" in result) { setServerError(result.error); return; }
      setSuccessMsg("Gallery link sent!");
    });
  };

  const printReceipt = () => {
    const doc = new jsPDF();
    const gold: [number, number, number] = [245, 158, 11];

    doc.setFontSize(18);
    doc.setTextColor(...gold);
    doc.text("Snap & Print Studio", 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Phase 5, Block 22, Lot 37 Pandi Residence 1, Mapulang Lupa, Pandi Bulacan", 14, 25);
    doc.text("Also searchable on Waze/Google Maps as \"Snap & Print Studio\"", 14, 30);

    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.4);
    doc.line(14, 34, 196, 34);

    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text("Official Receipt", 14, 42);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date printed: ${new Date().toLocaleDateString("en-PH", { dateStyle: "long" })}`, 14, 48);

    autoTable(doc, {
      startY: 54,
      head: [["Field", "Details"]],
      body: [
        ["Client Name", booking.client_name],
        ["Phone", booking.client_phone || "—"],
        ["Email", booking.client_email || "—"],
        ["Session Date", formatDate(booking.booking_date)],
        ["Session Time", formatTime(booking.booking_time)],
        ["Package", booking.service?.name ?? "—"],
      ],
      headStyles: { fillColor: gold, textColor: [255, 255, 255] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
      styles: { fontSize: 9 },
    });

    const afterDetails = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    autoTable(doc, {
      startY: afterDetails,
      head: [["Payment Summary", ""]],
      body: [
        ["Total Package Price", formatPeso(booking.total_amount)],
        ["Amount Paid", formatPeso(booking.downpayment_amount)],
        ["Balance Due", formatPeso(booking.balance)],
        ["Payment Status", booking.payment_status.toUpperCase()],
      ],
      headStyles: { fillColor: gold, textColor: [255, 255, 255] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 }, 1: { halign: "right" } },
      styles: { fontSize: 9 },
    });

    if (booking.notes) {
      const afterPayment = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("Notes:", 14, afterPayment);
      doc.setTextColor(50, 50, 50);
      doc.text(booking.notes, 14, afterPayment + 5, { maxWidth: 182 });
    }

    const footerY = 275;
    doc.setDrawColor(245, 158, 11);
    doc.line(14, footerY, 196, footerY);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for choosing Snap & Print Studio! ✨", 105, footerY + 6, { align: "center" });

    doc.save(`receipt-${booking.client_name.replace(/\s+/g, "-")}-${booking.booking_date}.pdf`);
  };

  const handleDelete = () => {
    setServerError("");
    startTransition(async () => {
      const result = await deleteBooking(booking.id);
      if ("error" in result) {
        setServerError(result.error);
        setConfirmCancel(false);
        return;
      }
      onClose();
    });
  };

  const showPendingConfirm = booking.booking_status === "pending" && !locallyConfirmed;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-charcoal-900 border-l border-charcoal-700 overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-charcoal-800 sticky top-0 bg-charcoal-900">
          <h2 className="text-base font-semibold text-white">Booking Details</h2>
          <button
            onClick={onClose}
            className="text-charcoal-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-6 flex-1">
          {/* Booking status badges */}
          <div className="flex flex-wrap gap-2">
            {showPendingConfirm && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                ⏳ Pending Confirmation
              </span>
            )}
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[booking.payment_status]}`}>
              {STATUS_LABELS[booking.payment_status]}
            </span>
          </div>

          {/* Confirm pending booking */}
          {showPendingConfirm && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
              <p className="text-amber-400 text-xs">This is a booking request from the client. Confirm to lock in the schedule.</p>
              <Button onClick={handleConfirm} disabled={isPending}
                className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30">
                <BadgeCheck size={14} className="mr-2" /> Confirm Booking
              </Button>
            </div>
          )}

          {/* Client Info */}
          <div>
            <SectionLabel>Client</SectionLabel>
            <p className="text-white font-medium">{booking.client_name}</p>
            {booking.client_phone && (
              <p className="text-charcoal-400 text-sm mt-0.5">{booking.client_phone}</p>
            )}
            {booking.client_email && (
              <p className="text-charcoal-400 text-sm mt-0.5">{booking.client_email}</p>
            )}
          </div>

          {/* Session Info */}
          <div>
            <SectionLabel>Session</SectionLabel>
            <p className="text-white font-medium">
              {formatDate(booking.booking_date)}
            </p>
            <p className="text-charcoal-400 text-sm mt-0.5">
              {formatTime(booking.booking_time)}
            </p>
            <p className="text-charcoal-400 text-sm mt-0.5">
              {booking.service?.name ?? "Package removed"}
            </p>
          </div>

          {/* Payment Summary */}
          <div>
            <SectionLabel>Payment</SectionLabel>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-400">Total</span>
                <span className="text-white font-medium">{formatPeso(booking.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-400">Downpayment</span>
                <span className="text-white">{formatPeso(booking.downpayment_amount)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-charcoal-800 pt-1.5 mt-1.5">
                <span className="text-charcoal-400">Balance</span>
                <span className={`font-semibold ${booking.balance <= 0 ? "text-green-400" : "text-amber-400"}`}>
                  {formatPeso(booking.balance)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div>
              <SectionLabel>Notes</SectionLabel>
              <p className="text-charcoal-300 text-sm leading-relaxed">{booking.notes}</p>
            </div>
          )}

          {/* GCash Receipt */}
          {booking.receipt_url && (
            <div>
              <SectionLabel>GCash Receipt</SectionLabel>
              <a
                href={booking.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden border border-charcoal-700 hover:border-brand-500/50 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={booking.receipt_url}
                  alt="GCash Receipt"
                  className="w-full max-h-52 object-contain bg-charcoal-800"
                />
                <div className="flex items-center gap-1.5 px-3 py-2 bg-charcoal-800 text-xs text-charcoal-400">
                  <ExternalLink size={11} /> View full image
                </div>
              </a>
            </div>
          )}

          {/* Success message */}
          {successMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              <CheckCircle2 size={14} className="shrink-0" /> {successMsg}
            </div>
          )}

          {/* Late fee */}
          <div className="border-t border-charcoal-800 pt-4 space-y-2">
            <SectionLabel>Quick Actions</SectionLabel>
            <Button onClick={handleLateFee} disabled={isPending} variant="outline"
              className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300">
              <Clock size={14} className="mr-2" /> Add Late Fee (+₱50)
            </Button>
            {booking.client_email && (
              <>
                <Button onClick={handleSendConfirmation} disabled={isPending} variant="outline"
                  className="w-full border-charcoal-700 text-charcoal-300 hover:text-white hover:bg-charcoal-800">
                  <Mail size={14} className="mr-2" /> Send Confirmation Email
                </Button>
                <Button onClick={handleSendGallery} disabled={isPending} variant="outline"
                  className="w-full border-charcoal-700 text-charcoal-300 hover:text-white hover:bg-charcoal-800">
                  <Image size={14} className="mr-2" /> Send Gallery Link
                </Button>
              </>
            )}
          </div>

          {/* Print Receipt */}
          <div className="border-t border-charcoal-800 pt-4">
            <Button onClick={printReceipt} variant="outline"
              className="w-full border-charcoal-700 text-charcoal-300 hover:text-white hover:bg-charcoal-800">
              <Printer size={14} className="mr-2" /> Print Receipt
            </Button>
          </div>

          {/* Payment Actions */}
          {booking.payment_status !== "paid" && (
            <div className="space-y-3 border-t border-charcoal-800 pt-4">
              <SectionLabel>Update Payment</SectionLabel>
              <div className="space-y-1.5">
                <Label className="text-charcoal-300 text-xs">New Downpayment Amount (₱)</Label>
                <Input
                  type="number"
                  min={0}
                  max={booking.total_amount}
                  step={0.01}
                  value={newDownpayment}
                  onChange={(e) => setNewDownpayment(Number(e.target.value))}
                  className="bg-charcoal-800 border-charcoal-700 text-white focus:border-brand-500"
                />
              </div>
              <Button
                onClick={handleUpdatePayment}
                disabled={isPending}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-40"
              >
                {isPending ? "Updating..." : "Update Payment"}
              </Button>
              <Button
                onClick={handleMarkPaid}
                disabled={isPending}
                variant="outline"
                className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300 disabled:opacity-40"
              >
                <CheckCircle2 size={15} className="mr-2" />
                Mark as Fully Paid
              </Button>
            </div>
          )}

          {/* Server error */}
          {serverError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {serverError}
            </div>
          )}

          {/* Cancel Booking */}
          <div className="border-t border-charcoal-800 pt-4">
            {!confirmCancel ? (
              <button
                onClick={() => setConfirmCancel(true)}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-charcoal-500 hover:text-red-400 transition-colors disabled:opacity-40"
              >
                <Trash2 size={14} />
                Cancel this booking
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-charcoal-300 text-center">Remove this booking permanently?</p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setConfirmCancel(false)}
                    disabled={isPending}
                    variant="outline"
                    className="flex-1 border-charcoal-700 text-charcoal-300 hover:text-white hover:bg-charcoal-800"
                  >
                    No, keep it
                  </Button>
                  <Button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                  >
                    {isPending ? "Removing..." : "Yes, cancel"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
