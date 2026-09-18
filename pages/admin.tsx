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

type Tab = 'jobs' | 'settings';

const STATUS_STYLE: Record<string, string> = {
  waiting_user: 'bg-slate-700/60 text-slate-300 border-slate-600/40',
  scanned:      'bg-blue-500/10 text-blue-300 border-blue-500/20',
  paid:         'bg-teal-500/10 text-teal-300 border-teal-500/20',
  printing:     'bg-amber-500/10 text-amber-300 border-amber-500/20',
  completed:    'bg-green-500/10 text-green-300 border-green-500/20',
};

const STATUS_DOT: Record<string, string> = {
  waiting_user: 'bg-slate-400',
  scanned:      'bg-blue-400',
  paid:         'bg-teal-400',
  printing:     'bg-amber-400 animate-pulse',
  completed:    'bg-green-400',
};

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className={`glass-dark rounded-2xl p-5 border ${accent ?? 'border-white/10'}`}>
      <p className="text-slate-400 text-xs font-medium mb-2">{label}</p>
      <p className="text-white text-2xl font-extrabold leading-none tabular-nums">{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1.5">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab]                   = useState<Tab>('jobs');
  const [jobs, setJobs]                 = useState<Job[]>([]);
  const [pricing, setPricing]           = useState<any>(null);
  const [bwPrice, setBwPrice]           = useState('');
  const [colorPrice, setColorPrice]     = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [whatsappNum, setWhatsappNum]   = useState('');
  const [saving, setSaving]             = useState(false);
  const [saveMsg, setSaveMsg]           = useState('');
  const [selectedJob, setSelectedJob]   = useState<Job | null>(null);

  useEffect(() => {
    // Fetch initial jobs
    const fetchJobs = async () => {
      const { data } = await supabase.from('print_jobs').select('*').order('created_at', { ascending: false });
      if (data) setJobs(data as Job[]);
    };
    fetchJobs();
    // Realtime
    // @ts-ignore
    const channel = supabase.channel('admin:print_jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'print_jobs' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setJobs(prev => [payload.new as Job, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setJobs(prev => prev.map(j => j.id === payload.new.id ? payload.new as Job : j));
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('system_settings').select('*').single();
      if (data) {
        setPricing(data);
        setBwPrice(data.bw_price_per_page);
        setColorPrice(data.color_price_per_page);
        setSupportPhone(data.support_phone);
        setWhatsappNum(data.whatsapp_number);
      }
    };
    fetchSettings();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase.from('system_settings').update({
      bw_price_per_page: bwPrice,
      color_price_per_page: colorPrice,
      support_phone: supportPhone,
      whatsapp_number: whatsappNum,
    }).eq('id', 1);
    setSaving(false);
    setSaveMsg(error ? 'Failed to save.' : 'Settings saved!');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  // Stats
  const total     = jobs.length;
  const completed = jobs.filter(j => j.job_status === 'completed').length;
  const printing  = jobs.filter(j => j.job_status === 'printing').length;
  const revenue   = jobs.filter(j => j.payment_status === 'paid').reduce((s, j) => s + (j.total_price ?? 0), 0);

  return (
    <div className="min-h-screen bg-hero-gradient text-white font-sans">
      {/* Sidebar + main layout */}
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 glass-dark border-r border-white/5 flex flex-col py-6 px-4 hidden md:flex">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8 px-1">
            <div className="w-8 h-8 rounded-lg bg-teal-gradient flex items-center justify-center shadow">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
            </div>
            <div>
              <p className="text-white text-xs font-bold leading-none">SKSSF Print</p>
              <p className="text-slate-500 text-xs">Admin Panel</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1 flex-1">
            <button
              onClick={() => setTab('jobs')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left
                ${tab === 'jobs' ? 'bg-teal-500/15 text-teal-300 border border-teal-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Live Jobs
              {printing > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">{printing}</span>
              )}
            </button>
            <button
              onClick={() => setTab('settings')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left
                ${tab === 'settings' ? 'bg-teal-500/15 text-teal-300 border border-teal-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
              </svg>
              Settings
            </button>
          </nav>

          <div className="pt-4 border-t border-white/5">
            <p className="text-slate-600 text-xs px-1">v1.0 · SKSSF</p>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col min-w-0 p-6 gap-6">
          {/* Mobile tab bar */}
          <div className="flex md:hidden gap-2 bg-white/5 rounded-xl p-1 border border-white/10">
            {(['jobs', 'settings'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all
                  ${tab === t ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400'}`}>
                {t === 'jobs' ? 'Live Jobs' : 'Settings'}
              </button>
            ))}
          </div>

          {/* ── JOBS TAB ── */}
          {tab === 'jobs' && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Jobs"  value={total}     sub="All time" />
                <StatCard label="Completed"   value={completed} sub={`${total ? Math.round((completed/total)*100) : 0}% success rate`} accent="border-green-500/20" />
                <StatCard label="Printing"    value={printing}  sub="Right now" accent={printing > 0 ? 'border-amber-500/30' : 'border-white/10'} />
                <StatCard label="Revenue"     value={`₹${revenue.toFixed(0)}`} sub="Paid jobs" accent="border-teal-500/20" />
              </div>

              {/* Jobs table */}
              <div className="glass-dark rounded-2xl border border-white/10 overflow-hidden flex-1">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-white font-semibold text-sm">Print Jobs</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-teal-400 pulse-ring" />
                    <span className="text-teal-300 text-xs">Live</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        {['Session', 'User', 'Options', 'Amount', 'Status', 'Time', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-600 text-sm">No jobs yet. Waiting for first scan…</td></tr>
                      )}
                      {jobs.map(job => (
                        <tr key={job.id} className="border-b border-white/5 hover:bg-white/3 transition-colors group">
                          <td className="px-4 py-3 font-mono text-xs text-slate-400">{job.session_id.slice(0, 8)}…</td>
                          <td className="px-4 py-3">
                            <p className="text-white text-xs font-medium">{job.user_name || '—'}</p>
                            <p className="text-slate-500 text-xs">{job.user_phone || ''}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                            {job.copies ?? '—'} × {job.paper_size ?? ''} {job.print_type === 'color' ? '🎨' : job.print_type ? '⬜' : ''}
                          </td>
                          <td className="px-4 py-3 text-teal-300 text-xs font-semibold">
                            {job.total_price != null ? `₹${job.total_price.toFixed(2)}` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLE[job.job_status] ?? STATUS_STYLE.waiting_user}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[job.job_status] ?? 'bg-slate-400'}`} />
                              {job.job_status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                            {new Date(job.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3">
                            {job.user_photo_url && (
                              <button onClick={() => setSelectedJob(job)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <img src={job.user_photo_url} alt="User" className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── SETTINGS TAB ── */}
          {tab === 'settings' && (
            <div className="max-w-lg flex flex-col gap-5">
              <div>
                <h2 className="text-white font-bold text-lg">Pricing & Support</h2>
                <p className="text-slate-400 text-sm mt-1">Changes apply to all new print jobs immediately.</p>
              </div>

              <div className="glass-dark rounded-2xl p-5 border border-white/10 flex flex-col gap-4">
                <h3 className="text-slate-300 text-xs font-semibold uppercase tracking-widest">Pricing</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1.5">B&W (per page) ₹</label>
                    <input
                      type="number" value={bwPrice} onChange={e => setBwPrice(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1.5">Colour (per page) ₹</label>
                    <input
                      type="number" value={colorPrice} onChange={e => setColorPrice(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="glass-dark rounded-2xl p-5 border border-white/10 flex flex-col gap-4">
                <h3 className="text-slate-300 text-xs font-semibold uppercase tracking-widest">Support</h3>
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">Support Phone</label>
                  <input
                    type="tel" value={supportPhone} onChange={e => setSupportPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">WhatsApp Number</label>
                  <input
                    type="tel" value={whatsappNum} onChange={e => setWhatsappNum(e.target.value)}
                    placeholder="91XXXXXXXXXX"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="bg-teal-gradient text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 text-sm"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving…
                    </span>
                  ) : 'Save Settings'}
                </button>
                {saveMsg && (
                  <span className={`text-sm font-medium ${saveMsg.includes('Failed') ? 'text-red-400' : 'text-teal-400'}`}>
                    {saveMsg}
                  </span>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Photo modal */}
      {selectedJob && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedJob(null)}
        >
          <div className="glass-dark rounded-3xl p-6 max-w-sm w-full border border-white/10 fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">User Photo</h3>
              <button onClick={() => setSelectedJob(null)} className="text-slate-400 hover:text-white transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <img src={selectedJob.user_photo_url!} alt="Captured user" className="w-full rounded-2xl object-cover" />
            <div className="mt-4 space-y-1">
              <p className="text-white text-sm font-medium">{selectedJob.user_name || 'Unknown'}</p>
              <p className="text-slate-400 text-xs">{selectedJob.user_phone}</p>
              <p className="text-slate-500 text-xs font-mono">{selectedJob.session_id.slice(0, 16)}…</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
