import type { NextApiRequest, NextApiResponse } from 'next';
import Razorpay from 'razorpay';
import { supabase } from '@/lib/supabaseClient';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, jobId } = req.body;
  // TODO: verify signature according to Razorpay docs (omitted for brevity)
  try {
    // Update payment status in Supabase
    const { error } = await supabase
      .from('print_jobs')
      .update({ payment_status: 'paid', razorpay_payment_id, razorpay_order_id })
      .eq('id', jobId);
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Verification error:', err);
    return res.status(500).json({ success: false, error: 'Verification failed' });
  }
}
