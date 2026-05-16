import { Frame } from "lucide-react";
import PhotoToolClient from "@/components/photo-tool/PhotoToolClient";

export default function PhotoToolPage() {
  return (
    <div>
      {/* Calligraphy font for the Instax frame's studio name */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&display=swap"
      />

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
          <Frame size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Instax Maker</h1>
          <p className="text-charcoal-400 text-sm">Frame client photos for your Facebook posts</p>
        </div>
      </div>

      <PhotoToolClient />
    </div>
  );
}
