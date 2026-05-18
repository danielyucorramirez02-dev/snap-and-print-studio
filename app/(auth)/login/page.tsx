import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoginForm from "@/components/shared/LoginForm";
import StudioLogo from "@/components/shared/StudioLogo";
import Link from "next/link";
import { ArrowRight, CalendarDays, Camera } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="animate-fade-in-up space-y-3">
      <div className="text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-charcoal-950/10 bg-white/70 p-3 shadow-xl shadow-charcoal-950/10 backdrop-blur sm:h-28 sm:w-28">
          <StudioLogo size={84} />
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2b9f9a]">Studio OS</p>
        <h1 className="mt-1 text-2xl font-black tracking-normal text-charcoal-950">Snap &amp; Print</h1>
        <p className="mt-1 text-sm text-charcoal-600">Photography, bookings, and daily studio flow.</p>
      </div>

      <Link
        href="/book"
        className="group flex items-center gap-4 rounded-lg border border-[#43b8b2]/25 bg-white/80 p-4 shadow-lg shadow-charcoal-950/10 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-[#43b8b2]/45 hover:bg-white hover:shadow-xl hover:shadow-[#43b8b2]/10 focus:outline-none focus:ring-2 focus:ring-[#43b8b2]/40"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#43b8b2]/20 bg-[#43b8b2]/10">
          <CalendarDays size={20} className="text-[#238f8b]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-charcoal-950">Book a Session</p>
          <p className="mt-0.5 text-xs text-charcoal-600">Open to everyone. No account needed.</p>
        </div>
        <ArrowRight size={18} className="text-[#238f8b] transition-transform duration-300 group-hover:translate-x-1" />
      </Link>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-charcoal-950/10" />
        <span className="text-xs font-medium text-charcoal-500">Staff &amp; Owner Login</span>
        <div className="h-px flex-1 bg-charcoal-950/10" />
      </div>

      <Card className="overflow-hidden rounded-lg border-charcoal-950/10 bg-white/85 text-charcoal-950 shadow-2xl shadow-charcoal-950/10 backdrop-blur-xl">
        <CardHeader className="space-y-2 border-b border-charcoal-950/10 bg-white/50 p-4 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-brand-500/15 bg-brand-500/10">
            <Camera size={19} className="text-brand-600" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-charcoal-950">Welcome back</CardTitle>
            <p className="mt-1 text-xs text-charcoal-500">Dashboard access for the studio team.</p>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
