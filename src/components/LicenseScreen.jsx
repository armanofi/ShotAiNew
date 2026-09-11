import { useState } from 'react';
import { Shield, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

const API_URL = 'http://localhost:5001/api';
const STORAGE_KEY = 'shotai_license_validated';

export default function LicenseScreen({ onValidated }) {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  
  // step 1 = input license
  // step 2 = input email (if premium)
  const [step, setStep] = useState(1); 
  const [status, setStatus] = useState('idle'); // idle | checking | success | error
  const [showCode, setShowCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [obfuscatedEmail, setObfuscatedEmail] = useState('');

  const handleCheckLicense = async () => {
    if (!code.trim()) {
      setStatus('error');
      setErrorMsg('Masukkan kode lisensi terlebih dahulu.');
      return;
    }

    setStatus('checking');
    setErrorMsg('');

    try {
      const response = await fetch(`${API_URL}/verify-license`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await response.json();

      if (data.success) {
        if (data.data.type === 'premium') {
          // License is valid premium, move to step 2 (email)
          setStatus('idle');
          setStep(2);
          setObfuscatedEmail(data.data.obfuscatedEmail || '***@***.com');
        } else {
          // Valid free license, login directly
          setStatus('success');
          localStorage.setItem(STORAGE_KEY, 'true');
          localStorage.setItem('shotai_license_type', 'free');
          setTimeout(() => onValidated(), 900);
        }
      } else {
        setStatus('error');
        setErrorMsg(data.message || 'Kode lisensi tidak valid.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg('Gagal terhubung ke server. Periksa koneksi Anda.');
    }
  };

  const handleLoginPremium = async () => {
    if (!email.trim() || !email.includes('@')) {
      setStatus('error');
      setErrorMsg('Masukkan email yang valid.');
      return;
    }

    setStatus('checking');
    setErrorMsg('');

    try {
      const response = await fetch(`${API_URL}/login-premium`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, email })
      });
      const data = await response.json();

      if (data.success) {
        setStatus('success');
        localStorage.setItem(STORAGE_KEY, 'true');
        localStorage.setItem('shotai_license_type', 'premium');
        localStorage.setItem('shotai_premium_email', email.trim());
        setTimeout(() => onValidated(), 900);
      } else {
        setStatus('error');
        setErrorMsg(data.message || 'Email tidak cocok dengan lisensi ini.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg('Gagal terhubung ke server. Periksa koneksi Anda.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (step === 1) handleCheckLicense();
      else handleLoginPremium();
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#070b14',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        padding: '48px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0px',
      }}>
        {/* Logo */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '28px',
          boxShadow: '0 0 40px rgba(124, 58, 237, 0.4)',
        }}>
          <span style={{ fontSize: '32px', fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>SA</span>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '24px',
          fontWeight: 800,
          color: '#f1f5f9',
          margin: '0 0 8px',
          textAlign: 'center',
        }}>
          ShotAi Tools Manager
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#6d28d9',
          margin: '0 0 10px',
        }}>
          ShotAi v1.0
        </p>

        {/* Description */}
        <p style={{
          fontSize: '13px',
          color: '#64748b',
          textAlign: 'center',
          margin: '0 0 36px',
          lineHeight: 1.6,
          maxWidth: '340px',
        }}>
          Masukkan kode lisensi. Email hanya diperlukan jika lisensi terdeteksi Premium.
        </p>

        {/* License input group */}
        <div style={{ width: '100%', marginBottom: step === 2 ? '16px' : '12px' }}>
          <label style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: 700,
            color: '#475569',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            Kode Lisensi
          </label>

          <div style={{ position: 'relative' }}>
            <input
              type={showCode ? 'text' : 'password'}
              value={code}
              onChange={e => { 
                setCode(e.target.value); 
                setStatus('idle'); 
                setErrorMsg('');
                if (step === 2) setStep(1); // revert to step 1 if they edit the code
              }}
              onKeyDown={handleKeyDown}
              placeholder="AKA-XXXXXXXX-XXXXXX"
              spellCheck={false}
              autoComplete="off"
              disabled={step === 2 && status === 'checking'}
              style={{
                width: '100%',
                padding: '14px 44px 14px 16px',
                borderRadius: '10px',
                border: `1.5px solid ${(status === 'error' && step === 1) ? '#ef4444' : '#1e293b'}`,
                backgroundColor: '#0f172a',
                color: step === 2 ? '#94a3b8' : '#f1f5f9',
                fontSize: '14px',
                letterSpacing: '0.05em',
                fontFamily: 'monospace',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
            <button
              onClick={() => setShowCode(!showCode)}
              type="button"
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#475569',
                padding: '4px',
              }}
            >
              {showCode ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        
        {/* Step 1 Error/Note */}
        {step === 1 && (
          <div style={{ width: '100%', marginBottom: '24px' }}>
            {status === 'error' && errorMsg ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#ef4444' }}>{errorMsg}</span>
              </div>
            ) : (
              <p style={{
                fontSize: '12px',
                color: '#334155',
                textAlign: 'left',
                margin: 0,
                lineHeight: 1.5,
              }}>
                Lisensi Free terkunci pada satu perangkat. Lisensi Premium dapat pindah perangkat dengan email pemilik.
              </p>
            )}
          </div>
        )}

        {/* Step 2: Email Input (Only shows if premium license detected) */}
        {step === 2 && (
          <div style={{ width: '100%', marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: '#475569',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>
              Email Pemilik Premium
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setStatus('idle'); setErrorMsg(''); }}
              onKeyDown={handleKeyDown}
              placeholder="salmanbs2026@gmail.com"
              spellCheck={false}
              autoComplete="off"
              disabled={status === 'checking' || status === 'success'}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '10px',
                border: `1.5px solid ${(status === 'error' && step === 2) ? '#ef4444' : '#1e293b'}`,
                backgroundColor: '#0f172a',
                color: '#f1f5f9',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
                marginBottom: '8px',
              }}
            />

            {status === 'error' && errorMsg ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#ef4444' }}>{errorMsg}</span>
              </div>
            ) : status === 'success' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={13} style={{ color: '#22c55e', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#22c55e' }}>Lisensi dan Email valid! Memuat aplikasi...</span>
              </div>
            ) : (
              <p style={{
                fontSize: '12px',
                color: '#ef4444',
                textAlign: 'left',
                margin: 0,
                lineHeight: 1.5,
              }}>
                Lisensi ini Premium, harap masukkan email Anda. Email terdaftar: {obfuscatedEmail}
              </p>
            )}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={step === 1 ? handleCheckLicense : handleLoginPremium}
          disabled={status === 'checking' || status === 'success'}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            border: 'none',
            cursor: status === 'checking' || status === 'success' ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 700,
            color: 'white',
            background: status === 'success'
              ? 'linear-gradient(135deg, #16a34a, #15803d)'
              : status === 'checking'
              ? '#4f46e5'
              : '#7c3aed',
            boxShadow: status === 'idle' ? '0 0 24px rgba(124,58,237,0.3)' : 'none',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {status === 'checking' ? (
            <>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid white', animation: 'spin 0.7s linear infinite' }} />
              Memeriksa lisensi dan perangkat...
            </>
          ) : status === 'success' ? (
            <>
              <CheckCircle size={16} />
              Berhasil Masuk!
            </>
          ) : step === 2 ? (
            'Masuk Premium'
          ) : (
            'Periksa Lisensi'
          )}
        </button>

        {status === 'checking' && (
          <p style={{ fontSize: '11px', color: '#64748b', marginTop: '16px', textAlign: 'center' }}>
            Memeriksa lisensi dan perangkat...
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
