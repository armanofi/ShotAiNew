import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ChevronRight, Plus, User } from 'lucide-react';
import AddAccountModal from './AddAccountModal';

// Icons per tool
const toolIcons = {
  Flow: '🌊',
  Dola: '💬',
  Grok: '✖',
  ChatGPT: '🤖',
  CapCut: '🎬',
  Facebook: '📘',
  Instagram: '📷',
  TikTok: '🎵',
  FastMoss: '📡',
};

function ToolMenuItem({ tool, category, onAddClick }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeAccount = useAppStore(state => state.activeAccount);
  const setActiveAccount = useAppStore(state => state.setActiveAccount);

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
          <span className="text-base leading-none">{toolIcons[tool.name] || '🔧'}</span>
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
              <button
                key={account.id}
                onClick={() => setActiveAccount({
                  toolName: tool.name,
                  accountId: account.id,
                  url: tool.url,
                  label: account.label,
                })}
                className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-md text-sm transition-colors"
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
      {/* Category header - clickable to toggle */}
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

      {/* Tools list */}
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
              U
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-white font-semibold truncate w-24">Profil Aktif</span>
              <span className={`text-[10px] font-medium ${isPremium ? 'text-green-400' : 'text-gray-400'}`}>{isPremium ? 'Premium' : 'Free License'}</span>
            </div>
          </div>
          <button 
            onClick={() => {
              if (window.confirm('Apakah Anda yakin ingin logout? Lisensi harus dimasukkan kembali.')) {
                localStorage.removeItem('shotai_license_validated');
                localStorage.removeItem('shotai_license_type');
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
