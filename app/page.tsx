import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-hero-gradient flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-gradient flex items-center justify-center shadow-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">SKSSF Print</span>
        </div>
        <Link
          href="/admin"
          className="text-sm text-teal-300 hover:text-white transition-colors duration-200 font-medium"
        >
          Admin →
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="fade-in-up max-w-2xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 text-teal-300 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
            <span className="w-2 h-2 rounded-full bg-teal-400 pulse-ring inline-block" />
            System Online
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6">
            Automated{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-400">
              Kiosk Printing
            </span>
          </h1>

          <p className="text-slate-400 text-lg sm:text-xl leading-relaxed mb-12 max-w-xl mx-auto">
            Scan. Upload. Pay. Print. A seamless self-service printing experience powered by SKSSF.
          </p>

          {/* Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {/* Kiosk */}
            <Link
              href="/kiosk"
              className="group glass-dark rounded-2xl p-6 flex flex-col items-center gap-3 hover:bg-teal-500/10 hover:border-teal-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-500/10"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-gradient flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <span className="text-white font-semibold text-base">Kiosk</span>
              <span className="text-slate-400 text-xs text-center">Open on kiosk PC to generate QR codes</span>
            </Link>

            {/* Print */}
            <Link
              href="/print"
              className="group glass-dark rounded-2xl p-6 flex flex-col items-center gap-3 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <span className="text-white font-semibold text-base">Print Portal</span>
              <span className="text-slate-400 text-xs text-center">Upload document and pay on your phone</span>
            </Link>

            {/* Admin */}
            <Link
              href="/admin"
              className="group glass-dark rounded-2xl p-6 flex flex-col items-center gap-3 hover:bg-violet-500/10 hover:border-violet-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <span className="text-white font-semibold text-base">Admin</span>
              <span className="text-slate-400 text-xs text-center">Monitor jobs, pricing, and live status</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-slate-500 text-sm">
        © {new Date().getFullYear()} SKSSF Automatic Printing System
      </footer>
    </div>
  );
}
