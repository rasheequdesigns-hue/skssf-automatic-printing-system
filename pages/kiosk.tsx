import { useEffect, useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabaseClient';

export default function Kiosk() {
  const [sessionId, setSessionId] = useState<string>('');
  const [jobStatus, setJobStatus] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize session on mount
  useEffect(() => {
    const init = async () => {
      const id = uuidv4();
      setSessionId(id);
      const { error } = await supabase.from('print_jobs').insert({
        session_id: id,
        job_status: 'waiting_user',
      });
      if (error) console.error('Error creating job:', error);
    };
    init();
  }, []);

  // Request webcam access (hidden)
  useEffect(() => {
    const getCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (e) {
        console.error('Webcam error:', e);
      }
    };
    getCamera();
    // Cleanup on unmount
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
      }
    };
  }, []);

  // Listen to realtime updates for this session
  useEffect(() => {
    if (!sessionId) return;
// @ts-ignore
    const channel = supabase
      .channel('public:print_jobs')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'print_jobs',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: any) => {
          const newStatus = payload?.new?.payment_status;
          const jobStatus = payload?.new?.job_status;
          if (newStatus === 'paid') {
            handlePaid(payload.new);
          }
          setJobStatus(jobStatus);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const handlePaid = async (job: any) => {
    // Capture photo
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const filePath = `${job.id}/${Date.now()}.png`;
          const { error: uploadError } = await supabase.storage
            .from('user-captures')
            .upload(filePath, blob, { upsert: true, contentType: 'image/png' });
          if (uploadError) {
            console.error('Upload error:', uploadError);
            return;
          }
          const { data } = supabase.storage.from('user-captures').getPublicUrl(filePath);
          const photoUrl = data?.publicUrl;
          // Update job with photo and printing status
          await supabase
            .from('print_jobs')
            .update({ user_photo_url: photoUrl, job_status: 'printing' })
            .eq('id', job.id);
          // Trigger print
          window.print();
          // Mark completed after short delay
          setTimeout(async () => {
            await supabase
              .from('print_jobs')
              .update({ job_status: 'completed' })
              .eq('id', job.id);
            // Start new session
            const newId = uuidv4();
            setSessionId(newId);
            await supabase.from('print_jobs').insert({
              session_id: newId,
              job_status: 'waiting_user',
            });
          }, 3000);
        }, 'image/png');
      }
    }
  };

  const qrUrl = `${process.env.NEXT_PUBLIC_DOMAIN}/print?session_id=${sessionId}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Kiosk Printer</h1>
      {sessionId && (
        <div className="bg-white p-4 rounded shadow">
          <QRCode value={qrUrl} size={200} />
          <p className="mt-2 text-center">Scan to print</p>
        </div>
      )}
      {/* Hidden video and canvas for photo capture */}
      <video ref={videoRef} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
      <p className="mt-4">Job status: {jobStatus || 'waiting_user'}</p>
    </div>
  );
}
