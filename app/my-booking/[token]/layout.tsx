import Link from "next/link";
import StudioLogo from "@/components/shared/StudioLogo";

export default function MyBookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="camera-cursor min-h-screen bg-charcoal-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8 animate-fade-in-up">
          <Link
            href="/login"
            className="inline-flex mb-3 rounded-full animate-scale-bounce focus:outline-none focus:ring-2 focus:ring-brand-400/60"
            aria-label="Go to staff login"
          >
            <StudioLogo size={64} />
          </Link>
          <h1 className="text-2xl font-bold text-white">Snap &amp; Print Studio</h1>
          <p className="text-charcoal-400 text-sm mt-1">Your Booking</p>
        </div>
        {children}
      </div>
    </div>
  );
}
