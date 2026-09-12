import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  Search, Settings, BookOpen, Video, Scissors, 
  Mic, Camera, Palette, Box, Image as ImageIcon, 
  Share2, Zap, ArrowLeft, ChevronRight, Key, Music
} from 'lucide-react';
import ApiKeyModal from './ApiKeyModal';
import ApiWebviewOverlay from './ApiWebviewOverlay';
import AudioToStoryboard from './AudioToStoryboard';

const studioTools = [
  { id: 'storyboard', name: 'Storyboard Maker', desc: 'Alur scene', icon: BookOpen, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  { id: 'tiktok-dl', name: 'TikTok Downloader', desc: 'Tanpa watermark', icon: Video, color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
  { id: 'split-video', name: 'Split Video', desc: 'Potong video', icon: Scissors, color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  { id: 'voiceover', name: 'Voiceover', desc: 'Naskah jadi suara', icon: Mic, color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  { id: 'product-photo', name: 'Foto Produk', desc: 'Prompt foto produk', icon: Camera, color: '#facc15', bg: 'rgba(250,204,21,0.12)' },
  { id: 'branding', name: 'Branding AI', desc: 'Logo & moodboard', icon: Palette, color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  { id: 'mockup', name: 'Mockup Produk', desc: 'Prompt mockup', icon: Box, color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  { id: 'photographer', name: 'Fotografer AI', desc: 'Foto gaya pro', icon: ImageIcon, color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
  { id: 'affiliate', name: 'Affiliate Kit', desc: 'Caption & skrip', icon: Share2, color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  { id: 'prompt-video', name: 'Prompt Video', desc: 'Prompt video AI', icon: Zap, color: '#fb7185', bg: 'rgba(251,113,133,0.12)' },
  { id: 'audio-to-storyboard', name: 'Audio to Storyboard', desc: 'Lagu jadi lirik', icon: Music, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
];

function ToolGrid({ onSelect }) {
  return (
    <div style={{
      padding: '12px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))',
      gap: '10px',
    }}>
      {studioTools.map(tool => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={() => onSelect(tool)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '10px',
              padding: '16px 8px 14px',
              borderRadius: '14px',
              border: '1.5px solid #1e293b',
              cursor: 'pointer',
              textAlign: 'center',
              backgroundColor: '#0a111f',
              transition: 'border-color 0.15s, background-color 0.15s, transform 0.15s',
              minWidth: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = tool.color;
              e.currentTarget.style.backgroundColor = tool.bg;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#1e293b';
              e.currentTarget.style.backgroundColor = '#0a111f';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: tool.bg, color: tool.color, flexShrink: 0 }}>
              <Icon size={22} />
            </div>
            <div style={{ minWidth: 0, width: '100%' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1', lineHeight: 1.3, wordBreak: 'break-word' }}>
                {tool.name}
              </div>
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '3px', lineHeight: 1.3 }}>
                {tool.desc}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ToolDetail({ tool, onBack }) {
  const Icon = tool.icon;
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0f172a' }}>
      <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: '#334155', backgroundColor: '#1e293b' }}>
        <button 
          onClick={onBack}
          className="p-1.5 rounded-lg transition-colors text-slate-300"
          style={{ backgroundColor: '#334155' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#475569'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#334155'}
        >
          <ArrowLeft size={16} />
        </button>
        <div className="p-1.5 rounded-md" style={{ backgroundColor: tool.bg, color: tool.color }}>
          <Icon size={16} />
        </div>
        <h3 className="font-semibold text-white flex-1 text-sm">{tool.name}</h3>
      </div>
      
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <div className="p-6 rounded-2xl mb-5" style={{ backgroundColor: tool.bg, color: tool.color, opacity: 0.9 }}>
          <Icon size={40} />
        </div>
        <h4 className="text-lg font-semibold text-white mb-2">{tool.name}</h4>
        <p className="text-slate-400 text-sm mb-6">{tool.desc}</p>
        
        {tool.id === 'audio-to-storyboard' && (
          <div className="w-full">
            <AudioToStoryboard />
          </div>
        )}

        {tool.id === 'storyboard' && (
          <div className="w-full text-left border rounded-xl p-4" style={{ borderColor: '#334155', backgroundColor: '#1e293b' }}>
            <h5 className="font-medium mb-3 text-sm text-slate-300 flex items-center gap-2">
              <ChevronRight size={14} style={{ color: '#3b82f6' }} />
              Sub-fitur: Character Sheet
            </h5>
            <button
              className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: '#3b82f6' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              Buat Karakter Baru
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AiStudioPanel() {
  const activeStudioTool = useAppStore(state => state.activeStudioTool);
  const openStudioTool = useAppStore(state => state.openStudioTool);
  const closeStudioTool = useAppStore(state => state.closeStudioTool);
  const setStudioView = useAppStore(state => state.setStudioView);
  
  const [hasApiKey, setHasApiKey] = useState(true);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isWebviewOpen, setIsWebviewOpen] = useState(false);

  // Helper: re-read API key state from localStorage
  const checkApiKey = () => {
    const keysRaw = localStorage.getItem('google_ai_studio_keys');
    if (keysRaw) {
      try {
        const keys = JSON.parse(keysRaw);
        if (Array.isArray(keys) && keys.length > 0) {
          setHasApiKey(true);
          return;
        }
      } catch {}
    }
    // Fallback: old single key format
    const oldKey = localStorage.getItem('google_ai_studio_key');
    setHasApiKey(!!oldKey && oldKey.trim() !== '');
  };

  useEffect(() => {
    // Check on every mount (also when returning from Storyboard Maker)
    checkApiKey();

    // Also listen for storage changes (when key saved in modal)
    const onStorage = () => checkApiKey();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [activeStudioTool]); // re-run when navigating between tools
  
  const activeToolObj = activeStudioTool 
    ? studioTools.find(t => t.id === activeStudioTool) 
    : null;

  const handleSaveKey = (key) => {
    if (!key.trim()) {
      alert('Masukkan API Key yang valid!');
      return;
    }
    localStorage.setItem('google_ai_studio_key', key.trim());
    setHasApiKey(true);
    setIsWebviewOpen(false);
    setIsApiKeyModalOpen(false);
    checkApiKey(); // immediately re-validate
  };

  // Missing API Key View
  if (!hasApiKey) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', width: '100%', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
          
          <div style={{
            width: '80px', height: '80px', borderRadius: '24px', backgroundColor: '#fef08a',
            border: '2px solid #eab308', display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '24px', boxShadow: '0 10px 15px -3px rgba(250, 204, 21, 0.2)'
          }}>
            <Key size={36} color="#000" />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
            Belum ada API key Google AI Studio
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '300px', lineHeight: 1.5, marginBottom: '24px' }}>
            Tool ini butuh API key Google AI Studio untuk berjalan. Tambahkan key dulu di API key pool, lalu buka tool ini lagi.
          </p>

          <button 
            onClick={() => setIsApiKeyModalOpen(true)}
            style={{
              backgroundColor: '#3b5bdb', color: 'white', border: 'none', padding: '12px 24px',
              borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#3b5bdb'}
          >
            <Settings size={16} />
            Setting API key dulu
          </button>
        </div>

        <ApiKeyModal 
          isOpen={isApiKeyModalOpen} 
          onClose={() => setIsApiKeyModalOpen(false)} 
          onGetApiKey={() => setIsWebviewOpen(true)}
        />

        <ApiWebviewOverlay 
          isOpen={isWebviewOpen}
          onClose={() => setIsWebviewOpen(false)}
          onSaveKey={handleSaveKey}
        />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#060e1c', width: '100%' }}>
      {/* Studio Header */}
      {!activeStudioTool && (
        <div className="flex-shrink-0 border-b" style={{ borderColor: '#334155', backgroundColor: '#1e293b' }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <h2 className="text-base font-bold" style={{ 
              background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              AI STUDIO
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium border"
                style={{ backgroundColor: 'rgba(74,222,128,0.1)', color: '#4ade80', borderColor: 'rgba(74,222,128,0.2)' }}
              >
                1/1 ready
              </span>
              <button 
                onClick={() => {
                  // User can also open the modal from here if they already have a key
                  setIsApiKeyModalOpen(true);
                }}
                className="p-1.5 rounded-md transition-colors hover:bg-slate-700" 
                style={{ color: '#94a3b8', backgroundColor: '#334155' }}
              >
                <Settings size={14} />
              </button>
            </div>
          </div>
          
          <div className="relative px-4 pb-4">
            <Search size={14} className="absolute left-7 top-1/2 -translate-y-1/2" style={{ color: '#64748b' }} />
            <input 
              type="text" 
              placeholder="Cari tool..." 
              className="w-full rounded-lg pl-8 pr-4 py-2 text-sm focus:outline-none"
              style={{ 
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                color: '#f8fafc',
              }}
            />
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto" style={{ overflowX: 'hidden' }}>
        {activeToolObj ? (
          <ToolDetail tool={activeToolObj} onBack={closeStudioTool} />
        ) : (
          <ToolGrid onSelect={(t) => {
            if (t.id === 'storyboard') {
              setStudioView('storyboard');
            } else {
              openStudioTool(t.id);
            }
          }} />
        )}
      </div>

      <ApiKeyModal 
        isOpen={isApiKeyModalOpen} 
        onClose={() => setIsApiKeyModalOpen(false)} 
        onGetApiKey={() => setIsWebviewOpen(true)}
      />

      <ApiWebviewOverlay 
        isOpen={isWebviewOpen}
        onClose={() => setIsWebviewOpen(false)}
        onSaveKey={handleSaveKey}
      />
    </div>
  );
}
