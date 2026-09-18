import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

type ColorMode = 'bw' | 'color';
type PaperSize = 'A4' | 'A3';

export default function PrintPage() {
  const router = useRouter();
  const { session_id } = router.query as { session_id?: string };

  const [job, setJob]                         = useState<any>(null);
  const [error, setError]                     = useState<string>('');
  const [name, setName]                       = useState('');
  const [phone, setPhone]                     = useState('');
  const [file, setFile]                       = useState<File | null>(null);
  const [colorMode, setColorMode]             = useState<ColorMode>('bw');
  const [copies, setCopies]                   = useState<number>(1);
  const [paperSize, setPaperSize]             = useState<PaperSize>('A4');
  const [totalPrice, setTotalPrice]           = useState<number>(0);
  const [pricing, setPricing]                 = useState<any>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [step, setStep]                       = useState<1 | 2 | 3>(1);
  const [dragOver, setDragOver]               = useState(false);
  const [paymentSuccess, setPaymentSuccess]   = useState(false);

  useEffect(() => {
    if (!session_id) return;
    const fetchJob = async () => {
      const { data, error } = await supabase
        .from('print_jobs').select('*').eq('session_id', session_id).single();
      if (error) { setError('Invalid session.'); return; }
      if (['scanned', 'paid', 'printing', 'completed'].includes(data.job_status)) {
        setError('This QR code has already been used. Please scan a fresh code at the kiosk.');
        return;
      }
      setJob(data);
      await supabase.from('print_jobs').update({ job_status: 'scanned' }).eq('id', data.id);
    };
    const fetchPricing = async () => {
      const { data } = await supabase.from('system_settings').select('*').single();
      if (data) setPricing(data);
    };
    fetchJob();
    fetchPricing();
  }, [session_id]);

  useEffect(() => {
    if (!pricing) return;
    const pricePerPage = colorMode === 'color'
      ? Number(pricing.color_price_per_page)
      : Number(pricing.bw_price_per_page);
    const multiplier = paperSize === 'A3' ? Number(pricing.custom_paper_size_multiplier ?? 1.5) : 1;
    setTotalPrice(parseFloat((pricePerPage * multiplier * copies).toFixed(2)));
  }, [colorMode, copies, paperSize, pricing]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const startPayment = async () => {
    if (!job) return;
    setPaymentProcessing(true);
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
      theme: { color: '#14b8a6' },
      handler: async (response: any) => {
        const verifyRes = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_signature:  response.razorpay_signature,
            jobId: job.id,
          }),
        });
        const { success } = await verifyRes.json();
        if (success) { setPaymentSuccess(true); setStep(3); }
        else alert('Payment verification failed. Please contact support.');
      },
      prefill: { name, contact: phone },
    });
    rzp.open();
    setPaymentProcessing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    let fileUrl = '';
    if (file) {
      const { data, error: uploadErr } = await supabase.storage
        .from('user-uploads')
        .upload(`${job.id}/${file.name}`, file, { upsert: true });
      if (uploadErr) { setError('File upload failed. Please try again.'); return; }
      fileUrl = supabase.storage.from('user-uploads').getPublicUrl(data.path).data.publicUrl;
    }
    await supabase.from('print_jobs').update({
      user_name: name, user_phone: phone,
      file_url: fileUrl, print_type: colorMode,
      paper_size: paperSize, copies, total_price: totalPrice,
    }).eq('id', job.id);
    setStep(2);
    await startPayment();
  };

  // ── Error state ──
  if (error) {
    return (
      <div className="min-h-screen bg-hero-gradient flex items-center justify-center px-4">
        <div className="glass-dark rounded-3xl p-10 max-w-sm w-full text-center border border-red-500/20">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-white font-bold text-lg mb-2">Session Expired</h2>
          <p className="text-slate-400 text-sm leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (!job || !pricing) {
    return (
      <div className="min-h-screen bg-hero-gradient flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading your session…</p>
        </div>
      </div>
    );
  }

  // ── Success state ──
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-hero-gradient flex items-center justify-center px-4">
        <div className="glass-dark rounded-3xl p-10 max-w-sm w-full text-center border border-teal-500/20 fade-in-up">
          <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto mb-5">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-white font-bold text-xl mb-2">Payment Successful!</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Your document is being printed. Please collect it from the kiosk.
          </p>
          <div className="bg-teal-500/10 rounded-xl px-4 py-3 border border-teal-500/20">
            <p className="text-teal-300 text-xs font-medium">Session ID</p>
            <p className="text-white text-sm font-mono mt-1">{session_id}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ──
  return (
    <>
      {/* Razorpay script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />

      <div className="min-h-screen bg-hero-gradient flex flex-col">
        {/* Header */}
        <header className="px-5 py-4 flex items-center gap-3 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-teal-gradient flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">SKSSF Print</p>
            <p className="text-slate-500 text-xs">Print Portal</p>
          </div>
        </header>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-3 py-5 px-4">
          {(['Details', 'Payment', 'Done'] as const).map((label, i) => {
            const n = i + 1;
            const active  = step === n;
            const done    = step > n;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                  ${done   ? 'bg-teal-500 text-white' :
                    active  ? 'bg-teal-500/20 border border-teal-500 text-teal-300' :
                              'bg-white/5 border border-white/10 text-slate-500'}`}>
                  {done ? '✓' : n}
                </div>
                <span className={`text-xs font-medium transition-colors ${active ? 'text-white' : done ? 'text-teal-400' : 'text-slate-500'}`}>{label}</span>
                {i < 2 && <div className={`w-8 h-px mx-1 ${step > n ? 'bg-teal-500' : 'bg-white/10'}`} />}
              </div>
            );
          })}
        </div>

        {/* Form */}
        <main className="flex-1 flex flex-col items-center px-4 pb-8">
          <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col gap-5">

            {/* Personal info */}
            <div className="glass-dark rounded-2xl p-5 border border-white/10">
              <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 text-xs">1</span>
                Your Details
              </h2>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">Full Name</label>
                  <input
                    required value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Ahmed Rasheed"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/50 focus:bg-teal-500/5 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">Phone Number</label>
                  <input
                    required type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/50 focus:bg-teal-500/5 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* File upload */}
            <div className="glass-dark rounded-2xl p-5 border border-white/10">
              <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 text-xs">2</span>
                Upload Document
              </h2>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer
                  ${dragOver ? 'border-teal-400 bg-teal-500/10' : file ? 'border-teal-500/40 bg-teal-500/5' : 'border-white/10 hover:border-teal-500/30 hover:bg-white/5'}`}
              >
                <input
                  type="file" accept="application/pdf,image/*"
                  onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="text-teal-300 text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                  </div>
                ) : (
                  <>
                    <svg className="mx-auto mb-2" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
                      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                    </svg>
                    <p className="text-slate-400 text-sm">Drop file here or <span className="text-teal-400">browse</span></p>
                    <p className="text-slate-600 text-xs mt-1">PDF or image files</p>
                  </>
                )}
              </div>
            </div>

            {/* Print options */}
            <div className="glass-dark rounded-2xl p-5 border border-white/10">
              <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 text-xs">3</span>
                Print Options
              </h2>
              <div className="flex flex-col gap-4">
                {/* Color mode toggle */}
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-2">Colour Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['bw', 'color'] as ColorMode[]).map(mode => (
                      <button
                        key={mode} type="button"
                        onClick={() => setColorMode(mode)}
                        className={`py-2.5 rounded-xl text-sm font-medium border transition-all duration-200
                          ${colorMode === mode
                            ? 'bg-teal-500/20 border-teal-500/50 text-teal-300'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                      >
                        {mode === 'bw' ? '⬜ B&W' : '🎨 Colour'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Paper size */}
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-2">Paper Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['A4', 'A3'] as PaperSize[]).map(size => (
                      <button
                        key={size} type="button"
                        onClick={() => setPaperSize(size)}
                        className={`py-2.5 rounded-xl text-sm font-medium border transition-all duration-200
                          ${paperSize === size
                            ? 'bg-teal-500/20 border-teal-500/50 text-teal-300'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Copies */}
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-2">Copies</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCopies(c => Math.max(1, c - 1))}
                      className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors flex items-center justify-center"
                    >−</button>
                    <span className="text-white font-semibold text-lg w-8 text-center tabular-nums">{copies}</span>
                    <button
                      type="button"
                      onClick={() => setCopies(c => c + 1)}
                      className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors flex items-center justify-center"
                    >+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Price summary */}
            <div className="bg-teal-500/10 rounded-2xl p-5 border border-teal-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs">Total Amount</p>
                  <p className="text-teal-300 text-3xl font-extrabold mt-1">₹{totalPrice.toFixed(2)}</p>
                </div>
                <div className="text-right text-xs text-slate-500 space-y-1">
                  <p>{copies} × {paperSize}</p>
                  <p>{colorMode === 'color' ? 'Colour' : 'B&W'}</p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={paymentProcessing}
              className="w-full bg-teal-gradient text-white font-semibold py-4 rounded-2xl shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {paymentProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing…
                </span>
              ) : 'Pay & Print →'}
            </button>

            {/* Support */}
            {pricing && (
              <div className="flex items-center justify-center gap-3 pt-1">
                <a
                  href={`tel:${pricing.support_phone}`}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-teal-300 text-xs transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.23 19.79 19.79 0 0 1 1.61 2.62 2 2 0 0 1 3.6.44h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  Call Support
                </a>
                <span className="text-white/10">|</span>
                <a
                  href={`https://wa.me/${pricing.whatsapp_number}?text=${encodeURIComponent('Hi, I need help with my print job. Session: ' + session_id)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-slate-400 hover:text-green-400 text-xs transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0 0 20.464 3.488" />
                  </svg>
                  WhatsApp
                </a>
              </div>
            )}
          </form>
        </main>
      </div>
    </>
  );
}
