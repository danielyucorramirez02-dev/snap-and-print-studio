import { Images } from "lucide-react";

export default function GalleryPage() {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
        <Images size={32} className="text-brand-400" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-white">Client Gallery</h2>
        <p className="text-charcoal-400 mt-1">Photo gallery coming soon.</p>
      </div>
    </div>
  );
}
