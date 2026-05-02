"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils/formatters";
import { Button } from "@/components/ui/button";
import {
  ImagePlus, Trash2, Loader2, X, AlertCircle, ChevronDown, ZoomIn,
} from "lucide-react";
import type { Booking, UserRole } from "@/types";

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
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId);

  const loadPhotos = useCallback(async (bookingId: string) => {
    setLoading(true);
    setError("");
    setPhotos([]);

    const { data, error: listErr } = await supabase.storage
      .from(BUCKET)
      .list(bookingId, { sortBy: { column: "created_at", order: "asc" } });

    if (listErr) {
      setError(listErr.message);
      setLoading(false);
      return;
    }

    const files = (data ?? []).filter((f) => f.name !== ".emptyFolderPlaceholder");
    const resolved: GalleryPhoto[] = files.map((f) => {
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(`${bookingId}/${f.name}`);
      return { name: f.name, url: urlData.publicUrl };
    });

    setPhotos(resolved);
    setLoading(false);
  }, [supabase]);

  const handleBookingChange = (id: string) => {
    setSelectedBookingId(id);
    setPhotos([]);
    setError("");
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

      if (upErr) { setError(upErr.message); break; }
    }

    setUploading(false);
    loadPhotos(selectedBookingId);
  };

  const handleDelete = async (name: string) => {
    if (!selectedBookingId) return;
    const { error: delErr } = await supabase.storage
      .from(BUCKET)
      .remove([`${selectedBookingId}/${name}`]);

    if (delErr) { setError(delErr.message); return; }
    setDeletingName(null);
    loadPhotos(selectedBookingId);
  };

  return (
    <>
      {/* Booking selector */}
      <div className="mb-6 max-w-md">
        <p className="text-charcoal-400 text-sm mb-2">Select a booking to view or upload photos</p>
        <div className="relative">
          <select
            value={selectedBookingId}
            onChange={(e) => handleBookingChange(e.target.value)}
            className="w-full appearance-none px-3 py-2.5 pr-8 rounded-lg bg-charcoal-900 border border-charcoal-700 text-white text-sm focus:outline-none focus:border-brand-500"
          >
            <option value="">— Choose a booking —</option>
            {bookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.client_name} · {formatDate(b.booking_date)}
                {b.service ? ` · ${b.service.name}` : ""}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-500 pointer-events-none" />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          {error}
          {error.includes("bucket") && (
            <span className="block mt-1 text-xs">
              Make sure a public bucket named &quot;sessions&quot; exists in your Supabase Storage.
            </span>
          )}
        </div>
      )}

      {/* Upload + gallery */}
      {selectedBookingId && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-charcoal-400 text-sm">
              {loading ? "Loading..." : `${photos.length} photo${photos.length !== 1 ? "s" : ""}`}
            </p>
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
              onChange={(e) => handleUpload(e.target.files)}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="text-brand-400 animate-spin" />
            </div>
          ) : photos.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-charcoal-700 rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer hover:border-brand-500/50 hover:bg-brand-500/5 transition-colors"
            >
              <ImagePlus size={32} className="text-charcoal-600" />
              <p className="text-charcoal-500 text-sm">No photos yet — click to upload</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {photos.map((photo) => (
                <div key={photo.name} className="relative group aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover rounded-lg border border-charcoal-800"
                  />
                  {/* Overlay actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <button
                      onClick={() => setLightbox(photo.url)}
                      className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                    >
                      <ZoomIn size={14} />
                    </button>
                    {deletingName === photo.name ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(photo.name)}
                          className="px-2 py-0.5 text-xs bg-red-500/80 hover:bg-red-500 rounded text-white"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeletingName(null)}
                          className="px-2 py-0.5 text-xs bg-white/20 hover:bg-white/30 rounded text-white"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingName(photo.name)}
                        className="p-1.5 bg-red-500/60 hover:bg-red-500/80 rounded-full text-white transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <X size={28} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
