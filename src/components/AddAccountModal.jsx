import { useState } from 'react';
import { X } from 'lucide-react';

export default function AddAccountModal({ isOpen, onClose, toolName, category, onAdd }) {
  const [label, setLabel] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    onAdd(category, toolName, label);
    setLabel('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-secondary rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Tambah Akun {toolName}
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nama Akun / Label
            </label>
            <input 
              type="text" 
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`Contoh: ${toolName} 1`}
              className="w-full bg-slate-900 border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              autoFocus
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button 
              type="submit"
              disabled={!label.trim()}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
