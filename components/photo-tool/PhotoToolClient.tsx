"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Download, X, ImagePlus } from "lucide-react";

const STUDIO_NAME = "Snap & Print Studio";
const FONT_FAMILY = "'Dancing Script', cursive";
const MAX_PHOTOS = 4;

interface LoadedImage {
  id: string;
  el: HTMLImageElement;
  url: string;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function loadImage(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => resolve({ id: crypto.randomUUID(), el, url });
    el.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not load image")); };
    el.src = url;
  });
}

// Fill the rect with the image, center-cropping any overflow ("cover").
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, r: Rect) {
  const imgRatio = img.width / img.height;
  const rectRatio = r.w / r.h;
  let sx: number, sy: number, sw: number, sh: number;
  if (imgRatio > rectRatio) {
    sh = img.height; sw = sh * rectRatio; sx = (img.width - sw) / 2; sy = 0;
  } else {
    sw = img.width; sh = sw / rectRatio; sx = 0; sy = (img.height - sh) / 2;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, r.x, r.y, r.w, r.h);
  ctx.restore();
}

// Arrange N photos inside a square window.
function layout(n: number, x: number, y: number, size: number, gap: number): Rect[] {
  if (n <= 1) return [{ x, y, w: size, h: size }];
  if (n === 2) {
    const w = (size - gap) / 2;
    return [{ x, y, w, h: size }, { x: x + w + gap, y, w, h: size }];
  }
  if (n === 3) {
    const bigW = (size - gap) * 0.6;
    const smW = size - gap - bigW;
    const smH = (size - gap) / 2;
    return [
      { x, y, w: bigW, h: size },
      { x: x + bigW + gap, y, w: smW, h: smH },
      { x: x + bigW + gap, y: y + smH + gap, w: smW, h: smH },
    ];
  }
  const c = (size - gap) / 2;
  return [
    { x, y, w: c, h: c }, { x: x + c + gap, y, w: c, h: c },
    { x, y: y + c + gap, w: c, h: c }, { x: x + c + gap, y: y + c + gap, w: c, h: c },
  ];
}

export default function PhotoToolClient() {
  const [images, setImages] = useState<LoadedImage[]>([]);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError("");
    const room = MAX_PHOTOS - images.length;
    if (room <= 0) { setError(`You can use up to ${MAX_PHOTOS} photos.`); return; }
    try {
      const loaded = await Promise.all(Array.from(files).slice(0, room).map(loadImage));
      setImages((prev) => [...prev, ...loaded]);
    } catch {
      setError("One of those files could not be opened as an image.");
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((i) => i.id !== id);
    });
  };

  const clearAll = () => {
    images.forEach((i) => URL.revokeObjectURL(i.url));
    setImages([]);
    setError("");
  };

  // Revoke any remaining object URLs on unmount.
  useEffect(() => {
    return () => { images.forEach((i) => URL.revokeObjectURL(i.url)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || images.length === 0) return;

    // Make sure the calligraphy font is ready before drawing text.
    try { await document.fonts.load(`700 100px ${FONT_FAMILY}`); } catch { /* fall back */ }

    const W = 1080;
    const margin = Math.round(W * 0.045);
    const photoSize = W - margin * 2;
    const bottomH = Math.round(W * 0.2);
    const H = margin + photoSize + bottomH;

    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // White instant-film card.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Photo(s).
    const gap = Math.round(W * 0.012);
    const rects = layout(images.length, margin, margin, photoSize, gap);
    images.forEach((img, i) => {
      if (rects[i]) drawCover(ctx, img.el, rects[i]);
    });

    // Studio name — tilted calligraphy in the bottom strip.
    const fontSize = Math.round(bottomH * 0.5);
    ctx.save();
    ctx.translate(W / 2, margin + photoSize + bottomH / 2);
    ctx.rotate((-4 * Math.PI) / 180);
    ctx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
    ctx.fillStyle = "#3a3a3a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(STUDIO_NAME, 0, 0);
    ctx.restore();
  }, [images]);

  useEffect(() => { draw(); }, [draw]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `snap-print-instax-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <div className="space-y-5">
      {/* Upload */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold cursor-pointer transition-colors">
          <ImagePlus size={16} />
          Add photos
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            className="hidden"
          />
        </label>
        {images.length > 0 && (
          <>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
            >
              <Download size={16} />
              Download
            </button>
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-charcoal-700 text-charcoal-300 hover:text-white hover:bg-charcoal-800 text-sm transition-colors"
            >
              Clear
            </button>
          </>
        )}
        <span className="text-charcoal-500 text-xs">
          {images.length}/{MAX_PHOTOS} photos · 1 = single frame, 2–4 = collage
        </span>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <div key={img.id} className="relative h-16 w-16 rounded-lg overflow-hidden border border-charcoal-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => removeImage(img.id)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black"
                aria-label="Remove photo"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Preview / empty state */}
      {images.length === 0 ? (
        <label className="flex flex-col items-center justify-center gap-3 py-16 rounded-2xl border-2 border-dashed border-charcoal-700 hover:border-brand-500/60 hover:bg-brand-500/5 cursor-pointer transition-colors">
          <Upload size={28} className="text-charcoal-500" />
          <span className="text-charcoal-400 text-sm">Add 1–4 client photos to make an Instax post</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            className="hidden"
          />
        </label>
      ) : (
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className="max-w-xs w-full h-auto rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
