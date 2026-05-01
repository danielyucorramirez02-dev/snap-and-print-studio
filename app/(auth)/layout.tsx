export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-charcoal-800">
      {/* Subtle silhouette background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <svg viewBox="0 0 800 600" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          {/* Camera silhouette */}
          <rect x="300" y="220" width="200" height="160" rx="20" fill="currentColor" />
          <circle cx="400" cy="300" r="55" fill="none" stroke="currentColor" strokeWidth="20" />
          <circle cx="400" cy="300" r="30" fill="currentColor" />
          <rect x="340" y="200" width="60" height="25" rx="5" fill="currentColor" />
          {/* Person silhouette */}
          <ellipse cx="150" cy="180" rx="40" ry="50" fill="currentColor" />
          <path d="M70 400 Q150 280 230 400 L230 500 L70 500 Z" fill="currentColor" />
          {/* Another person */}
          <ellipse cx="650" cy="200" rx="35" ry="45" fill="currentColor" />
          <path d="M580 420 Q650 300 720 420 L720 520 L580 520 Z" fill="currentColor" />
        </svg>
      </div>
      <div className="relative z-10 w-full max-w-md px-4">
        {children}
      </div>
    </div>
  );
}
