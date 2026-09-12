import { useState, useEffect } from 'react';

export default function ApiKeyModal({ isOpen, onClose, onGetApiKey }) {
  const [email, setEmail] = useState('Free User');
  const [savedKey, setSavedKey] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const savedEmail = localStorage.getItem('shotai_premium_email');
      if (savedEmail) setEmail(savedEmail);
      
      const key = localStorage.getItem('google_ai_studio_key');
      if (key) setSavedKey(key);
    }
  }, [isOpen]);

  const displayKey = savedKey ? `${savedKey.substring(0, 6)}...${savedKey.substring(savedKey.length - 4)}` : 'Belum ada';
  const displayStatus = savedKey ? 'Aktif' : 'Belum diisi';
  const displayStatusColor = savedKey ? '#10b981' : '#475569';
  const actionText = savedKey ? 'Perbarui API key' : 'Dapatkan API key';

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 900, // Below the webview
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#f8fafc',
        width: '90%',
        maxWidth: '750px',
        borderRadius: '8px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header matching Windows app title bar style */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '12px 16px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '18px', height: '18px', borderRadius: '4px',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '10px', fontWeight: 'bold'
            }}>SA</div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>API Key Google AI Studio</span>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '16px', color: '#64748b', display: 'flex', alignItems: 'center'
          }}>
            &times;
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 32px', backgroundColor: '#f8fafc' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
            API Key Google AI Studio
          </h2>
          <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 24px 0', lineHeight: 1.5 }}>
            Setiap akun Flow (email Google) = 1 API key. <span style={{ color: '#d97706', fontWeight: 600 }}>Limit Gemini dihitung per AKUN, bukan per project - jadi menambah banyak key dari 1 email tidak menambah kuota.</span>
          </p>

          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '10px', fontSize: '12px', fontWeight: 600, color: '#475569', borderRight: '1px solid #cbd5e1' }}>Email (Akun Flow)</th>
                  <th style={{ padding: '10px', fontSize: '12px', fontWeight: 600, color: '#475569', borderRight: '1px solid #cbd5e1' }}>Key</th>
                  <th style={{ padding: '10px', fontSize: '12px', fontWeight: 600, color: '#475569', borderRight: '1px solid #cbd5e1' }}>Status</th>
                  <th style={{ padding: '10px', fontSize: '12px', fontWeight: 600, color: '#475569', borderRight: '1px solid #cbd5e1' }}>Terakhir</th>
                  <th style={{ padding: '10px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#0f172a', borderRight: '1px solid #cbd5e1', textAlign: 'left' }}>
                    {email}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#475569', borderRight: '1px solid #cbd5e1' }}>{displayKey}</td>
                  <td style={{ padding: '12px', fontSize: '13px', color: displayStatusColor, fontWeight: savedKey ? 600 : 400, borderRight: '1px solid #cbd5e1' }}>{displayStatus}</td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#475569', borderRight: '1px solid #cbd5e1' }}>-</td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        onClick={onGetApiKey}
                        style={{
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#3b82f6'}
                      >
                        {actionText}
                      </button>
                      {savedKey && (
                        <button
                          onClick={() => {
                            if (window.confirm('Yakin ingin menghapus API key ini?')) {
                              localStorage.removeItem('google_ai_studio_key');
                              localStorage.removeItem('google_ai_studio_keys');
                              setSavedKey(null);
                            }
                          }}
                          style={{
                            backgroundColor: '#fef2f2',
                            color: '#ef4444',
                            border: '1px solid #fecaca',
                            padding: '8px 14px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                        >
                          🗑 Hapus
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '300px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button style={{
              backgroundColor: '#475569', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
            }}>Muat Ulang Akun</button>
            <button style={{
              backgroundColor: '#475569', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
            }}>Reset Limit</button>
            <button onClick={onClose} style={{
              backgroundColor: '#334155', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
            }}>Tutup</button>
          </div>
        </div>
      </div>
    </div>
  );
}
