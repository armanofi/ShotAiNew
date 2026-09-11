import { create } from 'zustand';

// Initial state helpers
const generateId = () => Math.random().toString(36).substring(2, 9);

const createInitialTool = (name, url) => ({
  name,
  url,
  accounts: [],
});

export const useAppStore = create((set) => ({
  // Workspace Tools
  workspaceTools: [
    createInitialTool('Flow', 'https://flow.google.com/about'),
    createInitialTool('Dola', 'https://www.dola.com/chat/'),
    createInitialTool('Grok', 'https://grok.com/'), // Using grok.com as assumed
    createInitialTool('ChatGPT', 'https://chatgpt.com/'),
    createInitialTool('CapCut', 'https://www.capcut.com/id-id/'),
  ],
  
  // Social Media Tools
  sosmedTools: [
    createInitialTool('Facebook', 'https://facebook.com/'),
    createInitialTool('Instagram', 'https://instagram.com/'),
    createInitialTool('TikTok', 'https://tiktok.com/'),
  ],

  // Riset Produk Tools
  risetProdukTools: [
    createInitialTool('FastMoss', 'https://www.fastmoss.com/'),
  ],

  // UI State
  isAiStudioOpen: false,
  studioView: null, // null | 'storyboard' | ...
  activeAccount: null, // { toolName, accountId, url }
  activeStudioTool: null, // null means showing grid, otherwise string name of the tool

  // Actions
  toggleAiStudio: () => set((state) => ({ isAiStudioOpen: !state.isAiStudioOpen })),
  setStudioView: (view) => set({ studioView: view }),
  
  openStudioTool: (toolName) => set({ activeStudioTool: toolName, isAiStudioOpen: true }),
  closeStudioTool: () => set({ activeStudioTool: null }),

  setActiveAccount: (accountInfo) => set({ activeAccount: accountInfo }),

  addAccount: (category, toolName, label) => set((state) => {
    let categoryKey = 'workspaceTools';
    if (category === 'sosmed') categoryKey = 'sosmedTools';
    else if (category === 'risetProduk') categoryKey = 'risetProdukTools';
    const updatedTools = state[categoryKey].map(tool => {
      if (tool.name === toolName) {
        return {
          ...tool,
          accounts: [...tool.accounts, {
            id: generateId(),
            label,
            createdAt: new Date().toISOString()
          }]
        };
      }
      return tool;
    });

    return { [categoryKey]: updatedTools };
  })
}));
