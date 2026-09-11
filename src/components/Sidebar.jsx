import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ChevronRight, Plus, User } from 'lucide-react';
import AddAccountModal from './AddAccountModal';

// ── Real SVG logos for each tool ──────────────────────────────────────────────
const ToolLogo = ({ name }) => {
  const size = 18;
  switch (name) {
    case 'Flow':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="24" fill="#1a73e8"/>
          <path d="M14 24 Q24 12 34 24 Q24 36 14 24Z" fill="white" opacity="0.9"/>
          <circle cx="24" cy="24" r="4" fill="white"/>
        </svg>
      );
    case 'Dola':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#FF4D00"/>
          <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fontSize="22" fontWeight="900" fill="white">D</text>
        </svg>
      );
    case 'Grok':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#000000"/>
          <path d="M12 12 L36 36 M12 36 L36 12" stroke="white" strokeWidth="5" strokeLinecap="round"/>
        </svg>
      );
    case 'ChatGPT':
      return (
        <svg width={size} height={size} viewBox="0 0 41 41" fill="none">
          <path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-6.15-3.666 10.079 10.079 0 0 0-11.51 4.972 9.967 9.967 0 0 0-6.634 4.much 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.15 3.666 10.079 10.079 0 0 0 11.51-4.972 9.967 9.967 0 0 0 6.634-4.806 10.079 10.079 0 0 0-1.24-11.816zm-22.478 31.485a7.474 7.474 0 0 1-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 0 0 .655-1.134V19.054l-3.366 1.944a.12.12 0 0 0-.066.092v9.299a7.505 7.505 0 0 1-7.505-7.504 7.474 7.474 0 0 1 1.097-3.87c.03.063.065.132.101.2l7.964 4.6a1.294 1.294 0 0 0 1.308 0l9.724-5.614v3.888a.12.12 0 0 0 .048.103l6.783 3.919a7.504 7.504 0 0 1-7.505 7.504zm-6.718-7.27a7.474 7.474 0 0 1-1.097-3.87 7.474 7.474 0 0 1 3.898-6.572v9.2a1.294 1.294 0 0 0 .655 1.133l7.964 4.6a7.476 7.476 0 0 1-4.799 1.735 7.506 7.506 0 0 1-6.621-6.226z" fill="#10a37f"/>
        </svg>
      );
    case 'CapCut':
    case 'Dreamina':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#000000"/>
          <path d="M24 10 L38 24 L24 38 L10 24 Z" fill="white"/>
          <circle cx="24" cy="24" r="5" fill="black"/>
        </svg>
      );
    case 'Facebook':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="24" fill="#1877F2"/>
          <path d="M32 24H27V36H21V24H17V18H21V15C21 11.5 23 10 26 10H32V16H28C27 16 27 16.5 27 17V18H32L32 24Z" fill="white"/>
        </svg>
      );
    case 'Instagram':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <defs>
            <radialGradient id="ig1" cx="30%" cy="107%" r="150%">
              <stop offset="0%" stopColor="#fdf497"/>
              <stop offset="5%" stopColor="#fdf497"/>
              <stop offset="45%" stopColor="#fd5949"/>
              <stop offset="60%" stopColor="#d6249f"/>
              <stop offset="90%" stopColor="#285AEB"/>
            </radialGradient>
          </defs>
          <rect width="48" height="48" rx="12" fill="url(#ig1)"/>
          <rect x="12" y="12" width="24" height="24" rx="7" stroke="white" strokeWidth="2.5" fill="none"/>
          <circle cx="24" cy="24" r="6" stroke="white" strokeWidth="2.5" fill="none"/>
          <circle cx="33" cy="15" r="1.5" fill="white"/>
        </svg>
      );
    case 'TikTok':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#010101"/>
          <path d="M30 10h-5.5v19.5a4.5 4.5 0 1 1-4.5-4.5c.4 0 .8.05 1.15.14V19.5A10.2 10.2 0 0 0 20 19.3a10 10 0 1 0 10 10V22.6A14.8 14.8 0 0 0 38 24v-5.5a9.3 9.3 0 0 1-8-8.5z" fill="white"/>
        </svg>
      );
    case 'FastMoss':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#00B86B"/>
          <path d="M10 24 L20 14 L28 22 L38 10" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 38 L20 28 L28 34 L38 22" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
        </svg>
      );
    default:
      return <span style={{ fontSize: '16px' }}>🔧</span>;
  }
};

function ToolMenuItem({ tool, category, onAddClick }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeAccount = useAppStore(state => state.activeAccount);
  const setActiveAccount = useAppStore(state => state.setActiveAccount);
  const removeAccount = useAppStore(state => state.removeAccount);

  return (
    <div>
      {/* Tool row */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer group"
        style={{ borderRadius: '8px' }}
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ToolLogo name={tool.name} />
          <span className="text-sm font-medium text-slate-300 truncate">{tool.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: '#1e293b', color: '#64748b' }}>
            {tool.accounts.length}
          </span>
        </div>
        <ChevronRight
          size={14}
          style={{
            color: '#64748b',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
          }}
        />
      </div>

      {/* Expanded accounts list */}
      {isExpanded && (
        <div className="ml-4 mb-1" style={{ borderLeft: '1px solid #334155', paddingLeft: '8px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onAddClick(tool.name, category); }}
            className="flex items-center gap-1.5 w-full text-left py-1.5 px-2 rounded-md text-xs transition-colors"
            style={{ color: '#3b82f6' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.08)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Plus size={12} />
            <span>Tambah Akun {tool.name}</span>
          </button>

          {tool.accounts.map(account => {
            const isActive = activeAccount?.accountId === account.id;
            return (
              <div key={account.id} className="flex items-center gap-1 group/account">
                <button
                  onClick={() => setActiveAccount({
                    toolName: tool.name,
                    accountId: account.id,
                    url: tool.url,
                    label: account.label,
                  })}
                  className="flex items-center gap-2 flex-1 text-left py-1.5 px-2 rounded-md text-sm transition-colors min-w-0"
                  style={{
                    color: isActive ? '#3b82f6' : '#94a3b8',
                    backgroundColor: isActive ? 'rgba(59,130,246,0.1)' : 'transparent',
                    fontWeight: isActive ? 600 : 400,
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <User size={12} style={{ color: isActive ? '#3b82f6' : '#475569', flexShrink: 0 }} />
                  <span className="truncate">{account.label}</span>
                </button>
                {/* Delete account button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Hapus akun "${account.label}"?`)) {
                      removeAccount(category, tool.name, account.id);
                    }
                  }}
                  title="Hapus akun"
                  className="opacity-0 group-hover/account:opacity-100 p-1 rounded transition-all flex-shrink-0"
                  style={{ color: '#475569' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategorySection({ title, icon, tools, category, onAddClick, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-colors"
        style={{ color: '#94a3b8' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-xs font-bold tracking-wider uppercase" style={{ color: '#94a3b8' }}>
            {title}
          </span>
        </div>
        <ChevronRight
          size={14}
          style={{
            color: '#64748b',
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {isOpen && (
        <div className="ml-2 mt-0.5 flex flex-col gap-0.5">
          {tools.map(tool => (
            <ToolMenuItem
              key={tool.name}
              tool={tool}
              category={category}
              onAddClick={onAddClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const workspaceTools = useAppStore(state => state.workspaceTools);
  const sosmedTools = useAppStore(state => state.sosmedTools);
  const risetProdukTools = useAppStore(state => state.risetProdukTools);
  const addAccount = useAppStore(state => state.addAccount);

  const [modalState, setModalState] = useState({ isOpen: false, toolName: '', category: '' });

  const openAddModal = (toolName, category) => {
    setModalState({ isOpen: true, toolName, category });
  };

  const licenseType = localStorage.getItem('shotai_license_type') || 'free';
  const isPremium = licenseType === 'premium';

  return (
    <div
      className="flex flex-col h-full flex-shrink-0"
      style={{ width: '220px', backgroundColor: '#0f172a', borderRight: '1px solid #1e293b' }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 flex-shrink-0"
        style={{ height: '52px', borderBottom: '1px solid #1e293b' }}
      >
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{
            width: '30px', height: '30px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            boxShadow: '0 0 12px rgba(59,130,246,0.4)',
          }}
        >
          <span className="text-white font-bold text-sm">S</span>
        </div>
        <span
          className="font-bold text-lg"
          style={{ background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          ShotAi
        </span>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-3 px-2">
        <CategorySection
          title="Workspace"
          icon="🗂️"
          tools={workspaceTools}
          category="workspace"
          onAddClick={openAddModal}
          defaultOpen={true}
        />
        <CategorySection
          title="Sosmed"
          icon="📱"
          tools={sosmedTools}
          category="sosmed"
          onAddClick={openAddModal}
          defaultOpen={false}
        />
        <CategorySection
          title="Riset Produk"
          icon="🔎"
          tools={risetProdukTools}
          category="risetProduk"
          onAddClick={openAddModal}
          defaultOpen={true}
        />
      </div>

      {/* Bottom Buttons */}
      <div className="p-3 flex flex-col gap-2 flex-shrink-0" style={{ borderTop: '1px solid #1e293b' }}>
        <button
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg"
          style={{ backgroundColor: '#22c55e', boxShadow: '0 4px 14px rgba(34,197,94,0.2)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#16a34a'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#22c55e'}
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" style={{ width: '18px', height: '18px', filter: 'brightness(0) invert(1)' }} />
          WhatsApp
        </button>

        {/* User Profile & Logout */}
        <div className="flex items-center justify-between p-2 mt-1 rounded-xl transition-colors" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid #1e293b' }}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: isPremium ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#475569' }}>
              {isPremium ? '★' : 'U'}
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-white font-semibold truncate w-24">
                {isPremium ? (localStorage.getItem('shotai_premium_email') || 'Premium').split('@')[0] : 'Profil Aktif'}
              </span>
              <span className={`text-[10px] font-medium ${isPremium ? 'text-green-400' : 'text-gray-400'}`}>
                {isPremium ? '⭐ Premium' : 'Free License'}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Apakah Anda yakin ingin logout? Lisensi harus dimasukkan kembali.')) {
                localStorage.removeItem('shotai_license_validated');
                localStorage.removeItem('shotai_license_type');
                localStorage.removeItem('shotai_premium_email');
                window.location.reload();
              }
            }}
            className="text-gray-400 hover:text-red-400 p-1.5 rounded-md hover:bg-red-500/10 transition-colors"
            title="Keluar (Logout)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </div>

      <AddAccountModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        toolName={modalState.toolName}
        category={modalState.category}
        onAdd={(cat, name, label) => addAccount(cat, name, label)}
      />
    </div>
  );
}
