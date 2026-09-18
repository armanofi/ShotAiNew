import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, Upload, Plus, Trash2, Play, Pause, Disc3, 
  Sparkles, Check, Copy, Download, Film, FolderOpen, 
  RotateCcw, AlertCircle, Clock, Music2, Image as ImageIcon,
  Sliders, Layers, Eye, CheckCircle2, X, Zap, Crown,
  ListMusic, Flame, Wind, Activity, Wand2, Bot, Key, RefreshCw,
  FileText, Radio, Video, SlidersHorizontal, CheckSquare,
  Volume2, VolumeX, SkipForward, SkipBack, MonitorPlay, Maximize2,
  ArrowUp, ArrowDown, List, Columns, Edit3, MoveVertical, MoveHorizontal, Palette
} from 'lucide-react';

const VISUALIZER_TYPES_LIST = [
  { 
    id: 'neon_waveform', 
    name: 'Neon Waveform', 
    desc: 'Garis gelombang glowing kontinyu sleek', 
    badge: 'Line Glow',
    icon: Activity,
    color: '#00d8b6'
  },
  { 
    id: 'eq_bars', 
    name: 'Dynamic EQ Bars', 
    desc: 'Batang equalizer spektrum melompat dinamis', 
    badge: 'EQ Spectrum',
    icon: Sliders,
    color: '#38bdf8'
  },
  { 
    id: 'spectrogram', 
    name: 'Cinematic Spectrogram', 
    desc: 'Spektrum heat-map warna magma mengalir', 
    badge: 'Heatmap',
    icon: Flame,
    color: '#f97316'
  },
  { 
    id: 'musical_matrix', 
    name: 'Musical Matrix', 
    desc: 'Matriks nada musik Constant-Q transform', 
    badge: 'Matrix CQT',
    icon: Radio,
    color: '#a855f7'
  },
  { 
    id: 'lissajous', 
    name: 'Abstract Lissajous', 
    desc: 'Pola laser vektor stereo phase oscilloscope', 
    badge: 'Laser Phase',
    icon: Disc3,
    color: '#fbbf24'
  }
];

const VINYL_MODELS_LIST = [
  {
    id: 'classic',
    name: 'Classic Vinyl',
    badge: 'Vintage 70s',
    desc: 'Piringan hitam klasik dengan square sleeve cover retro',
    accent: '#00d8b6',
    borderClass: 'border-white/15',
    bgClass: 'bg-black/85',
    vinylGradient: 'radial-gradient(circle at center, #2a2a2e 0%, #111114 40%, #08080a 65%, #1f1f23 90%, #000000 100%)',
    badgeClass: 'bg-[#00d8b6]/20 text-[#00d8b6] border-[#00d8b6]/40',
    titleColor: 'text-white',
    artistColor: 'text-zinc-400',
    hasTonearm: false
  },
  {
    id: 'neon',
    name: 'Cyberpunk Neon',
    badge: 'Neon Glow',
    desc: 'Rim piringan glowing cyan/magenta, glass sleeve & HUD digital',
    accent: '#ec4899',
    borderClass: 'border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.25)]',
    bgClass: 'bg-[#0f0717]/90 backdrop-blur-xl',
    vinylGradient: 'radial-gradient(circle at center, #3b0764 0%, #180329 45%, #05000a 75%, #ec4899 98%, #00d8b6 100%)',
    badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    titleColor: 'text-pink-100',
    artistColor: 'text-pink-300/70',
    hasTonearm: false
  },
  {
    id: 'minimal',
    name: 'Minimalist Arm',
    badge: 'Modern Arm',
    desc: 'Piringan mengambang dengan jarum pemutar metalik & font Swiss',
    accent: '#38bdf8',
    borderClass: 'border-sky-500/30',
    bgClass: 'bg-zinc-950/85 backdrop-blur-md',
    vinylGradient: 'radial-gradient(circle at center, #38bdf8 0%, #0f172a 35%, #020617 75%, #1e293b 95%, #000000 100%)',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    titleColor: 'text-white',
    artistColor: 'text-sky-200/70',
    hasTonearm: true
  },
  {
    id: 'gold',
    name: 'Golden Luxury',
    badge: 'Gold VIP',
    desc: 'Piringan emas berkilau mewah, bingkai obsidian filigree emas',
    accent: '#fbbf24',
    borderClass: 'border-amber-400/40 shadow-[0_0_15px_rgba(251,191,36,0.2)]',
    bgClass: 'bg-[#181206]/92 backdrop-blur-md',
    vinylGradient: 'radial-gradient(circle at center, #fde047 0%, #ca8a04 40%, #78350f 75%, #fbbf24 95%, #451a03 100%)',
    badgeClass: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
    titleColor: 'text-amber-100 font-serif',
    artistColor: 'text-amber-300/70',
    hasTonearm: false
  },
  {
    id: 'vintage',
    name: 'Vintage Wood',
    badge: 'Analog Walnut',
    desc: 'Alas kayu mahogany walnut hangat, dial analog & label retro',
    accent: '#f97316',
    borderClass: 'border-amber-700/50',
    bgClass: 'bg-[#1c120c]/92 backdrop-blur-md',
    vinylGradient: 'radial-gradient(circle at center, #fdba74 0%, #9a3412 40%, #431407 70%, #7c2d12 92%, #180903 100%)',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    titleColor: 'text-orange-100',
    artistColor: 'text-orange-200/60',
    hasTonearm: true
  },
  {
    id: 'hologram',
    name: 'Hologram Glass',
    badge: 'Prism RGB',
    desc: 'Piringan kaca kristal transparan dengan cincin spektrum warna-warni',
    accent: '#a855f7',
    borderClass: 'border-purple-400/35 shadow-[0_0_15px_rgba(168,85,247,0.25)]',
    bgClass: 'bg-[#120824]/85 backdrop-blur-xl',
    vinylGradient: 'radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, rgba(168,85,247,0.6) 35%, rgba(6,182,212,0.6) 70%, rgba(236,72,153,0.8) 95%, #000 100%)',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    titleColor: 'text-purple-100',
    artistColor: 'text-purple-300/70',
    hasTonearm: false
  }
];

const VIDEO_EFFECT_CATEGORIES = [
  {
    id: 'particles',
    name: 'Partikel & Atmosfer',
    folder: 'Effects',
    effects: [
      { id: 'none', name: 'None (Tanpa Efek)', desc: 'Latar polos bersih tanpa overlay partikel', icon: Layers },
      { id: 'atmospheric', name: 'Atmospheric Fog', file: 'atmospheric.mp4', desc: 'Kabut atmosferik misterius & estetik', icon: Sparkles },
      { id: 'fire-embers', name: 'Fire Embers', file: 'fire embers flying particles.mp4', desc: 'Bara api partikel melayang hangat', icon: Flame },
      { id: 'fire-particles', name: 'Fire Particles', file: 'fire particles.mp4', desc: 'Partikel api berkilau dramatis', icon: Flame },
      { id: 'fire-sparks', name: 'Fire Sparks', file: 'fire sparks.mp4', desc: 'Percikan kembang api intens', icon: Sparkles },
      { id: 'old-film-grain', name: 'Old Film Grain', file: 'old film grain.mp4', desc: 'Tekstur grain film seluloid retro', icon: Film },
      { id: 'smoke-effect', name: 'Smoke Effect', file: 'smoke effect.mp4', desc: 'Asap tebal dinamis mengalir lembut', icon: Wind }
    ]
  },
  {
    id: 'linght',
    name: 'Linght',
    folder: 'Linght',
    effects: [
      { id: 'none', name: 'None (Tanpa Efek)', desc: 'Latar polos bersih tanpa efek cahaya', icon: Layers },
      { id: 'linght-blaze-sparks', name: 'Blaze Sparks', file: 'Blaze sparks.mp4', desc: 'Percikan cahaya blaze berkilau', icon: Sparkles },
      { id: 'linght-bokeh-rays', name: 'Bokeh Rays', file: 'Bokeh Rays.mp4', desc: 'Sinar cahaya bokeh lembut', icon: Sparkles },
      { id: 'linght-chroma-flows', name: 'Chroma Flows', file: 'Chroma Flows.mp4', desc: 'Aliran cahaya kroma spektrum', icon: Activity },
      { id: 'linght-cold-leak', name: 'Cold Leak', file: 'Cold Leak.mp4', desc: 'Bocoran cahaya biru dingin', icon: Wind },
      { id: 'linght-film-passion', name: 'Film Passion', file: 'Film Passion.mp4', desc: 'Cahaya film dramatis romantis', icon: Film },
      { id: 'linght-frost-light', name: 'Frost Light', file: 'Frost Light.mp4', desc: 'Cahaya kristal es berkilau', icon: Sparkles },
      { id: 'linght-fuzzy', name: 'Fuzzy Light', file: 'Fuzzy.mp4', desc: 'Cahaya kabur hangat ambient', icon: Sparkles },
      { id: 'linght-glowing-mystery', name: 'Glowing Mystery', file: 'Glowing Mystery.mp4', desc: 'Pijar misterius atmosferik', icon: Sparkles },
      { id: 'linght-grainy-spots', name: 'Grainy Spots', file: 'Grainy Spots.mp4', desc: 'Bintik partikel cahaya retro', icon: Film },
      { id: 'linght-heart-bokeh', name: 'Heart Bokeh', file: 'Heart Bokeh.mp4', desc: 'Bokeh bentuk hati estetis', icon: Sparkles },
      { id: 'linght-heart-haze', name: 'Heart Haze', file: 'Heart Haze.mp4', desc: 'Kabut cahaya hati hangat', icon: Sparkles },
      { id: 'linght-hive-matrik', name: 'Hive Matrik', file: 'Hive Matrik.mp4', desc: 'Matriks sarang lebah futuristik', icon: Radio },
      { id: 'linght-lightning-battle', name: 'Lightning Battle', file: 'Lightning Battle.mp4', desc: 'Sambaran kilat energetik', icon: Zap },
      { id: 'linght-bokeh', name: 'Light Bokeh', file: 'Linght Bokeh.mp4', desc: 'Butiran bokeh cahaya halus', icon: Sparkles },
      { id: 'linght-neon-sunglight', name: 'Neon Sunlight', file: 'Neaon Sunglight.mp4', desc: 'Sinar matahari neon cerah', icon: Sparkles },
      { id: 'linght-neon-aura', name: 'Neon Aura', file: 'Neon Aura.mp4', desc: 'Aura neon berpendar dinamis', icon: Sparkles },
      { id: 'linght-purple-leak', name: 'Purple Leak', file: 'Purple Leak.mp4', desc: 'Bocoran cahaya ungu sinematik', icon: Sparkles },
      { id: 'linght-reflective', name: 'Reflective', file: 'Reflective.mp4', desc: 'Pantulan kilau cahaya elegan', icon: Sparkles },
      { id: 'linght-sun-dust', name: 'Sun Dust', file: 'Sun Dust.mp4', desc: 'Debu cahaya matahari melayang', icon: Sparkles },
      { id: 'linght-contour-light', name: 'Contour Light', file: 'contour light.mp4', desc: 'Garis kontur cahaya neon', icon: Activity },
      { id: 'linght-laser', name: 'Laser Beam', file: 'laser.mp4', desc: 'Sinar laser dinamis panggung', icon: Zap },
      { id: 'linght-red-leak', name: 'Red Leak', file: 'red leak.mp4', desc: 'Bocoran cahaya merah hangat', icon: Flame },
      { id: 'linght-warm-fireflies', name: 'Warm Fireflies', file: 'warm fire files.mp4', desc: 'Kunang-kunang hangat beterbangan', icon: Flame }
    ]
  }
];

const OVERLAY_EFFECTS_LIST = VIDEO_EFFECT_CATEGORIES.flatMap(cat => cat.effects);

const GENRE_PRESETS = [
  { id: 'rock-galau', label: 'Rock Galau / Slow Rock', theme: 'Dramatic Concert Stage with Rain & Orange Embers' },
  { id: 'nu-metal', label: 'Nu Metal / Heavy Rock', theme: 'Dark Industrial Cityscape, Red Lightning & Storm' },
  { id: 'pop-akustik', label: 'Pop Akustik / Santai', theme: 'Warm Sunset Wooden Cabin, Soft Bokeh & Coffee Vibes' },
  { id: 'dangdut-koplo', label: 'Dangdut Koplo / Hype', theme: 'Vibrant Neon Concert Stage with Moving Spotlights' },
  { id: 'lofi-chill', label: 'Lo-Fi Chill / Beats', theme: 'Nocturnal Anime City Room, Neon Purple Moonlit Glow' },
  { id: 'cinematic', label: 'Cinematic / Orchestra', theme: 'Epic Mountain Peak at Dusk, Golden Rays & Dramatic Clouds' }
];

function formatDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatHumanDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const parts = [];
  if (hrs > 0) parts.push(`${hrs} jam`);
  if (mins > 0 || hrs > 0) parts.push(`${mins} menit`);
  parts.push(`${secs} detik`);
  return parts.join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Real-Time Audio Waves Visualizer (Gelombang Audio Emitting from Visualizer)
// ─────────────────────────────────────────────────────────────────────────────
function AudioWaveVisualizer({ isPlaying, audioRef, visualizerType = 'neon_waveform', bpm = 125, offsetY = 0, offsetX = 0 }) {
  const canvasRef = useRef(null);
  const peaksRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let analyserNode = null;
    let freqArray = null;
    let timeArray = null;

    // Connect Web Audio API to the live audio element safely
    try {
      const audioEl = audioRef?.current;
      if (audioEl) {
        if (!audioEl.__audioVisCtx && (window.AudioContext || window.webkitAudioContext)) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          audioEl.__audioVisCtx = new AudioCtx();
          audioEl.__analyser = audioEl.__audioVisCtx.createAnalyser();
          audioEl.__analyser.fftSize = 256;
          audioEl.__analyser.smoothingTimeConstant = 0.75;
          const source = audioEl.__audioVisCtx.createMediaElementSource(audioEl);
          source.connect(audioEl.__analyser);
          audioEl.__analyser.connect(audioEl.__audioVisCtx.destination);
        }
        if (audioEl.__audioVisCtx && isPlaying && audioEl.__audioVisCtx.state === 'suspended') {
          audioEl.__audioVisCtx.resume().catch(() => {});
        }
        if (audioEl.__analyser) {
          analyserNode = audioEl.__analyser;
          freqArray = new Uint8Array(analyserNode.frequencyBinCount);
          timeArray = new Uint8Array(analyserNode.fftSize);
        }
      }
    } catch (e) {
      // Fallback smoothly if media element source is already connected
    }

    let phase = 0;
    const safeBpm = Math.max(60, Math.min(220, Number(bpm) || 125));

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Positioning: responsive center with dynamic offsets (Atas / Tengah / Bawah)
      const cx = (width / 2) + ((Number(offsetX) || 0) / 100) * width;
      const cy = (height / 2) + ((Number(offsetY) || 0) / 100) * height;
      const dpr = window.devicePixelRatio || 1;

      // Audio frequency & energy analysis
      let audioPower = 0.4;
      if (analyserNode && freqArray) {
        analyserNode.getByteFrequencyData(freqArray);
        if (timeArray) analyserNode.getByteTimeDomainData(timeArray);
        let sum = 0;
        const bins = Math.min(32, freqArray.length);
        for (let i = 0; i < bins; i++) sum += freqArray[i];
        audioPower = sum / (bins * 255);
      }

      if (isPlaying) {
        phase += (safeBpm / 60) * 0.08 + audioPower * 0.05;
      } else {
        phase += 0.015;
      }

      // ─────────────────────────────────────────────────────────────
      // STYLE 1: NEON WAVEFORM (Garis Glowing Neon Cyan & Amber)
      // ─────────────────────────────────────────────────────────────
      if (visualizerType === 'neon_waveform') {
        const waveAmp = isPlaying ? (28 * dpr + audioPower * 42 * dpr) : (8 * dpr);
        const drawWave = (color, offsetPhase, ampMultiplier, lineWidth, shadowGlow) => {
          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          ctx.shadowBlur = shadowGlow;
          ctx.shadowColor = color;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.beginPath();
          const step = Math.max(2, Math.round(4 * dpr));
          let started = false;

          for (let x = 0; x <= width; x += step) {
            const normX = (x - cx) / width;
            const envelope = Math.max(0, Math.cos(normX * Math.PI));
            if (envelope <= 0) continue;

            let waveY = 0;
            if (timeArray && isPlaying) {
              const binIdx = Math.floor(((x / width) * (timeArray.length - 1)));
              const sample = (timeArray[binIdx] - 128) / 128;
              waveY = sample * waveAmp * ampMultiplier;
            } else {
              const h1 = Math.sin(normX * 16 + phase + offsetPhase);
              const h2 = Math.cos(normX * 32 - phase * 1.5) * 0.45;
              waveY = (h1 + h2) * waveAmp * ampMultiplier;
            }

            const y = cy + waveY * envelope;
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
          ctx.restore();
        };

        // Secondary amber line
        drawWave('#fbbf24', Math.PI / 4, 0.75, 2.5 * dpr, 10 * dpr);
        // Primary glowing neon teal line
        drawWave('#00d8b6', 0, 1.0, 3.5 * dpr, 18 * dpr);
      }

      // ─────────────────────────────────────────────────────────────
      // STYLE 2: DYNAMIC EQ BARS (Batang Equalizer Spektrum Modern)
      // ─────────────────────────────────────────────────────────────
      else if (visualizerType === 'eq_bars') {
        const numBars = 42;
        const totalW = Math.min(width * 0.82, 800 * dpr);
        const barW = (totalW / numBars) * 0.68;
        const gap = (totalW / numBars) * 0.32;
        const startX = cx - totalW / 2;
        const maxH = Math.min(height * 0.38, 140 * dpr);

        if (!peaksRef.current || peaksRef.current.length !== numBars) {
          peaksRef.current = new Array(numBars).fill(0);
        }

        for (let i = 0; i < numBars; i++) {
          let val = 0.15;
          if (freqArray && isPlaying) {
            const bin = Math.min(freqArray.length - 1, Math.floor(Math.pow(i / numBars, 1.2) * (freqArray.length * 0.75)));
            val = Math.max(0.08, freqArray[bin] / 255);
          } else {
            val = 0.15 + Math.sin(phase * 2 + i * 0.35) * 0.12;
          }

          const h = Math.max(4 * dpr, val * maxH);
          const x = startX + i * (barW + gap);
          const y = cy + maxH / 2 - h;

          // Peak fall-off logic
          if (val * maxH > peaksRef.current[i]) {
            peaksRef.current[i] = val * maxH;
          } else {
            peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 1.8 * dpr);
          }

          // Bar gradient from cyan to electric blue
          const grad = ctx.createLinearGradient(x, y + h, x, y);
          grad.addColorStop(0, '#00f2fe');
          grad.addColorStop(0.55, '#4facfe');
          grad.addColorStop(1, '#a855f7');

          ctx.save();
          ctx.fillStyle = grad;
          ctx.shadowColor = '#00f2fe';
          ctx.shadowBlur = 8 * dpr;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, y, barW, h, [3 * dpr, 3 * dpr, 0, 0]);
          } else {
            ctx.rect(x, y, barW, h);
          }
          ctx.fill();

          // Draw peak floating cap
          const peakY = cy + maxH / 2 - peaksRef.current[i] - 3 * dpr;
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 6 * dpr;
          ctx.fillRect(x, peakY, barW, 2.5 * dpr);
          ctx.restore();
        }
      }

      // ─────────────────────────────────────────────────────────────
      // STYLE 3: CINEMATIC SPECTROGRAM (Heatmap Magma Mengalir)
      // ─────────────────────────────────────────────────────────────
      else if (visualizerType === 'spectrogram') {
        const bands = 52;
        const totalW = Math.min(width * 0.85, 820 * dpr);
        const colW = totalW / bands;
        const startX = cx - totalW / 2;
        const maxH = Math.min(height * 0.42, 150 * dpr);

        for (let i = 0; i < bands; i++) {
          let energy = 0.2;
          if (freqArray && isPlaying) {
            const idx = Math.floor((i / bands) * (freqArray.length * 0.7));
            energy = freqArray[idx] / 255;
          } else {
            energy = 0.2 + 0.18 * Math.sin(phase * 2.2 + i * 0.28);
          }

          const h = Math.max(6 * dpr, energy * maxH);
          const x = startX + i * colW;
          const yTop = cy - h / 2;

          // Magma gradient (Dark Violet -> Magenta -> Orange -> Gold)
          const grad = ctx.createLinearGradient(x, cy, x, yTop);
          grad.addColorStop(0, '#3b0764');
          grad.addColorStop(0.35, '#c026d3');
          grad.addColorStop(0.7, '#f97316');
          grad.addColorStop(1, '#fde047');

          ctx.save();
          ctx.fillStyle = grad;
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = (energy * 14 + 4) * dpr;
          ctx.fillRect(x, yTop, colW * 0.85, h);
          ctx.restore();
        }
      }

      // ─────────────────────────────────────────────────────────────
      // STYLE 4: MUSICAL MATRIX (Constant-Q Transform Not Musik)
      // ─────────────────────────────────────────────────────────────
      else if (visualizerType === 'musical_matrix') {
        const cols = 36;
        const rows = 12;
        const totalW = Math.min(width * 0.84, 800 * dpr);
        const blockW = (totalW / cols) * 0.76;
        const gapX = (totalW / cols) * 0.24;
        const startX = cx - totalW / 2;
        const blockH = 5 * dpr;
        const gapY = 2.5 * dpr;
        const totalH = rows * (blockH + gapY);
        const startY = cy - totalH / 2;

        for (let c = 0; c < cols; c++) {
          let power = 0.15;
          if (freqArray && isPlaying) {
            const idx = Math.floor(Math.pow(c / cols, 1.3) * (freqArray.length * 0.65));
            power = freqArray[idx] / 255;
          } else {
            power = 0.15 + 0.15 * Math.sin(phase * 1.8 + c * 0.4);
          }

          const activeRows = Math.round(power * rows);

          for (let r = 0; r < rows; r++) {
            const rowIndexFromBottom = rows - 1 - r;
            const isLit = rowIndexFromBottom < activeRows;
            const x = startX + c * (blockW + gapX);
            const y = startY + r * (blockH + gapY);

            ctx.save();
            if (isLit) {
              const ratio = 1 - r / rows;
              const color = ratio > 0.6 ? '#00d8b6' : '#a855f7';
              ctx.fillStyle = color;
              ctx.shadowColor = color;
              ctx.shadowBlur = 7 * dpr;
            } else {
              ctx.fillStyle = 'rgba(255,255,255,0.06)';
            }
            ctx.fillRect(x, y, blockW, blockH);
            ctx.restore();
          }
        }
      }

      // ─────────────────────────────────────────────────────────────
      // STYLE 5: ABSTRACT LISSAJOUS (Laser Phase Vector Oscilloscope)
      // ─────────────────────────────────────────────────────────────
      else if (visualizerType === 'lissajous') {
        const radius = Math.min(width, height) * 0.24;
        const points = 240;

        ctx.save();
        ctx.translate(cx, cy);

        // Ambient neon rings
        ctx.strokeStyle = 'rgba(0,216,182,0.18)';
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#00d8b6';
        ctx.lineWidth = 2.8 * dpr;
        ctx.shadowColor = '#00d8b6';
        ctx.shadowBlur = 18 * dpr;
        ctx.beginPath();

        const bassBoost = 1 + audioPower * 0.55;

        for (let i = 0; i <= points; i++) {
          const t = (i / points) * Math.PI * 2;
          const a = 3;
          const b = 2;
          const delta = phase * 1.6;

          let audioWarp = 0;
          if (timeArray && isPlaying) {
            const sampleIdx = Math.floor((i / points) * (timeArray.length - 1));
            audioWarp = ((timeArray[sampleIdx] - 128) / 128) * 0.35;
          }

          const lx = Math.sin(a * t + delta) * (radius * bassBoost + audioWarp * radius);
          const ly = Math.sin(b * t) * (radius * bassBoost + audioWarp * radius);

          if (i === 0) ctx.moveTo(lx, ly);
          else ctx.lineTo(lx, ly);
        }
        ctx.stroke();

        // Secondary golden laser accent line
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.6 * dpr;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 12 * dpr;
        ctx.beginPath();

        for (let i = 0; i <= points; i += 2) {
          const t = (i / points) * Math.PI * 2;
          const lx = Math.sin(2 * t - phase * 1.2) * (radius * 0.72);
          const ly = Math.cos(3 * t + phase * 0.8) * (radius * 0.72);
          if (i === 0) ctx.moveTo(lx, ly);
          else ctx.lineTo(lx, ly);
        }
        ctx.stroke();

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, visualizerType, bpm, audioRef, offsetY, offsetX]);

  // Handle high-dpi canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = (rect.width || 800) * dpr;
      canvas.height = (rect.height || 450) * dpr;
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[4]"
    />
  );
}

export default function AutoAlbum({ onBack }) {
  // ── State: Informasi Album ──
  const [albumTitle, setAlbumTitle] = useState('BEST RELAXING ACOUSTIC 2026');
  const [genrePreset, setGenrePreset] = useState('pop-akustik');
  const [customGenre, setCustomGenre] = useState('');

  // ── State: Background Media (Foto / Video Utama 16:9) ──
  const [bgPhoto, setBgPhoto] = useState(null); // { file, url, path, name, isVideo }
  const [isBgDragOver, setIsBgDragOver] = useState(false);
  const bgPhotoInputRef = useRef(null);

  // ── State: Efek Video Overlay (DI DEPAN BACKGROUND) ──
  const [overlaySource, setOverlaySource] = useState('preset'); // 'preset' | 'custom'
  const [overlayEffectCategory, setOverlayEffectCategory] = useState('particles'); // 'particles' | 'linght'
  const [selectedCatEffects, setSelectedCatEffects] = useState({
    particles: 'atmospheric',
    linght: 'none'
  });
  const [customOverlayVideo, setCustomOverlayVideo] = useState(null); // { file, url, path, name }
  const [overlayOpacity, setOverlayOpacity] = useState(0.85);
  const customOverlayVideoInputRef = useRef(null);

  const handleSelectEffectCategory = (catId) => {
    setOverlaySource('preset');
    setOverlayEffectCategory(catId);
  };

  const handleSelectCategoryEffect = (catId, effectId) => {
    setSelectedCatEffects(prev => ({ ...prev, [catId]: effectId }));
  };

  // Daftar seluruh efek aktif (yang bukan 'none') dari semua kategori
  const activeEffectsList = useMemo(() => {
    if (overlaySource === 'custom') {
      if (customOverlayVideo?.url) {
        return [{
          id: 'custom',
          catId: 'custom',
          catName: 'Kustom',
          name: customOverlayVideo.name || 'Video Kustom',
          url: customOverlayVideo.url,
          isCustom: true
        }];
      }
      return [];
    }

    const list = [];
    VIDEO_EFFECT_CATEGORIES.forEach(cat => {
      const selectedId = selectedCatEffects[cat.id];
      if (selectedId && selectedId !== 'none') {
        const eff = cat.effects.find(e => e.id === selectedId);
        if (eff && eff.file) {
          list.push({
            id: eff.id,
            catId: cat.id,
            catName: cat.name,
            folder: cat.folder,
            name: eff.name,
            file: eff.file,
            isCustom: false
          });
        }
      }
    });
    return list;
  }, [overlaySource, selectedCatEffects, customOverlayVideo]);

  // ── State: Visualizer 1:1 & Posisi Geser ──
  const [useVisualizer, setUseVisualizer] = useState(true);
  const [visualizerType, setVisualizerType] = useState('neon_waveform');
  const [visualizerPosY, setVisualizerPosY] = useState(0); // -45% to +45% (negative = Atas, positive = Bawah)
  const [visualizerPosX, setVisualizerPosX] = useState(0); // -40% to +40% (negative = Kiri, positive = Kanan)

  // ── State: Pemutar Piringan Hitam (Vinyl Player & 6 Model) ──
  const [useVinylPlayer, setUseVinylPlayer] = useState(true);
  const [vinylModel, setVinylModel] = useState('classic');
  const [vinylCoverPhoto, setVinylCoverPhoto] = useState(null); // { file, url, path, name }
  const vinylCoverInputRef = useRef(null);

  const activeVinylModelObj = useMemo(() => {
    return VINYL_MODELS_LIST.find(m => m.id === vinylModel) || VINYL_MODELS_LIST[0];
  }, [vinylModel]);

  const activeVinylImage = useMemo(() => {
    return vinylCoverPhoto?.url || (!bgPhoto?.isVideo ? bgPhoto?.url : null) || null;
  }, [vinylCoverPhoto, bgPhoto]);

  const handleVinylCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    let filePath = null;
    if (window.require) {
      try {
        filePath = window.require('electron').webUtils?.getPathForFile(file);
      } catch (err) {}
    }
    setVinylCoverPhoto({
      file,
      url,
      path: filePath,
      name: file.name
    });
    e.target.value = '';
  };

  const handleCycleVinylModel = () => {
    const idx = VINYL_MODELS_LIST.findIndex(m => m.id === vinylModel);
    const nextIdx = (idx + 1) % VINYL_MODELS_LIST.length;
    setVinylModel(VINYL_MODELS_LIST[nextIdx].id);
  };

  // ── State: Jedak-Jeduk & Auto Marka Beat ──
  const [useJedakJeduk, setUseJedakJeduk] = useState(true);
  const [beatMode, setBeatMode] = useState('auto'); // 'auto' | 'beats1' | 'beats2' | 'custom'
  const [analyzedBpm, setAnalyzedBpm] = useState(null);
  const [analyzedInterval, setAnalyzedInterval] = useState(null);
  const [isAnalyzingBeat, setIsAnalyzingBeat] = useState(false);
  const [customBpm, setCustomBpm] = useState(128);

  const activeBpm = useMemo(() => {
    if (beatMode === 'beats1') return 75; // 0.8s interval
    if (beatMode === 'beats2') return 150; // 0.4s interval
    if (beatMode === 'custom') return customBpm;
    return analyzedBpm || 125;
  }, [beatMode, analyzedBpm, customBpm]);

  // ── State: Daftar Lagu (1 - 20 Slot) ──
  const [songs, setSongs] = useState([
    { id: 'song-1', titleArtist: '', file: null, duration: 0, url: null, audioPath: null }
  ]);
  const [playingSongId, setPlayingSongId] = useState(null);
  const previewAudioRef = useRef(null);
  const batchAudioInputRef = useRef(null);

  // ── State: Modal Batch Paste Tracklist & Kolom Teks Urutan Lagu ──
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [songViewMode, setSongViewMode] = useState('slots'); // 'slots' | 'text' | 'split'
  const [orderText, setOrderText] = useState('');
  const [orderNotification, setOrderNotification] = useState(null);

  // ── State: Agen AI Prompt (Background & Thumbnail) ──
  const [aiProvider, setAiProvider] = useState('pollinations');
  const [aiApiKey, setAiApiKey] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiGenError, setAiGenError] = useState(null);
  const [aiGenSuccess, setAiGenSuccess] = useState(null);
  const [generatedAiImage, setGeneratedAiImage] = useState(null);
  const [copiedBgPrompt, setCopiedBgPrompt] = useState(false);
  const [copiedThumbPrompt, setCopiedThumbPrompt] = useState(false);
  const [copiedTracklist, setCopiedTracklist] = useState(false);
  const [copiedYoutubeDesc, setCopiedYoutubeDesc] = useState(false);

  // ── State: Render Video Final ──
  const [exportFolder, setExportFolder] = useState('');
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderTimemark, setRenderTimemark] = useState('00:00:00');
  const [renderResult, setRenderResult] = useState(null);
  const [renderError, setRenderError] = useState(null);

  // ── State: Layar Review Video (Pratinjau Maksimal 3 Lagu) ──
  const [reviewSongIndex, setReviewSongIndex] = useState(0);
  const [isReviewPlaying, setIsReviewPlaying] = useState(false);
  const [reviewCurrentTime, setReviewCurrentTime] = useState(0);
  const [reviewDuration, setReviewDuration] = useState(0);
  const [reviewVolume, setReviewVolume] = useState(1.0);
  const [isReviewMuted, setIsReviewMuted] = useState(false);
  const [effectBlobUrls, setEffectBlobUrls] = useState({}); // { [effId]: blobUrl }
  const [goldenBlobUrl, setGoldenBlobUrl] = useState(null);
  const [isRenderingQuickReview, setIsRenderingQuickReview] = useState(false);

  const reviewAudioRef = useRef(null);
  const reviewBgVideoRef = useRef(null);
  const reviewEffectVideosRef = useRef({}); // { [effId]: HTMLVideoElement }

  // Total Lagu yang di-input
  const totalInputtedSongsCount = useMemo(() => {
    return songs.filter(s => s.titleArtist.trim()).length;
  }, [songs]);

  // Valid songs with audio, supports up to 20 songs for review
  const validReviewSongs = useMemo(() => {
    return songs.filter(s => s.file && s.titleArtist.trim());
  }, [songs]);

  const activeReviewSong = useMemo(() => {
    return validReviewSongs[reviewSongIndex] || validReviewSongs[0] || null;
  }, [validReviewSongs, reviewSongIndex]);

  // Ekstrak dan format Judul Lagu & Artis untuk Pemutar Piringan Hitam
  const parsedSongInfo = useMemo(() => {
    const raw = activeReviewSong?.titleArtist || '';
    if (!raw.trim()) {
      return {
        title: albumTitle.trim() || 'Judul Lagu',
        artist: 'Pilih / Unggah Lagu'
      };
    }
    const clean = raw.replace(/^\d+[\.\-\s]+/, '').trim();
    if (clean.includes(' - ')) {
      const parts = clean.split(' - ');
      return {
        artist: parts[0].trim() || 'Artist',
        title: parts.slice(1).join(' - ').trim() || 'Track'
      };
    }
    if (clean.includes(' – ')) {
      const parts = clean.split(' – ');
      return {
        artist: parts[0].trim() || 'Artist',
        title: parts.slice(1).join(' – ').trim() || 'Track'
      };
    }
    return {
      title: clean || albumTitle.trim() || 'Judul Lagu',
      artist: albumTitle.trim() || 'Auto Album'
    };
  }, [activeReviewSong, albumTitle]);

  // ── Auto-Persistence: Rehydrate & Auto-Save Auto Album State ──
  const isHydratedRef = useRef(false);

  // 1. Restore persisted state from localStorage on mount
  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem('shotai_autoalbum_persistent_state');
      if (savedRaw) {
        const data = JSON.parse(savedRaw);
        if (data) {
          if (data.albumTitle) setAlbumTitle(data.albumTitle);
          if (data.genrePreset) setGenrePreset(data.genrePreset);
          if (data.customGenre !== undefined) setCustomGenre(data.customGenre);
          if (data.overlaySource) setOverlaySource(data.overlaySource);
          if (data.overlayEffectCategory) setOverlayEffectCategory(data.overlayEffectCategory);
          if (data.selectedCatEffects) setSelectedCatEffects(data.selectedCatEffects);
          if (typeof data.overlayOpacity === 'number') setOverlayOpacity(data.overlayOpacity);
          if (typeof data.useVisualizer === 'boolean') setUseVisualizer(data.useVisualizer);
          if (data.visualizerType) setVisualizerType(data.visualizerType);
          if (typeof data.visualizerPosY === 'number') setVisualizerPosY(data.visualizerPosY);
          if (typeof data.visualizerPosX === 'number') setVisualizerPosX(data.visualizerPosX);
          if (typeof data.useVinylPlayer === 'boolean') setUseVinylPlayer(data.useVinylPlayer);
          if (data.vinylModel) setVinylModel(data.vinylModel);
          if (typeof data.useJedakJeduk === 'boolean') setUseJedakJeduk(data.useJedakJeduk);
          if (data.beatMode) setBeatMode(data.beatMode);
          if (data.customBpm) setCustomBpm(data.customBpm);
          if (data.exportFolder) setExportFolder(data.exportFolder);
          if (data.aiProvider) setAiProvider(data.aiProvider);
          if (data.orderText !== undefined) setOrderText(data.orderText);

          // Rehydrate bgPhoto if file exists on disk
          if (data.bgPhotoMeta?.path && window.require) {
            try {
              const fs = window.require('fs');
              const path = window.require('path');
              if (fs.existsSync(data.bgPhotoMeta.path)) {
                const ext = path.extname(data.bgPhotoMeta.path).toLowerCase();
                const isVid = Boolean(data.bgPhotoMeta.isVideo);
                const mime = isVid ? 'video/mp4' : (ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg');
                const buf = fs.readFileSync(data.bgPhotoMeta.path);
                const blob = new Blob([buf], { type: mime });
                const url = URL.createObjectURL(blob);
                setBgPhoto({
                  file: new File([blob], data.bgPhotoMeta.name, { type: mime }),
                  url,
                  path: data.bgPhotoMeta.path,
                  name: data.bgPhotoMeta.name,
                  isVideo: isVid
                });
              }
            } catch (err) {
              console.warn('[Rehydrate bgPhoto error]', err);
            }
          }

          // Rehydrate vinylCoverPhoto
          if (data.vinylCoverPhotoMeta?.path && window.require) {
            try {
              const fs = window.require('fs');
              const path = window.require('path');
              if (fs.existsSync(data.vinylCoverPhotoMeta.path)) {
                const ext = path.extname(data.vinylCoverPhotoMeta.path).toLowerCase();
                const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
                const buf = fs.readFileSync(data.vinylCoverPhotoMeta.path);
                const blob = new Blob([buf], { type: mime });
                const url = URL.createObjectURL(blob);
                setVinylCoverPhoto({
                  file: new File([blob], data.vinylCoverPhotoMeta.name, { type: mime }),
                  url,
                  path: data.vinylCoverPhotoMeta.path,
                  name: data.vinylCoverPhotoMeta.name
                });
              }
            } catch (err) {
              console.warn('[Rehydrate vinylCoverPhoto error]', err);
            }
          }

          // Rehydrate customOverlayVideo
          if (data.customOverlayVideoMeta?.path && window.require) {
            try {
              const fs = window.require('fs');
              const path = window.require('path');
              if (fs.existsSync(data.customOverlayVideoMeta.path)) {
                const buf = fs.readFileSync(data.customOverlayVideoMeta.path);
                const blob = new Blob([buf], { type: 'video/mp4' });
                const url = URL.createObjectURL(blob);
                setCustomOverlayVideo({
                  file: new File([blob], data.customOverlayVideoMeta.name, { type: 'video/mp4' }),
                  url,
                  path: data.customOverlayVideoMeta.path,
                  name: data.customOverlayVideoMeta.name
                });
              }
            } catch (err) {
              console.warn('[Rehydrate customOverlayVideo error]', err);
            }
          }

          // Rehydrate songs
          if (Array.isArray(data.songsMeta) && data.songsMeta.length > 0) {
            const rehydratedSongs = data.songsMeta.map(sm => {
              let songUrl = null;
              let songFile = null;
              if (sm.audioPath && window.require) {
                try {
                  const fs = window.require('fs');
                  const path = window.require('path');
                  if (fs.existsSync(sm.audioPath)) {
                    const ext = path.extname(sm.audioPath).toLowerCase();
                    const mime = ext === '.wav' ? 'audio/wav' : 'audio/mp3';
                    const buf = fs.readFileSync(sm.audioPath);
                    const blob = new Blob([buf], { type: mime });
                    songUrl = URL.createObjectURL(blob);
                    songFile = new File([blob], path.basename(sm.audioPath), { type: mime });
                  }
                } catch (e) {}
              }
              return {
                id: sm.id,
                titleArtist: sm.titleArtist || '',
                file: songFile,
                duration: sm.duration || 0,
                url: songUrl,
                audioPath: sm.audioPath || null
              };
            });
            setSongs(rehydratedSongs);
          }
        }
      }
    } catch (e) {
      console.warn('[AutoAlbum restore error]', e);
    } finally {
      isHydratedRef.current = true;
    }
  }, []);

  // 2. Auto-save AutoAlbum state to localStorage
  useEffect(() => {
    if (!isHydratedRef.current) return;
    try {
      const serializableData = {
        albumTitle,
        genrePreset,
        customGenre,
        overlaySource,
        overlayEffectCategory,
        selectedCatEffects,
        overlayOpacity,
        useVisualizer,
        visualizerType,
        visualizerPosY,
        visualizerPosX,
        useVinylPlayer,
        vinylModel,
        useJedakJeduk,
        beatMode,
        customBpm,
        exportFolder,
        aiProvider,
        orderText,
        bgPhotoMeta: bgPhoto ? {
          name: bgPhoto.name,
          path: bgPhoto.path,
          isVideo: bgPhoto.isVideo
        } : null,
        vinylCoverPhotoMeta: vinylCoverPhoto ? {
          name: vinylCoverPhoto.name,
          path: vinylCoverPhoto.path
        } : null,
        customOverlayVideoMeta: customOverlayVideo ? {
          name: customOverlayVideo.name,
          path: customOverlayVideo.path
        } : null,
        songsMeta: songs.map(s => ({
          id: s.id,
          titleArtist: s.titleArtist,
          duration: s.duration,
          audioPath: s.audioPath
        }))
      };
      localStorage.setItem('shotai_autoalbum_persistent_state', JSON.stringify(serializableData));
    } catch (e) {
      console.warn('[AutoAlbum save state error]', e);
    }
  }, [
    albumTitle, genrePreset, customGenre, overlaySource, overlayEffectCategory,
    selectedCatEffects, overlayOpacity, useVisualizer, visualizerType, visualizerPosY, visualizerPosX,
    useVinylPlayer, vinylModel, useJedakJeduk, beatMode, customBpm, exportFolder,
    aiProvider, orderText, bgPhoto, vinylCoverPhoto, customOverlayVideo, songs
  ]);

  const handleSafeBack = () => {
    if (isReviewPlaying) {
      if (reviewAudioRef.current) reviewAudioRef.current.pause();
      if (reviewBgVideoRef.current) reviewBgVideoRef.current.pause();
      syncReviewEffectVideos(false);
      setIsReviewPlaying(false);
    }
    if (onBack) onBack();
  };


  // ── Load Effect Video Blob URLs for Live Review (Multi-Efek Simultan di Depan Background) ──
  useEffect(() => {
    const urlsToRevoke = [];
    const newMap = {};

    if (overlaySource === 'custom') {
      if (customOverlayVideo?.url) {
        newMap['custom'] = customOverlayVideo.url;
      }
      setEffectBlobUrls(newMap);
      return;
    }

    if (window.require) {
      try {
        const fs = window.require('fs');
        const path = window.require('path');

        for (const eff of activeEffectsList) {
          if (!eff.file) continue;
          const candidatePaths = [
            path.join(window.process.cwd(), 'assets', eff.folder, eff.file),
            path.join(window.process.cwd(), 'assets', eff.folder.toLowerCase(), eff.file),
            path.join(window.process.cwd(), 'assets', 'Linght', eff.file),
            path.join(window.process.cwd(), 'assets', 'Effects', eff.file),
            path.join(window.process.cwd(), 'public', 'assets', eff.folder, eff.file),
            path.join(window.process.cwd(), 'assets', eff.file)
          ];
          for (const p of candidatePaths) {
            if (fs.existsSync(p)) {
              const buf = fs.readFileSync(p);
              const blob = new Blob([buf], { type: 'video/mp4' });
              const activeUrl = URL.createObjectURL(blob);
              urlsToRevoke.push(activeUrl);
              newMap[eff.id] = activeUrl;
              break;
            }
          }
        }
      } catch (err) {
        console.warn('[Review Effect Video load error]', err);
      }
    }

    setEffectBlobUrls(newMap);

    return () => {
      urlsToRevoke.forEach(u => {
        try { URL.revokeObjectURL(u); } catch (e) {}
      });
    };
  }, [overlaySource, activeEffectsList, customOverlayVideo]);

  // Sync playback for all active review effect videos
  const syncReviewEffectVideos = useCallback((shouldPlay) => {
    Object.values(reviewEffectVideosRef.current).forEach(vid => {
      if (vid) {
        if (shouldPlay) {
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      }
    });
  }, []);

  // Ensure newly loaded effect videos start playing if review is already active
  useEffect(() => {
    if (isReviewPlaying) {
      syncReviewEffectVideos(true);
    }
  }, [effectBlobUrls, isReviewPlaying, syncReviewEffectVideos]);

  // ── Load Golden Requiem Frame Blob URL for Live Review ──
  useEffect(() => {
    let activeUrl = null;
    if (window.require) {
      try {
        const fs = window.require('fs');
        const path = window.require('path');
        const candidatePaths = [
          path.join(window.process.cwd(), 'assets', 'golden requiem', 'golden requiem.png'),
          path.join(window.process.cwd(), 'assets', 'golden_requiem', 'golden requiem.png'),
          path.join(window.process.cwd(), 'assets', 'golden requiem.png')
        ];
        for (const p of candidatePaths) {
          if (fs.existsSync(p)) {
            const buf = fs.readFileSync(p);
            const blob = new Blob([buf], { type: 'image/png' });
            activeUrl = URL.createObjectURL(blob);
            setGoldenBlobUrl(activeUrl);
            break;
          }
        }
      } catch (err) {
        console.warn('[Review Golden Frame load error]', err);
      }
    }
    return () => {
      if (activeUrl) {
        try { URL.revokeObjectURL(activeUrl); } catch (e) {}
      }
    };
  }, []);

  // Handle Time Update from Review Audio
  const handleReviewTimeUpdate = () => {
    if (reviewAudioRef.current) {
      setReviewCurrentTime(reviewAudioRef.current.currentTime || 0);
      setReviewDuration(reviewAudioRef.current.duration || 0);
    }
  };

  // Handle Seek in Review Player
  const handleReviewSeek = (e) => {
    const time = Number(e.target.value);
    setReviewCurrentTime(time);
    if (reviewAudioRef.current) {
      reviewAudioRef.current.currentTime = time;
    }
    Object.values(reviewEffectVideosRef.current).forEach(vid => {
      if (vid && vid.duration) {
        vid.currentTime = time % vid.duration;
      }
    });
  };

  // Toggle Review Audio Play / Pause
  const toggleReviewPlay = () => {
    if (!activeReviewSong?.url && !activeReviewSong?.audioPath) {
      alert('Unggah minimal 1 lagu dengan file audio di menu Daftar Lagu untuk memutar review.');
      return;
    }
    if (isReviewPlaying) {
      if (reviewAudioRef.current) reviewAudioRef.current.pause();
      if (reviewBgVideoRef.current) reviewBgVideoRef.current.pause();
      syncReviewEffectVideos(false);
      setIsReviewPlaying(false);
    } else {
      if (reviewAudioRef.current) {
        reviewAudioRef.current.play().then(() => {
          setIsReviewPlaying(true);
          if (reviewBgVideoRef.current) reviewBgVideoRef.current.play().catch(() => {});
          syncReviewEffectVideos(true);
        }).catch(err => {
          console.warn('[Review audio play error]', err);
        });
      }
    }
  };

  // Switch Track in Review Player
  const handleSelectReviewTrack = (idx) => {
    if (idx === reviewSongIndex && isReviewPlaying) {
      toggleReviewPlay();
      return;
    }
    setReviewSongIndex(idx);
    setIsReviewPlaying(false);
    if (reviewAudioRef.current) {
      reviewAudioRef.current.pause();
      reviewAudioRef.current.currentTime = 0;
    }
    syncReviewEffectVideos(false);
    Object.values(reviewEffectVideosRef.current).forEach(vid => {
      if (vid) vid.currentTime = 0;
    });
    setTimeout(() => {
      if (reviewAudioRef.current) {
        reviewAudioRef.current.play().then(() => {
          setIsReviewPlaying(true);
          if (reviewBgVideoRef.current) reviewBgVideoRef.current.play().catch(() => {});
          syncReviewEffectVideos(true);
        }).catch(() => {});
      }
    }, 150);
  };

  const handleNextReviewTrack = () => {
    if (validReviewSongs.length <= 1) return;
    const nextIdx = (reviewSongIndex + 1) % validReviewSongs.length;
    handleSelectReviewTrack(nextIdx);
  };

  const handlePrevReviewTrack = () => {
    if (validReviewSongs.length <= 1) return;
    const prevIdx = (reviewSongIndex - 1 + validReviewSongs.length) % validReviewSongs.length;
    handleSelectReviewTrack(prevIdx);
  };

  const handleReviewTrackEnded = () => {
    if (validReviewSongs.length > 1) {
      handleNextReviewTrack();
    } else if (reviewAudioRef.current) {
      reviewAudioRef.current.currentTime = 0;
      reviewAudioRef.current.play().catch(() => {});
    }
  };

  const handleToggleMuteReview = () => {
    if (reviewAudioRef.current) {
      const nextMute = !isReviewMuted;
      reviewAudioRef.current.muted = nextMute;
      setIsReviewMuted(nextMute);
    }
  };

  const handleReviewVolumeChange = (e) => {
    const val = Number(e.target.value);
    setReviewVolume(val);
    if (reviewAudioRef.current) {
      reviewAudioRef.current.volume = val;
      if (val === 0) {
        setIsReviewMuted(true);
        reviewAudioRef.current.muted = true;
      } else {
        setIsReviewMuted(false);
        reviewAudioRef.current.muted = false;
      }
    }
  };

  // Active genre details
  const activeGenreObj = useMemo(() => {
    return GENRE_PRESETS.find(g => g.id === genrePreset) || GENRE_PRESETS[0];
  }, [genrePreset]);

  const effectiveGenreName = customGenre.trim() || activeGenreObj.label;

  // Extract song titles for prompts
  const validSongTitles = useMemo(() => {
    return songs.map(s => s.titleArtist.trim()).filter(Boolean);
  }, [songs]);

  // Auto-generate AI Background Prompt
  const generatedBgPrompt = useMemo(() => {
    const title = albumTitle.trim() || 'BEST MUSIC ALBUM';
    const theme = activeGenreObj.theme;
    return `Cinematic wide angle 16:9 album background art for "${title}", ${effectiveGenreName} music mood. ${theme}. Atmospheric volumetrics, dramatic rim lighting, subtle floating embers and fog. Clear negative space in the center and left for visualizer effects. Ultra-detailed, photorealistic, 8k resolution, cinematic color grading.`;
  }, [albumTitle, effectiveGenreName, activeGenreObj]);

  // Auto-generate AI Thumbnail Prompt (High CTR Typography)
  const generatedThumbPrompt = useMemo(() => {
    const title = albumTitle.trim() || 'BEST MUSIC ALBUM';
    const top4 = validSongTitles.slice(0, 4).map(s => s.replace(/^\d+[\.\-\s]+/, '')).join(' • ');
    const highlights = top4 || 'BEST COMPILATION TRACKS';
    return `Viral high CTR YouTube music album thumbnail, 16:9 ratio. Bold stylized 3D metallic typography reading "${title.toUpperCase()}" at top center. Golden badge text "FULL ALBUM • ${effectiveGenreName.toUpperCase()}". Lower banner displaying text "${highlights}". Epic stage lighting, energetic live singer with guitar on the right, high contrast neon glow, hyper-detailed, masterpiece, trending on ArtStation.`;
  }, [albumTitle, effectiveGenreName, validSongTitles]);

  // YouTube description generator with timestamps
  const youtubeDescription = useMemo(() => {
    const lines = [
      `🎵 ${albumTitle.trim() || 'Auto Album'}`,
      `Kompilasi Musik Full Album • Genre: ${effectiveGenreName}`,
      '',
      '📌 TRACKLIST & TIMESTAMPS:'
    ];
    let offset = 0;
    const valid = songs.filter(s => s.titleArtist.trim());
    valid.forEach((s, idx) => {
      lines.push(`${formatDuration(offset)} - ${String(idx + 1).padStart(2, '0')}. ${s.titleArtist.trim()}`);
      offset += Number(s.duration) || 0;
    });
    lines.push('', '✨ Dibuat secara otomatis dengan ShotAi Studio Auto Album');
    return lines.join('\n');
  }, [albumTitle, effectiveGenreName, songs]);

  // Total Duration
  const totalDurationSec = useMemo(() => {
    return songs.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
  }, [songs]);

  // Listen to Video Render Progress
  useEffect(() => {
    const handleProgressData = (data) => {
      if (data) {
        if (typeof data.percent === 'number') setRenderProgress(data.percent);
        if (data.currentTimemark) setRenderTimemark(data.currentTimemark);
      }
    };

    const handleDirectEvent = (e) => {
      if (e && e.detail) handleProgressData(e.detail);
    };

    window.addEventListener('auto-album-progress-direct', handleDirectEvent);

    let ipc = null;
    if (window.require) {
      try {
        ipc = window.require('electron').ipcRenderer;
        ipc.on('auto-album-progress', (event, data) => handleProgressData(data));
      } catch (e) {}
    }

    return () => {
      window.removeEventListener('auto-album-progress-direct', handleDirectEvent);
      if (ipc) {
        try { ipc.removeAllListeners('auto-album-progress'); } catch(e) {}
      }
    };
  }, []);

  // Default export folder
  useEffect(() => {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.invoke('export-video', { action: 'get-default-dir' }).then(res => {
          if (res && res.defaultDir) setExportFolder(res.defaultDir);
        }).catch(() => {});
      } catch (e) {}
    }
  }, []);

  // ── Auto Analyze Audio Beat & BPM when Audio is Loaded ──
  const analyzeAudioFileBeat = useCallback(async (audioPath) => {
    if (!audioPath || !window.require) return;
    setIsAnalyzingBeat(true);
    try {
      let res = null;
      try {
        const { ipcRenderer } = window.require('electron');
        res = await ipcRenderer.invoke('analyze-audio-beat', audioPath);
      } catch (e) {
        const { analyzeAudioBeat } = window.require('./electron/beat_analyzer.cjs');
        res = await analyzeAudioBeat(audioPath);
      }
      if (res && res.bpm) {
        setAnalyzedBpm(res.bpm);
        setAnalyzedInterval(res.interval);
      }
    } catch (err) {
      console.warn('[Beat analysis error]', err);
    } finally {
      setIsAnalyzingBeat(false);
    }
  }, []);

  // ── Helper: Process Background File Object (Image or Video) ──
  const processBgFileObject = (file) => {
    if (!file) return;
    let actualPath = file.path || file._filePath;
    if (!actualPath && window.require) {
      try {
        actualPath = window.require('electron').webUtils?.getPathForFile(file);
      } catch (err) {}
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isVid = file.type.startsWith('video/') || ['mp4', 'mov', 'webm', 'mkv', 'avi', 'flv'].includes(ext);
    const url = URL.createObjectURL(file);
    setBgPhoto({
      file,
      url,
      path: actualPath,
      name: file.name,
      isVideo: isVid
    });
  };

  // ── Handle Pick Background Media (Native Electron Dialog + Web Input Fallback) ──
  const handlePickBgPhoto = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        const filePaths = await ipcRenderer.invoke('open-media-dialog');
        if (filePaths && filePaths.length > 0) {
          const filePath = filePaths[0];
          const path = window.require('path');
          const fs = window.require('fs');
          const ext = path.extname(filePath).toLowerCase();
          const isVid = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.flv'].includes(ext);
          const mime = isVid ? 'video/mp4' : (ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg');
          const buf = fs.readFileSync(filePath);
          const blob = new Blob([buf], { type: mime });
          const url = URL.createObjectURL(blob);
          setBgPhoto({
            file: new File([blob], path.basename(filePath), { type: mime }),
            url,
            path: filePath,
            name: path.basename(filePath),
            isVideo: isVid
          });
          return;
        } else {
          return; // user cancelled dialog
        }
      } catch (err) {
        console.warn('[open-media-dialog error, using input fallback]', err);
      }
    }
    if (bgPhotoInputRef.current) {
      bgPhotoInputRef.current.value = '';
      bgPhotoInputRef.current.click();
    }
  };

  const handleBgDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBgDragOver(true);
  };

  const handleBgDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBgDragOver(false);
  };

  const handleBgDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsBgDragOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processBgFileObject(files[0]);
    }
  };

  // ── Handle Background Photo Upload (from <input type="file">) ──
  const handleBgPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processBgFileObject(file);
    e.target.value = '';
  };

  // ── Handle Custom Video Overlay Upload (~20s Loop di Depan Background) ──
  const handleCustomOverlayVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let actualPath = file.path || file._filePath;
    if (!actualPath && window.require) {
      try { actualPath = window.require('electron').webUtils?.getPathForFile(file); } catch (err) {}
    }

    const url = URL.createObjectURL(file);
    setCustomOverlayVideo({ file, url, path: actualPath, name: file.name });
    setOverlaySource('custom');
  };

  // ── Handle Song Slot Management ──
  const handleAddSong = () => {
    if (songs.length >= 20) return;
    setSongs(prev => [
      ...prev,
      {
        id: `song-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        titleArtist: '',
        file: null,
        duration: 0,
        url: null,
        audioPath: null
      }
    ]);
  };

  const handleRemoveSong = (id) => {
    if (songs.length <= 1) {
      setSongs([{ id: 'song-1', titleArtist: '', file: null, duration: 0, url: null, audioPath: null }]);
      return;
    }
    setSongs(prev => prev.filter(s => s.id !== id));
    if (playingSongId === id && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPlayingSongId(null);
    }
  };

  const handleSongTitleChange = (id, text) => {
    setSongs(prev => prev.map(s => s.id === id ? { ...s, titleArtist: text } : s));
  };

  const handleSingleSongFileChange = (id, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let actualPath = file.path || file._filePath;
    if (!actualPath && window.require) {
      try { actualPath = window.require('electron').webUtils?.getPathForFile(file); } catch (err) {}
    }

    const url = URL.createObjectURL(file);
    const tempAudio = new Audio(url);
    tempAudio.addEventListener('loadedmetadata', () => {
      const dur = tempAudio.duration || 0;
      setSongs(prev => prev.map(s => {
        if (s.id !== id) return s;
        const cleanName = file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
        const autoTitle = s.titleArtist.trim() ? s.titleArtist : cleanName;
        return {
          ...s,
          file,
          url,
          audioPath: actualPath,
          duration: dur,
          titleArtist: autoTitle
        };
      }));

      // Trigger beat analysis if first song
      if (actualPath && (id === songs[0]?.id || !analyzedBpm)) {
        analyzeAudioFileBeat(actualPath);
      }
    });
    e.target.value = '';
  };

  // ── Batch Upload Multiple Audio Files at Once ──
  const handleBatchAudioUpload = (e) => {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length === 0) return;

    const filesToLoad = fileList.slice(0, 20);
    const newSongSlots = [];

    filesToLoad.forEach((file, index) => {
      let actualPath = file.path || file._filePath;
      if (!actualPath && window.require) {
        try { actualPath = window.require('electron').webUtils?.getPathForFile(file); } catch (err) {}
      }

      const url = URL.createObjectURL(file);
      const cleanName = file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
      newSongSlots.push({
        id: `song-${Date.now()}-${index}`,
        titleArtist: cleanName,
        file,
        url,
        audioPath: actualPath,
        duration: 0
      });
    });

    // Populate duration asynchronously
    newSongSlots.forEach((slot) => {
      if (slot.url) {
        const audio = new Audio(slot.url);
        audio.addEventListener('loadedmetadata', () => {
          slot.duration = audio.duration || 0;
          setSongs(prev => [...prev]);
        });
      }
    });

    setSongs(newSongSlots);

    // Analyze beat from first file
    if (newSongSlots[0]?.audioPath) {
      analyzeAudioFileBeat(newSongSlots[0].audioPath);
    }
    e.target.value = '';
  };

  // ── Batch Paste Tracklist from Clipboard Text ──
  const handleApplyBatchText = () => {
    if (!batchText.trim()) {
      setShowBatchModal(false);
      return;
    }

    const lines = batchText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#') && !line.startsWith('['));

    if (lines.length === 0) {
      setShowBatchModal(false);
      return;
    }

    setSongs(prev => {
      const updated = [...prev];
      lines.slice(0, 20).forEach((lineText, idx) => {
        // Strip leading numbers like "1.", "01.", "1 -", etc.
        const cleanTitle = lineText.replace(/^\d+[\.\-\s)]+/, '').trim();
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], titleArtist: cleanTitle };
        } else {
          updated.push({
            id: `song-${Date.now()}-${idx}`,
            titleArtist: cleanTitle,
            file: null,
            duration: 0,
            url: null,
            audioPath: null
          });
        }
      });
      return updated;
    });

    setShowBatchModal(false);
    setBatchText('');
  };

  // ── Kolom Teks Urutan Lagu: Sinkronisasi Teks dari Slot ──
  const syncOrderTextFromSongs = useCallback((targetSongs = songs) => {
    const lines = targetSongs
      .map((s, idx) => {
        const title = s.titleArtist.trim();
        return title ? `${idx + 1}. ${title}` : `${idx + 1}.`;
      })
      .join('\n');
    setOrderText(lines);
  }, [songs]);

  // Efek inisialisasi teks urutan pertama kali
  useEffect(() => {
    if (!orderText.trim()) {
      syncOrderTextFromSongs(songs);
    }
  }, []);

  // Format otomatis penomoran 1. Judul, 2. Judul...
  const handleFormatOrderNumbers = () => {
    const rawLines = orderText.split('\n');
    let count = 1;
    const formatted = rawLines
      .map(line => {
        const clean = line.replace(/^\d+[\.\-\s)]+/, '').trim();
        if (!clean) return '';
        const res = `${count}. ${clean}`;
        count++;
        return res;
      })
      .filter(Boolean);

    setOrderText(formatted.join('\n'));
    setOrderNotification('Nomor urut berhasil diformat (1-N)');
    setTimeout(() => setOrderNotification(null), 2500);
  };

  // Bersihkan awalan nomor urut di setiap baris
  const handleCleanOrderNumbers = () => {
    const rawLines = orderText.split('\n');
    const cleaned = rawLines
      .map(line => line.replace(/^\d+[\.\-\s)]+/, '').trim())
      .filter(Boolean);

    setOrderText(cleaned.join('\n'));
    setOrderNotification('Nomor urut awal berhasil dibersihkan');
    setTimeout(() => setOrderNotification(null), 2500);
  };

  // Pindahkan baris slot langsung (Naik ▲ / Turun ▼)
  const handleMoveSong = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= songs.length) return;
    setSongs(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  // Terapkan urutan lagu dari Kolom Teks dengan Smart Audio Preservation
  const handleApplyOrderText = () => {
    const lines = orderText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#') && !line.startsWith('//') && !line.startsWith('['));

    if (lines.length === 0) {
      setOrderNotification('Kolom teks kosong. Masukkan minimal 1 baris judul lagu.');
      setTimeout(() => setOrderNotification(null), 3000);
      return;
    }

    const parsedTitles = lines
      .slice(0, 20)
      .map(line => line.replace(/^\d+[\.\-\s)]+/, '').trim())
      .filter(Boolean);

    if (parsedTitles.length === 0) {
      setOrderNotification('Tidak ditemukan judul lagu yang valid.');
      setTimeout(() => setOrderNotification(null), 3000);
      return;
    }

    setSongs(prev => {
      const usedOldIndices = new Set();
      const newSongs = [];

      // Pass 1: Exact title match (case-insensitive)
      for (let i = 0; i < parsedTitles.length; i++) {
        const targetTitle = parsedTitles[i].toLowerCase();
        const foundIdx = prev.findIndex((s, idx) => 
          !usedOldIndices.has(idx) && s.titleArtist.trim().toLowerCase() === targetTitle
        );
        if (foundIdx !== -1) {
          usedOldIndices.add(foundIdx);
          newSongs[i] = {
            ...prev[foundIdx],
            titleArtist: parsedTitles[i]
          };
        }
      }

      // Pass 2: Fuzzy match (variasi judul parsial)
      for (let i = 0; i < parsedTitles.length; i++) {
        if (newSongs[i]) continue;
        const targetTitle = parsedTitles[i].toLowerCase();
        const foundIdx = prev.findIndex((s, idx) => {
          if (usedOldIndices.has(idx)) return false;
          const oldTitle = s.titleArtist.trim().toLowerCase();
          if (!oldTitle) return false;
          return oldTitle.includes(targetTitle) || targetTitle.includes(oldTitle);
        });
        if (foundIdx !== -1) {
          usedOldIndices.add(foundIdx);
          newSongs[i] = {
            ...prev[foundIdx],
            titleArtist: parsedTitles[i]
          };
        }
      }

      // Pass 3: Position fallback (jika slot indeks i belum terpakai)
      for (let i = 0; i < parsedTitles.length; i++) {
        if (newSongs[i]) continue;
        if (prev[i] && !usedOldIndices.has(i)) {
          usedOldIndices.add(i);
          newSongs[i] = {
            ...prev[i],
            titleArtist: parsedTitles[i]
          };
        } else {
          newSongs[i] = {
            id: `song-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            titleArtist: parsedTitles[i],
            file: null,
            duration: 0,
            url: null,
            audioPath: null
          };
        }
      }

      return newSongs;
    });

    setOrderNotification(`Urutan ${parsedTitles.length} lagu berhasil diterapkan!`);
    setTimeout(() => setOrderNotification(null), 3000);
  };

  // ── Audio Preview Playback ──
  const handleTogglePlaySong = (song) => {
    if (!song.url) return;
    if (playingSongId === song.id) {
      if (previewAudioRef.current) previewAudioRef.current.pause();
      setPlayingSongId(null);
    } else {
      if (previewAudioRef.current) previewAudioRef.current.pause();
      const audio = new Audio(song.url);
      previewAudioRef.current = audio;
      audio.play().catch(() => {});
      audio.onended = () => setPlayingSongId(null);
      setPlayingSongId(song.id);
    }
  };

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  // ── Direct AI Image Generation ──
  const handleGenerateAiImageDirect = async () => {
    setIsGeneratingAi(true);
    setAiGenError(null);
    setAiGenSuccess(null);

    try {
      const payload = {
        customPrompt: generatedBgPrompt,
        provider: aiProvider,
        apiKey: aiApiKey
      };

      let res = null;
      if (window.require) {
        try {
          const { ipcRenderer } = window.require('electron');
          res = await ipcRenderer.invoke('generate-ai-image', payload);
        } catch (e) {
          const { generateAiImage } = window.require('./electron/ai_prompter.cjs');
          res = await generateAiImage(payload);
        }
      } else {
        throw new Error('Fitur ini membutuhkan runtime Electron.');
      }

      if (!res || !res.success) {
        throw new Error(res?.error || 'Gagal menghasilkan gambar AI.');
      }

      setGeneratedAiImage(res);
      setAiGenSuccess('Gambar AI berhasil dibuat!');

      // Automatically set as background photo
      setBgPhoto({
        path: res.imagePath,
        url: res.imageUrl,
        name: res.filename
      });

    } catch (err) {
      console.error('[handleGenerateAiImageDirect error]', err);
      setAiGenError(err.message || String(err));
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // ── Pick Export Folder ──
  const handlePickExportFolder = async () => {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        const res = await ipcRenderer.invoke('export-video', { action: 'pick-folder' });
        if (res && res.folderPath) {
          setExportFolder(res.folderPath);
        }
      } catch (e) {}
    }
  };

  // ── Generate Final Video (Mendukung Full Album & Review Cepat Maks 3 Lagu) ──
  const handleGenerateFinalVideo = async (options = {}) => {
    const { isReviewOnly = false } = options;
    const validSongs = songs.filter(s => s.file && s.titleArtist.trim());
    if (validSongs.length === 0) {
      alert('Data lagu belum lengkap. Unggah minimal 1 lagu dengan file audio.');
      return;
    }

    const songsToUse = isReviewOnly ? validSongs.slice(0, 3) : validSongs;

    const activeBgFile = bgPhoto;
    if (!activeBgFile) {
      alert('Silakan upload Foto Background (16:9) terlebih dahulu atau gunakan gambar dari Agen AI di bawah.');
      return;
    }

    if (!window.require) {
      alert('Fitur pembuatan video lengkap membutuhkan runtime Electron.');
      return;
    }

    // Resolve audio paths
    const processedSongs = [];
    for (let i = 0; i < songsToUse.length; i++) {
      const s = songsToUse[i];
      let aPath = s.audioPath;
      if (!aPath && window.require) {
        try { aPath = window.require('electron').webUtils?.getPathForFile(s.file); } catch (e) {}
      }
      if (!aPath) {
        try {
          const fs = window.require('fs');
          const path = window.require('path');
          const os = window.require('os');
          const ab = await s.file.arrayBuffer();
          const ext = s.file.name.endsWith('.wav') ? '.wav' : '.mp3';
          const tmpAudio = path.join(os.tmpdir(), `shotai_song_${i}_${Date.now()}${ext}`);
          fs.writeFileSync(tmpAudio, Buffer.from(ab));
          aPath = tmpAudio;
        } catch (err) {
          alert(`Gagal menyiapkan file audio "${s.titleArtist}": ${err.message}`);
          return;
        }
      }
      processedSongs.push({
        titleArtist: s.titleArtist,
        filePath: aPath,
        duration: s.duration
      });
    }

    // Resolve background photo path
    let resolvedBgPath = activeBgFile.path;
    if (!resolvedBgPath) {
      try {
        const fs = window.require('fs');
        const path = window.require('path');
        const os = window.require('os');
        const ab = await activeBgFile.file.arrayBuffer();
        const ext = activeBgFile.isVideo ? '.mp4' : (activeBgFile.name?.endsWith('.png') ? '.png' : '.jpg');
        const tmpBg = path.join(os.tmpdir(), `shotai_bg_${Date.now()}${ext}`);
        fs.writeFileSync(tmpBg, Buffer.from(ab));
        resolvedBgPath = tmpBg;
      } catch (err) {
        alert('Gagal menyiapkan media background: ' + err.message);
        return;
      }
    }

    // Resolve custom overlay video path if used
    let resolvedCustomOverlayPath = null;
    if (overlaySource === 'custom' && customOverlayVideo) {
      resolvedCustomOverlayPath = customOverlayVideo.path;
      if (!resolvedCustomOverlayPath && customOverlayVideo.file && window.require) {
        try {
          const fs = window.require('fs');
          const path = window.require('path');
          const os = window.require('os');
          const ab = await customOverlayVideo.file.arrayBuffer();
          const ext = customOverlayVideo.file.name.endsWith('.mov') ? '.mov' : '.mp4';
          const tmpVid = path.join(os.tmpdir(), `shotai_custom_overlay_${Date.now()}${ext}`);
          fs.writeFileSync(tmpVid, Buffer.from(ab));
          resolvedCustomOverlayPath = tmpVid;
        } catch (err) {
          console.warn('[Prepare custom overlay warning]', err);
        }
      }
    }

    // Resolve vinyl custom cover photo if uploaded
    let resolvedCover1to1Path = resolvedBgPath;
    if (vinylCoverPhoto) {
      let resolvedVinylCover = vinylCoverPhoto.path;
      if (!resolvedVinylCover && vinylCoverPhoto.file && window.require) {
        try {
          const fs = window.require('fs');
          const path = window.require('path');
          const os = window.require('os');
          const ab = await vinylCoverPhoto.file.arrayBuffer();
          const tmpCover = path.join(os.tmpdir(), `shotai_vinyl_cover_${Date.now()}.png`);
          fs.writeFileSync(tmpCover, Buffer.from(ab));
          resolvedVinylCover = tmpCover;
        } catch (err) {
          console.warn('[Prepare vinyl cover warning]', err);
        }
      }
      if (resolvedVinylCover) {
        resolvedCover1to1Path = resolvedVinylCover;
      }
    }

    setIsRendering(true);
    setRenderProgress(0);
    setRenderTimemark('00:00:00');
    setRenderResult(null);
    setRenderError(null);

    try {
      const titleText = (albumTitle.trim() || 'BEST AUTO ALBUM') + (isReviewOnly ? ' (REVIEW 3 LAGU)' : '');
      const payload = {
        albumTitle: titleText,
        backgroundType: 'image',
        bgSourcePath: resolvedBgPath,
        coverImagePath: resolvedCover1to1Path,
        cover1to1Path: resolvedCover1to1Path,
        useVisualizer,
        visualizerType,
        visualizerPosY,
        visualizerPosX,
        useJedakJeduk,
        beatMode,
        bpm: activeBpm,
        useVinylPlayer,
        vinylModel,
        overlayEffects: overlaySource === 'preset' ? activeEffectsList.map(e => e.id) : (resolvedCustomOverlayPath ? ['custom'] : []),
        overlayEffect: overlaySource === 'preset' ? (activeEffectsList[0]?.id || 'none') : 'custom',
        customOverlayVideoPath: resolvedCustomOverlayPath,
        overlayOpacity,
        songs: processedSongs,
        exportFolder: exportFolder || undefined
      };

      let res = null;
      try {
        const path = window.require('path');
        const fullPath = path.join(window.process.cwd(), 'electron', 'auto_album.cjs');
        try { delete window.require.cache[window.require.resolve(fullPath)]; } catch(e) {}
        try { delete window.require.cache[fullPath]; } catch(e) {}
        const autoAlbumModule = window.require(fullPath);
        res = await autoAlbumModule.handleGenerateAutoAlbum(null, payload, null);
      } catch (directErr) {
        const { ipcRenderer } = window.require('electron');
        res = await ipcRenderer.invoke('generate-auto-album', payload);
      }

      if (res && res.success) {
        setRenderResult(res);
      } else {
        setRenderError(res?.error || 'Render video gagal.');
      }
    } catch (err) {
      setRenderError(err.message || 'Terjadi kesalahan sistem saat render.');
    } finally {
      setIsRendering(false);
    }
  };

  const handleCancelRender = async () => {
    if (window.require) {
      try {
        const path = window.require('path');
        const fullPath = path.join(window.process.cwd(), 'electron', 'auto_album.cjs');
        const autoAlbumModule = window.require(fullPath);
        autoAlbumModule.cancelAutoAlbum();
      } catch (e) {}
      try {
        const { ipcRenderer } = window.require('electron');
        await ipcRenderer.invoke('cancel-auto-album');
      } catch (e) {}
    }
    setIsRendering(false);
    setRenderProgress(0);
  };

  const handleOpenFolder = (targetPath) => {
    if (window.require && targetPath) {
      try {
        const { shell } = window.require('electron');
        shell.showItemInFolder(targetPath);
      } catch (e) {}
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-100 overflow-hidden select-none">

      {/* ── TOP NAVIGATION BAR ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#27272a] bg-[#111113] z-20 gap-3">
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSafeBack}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-300 hover:text-white border border-[#27272a] transition-all cursor-pointer"
            title="Kembali ke AI Studio"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Disc3 size={18} className="animate-spin-slow" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">Auto Album</h2>
            </div>
          </div>
        </div>

        {/* Input Kolom Judul Album (Bisa langsung diedit oleh user) */}
        <div className="flex-1 max-w-xs sm:max-w-md mx-2">
          <div className="flex items-center gap-2 bg-[#18181b] border border-[#27272a] hover:border-zinc-500 focus-within:border-[#00d8b6] rounded-xl px-3 py-1.5 transition-colors shadow-inner">
            <Edit3 size={13} className="text-[#00d8b6] shrink-0" />
            <span className="text-[11px] font-bold text-zinc-400 whitespace-nowrap hidden sm:inline">Judul Album:</span>
            <input
              type="text"
              value={albumTitle}
              onChange={e => setAlbumTitle(e.target.value)}
              placeholder="Contoh: BEST RELAXING ACOUSTIC 2026"
              className="w-full bg-transparent text-xs text-white font-semibold focus:outline-none placeholder-zinc-500"
              title="Ketik untuk mengubah judul album (misal: BEST RELAXING ACOUSTIC 2026)"
            />
          </div>
        </div>

        {/* Action Header Stats */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-xs">
            <Clock size={13} className="text-[#00d8b6]" />
            <span className="text-zinc-400">Total Durasi:</span>
            <span className="font-semibold text-white">{formatDuration(totalDurationSec)}</span>
            <span className="text-zinc-500 hidden sm:inline">({songs.filter(s => s.file && s.titleArtist.trim()).length} Lagu Siap)</span>
          </div>

          <button
            onClick={() => {
              if (confirm('Reset seluruh isian Auto Album?')) {
                try { localStorage.removeItem('shotai_autoalbum_persistent_state'); } catch(e) {}
                setAlbumTitle('BEST RELAXING ACOUSTIC 2026');
                setBgPhoto(null);
                setVinylCoverPhoto(null);
                setCustomOverlayVideo(null);
                setOverlaySource('preset');
                setSelectedCatEffects({
                  particles: 'atmospheric',
                  linght: 'none'
                });
                setSongs([{ id: 'song-1', titleArtist: '', file: null, duration: 0, url: null, audioPath: null }]);
                setRenderResult(null);
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-[#27272a] rounded-lg transition-colors cursor-pointer"
            title="Reset Form"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* ── MAIN SCROLLABLE WORKSPACE ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* ── 1. SECTION: FOTO BACKGROUND & EFEK VIDEO OVERLAY ── */}
        <div className="p-5 rounded-xl bg-[#141417] border border-[#27272a] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#27272a]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers size={16} className="text-[#00d8b6]" />
              1. Background & Efek Video
            </h3>

            {/* Kolom Input Judul Album di Section 1 */}
            <div className="flex items-center gap-2 w-full sm:w-80">
              <span className="text-[11px] font-bold text-zinc-400 whitespace-nowrap">Judul Album:</span>
              <input
                type="text"
                value={albumTitle}
                onChange={e => setAlbumTitle(e.target.value)}
                placeholder="Ketik judul album di sini..."
                className="w-full px-3 py-1.5 text-xs bg-[#18181b] border border-[#27272a] focus:border-[#00d8b6] rounded-lg text-white font-medium focus:outline-none transition-colors"
                title="Ubah judul album"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            
            {/* Box Foto Background Utama (6 cols) */}
            <div className="md:col-span-6 flex flex-col p-4 rounded-xl bg-[#18181b]/70 border border-[#27272a] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-amber-400" />
                  Background Utama (16:9)
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  Foto / Video Looping
                </span>
              </div>

              <input
                ref={bgPhotoInputRef}
                type="file"
                accept="image/*,video/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.jfif,.mp4,.mov,.webm,.mkv"
                className="hidden"
                onChange={handleBgPhotoUpload}
              />

              {bgPhoto ? (
                <div className="relative group rounded-lg overflow-hidden border border-[#27272a] bg-black/40 flex-1 min-h-[220px] flex items-center justify-center">
                  {bgPhoto.isVideo ? (
                    <video src={bgPhoto.url} className="w-full h-full object-cover max-h-[240px]" autoPlay loop muted playsInline />
                  ) : (
                    <img src={bgPhoto.url} alt="Background Preview" className="w-full h-full object-cover max-h-[240px]" />
                  )}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-semibold text-[#00d8b6] border border-[#00d8b6]/30 backdrop-blur-sm flex items-center gap-1">
                    {bgPhoto.isVideo ? <Film size={11} /> : <ImageIcon size={11} />}
                    <span>{bgPhoto.isVideo ? 'Video Background' : 'Foto Background'}</span>
                  </div>
                  <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
                    <p className="text-xs text-white font-medium px-3 text-center truncate max-w-[90%]">{bgPhoto.name}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePickBgPhoto}
                        className="px-3 py-1.5 text-xs font-semibold bg-[#00d8b6] hover:bg-[#00c2a2] text-black rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
                      >
                        <Upload size={13} />
                        Ganti Background
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setBgPhoto(null); }}
                        className="p-1.5 text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Background"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={handlePickBgPhoto}
                  onDragOver={handleBgDragOver}
                  onDragLeave={handleBgDragLeave}
                  onDrop={handleBgDrop}
                  className={`flex-1 min-h-[220px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-5 text-center cursor-pointer transition-all group ${
                    isBgDragOver
                      ? 'border-[#00d8b6] bg-[#00d8b6]/10 shadow-[0_0_15px_rgba(0,216,182,0.2)]'
                      : 'border-[#27272a] hover:border-[#00d8b6]/60 bg-[#141417] hover:bg-[#18181d]'
                  }`}
                >
                  <div className="p-3.5 rounded-full bg-[#27272a] group-hover:bg-[#00d8b6]/15 text-zinc-400 group-hover:text-[#00d8b6] mb-2.5 transition-colors shadow-inner">
                    <Upload size={24} />
                  </div>
                  <p className="text-xs font-bold text-white mb-1">
                    Upload Foto / Video Background (16:9)
                  </p>
                  <p className="text-[11px] text-zinc-400 mb-2.5 max-w-[260px] leading-tight">
                    Klik di sini atau tarik & lepas (drag and drop) file ke area ini
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#00d8b6] hover:bg-[#00c2a2] text-black text-xs font-bold transition-transform group-hover:scale-105 shadow-md">
                    <Upload size={13} />
                    <span>Pilih File Media</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 mt-2.5 font-mono">
                    JPG, PNG, WEBP, MP4, MOV, WEBM (16:9)
                  </span>
                </div>
              )}
            </div>

            {/* Kolom Kanan: Efek Video Overlay & Visualizer (6 cols) */}
            <div className="md:col-span-6 flex flex-col gap-5">
              
              {/* Box Efek Video Overlay */}
              <div className="flex flex-col p-4 rounded-xl bg-[#18181b]/70 border border-[#27272a] space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-pink-400" />
                    Efek Video
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-pink-500/15 text-pink-300 border border-pink-500/30 font-semibold">
                    Screen Blend
                  </span>
                </div>

                {/* Menu Kelompok Efek Video */}
                <div className="grid grid-cols-3 gap-1 bg-[#141417] p-1 rounded-lg border border-[#27272a] text-xs">
                  {VIDEO_EFFECT_CATEGORIES.map(cat => {
                    const isCatActive = overlaySource === 'preset' && overlayEffectCategory === cat.id;
                    const catEffectsCount = cat.effects.length - 1; // exclude none
                    const isEffectActiveInCat = selectedCatEffects[cat.id] && selectedCatEffects[cat.id] !== 'none';
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectEffectCategory(cat.id)}
                        className={`py-1.5 px-1.5 rounded font-semibold transition-all cursor-pointer truncate text-center flex items-center justify-center gap-1.5 ${
                          isCatActive
                            ? 'bg-[#00d8b6] text-black shadow-sm font-bold'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                        title={`${cat.name} (${catEffectsCount} Efek)${isEffectActiveInCat ? ' - Efek Sedang Aktif' : ''}`}
                      >
                        <span className="truncate">{cat.name}</span>
                        {isEffectActiveInCat && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCatActive ? 'bg-black ring-1 ring-black/40' : 'bg-[#00d8b6] shadow-[0_0_6px_#00d8b6]'}`}
                            title={`Aktif: ${selectedCatEffects[cat.id]}`}
                          />
                        )}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setOverlaySource('custom')}
                    className={`py-1.5 px-1.5 rounded font-semibold transition-all cursor-pointer truncate text-center flex items-center justify-center gap-1.5 ${
                      overlaySource === 'custom'
                        ? 'bg-[#00d8b6] text-black shadow-sm font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Upload Video Kustom"
                  >
                    <span>Kustom</span>
                    {overlaySource === 'custom' && customOverlayVideo && (
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-black" />
                    )}
                  </button>
                </div>

                {/* Ringkasan Efek Video Aktif Bersamaan */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-[#0c0c0e] border border-[#27272a] text-xs">
                  <span className="text-[11px] font-semibold text-zinc-400">Efek Aktif:</span>
                  {activeEffectsList.length > 0 ? (
                    <>
                      {activeEffectsList.map(eff => (
                        <span
                          key={eff.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00d8b6]/15 border border-[#00d8b6]/35 text-[#00d8b6] font-semibold text-[10px]"
                        >
                          <Sparkles size={10} />
                          <span>{eff.catName ? `${eff.catName}: ` : ''}{eff.name}</span>
                          {!eff.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleSelectCategoryEffect(eff.catId, 'none')}
                              className="ml-0.5 hover:text-white text-zinc-400 hover:bg-white/10 rounded-full w-3.5 h-3.5 flex items-center justify-center cursor-pointer transition-colors"
                              title="Nonaktifkan efek ini (pilih None)"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                      {activeEffectsList.length > 1 && (
                        <span className="text-[10px] text-emerald-400 font-medium ml-auto">
                          ({activeEffectsList.length} Efek Aktif Bersamaan)
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-zinc-500 text-[11px] italic">Semua efek nonaktif (None)</span>
                  )}
                </div>

                {overlaySource === 'preset' ? (
                  <div className="space-y-1.5">
                    {(() => {
                      const activeCat = VIDEO_EFFECT_CATEGORIES.find(c => c.id === overlayEffectCategory) || VIDEO_EFFECT_CATEGORIES[0];
                      const currentSelection = selectedCatEffects[activeCat.id] || 'none';
                      return (
                        <>
                          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300">
                            <span>Pilih Efek {activeCat.name}:</span>
                            <span className="text-[10px] text-zinc-500 font-normal">
                              {activeCat.effects.length} opsi (ada None)
                            </span>
                          </div>
                          <select
                            value={currentSelection}
                            onChange={e => handleSelectCategoryEffect(activeCat.id, e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-[#141417] border border-[#27272a] focus:border-[#00d8b6] rounded-lg text-white focus:outline-none cursor-pointer"
                          >
                            {activeCat.effects.map(eff => (
                              <option key={eff.id} value={eff.id} className="bg-[#141417] text-white">
                                {eff.name} {eff.file ? `(${eff.desc})` : ''}
                              </option>
                            ))}
                          </select>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      ref={customOverlayVideoInputRef}
                      type="file"
                      accept="video/mp4, video/quicktime, video/webm"
                      className="hidden"
                      onChange={handleCustomOverlayVideoUpload}
                    />

                    {customOverlayVideo ? (
                      <div className="relative group rounded-lg overflow-hidden border border-[#27272a] bg-black/40 h-28 flex items-center justify-center">
                        <video src={customOverlayVideo.url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2 text-center">
                          <p className="text-xs text-white font-medium truncate max-w-[90%]">{customOverlayVideo.name}</p>
                          <button
                            type="button"
                            onClick={() => customOverlayVideoInputRef.current?.click()}
                            className="px-2.5 py-1 text-xs font-semibold bg-[#00d8b6] hover:bg-[#00c2a2] text-black rounded-lg transition-colors cursor-pointer"
                          >
                            Ganti Video Overlay
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => customOverlayVideoInputRef.current?.click()}
                        className="h-28 border-2 border-dashed border-[#27272a] hover:border-pink-500/60 bg-[#141417] rounded-lg flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all group"
                      >
                        <Upload size={18} className="text-pink-400 mb-1" />
                        <p className="text-xs font-semibold text-zinc-200">Upload Video Overlay Sendiri (~20s)</p>
                        <p className="text-[10px] text-zinc-500">MP4 / WEBM / MOV (Otomatis diloop di depan background)</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Slider Opacity Overlay */}
                <div className="space-y-1 pt-1 border-t border-[#27272a]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Kepekatan Efek (Opacity):</span>
                    <span className="text-[#00d8b6] font-bold font-mono">{Math.round(overlayOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={overlayOpacity}
                    onChange={e => setOverlayOpacity(Number(e.target.value))}
                    className="w-full accent-[#00d8b6] h-1.5 bg-[#141417] rounded-lg cursor-pointer"
                  />
                </div>

                {/* Mini Pratinjau Komposit Video di Depan Background */}
                <div className="relative w-full h-24 rounded-lg overflow-hidden border border-[#27272a] bg-black flex items-center justify-center shadow-inner">
                  {bgPhoto?.url ? (
                    bgPhoto.isVideo ? (
                      <video src={bgPhoto.url} className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline />
                    ) : (
                      <img src={bgPhoto.url} alt="Mini Preview BG" className="absolute inset-0 w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="absolute inset-0 bg-[#141417]" />
                  )}
                  {Object.entries(effectBlobUrls).map(([effId, url]) => (
                    <video
                      key={effId}
                      src={url}
                      className="absolute inset-0 w-full h-full object-cover mix-blend-screen pointer-events-none"
                      style={{ opacity: overlayOpacity }}
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ))}
                  <div className="absolute bottom-1 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-semibold text-zinc-300 backdrop-blur-sm border border-white/10">
                    Live Mini: Video di Depan Background
                  </div>
                </div>

              </div>

              {/* Box Visualizer Tengah (5 Style Modern) */}
              <div className="flex flex-col p-4 rounded-xl bg-[#18181b]/70 border border-[#27272a] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={15} className="text-[#00d8b6]" />
                    <span className="text-xs font-bold text-white">Visualizer Audio</span>
                  </div>
                  <div
                    onClick={() => setUseVisualizer(prev => !prev)}
                    className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#141417] border border-[#27272a] hover:border-[#00d8b6]/40 cursor-pointer select-none transition-colors"
                  >
                    <span className="text-[11px] font-semibold text-zinc-300">{useVisualizer ? 'ON' : 'OFF'}</span>
                    <div className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-colors ${useVisualizer ? 'bg-[#00d8b6]' : 'bg-zinc-700'}`}>
                      <div className={`bg-black w-3 h-3 rounded-full shadow-md transform transition-transform ${useVisualizer ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                </div>

                {useVisualizer && (
                  <div className="pt-2 border-t border-[#27272a]">
                    <select
                      value={visualizerType}
                      onChange={e => setVisualizerType(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#141417] border border-[#27272a] focus:border-[#00d8b6] rounded-lg text-white font-medium focus:outline-none cursor-pointer"
                    >
                      {VISUALIZER_TYPES_LIST.map(vis => (
                        <option key={vis.id} value={vis.id} className="bg-[#141417] text-white py-1">
                          {vis.name} ({vis.badge})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>


            </div>

          </div>
        </div>

        {/* ── 2. SECTION: LAYAR REVIEW VIDEO (PRATINJAU GABUNGAN - MAKS 3 LAGU) ── */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-[#141417] via-[#16161a] to-[#121215] border border-[#00d8b6]/40 shadow-xl shadow-[#00d8b6]/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#27272a]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#00d8b6]/15 text-[#00d8b6] border border-[#00d8b6]/30 shadow-sm">
                <MonitorPlay size={18} />
              </div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                2. Preview Video
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#00d8b6]/20 text-[#00d8b6] border border-[#00d8b6]/30">
                  Live Preview
                </span>
              </h3>
            </div>

            {/* Badges Info Ringkas */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#18181b] border border-[#27272a] text-xs font-semibold text-zinc-300">
                <Music2 size={13} className="text-[#00d8b6]" />
                <span>Total Input: <strong>{totalInputtedSongsCount} Lagu</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#00d8b6]/10 border border-[#00d8b6]/30 text-xs font-semibold text-[#00d8b6]">
                <Sparkles size={13} />
                <span>Review: <strong>{validReviewSongs.length} / {songs.length} Lagu</strong></span>
              </div>
            </div>
          </div>

          {/* ── 16:9 Widescreen Review Canvas / Screen ── */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-[#27272a] shadow-2xl flex items-center justify-center group select-none">
            
            {/* Layer 1: Background Media (Foto / Video Utama 16:9) */}
            <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center">
              {bgPhoto?.url ? (
                bgPhoto.isVideo ? (
                  <video
                    ref={reviewBgVideoRef}
                    src={bgPhoto.url}
                    className="w-full h-full object-cover transition-transform"
                    style={{
                      transform: isReviewPlaying && useJedakJeduk ? 'scale(1.038)' : 'scale(1.0)',
                      transition: 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={bgPhoto.url}
                    alt="Review Background"
                    className="w-full h-full object-cover transition-transform"
                    style={{
                      transform: isReviewPlaying && useJedakJeduk ? 'scale(1.038)' : 'scale(1.0)',
                      transition: 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}
                  />
                )
              ) : null}
            </div>

            {/* Layer 2: Overlay Effect Videos DI DEPAN BACKGROUND (Screen Blend - Multi-Efek Simultan) */}
            {Object.entries(effectBlobUrls).map(([effId, url]) => (
              <video
                key={effId}
                ref={el => {
                  if (el) reviewEffectVideosRef.current[effId] = el;
                  else delete reviewEffectVideosRef.current[effId];
                }}
                src={url}
                className="absolute inset-0 w-full h-full object-cover mix-blend-screen pointer-events-none"
                style={{ opacity: overlayOpacity }}
                loop
                muted
                playsInline
              />
            ))}

            {/* Layer 3: Visualizer Efek Tengah (5 Gaya Modern & Posisi Dinamis) */}
            {useVisualizer && (
              <AudioWaveVisualizer
                isPlaying={isReviewPlaying}
                audioRef={reviewAudioRef}
                visualizerType={visualizerType}
                bpm={activeBpm}
                offsetY={visualizerPosY}
                offsetX={visualizerPosX}
              />
            )}
            {/* Layer 4: Pemutar Piringan Hitam (Vinyl Player di Kiri Bawah Layar - 6 Model Pilihan) */}
            {useVinylPlayer && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleCycleVinylModel();
                }}
                title={`Model: ${activeVinylModelObj.name} (${VINYL_MODELS_LIST.findIndex(m => m.id === vinylModel) + 1}/6) - Klik untuk ganti model`}
                className={`absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-2.5 pr-3.5 sm:pr-4 shadow-2xl flex items-center gap-3 sm:gap-3.5 max-w-[280px] sm:max-w-[340px] pointer-events-auto select-none transition-all cursor-pointer group hover:scale-[1.02] border ${activeVinylModelObj.borderClass} ${activeVinylModelObj.bgClass}`}
              >
                {/* Floating tooltip hint on hover */}
                <div className="absolute -top-2.5 right-2 px-1.5 py-0.5 rounded-md bg-black/90 border border-white/20 text-[8px] font-mono opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-zinc-300 shadow-lg pointer-events-none">
                  <RefreshCw size={8} className="text-[#00d8b6] animate-spin" />
                  <span>Klik ganti model ({VINYL_MODELS_LIST.findIndex(m => m.id === vinylModel) + 1}/6)</span>
                </div>

                {/* Vinyl & Sleeve Assembly */}
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 flex items-center">
                  {/* Piringan Hitam (Vinyl Record) - Keluar Sedikit & Berputar */}
                  <div
                    className="absolute top-0 left-3.5 sm:left-4.5 w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-2xl flex items-center justify-center select-none animate-vinyl-spin"
                    style={{
                      background: activeVinylModelObj.vinylGradient,
                      boxShadow: vinylModel === 'neon'
                        ? '0 0 14px rgba(236,72,153,0.5), inset 0 0 4px rgba(0,216,182,0.5)'
                        : vinylModel === 'gold'
                        ? '0 0 14px rgba(251,191,36,0.4), inset 0 0 4px rgba(255,255,255,0.4)'
                        : vinylModel === 'hologram'
                        ? '0 0 14px rgba(168,85,247,0.5), inset 0 0 4px rgba(56,189,248,0.5)'
                        : '0 4px 16px rgba(0,0,0,0.85), inset 0 0 3px rgba(255,255,255,0.2)',
                      animationPlayState: isReviewPlaying ? 'running' : 'paused',
                      transformOrigin: 'center center'
                    }}
                  >
                    {/* Alur Piringan Hitam (Concentric Vinyl Grooves) */}
                    <div className="absolute inset-1 rounded-full border border-white/15 opacity-70 pointer-events-none" />
                    <div className="absolute inset-2 sm:inset-2.5 rounded-full border border-white/10 opacity-50 pointer-events-none" />
                    <div className="absolute inset-3 sm:inset-4 rounded-full border border-white/15 opacity-60 pointer-events-none" />

                    {/* Center Vinyl Label dengan Foto Upload */}
                    <div className="relative w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden border border-white/40 shadow-inner flex items-center justify-center bg-zinc-800">
                      {activeVinylImage ? (
                        <img
                          src={activeVinylImage}
                          alt="Vinyl Center Label"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: `linear-gradient(135deg, ${activeVinylModelObj.accent}, #7c3aed)` }}
                        >
                          <Music2 size={10} className="text-black" />
                        </div>
                      )}
                      {/* Lubang Poros Tengah (Spindle Hole) */}
                      <div className="absolute w-1.5 h-1.5 rounded-full bg-black border border-white/60 shadow-inner" />
                    </div>
                  </div>

                  {/* Stylized Tonearm (Jarum Pemutar) for models with hasTonearm */}
                  {activeVinylModelObj.hasTonearm && (
                    <div className="absolute -top-1 right-[-6px] sm:right-[-8px] z-20 pointer-events-none">
                      {vinylModel === 'vintage' ? (
                        /* Vintage Brass Tonearm */
                        <div className="relative">
                          {/* Pivot Base */}
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-600 border border-amber-300 shadow-md flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-amber-200" />
                          </div>
                          {/* Arm bar angled across to vinyl */}
                          <div 
                            className="w-5 sm:w-6 h-0.5 bg-gradient-to-r from-amber-400 to-amber-200 origin-top-left shadow-sm"
                            style={{
                              transform: isReviewPlaying ? 'rotate(38deg)' : 'rotate(15deg)',
                              transition: 'transform 0.4s ease-out'
                            }}
                          >
                            {/* Needle Cartridge */}
                            <div className="absolute right-0 -bottom-0.5 w-1.5 h-1.5 bg-amber-100 rounded-sm border border-amber-500 shadow-inner" />
                          </div>
                        </div>
                      ) : (
                        /* Minimalist Modern Tonearm */
                        <div className="relative">
                          {/* Pivot Base */}
                          <div className="w-2.5 h-2.5 rounded-full bg-zinc-400 border border-white shadow-md flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-sky-400" />
                          </div>
                          {/* Arm bar angled across */}
                          <div 
                            className="w-5 sm:w-6 h-0.5 bg-gradient-to-r from-zinc-300 to-white origin-top-left shadow-sm"
                            style={{
                              transform: isReviewPlaying ? 'rotate(38deg)' : 'rotate(15deg)',
                              transition: 'transform 0.4s ease-out'
                            }}
                          >
                            {/* Stylus Head */}
                            <div className="absolute right-0 -bottom-0.5 w-1.5 h-1 bg-sky-400 rounded-xs shadow-sm" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cover Jaket / Sleeve Piringan Hitam di Depan */}
                  <div 
                    className={`relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl overflow-hidden shadow-2xl shrink-0 ${
                      vinylModel === 'vintage'
                        ? 'border-2 border-amber-700/80 bg-[#25150c]'
                        : vinylModel === 'gold'
                        ? 'border-2 border-amber-400/80 shadow-[0_0_10px_rgba(251,191,36,0.3)] bg-[#1e1505]'
                        : vinylModel === 'neon'
                        ? 'border border-pink-500/60 shadow-[0_0_10px_rgba(236,72,153,0.35)] bg-[#14061e]'
                        : vinylModel === 'hologram'
                        ? 'border border-purple-400/50 backdrop-blur-md bg-purple-950/40 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                        : 'border border-white/20 bg-zinc-900'
                    }`}
                  >
                    {activeVinylImage ? (
                      <img
                        src={activeVinylImage}
                        alt="Album Sleeve"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                        <Disc3 size={22} style={{ color: activeVinylModelObj.accent }} />
                      </div>
                    )}
                    {/* Efek Mulut Kantung Sleeve (Pocket Slit Highlight) */}
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-l from-black/70 to-transparent" />
                  </div>
                </div>

                {/* Track Info (Judul Lagu & Artis) */}
                <div className="flex flex-col min-w-0 pr-1 select-none">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {/* Animated Equalizer mini bars */}
                    <div className="flex items-end gap-0.5 h-3">
                      <span
                        className={`w-0.5 rounded-full transition-all duration-200 ${
                          isReviewPlaying ? 'h-3 animate-pulse' : 'h-1'
                        }`}
                        style={{ backgroundColor: activeVinylModelObj.accent }}
                      />
                      <span
                        className={`w-0.5 rounded-full transition-all duration-300 ${
                          isReviewPlaying ? 'h-2 animate-bounce' : 'h-1.5'
                        }`}
                        style={{ backgroundColor: activeVinylModelObj.accent }}
                      />
                      <span
                        className={`w-0.5 rounded-full transition-all duration-150 ${
                          isReviewPlaying ? 'h-3.5 animate-pulse' : 'h-1'
                        }`}
                        style={{ backgroundColor: activeVinylModelObj.accent }}
                      />
                    </div>
                    <span 
                      className="text-[8px] sm:text-[9px] font-extrabold tracking-wider uppercase"
                      style={{ color: activeVinylModelObj.accent }}
                    >
                      {isReviewPlaying ? 'PLAYING' : 'PAUSED'}
                    </span>
                    {/* Model Badge */}
                    <span className={`text-[7px] sm:text-[8px] font-mono px-1 py-0.2 rounded border ${activeVinylModelObj.badgeClass}`}>
                      {activeVinylModelObj.badge}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-zinc-500 font-medium ml-0.5">
                      #{String(reviewSongIndex + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Judul Lagu */}
                  <p
                    className={`text-xs sm:text-[13px] font-bold truncate max-w-[130px] sm:max-w-[170px] leading-tight ${activeVinylModelObj.titleColor}`}
                    title={parsedSongInfo?.title || 'Judul Lagu'}
                  >
                    {parsedSongInfo?.title || 'Judul Lagu'}
                  </p>

                  {/* Nama Artis */}
                  <p
                    className={`text-[9px] sm:text-[10px] truncate max-w-[130px] sm:max-w-[170px] leading-tight mt-0.5 ${activeVinylModelObj.artistColor}`}
                    title={parsedSongInfo?.artist || 'Auto Album'}
                  >
                    {parsedSongInfo?.artist || 'Auto Album'}
                  </p>
                </div>
              </div>
            )}

            {/* Overlay Big Play Trigger Button on Screen */}
            <button
              type="button"
              onClick={toggleReviewPlay}
              className={`absolute inset-0 m-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isReviewPlaying
                  ? 'bg-black/40 text-white opacity-0 hover:opacity-100 backdrop-blur-sm scale-95 hover:scale-100'
                  : 'bg-[#00d8b6]/90 text-black opacity-95 hover:opacity-100 shadow-2xl hover:scale-105 shadow-[#00d8b6]/40'
              }`}
              title={isReviewPlaying ? 'Pause Review' : 'Play Review'}
            >
              {isReviewPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
            </button>
          </div>

          {/* ── Hidden Audio Element for Review ── */}
          <audio
            ref={reviewAudioRef}
            src={activeReviewSong?.url || ''}
            onTimeUpdate={handleReviewTimeUpdate}
            onEnded={handleReviewTrackEnded}
            onLoadedMetadata={handleReviewTimeUpdate}
          />

          {/* ── Submenu Pengaturan Pratinjau: Model Pemutar (6 Model) & Geser Posisi Visualizer ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {/* 1. Model Pemutar Piringan Hitam (6 Model Pilihan) */}
            <div className="p-3.5 rounded-xl bg-[#18181b]/70 border border-[#27272a] space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
                <div className="flex items-center gap-2">
                  <Disc3 size={15} className="text-[#00d8b6]" />
                  <span className="text-xs font-bold text-white">Model Pemutar Piringan Hitam</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00d8b6]/15 text-[#00d8b6] font-mono font-bold">
                    6 Model
                  </span>
                </div>
                {/* ON / OFF Toggle */}
                <div
                  onClick={() => setUseVinylPlayer(prev => !prev)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#141417] border border-[#27272a] hover:border-[#00d8b6]/40 cursor-pointer select-none transition-colors"
                  title="Aktifkan / Nonaktifkan Pemutar Piringan Hitam"
                >
                  <span className="text-[10px] font-semibold text-zinc-300">{useVinylPlayer ? 'ON' : 'OFF'}</span>
                  <div className={`w-7 h-3.5 flex items-center rounded-full p-0.5 transition-colors ${useVinylPlayer ? 'bg-[#00d8b6]' : 'bg-zinc-700'}`}>
                    <div className={`bg-black w-2.5 h-2.5 rounded-full shadow-sm transform transition-transform ${useVinylPlayer ? 'translate-x-3.5' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>

              {/* 6 Model Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {VINYL_MODELS_LIST.map((m, mIdx) => {
                  const isSelected = vinylModel === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={!useVinylPlayer}
                      onClick={() => setVinylModel(m.id)}
                      className={`flex flex-col p-2 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                        !useVinylPlayer
                          ? 'opacity-40 cursor-not-allowed border-[#27272a] bg-[#141417]'
                          : isSelected
                          ? 'bg-[#141417] border-[#00d8b6] shadow-md shadow-[#00d8b6]/10 ring-1 ring-[#00d8b6]/50'
                          : 'bg-[#141417] hover:bg-[#1a1a1f] border-[#27272a] text-zinc-300 hover:border-zinc-600'
                      }`}
                      title={m.desc}
                    >
                      {/* Top bar with mini vinyl badge */}
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[11px] font-bold truncate" style={{ color: m.accent }}>
                          {m.name}
                        </span>
                        {/* Mini disc indicator */}
                        <div 
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/30"
                          style={{ background: m.vinylGradient }}
                        />
                      </div>
                      <span className="text-[9px] text-zinc-400 line-clamp-1 leading-tight mb-1">
                        {m.badge}
                      </span>
                      <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono mt-auto">
                        <span>Model #{mIdx + 1}</span>
                        {isSelected && (
                          <span className="text-[#00d8b6] font-bold">Aktif ✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Upload Gambar Khusus Model Pemutar (Disc & Sleeve) */}
              <div className="pt-2.5 border-t border-[#27272a] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#141417]/80 p-2.5 rounded-xl border border-white/5">
                <input
                  ref={vinylCoverInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleVinylCoverUpload}
                />

                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Thumbnail Preview */}
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/20 bg-black/60 shrink-0 flex items-center justify-center shadow-inner">
                    {activeVinylImage ? (
                      <img
                        src={activeVinylImage}
                        alt="Vinyl Cover Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Disc3 size={20} className="text-zinc-500" />
                    )}
                    {/* Indicator badge if custom image is active */}
                    {vinylCoverPhoto && (
                      <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#00d8b6] shadow-sm ring-1 ring-black" title="Gambar Kustom Aktif" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <ImageIcon size={12} className="text-[#00d8b6]" />
                      Gambar Cover Pemutar
                    </span>
                    <span className="text-[9px] text-zinc-400 block truncate">
                      {vinylCoverPhoto 
                        ? `Kustom: ${vinylCoverPhoto.name || 'Gambar Khusus'}`
                        : bgPhoto 
                        ? 'Otomatis dari Foto Background (16:9)'
                        : 'Belum ada gambar (default icon)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                  {vinylCoverPhoto && (
                    <button
                      type="button"
                      onClick={() => setVinylCoverPhoto(null)}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                      title="Kembalikan ke Foto Background Utama"
                    >
                      Reset Default
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!useVinylPlayer}
                    onClick={() => vinylCoverInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00d8b6]/15 hover:bg-[#00d8b6]/25 border border-[#00d8b6]/40 text-[#00d8b6] hover:text-white text-[11px] font-bold transition-all cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Upload gambar khusus untuk piringan hitam & cover jaket"
                  >
                    <Upload size={12} />
                    <span>{vinylCoverPhoto ? 'Ganti Gambar' : 'Upload Gambar'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Geser Posisi Visualizer Audio */}
            <div className="p-3.5 rounded-xl bg-[#18181b]/70 border border-[#27272a] space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
                <div className="flex items-center gap-2">
                  <MoveVertical size={15} className="text-[#00d8b6]" />
                  <span className="text-xs font-bold text-white">Geser Posisi Visualizer</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono">
                    Y: {visualizerPosY > 0 ? `+${visualizerPosY}%` : `${visualizerPosY}%`} | X: {visualizerPosX > 0 ? `+${visualizerPosX}%` : `${visualizerPosX}%`}
                  </span>
                </div>
                {/* ON / OFF Toggle */}
                <div
                  onClick={() => setUseVisualizer(prev => !prev)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#141417] border border-[#27272a] hover:border-[#00d8b6]/40 cursor-pointer select-none transition-colors"
                  title="Aktifkan / Nonaktifkan Visualizer"
                >
                  <span className="text-[10px] font-semibold text-zinc-300">{useVisualizer ? 'ON' : 'OFF'}</span>
                  <div className={`w-7 h-3.5 flex items-center rounded-full p-0.5 transition-colors ${useVisualizer ? 'bg-[#00d8b6]' : 'bg-zinc-700'}`}>
                    <div className={`bg-black w-2.5 h-2.5 rounded-full shadow-sm transform transition-transform ${useVisualizer ? 'translate-x-3.5' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>

              {/* Quick Presets: Atas, Tengah, Bawah */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-zinc-400 font-semibold mr-1">Preset:</span>
                <button
                  type="button"
                  disabled={!useVisualizer}
                  onClick={() => setVisualizerPosY(-30)}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                    visualizerPosY === -30
                      ? 'bg-[#00d8b6] text-black border-[#00d8b6]'
                      : 'bg-[#141417] hover:bg-[#1f1f26] border-[#27272a] text-zinc-300'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  ⬆ Atas (-30%)
                </button>
                <button
                  type="button"
                  disabled={!useVisualizer}
                  onClick={() => { setVisualizerPosY(0); setVisualizerPosX(0); }}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                    visualizerPosY === 0 && visualizerPosX === 0
                      ? 'bg-[#00d8b6] text-black border-[#00d8b6]'
                      : 'bg-[#141417] hover:bg-[#1f1f26] border-[#27272a] text-zinc-300'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  ⏹ Tengah (0%)
                </button>
                <button
                  type="button"
                  disabled={!useVisualizer}
                  onClick={() => setVisualizerPosY(30)}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                    visualizerPosY === 30
                      ? 'bg-[#00d8b6] text-black border-[#00d8b6]'
                      : 'bg-[#141417] hover:bg-[#1f1f26] border-[#27272a] text-zinc-300'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  ⬇ Bawah (+30%)
                </button>
                <button
                  type="button"
                  disabled={!useVisualizer}
                  onClick={() => { setVisualizerPosY(0); setVisualizerPosX(0); }}
                  className="ml-auto text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={10} />
                  <span>Reset Posisi</span>
                </button>
              </div>

              {/* Dual Sliders: Vertikal (Y) & Horizontal (X) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* Vertikal (Y) */}
                <div className="p-2 rounded-lg bg-[#141417] border border-[#27272a] space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-400 font-medium flex items-center gap-1">
                      <MoveVertical size={11} className="text-[#00d8b6]" />
                      Posisi Vertikal (Y)
                    </span>
                    <span className="font-mono text-[#00d8b6] font-bold">
                      {visualizerPosY > 0 ? `+${visualizerPosY}%` : `${visualizerPosY}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    step="1"
                    disabled={!useVisualizer}
                    value={visualizerPosY}
                    onChange={e => setVisualizerPosY(Number(e.target.value))}
                    className="w-full accent-[#00d8b6] h-1.5 bg-[#27272a] rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <div className="flex justify-between text-[8px] text-zinc-500 font-mono">
                    <span>Atas (-45%)</span>
                    <span>Tengah</span>
                    <span>Bawah (+45%)</span>
                  </div>
                </div>

                {/* Horizontal (X) */}
                <div className="p-2 rounded-lg bg-[#141417] border border-[#27272a] space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-400 font-medium flex items-center gap-1">
                      <MoveHorizontal size={11} className="text-[#00d8b6]" />
                      Posisi Horizontal (X)
                    </span>
                    <span className="font-mono text-[#00d8b6] font-bold">
                      {visualizerPosX > 0 ? `+${visualizerPosX}%` : `${visualizerPosX}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="1"
                    disabled={!useVisualizer}
                    value={visualizerPosX}
                    onChange={e => setVisualizerPosX(Number(e.target.value))}
                    className="w-full accent-[#00d8b6] h-1.5 bg-[#27272a] rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <div className="flex justify-between text-[8px] text-zinc-500 font-mono">
                    <span>Kiri (-40%)</span>
                    <span>Tengah</span>
                    <span>Kanan (+40%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Submenu Pemilih Lagu Review (Daftar Kecil 20 Lagu) ── */}
          <div className="p-4 rounded-xl bg-[#18181b]/70 border border-[#27272a] space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                <ListMusic size={15} className="text-[#00d8b6]" />
                <span className="text-xs font-bold text-white">Lagu Review ({validReviewSongs.length} / {songs.length} Lagu)</span>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">
                Klik lagu mana saja untuk memutar (s/d 20 lagu)
              </span>
            </div>

            {/* Compact 20-Song Responsive Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1">
              {songs.map((s, idx) => {
                const hasAudio = !!(s.file && s.titleArtist.trim());
                const reviewIdx = validReviewSongs.findIndex(vs => vs.id === s.id);
                const isSelected = reviewIdx !== -1 && reviewSongIndex === reviewIdx;
                const isPlayingThis = isSelected && isReviewPlaying;
                const displayTitle = s.titleArtist.trim() || `Slot #${idx + 1}`;

                return (
                  <button
                    key={s.id || idx}
                    type="button"
                    disabled={!hasAudio}
                    onClick={() => {
                      if (reviewIdx !== -1) {
                        handleSelectReviewTrack(reviewIdx);
                      }
                    }}
                    className={`flex items-center justify-between gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      !hasAudio
                        ? 'bg-[#141417]/40 border-[#27272a]/50 text-zinc-600 opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#00d8b6]/15 border-[#00d8b6] text-white shadow-md shadow-[#00d8b6]/10 ring-1 ring-[#00d8b6]/40'
                        : 'bg-[#141417] hover:bg-[#1c1c22] border-[#27272a] text-zinc-300 hover:border-zinc-600'
                    }`}
                    title={hasAudio ? `${idx + 1}. ${displayTitle}` : `Slot #${idx + 1} belum diunggah`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`w-5 h-5 rounded-md text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${
                        isPlayingThis 
                          ? 'bg-[#00d8b6] text-black shadow-sm shadow-[#00d8b6]/40' 
                          : isSelected 
                          ? 'bg-[#00d8b6]/30 text-[#00d8b6]' 
                          : 'bg-[#27272a] text-zinc-400'
                      }`}>
                        {isPlayingThis ? <Pause size={9} /> : (idx + 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold truncate leading-tight">
                          {displayTitle}
                        </p>
                        <span className="text-[9px] text-zinc-500 font-mono block truncate">
                          {hasAudio ? (s.duration > 0 ? formatDuration(s.duration) : 'Audio Siap') : 'Kosong'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Audio Controls Bar (Play/Pause, Scrub, Volume, Quick Render) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#27272a]">
              
              {/* Left Play Controls */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handlePrevReviewTrack}
                  disabled={validReviewSongs.length <= 1}
                  className="p-2 rounded-lg bg-[#141417] hover:bg-[#27272a] text-zinc-300 hover:text-white border border-[#27272a] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Lagu Sebelumnya"
                >
                  <SkipBack size={14} />
                </button>

                <button
                  type="button"
                  onClick={toggleReviewPlay}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00d8b6] hover:bg-[#00c2a2] text-black text-xs font-bold transition-all shadow-md shadow-[#00d8b6]/20 cursor-pointer"
                >
                  {isReviewPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                  <span>{isReviewPlaying ? 'Jeda Review' : 'Putar Review'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextReviewTrack}
                  disabled={validReviewSongs.length <= 1}
                  className="p-2 rounded-lg bg-[#141417] hover:bg-[#27272a] text-zinc-300 hover:text-white border border-[#27272a] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Lagu Selanjutnya"
                >
                  <SkipForward size={14} />
                </button>

                {/* Current Time / Duration Display */}
                <div className="text-xs font-mono text-zinc-400 ml-2">
                  <span className="text-white font-semibold">{formatDuration(reviewCurrentTime)}</span>
                  <span> / {formatDuration(reviewDuration || activeReviewSong?.duration || 0)}</span>
                </div>
              </div>

              {/* Scrubber Progress Slider */}
              <div className="flex-1 max-w-xs sm:max-w-md mx-2">
                <input
                  type="range"
                  min="0"
                  max={reviewDuration || activeReviewSong?.duration || 100}
                  step="0.5"
                  value={reviewCurrentTime}
                  onChange={handleReviewSeek}
                  className="w-full accent-[#00d8b6] h-1.5 bg-[#27272a] rounded-lg cursor-pointer"
                />
              </div>

              {/* Right: Volume & Quick Render */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleToggleMuteReview}
                    className="p-1.5 rounded text-zinc-400 hover:text-white cursor-pointer"
                    title={isReviewMuted ? 'Unmute' : 'Mute'}
                  >
                    {isReviewMuted || reviewVolume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isReviewMuted ? 0 : reviewVolume}
                    onChange={handleReviewVolumeChange}
                    className="w-16 accent-[#00d8b6] h-1.5 bg-[#27272a] rounded-lg cursor-pointer"
                  />
                </div>

                {/* Tombol Render Cuplikan Video Cepat */}
                <button
                  type="button"
                  onClick={() => handleGenerateFinalVideo({ isReviewOnly: true })}
                  disabled={isRendering || validReviewSongs.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141417] hover:bg-[#1e1e24] text-amber-300 border border-amber-500/40 hover:border-amber-400 text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Render cuplikan cepat video review"
                >
                  <Zap size={13} className="text-amber-400" />
                  <span>Render Review</span>
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* ── 3. SECTION: DAFTAR LAGU & KOLOM TEKS URUTAN ── */}
        <div className="p-5 rounded-xl bg-[#141417] border border-[#27272a] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#27272a]">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Music2 size={16} className="text-[#00d8b6]" />
                3. Daftar Lagu ({songs.length}/20)
              </h3>

              {/* View Mode Toggle */}
              <div className="flex items-center p-0.5 bg-[#18181b] border border-[#27272a] rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setSongViewMode('slots')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    songViewMode === 'slots'
                      ? 'bg-[#27272a] text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Tampilkan daftar slot lagu"
                >
                  <List size={13} />
                  <span>Slot Baris</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    syncOrderTextFromSongs(songs);
                    setSongViewMode('text');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    songViewMode === 'text'
                      ? 'bg-[#00d8b6] text-black font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Tampilkan kolom teks untuk edit urutan lagu"
                >
                  <FileText size={13} />
                  <span>Kolom Teks Urutan</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    syncOrderTextFromSongs(songs);
                    setSongViewMode('split');
                  }}
                  className={`hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    songViewMode === 'split'
                      ? 'bg-[#27272a] text-[#00d8b6] font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Tampilkan kolom teks dan slot secara berdampingan"
                >
                  <Columns size={13} />
                  <span>Berdampingan</span>
                </button>
              </div>
            </div>

            {/* Quick Batch Actions */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              {/* Batch Upload Audio Input (Hidden) */}
              <input
                ref={batchAudioInputRef}
                type="file"
                multiple
                accept="audio/mp3, audio/wav, audio/m4a, audio/mpeg, audio/flac"
                className="hidden"
                onChange={handleBatchAudioUpload}
              />

              <button
                type="button"
                onClick={() => batchAudioInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00d8b6]/15 hover:bg-[#00d8b6]/25 text-[#00d8b6] border border-[#00d8b6]/30 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Upload size={13} />
                <span>Upload Audio</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  syncOrderTextFromSongs(songs);
                  setSongViewMode('text');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-300 hover:text-white border border-[#27272a] text-xs font-medium transition-colors cursor-pointer"
              >
                <Edit3 size={13} className="text-[#00d8b6]" />
                <span>Edit Teks Urutan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const plainTracklist = songs
                    .filter(s => s.titleArtist.trim())
                    .map((s, i) => `${String(i + 1).padStart(2, '0')}. ${s.titleArtist.trim()}`)
                    .join('\n');
                  navigator.clipboard.writeText(plainTracklist);
                  setCopiedTracklist(true);
                  setTimeout(() => setCopiedTracklist(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-300 hover:text-white border border-[#27272a] text-xs font-medium transition-colors cursor-pointer"
              >
                {copiedTracklist ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedTracklist ? 'Tersalin!' : 'Salin Tracklist'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(youtubeDescription);
                  setCopiedYoutubeDesc(true);
                  setTimeout(() => setCopiedYoutubeDesc(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-300 hover:text-white border border-[#27272a] text-xs font-medium transition-colors cursor-pointer"
              >
                {copiedYoutubeDesc ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedYoutubeDesc ? 'Tersalin!' : 'Salin Deskripsi YouTube'}</span>
              </button>
            </div>
          </div>

          {/* Main Content Area: Kolom Teks / Slot Baris / Berdampingan */}
          <div className={songViewMode === 'split' ? "grid grid-cols-1 xl:grid-cols-12 gap-5 items-start" : "space-y-4"}>
            
            {/* ── SUB-VIEW: KOLOM TEKS URUTAN LAGU ── */}
            {(songViewMode === 'text' || songViewMode === 'split') && (
              <div className={`flex flex-col space-y-3 p-4 rounded-xl bg-[#111113] border border-[#27272a] ${songViewMode === 'split' ? 'xl:col-span-5' : ''}`}>
                {/* Header Bar Kolom Teks */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#27272a]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileText size={14} className="text-[#00d8b6]" />
                      Kolom Teks Urutan Lagu
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#27272a] text-[11px] font-mono text-zinc-300">
                      {orderText.split('\n').filter(l => l.trim().length > 0).length} / 20 Baris
                    </span>
                  </div>

                  {/* Quick Format Actions */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleFormatOrderNumbers}
                      className="px-2 py-1 text-[11px] font-medium text-zinc-300 hover:text-white bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] rounded transition-colors cursor-pointer"
                      title="Format otomatis 1. Judul, 2. Judul..."
                    >
                      Format Nomor
                    </button>
                    <button
                      type="button"
                      onClick={handleCleanOrderNumbers}
                      className="px-2 py-1 text-[11px] font-medium text-zinc-300 hover:text-white bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] rounded transition-colors cursor-pointer"
                      title="Bersihkan nomor urut di awal baris"
                    >
                      Bersihkan Nomor
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        syncOrderTextFromSongs(songs);
                        setOrderNotification('Teks dimuat ulang dari slot');
                        setTimeout(() => setOrderNotification(null), 2000);
                      }}
                      className="p-1 text-zinc-300 hover:text-white bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] rounded transition-colors cursor-pointer"
                      title="Muat ulang dari slot saat ini"
                    >
                      <RotateCcw size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(orderText);
                        setOrderNotification('Teks tersalin!');
                        setTimeout(() => setOrderNotification(null), 2000);
                      }}
                      className="p-1 text-zinc-300 hover:text-white bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] rounded transition-colors cursor-pointer"
                      title="Salin isi teks"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>

                {/* Textarea */}
                <div className="relative">
                  <textarea
                    rows={songViewMode === 'split' ? 16 : 12}
                    value={orderText}
                    onChange={e => setOrderText(e.target.value)}
                    placeholder={`1. Slank - Ku Tak Bisa\n2. Dewa 19 - Kangen\n3. Sheila On 7 - Dan\n4. Peterpan - Menghapus Jejakmu\n... (Ketik atau tempel urutan lagu di sini, 1 baris per lagu)`}
                    className="w-full p-3.5 bg-[#09090b] border border-[#27272a] focus:border-[#00d8b6] rounded-xl text-xs text-zinc-100 font-mono leading-relaxed focus:outline-none resize-y min-h-[260px]"
                    spellCheck={false}
                  />
                </div>

                {/* Bottom Bar: Notification & Apply */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                  <div className="text-[11px] text-zinc-400">
                    {orderNotification ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        {orderNotification}
                      </span>
                    ) : (
                      <span>* Urutan audio otomatis mengikuti judul lagu yang cocok</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {songViewMode === 'text' && (
                      <button
                        type="button"
                        onClick={() => setSongViewMode('slots')}
                        className="px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-300 hover:text-white border border-[#27272a] text-xs font-medium transition-colors cursor-pointer"
                      >
                        Lihat Slot Baris
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleApplyOrderText}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#00d8b6] to-[#00bda0] hover:brightness-110 text-black text-xs font-bold shadow-md shadow-[#00d8b6]/20 transition-all cursor-pointer active:scale-95"
                    >
                      <Check size={14} className="stroke-[2.5]" />
                      <span>Terapkan Urutan Lagu</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── SUB-VIEW: SLOT BARIS LAGU ── */}
            {(songViewMode === 'slots' || songViewMode === 'split') && (
              <div className={`space-y-2.5 ${songViewMode === 'split' ? 'xl:col-span-7' : ''}`}>
                <div className="space-y-2.5">
                  {songs.map((song, idx) => (
                    <div
                      key={song.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#18181b] border border-[#27272a] hover:border-zinc-700 transition-colors"
                    >
                      {/* Index Pill & Move Up / Down Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveSong(idx, -1)}
                            className="p-0.5 text-zinc-500 hover:text-[#00d8b6] disabled:opacity-20 disabled:hover:text-zinc-500 rounded hover:bg-[#27272a] transition-colors cursor-pointer"
                            title="Pindahkan naik"
                          >
                            <ArrowUp size={10} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === songs.length - 1}
                            onClick={() => handleMoveSong(idx, 1)}
                            className="p-0.5 text-zinc-500 hover:text-[#00d8b6] disabled:opacity-20 disabled:hover:text-zinc-500 rounded hover:bg-[#27272a] transition-colors cursor-pointer"
                            title="Pindahkan turun"
                          >
                            <ArrowDown size={10} />
                          </button>
                        </div>
                        <div className="w-7 h-7 rounded-md bg-[#27272a] text-zinc-300 font-mono text-xs flex items-center justify-center font-bold">
                          {String(idx + 1).padStart(2, '0')}
                        </div>
                      </div>

                      {/* Title & Artist Input */}
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={song.titleArtist}
                          onChange={e => handleSongTitleChange(song.id, e.target.value)}
                          placeholder="Contoh: Ku Tak Bisa - Slank"
                          className="w-full px-3 py-1.5 bg-[#121214] border border-[#27272a] focus:border-[#00d8b6] rounded text-xs text-white placeholder-zinc-600 focus:outline-none truncate"
                        />
                      </div>

                      {/* Upload Audio File */}
                      <div className="shrink-0 flex items-center gap-2">
                        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#27272a] hover:bg-[#333338] text-zinc-200 text-xs cursor-pointer border border-[#3f3f46]/50 transition-colors">
                          <Upload size={12} />
                          <span className="truncate max-w-[110px]">
                            {song.file ? song.file.name : 'Pilih Audio'}
                          </span>
                          <input
                            type="file"
                            accept="audio/mp3, audio/wav, audio/m4a, audio/mpeg, audio/flac"
                            className="hidden"
                            onChange={e => handleSingleSongFileChange(song.id, e)}
                          />
                        </label>

                        {/* Play/Pause Mini Preview */}
                        {song.url && (
                          <button
                            type="button"
                            onClick={() => handleTogglePlaySong(song)}
                            className={`w-7 h-7 rounded flex items-center justify-center border transition-colors cursor-pointer ${
                              playingSongId === song.id
                                ? 'bg-[#00d8b6] text-black border-[#00d8b6]'
                                : 'bg-[#27272a] text-zinc-300 hover:text-white border-[#3f3f46]/50'
                            }`}
                            title={playingSongId === song.id ? 'Pause Preview' : 'Play Preview'}
                          >
                            {playingSongId === song.id ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                          </button>
                        )}

                        {/* Duration Badge */}
                        <span className="text-xs font-mono text-zinc-400 min-w-[42px] text-right">
                          {song.duration > 0 ? formatDuration(song.duration) : '--:--'}
                        </span>

                        {/* Delete Slot Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveSong(song.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 rounded hover:bg-red-950/30 transition-colors cursor-pointer"
                          title="Hapus lagu ini"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Song Button & Total Duration */}
                <div className="flex items-center justify-between pt-2">
                  {songs.length < 20 ? (
                    <button
                      type="button"
                      onClick={handleAddSong}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#27272a] hover:bg-[#333338] text-white text-xs font-semibold border border-[#3f3f46]/60 transition-all cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>+ Tambah Baris Lagu ({songs.length} / 20)</span>
                    </button>
                  ) : (
                    <span className="text-xs text-amber-400/90 font-medium">
                      ⚠️ Batas maksimal 20 lagu telah tercapai.
                    </span>
                  )}

                  <div className="text-xs text-zinc-400">
                    Total Durasi: <strong className="text-white">{formatHumanDuration(totalDurationSec)}</strong>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── 4. SECTION: RENDER FINAL VIDEO ACTION ── */}
        <div className="p-5 rounded-xl bg-[#141417] border border-[#27272a] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-zinc-400">
            <span>Folder Simpan:</span>
            <span className="text-white font-medium truncate max-w-[280px]" title={exportFolder}>
              {exportFolder || 'Folder Videos/Downloads'}
            </span>
            <button
              type="button"
              onClick={handlePickExportFolder}
              className="px-2.5 py-1 bg-[#27272a] hover:bg-[#333338] text-zinc-200 rounded text-[11px] border border-[#3f3f46]/50 cursor-pointer"
            >
              Ubah
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleGenerateFinalVideo({ isReviewOnly: false })}
            disabled={isRendering}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3 rounded-xl bg-gradient-to-r from-[#00d8b6] to-emerald-500 hover:from-[#00c2a2] hover:to-emerald-400 text-black font-extrabold text-sm shadow-lg shadow-emerald-950/30 transition-all cursor-pointer hover:scale-[1.01]"
          >
            <Film size={18} />
            <span>Render Video Final ({totalInputtedSongsCount} Lagu)</span>
          </button>
        </div>

      </div>

      {/* ── MODAL: BATCH PASTE TRACKLIST ── */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-lg p-5 rounded-2xl bg-[#141417] border border-[#27272a] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div className="flex items-center gap-2 text-white">
                <FileText size={18} className="text-[#00d8b6]" />
                <h3 className="text-sm font-bold">Tempel Daftar Lagu Sekaligus (Batch Paste)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="p-1 rounded text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Tempel 10–20 judul lagu dari catatan, YouTube, atau Spotify di bawah ini (1 baris = 1 lagu). Sistem otomatis membuang nomor urut dan mengisi slot lagu.
            </p>

            <textarea
              rows={8}
              value={batchText}
              onChange={e => setBatchText(e.target.value)}
              placeholder={`1. Slank - Ku Tak Bisa\n2. Dewa 19 - Kangen\n3. Sheila On 7 - Dan\n4. Noah - Separuh Aku`}
              className="w-full p-3 bg-[#18181b] border border-[#27272a] focus:border-[#00d8b6] rounded-lg text-xs text-zinc-200 font-mono focus:outline-none resize-none leading-relaxed"
            />

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#27272a]">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 rounded-lg bg-[#27272a] hover:bg-[#333338] text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyBatchText}
                className="px-5 py-2 rounded-lg bg-[#00d8b6] hover:bg-[#00c2a2] text-black text-xs font-bold cursor-pointer transition-colors"
              >
                Terapkan Daftar Lagu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RENDER PROGRESS MODAL ── */}
      {isRendering && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{ zIndex: 100000 }}
        >
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#141417] border border-[#27272a] shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/30 mx-auto flex items-center justify-center animate-pulse">
              <Disc3 size={32} className="animate-spin-slow" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-1">Merender Video Auto Album...</h3>
              <p className="text-xs text-zinc-400">
                Memproses audio concatenating, efek partikel, dan sinkronisasi ketukan jedak-jeduk.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-zinc-400">{renderTimemark} / {formatDuration(totalDurationSec)}</span>
                <span className="text-[#00d8b6]">{renderProgress}%</span>
              </div>
              <div className="w-full h-3 bg-[#18181b] border border-[#27272a] rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-[#00d8b6] to-pink-500 rounded-full transition-all duration-300"
                  style={{ width: `${renderProgress}%` }}
                />
              </div>
            </div>

            <button
              onClick={handleCancelRender}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white bg-[#18181b] hover:bg-red-950/40 hover:text-red-300 border border-[#27272a] rounded-lg transition-colors cursor-pointer"
            >
              Batalkan Render
            </button>
          </div>
        </div>
      )}

      {/* ── RENDER RESULT MODAL ── */}
      {renderResult && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{ zIndex: 100000 }}
        >
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#141417] border border-[#00d8b6]/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div className="flex items-center gap-2 text-[#00d8b6]">
                <CheckCircle2 size={20} />
                <h3 className="text-sm font-bold text-white">Video Auto Album Berhasil Dibuat!</h3>
              </div>
              <button
                onClick={() => setRenderResult(null)}
                className="p-1 rounded text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Video Inline Preview */}
            {renderResult.videoUrl && (
              <div className="rounded-xl overflow-hidden border border-[#27272a] bg-black aspect-video">
                <video
                  src={renderResult.videoUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div className="space-y-1 text-xs text-zinc-300">
              <p><strong className="text-zinc-400">Judul:</strong> {renderResult.title}</p>
              <p><strong className="text-zinc-400">Total Durasi:</strong> {formatHumanDuration(renderResult.totalDuration)} ({renderResult.songCount} lagu)</p>
              <p><strong className="text-zinc-400">BPM Terpakai:</strong> {renderResult.bpm} BPM</p>
              <p className="truncate"><strong className="text-zinc-400">File Video:</strong> {renderResult.videoPath}</p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => handleOpenFolder(renderResult.videoPath)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#27272a] hover:bg-[#333338] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <FolderOpen size={14} />
                <span>Buka Folder File</span>
              </button>

              <button
                onClick={() => setRenderResult(null)}
                className="px-5 py-2 rounded-lg bg-[#00d8b6] hover:bg-[#00c2a2] text-black text-xs font-bold transition-colors cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RENDER ERROR MODAL ── */}
      {renderError && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          style={{ zIndex: 100000 }}
        >
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#141417] border border-red-500/40 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 mx-auto flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Gagal Membuat Video</h3>
              <p className="text-xs text-red-300/90 leading-relaxed">{renderError}</p>
            </div>
            <button
              onClick={() => setRenderError(null)}
              className="px-5 py-2 bg-[#27272a] hover:bg-[#333338] text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
