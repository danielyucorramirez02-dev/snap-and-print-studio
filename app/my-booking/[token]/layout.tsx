export default function MyBookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="camera-cursor min-h-screen bg-charcoal-950">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="text-5xl mb-3 inline-block animate-scale-bounce">📸</div>
          <h1 className="text-2xl font-bold text-white">Snap &amp; Print Studio</h1>
          <p className="text-charcoal-400 text-sm mt-1">Your Booking</p>
        </div>
        {children}
      </div>
    </div>
  );
}
