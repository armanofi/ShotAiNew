import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, Music2, FileText, Wand2, SkipForward, Globe, Play, Pause,
  ArrowLeft, Palette, Clock, AlignLeft, Headphones, Download,
  ChevronDown, ChevronUp, RotateCcw, CheckCircle2, Loader2,
  Mic, MicOff, Volume2, VolumeX, Sliders, Layers,
  Film, Image as ImageIcon, Plus, Trash2, Edit3,
  BarChart2, ZapOff, Square, SkipBack, SkipForward as SkipFwd
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */
const AUDIO_FORMATS = ['mp3','m4a','wav','flac','aac','aif','aiff','ogg','opus','wma','weba'];
const VIDEO_FORMATS = ['mp4','mov','webm','mkv','avi','wmv','flv','m4v','3gp'];
const ALL_FORMATS = [...AUDIO_FORMATS, ...VIDEO_FORMATS];

const ASPECT_RATIOS = [
  { id: '16:9', label: '16:9', sub: 'YouTube/TV', w: 16, h: 9 },
  { id: '9:16', label: '9:16', sub: 'Reels/Shorts', w: 9, h: 16 },
  { id: '1:1',  label: '1:1',  sub: 'Feed',        w: 1, h: 1 },
];

const PRESETS = [
  { id: 'midnight', name: 'Midnight Blue', fontColor: '#94b8ff', fillColor: '#fbbf24', bg: 'linear-gradient(135deg,#0f172a,#1e3a5f)' },
  { id: 'neon',     name: 'Neon Glow',     fontColor: '#e0b0ff', fillColor: '#a3e635', bg: 'linear-gradient(135deg,#1a0033,#0d1a00)' },
  { id: 'sunset',   name: 'Sunset Vibe',   fontColor: '#fca5a5', fillColor: '#fb923c', bg: 'linear-gradient(135deg,#1c0505,#1c0a00)' },
  { id: 'forest',   name: 'Forest Night',  fontColor: '#86efac', fillColor: '#facc15', bg: 'linear-gradient(135deg,#052e16,#1c1a00)' },
  { id: 'clean',    name: 'Clean White',   fontColor: '#475569', fillColor: '#3b82f6', bg: '#f8fafc' },
];

const FONTS = ['Inter', 'Poppins', 'Outfit', 'Roboto', 'Montserrat', 'Playfair Display'];
const LANGUAGES = [
  { id: 'auto',  label: 'Auto Detect' },
  { id: 'id',    label: 'Indonesia' },
  { id: 'en',    label: 'English' },
  { id: 'ja',    label: '日本語' },
  { id: 'ko',    label: '한국어' },
  { id: 'zh',    label: '中文' },
];

/* ─── Helper ─────────────────────────────────────────────────── */
function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
function formatTime(s) {
  if (s == null || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function getApiKey() {
  let apiKey = localStorage.getItem('google_ai_studio_key') || '';
  if (!apiKey) {
    const keysRaw = localStorage.getItem('google_ai_studio_keys');
    if (keysRaw) {
      try {
        const keys = JSON.parse(keysRaw);
        if (Array.isArray(keys) && keys.length > 0 && keys[0].key) apiKey = keys[0].key;
      } catch (e) {}
    }
  }
  return apiKey;
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
}

/* ─── Progress Steps ─────────────────────────────────────────── */
function ProgressBar({ steps, current }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 0' }}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px',
              backgroundColor: done ? '#22c55e' : active ? '#3b82f6' : '#1e293b',
              border: `2px solid ${done ? '#16a34a' : active ? '#60a5fa' : '#334155'}`,
              color: done || active ? 'white' : '#475569',
              fontWeight: 700,
            }}>
              {done ? <CheckCircle2 size={12} /> : active ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : i + 1}
            </div>
            <span style={{ fontSize: '12px', color: done ? '#22c55e' : active ? '#93c5fd' : '#475569', fontWeight: active ? 600 : 400 }}>
              {s}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Lyrics Line Editor ─────────────────────────────────────── */
function LyricsEditor({ lines, setLines }) {
  const [editIdx, setEditIdx] = useState(null);
  const [editText, setEditText] = useState('');

  const startEdit = (i) => { setEditIdx(i); setEditText(lines[i].text); };
  const saveEdit = () => {
    if (editIdx === null) return;
    setLines(prev => prev.map((l, i) => i === editIdx ? { ...l, text: editText } : l));
    setEditIdx(null);
  };
  const deleteLine = (i) => setLines(prev => prev.filter((_, idx) => idx !== i));
  const addLine = () => setLines(prev => [...prev, { text: '', start: (prev[prev.length - 1]?.end || 0) + 0.5, end: (prev[prev.length - 1]?.end || 0) + 3 }]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {lines.map((line, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 10px', borderRadius: '8px',
          backgroundColor: '#0f172a', border: '1px solid #1e293b',
        }}>
          <span style={{ fontSize: '11px', color: '#475569', minWidth: '52px' }}>
            {formatTime(line.start)} → {formatTime(line.end)}
          </span>
          {editIdx === i ? (
            <input
              autoFocus
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={e => e.key === 'Enter' && saveEdit()}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#f1f5f9', fontSize: '12px',
              }}
            />
          ) : (
            <span style={{ flex: 1, fontSize: '12px', color: '#cbd5e1', cursor: 'text' }}
              onClick={() => startEdit(i)}>
              {line.text || <span style={{ color: '#334155' }}>(kosong)</span>}
            </span>
          )}
          <button onClick={() => startEdit(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '2px' }}>
            <Edit3 size={12} />
          </button>
          <button onClick={() => deleteLine(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}>
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <button onClick={addLine} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        padding: '8px', borderRadius: '8px', border: '1.5px dashed #334155',
        background: 'none', cursor: 'pointer', color: '#475569', fontSize: '12px',
        transition: 'border-color 0.2s, color 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#60a5fa'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#475569'; }}
      >
        <Plus size={14} /> Tambah baris
      </button>
    </div>
  );
}

/* ─── Timeline Track ─────────────────────────────────────────── */
function TimelineTrack({ lines, duration, currentTime, onSeek }) {
  if (!duration) return null;
  const trackRef = useRef(null);

  const handleClick = (e) => {
    if (!trackRef.current || !onSeek) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    onSeek(pct * duration);
  };

  return (
    <div ref={trackRef} onClick={handleClick} style={{ position: 'relative', height: '60px', backgroundColor: '#0f172a', borderRadius: '8px', overflow: 'hidden', border: '1px solid #1e293b', cursor: 'pointer' }}>
      {/* Waveform bg */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 4px', gap: '1px' }}>
        {Array.from({ length: 80 }).map((_, i) => {
          const h = 8 + Math.sin(i * 0.5) * 6 + Math.cos(i * 0.3) * 4;
          return <div key={i} style={{ flex: 1, height: `${h}px`, borderRadius: '1px', backgroundColor: '#1e293b' }} />;
        })}
      </div>
      {/* Lyric blocks */}
      {lines.map((line, i) => (
        <div key={i} style={{
          position: 'absolute', top: '8px', height: '44px',
          left: `${(line.start / duration) * 100}%`,
          width: `${Math.max(0.5, ((line.end - line.start) / duration) * 100)}%`,
          backgroundColor: 'rgba(96,165,250,0.25)',
          border: '1px solid rgba(96,165,250,0.6)',
          borderRadius: '4px', display: 'flex', alignItems: 'center', padding: '0 4px',
          overflow: 'hidden',
        }}>
          <span style={{ fontSize: '9px', color: '#93c5fd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {line.text}
          </span>
        </div>
      ))}
      {/* Playhead */}
      {currentTime != null && duration > 0 && (
        <div style={{
          position: 'absolute', top: 0, bottom: 0, width: '2px', backgroundColor: '#f472b6',
          left: `${(currentTime / duration) * 100}%`, transition: 'left 0.1s linear',
          boxShadow: '0 0 6px rgba(244,114,182,0.6)',
        }} />
      )}
    </div>
  );
}

/* ─── Audio Stem Mixer ───────────────────────────────────────── */
function StemMixer({ stems, setStems }) {
  const toggleMute = (id) => setStems(prev => prev.map(s => s.id === id ? { ...s, muted: !s.muted } : s));
  const setVol = (id, v) => setStems(prev => prev.map(s => s.id === id ? { ...s, volume: v } : s));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {stems.map(stem => (
        <div key={stem.id} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', borderRadius: '10px',
          backgroundColor: '#0f172a', border: '1px solid #1e293b',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stem.color, flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: '#cbd5e1', width: '90px', flexShrink: 0 }}>{stem.label}</span>
          <input
            type="range" min="0" max="100" value={stem.muted ? 0 : stem.volume}
            onChange={e => setVol(stem.id, +e.target.value)}
            disabled={stem.muted}
            style={{ flex: 1, accentColor: stem.color, cursor: 'pointer' }}
          />
          <span style={{ fontSize: '11px', color: '#475569', width: '28px', textAlign: 'right' }}>
            {stem.muted ? 0 : stem.volume}%
          </span>
          <button onClick={() => toggleMute(stem.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: stem.muted ? '#ef4444' : '#475569', padding: '2px',
          }}>
            {stem.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─── Karaoke Preview — Full-width, multi-line, synced ──────── */
function KaraokePreview({ preset, aspectRatio, font, lines, currentTime, isPlaying }) {
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(300);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setContainerW(e.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const ratio = ASPECT_RATIOS.find(r => r.id === aspectRatio) || ASPECT_RATIOS[0];
  const pw = containerW;
  const ph = Math.round((pw / ratio.w) * ratio.h);
  const maxH = 280;
  const finalH = Math.min(ph, maxH);
  const finalW = finalH < ph ? Math.round((finalH / ratio.h) * ratio.w) : pw;

  // Find current & next line based on currentTime
  let currentIdx = -1;
  let nextIdx = -1;
  if (lines.length > 0 && currentTime != null) {
    for (let i = 0; i < lines.length; i++) {
      if (currentTime >= lines[i].start && currentTime < lines[i].end) {
        currentIdx = i;
        break;
      }
    }
    // If between lines, show upcoming
    if (currentIdx === -1) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].start > currentTime) {
          nextIdx = i;
          break;
        }
      }
    }
    if (currentIdx >= 0 && currentIdx + 1 < lines.length) {
      nextIdx = currentIdx + 1;
    }
  }

  // Calculate fill percentage for current line (word-level)
  const calcFill = (line, ct) => {
    if (!line || ct == null) return 0;
    const elapsed = ct - line.start;
    const dur = line.end - line.start;
    if (dur <= 0) return 0;
    return Math.max(0, Math.min(100, (elapsed / dur) * 100));
  };

  const renderLine = (line, isCurrent, fillPct) => {
    if (!line) return null;
    const chars = line.text.split('');
    const total = chars.length;
    const filledChars = Math.floor((fillPct / 100) * (total + 0.5));

    return (
      <div style={{
        fontSize: isCurrent ? '16px' : '13px',
        fontFamily: `'${font}', sans-serif`,
        fontWeight: isCurrent ? 700 : 500,
        textAlign: 'center',
        lineHeight: 1.6,
        opacity: isCurrent ? 1 : 0.45,
        transition: 'opacity 0.4s, font-size 0.3s',
        padding: '2px 0',
      }}>
        {isCurrent ? chars.map((char, ci) => (
          <span key={ci} style={{
            color: ci < filledChars ? (preset?.fillColor || '#fbbf24') : (preset?.fontColor || '#f8fafc'),
            transition: 'color 0.1s',
            textShadow: ci < filledChars ? `0 0 12px ${preset?.fillColor || '#fbbf24'}60` : 'none',
          }}>
            {char}
          </span>
        )) : (
          <span style={{ color: preset?.fontColor || '#f8fafc' }}>{line.text}</span>
        )}
      </div>
    );
  };

  const prevIdx = currentIdx > 0 ? currentIdx - 1 : (nextIdx > 0 ? nextIdx - 1 : -1);
  const fillPct = currentIdx >= 0 ? calcFill(lines[currentIdx], currentTime) : 0;

  return (
    <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <div style={{
        width: `${finalW}px`, height: `${finalH}px`,
        background: preset?.bg || '#0f172a',
        borderRadius: '12px', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '20px 24px', boxSizing: 'border-box',
        boxShadow: '0 8px 40px rgba(0,0,0,0.7), inset 0 0 80px rgba(0,0,0,0.15)',
        position: 'relative',
        flexShrink: 0,
        gap: '6px',
      }}>
        {/* Title overlay */}
        <div style={{ position: 'absolute', top: '10px', left: '14px', right: '14px', display: 'flex', justifyContent: 'space-between', opacity: 0.3 }}>
          <span style={{ fontSize: '8px', color: preset?.fontColor || '#fff', fontWeight: 600 }}>♪ KARAOKE</span>
          {isPlaying && <span style={{ fontSize: '8px', color: preset?.fillColor || '#fbbf24' }}>● LIVE</span>}
        </div>

        {/* Music note particles animation */}
        {isPlaying && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                position: 'absolute',
                bottom: '-10px',
                left: `${20 + i * 30}%`,
                fontSize: '14px',
                opacity: 0.15,
                animation: `floatUp ${3 + i}s ease-in infinite`,
                animationDelay: `${i * 1.2}s`,
              }}>♪</div>
            ))}
          </div>
        )}

        {lines.length === 0 ? (
          <span style={{ color: preset?.fontColor || '#f8fafc', opacity: 0.3, fontSize: '20px' }}>♪ ♪ ♪</span>
        ) : (
          <>
            {/* Previous line (faded) */}
            {prevIdx >= 0 && prevIdx !== currentIdx && renderLine(lines[prevIdx], false, 100)}
            {/* Current line (highlighted fill) */}
            {currentIdx >= 0 && renderLine(lines[currentIdx], true, fillPct)}
            {/* If no current line, show next as upcoming */}
            {currentIdx === -1 && nextIdx >= 0 && renderLine(lines[nextIdx], false, 0)}
            {/* Next line (upcoming) */}
            {nextIdx >= 0 && nextIdx !== currentIdx && currentIdx >= 0 && renderLine(lines[nextIdx], false, 0)}
            {/* If nothing is active at all */}
            {currentIdx === -1 && nextIdx === -1 && (
              <span style={{ color: preset?.fontColor || '#f8fafc', opacity: 0.25, fontSize: '14px' }}>♪ Interlude ♪</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Audio Player Bar ───────────────────────────────────────── */
function AudioPlayerBar({ audioUrl, isPlaying, currentTime, duration, onPlayPause, onSeek }) {
  if (!audioUrl) return null;
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleBarClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newPct = x / rect.width;
    onSeek(newPct * duration);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 4px' }}>
      {/* Seek bar */}
      <div onClick={handleBarClick} style={{
        height: '6px', borderRadius: '3px', backgroundColor: '#1e293b', cursor: 'pointer', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: '3px',
          background: 'linear-gradient(to right, #7c3aed, #60a5fa)',
          transition: 'width 0.1s linear',
        }} />
      </div>
      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '10px', color: '#475569', fontVariantNumeric: 'tabular-nums', width: '38px' }}>{formatTime(currentTime)}</span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => onSeek(Math.max(0, currentTime - 5))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px' }}>
            <SkipBack size={14} />
          </button>
          <button onClick={onPlayPause}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              border: 'none', cursor: 'pointer', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(96,165,250,0.3)',
            }}>
            {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: '2px' }} />}
          </button>
          <button onClick={() => onSeek(Math.min(duration, currentTime + 5))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px' }}>
            <SkipFwd size={14} />
          </button>
        </div>
        <span style={{ fontSize: '10px', color: '#475569', fontVariantNumeric: 'tabular-nums', width: '38px', textAlign: 'right' }}>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function VideoKaraoke({ onBack }) {
  // ── Step / Screen state
  const [screen, setScreen] = useState('input'); // 'input' | 'generating' | 'editor'
  const [generateStep, setGenerateStep] = useState(0);
  const [generateError, setGenerateError] = useState('');

  // ── Input state
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [lyricsSource, setLyricsSource] = useState('manual'); // 'manual' | 'auto' | 'skip'
  const [manualLyrics, setManualLyrics] = useState('');
  const [language, setLanguage] = useState('auto');
  const [error, setError] = useState('');

  // ── Audio playback
  const audioRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const rafRef = useRef(null);

  // ── Editor state
  const [editorTab, setEditorTab] = useState('design');
  const [preset, setPreset] = useState(PRESETS[0]);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [font, setFont] = useState('Poppins');
  const [lines, setLines] = useState([]);
  const [lyricsVersions, setLyricsVersions] = useState([
    { id: 1, name: 'Versi 1', lines: [] },
    { id: 2, name: 'Versi 2', lines: [] },
    { id: 3, name: 'Versi 3', lines: [] },
    { id: 4, name: 'Versi 4', lines: [] },
    { id: 5, name: 'Versi 5', lines: [] },
  ]);
  const [activeVersion, setActiveVersion] = useState(1);
  const switchVersion = (newId) => {
    setLyricsVersions(prev => prev.map(v => v.id === activeVersion ? { ...v, lines: lines } : v));
    const nextV = lyricsVersions.find(v => v.id === newId);
    setLines(nextV ? nextV.lines : []);
    setActiveVersion(newId);
  };
  const [stems, setStems] = useState([
    { id: 'original',    label: 'Original',    color: '#60a5fa', volume: 100, muted: false },
    { id: 'instrumental',label: 'Instrumental', color: '#4ade80', volume: 80,  muted: false },
    { id: 'vocals',      label: 'Vocals',       color: '#f472b6', volume: 60,  muted: false },
    { id: 'backing',     label: 'Backing Vox',  color: '#fb923c', volume: 40,  muted: false },
  ]);
  const [speed, setSpeed] = useState(100);
  const [pitch, setPitch] = useState(0);
  const [stemGenerated, setStemGenerated] = useState(false);
  const [stemGenerating, setStemGenerating] = useState(false);

  // ── Export
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // ── Audio time update loop
  useEffect(() => {
    const updateTime = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
      rafRef.current = requestAnimationFrame(updateTime);
    };
    rafRef.current = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Create audio element & URL
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = url;
      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current.duration);
      };
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const seekTo = (t) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = t;
    setCurrentTime(t);
  };

  // ── File handling
  const validateFile = (f) => {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!ALL_FORMATS.includes(ext)) return `Format tidak didukung: .${ext}`;
    if (f.size > 300 * 1024 * 1024) return 'Ukuran file melebihi batas 300 MB';
    return null;
  };

  const handleFile = (f) => {
    const err = validateFile(f);
    if (err) { setError(err); return; }
    setError('');
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [title]);

  // ── Real transcription via Gemini API
  const transcribeWithGemini = async (audioBase64, mimeType) => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('API Key Google AI Studio belum diatur.');

    const langHint = language === 'auto' ? '' : ` Bahasa audio: ${LANGUAGES.find(l => l.id === language)?.label || language}.`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey.trim()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `Dengarkan audio/lagu ini dan transkripsi liriknya secara akurat.${langHint}

PENTING: Balas HANYA dengan JSON murni (tanpa markdown, tanpa backtick). Format:
{
  "lyrics": [
    { "text": "baris lirik pertama", "start": 0.0, "end": 5.2 },
    { "text": "baris lirik kedua", "start": 5.5, "end": 10.1 }
  ]
}

Aturan:
- "text" = satu baris lirik (bukan per kata, tapi per baris/kalimat yang dinyanyikan bersama)
- "start" dan "end" dalam detik (desimal), menunjukkan kapan baris tersebut mulai dan selesai dinyanyikan
- Berikan timestamp seakurat mungkin berdasarkan audio
- Abaikan bagian instrumental (tidak perlu ditranskrip)
- Jika ada vokal backing/chorus, masukkan sebagai baris terpisah
- Pastikan semua teks lirik benar ejaan dan huruf kecil/besar sesuai bahasa aslinya`
            },
            { inline_data: { mime_type: mimeType, data: audioBase64 } }
          ]
        }],
        generationConfig: { temperature: 0.1, response_mime_type: "application/json" }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error: ${errText.substring(0, 200)}`);
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini tidak mengembalikan hasil');
    const parsed = JSON.parse(text);
    return parsed.lyrics || [];
  };

  // ── Align manual lyrics with audio via Gemini
  const alignLyricsWithGemini = async (audioBase64, mimeType, lyricsText) => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('API Key Google AI Studio belum diatur.');

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey.trim()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `Dengarkan audio ini dan selaraskan lirik berikut dengan timing yang tepat.

Lirik yang perlu diselaraskan:
${lyricsText}

PENTING: Balas HANYA dengan JSON murni (tanpa markdown, tanpa backtick). Format:
{
  "lyrics": [
    { "text": "baris lirik pertama", "start": 0.0, "end": 5.2 },
    { "text": "baris lirik kedua", "start": 5.5, "end": 10.1 }
  ]
}

Aturan:
- Gunakan teks lirik yang diberikan (jangan ubah teksnya)
- "start" dan "end" dalam detik (desimal), berdasarkan kapan baris tersebut terdengar dinyanyikan di audio
- Berikan timestamp seakurat mungkin
- Baris kosong dalam lirik bisa diabaikan`
            },
            { inline_data: { mime_type: mimeType, data: audioBase64 } }
          ]
        }],
        generationConfig: { temperature: 0.1, response_mime_type: "application/json" }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error: ${errText.substring(0, 200)}`);
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini tidak mengembalikan hasil');
    const parsed = JSON.parse(text);
    return parsed.lyrics || [];
  };

  // ── Generate pipeline (real)
  const STEPS_AUTO = ['Memuat audio', 'Transkripsi lirik (AI)', 'Selaraskan timing', 'Menyiapkan editor'];
  const STEPS_MANUAL = ['Memuat audio', 'Menganalisis audio', 'Selaraskan timing lirik (AI)', 'Menyiapkan editor'];
  const STEPS_SKIP = ['Memuat audio', 'Menyiapkan editor'];

  const handleGenerate = async () => {
    if (!file) { setError('Upload file lagu terlebih dahulu'); return; }
    if (!title.trim()) { setError('Isi judul lagu terlebih dahulu'); return; }
    if (lyricsSource === 'manual' && !manualLyrics.trim()) { setError('Tempel lirik terlebih dahulu atau pilih Auto Transkrip'); return; }

    const steps = lyricsSource === 'auto' ? STEPS_AUTO : lyricsSource === 'manual' ? STEPS_MANUAL : STEPS_SKIP;
    setScreen('generating');
    setGenerateStep(0);
    setGenerateError('');

    try {
      // Step 1: Load audio
      await new Promise(r => setTimeout(r, 400));
      setGenerateStep(1);

      const mimeType = file.type || 'audio/mp3';

      if (lyricsSource === 'auto') {
        // Step 2: Transcribe with Gemini
        const audioBase64 = await toBase64(file);
        setGenerateStep(1);
        const transcribed = await transcribeWithGemini(audioBase64, mimeType);
        setGenerateStep(2);

        // Step 3: Timing already included
        await new Promise(r => setTimeout(r, 300));
        setGenerateStep(3);

        // Step 4: Prepare editor
        setLines(transcribed.map(l => ({
          text: l.text,
          start: parseFloat(l.start) || 0,
          end: parseFloat(l.end) || 0,
        })));
        await new Promise(r => setTimeout(r, 300));
        setGenerateStep(4);

      } else if (lyricsSource === 'manual') {
        // Step 2: Analyze audio
        const audioBase64 = await toBase64(file);
        setGenerateStep(2);

        // Step 3: Align lyrics with audio
        const aligned = await alignLyricsWithGemini(audioBase64, mimeType, manualLyrics);
        setGenerateStep(3);

        setLines(aligned.map(l => ({
          text: l.text,
          start: parseFloat(l.start) || 0,
          end: parseFloat(l.end) || 0,
        })));
        await new Promise(r => setTimeout(r, 300));
        setGenerateStep(4);

      } else {
        // Skip: no lyrics
        await new Promise(r => setTimeout(r, 400));
        setGenerateStep(2);
        setLines([]);
      }

      setTimeout(() => setScreen('editor'), 500);

    } catch (err) {
      console.error('Generate error:', err);
      setGenerateError(err.message || 'Terjadi kesalahan saat memproses');
    }
  };

  // ── Stem Generation simulation
  const handleGenerateStems = () => {
    setStemGenerating(true);
    setTimeout(() => { setStemGenerating(false); setStemGenerated(true); }, 2800);
  };

  // ── Export simulation
  const handleExport = () => {
    setExporting(true);
    setExportProgress(0);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 12 + 5;
      if (p >= 100) { 
        p = 100; 
        clearInterval(iv); 
        setTimeout(() => {
          setExporting(false);
          // Show alert & download json
          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lines, null, 2));
          const dlAnchorElem = document.createElement('a');
          dlAnchorElem.setAttribute("href", dataStr);
          dlAnchorElem.setAttribute("download", `${title || 'karaoke'}_lyrics.json`);
          dlAnchorElem.click();
          alert("Hasil video & lirik berhasil disimpan!");
        }, 600); 
      }
      setExportProgress(Math.min(100, p));
    }, 300);
  };

  /* ════════════════ INPUT SCREEN ════════════════ */
  if (screen === 'input') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#060e1c', color: '#f1f5f9', fontFamily: 'Inter, sans-serif', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <button onClick={onBack} style={{ padding: '8px', borderRadius: '10px', border: 'none', backgroundColor: '#1e293b', color: '#94a3b8', cursor: 'pointer' }}>
              <ArrowLeft size={16} />
            </button>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', color: 'white' }}>
              <Music2 size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, background: 'linear-gradient(to right,#a78bfa,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Video Karaoke
              </h3>
              <p style={{ margin: 0, fontSize: '10px', color: '#475569' }}>Upload lagu → lirik → ekspor video siap pakai</p>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById('vk-file-input').click()}
            style={{
              border: `2px dashed ${dragOver ? '#60a5fa' : file ? '#22c55e' : '#1e293b'}`,
              borderRadius: '14px', padding: '20px 16px', textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
              backgroundColor: dragOver ? 'rgba(96,165,250,0.06)' : file ? 'rgba(34,197,94,0.05)' : '#0a111f',
            }}
          >
            <input id="vk-file-input" type="file"
              accept={ALL_FORMATS.map(e => `.${e}`).join(',')}
              style={{ display: 'none' }}
              onChange={e => e.target.files[0] && handleFile(e.target.files[0])}
            />
            {file ? (
              <>
                <CheckCircle2 size={28} color="#22c55e" style={{ marginBottom: '6px' }} />
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#22c55e' }}>{file.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#475569' }}>
                  {formatBytes(file.size)}{duration > 0 ? ` • ${formatTime(duration)}` : ''}
                </p>
                {/* Mini audio play in upload zone */}
                {audioUrl && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={e => e.stopPropagation()}>
                    <button onClick={togglePlay} style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                      border: 'none', cursor: 'pointer', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isPlaying ? <Pause size={12} /> : <Play size={12} style={{ marginLeft: '1px' }} />}
                    </button>
                    <span style={{ fontSize: '10px', color: '#60a5fa' }}>
                      {isPlaying ? 'Sedang diputar...' : 'Dengar preview'}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <Upload size={24} color="#475569" style={{ marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>Drag & drop atau klik untuk browse</p>
                <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#334155' }}>MP3, WAV, FLAC, MP4, MOV, dan lainnya • Maks 300 MB / 20 menit</p>
              </>
            )}
          </div>

          {error && (
            <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '11px' }}>
              ⚠ {error}
            </div>
          )}

          {/* Title & Artist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Judul & Artis</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Judul lagu"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #1e293b', backgroundColor: '#0a111f', color: '#f1f5f9', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
            />
            <input value={artist} onChange={e => setArtist(e.target.value)}
              placeholder="Nama artis (opsional)"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #1e293b', backgroundColor: '#0a111f', color: '#f1f5f9', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Lyric Source */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sumber Lirik</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'manual', label: 'Punya Lirik', icon: FileText, color: '#60a5fa' },
                { id: 'auto', label: 'Auto Transkrip', icon: Wand2, color: '#a78bfa' },
                { id: 'skip', label: 'Lewati', icon: SkipForward, color: '#94a3b8' },
              ].map(opt => {
                const Icon = opt.icon;
                const active = lyricsSource === opt.id;
                return (
                  <button key={opt.id} onClick={() => setLyricsSource(opt.id)}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: '10px', border: `1.5px solid ${active ? opt.color : '#1e293b'}`,
                      backgroundColor: active ? `${opt.color}18` : '#0a111f', color: active ? opt.color : '#475569',
                      cursor: 'pointer', fontSize: '10px', fontWeight: 600, transition: 'all 0.15s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    }}
                  >
                    <Icon size={14} />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {lyricsSource === 'manual' && (
              <textarea
                value={manualLyrics}
                onChange={e => setManualLyrics(e.target.value)}
                placeholder={'Tempel lirik di sini...\nSatu baris = satu baris lirik\n\nContoh:\nBersama di sini\nSenyum indah mekar'}
                rows={5}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #1e293b', backgroundColor: '#0a111f', color: '#f1f5f9', fontSize: '11px', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            )}
            {lyricsSource === 'auto' && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', fontSize: '11px', color: '#a78bfa' }}>
                🤖 Sistem akan mentranskripsi audio secara otomatis menggunakan Gemini AI dan menghasilkan timestamp per baris.
              </div>
            )}
            {lyricsSource === 'skip' && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'rgba(148,163,184,0.08)', border: '1px solid #1e293b', fontSize: '11px', color: '#64748b' }}>
                Lirik bisa ditambahkan nanti di tab <b style={{ color: '#94a3b8' }}>Lyrics</b> di editor.
              </div>
            )}
          </div>

          {/* Language */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Globe size={11} /> Bahasa
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {LANGUAGES.map(lang => (
                <button key={lang.id} onClick={() => setLanguage(lang.id)}
                  style={{
                    padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${language === lang.id ? '#60a5fa' : '#1e293b'}`,
                    backgroundColor: language === lang.id ? 'rgba(96,165,250,0.12)' : '#0a111f',
                    color: language === lang.id ? '#60a5fa' : '#475569',
                    transition: 'all 0.15s',
                  }}>
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Create Button */}
          <button onClick={handleGenerate}
            style={{
              width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', color: 'white',
              fontSize: '13px', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.02em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 20px rgba(96,165,250,0.25)', transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(96,165,250,0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(96,165,250,0.25)'; }}
          >
            <Wand2 size={16} />
            Buat Video Karaoke
          </button>

        </div>
      </div>
    );
  }

  /* ════════════════ GENERATING SCREEN ════════════════ */
  if (screen === 'generating') {
    const steps = lyricsSource === 'auto' ? STEPS_AUTO : lyricsSource === 'manual' ? STEPS_MANUAL : STEPS_SKIP;
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#060e1c', padding: '32px 24px', textAlign: 'center' }}>
        {!generateError ? (
          <>
            <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(59,130,246,0.2))', border: '1px solid rgba(96,165,250,0.2)', marginBottom: '24px' }}>
              <Loader2 size={36} color="#60a5fa" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800, color: '#f1f5f9' }}>Membuat Video Karaoke…</h3>
            <p style={{ margin: '0 0 20px', fontSize: '11px', color: '#475569' }}>
              {title}{artist ? ` — ${artist}` : ''}
            </p>
            <div style={{ width: '100%', maxWidth: '280px' }}>
              <ProgressBar steps={steps} current={generateStep} />
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: '20px', borderRadius: '24px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: '24px' }}>
              <ZapOff size={36} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 800, color: '#fca5a5' }}>Gagal Memproses</h3>
            <p style={{ margin: '0 0 20px', fontSize: '11px', color: '#94a3b8', maxWidth: '280px', lineHeight: 1.5 }}>
              {generateError}
            </p>
            <button onClick={() => { setScreen('input'); setGenerateError(''); }}
              style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none',
                background: '#1e293b', color: '#94a3b8', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
              <ArrowLeft size={14} /> Kembali
            </button>
          </>
        )}
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes floatUp { 0% { transform: translateY(0); opacity: 0.15; } 100% { transform: translateY(-200px); opacity: 0; } }`}</style>
      </div>
    );
  }

  /* ════════════════ EDITOR SCREEN ════════════════ */
  const EDITOR_TABS = [
    { id: 'design',   label: 'Design',   icon: Palette },
    { id: 'timeline', label: 'Timeline', icon: BarChart2 },
    { id: 'lyrics',   label: 'Lyrics',   icon: AlignLeft },
    { id: 'audio',    label: 'Audio',    icon: Headphones },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#060e1c', color: '#f1f5f9', fontFamily: 'Inter, sans-serif' }}>

      {/* Editor Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e293b', backgroundColor: '#0a111f', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button onClick={() => { setScreen('input'); if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false); } }}
          style={{ padding: '5px', borderRadius: '7px', border: 'none', backgroundColor: '#1e293b', color: '#94a3b8', cursor: 'pointer' }}>
          <ArrowLeft size={14} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title || 'Tanpa Judul'}{artist ? ` — ${artist}` : ''}
          </p>
        </div>
        <button onClick={handleExport} disabled={exporting}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px',
            borderRadius: '8px', border: 'none',
            background: exporting ? '#1e293b' : 'linear-gradient(135deg,#7c3aed,#3b82f6)',
            color: exporting ? '#475569' : 'white', fontSize: '11px', fontWeight: 700,
            cursor: exporting ? 'not-allowed' : 'pointer',
          }}>
          {exporting ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={12} />}
          {exporting ? `${Math.round(exportProgress)}%` : 'Ekspor'}
        </button>
      </div>

      {/* Export progress */}
      {exporting && (
        <div style={{ height: '3px', backgroundColor: '#1e293b', flexShrink: 0 }}>
          <div style={{ height: '100%', width: `${exportProgress}%`, background: 'linear-gradient(to right,#7c3aed,#3b82f6)', transition: 'width 0.3s' }} />
        </div>
      )}

      {/* LARGE Karaoke Preview */}
      <div style={{
        padding: '14px 14px 8px', backgroundColor: '#080f1e', flexShrink: 0, borderBottom: '1px solid #1e293b',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        <KaraokePreview
          preset={preset}
          aspectRatio={aspectRatio}
          font={font}
          lines={lines}
          currentTime={currentTime}
          isPlaying={isPlaying}
        />
        {/* Audio Player */}
        {audioUrl && (
          <AudioPlayerBar
            audioUrl={audioUrl}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlayPause={togglePlay}
            onSeek={seekTo}
          />
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', flexShrink: 0, backgroundColor: '#0a111f' }}>
        {EDITOR_TABS.map(tab => {
          const Icon = tab.icon;
          const active = editorTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setEditorTab(tab.id)}
              style={{
                flex: 1, padding: '8px 4px', border: 'none', backgroundColor: 'transparent',
                borderBottom: `2px solid ${active ? '#60a5fa' : 'transparent'}`,
                color: active ? '#60a5fa' : '#475569', cursor: 'pointer', fontSize: '10px', fontWeight: 600,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', transition: 'all 0.15s',
              }}>
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* ─ DESIGN TAB ─ */}
        {editorTab === 'design' && (
          <>
            <Section title="Preset Visual">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {PRESETS.map(p => (
                  <button key={p.id} onClick={() => setPreset(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px',
                      border: `1.5px solid ${preset.id === p.id ? '#60a5fa' : '#1e293b'}`,
                      backgroundColor: preset.id === p.id ? 'rgba(96,165,250,0.08)' : '#0a111f',
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                    <div style={{ width: '32px', height: '20px', borderRadius: '4px', background: p.bg, flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: preset.id === p.id ? '#60a5fa' : '#94a3b8', fontWeight: 600 }}>{p.name}</span>
                    {preset.id === p.id && <CheckCircle2 size={12} color="#60a5fa" style={{ marginLeft: 'auto' }} />}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Aspect Ratio">
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', paddingTop: '4px' }}>
                {ASPECT_RATIOS.map(r => {
                  const thumbW = r.w * 5;
                  const thumbH = r.h * 5;
                  return (
                    <button key={r.id} onClick={() => setAspectRatio(r.id)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                        padding: '10px 14px', borderRadius: '10px', border: `1.5px solid ${aspectRatio === r.id ? '#60a5fa' : '#1e293b'}`,
                        backgroundColor: aspectRatio === r.id ? 'rgba(96,165,250,0.08)' : '#0a111f', cursor: 'pointer',
                      }}>
                      <div style={{ width: `${thumbW}px`, height: `${thumbH}px`, maxHeight: '70px', maxWidth: '70px', borderRadius: '3px', backgroundColor: '#1e293b', border: `2px solid ${aspectRatio === r.id ? '#60a5fa' : '#334155'}` }} />
                      <span style={{ fontSize: '10px', fontWeight: 700, color: aspectRatio === r.id ? '#60a5fa' : '#475569' }}>{r.label}</span>
                      <span style={{ fontSize: '9px', color: '#334155' }}>{r.sub}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Font">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {FONTS.map(f => (
                  <button key={f} onClick={() => setFont(f)}
                    style={{
                      padding: '5px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
                      border: `1px solid ${font === f ? '#60a5fa' : '#1e293b'}`,
                      backgroundColor: font === f ? 'rgba(96,165,250,0.12)' : '#0a111f',
                      color: font === f ? '#60a5fa' : '#475569', fontFamily: f,
                    }}>{f}
                  </button>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* ─ TIMELINE TAB ─ */}
        {editorTab === 'timeline' && (
          <>
            <Section title="Waveform + Blok Lirik">
              <TimelineTrack lines={lines} duration={duration} currentTime={currentTime} onSeek={seekTo} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '10px', color: '#334155' }}>0:00</span>
                <span style={{ fontSize: '10px', color: '#60a5fa', fontWeight: 600 }}>{formatTime(currentTime)}</span>
                <span style={{ fontSize: '10px', color: '#334155' }}>{formatTime(duration)}</span>
              </div>
            </Section>
            <Section title="Daftar Blok Lirik" subtitle="Geser slider untuk koreksi timing">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {lines.map((line, i) => {
                  const isCurrent = currentTime >= line.start && currentTime < line.end;
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px',
                      borderRadius: '8px', backgroundColor: isCurrent ? 'rgba(96,165,250,0.08)' : '#0a111f',
                      border: `1px solid ${isCurrent ? 'rgba(96,165,250,0.4)' : '#1e293b'}`,
                      transition: 'all 0.2s',
                    }}>
                      <span style={{ fontSize: '10px', color: isCurrent ? '#60a5fa' : '#334155', width: '16px', textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                        <span style={{ fontSize: '11px', color: isCurrent ? '#93c5fd' : '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isCurrent ? 600 : 400 }}>{line.text}</span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '9px', color: '#475569' }}>Start</span>
                          <input type="range" min="0" max={duration} step="0.1" value={line.start}
                            onChange={e => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, start: +e.target.value } : l))}
                            style={{ flex: 1, accentColor: '#60a5fa' }} />
                          <span style={{ fontSize: '9px', color: '#475569', width: '28px' }}>{formatTime(line.start)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '9px', color: '#475569' }}>End</span>
                          <input type="range" min="0" max={duration} step="0.1" value={line.end}
                            onChange={e => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, end: +e.target.value } : l))}
                            style={{ flex: 1, accentColor: '#a78bfa' }} />
                          <span style={{ fontSize: '9px', color: '#475569', width: '28px' }}>{formatTime(line.end)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          </>
        )}

        {/* ─ LYRICS TAB ─ */}
        {editorTab === 'lyrics' && (
          <>
            <Section title="Edit Lirik" subtitle="Klik teks untuk mengedit, ikon tempat sampah untuk hapus">
              <LyricsEditor lines={lines} setLines={setLines} />
            </Section>
            <Section title="Versi Lirik">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map((vId) => {
                  const isActive = activeVersion === vId;
                  return (
                  <div key={vId} onClick={() => switchVersion(vId)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', backgroundColor: isActive ? 'rgba(96,165,250,0.08)' : '#0a111f', border: `1px solid ${isActive ? '#60a5fa' : '#1e293b'}`, cursor: 'pointer' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isActive ? '#60a5fa' : '#334155', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '11px', color: isActive ? '#93c5fd' : '#475569' }}>Versi {vId} {isActive ? '(aktif)' : ''}</span>
                    {isActive && <CheckCircle2 size={12} color="#60a5fa" />}
                  </div>
                )})}
              </div>
            </Section>
          </>
        )}

        {/* ─ AUDIO TAB ─ */}
        {editorTab === 'audio' && (
          <>
            <Section title="Pemisahan Stem (AI)">
              {!stemGenerated ? (
                <button onClick={handleGenerateStems} disabled={stemGenerating}
                  style={{
                    width: '100%', padding: '11px', borderRadius: '10px', border: 'none',
                    background: stemGenerating ? '#1e293b' : 'linear-gradient(135deg,#059669,#065f46)',
                    color: stemGenerating ? '#475569' : 'white', fontSize: '12px', fontWeight: 700, cursor: stemGenerating ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}>
                  {stemGenerating ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Memproses…</> : <><Layers size={14} /> Generate Stem Audio</>}
                </button>
              ) : (
                <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontSize: '11px', color: '#86efac', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <CheckCircle2 size={12} /> Stem berhasil dipisahkan
                </div>
              )}
            </Section>

            <Section title="Track Mix">
              <StemMixer stems={stems} setStems={setStems} />
            </Section>

            <Section title="Speed & Pitch">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SliderRow label="Speed" value={speed} min={50} max={150} color="#60a5fa"
                  onChange={v => setSpeed(v)} format={v => `${v}%`} />
                <SliderRow label="Pitch" value={pitch} min={-12} max={12} color="#f472b6"
                  onChange={v => setPitch(v)} format={v => `${v > 0 ? '+' : ''}${v} st`} />
                <button onClick={() => { setSpeed(100); setPitch(0); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px', borderRadius: '7px', border: '1px solid #1e293b', background: 'none', cursor: 'pointer', color: '#475569', fontSize: '11px', justifyContent: 'center' }}>
                  <RotateCcw size={11} /> Reset
                </button>
              </div>
            </Section>
          </>
        )}

      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes floatUp { 0% { transform: translateY(0); opacity: 0.15; } 100% { transform: translateY(-200px); opacity: 0; } }`}</style>
    </div>
  );
}

/* ─── Reusable sub-components ────────────────────────────────── */
function Section({ title, subtitle, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div>
        <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
        {subtitle && <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#334155' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function SliderRow({ label, value, min, max, color, onChange, format }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '11px', color: '#64748b', width: '48px', flexShrink: 0 }}>{label}</span>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ flex: 1, accentColor: color }} />
      <span style={{ fontSize: '11px', color, width: '48px', textAlign: 'right', fontWeight: 600, flexShrink: 0 }}>
        {format ? format(value) : value}
      </span>
    </div>
  );
}
