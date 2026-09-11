import { useState } from 'react';
import { Copy, Check, RefreshCw, Film, User } from 'lucide-react';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy}
      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
        backgroundColor: copied ? '#065f46' : '#1e293b',
        color: copied ? '#6ee7b7' : '#94a3b8',
        transition: 'all 0.2s',
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Tersalin!' : 'Copy Prompt'}
    </button>
  );
}

function PromptBox({ label, prompt, color }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ border: `1px solid ${color}22`, borderRadius: '10px', overflow: 'hidden', backgroundColor: `${color}08` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${color}22` }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setExpanded(!expanded)}
            style={{ fontSize: '11px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>
            {expanded ? '▲ Ringkas' : '▼ Lihat'}
          </button>
          <CopyButton text={prompt} />
        </div>
      </div>
      {expanded && (
        <pre style={{ margin: 0, padding: '12px 14px', fontSize: '11.5px', color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', maxHeight: '200px', overflowY: 'auto', backgroundColor: '#020817' }}>
          {prompt}
        </pre>
      )}
    </div>
  );
}



export default function SceneResult({ scene, onRegenerate }) {
  const [activeTab, setActiveTab] = useState(0);

  const prompts = scene.prompts || [];
  const currentPrompt = prompts[activeTab];

  return (
    <div style={{
      border: '1px solid #1e293b',
      borderRadius: '14px',
      overflow: 'hidden',
      marginBottom: '20px',
      backgroundColor: '#0a1628',
    }}>
      {/* Scene Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', backgroundColor: '#111827', borderBottom: '1px solid #1e293b' }}>
        <div>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#3b82f6' }}>SCENE {scene.id}</span>
          <span style={{ marginLeft: '12px', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
            "{scene.lyrics?.substring(0, 60)}{scene.lyrics?.length > 60 ? '...' : ''}"
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid #1e293b', padding: '0 12px' }}>
        {prompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: activeTab === idx ? 700 : 500,
              color: activeTab === idx ? '#3b82f6' : '#64748b',
              borderBottom: activeTab === idx ? '2px solid #3b82f6' : '2px solid transparent',
              whiteSpace: 'nowrap'
            }}
          >
            <User size={14} />
            {p.character}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {currentPrompt ? (
          <>
            {/* Image-to-Image prompt */}
            <PromptBox label={`🖼 Prompt Image-to-Image (${currentPrompt.character})`} prompt={currentPrompt.itiPrompt} color="#3b82f6" />

            {/* Image-to-Video prompt */}
            <PromptBox label={`🎬 Prompt Image-to-Video (${currentPrompt.character})`} prompt={currentPrompt.itvPrompt} color="#a855f7" />
          </>
        ) : (
          <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center' }}>Tidak ada prompt untuk karakter ini.</div>
        )}
      </div>
    </div>
  );
}
