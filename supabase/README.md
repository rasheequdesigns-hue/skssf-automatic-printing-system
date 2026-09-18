# Supabase Setup Guide

## Step 1 — Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click **New Project**, give it a name like `skssf-print`
3. Choose a region close to you and set a strong database password
4. Wait ~2 minutes for it to provision

---

## Step 2 — Run the Migration

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open the file `supabase/migrations/20260918_initial.sql` from this repo
4. Paste the entire contents into the SQL editor
5. Click **Run** (green button)

This will create:
- `print_jobs` table with all columns + RLS policies
- `system_settings` table with default pricing seeded
- `user-uploads` and `user-captures` storage buckets
- Realtime enabled on both tables

---

## Step 3 — Get your API Keys

1. Go to **Project Settings → API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Step 4 — Update `.env.local`

Edit `c:\Users\rashe\Desktop\autoprint\.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...YOUR_ANON_KEY...
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_SECRET
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
NEXT_PUBLIC_DOMAIN=https://your-vercel-domain.vercel.app
```

---

## Step 5 — Verify Tables

In Supabase, go to **Table Editor** and confirm:
- `print_jobs` table exists with all columns
- `system_settings` table has 1 row with default pricing
- In **Storage**, both `user-uploads` and `user-captures` buckets exist

---

## Default Pricing (editable from /admin)

| Type   | Default Price |
|--------|--------------|
| B&W    | ₹2.00 / page |
| Colour | ₹10.00 / page |
| A3     | 1.5× multiplier |

---

## Tables Overview

### `print_jobs`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| session_id | text | Unique QR session |
| user_name | text | Customer name |
| user_phone | text | Customer phone |
| file_url | text | Uploaded document URL |
| print_type | bw / color | Print mode |
| paper_size | A4 / A3 / Letter | Paper size |
| copies | integer | Number of copies |
| total_price | numeric | Final price |
| payment_status | pending / paid / failed | Payment state |
| job_status | waiting_user → scanned → paid → printing → completed | Job lifecycle |
| user_photo_url | text | Webcam capture URL |

### `system_settings`
| Column | Default | Description |
|--------|---------|-------------|
| bw_price_per_page | 2.00 | B&W price per page |
| color_price_per_page | 10.00 | Colour price per page |
| custom_paper_size_multiplier | 1.50 | A3 cost multiplier |
| support_phone | +91 9876543210 | Displayed on /print |
| whatsapp_number | 919876543210 | WhatsApp support number |
