import RainbowCursor from "@/components/shared/RainbowCursor";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-[#f7f5ef] px-4 py-6 text-charcoal-950 auth-rainbow-cursor">
      <RainbowCursor />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(65,185,178,0.18),transparent_34%),radial-gradient(circle_at_12%_86%,rgba(228,169,36,0.14),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.88),rgba(239,237,230,0.72))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/80 to-transparent" />
      <div className="pointer-events-none absolute -left-24 top-24 h-56 w-56 rounded-full border border-charcoal-950/10" />
      <div className="pointer-events-none absolute -right-28 bottom-16 h-72 w-72 rounded-full border border-[#43b8b2]/20" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.035]">
        <div className="h-full w-full bg-[linear-gradient(90deg,#111_1px,transparent_1px),linear-gradient(#111_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
