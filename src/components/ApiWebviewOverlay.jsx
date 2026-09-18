import { useState, useEffect, useRef } from 'react';

const STEPS = [
  { num: 1, text: 'Klik tombol "Buka Google AI Studio" di bawah — browser Chrome/Edge Anda akan terbuka.' },
  { num: 2, text: 'Pastikan Anda login dengan akun Google. Google akan menampilkan halaman API Key.' },
  { num: 3, text: 'Klik tombol "Create API key" lalu salin (copy) key yang muncul.' },
  { num: 4, text: 'Kembali ke sini, tempel (paste) key di kolom bawah, lalu klik "Simpan Key".' },
];

export default function ApiWebviewOverlay({ isOpen, onClose, onSaveKey }) {
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [opening, setOpening] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey('');
      setSaved(false);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenBrowser = async () => {
    setOpening(true);
    try {
      if (window.require) {
        // Electron: use IPC to open in system browser
        const { ipcRenderer } = window.require('electron');
        await ipcRenderer.invoke('open-ai-studio-window', 'https://aistudio.google.com/app/apikey');
      } else {
        window.open('https://aistudio.google.com/app/apikey', '_blank');
      }
    } catch (err) {
      console.error('Cannot open browser:', err);
    }
    setTimeout(() => setOpening(false), 2000);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().startsWith('AIza')) {
        setApiKey(text.trim());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else if (text && text.trim().length > 10) {
        setApiKey(text.trim());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const handleSave = () => {
    if (!apiKey.trim()) return;
    setSaved(true);
    onSaveKey(apiKey.trim());
    setTimeout(() => { setSaved(false); onClose(); }, 1000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', 'Segoe UI', sans-serif"
    }}>
      <div style={{
        width: '480px',
        maxWidth: '96vw',
        backgroundColor: '#0f172a',
        borderRadius: '16px',
        border: '1px solid #1e293b',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              {/* Google color dots */}
              <div style={{ display: 'flex', gap: '3px' }}>
                {['#4285F4','#EA4335','#FBBC04','#34A853'].map(c => (
                  <div key={c} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: c }} />
                ))}
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
                Google AI Studio — API Key
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
              Login dilakukan di browser Chrome/Edge Anda agar aman
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '2px', flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Steps */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {STEPS.map(step => (
            <div key={step.num} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                backgroundColor: step.num === 1 ? '#3b82f6' : step.num === 3 ? '#10b981' : '#1e293b',
                border: '1px solid #334155',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 700, color: '#f1f5f9'
              }}>
                {step.num}
              </div>
              <p style={{ fontSize: '12px', color: '#cbd5e1', margin: 0, lineHeight: 1.6 }}>
                {step.text}
              </p>
            </div>
          ))}

          {/* Open browser button */}
          <button
            onClick={handleOpenBrowser}
            disabled={opening}
            style={{
              marginTop: '4px',
              padding: '12px 20px',
              borderRadius: '10px',
              backgroundColor: opening ? '#1e3a5f' : '#2563eb',
              border: 'none',
              color: 'white',
              fontSize: '13px',
              fontWeight: 700,
              cursor: opening ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: opening ? 'none' : '0 4px 16px rgba(37,99,235,0.35)'
            }}
          >
            {/* Browser icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            {opening ? 'Membuka Browser...' : 'Buka Google AI Studio di Browser'}
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: '#1e293b', margin: '0 24px' }} />

        {/* Paste & Save area */}
        <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Tempel API Key di sini:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              ref={inputRef}
              type="text"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: apiKey.length > 5 ? '1.5px solid #10b981' : '1.5px solid #334155',
                outline: 'none',
                fontSize: '13px',
                color: '#f1f5f9',
                backgroundColor: '#1e293b',
                fontFamily: 'monospace',
                transition: 'border-color 0.2s'
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            />
            <button
              onClick={handlePaste}
              title="Tempel dari clipboard"
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: copied ? '#059669' : '#1e293b',
                border: '1.5px solid #334155',
                color: '#f1f5f9',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                transition: 'all 0.2s',
                flexShrink: 0
              }}
            >
              {copied ? '✓ OK' : '📋 Paste'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid #334155',
                color: '#64748b',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={!apiKey.trim() || saved}
              style={{
                flex: 2,
                padding: '10px',
                borderRadius: '8px',
                backgroundColor: saved ? '#059669' : (apiKey.trim() ? '#10b981' : '#1e293b'),
                border: 'none',
                color: apiKey.trim() ? 'white' : '#4b5563',
                fontSize: '13px',
                fontWeight: 700,
                cursor: apiKey.trim() ? 'pointer' : 'default',
                transition: 'all 0.2s',
                boxShadow: apiKey.trim() && !saved ? '0 4px 16px rgba(16,185,129,0.3)' : 'none'
              }}
            >
              {saved ? '✓ Tersimpan!' : 'Simpan Key'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
