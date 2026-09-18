// @ts-ignore
import type { NextApiRequest, NextApiResponse } from 'next';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { amount, receipt } = req.body;
  if (!amount || !receipt) {
    return res.status(400).json({ error: 'Missing amount or receipt' });
  }

  try {
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt,
      payment_capture: true,
    });
    return res.status(200).json({ order });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return res.status(500).json({ error: 'Failed to create order' });
  }
}
