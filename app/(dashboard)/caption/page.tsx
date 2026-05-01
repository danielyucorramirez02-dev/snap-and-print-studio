import { Sparkles } from "lucide-react";
import CaptionGenerator from "@/components/caption/CaptionGenerator";

export default function CaptionPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
          <Sparkles size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Caption Generator</h1>
          <p className="text-charcoal-400 text-sm">
            Upload session photos and get a ready-to-post Facebook caption
          </p>
        </div>
      </div>

      <CaptionGenerator />
    </div>
  );
}
