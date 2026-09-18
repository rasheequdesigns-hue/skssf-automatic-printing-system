import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import Head from 'next/head';

type ColorMode = 'bw' | 'color';
type PaperSize = 'A4' | 'A3';
type Step = 1 | 2 | 3;

/* ── Helpers ─────────────────────────────────────────────── */
function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const STEP_LABELS = ['Details', 'Document', 'Pay'];

/* ── Icons ───────────────────────────────────────────────── */
function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function IconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.23 19.79 19.79 0 0 1 1.61 2.62 2 2 0 0 1 3.6.44h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 8a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  );
}
function IconUpload() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  );
}
function IconFile() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
}
function IconCheck({ size = 24, stroke = '#fff' }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconPrinter() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
  );
}

/* ── WhatsApp SVG ────────────────────────────────────────── */
function IconWA() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.464 3.488"/>
    </svg>
  );
}

/* ── Confetti ────────────────────────────────────────────── */
function Confetti() {
  const colors = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ec4899','#14b8a6'];
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-sm opacity-0"
          style={{
            left: `${Math.random() * 100}%`,
            background: colors[i % colors.length],
            animation: `confettiFall ${1.2 + Math.random() * 1.5}s ease-in ${Math.random() * 0.8}s forwards`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────── */
export default function PrintPage() {
  const router = useRouter();
  const { session_id } = router.query as { session_id?: string };

  const [job, setJob]             = useState<any>(null);
  const [pricing, setPricing]     = useState<any>(null);
  const [expired, setExpired]     = useState(false);
  const [loading, setLoading]     = useState(true);

  const [step, setStep]           = useState<Step>(1);
  const [name, setName]           = useState('');
  const [phone, setPhone]         = useState('');
  const [phoneErr, setPhoneErr]   = useState('');
  const [file, setFile]           = useState<File | null>(null);
  const [dragOver, setDragOver]   = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>('bw');
  const [copies, setCopies]       = useState(1);
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [uploading, setUploading] = useState(false);
  const [paying, setPaying]       = useState(false);
  const [success, setSuccess]     = useState(false);
  const [liveStatus, setLiveStatus] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Fetch job + pricing ─────────────────────── */
  useEffect(() => {
    if (!session_id) return;
    (async () => {
      const [{ data: jobData, error }, { data: priceData }] = await Promise.all([
        supabase.from('print_jobs').select('*').eq('session_id', session_id).single(),
        supabase.from('system_settings').select('*').single(),
      ]);
      if (error || !jobData) { setExpired(true); setLoading(false); return; }
      if (['scanned','paid','printing','completed','expired'].includes(jobData.job_status)) {
        setExpired(true); setLoading(false); return;
      }
      setJob(jobData);
      if (priceData) setPricing(priceData);
      await supabase.from('print_jobs').update({ job_status: 'scanned' }).eq('id', jobData.id);
      setLoading(false);
    })();
  }, [session_id]);

  /* ── Realtime status after payment ──────────── */
  useEffect(() => {
    if (!job || !success) return;
    // @ts-ignore
    const ch = supabase.channel('print:' + job.id)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'print_jobs',
        filter: `id=eq.${job.id}`,
      }, (payload: any) => {
        setLiveStatus(payload.new.job_status);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [job, success]);

  /* ── Price calculation ───────────────────────── */
  const pricePerPage = pricing
    ? (colorMode === 'color' ? Number(pricing.color_price_per_page) : Number(pricing.bw_price_per_page))
    : 0;
  const sizeMultiplier = paperSize === 'A3' ? Number(pricing?.custom_paper_size_multiplier ?? 1.5) : 1;
  const totalPrice = parseFloat((pricePerPage * sizeMultiplier * copies).toFixed(2));

  /* ── Validation ──────────────────────────────── */
  const validateStep1 = () => {
    if (!name.trim()) return false;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { setPhoneErr('Enter a valid 10-digit number'); return false; }
    setPhoneErr('');
    return true;
  };

  /* ── File upload + move to step 3 ───────────── */
  const handleStep2Next = async () => {
    if (!job) return;
    setUploading(true);
    let fileUrl = '';
    if (file) {
      const { data, error: upErr } = await supabase.storage
        .from('user-uploads')
        .upload(`${job.id}/${file.name}`, file, { upsert: true });
      if (upErr) { alert('File upload failed. Please try again.'); setUploading(false); return; }
      fileUrl = supabase.storage.from('user-uploads').getPublicUrl(data.path).data.publicUrl;
    }
    await supabase.from('print_jobs').update({
      user_name: name, user_phone: phone,
      file_url: fileUrl, print_type: colorMode,
      paper_size: paperSize, copies, total_price: totalPrice,
    }).eq('id', job.id);
    setUploading(false);
    setStep(3);
  };

  /* ── Razorpay payment ────────────────────────── */
  const handlePay = async () => {
    if (!job) return;
    setPaying(true);
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(totalPrice * 100), receipt: job.id }),
      });
      const { order } = await res.json();
      const rzp = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'SKSSF Print',
        description: `${copies} × ${paperSize} ${colorMode === 'color' ? 'Colour' : 'B&W'}`,
        order_id: order.id,
        theme: { color: '#4f46e5' },
        modal: { ondismiss: () => setPaying(false) },
        handler: async (response: any) => {
          const vRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_signature:  response.razorpay_signature,
              jobId: job.id,
            }),
          });
          const { success: ok } = await vRes.json();
          if (ok) {
            setSuccess(true);
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3500);
          } else {
            alert('Payment verification failed. Please contact support.');
          }
          setPaying(false);
        },
        prefill: { name, contact: phone },
      });
      rzp.open();
    } catch {
      setPaying(false);
      alert('Could not initiate payment. Please try again.');
    }
  };

  /* ── Support link ────────────────────────────── */
  const waLink = pricing
    ? `https://wa.me/${pricing.whatsapp_number}?text=${encodeURIComponent(`Hi, I need help with my print job. Session ID: ${session_id}`)}`
    : '#';

  /* ────────────────────────────────────────────── */
  /* ── SCREENS                                     */
  /* ────────────────────────────────────────────── */

  /* Loading */
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Loading your session…</p>
      </div>
    </div>
  );

  /* Expired / used */
  if (expired) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-5">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-sm w-full text-center shadow-sm">
        <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center mx-auto mb-5">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h2 className="text-slate-900 font-bold text-xl mb-2">QR Code Expired</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          This QR code has already been scanned or processed. Please look at the kiosk screen for a fresh QR code.
        </p>
        <button
          onClick={() => window.close()}
          className="w-full h-12 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 transition-colors"
        >
          Close Window
        </button>
      </div>
    </div>
  );

  /* Success */
  if (success) {
    const statusMap: Record<string, { label: string; color: string; bg: string }> = {
      paid:      { label: 'Payment Verified', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
      printing:  { label: 'Printing Now…',    color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
      completed: { label: 'Print Complete!',  color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200' },
    };
    const st = statusMap[liveStatus] ?? statusMap.paid;

    return (
      <>
        <Head><title>Payment Successful – SKSSF Print</title></Head>
        {showConfetti && <Confetti />}
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-5">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-sm w-full text-center shadow-sm">
            {/* Animated checkmark */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                <IconCheck size={36} stroke="#10b981" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-30" />
            </div>

            <h2 className="text-slate-900 font-extrabold text-2xl mb-1">Payment Verified!</h2>
            <p className="text-slate-500 text-sm font-medium mb-1">Printing Started…</p>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Please look at the kiosk printer. Your document is being printed now.
            </p>

            {/* Live status badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold mb-6 ${st.bg} ${st.color}`}>
              <span className={`w-2 h-2 rounded-full ${liveStatus === 'printing' ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'}`} />
              {st.label}
            </div>

            {/* Session ref */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6">
              <p className="text-slate-400 text-xs mb-1">Session Reference</p>
              <p className="text-slate-700 text-xs font-mono break-all">{session_id}</p>
            </div>

            {/* WhatsApp help */}
            <a
              href={waLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl font-semibold text-sm text-white"
              style={{ background: '#25D366' }}
            >
              <IconWA /> Need help? Chat on WhatsApp
            </a>
          </div>
        </div>
      </>
    );
  }

  /* ── WIZARD ────────────────────────────────── */
  return (
    <>
      <Head><title>Print Portal – SKSSF</title></Head>
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />

      <div className="bg-slate-50 min-h-screen max-w-md mx-auto w-full flex flex-col">

        {/* ── STICKY HEADER ── */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 pt-4 pb-3 shadow-sm">
          {/* Brand row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow">
                <IconPrinter />
              </div>
              <div>
                <p className="text-slate-900 font-bold text-sm leading-none">SKSSF Print</p>
                <p className="text-slate-400 text-xs">Print Portal</p>
              </div>
            </div>
            {session_id && (
              <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-mono border border-slate-200">
                #{(session_id as string).slice(0, 8).toUpperCase()}
              </span>
            )}
          </div>

          {/* Step pills */}
          <div className="flex items-center gap-1">
            {STEP_LABELS.map((label, i) => {
              const n = (i + 1) as Step;
              const active = step === n;
              const done   = step > n;
              return (
                <div key={label} className="flex items-center gap-1 flex-1">
                  <div className={`flex items-center gap-1.5 flex-1 justify-center py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-300
                    ${done   ? 'bg-indigo-50 text-indigo-600'  :
                      active  ? 'bg-indigo-600 text-white shadow-sm' :
                                'bg-slate-100 text-slate-400'}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs
                      ${done ? 'bg-indigo-600 text-white' : active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      {done ? <IconCheck size={10} stroke="white" /> : n}
                    </span>
                    {label}
                  </div>
                  {i < 2 && <div className={`w-3 h-px flex-shrink-0 ${step > n ? 'bg-indigo-400' : 'bg-slate-200'}`} />}
                </div>
              );
            })}
          </div>
        </header>

        {/* ── SCROLLABLE CONTENT ── */}
        <div className="flex-1 overflow-y-auto pb-32">

          {/* ════ STEP 1: Details ════ */}
          {step === 1 && (
            <div className="px-4 pt-5 flex flex-col gap-4">
              <div>
                <h1 className="text-slate-900 font-extrabold text-xl">Your Details</h1>
                <p className="text-slate-400 text-sm mt-0.5">We'll use this to track your print job.</p>
              </div>

              {/* Name */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <label className="block text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wide">Full Name</label>
                <div className="flex items-center gap-3 border border-slate-200 rounded-xl px-3.5 py-3 focus-within:border-indigo-400 focus-within:ring-3 focus-within:ring-indigo-100 transition-all">
                  <span className="text-slate-400 flex-shrink-0"><IconUser /></span>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Ahmed Rasheed"
                    className="flex-1 bg-transparent text-slate-900 text-sm placeholder-slate-300 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <label className="block text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wide">Phone Number</label>
                <div className={`flex items-center gap-3 border rounded-xl px-3.5 py-3 focus-within:ring-3 transition-all
                  ${phoneErr ? 'border-red-300 focus-within:ring-red-100' : 'border-slate-200 focus-within:border-indigo-400 focus-within:ring-indigo-100'}`}>
                  <span className="text-slate-400 flex-shrink-0"><IconPhone /></span>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setPhoneErr(''); }}
                    placeholder="+91 98765 43210"
                    className="flex-1 bg-transparent text-slate-900 text-sm placeholder-slate-300 outline-none font-medium"
                  />
                </div>
                {phoneErr && <p className="text-red-500 text-xs mt-1.5 font-medium">{phoneErr}</p>}
              </div>

              {/* Support banner */}
              <SupportBanner waLink={waLink} phone={pricing?.support_phone} />
            </div>
          )}

          {/* ════ STEP 2: Document & Options ════ */}
          {step === 2 && (
            <div className="px-4 pt-5 flex flex-col gap-4">
              <div>
                <h1 className="text-slate-900 font-extrabold text-xl">Document & Options</h1>
                <p className="text-slate-400 text-sm mt-0.5">Upload your file and choose print settings.</p>
              </div>

              {/* File upload */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <label className="block text-slate-500 text-xs font-semibold mb-3 uppercase tracking-wide">Upload Document</label>
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200
                    ${dragOver         ? 'border-indigo-400 bg-indigo-50' :
                      file             ? 'border-emerald-300 bg-emerald-50/60' :
                                         'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-300'}`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }}
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <IconFile />
                      </div>
                      <p className="text-slate-800 font-semibold text-sm truncate max-w-[200px]">{file.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs">{formatBytes(file.size)}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-indigo-600 text-xs font-medium">📄 Tap to change</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-400">
                        <IconUpload />
                      </div>
                      <p className="text-slate-600 font-semibold text-sm">Tap to upload</p>
                      <p className="text-slate-400 text-xs">PDF or image files supported</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Color mode */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <label className="block text-slate-500 text-xs font-semibold mb-3 uppercase tracking-wide">Colour Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { mode: 'bw'    as ColorMode, label: 'Black & White', icon: '⬜', sub: `₹${pricing?.bw_price_per_page ?? 2}/page` },
                    { mode: 'color' as ColorMode, label: 'Full Colour',   icon: '🎨', sub: `₹${pricing?.color_price_per_page ?? 10}/page` },
                  ]).map(opt => (
                    <button
                      key={opt.mode}
                      type="button"
                      onClick={() => setColorMode(opt.mode)}
                      className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 transition-all duration-200 text-center
                        ${colorMode === opt.mode
                          ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
                    >
                      <span className="text-2xl">{opt.icon}</span>
                      <span className={`text-sm font-bold ${colorMode === opt.mode ? 'text-indigo-700' : 'text-slate-700'}`}>{opt.label}</span>
                      <span className={`text-xs font-medium ${colorMode === opt.mode ? 'text-indigo-500' : 'text-slate-400'}`}>{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Copies + Paper Size */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  {/* Copies */}
                  <div>
                    <label className="block text-slate-500 text-xs font-semibold mb-3 uppercase tracking-wide">Copies</label>
                    <div className="flex items-center justify-between bg-slate-50 rounded-xl border border-slate-200 px-1 py-1">
                      <button
                        type="button"
                        onClick={() => setCopies(c => Math.max(1, c - 1))}
                        className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-lg flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                      >−</button>
                      <span className="text-slate-900 font-extrabold text-xl tabular-nums w-8 text-center">{copies}</span>
                      <button
                        type="button"
                        onClick={() => setCopies(c => Math.min(99, c + 1))}
                        className="w-9 h-9 rounded-lg bg-indigo-600 border border-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                      >+</button>
                    </div>
                  </div>

                  {/* Paper size */}
                  <div>
                    <label className="block text-slate-500 text-xs font-semibold mb-3 uppercase tracking-wide">Paper Size</label>
                    <div className="flex gap-2">
                      {(['A4','A3'] as PaperSize[]).map(sz => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setPaperSize(sz)}
                          className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-200
                            ${paperSize === sz
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}
                        >{sz}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <SupportBanner waLink={waLink} phone={pricing?.support_phone} />
            </div>
          )}

          {/* ════ STEP 3: Summary & Pay ════ */}
          {step === 3 && (
            <div className="px-4 pt-5 flex flex-col gap-4">
              <div>
                <h1 className="text-slate-900 font-extrabold text-xl">Order Summary</h1>
                <p className="text-slate-400 text-sm mt-0.5">Review your print order before paying.</p>
              </div>

              {/* Summary card */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-indigo-600 px-5 py-4">
                  <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wide">Total Amount Due</p>
                  <p className="text-white font-extrabold text-4xl mt-1">₹{totalPrice.toFixed(2)}</p>
                </div>

                {/* Line items */}
                <div className="px-5 py-4 divide-y divide-slate-100">
                  {[
                    { label: 'Customer',   value: name },
                    { label: 'Phone',      value: phone },
                    { label: 'Colour Mode',value: colorMode === 'color' ? '🎨 Full Colour' : '⬜ Black & White' },
                    { label: 'Paper Size', value: paperSize },
                    { label: 'Copies',     value: String(copies) },
                    { label: 'Base Rate',  value: `₹${pricePerPage.toFixed(2)} / page` },
                    ...(paperSize === 'A3' ? [{ label: 'A3 Multiplier', value: `×${pricing?.custom_paper_size_multiplier ?? 1.5}` }] : []),
                    ...(file ? [{ label: 'Document', value: file.name }] : []),
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-2.5">
                      <span className="text-slate-400 text-sm">{row.label}</span>
                      <span className="text-slate-800 text-sm font-semibold truncate max-w-[180px]">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Razorpay note */}
              <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-3 border border-slate-200">
                <span className="text-xl">🔒</span>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Payments are processed securely via <span className="text-slate-700 font-semibold">Razorpay</span>. UPI, Cards, and Net Banking accepted.
                </p>
              </div>

              <SupportBanner waLink={waLink} phone={pricing?.support_phone} />
            </div>
          )}
        </div>

        {/* ── STICKY BOTTOM CTA ── */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 px-4 py-4 z-30 shadow-lg">
          {step === 1 && (
            <button
              onClick={() => { if (validateStep1()) setStep(2); }}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-semibold text-base transition-colors shadow-sm shadow-indigo-200"
            >
              Continue to Document →
            </button>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleStep2Next}
                disabled={uploading}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-base transition-colors disabled:opacity-60 shadow-sm shadow-indigo-200"
              >
                {uploading
                  ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Uploading…</span>
                  : 'Continue to Payment →'
                }
              </button>
              <button onClick={() => setStep(1)} className="w-full h-10 text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors">
                ← Back
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-2">
              <button
                onClick={handlePay}
                disabled={paying}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-base transition-colors disabled:opacity-60 shadow-sm shadow-indigo-200 flex items-center justify-center gap-2"
              >
                {paying
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing…</>
                  : <>🔒 Pay ₹{totalPrice.toFixed(2)} &amp; Print Now</>
                }
              </button>
              <button onClick={() => setStep(2)} className="w-full h-10 text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors">
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Support Banner ──────────────────────────────────────── */
function SupportBanner({ waLink, phone }: { waLink: string; phone?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <p className="text-slate-600 text-sm font-semibold mb-3">Need help with your print?</p>
      <div className="flex flex-col gap-2">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full h-11 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
          style={{ background: '#25D366' }}
        >
          <IconWA />
          Chat on WhatsApp
        </a>
        {phone && (
          <a
            href={`tel:${phone}`}
            className="flex items-center justify-center gap-2 w-full h-11 rounded-xl font-semibold text-sm text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.23 19.79 19.79 0 0 1 1.61 2.62 2 2 0 0 1 3.6.44h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 8a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            Call {phone}
          </a>
        )}
      </div>
    </div>
  );
}
