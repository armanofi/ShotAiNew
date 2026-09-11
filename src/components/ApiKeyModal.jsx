import { useState, useEffect } from 'react';

export default function ApiKeyModal({ isOpen, onClose, onGetApiKey }) {
  const [email, setEmail] = useState('Pengguna Free');
  const [isPremium, setIsPremium] = useState(false);
  const [keys, setKeys] = useState([]); // [{email, key, addedAt}]

  const loadData = () => {
    const licenseType = localStorage.getItem('shotai_license_type') || 'free';
    const savedEmail = localStorage.getItem('shotai_premium_email') || 'Pengguna Free';
    setIsPremium(licenseType === 'premium');
    setEmail(savedEmail);

    // Load all saved API keys (stored as JSON array)
    const raw = localStorage.getItem('google_ai_studio_keys');
    if (raw) {
      try { setKeys(JSON.parse(raw)); } catch { setKeys([]); }
    } else {
      // Migrate old single key if exists
      const oldKey = localStorage.getItem('google_ai_studio_key');
      if (oldKey) {
        const migrated = [{ email: savedEmail, key: oldKey, addedAt: new Date().toISOString() }];
        setKeys(migrated);
        localStorage.setItem('google_ai_studio_keys', JSON.stringify(migrated));
        localStorage.removeItem('google_ai_studio_key');
      } else {
        setKeys([]);
      }
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  const handleDelete = (index) => {
    if (!window.confirm('Yakin ingin menghapus API key ini?')) return;
    const updated = keys.filter((_, i) => i !== index);
    setKeys(updated);
    localStorage.setItem('google_ai_studio_keys', JSON.stringify(updated));
  };

  const maskKey = (key) => {
    if (!key) return '-';
    if (key.length <= 10) return '••••••••';
    return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
  };

  const formatDate = (iso) => {
    if (!iso) return '-';
    try { return new Date(iso).toLocaleDateString('id-ID'); } catch { return '-'; }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 900, fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#f8fafc', width: '90%', maxWidth: '820px',
        borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#ffffff', padding: '14px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '5px',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '10px', fontWeight: 'bold'
            }}>SA</div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              Pengaturan API Key Google AI Studio
            </span>
            {isPremium && (
              <span style={{
                fontSize: '10px', fontWeight: 700, color: '#7c3aed',
                backgroundColor: '#ede9fe', padding: '2px 8px', borderRadius: '20px'
              }}>PREMIUM</span>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '18px', color: '#64748b', lineHeight: 1
          }}>×</button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 28px', backgroundColor: '#f8fafc' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
              API Key Google AI Studio
            </h2>
            <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.6 }}>
              {isPremium
                ? <>API key terhubung ke akun premium: <strong style={{ color: '#6366f1' }}>{email}</strong>. Setiap email Google = 1 API key gratis.</>
                : 'Setiap akun Flow (email Google) = 1 API key.'}
              {' '}<span style={{ color: '#d97706', fontWeight: 600 }}>
                Limit Gemini dihitung per AKUN — tambah banyak key dari 1 email tidak menambah kuota.
              </span>
            </p>
          </div>

          {/* Table */}
          <div style={{
            backgroundColor: '#ffffff', border: '1px solid #cbd5e1',
            borderRadius: '8px', overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                  {['Email (Akun Flow)', 'Key', 'Status', 'Ditambahkan', 'Aksi'].map((h, i) => (
                    <th key={i} style={{
                      padding: '10px 14px', fontSize: '11px', fontWeight: 700,
                      color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em',
                      borderRight: i < 4 ? '1px solid #e2e8f0' : 'none'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keys.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{
                      padding: '32px', textAlign: 'center',
                      color: '#94a3b8', fontSize: '13px'
                    }}>
                      Belum ada API key yang disimpan.<br />
                      <span style={{ fontSize: '12px' }}>Klik "Tambah API Key" untuk menambahkan.</span>
                    </td>
                  </tr>
                ) : (
                  keys.map((item, index) => (
                    <tr key={index} style={{ borderBottom: index < keys.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: '10px', fontWeight: 'bold', flexShrink: 0
                          }}>
                            {(item.email || 'U')[0].toUpperCase()}
                          </div>
                          <span style={{ fontSize: '12px' }}>{item.email || '-'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#475569', fontFamily: 'monospace', borderRight: '1px solid #e2e8f0' }}>
                        {maskKey(item.key)}
                      </td>
                      <td style={{ padding: '12px 14px', borderRight: '1px solid #e2e8f0' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                          backgroundColor: '#dcfce7', color: '#16a34a'
                        }}>Aktif</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#64748b', borderRight: '1px solid #e2e8f0' }}>
                        {formatDate(item.addedAt)}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            onClick={onGetApiKey}
                            style={{
                              backgroundColor: '#3b82f6', color: 'white', border: 'none',
                              padding: '6px 12px', borderRadius: '6px', fontSize: '11px',
                              fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#3b82f6'}
                          >
                            Perbarui
                          </button>
                          <button
                            onClick={() => handleDelete(index)}
                            style={{
                              backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca',
                              padding: '6px 10px', borderRadius: '6px', fontSize: '11px',
                              fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                          >
                            🗑 Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer buttons */}
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={onGetApiKey}
              style={{
                backgroundColor: '#6366f1', color: 'white', border: 'none',
                padding: '10px 20px', borderRadius: '8px', fontSize: '13px',
                fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#4f46e5'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#6366f1'}
            >
              + Tambah API Key
            </button>
            <button onClick={onClose} style={{
              backgroundColor: '#334155', color: 'white', border: 'none',
              padding: '10px 20px', borderRadius: '8px', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer'
            }}>Tutup</button>
          </div>
        </div>
      </div>
    </div>
  );
}
