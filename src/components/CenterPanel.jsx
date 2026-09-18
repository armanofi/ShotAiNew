import { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { MonitorPlay, ArrowLeft, ArrowRight, RefreshCw, Sparkles } from 'lucide-react';

const SHOTAI_DARK_CSS = `
  html, body {
    background-color: #09090b !important;
    background: #09090b !important;
    color: #f1f5f9 !important;
  }
  .gradient-bg {
    background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.15) 0%, rgba(9, 9, 11, 1) 70%) !important;
  }
  header {
    background-color: rgba(9, 9, 11, 0.9) !important;
    border-color: #27272a !important;
    backdrop-filter: blur(12px) !important;
  }
  header a, header span {
    color: #cbd5e1 !important;
  }
  header a:hover {
    color: #ffffff !important;
  }
  h1, h2, h3, h4, h5, h6 {
    color: #ffffff !important;
  }
  p {
    color: #94a3b8 !important;
  }
  .text-gray-900, .text-gray-800, .text-gray-700, .text-slate-900, .text-slate-800, .text-slate-700, .text-zinc-900 {
    color: #f1f5f9 !important;
  }
  .text-gray-600, .text-gray-500, .text-slate-600, .text-slate-500 {
    color: #94a3b8 !important;
  }
  .bg-white, [class*="bg-white"] {
    background-color: #18181b !important;
    border-color: #27272a !important;
  }
  .bg-gray-50, .bg-slate-50, .bg-zinc-50 {
    background-color: #09090b !important;
  }
  .bg-gray-100, .bg-slate-100, .bg-zinc-100 {
    background-color: #111113 !important;
  }
  .border-gray-200, .border-gray-100, .border-gray-300, .border-slate-200, .border-slate-100 {
    border-color: #27272a !important;
  }
  .shadow-2xl, .shadow-xl, .shadow-lg {
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7) !important;
  }
  footer {
    border-color: #27272a !important;
    background-color: #09090b !important;
  }
  footer div, footer span {
    color: #64748b !important;
  }
  input, select, textarea {
    background-color: #09090b !important;
    border-color: #27272a !important;
    color: #f1f5f9 !important;
  }
  table {
    background-color: #111113 !important;
    border-color: #27272a !important;
  }
  thead tr {
    background-color: #18181b !important;
  }
  th, td {
    border-color: #27272a !important;
    color: #cbd5e1 !important;
  }
`;

// CenterPanel now ALWAYS shows the browser/webview
// Storyboard Maker and AI Studio appear in the RIGHT panel (MainLayout controls that)
export default function CenterPanel() {
  const activeAccount = useAppStore(state => state.activeAccount);
  const setActiveAccount = useAppStore(state => state.setActiveAccount);
  const webviewRef = useRef(null);

  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleReloadPortal = () => {
      if (webviewRef.current) {
        try {
          webviewRef.current.loadURL('https://shot-ai-new.vercel.app/');
        } catch {}
      }
    };
    window.addEventListener('shotai-reload-portal', handleReloadPortal);
    return () => window.removeEventListener('shotai-reload-portal', handleReloadPortal);
  }, []);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const isShotAiPortal = activeAccount?.toolName === 'ShotAi' ||
      (activeAccount?.url && activeAccount.url.includes('shot-ai-new.vercel.app'));

    const injectDarkTheme = () => {
      if (!isShotAiPortal) return;
      try {
        if (typeof wv.insertCSS === 'function') {
          wv.insertCSS(SHOTAI_DARK_CSS);
        }
      } catch {}
      try {
        if (typeof wv.executeJavaScript === 'function') {
          wv.executeJavaScript(`
            (() => {
              try {
                document.documentElement.style.backgroundColor = '#09090b';
                document.documentElement.style.colorScheme = 'dark';
                if (document.body) {
                  document.body.style.backgroundColor = '#09090b';
                  document.body.style.color = '#f1f5f9';
                }
                let styleEl = document.getElementById('shotai-dark-inject');
                if (!styleEl) {
                  styleEl = document.createElement('style');
                  styleEl.id = 'shotai-dark-inject';
                  styleEl.textContent = ${JSON.stringify(SHOTAI_DARK_CSS)};
                  (document.head || document.documentElement).appendChild(styleEl);
                }
              } catch (e) {}
            })()
          `);
        }
      } catch {}
    };

    const updateNav = () => {
      try {
        setCanGoBack(wv.canGoBack ? wv.canGoBack() : false);
        setCanGoForward(wv.canGoForward ? wv.canGoForward() : false);
      } catch {}
      injectDarkTheme();
    };

    const handleStart = () => setIsLoading(true);
    const handleStop = () => {
      setIsLoading(false);
      updateNav();
      injectDarkTheme();
    };

    const handleDomReady = () => {
      injectDarkTheme();
    };

    wv.addEventListener('dom-ready', handleDomReady);
    wv.addEventListener('did-start-loading', handleStart);
    wv.addEventListener('did-stop-loading', handleStop);
    wv.addEventListener('did-finish-load', injectDarkTheme);
    wv.addEventListener('did-frame-finish-load', injectDarkTheme);
    wv.addEventListener('did-navigate', updateNav);
    wv.addEventListener('did-navigate-in-page', updateNav);

    // Initial check if already ready
    injectDarkTheme();

    return () => {
      wv.removeEventListener('dom-ready', handleDomReady);
      wv.removeEventListener('did-start-loading', handleStart);
      wv.removeEventListener('did-stop-loading', handleStop);
      wv.removeEventListener('did-finish-load', injectDarkTheme);
      wv.removeEventListener('did-frame-finish-load', injectDarkTheme);
      wv.removeEventListener('did-navigate', updateNav);
      wv.removeEventListener('did-navigate-in-page', updateNav);
    };
  }, [activeAccount]);

  const handleBack = () => {
    if (webviewRef.current && webviewRef.current.canGoBack()) {
      webviewRef.current.goBack();
    }
  };

  const handleForward = () => {
    if (webviewRef.current && webviewRef.current.canGoForward()) {
      webviewRef.current.goForward();
    }
  };

  const handleReload = () => {
    if (webviewRef.current) {
      webviewRef.current.reload();
    }
  };

  if (!activeAccount) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', backgroundColor: '#09090b' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(79, 127, 255, 0.15), rgba(124, 58, 237, 0.15))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          border: '1px solid rgba(124, 58, 237, 0.3)'
        }}>
          <MonitorPlay size={32} style={{ color: '#818cf8' }} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>
          Belum Ada Akun Terpilih
        </h2>
        <p style={{ color: '#64748b', maxWidth: '380px', lineHeight: 1.6, fontSize: '13px', margin: '0 0 20px' }}>
          Pilih salah satu akun dari sidebar di sebelah kiri atau klik logo ShotAi di pojok kiri atas untuk membuka beranda resmi.
        </p>
        <button
          onClick={() => setActiveAccount({
            toolName: 'ShotAi',
            accountId: 'portal',
            url: 'https://shot-ai-new.vercel.app/',
            label: '',
          })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all cursor-pointer shadow-lg hover:brightness-110 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #4F7FFF 0%, #7C3AED 100%)',
            boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
            border: 'none',
          }}
        >
          <Sparkles size={16} />
          <span>Buka Beranda ShotAi</span>
        </button>
      </div>
    );
  }

  const isShotAi = activeAccount.toolName === 'ShotAi';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#09090b' }}>
      {/* Tab bar */}
      <div style={{ height: '44px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid #27272a', backgroundColor: '#111113' }}>
        {/* Left: Account title & icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          {isShotAi ? (
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #4F7FFF 0%, #7C3AED 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 8px rgba(124,58,237,0.4)',
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>SA</span>
            </div>
          ) : (
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {isShotAi ? 'ShotAi' : (activeAccount.label ? `${activeAccount.toolName} — ${activeAccount.label}` : activeAccount.toolName)}
          </span>
        </div>

        {/* Right: Navigation Controls (Back, Forward, Reload) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', padding: '2px 4px' }}>
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            title="Kembali"
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 6px',
              borderRadius: '4px',
              color: canGoBack ? '#e2e8f0' : '#52525b',
              cursor: canGoBack ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ArrowLeft size={13} />
          </button>
          <button
            onClick={handleForward}
            disabled={!canGoForward}
            title="Maju"
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 6px',
              borderRadius: '4px',
              color: canGoForward ? '#e2e8f0' : '#52525b',
              cursor: canGoForward ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ArrowRight size={13} />
          </button>
          <button
            onClick={handleReload}
            title="Muat Ulang"
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 6px',
              borderRadius: '4px',
              color: '#e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Webview — takes remaining height */}
      <div style={{ flex: 1, backgroundColor: '#09090b', overflow: 'hidden', position: 'relative' }}>
        <webview
          ref={webviewRef}
          key={`${activeAccount.toolName}-${activeAccount.accountId || 'main'}`}
          partition={`persist:${(activeAccount.toolName || 'tool').toLowerCase().replace(/[^a-z0-9]/g, '')}-${activeAccount.accountId || 'main'}`}
          src={activeAccount.url}
          useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
          style={{ width: '100%', height: '100%', display: 'flex', backgroundColor: '#09090b' }}
          title={activeAccount.toolName}
          allowpopups="true"
        />
      </div>
    </div>
  );
}
