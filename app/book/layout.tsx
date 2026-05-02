export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-charcoal-950">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">📸</div>
          <h1 className="text-2xl font-bold text-white">Snap &amp; Print Studio</h1>
          <p className="text-charcoal-400 text-sm mt-1">Pandi, Bulacan</p>
        </div>
        {children}
      </div>
    </div>
  );
}
