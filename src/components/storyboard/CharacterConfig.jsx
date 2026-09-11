import { useState } from 'react';
import { ChevronDown, Upload, X } from 'lucide-react';

const S = {
  section: { marginBottom: '16px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #1e293b' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#1e293b', cursor: 'pointer', userSelect: 'none' },
  sectionTitle: { fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' },
  sectionBody: { padding: '12px 14px', backgroundColor: '#0f1f35', display: 'flex', flexDirection: 'column', gap: '10px' },
  label: { fontSize: '11px', color: '#64748b', marginBottom: '3px', display: 'block' },
  input: { width: '100%', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', padding: '7px 10px', fontSize: '13px', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' },
  row: { display: 'flex', gap: '8px' },
  toggle: (active) => ({ width: '36px', height: '20px', borderRadius: '10px', cursor: 'pointer', position: 'relative', backgroundColor: active ? '#3b82f6' : '#334155', border: 'none', transition: 'background-color 0.2s', flexShrink: 0 }),
  toggleKnob: (active) => ({ position: 'absolute', top: '2px', left: active ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s' }),
};

function Toggle({ active, onChange }) {
  return (
    <button style={S.toggle(active)} onClick={() => onChange(!active)} type="button">
      <span style={S.toggleKnob(active)} />
    </button>
  );
}

function PhotoUpload({ label, url, onChange, onClear }) {
  return (
    <div>
      <span style={S.label}>{label}</span>
      {url ? (
        <div style={{ position: 'relative', width: '80px', height: '80px' }}>
          <img src={url} alt={label} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #3b82f6' }} />
          <button
            onClick={onClear}
            style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px dashed #334155', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#0f172a' }}>
          <Upload size={14} style={{ color: '#475569' }} />
          <span style={{ fontSize: '12px', color: '#64748b' }}>Upload foto...</span>
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
            const file = e.target.files?.[0];
            if (file) {
              const url = URL.createObjectURL(file);
              onChange(file, url);
            }
          }} />
        </label>
      )}
    </div>
  );
}

function Collapsible({ title, badge, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={S.section}>
      <div style={S.sectionHeader} onClick={() => setOpen(!open)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={S.sectionTitle}>{title}</span>
          {badge && (
            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#1d4ed8', color: '#93c5fd' }}>{badge}</span>
          )}
        </div>
        <ChevronDown size={14} style={{ color: '#475569', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>
      {open && <div style={S.sectionBody}>{children}</div>}
    </div>
  );
}

export default function CharacterConfig({ data, onChange, showGear = true, showInstrument = true }) {
  const update = (field, value) => onChange({ ...data, [field]: value });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
      {/* Gender */}
      <Collapsible title="Identitas" defaultOpen={true}>
        <div>
          <span style={S.label}>Gender</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['pria', 'wanita'].map(g => (
              <button key={g} onClick={() => update('gender', g)}
                style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize',
                  backgroundColor: data.gender === g ? '#1d4ed8' : '#0f172a',
                  borderColor: data.gender === g ? '#3b82f6' : '#334155',
                  color: data.gender === g ? '#bfdbfe' : '#64748b',
                }}
              >
                {g === 'pria' ? '♂ Pria' : '♀ Wanita'}
              </button>
            ))}
          </div>
        </div>

        <div style={S.row}>
          <PhotoUpload label="📸 Foto Referensi Wajah"
            url={data.facePhotoUrl}
            onChange={(file, url) => onChange({ ...data, facePhotoFile: file, facePhotoUrl: url })}
            onClear={() => onChange({ ...data, facePhotoFile: null, facePhotoUrl: null })}
          />
          <PhotoUpload label="👔 Foto Referensi Baju"
            url={data.clothesPhotoUrl}
            onChange={(file, url) => onChange({ ...data, clothesPhotoFile: file, clothesPhotoUrl: url })}
            onClear={() => onChange({ ...data, clothesPhotoFile: null, clothesPhotoUrl: null })}
          />
        </div>
      </Collapsible>

      {/* Accessories */}
      <Collapsible title="Aksesori" defaultOpen={false}>
        {[
          { field: 'aksesoriKepala', label: '🎩 Kepala (topi, dll)' },
          { field: 'aksesoriTangan', label: '⌚ Tangan (jam, gelang)' },
          { field: 'aksesoriLeher', label: '📿 Leher (kalung, dll)' },
        ].map(({ field, label }) => (
          <div key={field}>
            <span style={S.label}>{label}</span>
            <input style={S.input} placeholder="Contoh: Fedora hitam..." value={data[field] || ''} onChange={e => update(field, e.target.value)} />
          </div>
        ))}
      </Collapsible>

      {/* Clothes */}
      <Collapsible title="Busana" defaultOpen={false}>
        <div style={S.row}>
          <div style={{ flex: 1 }}>
            <span style={S.label}>👕 Baju</span>
            <input style={{ ...S.input, opacity: data.clothesPhotoUrl ? 0.4 : 1 }}
              placeholder="Kemeja flanel..." value={data.baju || ''}
              disabled={!!data.clothesPhotoUrl}
              onChange={e => update('baju', e.target.value)} />
          </div>
          <div style={{ width: '80px' }}>
            <span style={S.label}>Warna</span>
            <input style={{ ...S.input, opacity: data.clothesPhotoUrl ? 0.4 : 1 }}
              placeholder="Merah..." value={data.warnaBaju || ''}
              disabled={!!data.clothesPhotoUrl}
              onChange={e => update('warnaBaju', e.target.value)} />
          </div>
        </div>
        <div style={S.row}>
          <div style={{ flex: 1 }}>
            <span style={S.label}>👖 Celana</span>
            <input style={{ ...S.input, opacity: data.clothesPhotoUrl ? 0.4 : 1 }}
              placeholder="Jeans..." value={data.celana || ''}
              disabled={!!data.clothesPhotoUrl}
              onChange={e => update('celana', e.target.value)} />
          </div>
          <div style={{ width: '80px' }}>
            <span style={S.label}>Warna</span>
            <input style={{ ...S.input, opacity: data.clothesPhotoUrl ? 0.4 : 1 }}
              placeholder="Navy..." value={data.warnaCelana || ''}
              disabled={!!data.clothesPhotoUrl}
              onChange={e => update('warnaCelana', e.target.value)} />
          </div>
        </div>
      </Collapsible>

      {/* Instrument */}
      {showInstrument && (
        <Collapsible title="Instrumen" badge={data.instrumenActive ? 'AKTIF' : 'OFF'} defaultOpen={false}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Tampilkan instrumen</span>
            <Toggle active={data.instrumenActive} onChange={v => update('instrumenActive', v)} />
          </div>
          {data.instrumenActive && (
            <div style={S.row}>
              <div style={{ flex: 1 }}>
                <span style={S.label}>🎸 Jenis Instrumen</span>
                <input style={S.input} placeholder="Gitar elektrik..." value={data.jenisInstrumen || ''} onChange={e => update('jenisInstrumen', e.target.value)} />
              </div>
              <div style={{ width: '80px' }}>
                <span style={S.label}>Warna</span>
                <input style={S.input} placeholder="Sunburst..." value={data.warnaInstrumen || ''} onChange={e => update('warnaInstrumen', e.target.value)} />
              </div>
            </div>
          )}
        </Collapsible>
      )}

      {/* Gear (for vocalist) */}
      {showGear && (
        <Collapsible title="Gear Vokal" badge={data.gearActive ? 'AKTIF' : 'OFF'} defaultOpen={false}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Tampilkan gear vokal</span>
            <Toggle active={data.gearActive} onChange={v => update('gearActive', v)} />
          </div>
          {data.gearActive && (
            <>
              <div style={S.row}>
                <div style={{ flex: 1 }}>
                  <span style={S.label}>🎤 Jenis Mic</span>
                  <input style={S.input} placeholder="Shure SM58..." value={data.jenisMic || ''} onChange={e => update('jenisMic', e.target.value)} />
                </div>
                <div style={{ width: '80px' }}>
                  <span style={S.label}>Warna</span>
                  <input style={S.input} placeholder="Silver..." value={data.warnaMic || ''} onChange={e => update('warnaMic', e.target.value)} />
                </div>
              </div>
              <div style={S.row}>
                <div style={{ flex: 1 }}>
                  <span style={S.label}>📱 Handset</span>
                  <input style={S.input} placeholder="IEM monitor..." value={data.handset || ''} onChange={e => update('handset', e.target.value)} />
                </div>
                <div style={{ width: '80px' }}>
                  <span style={S.label}>Warna</span>
                  <input style={S.input} placeholder="Hitam..." value={data.warnaHandset || ''} onChange={e => update('warnaHandset', e.target.value)} />
                </div>
              </div>
            </>
          )}
        </Collapsible>
      )}
    </div>
  );
}
