"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download, X, ImagePlus, Sparkles, RotateCcw, Loader2 } from "lucide-react";

const STUDIO_NAME = "Snap & Print Studio";
const FONT_FAMILY = "'Dancing Script', cursive";
const MAX_PHOTOS = 8;
const MAX_COLLAGE = 4;
const MAX_CAPTION_IMAGES = 5;

type FrameMode = "each" | "collage";

// How the finished image looks: the white Instax card, or the plain photo
// with the logo stamped on it as a watermark.
type OutputStyle = "instax" | "logo";

// Logo watermark spot — [t]op/[b]ottom + [l]eft/[m]iddle/[r]ight.
type LogoPosition = "tl" | "tm" | "tr" | "bl" | "bm" | "br";

const LOGO_POSITIONS: { id: LogoPosition; label: string }[] = [
  { id: "tl", label: "Upper Left" },
  { id: "tm", label: "Upper Mid" },
  { id: "tr", label: "Upper Right" },
  { id: "bl", label: "Bottom Left" },
  { id: "bm", label: "Bottom Mid" },
  { id: "br", label: "Bottom Right" },
];

interface LoadedImage {
  id: string;
  el: HTMLImageElement;
  url: string;
}

// A finished rendered image, ready to download or caption.
interface FramedImage {
  id: string;
  dataUrl: string;
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

// Trace a rounded-rectangle path (arcTo works on every browser).
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Arrange N photos inside a w×h window. Splits along the window's longer axis.
function layout(n: number, x: number, y: number, w: number, h: number, gap: number): Rect[] {
  if (n <= 1) return [{ x, y, w, h }];
  const landscape = w >= h;
  if (n === 2) {
    if (landscape) {
      const cw = (w - gap) / 2;
      return [{ x, y, w: cw, h }, { x: x + cw + gap, y, w: cw, h }];
    }
    const ch = (h - gap) / 2;
    return [{ x, y, w, h: ch }, { x, y: y + ch + gap, w, h: ch }];
  }
  if (n === 3) {
    if (landscape) {
      const bigW = (w - gap) * 0.6;
      const smW = w - gap - bigW;
      const smH = (h - gap) / 2;
      return [
        { x, y, w: bigW, h },
        { x: x + bigW + gap, y, w: smW, h: smH },
        { x: x + bigW + gap, y: y + smH + gap, w: smW, h: smH },
      ];
    }
    const bigH = (h - gap) * 0.6;
    const smH = h - gap - bigH;
    const smW = (w - gap) / 2;
    return [
      { x, y, w, h: bigH },
      { x, y: y + bigH + gap, w: smW, h: smH },
      { x: x + smW + gap, y: y + bigH + gap, w: smW, h: smH },
    ];
  }
  const cw = (w - gap) / 2;
  const ch = (h - gap) / 2;
  return [
    { x, y, w: cw, h: ch }, { x: x + cw + gap, y, w: cw, h: ch },
    { x, y: y + ch + gap, w: cw, h: ch }, { x: x + cw + gap, y: y + ch + gap, w: cw, h: ch },
  ];
}

// The studio logo, used on the Instax strip and as the photo watermark.
// Loaded once and cached; resolves to null if /public/instax-logo.png is
// missing — the Instax frame then falls back to the calligraphy studio name.
const LOGO_SRC = "/instax-logo.png";
let logoPromise: Promise<HTMLImageElement | null> | null = null;
function loadStudioLogo(): Promise<HTMLImageElement | null> {
  if (logoPromise) return logoPromise;
  logoPromise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
    img.onerror = () => resolve(null);
    img.src = LOGO_SRC;
  });
  return logoPromise;
}

// Render one Instax frame (single photo or a 2-4 photo collage) to a PNG
// data URL. Renders off-screen at high resolution so the export stays crisp
// after Facebook's re-compression.
async function renderFrame(photos: LoadedImage[]): Promise<string> {
  // Make sure the calligraphy font is ready before drawing text.
  try { await document.fonts.load(`700 100px ${FONT_FAMILY}`); } catch { /* fall back */ }

  // Frame orientation follows the first photo: landscape -> 4:3, portrait -> 3:4.
  const first = photos[0].el;
  const landscape = first.width >= first.height;
  const pw = landscape ? 2400 : 1800;
  const ph = landscape ? 1800 : 2400;

  const margin = Math.round(pw * 0.05);
  const bottomH = Math.round(pw * 0.18);
  const W = pw + margin * 2;
  const H = margin + ph + bottomH;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // High-quality resampling when scaling the source photos down.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // White instant-film card.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Photo(s).
  const gap = Math.round(pw * 0.012);
  const rects = layout(photos.length, margin, margin, pw, ph, gap);
  photos.forEach((p, i) => {
    if (rects[i]) drawCover(ctx, p.el, rects[i]);
  });

  // Bottom strip — the studio logo if it has been added, otherwise the
  // calligraphy studio name as a fallback.
  const stripCY = margin + ph + bottomH / 2;
  const logo = await loadStudioLogo();
  if (logo) {
    // The logo PNG has a transparent background, so it drops straight onto
    // the white card — just scale it to fit the bottom strip and center it.
    const maxLogoW = (W - margin * 2) * 0.55;
    const maxLogoH = bottomH * 0.64;
    const scale = Math.min(maxLogoW / logo.naturalWidth, maxLogoH / logo.naturalHeight);
    const lw = logo.naturalWidth * scale;
    const lh = logo.naturalHeight * scale;
    ctx.drawImage(logo, (W - lw) / 2, stripCY - lh / 2, lw, lh);
  } else {
    // Studio name — small, straight (0°) calligraphy, shrunk to fit. Kept
    // modest so it reads like a real Instax signature.
    let fontSize = Math.round(bottomH * 0.34);
    ctx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
    const maxTextW = W - margin * 2;
    const textW = ctx.measureText(STUDIO_NAME).width;
    if (textW > maxTextW) {
      fontSize = Math.floor(fontSize * (maxTextW / textW));
      ctx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
    }
    ctx.fillStyle = "#3a3a3a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(STUDIO_NAME, W / 2, stripCY);
  }

  return canvas.toDataURL("image/png");
}

// Render a single photo at its natural aspect ratio with the studio logo
// stamped as a watermark at the chosen spot. The logo sits on a soft
// translucent white badge so it stays readable on any photo (light or dark).
async function renderWithLogo(photo: LoadedImage, pos: LogoPosition): Promise<string> {
  const img = photo.el;

  // High resolution, capped to 2400px on the long side.
  const longSide = Math.max(img.width, img.height);
  const scale = Math.min(2400 / longSide, 1);
  const W = Math.max(1, Math.round(img.width * scale));
  const H = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // The photo, full bleed at its natural aspect ratio.
  ctx.drawImage(img, 0, 0, W, H);

  const logo = await loadStudioLogo();
  if (logo) {
    // Size the logo relative to the photo.
    let lw = W * 0.26;
    let lh = lw * (logo.naturalHeight / logo.naturalWidth);
    const maxLh = H * 0.15;
    if (lh > maxLh) { lh = maxLh; lw = lh * (logo.naturalWidth / logo.naturalHeight); }

    const pad = Math.round(Math.min(W, H) * 0.04);
    const badgePadX = lw * 0.13;
    const badgePadY = lh * 0.34;
    const bw = lw + badgePadX * 2;
    const bh = lh + badgePadY * 2;

    const isTop = pos[0] === "t";
    const col = pos[1]; // l | m | r
    const bx = col === "l" ? pad : col === "r" ? W - bw - pad : (W - bw) / 2;
    const by = isTop ? pad : H - bh - pad;

    // Soft translucent white badge so the dark logo reads on any background.
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    roundRectPath(ctx, bx, by, bw, bh, bh * 0.3);
    ctx.fill();
    ctx.restore();

    ctx.drawImage(logo, bx + badgePadX, by + badgePadY, lw, lh);
  }

  return canvas.toDataURL("image/png");
}

// Re-encode a finished PNG as a smaller JPEG so a whole batch of them fits
// inside sessionStorage when handed off to the caption generator.
function downscaleForCaption(dataUrl: string, maxDim = 1100): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = dataUrl;
  });
}

export default function PhotoToolClient() {
  const router = useRouter();
  const [images, setImages] = useState<LoadedImage[]>([]);   // uploaded photos
  const [style, setStyle] = useState<OutputStyle>("instax"); // Instax card, or photo + logo
  const [mode, setMode] = useState<FrameMode>("each");        // (Instax) frame each, or one collage
  const [logoPos, setLogoPos] = useState<LogoPosition>("br"); // (Photo + logo) watermark spot
  const [results, setResults] = useState<FramedImage[]>([]);  // rendered images
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(false);
  const [busy, setBusy] = useState(false);

  const collageOverflow = style === "instax" && mode === "collage" && images.length > MAX_COLLAGE;

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError("");
    const room = MAX_PHOTOS - images.length;
    if (room <= 0) { setError(`You can use up to ${MAX_PHOTOS} photos at a time.`); return; }
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

  const startOver = () => {
    images.forEach((i) => URL.revokeObjectURL(i.url));
    setImages([]);
    setResults([]);
    setError("");
  };

  // Revoke any remaining object URLs on unmount.
  useEffect(() => {
    return () => { images.forEach((i) => URL.revokeObjectURL(i.url)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render whenever the photos, style, framing mode, or logo spot change.
  useEffect(() => {
    if (images.length === 0) { setResults([]); return; }
    let cancelled = false;
    setRendering(true);
    (async () => {
      try {
        let frames: string[];
        if (style === "logo") {
          // Photo + logo — one watermarked photo per result.
          frames = [];
          for (const img of images) frames.push(await renderWithLogo(img, logoPos));
        } else if (mode === "collage") {
          frames = [await renderFrame(images.slice(0, MAX_COLLAGE))];
        } else {
          frames = [];
          for (const img of images) frames.push(await renderFrame([img]));
        }
        if (!cancelled) {
          setResults(frames.map((dataUrl) => ({ id: crypto.randomUUID(), dataUrl })));
        }
      } catch {
        if (!cancelled) setError("Could not render the photos. Please try again.");
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => { cancelled = true; };
  }, [images, style, mode, logoPos]);

  const downloadOne = (img: FramedImage, index: number) => {
    const a = document.createElement("a");
    a.href = img.dataUrl;
    a.download = `snap-print-${style === "instax" ? "instax" : "photo"}-${index + 1}.png`;
    a.click();
  };

  const downloadAll = async () => {
    for (let i = 0; i < results.length; i++) {
      downloadOne(results[i], i);
      // Small gap so the browser doesn't drop back-to-back downloads.
      await new Promise((r) => setTimeout(r, 400));
    }
  };

  // Hand the finished photos to the caption generator on the /caption page.
  const generateCaption = async () => {
    if (results.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const small = await Promise.all(
        results.slice(0, MAX_CAPTION_IMAGES).map((r) => downscaleForCaption(r.dataUrl))
      );
      sessionStorage.setItem("sp-caption-handoff", JSON.stringify(small));
      router.push("/caption");
    } catch {
      setError("Could not prepare the photos for the caption generator.");
      setBusy(false);
    }
  };

  const noun = style === "instax" ? "frame" : "photo";

  return (
    <div className="space-y-5">
      {/* Upload */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold cursor-pointer transition-colors">
          <ImagePlus size={16} />
          {images.length > 0 ? "Add more photos" : "Add photos"}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            className="hidden"
          />
        </label>
        {images.length > 0 && (
          <button
            onClick={startOver}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-charcoal-700 text-charcoal-300 hover:text-white hover:bg-charcoal-800 text-sm transition-colors"
          >
            <RotateCcw size={15} />
            Start over
          </button>
        )}
        <span className="text-charcoal-500 text-xs">{images.length}/{MAX_PHOTOS} photos</span>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Uploaded thumbnails */}
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

      {/* Output style */}
      {images.length > 0 && (
        <div>
          <p className="text-charcoal-400 text-sm mb-2">Output style</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStyle("instax")}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                style === "instax"
                  ? "bg-brand-500/15 text-brand-400 border-brand-500/30"
                  : "bg-charcoal-900 text-charcoal-400 border-charcoal-700 hover:text-white hover:border-charcoal-600"
              }`}
            >
              📸 Instax frame
            </button>
            <button
              onClick={() => setStyle("logo")}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                style === "logo"
                  ? "bg-brand-500/15 text-brand-400 border-brand-500/30"
                  : "bg-charcoal-900 text-charcoal-400 border-charcoal-700 hover:text-white hover:border-charcoal-600"
              }`}
            >
              🏷️ Photo + logo
            </button>
          </div>
        </div>
      )}

      {/* Instax: framing mode */}
      {images.length > 0 && style === "instax" && (
        <div>
          <p className="text-charcoal-400 text-sm mb-2">How should they be framed?</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setMode("each")}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                mode === "each"
                  ? "bg-brand-500/15 text-brand-400 border-brand-500/30"
                  : "bg-charcoal-900 text-charcoal-400 border-charcoal-700 hover:text-white hover:border-charcoal-600"
              }`}
            >
              🖼️ Frame each separately
            </button>
            <button
              onClick={() => setMode("collage")}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                mode === "collage"
                  ? "bg-brand-500/15 text-brand-400 border-brand-500/30"
                  : "bg-charcoal-900 text-charcoal-400 border-charcoal-700 hover:text-white hover:border-charcoal-600"
              }`}
            >
              🧩 Collage in one frame
            </button>
          </div>
          {collageOverflow && (
            <p className="text-charcoal-500 text-xs mt-2">
              A collage fits up to {MAX_COLLAGE} photos — the first {MAX_COLLAGE} will be used.
            </p>
          )}
        </div>
      )}

      {/* Photo + logo: watermark position */}
      {images.length > 0 && style === "logo" && (
        <div>
          <p className="text-charcoal-400 text-sm mb-2">Where should the logo go?</p>
          <div className="grid grid-cols-3 gap-2 max-w-sm">
            {LOGO_POSITIONS.map((p) => (
              <button
                key={p.id}
                onClick={() => setLogoPos(p.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  logoPos === p.id
                    ? "bg-brand-500/15 text-brand-400 border-brand-500/30"
                    : "bg-charcoal-900 text-charcoal-400 border-charcoal-700 hover:text-white hover:border-charcoal-600"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results / empty state */}
      {images.length === 0 ? (
        <label className="flex flex-col items-center justify-center gap-3 py-16 rounded-2xl border-2 border-dashed border-charcoal-700 hover:border-brand-500/60 hover:bg-brand-500/5 cursor-pointer transition-colors">
          <Upload size={28} className="text-charcoal-500" />
          <span className="text-charcoal-400 text-sm">Add client photos to make Instax posts or logo-stamped photos</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            className="hidden"
          />
        </label>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-charcoal-300 font-medium">
              {rendering
                ? "Rendering…"
                : `${results.length} ${noun}${results.length !== 1 ? "s" : ""} ready`}
            </span>
            {rendering && <Loader2 size={14} className="animate-spin text-charcoal-500" />}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {results.map((img, i) => (
              <div
                key={img.id}
                className="relative rounded-lg overflow-hidden border border-charcoal-700 bg-charcoal-900"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.dataUrl} alt={`Result ${i + 1}`} className="w-full h-auto" />
                <button
                  onClick={() => downloadOne(img, i)}
                  className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black"
                  aria-label="Download this photo"
                >
                  <Download size={15} />
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          {results.length > 0 && !rendering && (
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={downloadAll}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
              >
                <Download size={16} />
                {results.length > 1 ? "Download all" : "Download"}
              </button>
              <button
                onClick={generateCaption}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
              >
                <Sparkles size={16} />
                Generate caption for this post
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
