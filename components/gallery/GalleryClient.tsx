"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { sendGalleryEmail, updateProductionStatus } from "@/app/(dashboard)/calendar/actions";
import { Button } from "@/components/ui/button";
import {
  PRODUCTION_STATUS_LABELS,
  PRODUCTION_STATUS_ORDER,
  PRODUCTION_STATUS_STYLES,
  normalizeProductionStatus,
} from "@/lib/booking-production";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils/formatters";
import type { Booking, ProductionStatus, UserRole } from "@/types";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FolderOpen,
  ImagePlus,
  Loader2,
  MailWarning,
  Send,
  Trash2,
  X,
  ZoomIn,
} from "lucide-react";

const BUCKET = "sessions";

interface GalleryPhoto {
  name: string;
  url: string;
}

interface GalleryClientProps {
  bookings: Booking[];
  userRole: UserRole;
}

export default function GalleryClient({ bookings, userRole: _userRole }: GalleryClientProps) {
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionBookingId, setActionBookingId] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ProductionStatus>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [isActionPending, startActionTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const selectedBooking = bookings.find((booking) => booking.id === selectedBookingId);

  const getProductionStatus = useCallback((booking: Booking | undefined) => {
    if (!booking) return "not_started" as ProductionStatus;
    return normalizeProductionStatus(statusOverrides[booking.id] ?? booking.production_status);
  }, [statusOverrides]);

  const selectedProductionStatus = getProductionStatus(selectedBooking);
  const hasClientEmail = Boolean(selectedBooking?.client_email);
  const isSelectedActionPending = isActionPending && actionBookingId === selectedBookingId;

  const deliveryGroups = useMemo(() => {
    return PRODUCTION_STATUS_ORDER.map((status) => ({
      status,
      bookings: bookings.filter((booking) => getProductionStatus(booking) === status),
    }));
  }, [bookings, getProductionStatus]);

  const sortedBookings = useMemo(() => {
    const priority: Record<ProductionStatus, number> = {
      ready: 0,
      editing: 1,
      shoot_done: 2,
      not_started: 3,
      delivered: 4,
    };

    return [...bookings].sort((a, b) => {
      const statusDiff = priority[getProductionStatus(a)] - priority[getProductionStatus(b)];
      if (statusDiff !== 0) return statusDiff;
      return a.booking_date.localeCompare(b.booking_date);
    });
  }, [bookings, getProductionStatus]);

  const readyCount = deliveryGroups.find((group) => group.status === "ready")?.bookings.length ?? 0;
  const editingCount = deliveryGroups.find((group) => group.status === "editing")?.bookings.length ?? 0;
  const deliveredCount = deliveryGroups.find((group) => group.status === "delivered")?.bookings.length ?? 0;

  const loadPhotos = useCallback(async (bookingId: string) => {
    setLoading(true);
    setError("");
    setActionMessage("");
    setPhotos([]);

    const { data, error: listErr } = await supabase.storage
      .from(BUCKET)
      .list(bookingId, { sortBy: { column: "created_at", order: "asc" } });

    if (listErr) {
      setError(listErr.message);
      setLoading(false);
      return;
    }

    const files = (data ?? []).filter((file) => file.name !== ".emptyFolderPlaceholder");
    const resolved: GalleryPhoto[] = files.map((file) => {
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(`${bookingId}/${file.name}`);

      return { name: file.name, url: urlData.publicUrl };
    });

    setPhotos(resolved);
    setLoading(false);
  }, [supabase]);

  const handleBookingChange = (id: string) => {
    setSelectedBookingId(id);
    setPhotos([]);
    setError("");
    setActionMessage("");
    if (id) loadPhotos(id);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || !selectedBookingId) return;
    setUploading(true);
    setError("");

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const path = `${selectedBookingId}/${fileName}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false });

      if (upErr) {
        setError(upErr.message);
        break;
      }
    }

    setUploading(false);
    loadPhotos(selectedBookingId);
  };

  const handleDelete = async (name: string) => {
    if (!selectedBookingId) return;
    const { error: delErr } = await supabase.storage
      .from(BUCKET)
      .remove([`${selectedBookingId}/${name}`]);

    if (delErr) {
      setError(delErr.message);
      return;
    }

    setDeletingName(null);
    loadPhotos(selectedBookingId);
  };

  const handleStatusUpdate = (productionStatus: ProductionStatus) => {
    if (!selectedBooking) return;
    const bookingId = selectedBooking.id;
    setError("");
    setActionMessage("");
    setActionBookingId(bookingId);

    startActionTransition(async () => {
      const result = await updateProductionStatus(bookingId, productionStatus);
      if ("error" in result) {
        setError(result.error);
        setActionBookingId(null);
        return;
      }

      setStatusOverrides((current) => ({ ...current, [bookingId]: productionStatus }));
      setActionMessage(`Marked ${PRODUCTION_STATUS_LABELS[productionStatus].toLowerCase()}.`);
      setActionBookingId(null);
    });
  };

  const handleSendGallery = () => {
    if (!selectedBooking) return;
    const bookingId = selectedBooking.id;
    setError("");
    setActionMessage("");
    setActionBookingId(bookingId);

    startActionTransition(async () => {
      const result = await sendGalleryEmail(bookingId);
      if ("error" in result) {
        setError(result.error);
        setActionBookingId(null);
        return;
      }

      setActionMessage("Gallery link sent to client email.");
      setActionBookingId(null);
    });
  };

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3">
              <p className="text-lg font-bold text-white">{readyCount}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-green-300">Ready</p>
            </div>
            <div className="rounded-lg border border-brand-500/20 bg-brand-500/10 p-3">
              <p className="text-lg font-bold text-white">{editingCount}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-300">Editing</p>
            </div>
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 p-3">
              <p className="text-lg font-bold text-white">{deliveredCount}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-300">Sent</p>
            </div>
          </div>

          <div className="rounded-xl border border-charcoal-800 bg-charcoal-950/60">
            <div className="border-b border-charcoal-800 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">Delivery queue</p>
              <p className="mt-1 text-sm text-charcoal-400">Pick a booking, upload photos, then send the client link.</p>
            </div>

            <div className="p-3 xl:hidden">
              <div className="relative">
                <select
                  value={selectedBookingId}
                  onChange={(event) => handleBookingChange(event.target.value)}
                  className="w-full appearance-none rounded-lg border border-charcoal-700 bg-charcoal-900 px-3 py-2.5 pr-8 text-sm text-white focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Choose a booking</option>
                  {sortedBookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {PRODUCTION_STATUS_LABELS[getProductionStatus(booking)]} - {booking.client_name} - {formatDate(booking.booking_date)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
              </div>
            </div>

            <div className="hidden max-h-[620px] space-y-3 overflow-y-auto p-3 xl:block">
              {deliveryGroups.map((group) => (
                <div key={group.status}>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-400">
                      {PRODUCTION_STATUS_LABELS[group.status]}
                    </p>
                    <span className="rounded-full bg-charcoal-800 px-2 py-0.5 text-[11px] text-charcoal-300">
                      {group.bookings.length}
                    </span>
                  </div>

                  {group.bookings.length === 0 ? (
                    <div className="mb-3 rounded-lg border border-dashed border-charcoal-800 px-3 py-3 text-xs text-charcoal-500">
                      No bookings here
                    </div>
                  ) : (
                    <div className="mb-3 space-y-2">
                      {group.bookings.map((booking) => {
                        const status = getProductionStatus(booking);
                        const isSelected = booking.id === selectedBookingId;

                        return (
                          <button
                            key={booking.id}
                            type="button"
                            onClick={() => handleBookingChange(booking.id)}
                            className={`w-full rounded-lg border p-3 text-left transition-colors ${
                              isSelected
                                ? "border-brand-500/50 bg-brand-500/10"
                                : "border-charcoal-800 bg-charcoal-900/50 hover:border-charcoal-700 hover:bg-charcoal-900"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">{booking.client_name}</p>
                                <p className="mt-1 truncate text-xs text-charcoal-400">
                                  {formatDate(booking.booking_date)}
                                  {booking.booking_time ? ` at ${booking.booking_time.slice(0, 5)}` : ""}
                                </p>
                              </div>
                              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRODUCTION_STATUS_STYLES[status]}`}>
                                {PRODUCTION_STATUS_LABELS[status]}
                              </span>
                            </div>
                            {booking.service?.name && (
                              <p className="mt-2 truncate text-xs text-charcoal-500">{booking.service.name}</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0 rounded-xl border border-charcoal-800 bg-charcoal-950/60">
          {!selectedBooking ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center">
              <FolderOpen size={34} className="text-charcoal-600" />
              <div>
                <p className="text-base font-semibold text-white">Choose a booking to start</p>
                <p className="mt-1 text-sm text-charcoal-400">The photo uploader and delivery controls will show here.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-charcoal-800 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-white">{selectedBooking.client_name}</h2>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PRODUCTION_STATUS_STYLES[selectedProductionStatus]}`}>
                        {PRODUCTION_STATUS_LABELS[selectedProductionStatus]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-charcoal-400">
                      {formatDate(selectedBooking.booking_date)}
                      {selectedBooking.booking_time ? ` at ${selectedBooking.booking_time.slice(0, 5)}` : ""}
                      {selectedBooking.service?.name ? ` - ${selectedBooking.service.name}` : ""}
                    </p>
                    {!hasClientEmail && (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-300">
                        <MailWarning size={13} />
                        No email saved, so the gallery link cannot be sent yet.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedProductionStatus !== "ready" && selectedProductionStatus !== "delivered" && (
                      <Button
                        type="button"
                        onClick={() => handleStatusUpdate("ready")}
                        disabled={isSelectedActionPending}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        {isSelectedActionPending ? <Loader2 size={15} className="mr-2 animate-spin" /> : <CheckCircle2 size={15} className="mr-2" />}
                        Mark Ready
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={handleSendGallery}
                      disabled={!hasClientEmail || isSelectedActionPending}
                      className="bg-brand-500 hover:bg-brand-600 text-white"
                    >
                      {isSelectedActionPending ? <Loader2 size={15} className="mr-2 animate-spin" /> : <Send size={15} className="mr-2" />}
                      Send Link
                    </Button>
                    {selectedProductionStatus !== "delivered" && (
                      <Button
                        type="button"
                        onClick={() => handleStatusUpdate("delivered")}
                        disabled={isSelectedActionPending}
                        className="border border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"
                      >
                        {isSelectedActionPending ? <Loader2 size={15} className="mr-2 animate-spin" /> : <CheckCircle2 size={15} className="mr-2" />}
                        Mark Delivered
                      </Button>
                    )}
                  </div>
                </div>

                {actionMessage && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm text-green-300">
                    <CheckCircle2 size={15} />
                    {actionMessage}
                  </div>
                )}
              </div>

              {error && (
                <div className="m-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <div>
                    {error}
                    {error.includes("bucket") && (
                      <span className="mt-1 block text-xs">
                        Make sure a public bucket named &quot;sessions&quot; exists in your Supabase Storage.
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {loading ? "Loading photos..." : `${photos.length} photo${photos.length !== 1 ? "s" : ""}`}
                    </p>
                    <p className="text-xs text-charcoal-500">Stored in Supabase Storage under this booking.</p>
                  </div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="bg-brand-500 hover:bg-brand-600 text-white text-sm"
                  >
                    {uploading ? (
                      <Loader2 size={15} className="mr-2 animate-spin" />
                    ) : (
                      <ImagePlus size={15} className="mr-2" />
                    )}
                    {uploading ? "Uploading..." : "Upload Photos"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => handleUpload(event.target.files)}
                  />
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 size={24} className="text-brand-400 animate-spin" />
                  </div>
                ) : photos.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-charcoal-700 p-12 transition-colors hover:border-brand-500/50 hover:bg-brand-500/5"
                  >
                    <ImagePlus size={32} className="text-charcoal-600" />
                    <p className="text-sm text-charcoal-500">No photos yet - click to upload</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                    {photos.map((photo) => (
                      <div key={photo.name} className="group relative aspect-square">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={photo.name}
                          className="h-full w-full rounded-lg border border-charcoal-800 object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => setLightbox(photo.url)}
                            className="rounded-full bg-white/20 p-1.5 text-white transition-colors hover:bg-white/30"
                          >
                            <ZoomIn size={14} />
                          </button>
                          {deletingName === photo.name ? (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleDelete(photo.name)}
                                className="rounded bg-red-500/80 px-2 py-0.5 text-xs text-white hover:bg-red-500"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingName(null)}
                                className="rounded bg-white/20 px-2 py-0.5 text-xs text-white hover:bg-white/30"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingName(photo.name)}
                              className="rounded-full bg-red-500/60 p-1.5 text-white transition-colors hover:bg-red-500/80"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 text-white/60 transition-colors hover:text-white"
          >
            <X size={28} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Preview"
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
