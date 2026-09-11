import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ChevronRight, Plus, User } from 'lucide-react';
import AddAccountModal from './AddAccountModal';

// ── Accurate SVG logos matching reference photo ────────────────────────────────
const ToolLogo = ({ name }) => {
  const s = 20; // size
  switch (name) {
    case 'Flow':
      // Google Flow - Google colors circle
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" fill="#fff" stroke="#e2e8f0" strokeWidth="1"/>
          <path d="M24 8 A16 16 0 0 1 40 24" stroke="#4285F4" strokeWidth="5" strokeLinecap="round" fill="none"/>
          <path d="M40 24 A16 16 0 0 1 24 40" stroke="#EA4335" strokeWidth="5" strokeLinecap="round" fill="none"/>
          <path d="M24 40 A16 16 0 0 1 8 24" stroke="#FBBC05" strokeWidth="5" strokeLinecap="round" fill="none"/>
          <path d="M8 24 A16 16 0 0 1 24 8" stroke="#34A853" strokeWidth="5" strokeLinecap="round" fill="none"/>
          <circle cx="24" cy="24" r="5" fill="#4285F4"/>
        </svg>
      );

    case 'Dola':
      // Purple gradient ring/infinity shape
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <defs>
            <linearGradient id="dola_g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c084fc"/>
              <stop offset="50%" stopColor="#a855f7"/>
              <stop offset="100%" stopColor="#7c3aed"/>
            </linearGradient>
          </defs>
          <ellipse cx="24" cy="24" rx="20" ry="14" stroke="url(#dola_g)" strokeWidth="7" fill="none" transform="rotate(-35 24 24)"/>
          <ellipse cx="24" cy="24" rx="20" ry="14" stroke="#c4b5fd" strokeWidth="3" fill="none" transform="rotate(-35 24 24)" opacity="0.4"/>
        </svg>
      );

    case 'Grok':
      // Black circle with diagonal slash (xAI Grok logo)
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="23" fill="#111111"/>
          <ellipse cx="24" cy="24" rx="12" ry="20" stroke="white" strokeWidth="4.5" fill="none" transform="rotate(30 24 24)"/>
          <line x1="8" y1="12" x2="40" y2="36" stroke="#111111" strokeWidth="6"/>
          <line x1="10" y1="10" x2="38" y2="38" stroke="white" strokeWidth="4" strokeLinecap="round"/>
        </svg>
      );

    case 'ChatGPT':
      // OpenAI rosette logo - black background, white flower/gear
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#10a37f"/>
          <g transform="translate(24,24)" fill="white">
            {[0,45,90,135,180,225,270,315].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const x = Math.cos(rad) * 10;
              const y = Math.sin(rad) * 10;
              return <ellipse key={i} cx={x} cy={y} rx="5.5" ry="9" transform={`rotate(${angle} ${x} ${y})`} opacity="0.85"/>;
            })}
            <circle cx="0" cy="0" r="6" fill="#10a37f"/>
            <circle cx="0" cy="0" r="4.5" fill="white"/>
          </g>
        </svg>
      );

    case 'CapCut':
      // Two crossing diagonal slashes (scissors/X shape)
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="8" fill="#f0f0f0"/>
          <g transform="translate(24,24)">
            <rect x="-16" y="-5" width="32" height="10" rx="3" fill="#111111" transform="rotate(45)"/>
            <rect x="-16" y="-5" width="32" height="10" rx="3" fill="#111111" transform="rotate(-45)"/>
            <rect x="-5" y="-16" width="10" height="7" rx="2" fill="#f0f0f0" transform="rotate(0)"/>
            <rect x="-5" y="9" width="10" height="7" rx="2" fill="#f0f0f0" transform="rotate(0)"/>
          </g>
        </svg>
      );

    case 'Facebook':
      // Blue circle with white lowercase f
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="24" fill="#1877F2"/>
          <path d="M28 18h-3c-0.6 0-1 0.4-1 1v3h4l-0.5 4H24v10h-4V26h-3v-4h3v-3c0-3.3 2.7-6 6-6h3v4z" fill="white"/>
        </svg>
      );

    case 'Instagram':
      // Camera with gradient background (purple→orange)
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <defs>
            <radialGradient id="ig_bg" cx="30%" cy="105%" r="140%">
              <stop offset="0%" stopColor="#fdf497"/>
              <stop offset="10%" stopColor="#fdf497"/>
              <stop offset="40%" stopColor="#fd5949"/>
              <stop offset="55%" stopColor="#d6249f"/>
              <stop offset="85%" stopColor="#285AEB"/>
            </radialGradient>
          </defs>
          <rect width="48" height="48" rx="11" fill="url(#ig_bg)"/>
          <rect x="10" y="10" width="28" height="28" rx="8" stroke="white" strokeWidth="2.8" fill="none"/>
          <circle cx="24" cy="24" r="7.5" stroke="white" strokeWidth="2.8" fill="none"/>
          <circle cx="34" cy="14" r="2" fill="white"/>
        </svg>
      );

    case 'TikTok':
      // Music note with cyan+red shadow effect on black
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#010101"/>
          {/* Cyan shadow */}
          <path d="M21.5 32.5c0 3 2.2 5 5 5s5-2.2 5-5-2.2-5-5-5c-0.35 0-0.7 0.04-1 0.1V16.5l8 2V12l-8-2.5V28c-0.9-0.6-2-1-3-1" fill="#69C9D0" opacity="0.8" transform="translate(-1.5, -1)"/>
          {/* Red shadow */}
          <path d="M21.5 32.5c0 3 2.2 5 5 5s5-2.2 5-5-2.2-5-5-5c-0.35 0-0.7 0.04-1 0.1V16.5l8 2V12l-8-2.5V28c-0.9-0.6-2-1-3-1" fill="#EE1D52" opacity="0.8" transform="translate(1.5, 1)"/>
          {/* White main */}
          <path d="M21.5 32.5c0 3 2.2 5 5 5s5-2.2 5-5-2.2-5-5-5c-0.35 0-0.7 0.04-1 0.1V16.5l8 2V12l-8-2.5V28c-0.9-0.6-2-1-3-1" fill="white"/>
        </svg>
      );

    case 'FastMoss':
      // Pink/red rounded square with white oval ring (planet style)
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <defs>
            <radialGradient id="fm_g" cx="40%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#ff6eb4"/>
              <stop offset="100%" stopColor="#e0185c"/>
            </radialGradient>
          </defs>
          <rect width="48" height="48" rx="12" fill="url(#fm_g)"/>
          <ellipse cx="24" cy="24" rx="14" ry="14" fill="#ff8cc8" opacity="0.5"/>
          <ellipse cx="24" cy="24" rx="8" ry="8" fill="#ff4d9e" opacity="0.8"/>
          {/* Orbit ring */}
          <ellipse cx="24" cy="24" rx="18" ry="10" stroke="white" strokeWidth="3.5" fill="none" transform="rotate(-20 24 24)"/>
          <circle cx="37" cy="21" r="3" fill="white"/>
        </svg>
      );

    case 'Dreamina':
      // Black background with colorful sail/kite shape (blue+teal→yellow)
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="10" fill="#050a10"/>
          <defs>
            <linearGradient id="dr_g1" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#00c8ff"/>
              <stop offset="60%" stopColor="#00e5c8"/>
              <stop offset="100%" stopColor="#ffe000"/>
            </linearGradient>
          </defs>
          {/* Kite/sail shape - sharp pointy triangle */}
          <path d="M24 6 L42 28 L24 42 L6 28 Z" fill="url(#dr_g1)" opacity="0.15"/>
          <path d="M24 6 L38 26 L24 40 L10 26 Z" fill="url(#dr_g1)" opacity="0.3"/>
          <path d="M24 8 L36 27 L24 38 L12 27 Z" fill="url(#dr_g1)" opacity="0.6"/>
          <path d="M24 11 L34 28 L24 36 L14 28 Z" fill="url(#dr_g1)"/>
          {/* Bright tip */}
          <circle cx="24" cy="11" r="2.5" fill="#ffe000" opacity="0.9"/>
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
            width: '32px', height: '32px',
            background: 'linear-gradient(135deg, #4F7FFF 0%, #7C3AED 100%)',
            boxShadow: '0 0 14px rgba(124,58,237,0.5)',
            borderRadius: '8px',
          }}
        >
          <span className="text-white font-black text-sm" style={{ letterSpacing: '-0.5px' }}>SA</span>
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
