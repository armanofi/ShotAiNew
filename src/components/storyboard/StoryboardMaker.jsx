import { useState } from 'react';
import { useStoryboardStore } from '../../store/useStoryboardStore';
import { useAppStore } from '../../store/useAppStore';
import CharacterConfig from './CharacterConfig';
import SceneResult from './SceneResult';
import { ArrowLeft, Zap, ChevronDown } from 'lucide-react';

const S = {
  label: { fontSize: '11px', color: '#64748b', marginBottom: '4px', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { width: '100%', backgroundColor: '#0a0f1e', border: '1px solid #1e293b', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' },
};

function Toggle({ active, onChange }) {
  return (
    <button type="button" onClick={e => { e.stopPropagation(); onChange(!active); }}
      style={{ width: '36px', height: '20px', borderRadius: '10px', backgroundColor: active ? '#3b82f6' : '#1e293b', border: '1px solid', borderColor: active ? '#2563eb' : '#334155', cursor: 'pointer', position: 'relative', transition: 'all 0.2s', flexShrink: 0, padding: 0 }}>
      <span style={{ position: 'absolute', top: '2px', left: active ? '17px' : '2px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: active ? 'white' : '#475569', transition: 'left 0.2s' }} />
    </button>
  );
}

function Section({ title, defaultOpen = false, children, badge, badgeColor }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: '4px', border: '1px solid #0f1f35', borderRadius: '10px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', backgroundColor: open ? '#0a1628' : '#070f1a', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: open ? '#93c5fd' : '#475569' }}>{title}</span>
          {badge && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: `${badgeColor}22`, color: badgeColor, fontWeight: 700 }}>{badge}</span>}
        </div>
        <ChevronDown size={13} style={{ color: '#475569', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ padding: '10px 12px', backgroundColor: '#040b15' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function CharacterSection({ title, badge, badgeColor, active, onToggle, alwaysActive, data, onChange, showGear, showInstrument }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: '4px', border: `1px solid ${active ? '#1e3a5f' : '#0f1f35'}`, borderRadius: '10px', overflow: 'hidden' }}>
      <div onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', backgroundColor: active ? '#080f20' : '#06090f', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!alwaysActive && <Toggle active={active} onChange={onToggle} />}
          <span style={{ fontSize: '12px', fontWeight: 700, color: active ? '#93c5fd' : '#334155' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {badge && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: `${badgeColor}22`, color: badgeColor, fontWeight: 700 }}>{badge}</span>}
          <ChevronDown size={13} style={{ color: '#475569', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      </div>
      {open && active && (
        <div style={{ padding: '10px 12px', backgroundColor: '#030710', borderTop: '1px solid #0f1f35' }}>
          <CharacterConfig data={data} onChange={onChange} showGear={showGear} showInstrument={showInstrument} />
        </div>
      )}
      {open && !active && (
        <div style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: '#1e3a5f', backgroundColor: '#030710', borderTop: '1px solid #0f1f35' }}>
          Toggle untuk mengaktifkan
        </div>
      )}
    </div>
  );
}

export default function StoryboardMaker() {
  const setStudioView = useAppStore(state => state.setStudioView);
  const store = useStoryboardStore();

  const canGenerate = store.lyrics.trim() !== '' && store.videoModel !== '';

  const bandPersonilList = [
    { key: 'gitaris', label: '🎸 Gitaris' },
    { key: 'bassis', label: '🎵 Bassis' },
    { key: 'drummer', label: '🥁 Drummer' },
    { key: 'saxophonist', label: '🎷 Saxophonist' },
    { key: 'trumpeter', label: '🎺 Trumpeter' },
    { key: 'violinist', label: '🎻 Violinist' },
    { key: 'pianis', label: '🎹 Pianis' },
  ];

  const videoModelOptions = [
    { value: 'video-klip', label: '🎤 Video Klip', desc: 'Artis solo + b-roll' },
    { value: 'video-band', label: '🎸 Video Band', desc: 'Full band tampil' },
    { value: 'video-drama', label: '🎭 Video Drama', desc: 'Alur cerita' },
  ];

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#040b15', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', height: '48px', borderBottom: '1px solid #0f1f35', backgroundColor: '#030710' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setStudioView(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#64748b', backgroundColor: '#0f172a' }}>
            <ArrowLeft size={12} /> AI Studio
          </button>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#93c5fd' }}>🎬 Shifa Vibes</span>
        </div>
        <button onClick={store.generateStoryboard} disabled={!canGenerate || store.isGenerating}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: 'none', cursor: canGenerate ? 'pointer' : 'not-allowed', fontSize: '11px', fontWeight: 700,
            background: canGenerate ? 'linear-gradient(135deg, #7c3aed, #2563eb)' : '#1e293b',
            color: canGenerate ? 'white' : '#374151',
          }}>
          <Zap size={13} /> Generate
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>

        {/* Global Settings */}
        <Section title="🌍 Pengaturan Global" defaultOpen={true}>
          <div style={{ marginBottom: '10px' }}>
            <span style={S.label}>Lokasi Syuting</span>
            <input style={S.input} placeholder="Studio, pantai, panggung..." value={store.location} onChange={e => store.setField('location', e.target.value)} />
          </div>

          <span style={S.label}>Model Cerita Video</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
            {videoModelOptions.map(opt => (
              <button key={opt.value} onClick={() => store.setField('videoModel', opt.value)}
                style={{ textAlign: 'left', padding: '8px 10px', borderRadius: '7px', border: '1px solid', cursor: 'pointer',
                  backgroundColor: store.videoModel === opt.value ? '#0f2040' : '#0a0f1e',
                  borderColor: store.videoModel === opt.value ? '#3b82f6' : '#1e293b',
                }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: store.videoModel === opt.value ? '#93c5fd' : '#64748b' }}>{opt.label}</div>
                <div style={{ fontSize: '10px', color: '#334155' }}>{opt.desc}</div>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <span style={S.label}>Scene: <strong style={{ color: '#3b82f6' }}>{store.sceneCount}</strong></span>
              <input type="range" min={1} max={100} value={store.sceneCount} onChange={e => store.setField('sceneCount', parseInt(e.target.value))} style={{ width: '100%', accentColor: '#3b82f6' }} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={S.label}>Shot / Adegan:</span>
              <select 
                value={store.shotCount} 
                onChange={e => store.setField('shotCount', parseInt(e.target.value))}
                style={{ ...S.input, height: '34px', cursor: 'pointer' }}
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>{num} Shot</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <span style={S.label}>Durasi: <strong style={{ color: '#a855f7' }}>{store.sceneDuration}s</strong></span>
              <input type="range" min={5} max={15} value={store.sceneDuration} onChange={e => store.setField('sceneDuration', parseInt(e.target.value))} style={{ width: '100%', accentColor: '#a855f7' }} />
            </div>
          </div>
        </Section>

        {/* Artis Utama */}
        <CharacterSection title="🌟 Artis Utama" badge="WAJIB" badgeColor="#f59e0b"
          active={true} alwaysActive showGear showInstrument
          data={store.artistUtama} onChange={d => store.updateArtistUtama(d)} />

        {/* Artis Featuring */}
        <CharacterSection title="🎤 Artis Featuring"
          badge={store.artistFeaturing.active ? 'ON' : 'OFF'}
          badgeColor={store.artistFeaturing.active ? '#10b981' : '#475569'}
          active={store.artistFeaturing.active}
          onToggle={v => store.updateArtistFeaturing({ active: v })}
          showGear showInstrument
          data={store.artistFeaturing} onChange={d => store.updateArtistFeaturing(d)} />

        {/* Band Personil */}
        <Section title="🎸 Personil Band" defaultOpen={false}>
          {bandPersonilList.map(({ key, label }) => {
            const p = store.bandPersonil[key];
            return (
              <CharacterSection key={key} title={label}
                badge={p.active ? 'ON' : 'OFF'}
                badgeColor={p.active ? '#10b981' : '#475569'}
                active={p.active}
                onToggle={v => store.updateBandPersonil(key, { active: v })}
                showGear={false} showInstrument
                data={p} onChange={d => store.updateBandPersonil(key, d)} />
            );
          })}
        </Section>

        {/* Lirik */}
        <Section title="📝 Lirik Lagu" defaultOpen={true}>
          <textarea
            style={{ ...S.input, minHeight: '120px', resize: 'vertical', lineHeight: 1.7 }}
            placeholder={"Tempel lirik lagu di sini...\n\nSistem akan memecah per baris ke tiap scene."}
            value={store.lyrics}
            onChange={e => store.setField('lyrics', e.target.value)}
          />
          <p style={{ fontSize: '11px', color: '#334155', marginTop: '6px' }}>
            {store.lyrics ? `${store.lyrics.split('\n').filter(l => l.trim()).length} baris · ${store.sceneCount} scene` : 'Wajib diisi sebelum generate'}
          </p>
        </Section>

        {/* Results */}
        {store.isGenerating && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #1e293b', borderTop: '3px solid #3b82f6', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: '#475569', fontSize: '13px' }}>{store.generatingStatus || `Generating ${store.sceneCount} scene...`}</p>
          </div>
        )}

        {!store.isGenerating && store.scenes.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
              Hasil — {store.scenes.length} Scene
            </div>
            {store.scenes.map(scene => (
              <SceneResult key={scene.id} scene={scene} onRegenerate={store.regenerateScene} />
            ))}
          </div>
        )}

        {!store.isGenerating && store.scenes.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#1e3a5f', fontSize: '13px' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎬</div>
            Isi konfigurasi di atas, lalu tekan <strong style={{ color: '#3b82f6' }}>Generate</strong>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type="range"] { -webkit-appearance: none; height: 4px; border-radius: 2px; background: #1e293b; cursor: pointer; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 13px; height: 13px; border-radius: 50%; background: currentColor; cursor: pointer; }
      `}</style>
    </div>
  );
}
