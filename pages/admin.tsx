import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Job {
  id: string;
  session_id: string;
  user_name: string | null;
  user_phone: string | null;
  file_url: string | null;
  print_type: string | null;
  paper_size: string | null;
  copies: number | null;
  total_price: number | null;
  payment_status: string;
  job_status: string;
  user_photo_url: string | null;
  created_at: string;
}

export default function AdminDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [editing, setEditing] = useState<boolean>(false);
  const [bwPrice, setBwPrice] = useState<string>('');
  const [colorPrice, setColorPrice] = useState<string>('');
  const [supportPhone, setSupportPhone] = useState<string>('');
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');

  // Real‑time listener for all jobs
  useEffect(() => {
    const channel = supabase.channel('public:print_jobs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'print_jobs' }, (payload) => {
      setJobs((prev) => [payload.new as Job, ...prev]);
    }).subscribe();
    // Initial fetch
    const fetchJobs = async () => {
      const { data, error } = await supabase.from('print_jobs').select('*').order('created_at', { ascending: false });
      if (!error) setJobs(data as Job[]);
    };
    fetchJobs();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase.from('system_settings').select('*').single();
      if (!error) {
        setSettings(data);
        setBwPrice(data.bw_price_per_page);
        setColorPrice(data.color_price_per_page);
        setSupportPhone(data.support_phone);
        setWhatsappNumber(data.whatsapp_number);
      }
    };
    fetchSettings();
  }, []);

  const saveSettings = async () => {
    const { error } = await supabase.from('system_settings').update({
      bw_price_per_page: bwPrice,
      color_price_per_page: colorPrice,
      support_phone: supportPhone,
      whatsapp_number: whatsappNumber,
    }).eq('id', 1);
    if (error) alert('Failed to save settings');
    else alert('Settings saved');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      {/* Settings */}
      <section className="bg-white p-4 rounded shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Pricing & Support Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium">B&W Price per page</label>
            <input type="number" value={bwPrice} onChange={(e) => setBwPrice(e.target.value)} className="w-full border rounded p-2" />
          </div>
          <div>
            <label className="block font-medium">Color Price per page</label>
            <input type="number" value={colorPrice} onChange={(e) => setColorPrice(e.target.value)} className="w-full border rounded p-2" />
          </div>
          <div>
            <label className="block font-medium">Support Phone</label>
            <input type="text" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} className="w-full border rounded p-2" />
          </div>
          <div>
            <label className="block font-medium">WhatsApp Number</label>
            <input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="w-full border rounded p-2" />
          </div>
        </div>
        <button onClick={saveSettings} className="mt-4 bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 transition">
          Save Settings
        </button>
      </section>

      {/* Live Jobs */}
      <section className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Live Print Jobs</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2">Session ID</th>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Payment</th>
                <th className="px-4 py-2">Photo</th>
                <th className="px-4 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t">
                  <td className="px-4 py-2">{job.session_id}</td>
                  <td className="px-4 py-2">{job.user_name || '-'} / {job.user_phone || '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-white ${
                      job.job_status === 'completed' ? 'bg-green-500' :
                      job.job_status === 'printing' ? 'bg-blue-500' :
                      job.job_status === 'paid' ? 'bg-teal-500' :
                      'bg-gray-400'
                    }`}>{job.job_status}</span>
                  </td>
                  <td className="px-4 py-2">{job.payment_status}</td>
                  <td className="px-4 py-2">
                    {job.user_photo_url ? (
                      <img src={job.user_photo_url} alt="User" className="h-12 w-12 object-cover rounded" />
                    ) : '-'}
                  </td>
                  <td className="px-4 py-2">{new Date(job.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
