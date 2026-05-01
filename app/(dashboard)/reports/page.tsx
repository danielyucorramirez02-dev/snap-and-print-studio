import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
        <BarChart3 size={32} className="text-brand-400" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-white">Reports</h2>
        <p className="text-charcoal-400 mt-1">Business reports coming soon.</p>
      </div>
    </div>
  );
}
