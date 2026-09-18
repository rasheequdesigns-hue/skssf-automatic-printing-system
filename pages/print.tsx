import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export default function PrintPage() {
  const router = useRouter();
  const { session_id } = router.query as { session_id?: string };
  const [job, setJob] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [colorMode, setColorMode] = useState<'bw' | 'color'>('bw');
  const [copies, setCopies] = useState<number>(1);
  const [paperSize, setPaperSize] = useState<'A4' | 'A3'>('A4');
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [pricing, setPricing] = useState<any>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Load job and pricing on mount
  useEffect(() => {
    if (!session_id) return;
    const fetchJob = async () => {
      const { data, error } = await supabase
        .from('print_jobs')
        .select('*')
        .eq('session_id', session_id)
        .single();
      if (error) {
        setError('Invalid session.');
        return;
      }
      // One‑time session enforcement
      if (['scanned', 'paid', 'printing', 'completed'].includes(data.job_status)) {
        setError('This QR code has expired or has already been used. Please scan a fresh code on the kiosk screen.');
        return;
      }
      setJob(data);
      // Mark as scanned
      await supabase
        .from('print_jobs')
        .update({ job_status: 'scanned' })
        .eq('id', data.id);
    };
    const fetchPricing = async () => {
      const { data, error } = await supabase.from('system_settings').select('*').single();
      if (!error) setPricing(data);
    };
    fetchJob();
    fetchPricing();
  }, [session_id]);

  // Re‑calculate total price whenever options change
  useEffect(() => {
    if (!pricing) return;
    const pricePerPage = colorMode === 'color' ? Number(pricing.color_price_per_page) : Number(pricing.bw_price_per_page);
    const multiplier = paperSize === 'A4' ? 1 : Number(pricing.custom_paper_size_multiplier || 1);
    const total = pricePerPage * multiplier * copies;
    setTotalPrice(parseFloat(total.toFixed(2)));
  }, [colorMode, copies, paperSize, pricing]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const startPayment = async () => {
    if (!job) return;
    setPaymentProcessing(true);
    // Create order on server
    const res = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: totalPrice * 100, receipt: job.id }), // amount in paise
    });
    const { order } = await res.json();
    const rzp = new (window as any).Razorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: 'Kiosk Print',
      description: 'Print Job',
      order_id: order.id,
      handler: async function (response: any) {
        // Verify payment server‑side
        const verifyRes = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            jobId: job.id,
          }),
        });
        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          alert('Payment successful!');
        } else {
          alert('Payment verification failed.');
        }
      },
      prefill: {
        name,
        contact: phone,
      },
    });
    rzp.open();
    setPaymentProcessing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    // Upload file to Supabase storage
    let fileUrl = '';
    if (file) {
      const { data, error } = await supabase.storage
        .from('user-uploads')
        .upload(`${job.id}/${file.name}`, file, { upsert: true });
      if (error) {
        setError('File upload failed.');
        return;
      }
      fileUrl = supabase.storage.from('user-uploads').getPublicUrl(data.path).data?.publicUrl;
    }
    // Update job record with user info and options
    await supabase.from('print_jobs').update({
      user_name: name,
      user_phone: phone,
      file_url: fileUrl,
      print_type: colorMode,
      paper_size: paperSize,
      copies,
      total_price: totalPrice,
    }).eq('id', job.id);
    // Initiate payment
    await startPayment();
  };

  if (error) return <div className="p-4 text-center text-red-600">{error}</div>;
  if (!job || !pricing) return <div className="p-4 text-center">Loading…</div>;

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Print Job</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded p-2" />
        </div>
        <div>
          <label className="block font-medium">Phone Number</label>
          <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded p-2" />
        </div>
        <div>
          <label className="block font-medium">Upload Document</label>
          <input type="file" accept="application/pdf,image/*" onChange={handleFileChange} className="w-full" />
        </div>
        <div className="flex space-x-4">
          <div>
            <label className="block font-medium">Color Mode</label>
            <select value={colorMode} onChange={(e) => setColorMode(e.target.value as any)} className="border rounded p-1">
              <option value="bw">B&W</option>
              <option value="color">Color</option>
            </select>
          </div>
          <div>
            <label className="block font-medium">Copies</label>
            <input type="number" min={1} value={copies} onChange={(e) => setCopies(parseInt(e.target.value) || 1)} className="w-16 border rounded p-1" />
          </div>
          <div>
            <label className="block font-medium">Paper Size</label>
            <select value={paperSize} onChange={(e) => setPaperSize(e.target.value as any)} className="border rounded p-1">
              <option value="A4">A4</option>
              <option value="A3">A3</option>
            </select>
          </div>
        </div>
        <p className="font-semibold">Total: ₹{totalPrice.toFixed(2)}</p>
        <button type="submit" disabled={paymentProcessing} className="w-full bg-teal-600 text-white py-2 rounded hover:bg-teal-700 transition">
          {paymentProcessing ? 'Processing…' : 'Pay & Print'}
        </button>
      </form>
      <div className="mt-6 text-center">
        <p>Need help? Call <a href="tel:{pricing.support_phone}" className="text-teal-600">{pricing.support_phone}</a></p>
        <a href={`https://wa.me/${pricing.whatsapp_number}?text=${encodeURIComponent('Hi, I need help with my print job. Session ID: ' + session_id)}`} target="_blank" rel="noopener" className="inline-block mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">
          WhatsApp Support
        </a>
      </div>
    </div>
  );
}
