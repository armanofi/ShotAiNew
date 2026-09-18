import { useState, useEffect } from 'react';

export default function ApiWebviewOverlay({ isOpen, onClose, onSaveKey }) {
  const [apiKey, setApiKey] = useState('');
  const [email, setEmail] = useState('salmanbs2026@gmail.com');

  useEffect(() => {
    if (isOpen) {
      const savedEmail = localStorage.getItem('shotai_premium_email');
      if (savedEmail) setEmail(savedEmail);
      setApiKey(''); // reset input on open
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#0f172a',
      zIndex: 1000, // Topmost overlay
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Top Header */}
      <div style={{
        backgroundColor: '#1e293b',
        padding: '12px 24px',
        borderBottom: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'white', margin: 0 }}>
            Halaman ini memakai sesi Google akun: {email}
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer'
          }}>
            &times;
          </button>
        </div>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
          Klik 'Create API key' / tombol Copy di halaman, lalu tempel key-nya di kolom bawah dan klik Simpan.
        </p>
      </div>

      {/* Webview Container */}
      <div style={{ flex: 1, backgroundColor: 'white', position: 'relative' }}>
        {/* We use iframe instead of webview for standard React, but since we are in Electron, webview tag works if enabled. */}
        <webview 
          src="https://aistudio.google.com/app/apikey" 
          useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          style={{ width: '100%', height: '100%', display: 'inline-flex' }}
          allowpopups="true"
        />
      </div>

      {/* Bottom Footer (Input Area) */}
      <div style={{
        backgroundColor: '#0f172a',
        padding: '16px 24px',
        borderTop: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '4px' }}>
            Tempel API Key di sini:
          </label>
          <input 
            type="text" 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              outline: 'none',
              fontSize: '14px',
              color: '#0f172a',
              backgroundColor: '#ffffff'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
          <button 
            onClick={() => onSaveKey(apiKey)}
            style={{
              backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
            }}
          >
            Simpan Key
          </button>
          <button 
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                setApiKey(text);
              } catch (err) {
                console.error('Failed to read clipboard');
              }
            }}
            style={{
              backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
            }}
          >
            Tempel
          </button>
        </div>
      </div>
    </div>
  );
}
