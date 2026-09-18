import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Initial state helpers
const generateId = () => Math.random().toString(36).substring(2, 9);

const createInitialTool = (name, url) => ({
  name,
  url,
  accounts: [],
});

// Default home account (opens ShotAi portal when app starts)
export const SHOTAI_HOME_ACCOUNT = {
  toolName: 'ShotAi',
  accountId: 'portal',
  url: 'https://shot-ai-new.vercel.app/',
  label: '',
};

// Default tool lists (used for fresh install only)
const defaultWorkspaceTools = [
  createInitialTool('Flow', 'https://flow.google.com/about'),
  createInitialTool('Dola', 'https://www.dola.com/chat/'),
  createInitialTool('Grok', 'https://grok.com/'),
  createInitialTool('ChatGPT', 'https://chatgpt.com/'),
  createInitialTool('CapCut', 'https://www.capcut.com/id-id/'),
  createInitialTool('Dreamina', 'https://dreamina.capcut.com/'),
];

const defaultSosmedTools = [
  createInitialTool('Facebook', 'https://facebook.com/'),
  createInitialTool('Instagram', 'https://instagram.com/'),
  createInitialTool('TikTok', 'https://tiktok.com/'),
];

const defaultRisetProdukTools = [
  createInitialTool('FastMoss', 'https://www.fastmoss.com/'),
];

export const useAppStore = create(
  persist(
    (set) => ({
      // Workspace Tools (accounts are persisted across sessions)
      workspaceTools: defaultWorkspaceTools,
      sosmedTools: defaultSosmedTools,
      risetProdukTools: defaultRisetProdukTools,

      // UI State — default activeAccount is ShotAi homepage so it opens immediately on start
      isAiStudioOpen: false,
      studioView: null,
      activeAccount: SHOTAI_HOME_ACCOUNT,
      activeStudioTool: null,

      // Actions
      toggleAiStudio: () => set((state) => ({ isAiStudioOpen: !state.isAiStudioOpen })),
      setStudioView: (view) => set({ studioView: view }),
      
      openStudioTool: (toolName) => set({ activeStudioTool: toolName, isAiStudioOpen: true }),
      closeStudioTool: () => set({ activeStudioTool: null }),

      setActiveAccount: (accountInfo) => set({ activeAccount: accountInfo }),

      openShotAiPortal: () => set({ activeAccount: SHOTAI_HOME_ACCOUNT }),

      addAccount: (category, toolName, label) => set((state) => {
        let categoryKey = 'workspaceTools';
        if (category === 'sosmed') categoryKey = 'sosmedTools';
        else if (category === 'risetProduk') categoryKey = 'risetProdukTools';
        const newAccountId = generateId();
        let targetUrl = '';
        const updatedTools = state[categoryKey].map(tool => {
          if (tool.name === toolName) {
            targetUrl = tool.url;
            return {
              ...tool,
              accounts: [...tool.accounts, {
                id: newAccountId,
                label,
                createdAt: new Date().toISOString()
              }]
            };
          }
          return tool;
        });
        return {
          [categoryKey]: updatedTools,
          activeAccount: {
            toolName,
            accountId: newAccountId,
            url: targetUrl,
            label,
          }
        };
      }),

      removeAccount: (category, toolName, accountId) => set((state) => {
        let categoryKey = 'workspaceTools';
        if (category === 'sosmed') categoryKey = 'sosmedTools';
        else if (category === 'risetProduk') categoryKey = 'risetProdukTools';
        const updatedTools = state[categoryKey].map(tool => {
          if (tool.name === toolName) {
            return {
              ...tool,
              accounts: tool.accounts.filter(a => a.id !== accountId)
            };
          }
          return tool;
        });
        // Saat menghapus akun, alihkan tampilan langsung kembali ke ShotAi beranda
        return {
          [categoryKey]: updatedTools,
          activeAccount: SHOTAI_HOME_ACCOUNT,
        };
      }),
    }),
    {
      name: 'shotai-workspace', // localStorage key
      // Persist workspace/account data and AI Studio active tool/view
      partialize: (state) => ({
        workspaceTools: state.workspaceTools,
        sosmedTools: state.sosmedTools,
        risetProdukTools: state.risetProdukTools,
        isAiStudioOpen: state.isAiStudioOpen,
        activeStudioTool: state.activeStudioTool,
        studioView: state.studioView,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Remove ShotAi from workspaceTools if present from earlier session
          if (Array.isArray(state.workspaceTools)) {
            state.workspaceTools = state.workspaceTools.filter(t => t.name.toLowerCase() !== 'shotai');
          }
          // Default to ShotAi homepage on app launch if no account is selected or if previously on portal
          if (!state.activeAccount || state.activeAccount.toolName === 'ShotAi') {
            state.activeAccount = SHOTAI_HOME_ACCOUNT;
          }
        }
      },
    }
  )
);
