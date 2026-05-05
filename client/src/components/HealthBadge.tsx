import React, { useEffect, useState } from 'react';
import API from '../services/api';

export default function HealthBadge() {
  const [status, setStatus] = useState<'ok'|'error'|'checking'>('checking');
  const [backend, setBackend] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    let timer: any;
    const ping = async () => {
      try {
        // API health: try to fetch 1 row from listings
        const r = await API.get('/listings?select=id&limit=1');
        if (!mounted) return;
        if (Array.isArray(r.data)) {
          setStatus('ok');
          setBackend('api');
        } else {
          setStatus('error');
          setBackend('backend');
        }
      } catch {
        if (mounted) { setStatus('error'); setBackend(''); }
      }
      timer = setTimeout(ping, 8000);
    };
    ping();
    return () => { mounted = false; if (timer) clearTimeout(timer); };
  }, []);

  const color = status === 'ok' ? '#16a34a' : status === 'checking' ? '#eab308' : '#dc2626';
  const label = status === 'ok' ? `API: ok` : status === 'checking' ? 'API: checking' : 'API: unreachable';

  return (
    <div title={label} aria-label={label} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
      <span className="status-dot" style={{ backgroundColor: color }} />
    </div>
  );
}
