"use client";

import { useRef, useState, useTransition } from "react";
import { generateCaption } from "@/app/(dashboard)/caption/actions";
import { Button } from "@/components/ui/button";
import {
  ImagePlus,
  X,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

type SessionType = "self-shoot" | "milestone" | "coverage";

const SESSION_TYPES: { id: SessionType; label: string; emoji: string }[] = [
  { id: "self-shoot", label: "Self-Shoot", emoji: "📸" },
  { id: "milestone", label: "Milestone", emoji: "🎂" },
  { id: "coverage", label: "Photo Coverage", emoji: "🎉" },
];

const MAX_IMAGES = 5;

function resizeToBase64(file: File, maxDim = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image load failed")); };
    img.src = objectUrl;
  });
}

interface ImageEntry {
  preview: string;
  base64: string;
  name: string;
}

export default function CaptionGenerator() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sessionType, setSessionType] = useState<SessionType>("self-shoot");
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const slots = MAX_IMAGES - images.length;
    if (slots <= 0) return;

    const toProcess = Array.from(files).slice(0, slots);
    const entries: ImageEntry[] = await Promise.all(
      toProcess.map(async (file) => {
        const base64 = await resizeToBase64(file);
        return { preview: base64, base64, name: file.name };
      })
    );
    setImages((prev) => [...prev, ...entries]);
    setError("");
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setCaption("");
    setError("");
  };

  const handleGenerate = () => {
    setError("");
    setCaption("");
    startTransition(async () => {
      const result = await generateCaption(
        images.map((img) => img.base64),
        sessionType
      );
      if ("error" in result) {
        setError(result.error);
      } else {
        setCaption(result.caption);
      }
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Session Type */}
      <div>
        <p className="text-charcoal-400 text-sm mb-3">Session type</p>
        <div className="flex gap-2 flex-wrap">
          {SESSION_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSessionType(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                sessionType === t.id
                  ? "bg-brand-500/15 text-brand-400 border-brand-500/30"
                  : "bg-charcoal-900 text-charcoal-400 border-charcoal-700 hover:text-white hover:border-charcoal-600"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload Zone */}
      <div>
        <p className="text-charcoal-400 text-sm mb-3">
          Upload photos{" "}
          <span className="text-charcoal-600">
            ({images.length}/{MAX_IMAGES})
          </span>
        </p>

        {images.length < MAX_IMAGES && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-charcoal-700 rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-500/50 hover:bg-brand-500/5 transition-colors"
          >
            <ImagePlus size={28} className="text-charcoal-600" />
            <p className="text-charcoal-400 text-sm">
              Click to upload or drag &amp; drop
            </p>
            <p className="text-charcoal-600 text-xs">
              JPEG, PNG — up to {MAX_IMAGES} photos
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {/* Previews */}
        {images.length > 0 && (
          <div className="flex gap-3 flex-wrap mt-4">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.preview}
                  alt={img.name}
                  className="w-20 h-20 object-cover rounded-lg border border-charcoal-700"
                />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-charcoal-950 border border-charcoal-700 rounded-full flex items-center justify-center text-charcoal-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={images.length === 0 || isPending}
        className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 disabled:opacity-40"
      >
        {isPending ? (
          <RefreshCw size={16} className="mr-2 animate-spin" />
        ) : (
          <Sparkles size={16} className="mr-2" />
        )}
        {isPending ? "Generating caption…" : "Generate Caption"}
      </Button>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Caption Output */}
      {caption && (
        <div className="space-y-3">
          <p className="text-charcoal-400 text-sm">Generated caption</p>
          <div className="bg-charcoal-900 border border-charcoal-700 rounded-xl p-4">
            <pre className="text-white text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {caption}
            </pre>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="flex-1 border-charcoal-700 text-charcoal-300 hover:text-white hover:bg-charcoal-800"
            >
              {copied ? (
                <>
                  <Check size={15} className="mr-2 text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={15} className="mr-2" />
                  Copy to Clipboard
                </>
              )}
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isPending}
              variant="outline"
              className="flex-1 border-charcoal-700 text-charcoal-300 hover:text-white hover:bg-charcoal-800"
            >
              <RefreshCw size={15} className="mr-2" />
              Regenerate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
