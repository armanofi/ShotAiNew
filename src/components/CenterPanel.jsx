import { useAppStore } from '../store/useAppStore';
import { ExternalLink, MonitorPlay } from 'lucide-react';

// CenterPanel now ALWAYS shows the browser/webview
// Storyboard Maker and AI Studio appear in the RIGHT panel (MainLayout controls that)
export default function CenterPanel() {
  const activeAccount = useAppStore(state => state.activeAccount);

  if (!activeAccount) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', backgroundColor: '#060e1c' }}>
        <MonitorPlay size={48} style={{ color: '#1e3a5f', marginBottom: '16px' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#94a3b8', margin: '0 0 8px' }}>Belum Ada Akun Terpilih</h2>
        <p style={{ color: '#334155', maxWidth: '360px', lineHeight: 1.6 }}>
          Pilih salah satu akun dari sidebar di sebelah kiri untuk mulai menggunakan workspace atau sosial media Anda.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#060e1c' }}>
      {/* Tab bar */}
      <div style={{ height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid #0f1f35', backgroundColor: '#040b15' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>
            {activeAccount.toolName} — {activeAccount.label}
          </span>
        </div>
        <a
          href={activeAccount.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', color: '#64748b', backgroundColor: '#0f172a', border: '1px solid #1e293b', textDecoration: 'none' }}
        >
          <ExternalLink size={13} />
          Buka di Tab Baru
        </a>
      </div>

      {/* Webview — takes remaining height */}
      <div style={{ flex: 1, backgroundColor: 'white', overflow: 'hidden' }}>
        <webview
          key={`${activeAccount.toolName}-${activeAccount.accountId}`}
          partition={`persist:${activeAccount.toolName}-${activeAccount.accountId}`}
          src={activeAccount.url}
          style={{ width: '100%', height: '100%', display: 'flex' }}
          title={activeAccount.toolName}
          allowpopups="true"
        />
      </div>
    </div>
  );
}
