import Link from "next/link";
import StudioLogo from "@/components/shared/StudioLogo";

export default function BookLayout({ children }: { children: React.ReactNode }) {
  const heroSlides = [
    "/packages/solo-muna.jpg",
    "/packages/pakners.jpg",
    "/packages/trio.jpg",
    "/packages/tropa-time.jpg",
    "/packages/family.jpg",
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#14130f] text-white">
      <div className="absolute inset-x-0 top-0 h-72 overflow-hidden lg:h-full lg:w-[48%]">
        {heroSlides.map((src, index) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={src}
            src={src}
            alt=""
            className="booking-hero-slide absolute inset-0 h-full w-full object-cover"
            style={{ animationDelay: `${index * 4}s` }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal-950/25 via-charcoal-950/70 to-[#14130f] lg:bg-gradient-to-r lg:from-charcoal-950/15 lg:via-[#14130f]/55 lg:to-[#14130f]" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:gap-12 lg:py-10">
        <aside className="hidden min-h-[calc(100vh-5rem)] flex-col justify-between lg:flex">
          <div className="max-w-md pt-6">
            <Link
              href="/login"
              className="inline-flex rounded-full focus:outline-none focus:ring-2 focus:ring-brand-400/60"
              aria-label="Go to staff login"
            >
              <StudioLogo size={72} />
            </Link>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.22em] text-brand-300">Pandi, Bulacan</p>
            <h1 className="mt-3 text-5xl font-bold leading-tight text-white">Snap &amp; Print Studio</h1>
            <p className="mt-4 max-w-sm text-base leading-7 text-charcoal-200">
              Studio portraits, milestone setups, and event coverage booked in one smooth flow.
            </p>
          </div>

          <div className="mb-4 grid max-w-md grid-cols-3 gap-3">
            {[
              ["/packages/pakners.jpg", "Self-shoot sample"],
              ["/theme-photos/pink-castle.jpg", "Milestone setup sample"],
              ["/coverage/Wedding.jpg", "Photo coverage sample"],
            ].map(([src, alt]) => (
              <div key={src} className="overflow-hidden rounded-lg border border-white/10 bg-white/5 shadow-2xl shadow-black/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={alt} className="aspect-[4/5] w-full object-cover" />
              </div>
            ))}
          </div>
        </aside>

        <main
          className="min-w-0 w-full justify-self-center lg:justify-self-end"
          style={{ maxWidth: "min(32rem, calc(100vw - 2rem))" }}
        >
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-white/10 bg-charcoal-950/72 p-3 shadow-2xl shadow-black/30 backdrop-blur lg:hidden">
            <Link
              href="/login"
              className="inline-flex shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-400/60"
              aria-label="Go to staff login"
            >
              <StudioLogo size={54} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight text-white">Snap &amp; Print Studio</h1>
              <p className="text-sm text-charcoal-300">Pandi, Bulacan</p>
            </div>
          </div>

          <div className="min-w-0 max-w-full rounded-2xl border border-white/10 bg-charcoal-950/82 p-4 shadow-2xl shadow-black/35 backdrop-blur sm:p-5 lg:mt-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
