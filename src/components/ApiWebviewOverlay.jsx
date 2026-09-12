import { useState, useEffect } from 'react';

// Check if running inside Electron
const isElectron = typeof window !== 'undefined' && window.require;

export default function ApiWebviewOverlay({ isOpen, onClose, onSaveKey }) {
  const [apiKey, setApiKey] = useState('');
  const [email, setEmail] = useState('');
  const [windowOpened, setWindowOpened] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedEmail = localStorage.getItem('shotai_premium_email') || '';
      setEmail(savedEmail);
      setApiKey('');
      setWindowOpened(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenStudio = async () => {
    if (isElectron) {
      try {
        const { ipcRenderer } = window.require('electron');
        await ipcRenderer.invoke('open-ai-studio-window', 'https://aistudio.google.com/app/apikey');
        setWindowOpened(true);
      } catch (e) {
        // Fallback: open in external browser
        window.open('https://aistudio.google.com/app/apikey', '_blank');
        setWindowOpened(true);
      }
    } else {
      window.open('https://aistudio.google.com/app/apikey', '_blank');
      setWindowOpened(true);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setApiKey(text);
    } catch (err) {
      console.error('Failed to read clipboard');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        width: '480px',
        backgroundColor: '#0f172a',
        borderRadius: '16px',
        border: '1px solid #1e293b',
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#1e293b',
          padding: '16px 20px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'white', margin: 0 }}>
              Ambil API Key Google AI Studio
            </h2>
            {email && (
              <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                Akun: <span style={{ color: '#60a5fa' }}>{email}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#94a3b8',
            fontSize: '20px', cursor: 'pointer', lineHeight: 1
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Step 1 */}
          <div style={{
            padding: '14px 16px',
            borderRadius: '10px',
            backgroundColor: '#0a1628',
            border: '1px solid #1e3a5f',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa', marginBottom: '8px' }}>
              LANGKAH 1 — Buka Google AI Studio
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 12px', lineHeight: 1.6 }}>
              Klik tombol di bawah untuk membuka Google AI Studio. Login dengan akun Google Anda, lalu klik <strong style={{ color: 'white' }}>"Create API key"</strong> dan copy key-nya.
            </p>
            <button
              onClick={handleOpenStudio}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '8px', border: 'none',
                backgroundColor: windowOpened ? '#065f46' : '#3b82f6',
                color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              {windowOpened ? '✓ Jendela AI Studio Dibuka' : 'Buka Google AI Studio'}
            </button>
          </div>

          {/* Step 2 */}
          <div style={{
            padding: '14px 16px',
            borderRadius: '10px',
            backgroundColor: '#0a1628',
            border: '1px solid #1e293b',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa', marginBottom: '8px' }}>
              LANGKAH 2 — Tempel API Key
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy... (tempel key di sini)"
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #334155', backgroundColor: '#1e293b',
                  color: 'white', fontSize: '13px', outline: 'none',
                  fontFamily: 'monospace'
                }}
              />
              <button
                onClick={handlePaste}
                style={{
                  padding: '10px 14px', borderRadius: '8px', border: 'none',
                  backgroundColor: '#334155', color: '#94a3b8', fontSize: '12px',
                  fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                📋 Tempel
              </button>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={() => onSaveKey(apiKey)}
            disabled={!apiKey.trim()}
            style={{
              width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
              background: apiKey.trim() ? 'linear-gradient(135deg, #10b981, #059669)' : '#1e293b',
              color: apiKey.trim() ? 'white' : '#475569',
              fontSize: '14px', fontWeight: 700, cursor: apiKey.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s'
            }}
          >
            {apiKey.trim() ? '✓ Simpan API Key' : 'Tempel API Key terlebih dahulu'}
          </button>
        </div>
      </div>
    </div>
  );
}
