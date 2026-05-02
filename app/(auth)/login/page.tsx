import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoginForm from "@/components/shared/LoginForm";
import StudioLogo from "@/components/shared/StudioLogo";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="space-y-4">
      {/* Client booking card */}
      <Link href="/book"
        className="flex items-center gap-4 p-4 rounded-xl bg-brand-500/10 border border-brand-500/30 hover:bg-brand-500/15 transition-colors group">
        <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center shrink-0">
          <CalendarDays size={20} className="text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">Book a Session</p>
          <p className="text-charcoal-400 text-xs mt-0.5">No account needed — open to everyone</p>
        </div>
        <span className="text-brand-400 text-lg group-hover:translate-x-1 transition-transform">→</span>
      </Link>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-charcoal-800" />
        <span className="text-charcoal-600 text-xs">Staff &amp; Owner Login</span>
        <div className="flex-1 h-px bg-charcoal-800" />
      </div>

      {/* Staff login card */}
      <Card className="bg-charcoal-900/90 border-charcoal-700 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-4">
          <div className="flex justify-center">
            <StudioLogo size={64} />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-white">
              Snap &amp; Print Studio
            </CardTitle>
            <p className="text-charcoal-500 text-xs mt-1">Dashboard — Staff &amp; Owner only</p>
          </div>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
