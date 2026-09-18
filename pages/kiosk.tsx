'use client';
import { useEffect, useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabaseClient';

/* ── Status definitions ─────────────────────────────────── */
const STATUSES: Record<string, {
  label: string;
  sub: string;
  ring: string;
  dot: string;
  badge: string;
  progress: number;
}> = {
  waiting_user: {
    label: 'Ready to Print',
    sub: 'Scan the QR code with your phone to get started',
    ring: 'from-teal-400/30 via-teal-400/10 to-transparent',
    dot: 'bg-teal-400',
    badge: 'bg-teal-500/10 border-teal-500/25 text-teal-300',
    progress: 0,
  },
  scanned: {
    label: 'QR Scanned',
    sub: 'User is filling in print details on their phone',
    ring: 'from-blue-400/30 via-blue-400/10 to-transparent',
    dot: 'bg-blue-400',
    badge: 'bg-blue-500/10 border-blue-500/25 text-blue-300',
    progress: 33,
  },
  paid: {
    label: 'Payment Received',
    sub: 'Capturing photo and preparing to print…',
    ring: 'from-violet-400/30 via-violet-400/10 to-transparent',
    dot: 'bg-violet-400',
    badge: 'bg-violet-500/10 border-violet-500/25 text-violet-300',
    progress: 66,
  },
  printing: {
    label: 'Printing…',
    sub: 'Please wait while your document is being printed',
    ring: 'from-amber-400/30 via-amber-400/10 to-transparent',
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/10 border-amber-500/25 text-amber-300',
    progress: 88,
  },
  completed: {
    label: 'Print Complete!',
    sub: 'Collect your document. A new session will start shortly.',
    ring: 'from-green-400/30 via-green-400/10 to-transparent',
    dot: 'bg-green-400',
    badge: 'bg-green-500/10 border-green-500/25 text-green-300',
    progress: 100,
  },
};

const STEPS = [
  { icon: '📱', title: 'Scan QR',        desc: 'Point your phone camera at the code' },
  { icon: '📄', title: 'Upload File',     desc: 'Select your document & print options' },
  { icon: '💳', title: 'Pay Securely',    desc: 'Complete payment via Razorpay' },
  { icon: '🖨️', title: 'Collect Print',  desc: 'Pick up your document from the tray' },
];

/* ── Component ──────────────────────────────────────────── */
export default function Kiosk() {
  const [sessionId, setSessionId]   = useState('');
  const [jobStatus, setJobStatus]   = useState('waiting_user');
  const [jobCount, setJobCount]     = useState(0);
  const [time, setTime]             = useState('');
  const [date, setDate]             = useState('');
  const [qrReady, setQrReady]       = useState(false);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* Clock */
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }));
      setDate(now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* Init session */
  useEffect(() => {
    const init = async () => {
      setQrReady(false);
      const id = uuidv4();
      setSessionId(id);
      setJobStatus('waiting_user');
      await supabase.from('print_jobs').insert({ session_id: id, job_status: 'waiting_user' });
      const { count } = await supabase
        .from('print_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('job_status', 'completed');
      setJobCount(count ?? 0);
      setTimeout(() => setQrReady(true), 300);
    };
    init();
  }, []);

  /* Webcam */
  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: true }).then(stream => {
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    }).catch(() => {});
    return () => {
      if (videoRef.current?.srcObject)
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, []);

  /* Realtime */
  useEffect(() => {
    if (!sessionId) return;
    // @ts-ignore
    const ch = supabase.channel('kiosk:' + sessionId)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'print_jobs',
        filter: `session_id=eq.${sessionId}`,
      }, (payload: any) => {
        const { payment_status, job_status } = payload.new;
        setJobStatus(job_status);
        if (payment_status === 'paid') handlePaid(payload.new);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionId]);

  const handlePaid = async (job: any) => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (canvas && video) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const path = `${job.id}/${Date.now()}.png`;
          await supabase.storage.from('user-captures').upload(path, blob, { upsert: true, contentType: 'image/png' });
          const { data } = supabase.storage.from('user-captures').getPublicUrl(path);
          await supabase.from('print_jobs').update({ user_photo_url: data.publicUrl, job_status: 'printing' }).eq('id', job.id);
          window.print();
          setTimeout(async () => {
            await supabase.from('print_jobs').update({ job_status: 'completed' }).eq('id', job.id);
            setJobCount(c => c + 1);
            setTimeout(async () => {
              const newId = uuidv4();
              setQrReady(false);
              setSessionId(newId);
              setJobStatus('waiting_user');
              await supabase.from('print_jobs').insert({ session_id: newId, job_status: 'waiting_user' });
              setTimeout(() => setQrReady(true), 400);
            }, 2000);
          }, 3000);
        }, 'image/png');
      }
    }
  };

  const qrUrl = `${process.env.NEXT_PUBLIC_DOMAIN}/print?session_id=${sessionId}`;
  const st    = STATUSES[jobStatus] ?? STATUSES.waiting_user;
  const isIdle = jobStatus === 'waiting_user';

  return (
    <div
      className="min-h-screen w-full flex flex-col select-none overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #060d1a 0%, #0a1f1c 45%, #060d1a 100%)' }}
    >
      {/* Hidden media */}
      <video ref={videoRef} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* ── TOP BAR ── */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 flex-shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0891b2)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none tracking-tight">SKSSF Print</p>
            <p className="text-slate-500 text-xs mt-0.5">Self-Service Kiosk</p>
          </div>
        </div>

        {/* Center — live status bar */}
        <div className="hidden md:flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-5 py-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot} ${jobStatus === 'printing' ? 'animate-pulse' : ''}`} />
          <span className="text-white text-sm font-medium">{st.label}</span>
        </div>

        {/* Clock */}
        <div className="text-right">
          <p className="text-white font-bold text-xl leading-none tabular-nums">{time}</p>
          <p className="text-slate-500 text-xs mt-1">{date}</p>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 xl:gap-20 px-6 py-6">

        {/* LEFT PANEL */}
        <div className="flex flex-col gap-8 max-w-xs w-full">

          {/* Title */}
          <div>
            <p className="text-teal-400 text-xs font-semibold tracking-widest uppercase mb-3">How it works</p>
            <h1 className="text-white font-extrabold text-3xl leading-tight">
              Print in<br />
              <span style={{ background: 'linear-gradient(90deg, #2dd4bf, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                4 easy steps
              </span>
            </h1>
          </div>

          {/* Steps */}
          <div className="flex flex-col gap-3">
            {STEPS.map((step, i) => {
              const isActive = i < [0,1,2,3,4][['waiting_user','scanned','paid','printing','completed'].indexOf(jobStatus) + 1] || false;
              const done = ['scanned','paid','printing','completed'].indexOf(jobStatus) >= i;
              return (
                <div key={i}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all duration-500
                    ${done
                      ? 'bg-teal-500/10 border-teal-500/20'
                      : 'bg-white/3 border-white/5'}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg transition-all duration-500
                    ${done ? 'bg-teal-500/20' : 'bg-white/5'}`}>
                    {done && i < ['scanned','paid','printing','completed'].indexOf(jobStatus)
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      : <span>{step.icon}</span>
                    }
                  </div>
                  <div>
                    <p className={`text-sm font-semibold leading-none ${done ? 'text-teal-300' : 'text-slate-300'}`}>{step.title}</p>
                    <p className="text-slate-500 text-xs mt-1">{step.desc}</p>
                  </div>
                  <div className={`ml-auto w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 text-xs font-bold
                    ${done ? 'border-teal-500/40 text-teal-400' : 'border-white/10 text-slate-600'}`}>
                    {i + 1}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/8 rounded-2xl px-4 py-3">
              <p className="text-slate-500 text-xs">Jobs completed</p>
              <p className="text-white font-bold text-2xl tabular-nums mt-0.5">{jobCount}</p>
            </div>
            <div className="bg-white/5 border border-white/8 rounded-2xl px-4 py-3">
              <p className="text-slate-500 text-xs">Status</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                <p className="text-white font-semibold text-sm capitalize">{jobStatus.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER — QR DISPLAY */}
        <div className="flex flex-col items-center gap-6">

          {/* Glow rings */}
          <div className="relative flex items-center justify-center">
            {/* Outer glow ring */}
            <div className={`absolute w-[360px] h-[360px] rounded-full bg-gradient-radial ${st.ring} blur-2xl transition-all duration-1000`} />
            {/* Animated ring 1 */}
            <div className={`absolute w-[320px] h-[320px] rounded-full border transition-all duration-700
              ${isIdle ? 'border-teal-500/15 animate-ping' : 'border-teal-500/30'}`}
              style={{ animationDuration: '3s' }} />
            {/* Animated ring 2 */}
            <div className={`absolute w-[280px] h-[280px] rounded-full border transition-all duration-700
              ${isIdle ? 'border-teal-400/10 animate-ping' : 'border-teal-400/20'}`}
              style={{ animationDuration: '3s', animationDelay: '1s' }} />

            {/* QR card */}
            <div className="relative z-10 rounded-3xl p-6 flex flex-col items-center gap-4 shadow-2xl"
              style={{
                background: 'rgba(15,23,42,0.85)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(20,184,166,0.08)',
              }}>

              {/* QR wrapper */}
              <div className="relative">
                <div className="bg-white rounded-2xl p-4 shadow-xl"
                  style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                  {qrReady && sessionId ? (
                    <div style={{ opacity: qrReady ? 1 : 0, transition: 'opacity 0.4s ease' }}>
                      <QRCode
                        value={qrUrl}
                        size={220}
                        level="H"
                        style={{ display: 'block' }}
                      />
                    </div>
                  ) : (
                    <div className="w-[220px] h-[220px] rounded-xl shimmer" />
                  )}
                </div>

                {/* Corner accents */}
                {['top-0 left-0', 'top-0 right-0 rotate-90', 'bottom-0 right-0 rotate-180', 'bottom-0 left-0 -rotate-90'].map((pos, i) => (
                  <div key={i} className={`absolute ${pos} w-5 h-5`}>
                    <div className="absolute top-0 left-0 w-5 h-1 bg-teal-400 rounded-full" />
                    <div className="absolute top-0 left-0 w-1 h-5 bg-teal-400 rounded-full" />
                  </div>
                ))}
              </div>

              {/* Label */}
              <div className="text-center">
                <p className="text-white font-semibold text-sm">Scan to Print</p>
                <p className="text-slate-400 text-xs mt-1">Use your phone camera or QR scanner</p>
              </div>

              {/* Session ID */}
              {sessionId && (
                <div className="w-full bg-white/5 rounded-xl px-4 py-2.5 flex items-center justify-between border border-white/8">
                  <span className="text-slate-500 text-xs">Session</span>
                  <span className="text-slate-300 text-xs font-mono">{sessionId.slice(0, 8).toUpperCase()}…</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-[290px]">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold ${st.badge.includes('teal') ? 'text-teal-400' : st.badge.includes('blue') ? 'text-blue-400' : st.badge.includes('amber') ? 'text-amber-400' : st.badge.includes('green') ? 'text-green-400' : 'text-violet-400'}`}>
                {st.label}
              </span>
              <span className="text-slate-600 text-xs">{st.progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${st.progress}%`,
                  background: 'linear-gradient(90deg, #14b8a6, #38bdf8)',
                }}
              />
            </div>
            <p className="text-slate-500 text-xs mt-2 text-center">{st.sub}</p>
          </div>
        </div>

        {/* RIGHT PANEL — pricing hint */}
        <div className="hidden xl:flex flex-col gap-4 max-w-xs w-full">
          <p className="text-teal-400 text-xs font-semibold tracking-widest uppercase">Pricing</p>

          {[
            { label: 'B&W Print',    price: '₹2', unit: '/ page',  icon: '⬜', color: 'border-slate-500/20 bg-slate-500/5' },
            { label: 'Colour Print', price: '₹10', unit: '/ page', icon: '🎨', color: 'border-violet-500/20 bg-violet-500/5' },
            { label: 'A4 / A3',     price: '1×',  unit: '/ 1.5×', icon: '📐', color: 'border-blue-500/20 bg-blue-500/5' },
          ].map((item, i) => (
            <div key={i} className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border ${item.color}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-slate-300 text-sm font-medium">{item.label}</span>
              </div>
              <div className="text-right">
                <span className="text-white font-bold text-lg">{item.price}</span>
                <span className="text-slate-500 text-xs ml-1">{item.unit}</span>
              </div>
            </div>
          ))}

          <div className="mt-2 bg-white/5 border border-white/8 rounded-2xl p-4">
            <p className="text-slate-400 text-xs leading-relaxed">
              📞 Need help? Call or WhatsApp our support team. A new QR code is generated automatically after each job.
            </p>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-teal-500/5 border border-teal-500/15">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse flex-shrink-0" />
            <span className="text-teal-300 text-xs font-medium">System online · Realtime sync active</span>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="px-8 py-3 border-t border-white/5 flex items-center justify-between flex-shrink-0">
        <p className="text-slate-700 text-xs">© SKSSF Automated Print System</p>
        <p className="text-slate-700 text-xs">A new QR is generated after every completed job</p>
      </footer>
    </div>
  );
}
