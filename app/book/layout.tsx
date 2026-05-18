import Link from "next/link";
import StudioLogo from "@/components/shared/StudioLogo";

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-charcoal-950">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/login"
            className="inline-flex mb-3 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-400/60"
            aria-label="Go to staff login"
          >
            <StudioLogo size={64} />
          </Link>
          <h1 className="text-2xl font-bold text-white">Snap &amp; Print Studio</h1>
          <p className="text-charcoal-400 text-sm mt-1">Pandi, Bulacan</p>
        </div>
        {children}
      </div>
    </div>
  );
}
