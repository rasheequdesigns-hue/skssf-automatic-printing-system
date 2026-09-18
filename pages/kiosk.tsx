import { useEffect, useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabaseClient';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  waiting_user: { label: 'Waiting for scan', color: 'text-slate-400', icon: '⏳' },
  scanned:      { label: 'QR Scanned',        color: 'text-blue-400',  icon: '📱' },
  paid:         { label: 'Payment received',  color: 'text-teal-400',  icon: '✅' },
  printing:     { label: 'Printing…',         color: 'text-amber-400', icon: '🖨️' },
  completed:    { label: 'Print complete',    color: 'text-green-400', icon: '🎉' },
};

export default function Kiosk() {
  const [sessionId, setSessionId]   = useState<string>('');
  const [jobStatus, setJobStatus]   = useState<string>('waiting_user');
  const [jobCount, setJobCount]     = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>('');
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Clock
  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Init session
  useEffect(() => {
    const init = async () => {
      const id = uuidv4();
      setSessionId(id);
      setJobStatus('waiting_user');
      await supabase.from('print_jobs').insert({ session_id: id, job_status: 'waiting_user' });
      // Total job count
      const { count } = await supabase.from('print_jobs').select('*', { count: 'exact', head: true });
      setJobCount(count ?? 0);
    };
    init();
  }, []);

  // Webcam (hidden)
  useEffect(() => {
    const getCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      } catch (e) { console.error('Webcam error:', e); }
    };
    getCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Realtime
  useEffect(() => {
    if (!sessionId) return;
    // @ts-ignore
    const channel = supabase
      .channel('kiosk:' + sessionId)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'print_jobs',
        filter: `session_id=eq.${sessionId}`,
      }, (payload: any) => {
        const { payment_status, job_status } = payload.new;
        setJobStatus(job_status);
        if (payment_status === 'paid') handlePaid(payload.new);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const handlePaid = async (job: any) => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const filePath = `${job.id}/${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('user-captures').upload(filePath, blob, { upsert: true, contentType: 'image/png' });
      if (uploadError) { console.error('Upload error:', uploadError); return; }
      const { data } = supabase.storage.from('user-captures').getPublicUrl(filePath);
      await supabase.from('print_jobs')
        .update({ user_photo_url: data.publicUrl, job_status: 'printing' })
        .eq('id', job.id);
      window.print();
      setTimeout(async () => {
        await supabase.from('print_jobs').update({ job_status: 'completed' }).eq('id', job.id);
        // New session
        const newId = uuidv4();
        setSessionId(newId);
        setJobStatus('waiting_user');
        await supabase.from('print_jobs').insert({ session_id: newId, job_status: 'waiting_user' });
        setJobCount(c => c + 1);
      }, 3000);
    }, 'image/png');
  };

  const qrUrl = `${process.env.NEXT_PUBLIC_DOMAIN}/print?session_id=${sessionId}`;
  const status = STATUS_CONFIG[jobStatus] ?? STATUS_CONFIG.waiting_user;
  const isActive = jobStatus !== 'waiting_user';

  return (
    <div className="min-h-screen bg-hero-gradient flex flex-col select-none">
      {/* Hidden video/canvas */}
      <video ref={videoRef} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-gradient flex items-center justify-center shadow-lg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">SKSSF Print</p>
            <p className="text-slate-400 text-xs mt-0.5">Kiosk Terminal</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-white font-semibold text-lg leading-none tabular-nums">{currentTime}</p>
            <p className="text-slate-400 text-xs mt-0.5">Jobs today: {jobCount}</p>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-teal-400 pulse-ring' : 'bg-slate-500'}`} />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 px-8 py-8">

        {/* Left — instructions */}
        <div className="flex flex-col gap-6 max-w-sm w-full">
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-2 leading-tight">
              Self-Service<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-400">
                Print Station
              </span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Scan the QR code with your smartphone to upload your document, choose print options, and pay securely.
            </p>
          </div>

          {/* Steps */}
          {[
            { n: '1', title: 'Scan QR',        desc: 'Use your phone camera to scan the code' },
            { n: '2', title: 'Upload & Choose', desc: 'Upload document, select colour & copies' },
            { n: '3', title: 'Pay',             desc: 'Complete payment via Razorpay' },
            { n: '4', title: 'Collect Print',   desc: 'Your document prints automatically' },
          ].map(step => (
            <div key={step.n} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-teal-300 text-xs font-bold">{step.n}</span>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{step.title}</p>
                <p className="text-slate-400 text-xs">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Right — QR card */}
        <div className="flex flex-col items-center gap-6">
          <div className="glass-dark rounded-3xl p-8 flex flex-col items-center gap-5 shadow-2xl shadow-black/40 border border-white/10">
            {/* Status pill */}
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium ${status.color}`}>
              <span>{status.icon}</span>
              <span>{status.label}</span>
            </div>

            {/* QR */}
            <div className="bg-white rounded-2xl p-5 shadow-lg">
              {sessionId ? (
                <QRCode value={qrUrl} size={200} level="H" />
              ) : (
                <div className="w-[200px] h-[200px] shimmer rounded-xl" />
              )}
            </div>

            <div className="text-center">
              <p className="text-slate-400 text-xs">Scan with your phone camera</p>
              {sessionId && (
                <p className="text-slate-600 text-xs mt-1 font-mono">
                  {sessionId.slice(0, 8)}…
                </p>
              )}
            </div>
          </div>

          {/* Status bar below QR */}
          {jobStatus !== 'waiting_user' && (
            <div className="glass-dark rounded-2xl px-6 py-4 flex items-center gap-3 border border-teal-500/20 fade-in-up">
              <div className="w-2 h-2 rounded-full bg-teal-400 pulse-ring" />
              <p className="text-teal-300 text-sm font-medium">{status.label}</p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom bar */}
      <footer className="px-8 py-4 flex items-center justify-between border-t border-white/5">
        <p className="text-slate-600 text-xs">SKSSF Automated Printing System</p>
        <p className="text-slate-600 text-xs">A new QR is generated after each job</p>
      </footer>
    </div>
  );
}
