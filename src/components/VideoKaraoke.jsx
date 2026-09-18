import React, { useState, useRef, useCallback, useEffect, useMemo, Fragment } from 'react';
import {
  Upload, Music, Music2, FileText, Wand2, SkipForward, Globe, Play, Pause,
  ArrowLeft, Palette, Clock, AlignLeft, Headphones, Download,
  ChevronDown, ChevronUp, ChevronRight, RotateCcw, CheckCircle2, Loader2,
  Mic, MicOff, Volume2, VolumeX, Sliders, Layers,
  Film, Image as ImageIcon, Plus, Trash2, Edit3, Pencil, Eye, EyeOff,
  Scissors, Magnet, Undo2, Redo2, Maximize, Lock, MoreHorizontal,
  BarChart2, ZapOff, Square, SkipBack, SkipForward as SkipFwd, Repeat, Type,
  Search, Star, AlignCenter, AlignRight, AlignJustify, Check, Folder, FolderOpen, X,
  MoveHorizontal, Flag, Bookmark, Crop, ZoomIn, RotateCw, FlipHorizontal,
  Sparkles, Flame, Wind, Zap, Activity
} from 'lucide-react';
import { applyZoomEffect } from '../utils/videoEffects';

/* ─── Video Thumbnail Utility & Component ────────────────────────────── */

// Accepts a URL (blob:// or file://) — does NOT create blob internally
const generateVideoThumbnailFromUrl = (url, timeInSeconds = 0.5) => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const cleanup = (result) => resolve(result);

    video.onloadeddata = () => {
      if (!video.videoHeight || video.videoHeight === 0) return cleanup(null);
      video.currentTime = Math.min(timeInSeconds, video.duration / 2 || 0.5);
    };

    video.onseeked = () => {
      try {
        if (!video.videoHeight || video.videoHeight === 0) return cleanup(null);
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 100 / video.videoHeight);
        canvas.height = video.videoHeight * scale;
        canvas.width = video.videoWidth * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        cleanup(canvas.toDataURL('image/jpeg', 0.6));
      } catch (e) {
        cleanup(null);
      }
    };

    video.onerror = () => cleanup(null);
    setTimeout(() => cleanup(null), 3000); // safety timeout
    video.src = url;
  });
};

// Accepts a File object (real or pseudo with _fileUrl)
const generateVideoThumbnail = (file, timeInSeconds = 0.5) => {
  const url = file._fileUrl || URL.createObjectURL(file);
  return generateVideoThumbnailFromUrl(url, timeInSeconds);
};

const filmstripCache = new Map();

const extractFrames = async (file, duration, sourceStart = 0) => {
  if (!file) return [];
  const filePath = file.path || file._filePath || file.name || '';
  let actualPath = file.path || file._filePath || null;
  if (!actualPath && file && typeof File !== 'undefined' && file instanceof File && window.require) {
    try {
      actualPath = window.require('electron').webUtils?.getPathForFile(file) || null;
    } catch (e) {
      actualPath = null;
    }
  }
  const cacheKey = `${actualPath || filePath}_${Math.round(sourceStart)}_${Math.round(duration)}`;

  if (filmstripCache.has(cacheKey)) {
    return filmstripCache.get(cacheKey);
  }

  if (actualPath && window.require) {
    try {
      const { ipcRenderer } = window.require('electron');
      const thumbResults = await ipcRenderer.invoke('extract-thumbnails', { filePath: actualPath, duration, sourceStart, interval: 40 });
      if (thumbResults && thumbResults.length > 0) {
        const formatted = thumbResults.map((item, i) => {
          if (typeof item === 'string') return { id: i, url: item, weight: 1 };
          return { id: i, url: item.url, weight: item.weight || 1 };
        });
        filmstripCache.set(cacheKey, formatted);
        return formatted;
      }
    } catch(e) { console.error('IPC extract-thumbnails failed', e); }
  }

  // Fallback to HTML canvas extraction (1 frame per 40s)
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const url = file._fileUrl || URL.createObjectURL(file);
    const shouldRevoke = !file._fileUrl;

    const thumbs = [];
    let currentFrame = 0;
    const step = 40; // 40 detik per frame
    const numFrames = Math.max(1, Math.min(15, Math.ceil(duration / step)));
    const sStart = Math.max(0, sourceStart || 0);

    const cleanup = () => {
      if (shouldRevoke) {
        try { URL.revokeObjectURL(url); } catch(e) {}
      }
      if (thumbs.length > 0) filmstripCache.set(cacheKey, thumbs);
      resolve(thumbs);
    };

    video.onloadeddata = () => {
      if (!video.videoHeight || video.videoHeight === 0) return cleanup();
      video.currentTime = Math.max(0.1, sStart + 0.5);
    };

    video.onseeked = () => {
      try {
        if (!video.videoHeight || video.videoHeight === 0) return cleanup();
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 100 / video.videoHeight);
        canvas.height = video.videoHeight * scale;
        canvas.width = video.videoWidth * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const tStart = currentFrame * step;
        const tEnd = Math.min(duration, (currentFrame + 1) * step);
        thumbs.push({
          id: currentFrame,
          url: canvas.toDataURL('image/jpeg', 0.5),
          weight: Math.max(1, tEnd - tStart)
        });

        currentFrame++;
        if (currentFrame < numFrames) {
          video.currentTime = Math.max(0.1, sStart + currentFrame * step + 0.5);
        } else {
          cleanup();
        }
      } catch (e) {
        cleanup();
      }
    };

    video.onerror = () => cleanup();
    setTimeout(() => cleanup(), 8000);
    video.src = url;
  });
};

function VideoFilmstrip({ file, totalPx, duration, sourceStart = 0, isDragging = false, onStatusChange }) {
  const actualPath = file?.path || file?._filePath || file?.name;
  const cacheKey = `${actualPath}_${Math.round(sourceStart)}_${Math.round(duration)}`;
  const [thumbnails, setThumbnails] = useState(() => filmstripCache.get(cacheKey) || []);
  const [isExtracting, setIsExtracting] = useState(() => !filmstripCache.has(cacheKey));

  useEffect(() => {
    if (!file || !duration || duration <= 0) return;
    if (isDragging) return; // Never extract during active drag to avoid lag

    if (filmstripCache.has(cacheKey)) {
      setThumbnails(filmstripCache.get(cacheKey));
      setIsExtracting(false);
      return;
    }

    let isCancelled = false;
    let isProcessing = false;

    const generateStrip = async () => {
      isProcessing = true;
      setTimeout(() => onStatusChange?.(true), 0);
      const safeDuration = Math.max(1, duration);
      const thumbs = await extractFrames(file, safeDuration, sourceStart);
      if (!isCancelled) {
        setThumbnails(thumbs);
        setIsExtracting(false);
        if (isProcessing) {
          isProcessing = false;
          setTimeout(() => onStatusChange?.(false), 0);
        }
      }
    };

    generateStrip();
    return () => {
      isCancelled = true;
      if (isProcessing) {
        isProcessing = false;
        setTimeout(() => onStatusChange?.(false), 0);
      }
    };
  }, [file, duration, sourceStart, isDragging, cacheKey]);

  if (isExtracting && thumbnails.length === 0) return (
     <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#022c22' }}>
       <Loader2 size={11} className="animate-spin" style={{ color: '#38bdf8' }} />
       <span style={{ marginLeft: 5, fontSize: '9px', color: '#38bdf8', fontWeight: 600 }}>Memproses visual...</span>
     </div>
  );

  if (thumbnails.length === 0) return (
     <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#022c22' }}>
       <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 500 }}>Visual video</span>
     </div>
  );

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', opacity: 0.9 }}>
      {thumbnails.map((t, idx) => (
        <div
          key={t.id || idx}
          style={{
            flex: t.weight || 1,
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
            borderRight: idx < thumbnails.length - 1 ? '1px solid rgba(0,0,0,0.5)' : 'none'
          }}
        >
          <img
            src={t.url}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            alt=""
          />
        </div>
      ))}
    </div>
  );
}

function ImageFilmstrip({ file }) {
  const url = file._fileUrl || URL.createObjectURL(file);
  return (
    <div style={{ width: '100%', height: '100%', opacity: 0.85, backgroundImage: `url(${url})`, backgroundSize: 'auto 100%', backgroundRepeat: 'repeat-x', backgroundPosition: 'left center' }} />
  );
}

/* ─── Constants ─────────────────────────────────────────────── */
const AUDIO_FORMATS = ['mp3','m4a','wav','flac','aac','aif','aiff','ogg','opus','wma','weba'];
const VIDEO_FORMATS = ['mp4','mov','webm','mkv','avi','wmv','flv','m4v','3gp'];
const IMAGE_FORMATS = ['jpg','jpeg','png','webp','gif'];
const ALL_FORMATS = [...AUDIO_FORMATS, ...VIDEO_FORMATS, ...IMAGE_FORMATS];

const isVideoFile = (f) => f && (f.type?.startsWith('video/') || VIDEO_FORMATS.includes(f.name?.split('.').pop()?.toLowerCase()));
const isImageFile = (f) => f && (f.type?.startsWith('image/') || IMAGE_FORMATS.includes(f.name?.split('.').pop()?.toLowerCase()));
const isAudioFile = (f) => f && (f.type?.startsWith('audio/') || AUDIO_FORMATS.includes(f.name?.split('.').pop()?.toLowerCase()));

const getItemMediaType = (item) => {
  if (!item) return 'video';
  if (item.file) {
    if (isVideoFile(item.file)) return 'video';
    if (isImageFile(item.file)) return 'image';
    if (isAudioFile(item.file)) return 'audio';
  }
  const name = (item.name || item.url || '').split('?')[0].toLowerCase();
  const ext = name.split('.').pop();
  if (VIDEO_FORMATS.includes(ext)) return 'video';
  if (IMAGE_FORMATS.includes(ext)) return 'image';
  if (AUDIO_FORMATS.includes(ext)) return 'audio';
  return item.type || 'video';
};

const ASPECT_RATIOS = [
  { id: 'original', label: 'Original', w: 16, h: 9 }, // Dynamically updated based on media
  { id: '16:9', label: '16:9', w: 16, h: 9 },
  { id: '4:3', label: '4:3', w: 4, h: 3 },
  { id: '2.35:1', label: '2.35:1', w: 2.35, h: 1 },
  { id: '2:1', label: '2:1', w: 2, h: 1 },
  { id: '1.85:1', label: '1.85:1', w: 1.85, h: 1 },
  { id: '9:16', label: '9:16', w: 9, h: 16 },
  { id: '3:4', label: '3:4', w: 3, h: 4 },
  { id: '5.8-inch', label: '5.8-inch', w: 1125, h: 2436 }, // iPhone X/11 Pro ratio
  { id: '1:1',  label: '1:1', w: 1, h: 1 },
];

const PRESETS = [
  { id: 'midnight', name: 'Midnight Blue', fontColor: '#94b8ff', fillColor: '#fbbf24', bg: 'linear-gradient(135deg,#0f172a,#1e3a5f)' },
  { id: 'neon',     name: 'Neon Glow',     fontColor: '#e0b0ff', fillColor: '#a3e635', bg: 'linear-gradient(135deg,#1a0033,#0d1a00)' },
  { id: 'sunset',   name: 'Sunset Vibe',   fontColor: '#fca5a5', fillColor: '#fb923c', bg: 'linear-gradient(135deg,#1c0505,#1c0a00)' },
  { id: 'forest',   name: 'Forest Night',  fontColor: '#86efac', fillColor: '#facc15', bg: 'linear-gradient(135deg,#052e16,#1c1a00)' },
  { id: 'clean',    name: 'Clean White',   fontColor: '#475569', fillColor: '#3b82f6', bg: '#f8fafc' },
];

const FONTS = ['System', 'Inter', 'Anton', 'Kanit', 'Montserrat', 'Poppins', 'Roboto', 'Outfit', 'Playfair Display', 'Comic Sans MS', 'Courier New', 'Impact', 'Caveat', 'Orbitron'];
const LANGUAGES = [
  { id: 'auto',  label: 'Auto Detect' },
  { id: 'id',    label: 'Indonesia' },
  { id: 'en',    label: 'English' },
  { id: 'ja',    label: '日本語' },
  { id: 'ko',    label: '한국어' },
  { id: 'zh',    label: '中文' },
];

/* ─── Studio Effects Presets ─────────────────────────────────────────── */
const STUDIO_EFFECT_CATEGORIES = [
  { id: 'all', name: 'Semua Efek' },
  { id: 'Fire', name: 'Fire (Api)' },
  { id: 'Linght', name: 'Linght (Cahaya)' },
  { id: 'Smoke', name: 'Smoke (Asap)' },
  { id: 'Retro', name: 'Retro (Vintage)' },
];

const STUDIO_EFFECTS_LIST = [
  // ── FIRE (folder: Fire -> assets/Effects/Fire/*.mp4, thumbnail: assets/Images/Fire.png)
  { id: 'fire-embers', name: 'Fire Embers', category: 'Fire', folder: 'Fire', file: 'fire embers flying particles.mp4', desc: 'Bara api partikel melayang hangat', blendMode: 'screen' },
  { id: 'fire-particles', name: 'Fire Particles', category: 'Fire', folder: 'Fire', file: 'fire particles.mp4', desc: 'Partikel api berkilau dramatis', blendMode: 'screen' },
  { id: 'fire-sparks', name: 'Fire Sparks', category: 'Fire', folder: 'Fire', file: 'fire sparks.mp4', desc: 'Percikan kembang api intens', blendMode: 'screen' },
  { id: 'fire-flame', name: 'Fire Flame', category: 'Fire', folder: 'Fire', file: 'fire.mp4', desc: 'Kobaran api menyala dinamis', blendMode: 'screen' },
  { id: 'fire-burst', name: 'Fire Burst', category: 'Fire', folder: 'Fire', file: 'Fire Burst.mp4', desc: 'Ledakan semburan api dramatis', blendMode: 'screen' },
  { id: 'fire-burn', name: 'Fire Burn', category: 'Fire', folder: 'Fire', file: 'Fire Bum.mp4', desc: 'Lidah api membakar berkobar', blendMode: 'screen' },
  { id: 'fire-fireplace', name: 'Fireplace', category: 'Fire', folder: 'Fire', file: 'Fireplace.mp4', desc: 'Kehangatan api unggun perapian', blendMode: 'screen' },
  { id: 'fire-firescape', name: 'Firescape', category: 'Fire', folder: 'Fire', file: 'Firascape.mp4', desc: 'Lanskap lautan kobaran api atmosferik', blendMode: 'screen' },

  // ── SMOKE (folder: Smoke -> assets/Effects/Smoke/*.mp4, thumbnail: assets/Images/Smoke.png)
  { id: 'atmospheric', name: 'Atmospheric Fog', category: 'Smoke', folder: 'Smoke', file: 'atmospheric.mp4', desc: 'Kabut atmosferik misterius & estetik', blendMode: 'screen' },
  { id: 'smoke-effect', name: 'Smoke Effect', category: 'Smoke', folder: 'Smoke', file: 'smoke effect.mp4', desc: 'Asap tebal dinamis mengalir lembut', blendMode: 'screen' },
  { id: 'smoke-mist', name: 'Mist', category: 'Smoke', folder: 'Smoke', file: 'Mist.mp4', desc: 'Kabut tipis melayang elegan', blendMode: 'screen' },
  { id: 'smoke-overlay', name: 'Smoke Overlay', category: 'Smoke', folder: 'Smoke', file: 'Smoke Overlay.mp4', desc: 'Lapisan asap dinamis sinematik', blendMode: 'screen' },
  { id: 'smoke-overlay-1', name: 'Smoke Overlay 2', category: 'Smoke', folder: 'Smoke', file: 'Smoke Overlay 1.mp4', desc: 'Pusaran asap lembut melayang', blendMode: 'screen' },
  { id: 'thick-smoke', name: 'Thick Smoke', category: 'Smoke', folder: 'Smoke', file: 'Thick Smoke.mp4', desc: 'Gumpalan asap tebal pekat', blendMode: 'screen' },
  { id: 'thick-smoke-1', name: 'Thick Smoke 2', category: 'Smoke', folder: 'Smoke', file: 'Thick Smoke 1.mp4', desc: 'Kabut asap tebal mengalir', blendMode: 'screen' },
  { id: 'wastelan-smoke', name: 'Wasteland Smoke', category: 'Smoke', folder: 'Smoke', file: 'Wastelan Smoke.mp4', desc: 'Asap atmosferik dramatis', blendMode: 'screen' },
  { id: 'wastelan-smoke-1', name: 'Wasteland Smoke 2', category: 'Smoke', folder: 'Smoke', file: ' Wastelan Smoke 1.mp4', desc: 'Asap tebal medan dramatis', blendMode: 'screen' },

  // ── LINGHT (folder: Linght -> assets/Effects/Linght/*.mp4, thumbnail: assets/Images/Linght.png)
  { id: 'linght-blaze-sparks', name: 'Blaze Sparks', category: 'Linght', folder: 'Linght', file: 'Blaze sparks.mp4', desc: 'Percikan cahaya blaze berkilau', blendMode: 'screen' },
  { id: 'linght-bokeh-rays', name: 'Bokeh Rays', category: 'Linght', folder: 'Linght', file: 'Bokeh Rays.mp4', desc: 'Sinar cahaya bokeh lembut', blendMode: 'screen' },
  { id: 'linght-chroma-flows', name: 'Chroma Flows', category: 'Linght', folder: 'Linght', file: 'Chroma Flows.mp4', desc: 'Aliran cahaya kroma spektrum', blendMode: 'screen' },
  { id: 'linght-cold-leak', name: 'Cold Leak', category: 'Linght', folder: 'Linght', file: 'Cold Leak.mp4', desc: 'Bocoran cahaya biru dingin', blendMode: 'screen' },
  { id: 'linght-film-passion', name: 'Film Passion', category: 'Linght', folder: 'Linght', file: 'Film Passion.mp4', desc: 'Cahaya film dramatis romantis', blendMode: 'screen' },
  { id: 'linght-frost-light', name: 'Frost Light', category: 'Linght', folder: 'Linght', file: 'Frost Light.mp4', desc: 'Cahaya kristal es berkilau', blendMode: 'screen' },
  { id: 'linght-fuzzy', name: 'Fuzzy Light', category: 'Linght', folder: 'Linght', file: 'Fuzzy.mp4', desc: 'Cahaya kabur hangat ambient', blendMode: 'screen' },
  { id: 'linght-glowing-mystery', name: 'Glowing Mystery', category: 'Linght', folder: 'Linght', file: 'Glowing Mystery.mp4', desc: 'Pijar misterius atmosferik', blendMode: 'screen' },
  { id: 'linght-grainy-spots', name: 'Grainy Spots', category: 'Linght', folder: 'Linght', file: 'Grainy Spots.mp4', desc: 'Bintik partikel cahaya retro', blendMode: 'screen' },
  { id: 'linght-heart-bokeh', name: 'Heart Bokeh', category: 'Linght', folder: 'Linght', file: 'Heart Bokeh.mp4', desc: 'Bokeh bentuk hati estetis', blendMode: 'screen' },
  { id: 'linght-heart-haze', name: 'Heart Haze', category: 'Linght', folder: 'Linght', file: 'Heart Haze.mp4', desc: 'Kabut cahaya hati hangat', blendMode: 'screen' },
  { id: 'linght-hive-matrik', name: 'Hive Matrik', category: 'Linght', folder: 'Linght', file: 'Hive Matrik.mp4', desc: 'Matriks sarang lebah futuristik', blendMode: 'screen' },
  { id: 'linght-lightning-battle', name: 'Lightning Battle', category: 'Linght', folder: 'Linght', file: 'Lightning Battle.mp4', desc: 'Sambaran kilat energetik', blendMode: 'screen' },
  { id: 'linght-bokeh', name: 'Light Bokeh', category: 'Linght', folder: 'Linght', file: 'Linght Bokeh.mp4', desc: 'Butiran bokeh cahaya halus', blendMode: 'screen' },
  { id: 'linght-neon-sunglight', name: 'Neon Sunlight', category: 'Linght', folder: 'Linght', file: 'Neaon Sunglight.mp4', desc: 'Sinar matahari neon cerah', blendMode: 'screen' },
  { id: 'linght-neon-aura', name: 'Neon Aura', category: 'Linght', folder: 'Linght', file: 'Neon Aura.mp4', desc: 'Aura neon berpendar dinamis', blendMode: 'screen' },
  { id: 'linght-old-film-grain', name: 'Old Film Grain', category: 'Linght', folder: 'Linght', file: 'old film grain.mp4', desc: 'Tekstur grain film seluloid retro', blendMode: 'screen' },
  { id: 'linght-purple-leak', name: 'Purple Leak', category: 'Linght', folder: 'Linght', file: 'Purple Leak.mp4', desc: 'Bocoran cahaya ungu sinematik', blendMode: 'screen' },
  { id: 'linght-red-leak', name: 'Red Leak', category: 'Linght', folder: 'Linght', file: 'red leak.mp4', desc: 'Bocoran cahaya merah hangat', blendMode: 'screen' },
  { id: 'linght-reflective', name: 'Reflective', category: 'Linght', folder: 'Linght', file: 'Reflective.mp4', desc: 'Pantulan kilau cahaya elegan', blendMode: 'screen' },
  { id: 'linght-sun-dust', name: 'Sun Dust', category: 'Linght', folder: 'Linght', file: 'Sun Dust.mp4', desc: 'Debu cahaya matahari melayang', blendMode: 'screen' },
  { id: 'linght-contour-light', name: 'Contour Light', category: 'Linght', folder: 'Linght', file: 'contour light.mp4', desc: 'Garis kontur cahaya neon', blendMode: 'screen' },
  { id: 'linght-laser', name: 'Laser Beam', category: 'Linght', folder: 'Linght', file: 'laser.mp4', desc: 'Sinar laser dinamis panggung', blendMode: 'screen' },
  { id: 'linght-warm-fireflies', name: 'Warm Fireflies', category: 'Linght', folder: 'Linght', file: 'warm fire files.mp4', desc: 'Kunang-kunang hangat beterbangan', blendMode: 'screen' },

  // ── RETRO (folder: Retro -> assets/Effects/Retro/*.mp4, thumbnail: assets/Effects/Retro/Images/Images Retro.jpeg)
  { id: 'retro-0916', name: 'Retro 0916', category: 'Retro', folder: 'Retro', file: '0916.mp4', desc: 'Distorsi derau angka dan garis retro', blendMode: 'screen' },
  { id: 'retro-1', name: 'Retro Glitch', category: 'Retro', folder: 'Retro', file: '1.mp4', desc: 'Garis sinyal analog dan glitch klasik', blendMode: 'screen' },
  { id: 'retro-analog-damage', name: 'Analog Damage', category: 'Retro', folder: 'Retro', file: 'Analog Damage.mp4', desc: 'Kerusakan pita kaset video analog', blendMode: 'screen' },
  { id: 'retro-antique-film', name: 'Antique Film', category: 'Retro', folder: 'Retro', file: 'Antique Film.mp4', desc: 'Gaya film antik seluloid klasik', blendMode: 'screen' },
  { id: 'retro-antique-rell', name: 'Antique Reel', category: 'Retro', folder: 'Retro', file: 'Antique Rell.mp4', desc: 'Putaran rol proyektor film antik', blendMode: 'screen' },
  { id: 'retro-blizzard', name: 'Retro Blizzard', category: 'Retro', folder: 'Retro', file: 'Blizzard.mp4', desc: 'Butiran salju dan derau atmosferik', blendMode: 'screen' },
  { id: 'retro-bright-fuzz', name: 'Bright Fuzz', category: 'Retro', folder: 'Retro', file: 'Bright Fuzz.mp4', desc: 'Pendaran cahaya kabur vintage cerah', blendMode: 'screen' },
  { id: 'retro-bw-grime', name: 'BW Grime', category: 'Retro', folder: 'Retro', file: 'BW Grime.mp4', desc: 'Tekstur kotoran film hitam putih', blendMode: 'screen' },
  { id: 'retro-bw-noise-pulse', name: 'BW Noise Pulse', category: 'Retro', folder: 'Retro', file: 'Bw Noise Pulse.mp4', desc: 'Denyutan noise monokromatik dinamis', blendMode: 'screen' },
  { id: 'retro-cement-scrub', name: 'Cement Scrub', category: 'Retro', folder: 'Retro', file: 'Cement Scrub.mp4', desc: 'Goresan kasar tekstur semen retro', blendMode: 'screen' },
  { id: 'retro-chalky-spam', name: 'Chalky Spam', category: 'Retro', folder: 'Retro', file: 'Chalky Spam.mp4', desc: 'Goresan kapur dan derau acak', blendMode: 'screen' },
  { id: 'retro-digitalzed-memory', name: 'Digitalized Memory', category: 'Retro', folder: 'Retro', file: 'Digitalzed Memory.mp4', desc: 'Distorsi memori digital lawas', blendMode: 'screen' },
  { id: 'retro-dotted', name: 'Dotted Grid', category: 'Retro', folder: 'Retro', file: 'Dotted.mp4', desc: 'Pola titik raster vintage', blendMode: 'screen' },
  { id: 'retro-film-damage', name: 'Film Damage', category: 'Retro', folder: 'Retro', file: 'Film Damget.mp4', desc: 'Goresan dan kerusakan seluloid film', blendMode: 'screen' },
  { id: 'retro-film-grunge', name: 'Film Grunge', category: 'Retro', folder: 'Retro', file: 'Film Grunge.mp4', desc: 'Tekstur grunge film sinematik usang', blendMode: 'screen' },
  { id: 'retro-film-projector', name: 'Film Projector', category: 'Retro', folder: 'Retro', file: 'Film Projector.mp4', desc: 'Sorotan proyektor film bergoyang', blendMode: 'screen' },
  { id: 'retro-film-strip', name: 'Film Strip', category: 'Retro', folder: 'Retro', file: 'Film Strip.mp4', desc: 'Bingkai pita seluloid bergerak vertikal', blendMode: 'screen' },
  { id: 'retro-flare', name: 'Retro Flare', category: 'Retro', folder: 'Retro', file: 'Flare.mp4', desc: 'Suar cahaya lensa vintage hangat', blendMode: 'screen' },
  { id: 'retro-fragment', name: 'Fragment Noise', category: 'Retro', folder: 'Retro', file: 'Fragment.mp4', desc: 'Pecahan fragmen visual terdistorsi', blendMode: 'screen' },
  { id: 'retro-fuzzy-memory', name: 'Fuzzy Memory', category: 'Retro', folder: 'Retro', file: 'Fuzzy Memory.mp4', desc: 'Efek kabur nostalgia masa lalu', blendMode: 'screen' },
  { id: 'retro-ghost-heat', name: 'Ghost Heat', category: 'Retro', folder: 'Retro', file: 'Ghost Heat.mp4', desc: 'Gelombang panas berbayang misterius', blendMode: 'screen' },
  { id: 'retro-heart-doodles', name: 'Heart Doodles', category: 'Retro', folder: 'Retro', file: 'Heart Doodles.mp4', desc: 'Coretan animasi hati gaya retro', blendMode: 'screen' },
  { id: 'retro-heat-codes', name: 'Heat Codes', category: 'Retro', folder: 'Retro', file: 'Heat Codes.mp4', desc: 'Kode termal dan glitch dinamis', blendMode: 'screen' },
  { id: 'retro-mysterious-flickers', name: 'Mysterious Flickers', category: 'Retro', folder: 'Retro', file: 'Mysterious Fickers.mp4', desc: 'Kedipan misterius proyektor tua', blendMode: 'screen' },
  { id: 'retro-panel-flash', name: 'Panel Flash', category: 'Retro', folder: 'Retro', file: 'Panel Flash.mp4', desc: 'Kilatan panel layar tabung CRT', blendMode: 'screen' },
  { id: 'retro-polaroid-cut', name: 'Polaroid Cut', category: 'Retro', folder: 'Retro', file: 'Polarold Cut.mp4', desc: 'Potongan bingkai foto polaroid', blendMode: 'screen' },
  { id: 'retro-red-noise-2', name: 'Red Noise 2', category: 'Retro', folder: 'Retro', file: 'Red Noise 2.mp4', desc: 'Derau partikel merah intens', blendMode: 'screen' },
  { id: 'retro-red-noise', name: 'Red Noise', category: 'Retro', folder: 'Retro', file: 'Red Noise.mp4', desc: 'Lapisan derau merah vintage', blendMode: 'screen' },
  { id: 'retro-codes-2', name: 'Retro Codes 2', category: 'Retro', folder: 'Retro', file: 'Retro Codes 2.mp4', desc: 'Deretan angka dan kode retro', blendMode: 'screen' },
  { id: 'retro-codes', name: 'Retro Codes', category: 'Retro', folder: 'Retro', file: 'Retro Codes.mp4', desc: 'Tampilan teks kode terminal jadul', blendMode: 'screen' },
  { id: 'retro-damage', name: 'Retro Damage', category: 'Retro', folder: 'Retro', file: 'Retro Damage.mp4', desc: 'Kerusakan pita sinyal vintage', blendMode: 'screen' },
  { id: 'retro-invert', name: 'Retro Invert', category: 'Retro', folder: 'Retro', file: 'Retro Invert.mp4', desc: 'Pembalikan warna negatif klasik', blendMode: 'screen' },
  { id: 'retro-overlay', name: 'Retro Overlay', category: 'Retro', folder: 'Retro', file: 'Retro Overlay.mp4', desc: 'Lapisan tekstur retro sinematik', blendMode: 'screen' },
  { id: 'retro-snow', name: 'Retro Snow', category: 'Retro', folder: 'Retro', file: 'Retro Snow.mp4', desc: 'Bintik derau salju layar televisi', blendMode: 'screen' },
  { id: 'retro-rgb-rage', name: 'RGB Rage', category: 'Retro', folder: 'Retro', file: 'RGB Rage.mp4', desc: 'Pemisahan saluran warna RGB glitch', blendMode: 'screen' },
  { id: 'retro-select-to-color', name: 'Select to Color', category: 'Retro', folder: 'Retro', file: 'Slect to Color.mp4', desc: 'Perpindahan spektrum warna vintage', blendMode: 'screen' },
  { id: 'retro-three', name: 'Retro Three', category: 'Retro', folder: 'Retro', file: 'Three.mp4', desc: 'Hitungan mundur proyektor 3 detik', blendMode: 'screen' },
  { id: 'retro-vhs-noise', name: 'VHS Noise', category: 'Retro', folder: 'Retro', file: 'VHS Noise.mp4', desc: 'Derau statis pita kaset VHS lawas', blendMode: 'screen' },
  { id: 'retro-vhs-tape', name: 'VHS Tape', category: 'Retro', folder: 'Retro', file: 'Vhs Tape.mp4', desc: 'Garis tracking pita kaset video', blendMode: 'screen' },
  { id: 'retro-vhs-visual', name: 'VHS Visual', category: 'Retro', folder: 'Retro', file: 'Vhs Visual.mp4', desc: 'Tampilan visual rekaman camcorder', blendMode: 'screen' },
  { id: 'retro-vintage-pink', name: 'Vintage Pink', category: 'Retro', folder: 'Retro', file: 'Vintage Pink.mp4', desc: 'Pendaran rona merah muda vintage', blendMode: 'screen' },
  { id: 'retro-water-cracks', name: 'Water Cracks', category: 'Retro', folder: 'Retro', file: 'Water Cracks.mp4', desc: 'Goresan retakan cairan film tua', blendMode: 'screen' },
];

/* ─── Helper ─────────────────────────────────────────────────── */
function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
function formatTime(s) {
  if (s == null || isNaN(s)) return '00:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}
function formatTimeMs(s) {
  if (s == null || isNaN(s)) return '0:00.00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 100);
  return `${m}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function getEffectThumbnail(effOrItem) {
  if (!effOrItem) return '/assets/Images/Linght.png';
  const folder = (effOrItem.folder || '').trim().toLowerCase();
  if (folder === 'fire') return '/assets/Images/Fire.png';
  if (folder === 'smoke') return '/assets/Images/Smoke.png';
  if (folder === 'linght') return '/assets/Images/Linght.png';
  if (folder === 'retro') return '/assets/Effects/Retro/Images/Images%20Retro.jpeg';

  const name = (effOrItem.name || effOrItem.file?.name || effOrItem.file || effOrItem.id || '').toLowerCase();
  if (name.includes('fire') || name.includes('ember') || name.includes('spark')) return '/assets/Images/Fire.png';
  if (name.includes('smoke') || name.includes('fog') || name.includes('mist')) return '/assets/Images/Smoke.png';
  if (name.includes('retro') || name.includes('vhs') || name.includes('vintage') || name.includes('film') || name.includes('analog') || name.includes('polaroid') || name.includes('grime') || name.includes('chalky')) return '/assets/Effects/Retro/Images/Images%20Retro.jpeg';
  return '/assets/Images/Linght.png';
}

function getTrackHeight(track) {
  if (!track) return '90px';
  if (track.type === 'text') return '36px';
  if (track.type === 'effect' || track.isEffectTrack) return '30px';
  if (track.type === 'audio') return '42px';
  return '90px';
}

function generateLRC(lines, title = 'Karaoke', artist = '') {
  let lrc = `[ti:${title}]\n[ar:${artist}]\n[by:ShotAi Karaoke Studio]\n\n`;
  lines.forEach(l => {
    const m = Math.floor(l.start / 60).toString().padStart(2, '0');
    const s = Math.floor(l.start % 60).toString().padStart(2, '0');
    const ms = Math.floor((l.start % 1) * 100).toString().padStart(2, '0');
    lrc += `[${m}:${s}.${ms}]${l.text}\n`;
  });
  return lrc;
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
function LyricsEditor({ lines, setLines, selectedLineIdx, setSelectedLineIdx, font = 'System', textSize = 24 }) {
  const [editIdx, setEditIdx] = useState(null);
  const [editText, setEditText] = useState('');

  const startEdit = (i) => { setEditIdx(i); setEditText(lines[i].text); if (setSelectedLineIdx) setSelectedLineIdx(i); };
  const saveEdit = () => {
    if (editIdx === null) return;
    setLines(prev => prev.map((l, i) => i === editIdx ? { ...l, text: editText } : l));
    setEditIdx(null);
  };
  const deleteLine = (i) => {
    setLines(prev => prev.filter((_, idx) => idx !== i));
    if (setSelectedLineIdx) setSelectedLineIdx(null);
  };
  const addLine = () => setLines(prev => [
    ...prev,
    { 
      text: '', 
      start: (prev[prev.length - 1]?.end || 0) + 0.5, 
      end: (prev[prev.length - 1]?.end || 0) + 3, 
      animDuration: 1.5,
      font,
      fontSize: textSize
    }
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {lines.map((line, i) => {
        const isSelected = selectedLineIdx === i;
        return (
          <div key={i}
            onClick={() => { if (setSelectedLineIdx) setSelectedLineIdx(i); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 10px', borderRadius: '8px',
              backgroundColor: isSelected ? 'rgba(251,191,36,0.1)' : '#18181b',
              border: isSelected ? '1px solid #fbbf24' : '1px solid #27272a',
              cursor: 'pointer',
            }}>
            <span style={{ fontSize: '11px', color: isSelected ? '#fbbf24' : '#71717a', minWidth: '52px', fontWeight: isSelected ? 700 : 400 }}>
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
                  color: '#f4f4f5', fontSize: '12px',
                }}
              />
            ) : (
              <span style={{ flex: 1, fontSize: '12px', color: isSelected ? '#ffffff' : '#d4d4d8', cursor: 'text', fontWeight: isSelected ? 600 : 400 }}
                onClick={(e) => { e.stopPropagation(); startEdit(i); }}>
                {line.text || <span style={{ color: '#52525b' }}>(kosong)</span>}
              </span>
            )}
            <button onClick={(e) => { e.stopPropagation(); startEdit(i); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', padding: '2px' }}>
              <Edit3 size={12} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); deleteLine(i); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}>
              <Trash2 size={12} />
            </button>
          </div>
        );
      })}
      <button onClick={addLine} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        padding: '8px', borderRadius: '8px', border: '1.5px dashed #27272a',
        background: '#18181b', cursor: 'pointer', color: '#a1a1aa', fontSize: '12px',
        transition: 'border-color 0.2s, color 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#60a5fa'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272a'; e.currentTarget.style.color = '#a1a1aa'; }}
      >
        <Plus size={14} /> Tambah Text
      </button>
    </div>
  );
}

const waveformCache = new Map();

/* ─── Audio Waveform Visualizer Canvas Component ────────────── */
function AudioWaveformCanvas({ file, currentTime, duration, sourceStart = 0, sourceDuration = 0, onSeek, onStatusChange, compact = false }) {
  const canvasRef = useRef(null);
  let actualPath = file?.path || file?._filePath || null;
  if (!actualPath && file && typeof File !== 'undefined' && file instanceof File && window.require) {
    try {
      actualPath = window.require('electron').webUtils?.getPathForFile(file) || null;
    } catch (e) {
      actualPath = null;
    }
  }
  const cacheKey = actualPath || file?.name || (typeof file === 'string' ? file : null);

  const [pcmData, setPcmData] = useState(() => (cacheKey && waveformCache.has(cacheKey)) ? waveformCache.get(cacheKey) : null);
  const [isDecoding, setIsDecoding] = useState(() => !(cacheKey && waveformCache.has(cacheKey)));

  // Decode audio file to mono PCM min-max peaks when file changes
  useEffect(() => {
    if (!file) {
      setPcmData(null);
      return;
    }

    if (cacheKey && waveformCache.has(cacheKey)) {
      setPcmData(waveformCache.get(cacheKey));
      setIsDecoding(false);
      return;
    }

    let isCancelled = false;
    let isProcessing = false;
    setIsDecoding(true);
    isProcessing = true;
    setTimeout(() => onStatusChange?.(true), 0);

    const finishProcessing = () => {
      if (isProcessing) {
        isProcessing = false;
        setTimeout(() => onStatusChange?.(false), 0);
      }
    };

    const decodeAudio = async () => {
      try {
        if (actualPath && window.require) {
           try {
             const { ipcRenderer } = window.require('electron');
             const base64Data = await ipcRenderer.invoke('extract-waveform', { filePath: actualPath });
             if (typeof base64Data === 'string') {
               if (base64Data === '') {
                 // No audio track found
                 if (!isCancelled) {
                   const flat = new Float32Array(8000);
                   if (cacheKey) waveformCache.set(cacheKey, flat);
                   setPcmData(flat);
                   setIsDecoding(false);
                   finishProcessing();
                 }
                 return;
               }
               
               const { Buffer } = window.require('buffer');
               const buffer = Buffer.from(base64Data, 'base64');
               const alignedLen = Math.floor(buffer.length / 4) * 4;
               const floatArray = new Float32Array(buffer.buffer, buffer.byteOffset, alignedLen / 4);
               
               if (!isCancelled) {
                 if (cacheKey) waveformCache.set(cacheKey, floatArray);
                 setPcmData(floatArray);
                 setIsDecoding(false);
                 finishProcessing();
               }
               return; // Skip fallback
             }
           } catch(e) { console.error('IPC extract-waveform failed', e); }
        }

        // Fallback to HTML5 decodeAudioData
        if (file.size > 300 * 1024 * 1024) {
          const numSamples = 8000;
          const fakeData = new Float32Array(numSamples);
          
          const seedStr = file.name + file.size;
          let seed = 0;
          for (let i = 0; i < seedStr.length; i++) seed += seedStr.charCodeAt(i);
          const random = () => {
             const x = Math.sin(seed++) * 10000;
             return x - Math.floor(x);
          };

          let isSpeaking = false;
          let sectionLength = 0;
          let sectionProgress = 0;
          let volume = 0;

          for (let i = 0; i < numSamples; i++) {
             if (sectionProgress >= sectionLength) {
                 isSpeaking = random() > 0.3;
                 sectionLength = Math.floor(random() * 300) + 50; 
                 sectionProgress = 0;
                 volume = isSpeaking ? (random() * 0.7 + 0.3) : (random() * 0.05); 
             }
             const env = Math.sin((sectionProgress / sectionLength) * Math.PI); 
             const noise = (random() * 2.0 - 1.0);
             fakeData[i] = noise * env * volume;
             sectionProgress++;
          }
          if (!isCancelled) {
            if (cacheKey) waveformCache.set(cacheKey, fakeData);
            setPcmData(fakeData);
            setIsDecoding(false);
            finishProcessing();
          }
          return;
        }

        const url = file._fileUrl || URL.createObjectURL(file);
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        if (!file._fileUrl) URL.revokeObjectURL(url);

        const bufferCopy = arrayBuffer.slice(0);
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx();

        audioCtx.decodeAudioData(bufferCopy, (audioBuffer) => {
          if (isCancelled) return;
          const numChannels = audioBuffer.numberOfChannels;
          const length = audioBuffer.length;
          const mono = new Float32Array(length);

          if (numChannels >= 2) {
            const left = audioBuffer.getChannelData(0);
            const right = audioBuffer.getChannelData(1);
            for (let i = 0; i < length; i++) {
              mono[i] = (left[i] + right[i]) / 2;
            }
          } else {
            mono.set(audioBuffer.getChannelData(0));
          }

          if (cacheKey) waveformCache.set(cacheKey, mono);
          setPcmData(mono);
          setIsDecoding(false);
          finishProcessing();
          try { audioCtx.close(); } catch(e){}
        }, (err) => {
          console.warn('AudioContext decodeAudioData error:', err);
          if (!isCancelled) { setIsDecoding(false); finishProcessing(); }
          try { audioCtx.close(); } catch(e){}
        });
      } catch (err) {
        console.error('Waveform audio decoding error:', err);
        if (!isCancelled) { setIsDecoding(false); finishProcessing(); }
      }
    };

    decodeAudio();
    return () => { 
      isCancelled = true; 
      finishProcessing();
    };
  }, [file, cacheKey]);

  // Render sharp HTML5 Canvas Waveform on pcmData, currentTime, or resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || rect.width < 10 || !rect.height) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    if (isDecoding) {
      ctx.fillStyle = '#00d8b6';
      ctx.font = compact ? '9px Inter, sans-serif' : '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(compact ? 'Memuat audio...' : 'Menganalisis frekuensi audio…', width / 2, centerY + 3);
      return;
    }

    if (!pcmData || pcmData.length === 0) {
      return;
    }

    const effectiveDuration = (duration && duration > 0)
      ? duration
      : (pcmData ? Math.max(1, pcmData.length / 44100) : 30);

    // 1. Slicing PCM sesuai sourceStart dan duration yang sedang aktif di timeline
    const totalFileSec = (sourceDuration && sourceDuration > 0)
      ? sourceDuration
      : Math.max(effectiveDuration + (sourceStart || 0), pcmData.length / 4000);

    let activePcm = pcmData;
    if (totalFileSec > 0 && pcmData.length > 0) {
      const sStart = Math.max(0, sourceStart || 0);
      const sEnd = Math.min(totalFileSec, sStart + effectiveDuration);
      const sampleRate = pcmData.length / totalFileSec;
      const idxStart = Math.min(pcmData.length - 1, Math.max(0, Math.floor(sStart * sampleRate)));
      const idxEnd = Math.min(pcmData.length, Math.max(idxStart + 10, Math.floor(sEnd * sampleRate)));
      activePcm = pcmData.subarray(idxStart, idxEnd);
    }

    if (!activePcm || activePcm.length === 0) return;

    // 2. Ekstraksi Puncak & RMS (High-Fidelity Peak + RMS with Dynamic Range Compression)
    const barSpacing = compact ? 2.2 : 3.2;
    const numBars = Math.max(1, Math.floor(width / barSpacing));
    const samplesPerBar = Math.max(1, Math.floor(activePcm.length / numBars));

    const barAmplitudes = new Float32Array(numBars);
    let maxAmp = 0.0001;

    for (let i = 0; i < numBars; i++) {
      const start = i * samplesPerBar;
      const end = Math.min(activePcm.length, start + samplesPerBar);
      let peak = 0;
      let sumSq = 0;

      for (let j = start; j < end; j++) {
        const val = Math.abs(activePcm[j]);
        if (val > peak) peak = val;
        sumSq += val * val;
      }

      const count = Math.max(1, end - start);
      const rms = Math.sqrt(sumSq / count);
      // Combine peak and RMS: captures vocal clarity, speech transients and musical body
      const combined = Math.max(peak * 0.75, rms * 2.2);
      barAmplitudes[i] = combined;
      if (combined > maxAmp) maxAmp = combined;
    }

    // Global reference peak to keep quiet/silence flat and realistic
    let refPeak = 0.05;
    const sampleStep = Math.max(1, Math.floor(pcmData.length / 400));
    for (let k = 0; k < pcmData.length; k += sampleStep) {
      const v = Math.abs(pcmData[k]);
      if (v > refPeak) refPeak = v;
    }
    const effectiveMax = Math.max(refPeak * 0.85, maxAmp);

    // 3. Normalisasi Visual & Perceptual Scaling
    const currentPct = effectiveDuration > 0 ? Math.max(0, Math.min(1, currentTime / effectiveDuration)) : 0;
    const playheadX = currentPct * width;

    // Subtle horizontal center guideline
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Render Audio Waveform Bars
    const barWidth = compact ? 1.5 : 2;
    for (let i = 0; i < numBars; i++) {
      const x = (i / numBars) * width;

      // Logarithmic / perceptual power curve (0.68) so normal speech and music are tall & clearly visible
      const rawNorm = barAmplitudes[i] / (effectiveMax || 1.0);
      const scaledNorm = Math.pow(Math.min(1.0, rawNorm * 1.15), 0.68);

      const barHeight = Math.max(compact ? 1.5 : 2, scaledNorm * (height - (compact ? 4 : 6)));
      const topY = centerY - barHeight / 2;

      const isPlayed = x <= playheadX;

      if (isPlayed) {
        // Vibrant Cyan / Blue / Teal gradient for played section
        const gradient = ctx.createLinearGradient(0, topY, 0, topY + barHeight);
        gradient.addColorStop(0, '#00d8b6');
        gradient.addColorStop(0.5, '#38bdf8');
        gradient.addColorStop(1, '#818cf8');
        ctx.fillStyle = gradient;
      } else {
        // High-contrast, elegant mint / emerald gradient for unplayed section
        const gradient = ctx.createLinearGradient(0, topY, 0, topY + barHeight);
        gradient.addColorStop(0, '#00d8b6'); // Teal / Mint
        gradient.addColorStop(0.5, 'rgba(45, 212, 191, 0.85)'); // Teal
        gradient.addColorStop(1, 'rgba(20, 184, 166, 0.7)');
        ctx.fillStyle = gradient;
      }

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, topY, barWidth, barHeight, 1);
      } else {
        ctx.rect(x, topY, barWidth, barHeight);
      }
      ctx.fill();
    }

    // 4. Glowing Playhead Cursor Line
    if (effectiveDuration > 0 && currentTime > 0 && currentTime <= effectiveDuration) {
      ctx.shadowColor = '#00d8b6';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(playheadX - 1, 0, 2, height);
      ctx.shadowBlur = 0; // Reset glow
    }

  }, [pcmData, isDecoding, currentTime, duration, sourceStart, sourceDuration, compact]);

  const handleClick = (e) => {
    if (!canvasRef.current || !onSeek || !duration) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    onSeek(pct * duration);
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        cursor: 'pointer',
      }}
    />
  );
}

/* ─── Timeline Track (Multi-Track Kolam) ─────────────────────── */
function TimelineTrack({ tracks, setTracks, lines, setLines, duration, currentTime, onSeek, selectedLineIdx, setSelectedLineIdx, selectedTrackItemId, setSelectedTrackItemId, onRemoveTrack, zoom, setZoom, onStatusChange, setIsPlaying, setAudioUrl, audioRef, stopMediaBinPreview, clipboardItem: externalClipboardItem, setClipboardItem: externalSetClipboardItem, markers = [], setMarkers, useLyricsVersion = true, coverPhotoUrl, setCoverPhotoUrl }) {
  const scrollRef = useRef(null);
  const rulerRef = useRef(null);
  const headerScrollRef = useRef(null);
  const coverFileInputRef = useRef(null);
  const dragStartYRef = useRef(0);
  const dragMovedRef = useRef(false);
  
  // Dragging states & Magnetic Snapping
  const [draggingItem, setDraggingItem] = useState(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [initialStart, setInitialStart] = useState(0);
  const [initialEnd, setInitialEnd] = useState(0);
  const [dragDeltaTime, setDragDeltaTime] = useState(0);
  const [contextMenu, setContextMenu] = useState(null);
  const [localClipboardItem, setLocalClipboardItem] = useState(null);
  const clipboardItem = externalClipboardItem !== undefined ? externalClipboardItem : localClipboardItem;
  const setClipboardItem = externalSetClipboardItem || setLocalClipboardItem;
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [isolatingItem, setIsolatingItem] = useState(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [snapGuideTime, setSnapGuideTime] = useState(null);
  const [hoverTargetTrackId, setHoverTargetTrackId] = useState(null);
  const [dragDeltaY, setDragDeltaY] = useState(0);
  const [newTrackDropZone, setNewTrackDropZone] = useState(null); // 'top_visual' | 'bottom_visual' | 'bottom_audio' | null
  const [placeholderHidden, setPlaceholderHidden] = useState(false);
  const [placeholderMuted, setPlaceholderMuted] = useState(false);
  const [placeholderLocked, setPlaceholderLocked] = useState(false);
  const [draggingTextTrackIdx, setDraggingTextTrackIdx] = useState(null);

  // Check if timeline contains any data (tracks items or text lines)
  const hasTimelineData = useMemo(() => {
    const hasTrackItems = tracks && tracks.some(t => (t.items || []).length > 0);
    const hasTextLines = lines && lines.length > 0;
    return Boolean(hasTrackItems || hasTextLines);
  }, [tracks, lines]);

  // Maximum timeline duration bounded by the furthest clip in the timeline (tracks or text lines)
  const allTimelineItems = useMemo(() => tracks.flatMap(t => t.items || []), [tracks]);
  const maxTimelineEnd = useMemo(() => {
    const trackEnd = allTimelineItems.length > 0 ? Math.max(...allTimelineItems.map(i => i.end || 0)) : 0;
    const linesEnd = (lines && lines.length > 0) ? Math.max(...lines.map(l => l.end || 0)) : 0;
    return Math.max(trackEnd, linesEnd);
  }, [allTimelineItems, lines]);

  const visualTracks = useMemo(() => {
    return tracks.filter(t => !t.isEffectTrack && t.type !== 'effect' && (t.type === 'video' || t.type === 'image'));
  }, [tracks]);

  // Offset sebelum 00:00 (untuk tombol Cover dan jarak bersih sesuai Photo 2)
  const TIMELINE_START_OFFSET = 64;

  const handleCoverPhotoUpload = (e) => {
    const f = e.target.files?.[0];
    if (f && setCoverPhotoUrl) {
      const url = f._fileUrl || URL.createObjectURL(f);
      setCoverPhotoUrl(url);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
      setSubmenuOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleCopy = () => {
    if (contextMenu && (contextMenu.item || contextMenu.lineIdx !== undefined)) {
      if (contextMenu.itemType === 'text') {
        const line = lines[contextMenu.lineIdx];
        if (line) {
          setClipboardItem({
            type: 'text',
            data: JSON.parse(JSON.stringify(line))
          });
        }
      } else if (contextMenu.item) {
        setClipboardItem({
          type: contextMenu.itemType,
          trackId: contextMenu.trackId,
          data: {
            ...contextMenu.item,
            file: contextMenu.item.file
          }
        });
      }
    } else if (selectedTrackItemId) {
      for (const t of tracks) {
        const it = (t.items || []).find(i => i.id === selectedTrackItemId);
        if (it) {
          setClipboardItem({
            type: t.type,
            trackId: t.id,
            data: {
              ...it,
              file: it.file
            }
          });
          break;
        }
      }
    } else if (selectedLineIdx !== null && lines[selectedLineIdx]) {
      setClipboardItem({
        type: 'text',
        data: JSON.parse(JSON.stringify(lines[selectedLineIdx]))
      });
    }
    setContextMenu(null);
    setSubmenuOpen(false);
  };

  const handleDelete = (menuData = contextMenu) => {
    if (menuData && (menuData.itemId || menuData.lineIdx !== undefined)) {
      if (menuData.itemType === 'text' && menuData.lineIdx !== undefined) {
        if (lines[menuData.lineIdx]?.locked) return;
        setLines(prev => prev.filter((_, idx) => idx !== menuData.lineIdx));
        if (selectedLineIdx === menuData.lineIdx) setSelectedLineIdx(null);
      } else if (menuData.trackId && menuData.itemId) {
        const trk = tracks.find(t => t.id === menuData.trackId);
        if (trk?.locked) return;
        setTracks(prev => prev.map(t => 
          t.id === menuData.trackId 
            ? { ...t, items: t.items.filter(i => i.id !== menuData.itemId) } 
            : t
        ).filter(t => t.items.length > 0));
        if (selectedTrackItemId === menuData.itemId) setSelectedTrackItemId(null);
      }
    } else if (selectedTrackItemId) {
      setTracks(prev => prev.map(t => {
        if (t.locked) return t;
        return {
          ...t,
          items: t.items.filter(i => i.id !== selectedTrackItemId)
        };
      }).filter(t => t.items.length > 0));
      setSelectedTrackItemId(null);
    } else if (selectedLineIdx !== null) {
      if (!lines[selectedLineIdx]?.locked) {
        setLines(prev => prev.filter((_, idx) => idx !== selectedLineIdx));
        setSelectedLineIdx(null);
      }
    }
    setContextMenu(null);
    setSubmenuOpen(false);
  };

  const handleCut = () => {
    if (contextMenu?.itemType === 'text' && lines[contextMenu.lineIdx]?.locked) return;
    if (contextMenu?.trackId && tracks.find(t => t.id === contextMenu.trackId)?.locked) return;
    handleCopy();
    handleDelete(contextMenu);
  };

  const handlePaste = () => {
    if (!clipboardItem) return;
    const pasteTime = Math.max(0, currentTime || 0);

    if (clipboardItem.type === 'text') {
      const origDur = Math.max(0.5, (clipboardItem.data.end - clipboardItem.data.start) || 3);
      const newLine = {
        ...clipboardItem.data,
        start: Number(pasteTime.toFixed(3)),
        end: Number((pasteTime + origDur).toFixed(3))
      };
      setLines(prev => {
        const next = [...prev, newLine];
        return next.sort((a, b) => a.start - b.start);
      });
    } else {
      const origDur = Math.max(0.5, (clipboardItem.data.end - clipboardItem.data.start) || 5);

      setTracks(prev => {
        let targetIdx = prev.findIndex(t => t.id === contextMenu?.trackId && t.type === clipboardItem.type);
        if (targetIdx === -1) {
          targetIdx = prev.findIndex(t => t.type === clipboardItem.type);
        }
        if (targetIdx === -1 && (clipboardItem.type === 'video' || clipboardItem.type === 'image')) {
          targetIdx = prev.findIndex(t => t.type === 'video' || t.type === 'image');
        }
        // Effects must always be pasted into their own separate new track!
        if (clipboardItem.type === 'effect' || clipboardItem.data?.isEffect) {
          targetIdx = -1;
        }

        if (targetIdx !== -1) {
          const targetTrack = prev[targetIdx];
          const lastEnd = targetTrack.items.length > 0 ? Math.max(...targetTrack.items.map(i => i.end || 0)) : 0;
          let safeStart = pasteTime;
          // Check overlap: if pasteTime overlaps an existing item, put it at lastEnd
          const hasOverlap = targetTrack.items.some(i => safeStart < i.end && safeStart + origDur > i.start);
          if (hasOverlap) {
            safeStart = lastEnd;
          }

          const newItem = {
            ...clipboardItem.data,
            id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            start: Number(safeStart.toFixed(3)),
            end: Number((safeStart + origDur).toFixed(3))
          };

          return prev.map((t, idx) => 
            idx === targetIdx ? { ...t, items: [...t.items, newItem] } : t
          );
        } else {
          const newItem = {
            ...clipboardItem.data,
            id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            start: Number(pasteTime.toFixed(3)),
            end: Number((pasteTime + origDur).toFixed(3))
          };
          const isEff = Boolean(clipboardItem.type === 'effect' || clipboardItem.data?.isEffect);
          const newTrack = {
            id: 'track-' + Date.now(),
            type: clipboardItem.type,
            isEffectTrack: isEff,
            items: [newItem]
          };
          if (clipboardItem.type === 'audio') {
            return [...prev, newTrack];
          } else {
            const firstAudioIdx = prev.findIndex(t => t.type === 'audio');
            if (firstAudioIdx === -1) return [...prev, newTrack];
            const next = [...prev];
            next.splice(firstAudioIdx, 0, newTrack);
            return next;
          }
        }
      });
    }
    setContextMenu(null);
    setSubmenuOpen(false);
  };

  // ── Keyboard Shortcuts: Delete (Delete/Backspace), Copy (Ctrl+C), Paste (Ctrl+V) ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.isContentEditable
      );
      if (isInput) return; // Do not intercept typing in text boxes

      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDelete();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        handleCopy();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        handlePaste();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTrackItemId, selectedLineIdx, clipboardItem, tracks, lines, currentTime, contextMenu]);

  const handleIsolateVoice = async (mode) => {
    if (!contextMenu || !contextMenu.item) return;
    const targetItem = contextMenu.item;
    const targetTrackId = contextMenu.trackId;
    const targetItemId = contextMenu.itemId;

    setContextMenu(null);
    setSubmenuOpen(false);
    setIsolatingItem({ id: targetItemId, mode });
    onStatusChange?.(1);

    try {
      let filePath = targetItem.filePath;
      const fileObj = targetItem.file;
      if (!filePath && fileObj) {
        filePath = fileObj.path || fileObj._filePath;
        if (!filePath && window.require) {
          try {
            filePath = window.require('electron').webUtils?.getPathForFile(fileObj);
          } catch (e) {}
        }
      }
      if (!filePath && targetItem.url && targetItem.url.startsWith('file:///')) {
        try {
          filePath = decodeURIComponent(targetItem.url.replace('file:///', ''));
        } catch (e) {}
      }

      // If still not found, write blob or fetched audio to a temporary file
      if (!filePath && window.require) {
        try {
          const fs = window.require('fs');
          const path = window.require('path');
          const os = window.require('os');
          const tempPath = path.join(os.tmpdir(), `shotai_temp_${Date.now()}.mp3`);
          let buf = null;
          if (fileObj && fileObj.arrayBuffer) {
            const ab = await fileObj.arrayBuffer();
            const { Buffer } = window.require('buffer');
            buf = Buffer.from(ab);
          } else if (targetItem.url) {
            const resp = await fetch(targetItem.url);
            const ab = await resp.arrayBuffer();
            const { Buffer } = window.require('buffer');
            buf = Buffer.from(ab);
          }
          if (buf) {
            fs.writeFileSync(tempPath, buf);
            filePath = tempPath;
          }
        } catch (e) {
          console.error('Failed to create temp audio file for isolation:', e);
        }
      }

      if (!filePath) {
        alert('File audio tidak ditemukan pada sistem.');
        return;
      }

      if (!window.require) {
        alert('Fitur isolate voice hanya tersedia di aplikasi desktop Electron.');
        return;
      }

      const { ipcRenderer } = window.require('electron');
      const res = await ipcRenderer.invoke('isolate-audio', { filePath, mode });

      if (res && res.success) {
        const newFileObj = {
          path: res.filePath,
          _filePath: res.filePath,
          name: res.name,
          type: 'audio/mp3',
          _fileUrl: res.fileUrl
        };

        setTracks(prev => prev.map(t => {
          if (t.id !== targetTrackId) return t;
          return {
            ...t,
            items: t.items.map(it => {
              if (it.id !== targetItemId) return it;
              return {
                ...it,
                name: res.name,
                filePath: res.filePath,
                url: res.fileUrl,
                file: newFileObj
              };
            })
          };
        }));

        if (setAudioUrl) {
          setAudioUrl(res.fileUrl);
        }
        if (audioRef?.current) {
          audioRef.current.src = res.fileUrl;
        }
      } else {
        alert('Gagal memproses Isolate Voice: ' + (res?.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Isolate voice error:', err);
      alert('Terjadi kesalahan saat memproses audio: ' + err.message);
    } finally {
      setIsolatingItem(null);
      onStatusChange?.(-1);
    }
  };
  
  // ── Resizable Track Header State
  const [headerWidth, setHeaderWidth] = useState(120);
  const [isResizingHeader, setIsResizingHeader] = useState(false);
  const resizeHeaderStartXRef = useRef(0);
  const initialHeaderWidthRef = useRef(120);

  // ── Timeline Container Width for Dynamic Zoom (Fit to Screen) ──
  const [containerWidth, setContainerWidth] = useState(800);
  useEffect(() => {
    if (!scrollRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, []);

  const startResizingHeader = (e) => {
    e.preventDefault();
    setIsResizingHeader(true);
    resizeHeaderStartXRef.current = e.clientX;
    initialHeaderWidthRef.current = headerWidth;
  };

  useEffect(() => {
    if (!isResizingHeader) return;
    const handleMouseMove = (e) => {
      const deltaX = e.clientX - resizeHeaderStartXRef.current;
      setHeaderWidth(Math.max(50, Math.min(300, initialHeaderWidthRef.current + deltaX)));
    };
    const handleMouseUp = () => setIsResizingHeader(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingHeader]);

  // Track sorting states
  const [draggingTrackIdx, setDraggingTrackIdx] = useState(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 5 : -5;
        setZoom(prev => Math.max(0, Math.min(100, prev + delta)));
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // ── Determine Media Category & Base Timeline Span (0% Zoom Scale) ──
  const hasAudioOrVideo = tracks.some(t => (t.type === 'video' || t.type === 'audio') && t.items && t.items.length > 0);
  const hasImage = tracks.some(t => t.type === 'image' && t.items && t.items.length > 0);
  const currentCategory = hasAudioOrVideo ? 'media' : (hasImage ? 'image' : 'none');

  // baseSpan: visible timeline seconds at 0% zoom
  // - Photo only: 5s clip length, 18s visible width
  // - Video / Audio: ~4 min (240s) file -> 18 min (1080s) visible width (4.5x ratio, minimum 18 min)
  let baseSpan = 18;
  if (hasAudioOrVideo || duration > 18) {
    baseSpan = Math.max(1080, (duration || 0) * 4.5);
  } else {
    baseSpan = 18;
  }

  const safeDuration = Math.max(baseSpan, duration || 0);

  const maxPx = 300;
  const cWidth = containerWidth > 0 ? containerWidth : 800;
  const minPx = cWidth / baseSpan;
  const clampedMinPx = Math.max(0.001, Math.min(minPx, maxPx));
  const pxPerSec = clampedMinPx * Math.pow(maxPx / clampedMinPx, zoom / 100);

  // At zoom = 0%, content fits exactly within containerWidth (totalPx === cWidth, horizontal scroll disabled).
  // At zoom > 0%, totalPx expands proportionally and becomes scrollable.
  const totalPx = zoom === 0
    ? cWidth
    : Math.max(cWidth, safeDuration * pxPerSec);

  // ── Auto-adjust zoom when transitioning from photo (18s scale) to video/audio (18m scale) ──
  const prevCategoryRef = useRef('none');

  useEffect(() => {
    if (currentCategory === 'none') {
      prevCategoryRef.current = 'none';
      return;
    }

    if (currentCategory === 'media' && prevCategoryRef.current === 'image') {
      // When video/mp3 (4 mins) is added after photo (5s/18s):
      // Visible viewport remains at 18 seconds, but zoom slider moves up to reflect scale change!
      const targetVisibleSec = 18;
      const targetPxPerSec = cWidth / targetVisibleSec;
      const minPxNew = cWidth / baseSpan;
      if (targetPxPerSec > minPxNew && maxPx > minPxNew) {
        const calculatedZoom = Math.min(100, Math.max(0, Math.round(100 * (Math.log(targetPxPerSec / minPxNew) / Math.log(maxPx / minPxNew)))));
        setZoom(calculatedZoom);
      }
      prevCategoryRef.current = 'media';
    } else if (prevCategoryRef.current === 'none') {
      prevCategoryRef.current = currentCategory;
    }
  }, [currentCategory, baseSpan, cWidth, setZoom]);

  // ── Playhead Needle Dragging (Jarum Biru) ─────────────────────
  useEffect(() => {
    if (!isDraggingPlayhead) return;
    if (!hasTimelineData || maxTimelineEnd <= 0) {
      setIsDraggingPlayhead(false);
      return;
    }

    const handlePlayheadMove = (e) => {
      if (!rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left - TIMELINE_START_OFFSET;
      const rawTime = (rawX / totalPx) * safeDuration;
      // Clamped to [0, maxTimelineEnd]. Cannot exceed the end of the last item in timeline!
      const clamped = Math.max(0, Math.min(maxTimelineEnd, rawTime));
      onSeek(Number(clamped.toFixed(3)));
    };

    const handlePlayheadUp = () => {
      setIsDraggingPlayhead(false);
    };

    window.addEventListener('mousemove', handlePlayheadMove);
    window.addEventListener('mouseup', handlePlayheadUp);
    return () => {
      window.removeEventListener('mousemove', handlePlayheadMove);
      window.removeEventListener('mouseup', handlePlayheadUp);
    };
  }, [isDraggingPlayhead, hasTimelineData, maxTimelineEnd, totalPx, safeDuration, onSeek]);

  // -- Item Dragging (Ghost drag, magnetic snapping, vertical track hopping, new track creation) --
  useEffect(() => {
    if (!draggingItem) return;
    
    let finalDeltaTime = 0;
    let currentHoverTid = draggingItem.trackId;
    let currentDropZone = null;

    // Collect magnetic snap points:
    const snapPoints = [0];
    if (currentTime > 0) snapPoints.push(currentTime);
    tracks.forEach(t => {
      (t.items || []).forEach(it => {
        if (it.id !== draggingItem.itemId) {
          snapPoints.push(it.start);
          snapPoints.push(it.end);
        }
      });
    });
    lines.forEach(l => {
      snapPoints.push(l.start);
      snapPoints.push(l.end);
    });
    (markers || []).forEach(m => {
      if (typeof m.time === 'number') snapPoints.push(m.time);
    });

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - dragStartX;
      if (Math.abs(deltaX) > 3) dragMovedRef.current = true;
      
      const rawDelta = (deltaX / totalPx) * safeDuration;
      let effectiveDelta = rawDelta;
      let activeSnapLine = null;

      if (draggingItem.mode === 'move') {
        const deltaY = e.clientY - dragStartYRef.current;
        setDragDeltaY(deltaY);

        const itemDur = initialEnd - initialStart;
        let candStart = Math.max(0, initialStart + rawDelta);
        let candEnd = candStart + itemDur;

        // Anti-overlap clamping against other items in the track:
        const activeTid = currentHoverTid || draggingItem.trackId;
        const targetTrack = tracks.find(t => t.id === activeTid);
        const otherItems = targetTrack ? (targetTrack.items || []).filter(it => it.id !== draggingItem.itemId) : [];
        const leftItems = otherItems.filter(it => it.start < initialStart);
        const minAllowedStart = leftItems.length > 0 ? Math.max(...leftItems.map(it => it.end || 0)) : 0;
        const rightItems = otherItems.filter(it => it.start >= initialStart);
        const maxAllowedStart = rightItems.length > 0 ? Math.min(...rightItems.map(it => it.start || 0)) - itemDur : Infinity;

        if (maxAllowedStart >= minAllowedStart) {
          candStart = Math.max(minAllowedStart, Math.min(maxAllowedStart, candStart));
        } else {
          candStart = minAllowedStart;
        }
        candEnd = candStart + itemDur;
        effectiveDelta = candStart - initialStart;

        // Snap tolerance (~14px on screen, converted to seconds)
        const snapTolSec = Math.max(0.12, (14 / totalPx) * safeDuration);
        let closestDist = Infinity;

        // Snap points including minAllowedStart and maxAllowedStart
        const localSnapPoints = [...snapPoints];
        if (minAllowedStart > 0) localSnapPoints.push(minAllowedStart);
        if (isFinite(maxAllowedStart)) localSnapPoints.push(maxAllowedStart);

        for (const sp of localSnapPoints) {
          // Snap start to point (e.g. end of previous video!)
          const dS = Math.abs(candStart - sp);
          if (dS < snapTolSec && dS < closestDist) {
            closestDist = dS;
            effectiveDelta = sp - initialStart;
            activeSnapLine = sp;
          }
          // Snap end to point (e.g. start of next video!)
          const dE = Math.abs(candEnd - sp);
          if (dE < snapTolSec && dE < closestDist) {
            closestDist = dE;
            effectiveDelta = (sp - itemDur) - initialStart;
            activeSnapLine = sp;
          }
        }

        // Vertical track detection under cursor
        const isAudioItem = draggingItem.itemType === 'audio' || isAudioFile(draggingItem.item?.file);
        const isEffectItem = Boolean(draggingItem.item?.isEffect || draggingItem.itemType === 'effect');
        const trackNodes = Array.from(document.querySelectorAll('[data-track-id]'));
        let matchedTid = null;
        let matchedDropZone = null;

        // 1. Direct hit on an existing track of compatible type
        for (const node of trackNodes) {
          const rect = node.getBoundingClientRect();
          if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
            const ttype = node.getAttribute('data-track-type');
            const tid = node.getAttribute('data-track-id');
            if (isAudioItem && ttype === 'audio') {
              matchedTid = tid;
            } else if (isEffectItem && ttype === 'effect') {
              if (tid === draggingItem.trackId) {
                matchedTid = tid;
              } else {
                const midY = (rect.top + rect.bottom) / 2;
                matchedDropZone = e.clientY < midY ? `insert_effect_above_${tid}` : `insert_effect_below_${tid}`;
              }
            } else if (!isAudioItem && !isEffectItem && ttype !== 'audio' && ttype !== 'effect') {
              matchedTid = tid;
            }
            break;
          }
        }

        // 2. If not hovering an existing track, check "create new track" zones
        if (!matchedTid && !matchedDropZone) {
          const visualNodes = trackNodes.filter(n => n.getAttribute('data-track-type') !== 'audio');
          const audioNodes = trackNodes.filter(n => n.getAttribute('data-track-type') === 'audio');

          if (isEffectItem) {
            if (visualNodes.length > 0) {
              const firstVisRect = visualNodes[0].getBoundingClientRect();
              if (e.clientY < firstVisRect.top) {
                matchedDropZone = 'top_visual';
              } else {
                matchedDropZone = 'bottom_visual';
              }
            } else {
              matchedDropZone = 'top_visual';
            }
          } else if (!isAudioItem) {
            if (visualNodes.length > 0) {
              const firstVisRect = visualNodes[0].getBoundingClientRect();
              const lastVisRect = visualNodes[visualNodes.length - 1].getBoundingClientRect();
              if (e.clientY < firstVisRect.top) {
                matchedDropZone = 'top_visual';
              } else if (e.clientY > lastVisRect.bottom) {
                matchedDropZone = 'bottom_visual';
              }
            } else {
              matchedDropZone = 'top_visual';
            }
          } else {
            // Audio item
            if (audioNodes.length > 0) {
              const lastAudioRect = audioNodes[audioNodes.length - 1].getBoundingClientRect();
              if (e.clientY > lastAudioRect.bottom) {
                matchedDropZone = 'bottom_audio';
              }
            } else {
              matchedDropZone = 'bottom_audio';
            }
          }
        }

        currentHoverTid = matchedTid;
        currentDropZone = matchedDropZone;
        setHoverTargetTrackId(matchedTid);
        setNewTrackDropZone(matchedDropZone);

      } else if (draggingItem.mode === 'resize-left') {
        const candStart = initialStart + rawDelta;
        const snapTolSec = Math.max(0.12, (14 / totalPx) * safeDuration);
        for (const sp of snapPoints) {
          if (Math.abs(candStart - sp) < snapTolSec) {
            effectiveDelta = sp - initialStart;
            activeSnapLine = sp;
            break;
          }
        }
      } else if (draggingItem.mode === 'resize-right') {
        const candEnd = initialEnd + rawDelta;
        const snapTolSec = Math.max(0.12, (14 / totalPx) * safeDuration);
        for (const sp of snapPoints) {
          if (Math.abs(candEnd - sp) < snapTolSec) {
            effectiveDelta = sp - initialEnd;
            activeSnapLine = sp;
            break;
          }
        }
      }

      finalDeltaTime = effectiveDelta;
      setDragDeltaTime(effectiveDelta);
      setSnapGuideTime(activeSnapLine);
    };

    const handleMouseUp = (e) => {
      setSnapGuideTime(null);
      setHoverTargetTrackId(null);
      setNewTrackDropZone(null);
      setDragDeltaY(0);

      // Commit the drag changes
      if (draggingItem.type === 'line') {
        setLines(prev => {
          const origDur = initialEnd - initialStart;
          if (draggingItem.mode === 'move') {
            let newStart = Math.max(0, Math.min(86400, initialStart + finalDeltaTime));
            newStart = Number(newStart.toFixed(3));
            const updatedLine = { ...prev[draggingItem.idx], start: newStart, end: Number((newStart + origDur).toFixed(3)) };
            
            const rowDiff = Math.round(dragDeltaY / 42);
            const targetIdx = Math.max(0, Math.min(prev.length - 1, draggingItem.idx + rowDiff));
            
            if (rowDiff !== 0 && targetIdx !== draggingItem.idx && !prev[targetIdx]?.locked) {
              const next = [...prev];
              next.splice(draggingItem.idx, 1);
              next.splice(targetIdx, 0, updatedLine);
              setSelectedLineIdx(targetIdx);
              return next;
            } else {
              return prev.map((l, idx) => idx === draggingItem.idx ? updatedLine : l);
            }
          }
          return prev.map((line, idx) => {
            if (idx !== draggingItem.idx) return line;
            if (draggingItem.mode === 'resize-left') {
              let newStart = Math.max(0, Math.min(initialEnd - 0.1, initialStart + finalDeltaTime));
              newStart = Number(newStart.toFixed(3));
              return { ...line, start: newStart };
            } else if (draggingItem.mode === 'resize-right') {
              let newEnd = Math.max(initialStart + 0.1, Math.min(86400, initialEnd + finalDeltaTime));
              newEnd = Number(newEnd.toFixed(3));
              return { ...line, end: newEnd };
            } else if (draggingItem.mode === 'resize-anim') {
              const lineDur = line.end - line.start;
              const initAnim = draggingItem.initialAnim !== undefined ? draggingItem.initialAnim : lineDur;
              let newAnim = Math.max(0.1, Math.min(lineDur, initAnim + finalDeltaTime));
              newAnim = Number(newAnim.toFixed(1));
              return { ...line, animDuration: newAnim };
            }
            return line;
          });
        });
      } else if (draggingItem.type === 'trackItem') {
        if (draggingItem.mode === 'move') {
          const origDur = initialEnd - initialStart;
          let rawNewStart = Math.max(0, initialStart + finalDeltaTime);

          // Anti-overlap clamp on drop:
          const targetTid = currentHoverTid || draggingItem.trackId;
          const targetTrack = tracks.find(t => t.id === targetTid);
          let newStart = rawNewStart;
          if (targetTrack) {
            const otherItems = (targetTrack.items || []).filter(it => it.id !== draggingItem.itemId);
            const leftItems = otherItems.filter(it => it.start < initialStart);
            const minStart = leftItems.length > 0 ? Math.max(...leftItems.map(it => it.end || 0)) : 0;
            const rightItems = otherItems.filter(it => it.start >= initialStart);
            const maxStart = rightItems.length > 0 ? Math.min(...rightItems.map(it => it.start || 0)) - origDur : Infinity;
            if (maxStart >= minStart) {
              newStart = Math.max(minStart, Math.min(maxStart, rawNewStart));
            } else {
              newStart = minStart;
            }
          }
          newStart = Number(newStart.toFixed(3));
          const newEnd = Number((newStart + origDur).toFixed(3));

          setTracks(prev => {
            let movedItem = null;
            // 1. Extract item
            prev.forEach(t => {
              const found = t.items.find(i => i.id === draggingItem.itemId);
              if (found) movedItem = { ...found, start: newStart, end: newEnd };
            });
            if (!movedItem) return prev;

            // 2. Remove from original track
            let nextTracks = prev.map(t => {
              if (t.id === draggingItem.trackId) {
                return { ...t, items: t.items.filter(i => i.id !== draggingItem.itemId) };
              }
              return t;
            });

            // 3. Insert into target track OR create new track
            const isEff = Boolean(movedItem?.isEffect || draggingItem.item?.isEffect || draggingItem.itemType === 'effect');

            if (currentDropZone === 'top_visual') {
              const newTrack = {
                id: 'track-' + Date.now(),
                type: isEff ? 'effect' : 'video',
                isEffectTrack: isEff,
                items: [movedItem]
              };
              nextTracks = [newTrack, ...nextTracks];
            } else if (currentDropZone === 'bottom_visual') {
              const newTrack = {
                id: 'track-' + Date.now(),
                type: isEff ? 'effect' : 'video',
                isEffectTrack: isEff,
                items: [movedItem]
              };
              const firstAudioIdx = nextTracks.findIndex(t => t.type === 'audio');
              if (firstAudioIdx === -1) {
                nextTracks = [...nextTracks, newTrack];
              } else {
                nextTracks.splice(firstAudioIdx, 0, newTrack);
              }
            } else if (currentDropZone && currentDropZone.startsWith('insert_effect_')) {
              const isAbove = currentDropZone.startsWith('insert_effect_above_');
              const refTid = currentDropZone.replace(isAbove ? 'insert_effect_above_' : 'insert_effect_below_', '');
              const refIdx = nextTracks.findIndex(t => t.id === refTid);
              const newTrack = {
                id: 'track-' + Date.now(),
                type: 'effect',
                isEffectTrack: true,
                items: [movedItem]
              };
              if (refIdx !== -1) {
                const insertIdx = isAbove ? refIdx : refIdx + 1;
                nextTracks.splice(insertIdx, 0, newTrack);
              } else {
                nextTracks.push(newTrack);
              }
            } else if (currentDropZone === 'bottom_audio') {
              const newTrack = {
                id: 'track-' + Date.now(),
                type: 'audio',
                items: [movedItem]
              };
              nextTracks = [...nextTracks, newTrack];
            } else if (currentHoverTid) {
              if (isEff && currentHoverTid !== draggingItem.trackId) {
                // Cannot merge two effects into the same track! Create new dedicated effect track!
                const targetIdx = nextTracks.findIndex(t => t.id === currentHoverTid);
                const newTrack = {
                  id: 'track-' + Date.now(),
                  type: 'effect',
                  isEffectTrack: true,
                  items: [movedItem]
                };
                if (targetIdx !== -1) {
                  nextTracks.splice(targetIdx, 0, newTrack);
                } else {
                  nextTracks.push(newTrack);
                }
              } else {
                nextTracks = nextTracks.map(t => {
                  if (t.id === currentHoverTid) {
                    return { ...t, items: [...t.items, movedItem] };
                  }
                  return t;
                });
              }
            } else {
              // Return to original track
              nextTracks = nextTracks.map(t => {
                if (t.id === draggingItem.trackId) {
                  return { ...t, items: [...t.items, movedItem] };
                }
                return t;
              });
            }

            // 4. Remove empty tracks if not the only one of its category
            const hasVideoRemaining = nextTracks.some(t => t.type !== 'audio' && t.items.length > 0);
            const hasAudioRemaining = nextTracks.some(t => t.type === 'audio' && t.items.length > 0);

            return nextTracks.filter(t => {
              if (t.items.length > 0) return true;
              if (t.type !== 'audio' && !hasVideoRemaining) return true;
              if (t.type === 'audio' && !hasAudioRemaining) return true;
              return false;
            });
          });
        } else {
          // Trimming (resize-left / resize-right)
          setTracks(prev => prev.map((t) => {
            if (t.id !== draggingItem.trackId) return t;
            return {
              ...t,
              items: t.items.map(item => {
                if (item.id !== draggingItem.itemId) return item;
                if (draggingItem.mode === 'resize-left') {
                  const initSS = draggingItem.initialSourceStart !== undefined ? draggingItem.initialSourceStart : (item.sourceStart || 0);
                  const minStart = item.isEffect ? 0 : Math.max(0, initialStart - initSS);
                  const maxStart = initialEnd - 0.1;
                  let newStart = Math.max(minStart, Math.min(maxStart, initialStart + finalDeltaTime));
                  newStart = Number(newStart.toFixed(3));
                  const newSourceStart = item.isEffect ? 0 : Number(Math.max(0, initSS + (newStart - initialStart)).toFixed(3));
                  return { ...item, start: newStart, sourceStart: newSourceStart };
                } else if (draggingItem.mode === 'resize-right') {
                  const initSS = draggingItem.initialSourceStart !== undefined ? draggingItem.initialSourceStart : (item.sourceStart || 0);
                  const minEnd = initialStart + 0.1;
                  const maxDur = (!item.isEffect && item.sourceDuration) ? Math.max(0.1, item.sourceDuration - initSS) : safeDuration;
                  const maxEnd = (!item.isEffect && item.sourceDuration) ? Math.min(safeDuration, initialStart + maxDur) : safeDuration;
                  let newEnd = Math.max(minEnd, Math.min(maxEnd, initialEnd + finalDeltaTime));
                  newEnd = Number(newEnd.toFixed(3));
                  return { ...item, end: newEnd };
                }
                return item;
              })
            };
          }));
        }
      }

      setDraggingItem(null);
      setDragDeltaTime(0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingItem, dragStartX, initialStart, initialEnd, safeDuration, totalPx, setLines, setTracks, tracks, currentTime]);

  // -- Text Track Sorting (Drag and Drop untuk Tukar Posisi Teks) --
  const handleTextTrackDragStart = (e, idx) => {
    if (lines[idx]?.locked) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    setDraggingTextTrackIdx(idx);
  };
  const handleTextTrackDragOver = (e, targetIdx) => {
    e.preventDefault();
    if (draggingTextTrackIdx === null || draggingTextTrackIdx === targetIdx) return;
    if (lines[targetIdx]?.locked) return;
    setLines(prev => {
      const newLines = [...prev];
      const [removed] = newLines.splice(draggingTextTrackIdx, 1);
      newLines.splice(targetIdx, 0, removed);
      return newLines;
    });
    setDraggingTextTrackIdx(targetIdx);
  };
  const handleTextTrackDragEnd = () => {
    setDraggingTextTrackIdx(null);
  };

  // -- Track Sorting (Drag and Drop) --
  const handleTrackDragStart = (e, idx) => {
    if (tracks[idx]?.locked) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    setDraggingTrackIdx(idx);
  };
  const handleTrackDragOver = (e, targetIdx) => {
    e.preventDefault();
    if (draggingTrackIdx === null || draggingTrackIdx === targetIdx) return;
    
    // Constraints:
    // Audio MUST be below Video/Image/Text. Audio can only swap with Audio.
    // Text MUST be above Image/Video. Text can only swap with Text.
    // Image and Video can swap with each other.
    
    const dragTrack = tracks[draggingTrackIdx];
    const targetTrack = tracks[targetIdx];
    
    if (dragTrack.type === 'audio' && targetTrack.type !== 'audio') return; // Audio can't move up past non-audio
    if (dragTrack.type !== 'audio' && targetTrack.type === 'audio') return; // Non-audio can't move down past audio
    if (dragTrack.type === 'text' && targetTrack.type !== 'text') return; // Text can't move down past non-text
    if (dragTrack.type !== 'text' && targetTrack.type === 'text') return; // Non-text can't move up past text

    // It's valid to swap
    setTracks(prev => {
      const newTracks = [...prev];
      const [removed] = newTracks.splice(draggingTrackIdx, 1);
      newTracks.splice(targetIdx, 0, removed);
      return newTracks;
    });
    setDraggingTrackIdx(targetIdx);
  };
  const handleTrackDragEnd = () => {
    setDraggingTrackIdx(null);
  };

  const handleScroll = (e) => {
    if (headerScrollRef.current) headerScrollRef.current.scrollTop = e.currentTarget.scrollTop;
  };

  const moveTrack = (idx, direction) => {
    setTracks(prev => {
      const newTracks = [...prev];
      const targetIdx = idx + direction;
      
      if (targetIdx < 0 || targetIdx >= newTracks.length) return prev;
      
      const track = newTracks[idx];
      const target = newTracks[targetIdx];
      
      if (track.type === 'audio' && target.type !== 'audio') return prev;
      if (track.type !== 'audio' && target.type === 'audio') return prev;
      if (track.type === 'text' && target.type !== 'text') return prev;
      if (track.type !== 'text' && target.type === 'text') return prev;
      
      const temp = newTracks[idx];
      newTracks[idx] = newTracks[targetIdx];
      newTracks[targetIdx] = temp;
      return newTracks;
    });
  };

  const fps = 30;
  const totalSec = Math.ceil(safeDuration);
  const rulerTicks = [];

  if (pxPerSec >= 250) {
    // Saat zoom maksimal (mentok kanan), pxPerSec mendekati 300.
    // Tampilkan penanda setiap 15 frame (setengah detik).
    let frameStep = 15;
    
    const totalFrames = Math.ceil(safeDuration * fps);
    for (let f = 0; f <= totalFrames; f += frameStep) {
      const x = TIMELINE_START_OFFSET + (f / fps) * pxPerSec;
      const isSecond = f % fps === 0;
      const label = isSecond ? formatTime(f / fps) : `${f % fps}f`;
      rulerTicks.push({ id: `f-${f}`, x, isMajor: true, label }); // Selalu tampilkan teks di zoom maksimal
    }
  } else {
    // Zoomed out -> show seconds/minutes
    let secStep = 1;
    let labelInterval = 1;
    if (pxPerSec < 0.5) { secStep = 60; labelInterval = 300; }       // tick 1m, label 5m
    else if (pxPerSec < 1.5) { secStep = 30; labelInterval = 120; }  // tick 30s, label 2m (for 18 min scale at zoom 0%)
    else if (pxPerSec < 4) { secStep = 15; labelInterval = 60; }     // tick 15s, label 1m
    else if (pxPerSec < 10) { secStep = 5; labelInterval = 30; }     // tick 5s, label 30s
    else if (pxPerSec < 25) { secStep = 2; labelInterval = 10; }     // tick 2s, label 10s
    else if (pxPerSec < 60) { secStep = 1; labelInterval = 2; }      // tick 1s, label 2s (for 18s scale at zoom 0%)
    else if (pxPerSec < 120) { secStep = 1; labelInterval = 2; }     // tick 1s, label 2s
    else { secStep = 1; labelInterval = 1; }                         // tick 1s, label 1s
    
    for (let s = 0; s <= totalSec; s += secStep) {
      const x = TIMELINE_START_OFFSET + s * pxPerSec;
      const isMajor = s % labelInterval === 0;
      rulerTicks.push({ id: `s-${s}`, x, isMajor, label: isMajor ? formatTime(s) : '' });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#18181b', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* ── Track Header Column (Minimalist, Sticky Left) ── */}
        <div ref={headerScrollRef} style={{ width: hasTimelineData ? `${headerWidth}px` : '0px', flexShrink: 0, borderRight: hasTimelineData ? '1px solid #27272a' : 'none', backgroundColor: '#111113', display: 'flex', flexDirection: 'column', zIndex: 100, overflowY: 'hidden', overflowX: 'hidden', transition: 'width 0.15s ease' }}>
          {/* Ruler spacer */}
          <div style={{ height: '20px', borderBottom: '1px solid #27272a', backgroundColor: '#09090b', flexShrink: 0, position: 'sticky', top: 0, zIndex: 110 }} />
          
          {hasTimelineData && (
            <>
              {/* Kolam Teks Masing-Masing (Header) */}
              {lines.map((line, i) => {
                const isHidden = Boolean(line.hidden);
                const isLocked = Boolean(line.locked);
                return (
                  <div key={`header-text-${line.id || i}`}
                    draggable={!line.locked}
                    onDragStart={(e) => handleTextTrackDragStart(e, i)}
                    onDragOver={(e) => handleTextTrackDragOver(e, i)}
                    onDragEnd={handleTextTrackDragEnd}
                    style={{
                      height: '42px',
                      borderBottom: 'none',
                      backgroundColor: '#111113',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 8px',
                      gap: '8px',
                      flexShrink: 0,
                      cursor: line.locked ? 'default' : 'grab',
                      opacity: draggingTextTrackIdx === i ? 0.5 : 1
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1px', color: '#a1a1aa', fontWeight: 600, fontSize: '13px', fontFamily: 'sans-serif', flexShrink: 0 }} title={`Kolam Teks ${i + 1} (Tarik untuk tukar posisi)`}>
                      <span>T</span>
                      <span style={{ fontSize: '11px', opacity: 0.6, marginLeft: '0.5px' }}>|</span>
                    </div>
                    {/* Tombol Gembok Teks */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setLines(prev => prev.map((l, idx) => idx === i ? { ...l, locked: !l.locked } : l));
                      }}
                      title={isLocked ? "Buka kunci trek teks" : "Kunci trek teks"}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <Lock size={12} color={isLocked ? "#38bdf8" : "#71717a"} />
                    </div>
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setLines(prev => prev.map((l, idx) => idx === i ? { ...l, hidden: !l.hidden } : l));
                      }}
                      title={isHidden ? "Tampilkan teks di preview" : "Sembunyikan teks di preview"}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {isHidden ? <EyeOff size={12} color="#ef4444" /> : <Eye size={12} color="#a1a1aa" />}
                    </div>
                  </div>
                );
              })}

              {/* Main Media Track Header when lines exist but no visual track imported yet (Like Image 3) */}
              {lines.length > 0 && visualTracks.length === 0 && (
                <div style={{
                  height: '42px',
                  borderBottom: 'none',
                  backgroundColor: '#111113',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  gap: '8px',
                  flexShrink: 0
                }}>
                  <div style={{ width: '14px', height: '14px', border: '1px solid #52525b', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Kolam Video Utama">
                    <div style={{ width: 0, height: 0, borderTop: '3px solid transparent', borderBottom: '3px solid transparent', borderLeft: '4px solid #a1a1aa', marginLeft: '1px' }} />
                  </div>
                  <div
                    onClick={() => setPlaceholderLocked(p => !p)}
                    title={placeholderLocked ? "Buka kunci trek" : "Kunci trek"}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <Lock size={12} color={placeholderLocked ? "#38bdf8" : "#71717a"} />
                  </div>
                  <div
                    onClick={() => setPlaceholderHidden(p => !p)}
                    title={placeholderHidden ? "Tampilkan track di preview" : "Sembunyikan track di preview"}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {placeholderHidden ? <EyeOff size={12} color="#ef4444" /> : <Eye size={12} color="#a1a1aa" />}
                  </div>
                  <div
                    onClick={() => setPlaceholderMuted(p => !p)}
                    title={placeholderMuted ? "Aktifkan suara track" : "Bisukan suara track"}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {placeholderMuted ? <VolumeX size={12} color="#ef4444" /> : <Volume2 size={12} color="#a1a1aa" />}
                  </div>
                  <div style={{ flex: 1 }} />
                  <MoreHorizontal size={12} color="#a1a1aa" style={{ cursor: 'pointer' }} />
                </div>
              )}

              {/* Video/Image/Audio/Effect track headers */}
              {tracks.map((track, trackIdx) => {
                const isEffect = track.type === 'effect' || track.isEffectTrack;
                const isHidden = Boolean(track.hidden);
                const isMuted = Boolean(track.mutedAudio);
                const isLocked = Boolean(track.locked);

                if (isEffect) {
                  return (
                    <div key={`header-${track.id}`}
                      draggable={!track.locked}
                      onDragStart={(e) => handleTrackDragStart(e, trackIdx)}
                      onDragOver={(e) => handleTrackDragOver(e, trackIdx)}
                      onDragEnd={handleTrackDragEnd}
                      style={{ 
                        height: getTrackHeight(track),
                        borderBottom: 'none',
                        backgroundColor: '#111113',
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '0 10px', flexShrink: 0,
                        opacity: draggingTrackIdx === trackIdx ? 0.5 : 1, cursor: track.locked ? 'default' : 'grab',
                        gap: '10px'
                      }}>
                      <Sparkles size={13} color="#a1a1aa" />
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setTracks(prev => prev.map((t, idx) => idx === trackIdx ? { ...t, locked: !t.locked } : t));
                        }}
                        title={isLocked ? "Buka kunci trek" : "Kunci trek"}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <Lock size={12} color={isLocked ? "#38bdf8" : "#71717a"} />
                      </div>
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setTracks(prev => prev.map((t, idx) => idx === trackIdx ? { ...t, hidden: !t.hidden } : t));
                        }}
                        title={isHidden ? "Tampilkan efek di preview" : "Sembunyikan efek di preview"}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        {isHidden ? <EyeOff size={12} color="#ef4444" /> : <Eye size={12} color="#a1a1aa" />}
                      </div>
                    </div>
                  );
                }
                
                const isAudioTrack = track.type === 'audio';
                return (
                  <div key={`header-${track.id}`}
                    draggable={!track.locked}
                    onDragStart={(e) => handleTrackDragStart(e, trackIdx)}
                    onDragOver={(e) => handleTrackDragOver(e, trackIdx)}
                    onDragEnd={handleTrackDragEnd}
                    style={{ 
                      height: getTrackHeight(track),
                      borderBottom: 'none',
                      backgroundColor: '#111113',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', flexShrink: 0,
                      opacity: draggingTrackIdx === trackIdx ? 0.5 : 1, cursor: track.locked ? 'default' : 'grab'
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', paddingRight: '4px' }}>
                       {isAudioTrack ? (
                         <div style={{ width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Kolam Musik (MP3)">
                           <Music size={13} color="#00d8b6" />
                         </div>
                       ) : (
                         <div style={{ width: '14px', height: '14px', border: '1px solid #52525b', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Kolam Video/Gambar">
                           <div style={{ width: 0, height: 0, borderTop: '3px solid transparent', borderBottom: '3px solid transparent', borderLeft: '4px solid #a1a1aa', marginLeft: '1px' }} />
                         </div>
                       )}
                       
                       {/* Tombol Gembok Aktif */}
                       <div 
                         onClick={(e) => {
                           e.stopPropagation();
                           setTracks(prev => prev.map((t, idx) => idx === trackIdx ? { ...t, locked: !t.locked } : t));
                         }}
                         title={isLocked ? "Buka kunci trek" : "Kunci trek"}
                         style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                       >
                         <Lock size={12} color={isLocked ? "#38bdf8" : "#71717a"} />
                       </div>
                       
                       {/* Aktifkan Tanda Mata */}
                       <div 
                         onClick={(e) => {
                           e.stopPropagation();
                           setTracks(prev => prev.map((t, idx) => idx === trackIdx ? { ...t, hidden: !t.hidden } : t));
                         }}
                         title={isHidden ? "Tampilkan track di preview" : "Sembunyikan track di preview"}
                         style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                       >
                         {isHidden ? <EyeOff size={12} color="#ef4444" /> : <Eye size={12} color="#a1a1aa" />}
                       </div>

                       {/* Aktifkan Tanda Volume */}
                       <div 
                         onClick={(e) => {
                           e.stopPropagation();
                           setTracks(prev => prev.map((t, idx) => idx === trackIdx ? { ...t, mutedAudio: !t.mutedAudio } : t));
                         }}
                         title={isMuted ? "Aktifkan suara track" : "Bisukan suara track"}
                         style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                       >
                         {isMuted ? <VolumeX size={12} color="#ef4444" /> : <Volume2 size={12} color="#a1a1aa" />}
                       </div>

                       <div style={{ flex: 1 }} />
                       <MoreHorizontal size={12} color="#a1a1aa" style={{ cursor: 'pointer' }} />
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Spacer to fill remaining height */}
          <div style={{ flex: 1, backgroundColor: '#111113' }} />
        </div>

        {/* Resizer Handle (Between Left Panel and Timeline) */}
        {hasTimelineData && (
          <div 
            onMouseDown={startResizingHeader}
            title="Tarik untuk mengubah lebar panel header"
            style={{ width: '6px', cursor: 'col-resize', backgroundColor: isResizingHeader ? '#3b82f6' : 'transparent', zIndex: 105, marginLeft: '-3px', position: 'relative' }}
          />
        )}

        {/* ── Scrollable Timeline Area ── */}
        <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }} onMouseDown={(e) => {
          if (!e.target.closest('[data-timeline-line="true"]') && !e.target.closest('[data-track-item="true"]')) {
            setSelectedTrackItemId(null);
            setSelectedLineIdx(null);
          }
          if (stopMediaBinPreview) stopMediaBinPreview();
        }}>
          {/* Hidden File Input for Cover Photo Upload */}
          <input
            type="file"
            ref={coverFileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleCoverPhotoUpload}
          />

          <div style={{ width: `${totalPx + TIMELINE_START_OFFSET + 40}px`, minHeight: '100%', position: 'relative', display: 'flex', flexDirection: 'column', paddingBottom: '20px' }}>
          
          {/* Ruler */}
          <div ref={rulerRef} style={{ height: `20px`, position: 'sticky', top: 0, backgroundColor: '#09090b', borderBottom: '1px solid #27272a', userSelect: 'none', zIndex: 50 }}>
            {/* Playhead Needle (Jarum Biru / Putih) - Starts at TIMELINE_START_OFFSET for 00:00 */}
            <div style={{ position: 'absolute', top: 0, bottom: '-1000px', left: `${TIMELINE_START_OFFSET + (currentTime / safeDuration) * totalPx}px`, width: '1px', backgroundColor: '#38bdf8', zIndex: 70, pointerEvents: 'none' }}>
              {/* Draggable Playhead Head */}
              <div 
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  if (!hasTimelineData || maxTimelineEnd <= 0) return; // Kalau tidak ada data, tidak bisa digeser!
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingPlayhead(true);
                  if (stopMediaBinPreview) stopMediaBinPreview();
                }}
                title={hasTimelineData && maxTimelineEnd > 0 ? "Tarik jarum playhead untuk navigasi waktu" : "Tidak ada data di timeline untuk menggeser jarum"}
                style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: '-9px', 
                  width: '18px', 
                  height: '16px', 
                  backgroundColor: '#18181b', 
                  border: hasTimelineData ? '1.5px solid #ffffff' : '1.5px solid #52525b', 
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (hasTimelineData && maxTimelineEnd > 0) ? (isDraggingPlayhead ? 'grabbing' : 'grab') : 'not-allowed',
                  pointerEvents: 'auto',
                  boxShadow: isDraggingPlayhead ? '0 0 10px #38bdf8' : '0 2px 6px rgba(0,0,0,0.5)',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: hasTimelineData ? '#ffffff' : '#71717a',
                  userSelect: 'none',
                  transition: 'box-shadow 0.15s, transform 0.1s'
                }}
              >
                 {hasTimelineData ? Math.floor(currentTime) : '0'}
              </div>
            </div>

            {/* Ruler Click & Drag to Seek */}
            <div style={{ position: 'absolute', inset: 0, cursor: (hasTimelineData && maxTimelineEnd > 0) ? 'pointer' : 'not-allowed', zIndex: 5 }}
              onMouseDown={e => {
                if (e.button !== 0) return;
                if (!hasTimelineData || maxTimelineEnd <= 0) return;
                e.preventDefault();
                setIsDraggingPlayhead(true);
                const rect = e.currentTarget.getBoundingClientRect();
                const rawX = e.clientX - rect.left - TIMELINE_START_OFFSET;
                if (stopMediaBinPreview) stopMediaBinPreview();
                const targetTime = Math.max(0, Math.min(maxTimelineEnd, (rawX / totalPx) * safeDuration));
                onSeek(Number(targetTime.toFixed(3)));
              }}
            />

            {/* Magnetic Snap Guideline (Penahan Pemberhentian) */}
            {snapGuideTime !== null && (
              <div style={{
                position: 'absolute',
                top: 0,
                bottom: '-1000px',
                left: `${TIMELINE_START_OFFSET + (snapGuideTime / safeDuration) * totalPx}px`,
                width: '2px',
                backgroundColor: '#00d8b6',
                boxShadow: '0 0 8px #00d8b6',
                zIndex: 80,
                pointerEvents: 'none'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '22px',
                  left: '4px',
                  backgroundColor: '#00d8b6',
                  color: '#09090b',
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '1px 5px',
                  borderRadius: '3px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                  whiteSpace: 'nowrap'
                }}>
                  Snap: {formatTimeMs(snapGuideTime)}
                </div>
              </div>
            )}
            {rulerTicks.map(tick => (
                <div key={tick.id} style={{ position: 'absolute', left: `${tick.x}px`, top: 0 }}>
                  <div style={{ width: '1px', height: tick.isMajor ? '10px' : '5px', backgroundColor: tick.isMajor ? '#52525b' : '#3f3f46', marginTop: tick.isMajor ? '10px' : '15px' }} />
                  {tick.label && (
                    <span style={{ 
                      position: 'absolute', 
                      top: '1px', 
                      left: tick.x > totalPx + TIMELINE_START_OFFSET - 45 ? 'auto' : '3px',
                      right: tick.x > totalPx + TIMELINE_START_OFFSET - 45 ? '3px' : 'auto',
                      fontSize: '8px', 
                      color: '#71717a', 
                      whiteSpace: 'nowrap', 
                      fontFamily: 'monospace', 
                      fontWeight: 600 
                    }}>
                      {tick.label}
                    </span>
                  )}
                </div>
            ))}
            {/* Visual Markers & Beat Markers on Ruler */}
            {(markers || []).map(m => {
              const mx = TIMELINE_START_OFFSET + (m.time / safeDuration) * totalPx;
              const isBeat = m.type === 'beat1' || m.type === 'beat2';
              return (
                <div
                  key={m.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(m.time);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (setMarkers) setMarkers(prev => prev.filter(mk => mk.id !== m.id));
                  }}
                  title={`${m.label || 'Marker'}: ${m.time.toFixed(2)}s (Klik untuk lompat, klik kanan hapus)`}
                  style={{
                    position: 'absolute',
                    left: `${mx}px`,
                    top: 0,
                    bottom: isBeat ? '-240px' : '-800px',
                    width: '1px',
                    backgroundColor: m.color || '#38bdf8',
                    zIndex: 65,
                    cursor: 'pointer',
                    pointerEvents: 'auto'
                  }}
                >
                  {/* Pin Head on Ruler */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '-4px',
                    width: isBeat ? '7px' : '9px',
                    height: isBeat ? '8px' : '11px',
                    backgroundColor: m.color || '#38bdf8',
                    clipPath: isBeat ? 'circle(50% at 50% 50%)' : 'polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%)',
                    boxShadow: `0 0 6px ${m.color || '#38bdf8'}`
                  }} />
                </div>
              );
            })}
          </div>

          {/* Hidden Cover Photo Upload Input */}
          <input
            type="file"
            ref={coverFileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleCoverPhotoUpload}
          />

          {!hasTimelineData ? (
            /* Image 2 Look: Empty Timeline Placeholder */
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '140px',
              width: '100%',
              padding: '24px 20px',
              boxSizing: 'border-box'
            }}>
              <div style={{
                width: '100%',
                maxWidth: '100%',
                height: '52px',
                border: '1px dashed #3f3f46',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '24px',
                gap: '14px',
                color: '#a1a1aa',
                userSelect: 'none'
              }}>
                {/* Filmstrip Icon [ █ ] */}
                <div style={{
                  width: '20px',
                  height: '16px',
                  border: '1.5px solid #a1a1aa',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  flexShrink: 0
                }}>
                  <div style={{ position: 'absolute', left: '1.5px', top: '1.5px', bottom: '1.5px', width: '1.5px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ width: '1.5px', height: '1.5px', backgroundColor: '#a1a1aa' }} />
                    <div style={{ width: '1.5px', height: '1.5px', backgroundColor: '#a1a1aa' }} />
                  </div>
                  <div style={{ width: '8px', height: '8px', backgroundColor: '#a1a1aa', borderRadius: '1px' }} />
                  <div style={{ position: 'absolute', right: '1.5px', top: '1.5px', bottom: '1.5px', width: '1.5px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ width: '1.5px', height: '1.5px', backgroundColor: '#a1a1aa' }} />
                    <div style={{ width: '1.5px', height: '1.5px', backgroundColor: '#a1a1aa' }} />
                  </div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#a1a1aa' }}>
                  Pilih materi dan tambahkan ke trek
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Kolam Teks Masing-Masing (Tracks) */}
              {lines.map((line, i) => {
                const isSelected = selectedLineIdx === i;
                const isDraggingThis = draggingItem?.type === 'line' && draggingItem?.idx === i;
                
                let dStart = line.start;
                let dEnd = line.end;
                if (isDraggingThis) {
                  if (draggingItem.mode === 'move') { dStart += dragDeltaTime; dEnd += dragDeltaTime; }
                  else if (draggingItem.mode === 'resize-left') { dStart += dragDeltaTime; }
                  else if (draggingItem.mode === 'resize-right') { dEnd += dragDeltaTime; }
                }
                
                const leftPx = TIMELINE_START_OFFSET + (dStart / safeDuration) * totalPx;
                const widthPx = Math.max(8, ((dEnd - dStart) / safeDuration) * totalPx);

                const lineDur = Math.max(0.1, dEnd - dStart);
                let curAnimDur = line.animDuration !== undefined ? line.animDuration : +(lineDur * 0.92).toFixed(1);
                if (isDraggingThis && draggingItem.mode === 'resize-anim') {
                  const initAnim = draggingItem.initialAnim !== undefined ? draggingItem.initialAnim : curAnimDur;
                  curAnimDur = Math.max(0.1, Math.min(lineDur, +(initAnim + dragDeltaTime).toFixed(1)));
                }
                curAnimDur = Math.min(lineDur, Math.max(0.1, curAnimDur));

                const arrowMaxPx = Math.max(12, widthPx - 16);
                const arrowLenPx = Math.max(14, Math.min(arrowMaxPx, (curAnimDur / lineDur) * arrowMaxPx));

                return (
                  <div key={`text-track-${line.id || i}`} style={{ position: 'relative', height: '42px', backgroundColor: 'transparent', borderBottom: 'none' }}>
                    <div
                      data-timeline-line="true"
                      onMouseDown={e => { 
                        if(e.button !== 0 || line.locked) return; 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        dragMovedRef.current = false; 
                        setSelectedLineIdx(i); 
                        setSelectedTrackItemId(null); 
                        setDraggingItem({ type: 'line', idx: i, mode: 'move' }); 
                        setDragStartX(e.clientX); 
                        dragStartYRef.current = e.clientY;
                        setInitialStart(line.start); 
                        setInitialEnd(line.end); 
                        if (stopMediaBinPreview) stopMediaBinPreview(); 
                      }}
                      onClick={() => { 
                        if (dragMovedRef.current) return; 
                        setSelectedLineIdx(i); 
                        setSelectedTrackItemId(null); 
                        if (stopMediaBinPreview) stopMediaBinPreview(); 
                      }}
                      onContextMenu={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedLineIdx(i); 
                        setSelectedTrackItemId(null); 
                        setSubmenuOpen(false);
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          itemType: 'text',
                          isAudio: false,
                          lineIdx: i,
                          item: line,
                          name: line.text || 'Text'
                        });
                      }}
                      style={{
                        position: 'absolute', 
                        left: `${leftPx}px`, 
                        top: (isDraggingThis && draggingItem.mode === 'move') ? `${dragDeltaY}px` : '0px', 
                        width: `${widthPx}px`, 
                        height: '42px',
                        cursor: line.locked ? 'default' : (draggingItem?.idx === i ? 'grabbing' : 'grab'), 
                        zIndex: isDraggingThis ? 50 : (isSelected ? 10 : 1),
                        opacity: line.hidden ? 0.35 : 1
                      }}>
                      <div className={`relative ${useLyricsVersion ? 'flex flex-col justify-between p-1' : 'flex items-center justify-between px-2'} h-full w-full text-xs text-white box-border select-none`} style={{ 
                        background: '#8c3b28', 
                        borderRadius: '6px', 
                        overflow: 'hidden',
                        border: isSelected ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.45)',
                        boxShadow: isSelected ? '0 0 10px rgba(255,255,255,0.25)' : 'none'
                      }}>
                        {/* Left & Right Clip Resizers */}
                        {!line.locked && (
                          <>
                            <div onMouseDown={e => { 
                              if(e.button !== 0 || line.locked) return; 
                              e.preventDefault(); 
                              e.stopPropagation(); 
                              setSelectedLineIdx(i); 
                              setSelectedTrackItemId(null); 
                              setDraggingItem({ type: 'line', idx: i, mode: 'resize-left' }); 
                              setDragStartX(e.clientX); 
                              setInitialStart(line.start); 
                              setInitialEnd(line.end); 
                            }} 
                              style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', cursor: 'ew-resize', backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : 'transparent', borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px', zIndex: 20 }} />
                            <div onMouseDown={e => { 
                              if(e.button !== 0 || line.locked) return; 
                              e.preventDefault(); 
                              e.stopPropagation(); 
                              setSelectedLineIdx(i); 
                              setSelectedTrackItemId(null); 
                              setDraggingItem({ type: 'line', idx: i, mode: 'resize-right' }); 
                              setDragStartX(e.clientX); 
                              setInitialStart(line.start); 
                              setInitialEnd(line.end); 
                            }} 
                              style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px', cursor: 'ew-resize', backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : 'transparent', borderTopRightRadius: '4px', borderBottomRightRadius: '4px', zIndex: 20 }} />
                          </>
                        )}

                        {/* Line Text Label */}
                        <div className="flex items-center justify-between z-10 pointer-events-none" style={{ height: useLyricsVersion ? '16px' : '100%', width: '100%', overflow: 'hidden' }}>
                          <span style={{ fontSize: '10px', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {line.text || '(Teks)'}
                          </span>
                          {widthPx > 70 && (
                            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', marginLeft: '6px', flexShrink: 0 }}>
                              {formatTime(Math.ceil(dEnd - dStart))}
                            </span>
                          )}
                        </div>

                        {/* Bottom: Text Animation Speed Arrow (Hanya muncul saat Versi Lirik aktif / ON) */}
                        {useLyricsVersion && (
                          <div 
                            className="relative flex items-center z-10"
                            style={{ 
                              height: '14px', 
                              width: `${arrowLenPx}px`, 
                              marginLeft: '2px',
                              marginBottom: '1px',
                              transition: draggingItem ? 'none' : 'width 0.05s ease-out'
                            }}
                            title={`Kecepatan Animasi: ${curAnimDur}s`}
                          >
                            <div style={{
                              position: 'absolute', inset: 0, 
                              backgroundColor: 'rgba(0, 0, 0, 0.3)', 
                              borderRadius: '3px',
                              border: '1px solid rgba(255, 255, 255, 0.08)'
                            }} />

                            <div style={{
                              flex: 1,
                              height: '2px',
                              backgroundColor: '#ffffff',
                              marginLeft: '3px',
                              borderRadius: '1px',
                              zIndex: 1
                            }} />

                            {!line.locked && (
                              <div 
                                onMouseDown={e => {
                                  if (e.button !== 0 || line.locked) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  dragMovedRef.current = false;
                                  setDraggingItem({ type: 'line', idx: i, mode: 'resize-anim', initialAnim: curAnimDur });
                                  setDragStartX(e.clientX);
                                  setInitialStart(line.start);
                                  setInitialEnd(line.end);
                                  setSelectedLineIdx(i);
                                  setSelectedTrackItemId(null);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '12px',
                                  height: '14px',
                                  cursor: 'ew-resize',
                                  zIndex: 2,
                                  marginLeft: '-1px'
                                }}
                                title="Geser panah untuk mengatur kecepatan animasi text"
                              >
                                <svg width="6" height="8" viewBox="0 0 6 8" style={{ display: 'block' }}>
                                  <polygon points="0,0 6,4 0,8" fill="#ffffff" />
                                </svg>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Track 2 Placeholder when lines exist but no visual track imported yet (Like Image 3 / Photo 2) */}
              {lines.length > 0 && visualTracks.length === 0 && (
                <div style={{
                  position: 'relative',
                  height: '42px',
                  backgroundColor: 'transparent',
                  borderBottom: 'none',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  {/* Cover Button (left: 6px, no border line, solid dark #262629) */}
                  <div
                    onClick={() => coverFileInputRef.current?.click()}
                    title="Klik untuk memasukkan foto cover"
                    style={{
                      position: 'absolute',
                      left: '6px',
                      top: '4px',
                      width: '44px',
                      height: '34px',
                      borderRadius: '4px',
                      backgroundColor: '#262629',
                      border: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 35,
                      overflow: 'hidden',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#38383c'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#262629'; }}
                  >
                    {coverPhotoUrl ? (
                      <img src={coverPhotoUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <>
                        <Pencil size={11} color="#e4e4e7" style={{ marginBottom: '1px' }} />
                        <span style={{ fontSize: '9px', fontWeight: 500, color: '#e4e4e7', lineHeight: 1 }}>Cover</span>
                      </>
                    )}
                  </div>

                  {/* Filmstrip Icon Placeholder [ █ ] positioned at TIMELINE_START_OFFSET (00:00) */}
                  <div style={{
                    position: 'absolute',
                    left: `${TIMELINE_START_OFFSET}px`,
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    backgroundColor: 'transparent',
                    border: '1.5px solid #52525b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{ position: 'absolute', left: '2px', top: '3px', bottom: '3px', width: '2px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ width: '2px', height: '2px', backgroundColor: '#71717a', borderRadius: '0.5px' }} />
                      <div style={{ width: '2px', height: '2px', backgroundColor: '#71717a', borderRadius: '0.5px' }} />
                      <div style={{ width: '2px', height: '2px', backgroundColor: '#71717a', borderRadius: '0.5px' }} />
                    </div>
                    <div style={{ width: '14px', height: '18px', backgroundColor: '#3f3f46', borderRadius: '2px' }} />
                    <div style={{ position: 'absolute', right: '2px', top: '3px', bottom: '3px', width: '2px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ width: '2px', height: '2px', backgroundColor: '#71717a', borderRadius: '0.5px' }} />
                      <div style={{ width: '2px', height: '2px', backgroundColor: '#71717a', borderRadius: '0.5px' }} />
                      <div style={{ width: '2px', height: '2px', backgroundColor: '#71717a', borderRadius: '0.5px' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Drop zone for new video track at top */}
              {newTrackDropZone === 'top_visual' && (
                <div style={{
                  height: '42px',
                  margin: '4px 8px',
                  border: '2px dashed #00d8b6',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(0, 216, 182, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00d8b6',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  pointerEvents: 'none',
                  zIndex: 50
                }}>
                  + Lepaskan di sini untuk membuat Kolam Video Baru (Atas)
                </div>
              )}

              {/* Kolam Video, Gambar, Audio */}
              {tracks.map((track, trackIdx) => {
                const isFirstAudio = track.type === 'audio' && trackIdx === tracks.findIndex(t => t.type === 'audio');
                const isMainVisualTrack = track.isMainMedia || (visualTracks.length > 0 && track.id === visualTracks[visualTracks.length - 1]?.id);
                return (
                  <Fragment key={track.id}>
                    {newTrackDropZone === 'bottom_visual' && isFirstAudio && (
                      <div style={{
                        height: '42px',
                        margin: '4px 8px',
                        border: '2px dashed #00d8b6',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(0, 216, 182, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#00d8b6',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        pointerEvents: 'none',
                        zIndex: 50
                      }}>
                        + Lepaskan di sini untuk membuat Kolam Video Baru
                      </div>
                    )}
                <div key={track.id}
                  data-track-id={track.id}
                  data-track-type={track.type}
                  draggable={!track.locked}
                  onDragStart={(e) => handleTrackDragStart(e, trackIdx)}
                  onDragOver={(e) => handleTrackDragOver(e, trackIdx)}
                  onDragEnd={handleTrackDragEnd}
                  onContextMenu={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedTrackItemId(null);
                    setSubmenuOpen(false);
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      itemType: track.type,
                      isAudio: track.type === 'audio',
                      trackId: track.id,
                      itemId: null,
                      item: null
                    });
                  }}
                  style={{
                    position: 'relative', 
                    height: getTrackHeight(track), 
                    backgroundColor: hoverTargetTrackId === track.id ? 'rgba(0, 216, 182, 0.08)' : (draggingTrackIdx === trackIdx ? 'rgba(255,255,255,0.05)' : 'transparent'),
                    borderBottom: 'none', 
                    outline: hoverTargetTrackId === track.id ? '1px dashed #00d8b6' : 'none',
                    cursor: track.locked ? 'default' : 'ns-resize', 
                    opacity: draggingTrackIdx === trackIdx ? 0.5 : 1,
                    transition: 'background-color 0.15s, outline 0.15s'
                  }}>
                  
                  {/* Cover Button on Main Visual Track (Solid dark #262629, no border lines, zero horizontal flow displacement) */}
                  {isMainVisualTrack && (
                    <div
                      onClick={(e) => { e.stopPropagation(); coverFileInputRef.current?.click(); }}
                      title="Klik untuk memasukkan foto cover"
                      style={{
                        position: 'absolute',
                        left: '6px',
                        top: '4px',
                        width: '44px',
                        height: '34px',
                        borderRadius: '4px',
                        backgroundColor: '#262629',
                        border: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 35,
                        overflow: 'hidden',
                        flexShrink: 0,
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#38383c'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#262629'; }}
                    >
                      {coverPhotoUrl ? (
                        <img src={coverPhotoUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <>
                          <Pencil size={11} color="#e4e4e7" style={{ marginBottom: '1px' }} />
                          <span style={{ fontSize: '9px', fontWeight: 500, color: '#e4e4e7', lineHeight: 1 }}>Cover</span>
                        </>
                      )}
                    </div>
                  )}
              
              {track.items.map(item => {
                const isDraggingThis = draggingItem?.type === 'trackItem' && draggingItem?.itemId === item.id;
                
                let dStart = item.start;
                let dEnd = item.end;
                let dSourceStart = item.sourceStart || 0;
                if (isDraggingThis) {
                  const initSS = draggingItem.initialSourceStart !== undefined ? draggingItem.initialSourceStart : (item.sourceStart || 0);
                  if (draggingItem.mode === 'move') {
                    const origDur = initialEnd - initialStart;
                    dStart = Math.max(0, Math.min(safeDuration - origDur, initialStart + dragDeltaTime));
                    dEnd = dStart + origDur;
                  } else if (draggingItem.mode === 'resize-left') {
                    const minStart = item.isEffect ? 0 : Math.max(0, initialStart - initSS);
                    const maxStart = initialEnd - 0.1;
                    dStart = Math.max(minStart, Math.min(maxStart, initialStart + dragDeltaTime));
                    dSourceStart = item.isEffect ? 0 : Math.max(0, initSS + (dStart - initialStart));
                  } else if (draggingItem.mode === 'resize-right') {
                    const minEnd = initialStart + 0.1;
                    const maxDur = (!item.isEffect && item.sourceDuration) ? Math.max(0.1, item.sourceDuration - initSS) : safeDuration;
                    const maxEnd = (!item.isEffect && item.sourceDuration) ? Math.min(safeDuration, initialStart + maxDur) : safeDuration;
                    dEnd = Math.max(minEnd, Math.min(maxEnd, initialEnd + dragDeltaTime));
                  }
                }
                
                const leftPx = TIMELINE_START_OFFSET + (dStart / safeDuration) * totalPx;
                const widthPx = Math.max(8, ((dEnd - dStart) / safeDuration) * totalPx);

                const handleResizeStart = (e, mode) => {
                  if (e.button !== 0 || track.locked) return;
                  e.preventDefault();
                  e.stopPropagation();
                  if (setIsPlaying) setIsPlaying(false);
                  setDraggingItem({
                    type: 'trackItem',
                    trackId: track.id,
                    itemId: item.id,
                    mode: mode,
                    initialStart: item.start,
                    initialEnd: item.end,
                    initialSourceStart: item.sourceStart || 0,
                    sourceDuration: item.sourceDuration
                  });
                  setDragStartX(e.clientX);
                  dragStartYRef.current = e.clientY;
                  setInitialStart(item.start);
                  setInitialEnd(item.end);
                  setSelectedTrackItemId(item.id);
                  setSelectedLineIdx(null);
                  if (stopMediaBinPreview) stopMediaBinPreview();
                };

                const renderResizerHandles = () => {
                  if (track.locked) return null;
                  return (
                    <>
                      {/* Left Resizer Handle (Tarik ke kanan untuk memotong bagian awal) */}
                      <div
                        onMouseDown={e => handleResizeStart(e, 'resize-left')}
                        title="Tarik ke kanan untuk memotong bagian awal"
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '14px',
                          cursor: 'ew-resize',
                          zIndex: 40,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          paddingLeft: '2px',
                          userSelect: 'none'
                        }}
                      >
                        <div
                          style={{
                            width: '3px',
                            height: '50%',
                            minHeight: '14px',
                            borderRadius: '2px',
                            backgroundColor: isDraggingThis && draggingItem.mode === 'resize-left' ? '#38bdf8' : (selectedTrackItemId === item.id ? '#ffffff' : 'rgba(255,255,255,0.4)'),
                            boxShadow: isDraggingThis && draggingItem.mode === 'resize-left' ? '0 0 6px #38bdf8' : 'none',
                            transition: 'background-color 0.15s'
                          }}
                        />
                      </div>

                      {/* Right Resizer Handle (Tarik ke kiri untuk memotong bagian akhir) */}
                      <div
                        onMouseDown={e => handleResizeStart(e, 'resize-right')}
                        title="Tarik ke kiri untuk memotong bagian akhir"
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: '14px',
                          cursor: 'ew-resize',
                          zIndex: 40,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          paddingRight: '2px',
                          userSelect: 'none'
                        }}
                      >
                        <div
                          style={{
                            width: '3px',
                            height: '50%',
                            minHeight: '14px',
                            borderRadius: '2px',
                            backgroundColor: isDraggingThis && draggingItem.mode === 'resize-right' ? '#38bdf8' : (selectedTrackItemId === item.id ? '#ffffff' : 'rgba(255,255,255,0.4)'),
                            boxShadow: isDraggingThis && draggingItem.mode === 'resize-right' ? '0 0 6px #38bdf8' : 'none',
                            transition: 'background-color 0.15s'
                          }}
                        />
                      </div>

                      {/* Floating Duration Tooltip during trimming */}
                      {isDraggingThis && (draggingItem.mode === 'resize-left' || draggingItem.mode === 'resize-right') && (
                        <div style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: draggingItem.mode === 'resize-left' ? 0 : 'auto',
                          right: draggingItem.mode === 'resize-right' ? 0 : 'auto',
                          marginBottom: '4px',
                          backgroundColor: '#09090b',
                          color: '#38bdf8',
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid #38bdf8',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
                          whiteSpace: 'nowrap',
                          zIndex: 100,
                          pointerEvents: 'none'
                        }}>
                          {draggingItem.mode === 'resize-left' 
                            ? `Potong Depan: +${dSourceStart.toFixed(2)}s | Durasi: ${(dEnd - dStart).toFixed(2)}s`
                            : `Durasi: ${(dEnd - dStart).toFixed(2)}s`}
                        </div>
                      )}
                    </>
                  );
                };
                
                return (
                  <div key={item.id}
                    data-track-item="true"
                    onMouseDown={e => { 
                      if (e.button !== 0 || track.locked) return; 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      if (setIsPlaying) setIsPlaying(false);
                      setDraggingItem({ 
                        type: 'trackItem', 
                        trackId: track.id, 
                        itemId: item.id, 
                        itemType: track.type,
                        item: item,
                        mode: 'move' 
                      }); 
                      setDragStartX(e.clientX); 
                      dragStartYRef.current = e.clientY;
                      setInitialStart(item.start); 
                      setInitialEnd(item.end); 
                      setSelectedTrackItemId(item.id); 
                      setSelectedLineIdx(null); 
                      if (stopMediaBinPreview) stopMediaBinPreview(); 
                    }}
                    onContextMenu={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedTrackItemId(item.id);
                      setSelectedLineIdx(null);
                      setSubmenuOpen(false);
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        itemType: track.type,
                        isAudio: track.type === 'audio',
                        trackId: track.id,
                        itemId: item.id,
                        item: item,
                        name: item.name
                      });
                    }}
                    style={{
                      position: 'absolute',
                      left: `${leftPx}px`,
                      width: `${widthPx}px`,
                      height: '100%',
                      cursor: track.locked ? 'default' : (isDraggingThis ? 'grabbing' : 'grab'),
                      zIndex: isDraggingThis ? 1000 : (selectedTrackItemId === item.id ? 10 : 1),
                      transform: isDraggingThis && draggingItem?.mode === 'move' ? `translate3d(0, ${dragDeltaY}px, 0)` : 'none',
                      boxShadow: isDraggingThis && draggingItem?.mode === 'move' ? '0 10px 30px rgba(0,0,0,0.85), 0 0 12px #00d8b6' : 'none',
                      pointerEvents: isDraggingThis && draggingItem?.mode === 'move' ? 'none' : 'auto',
                      opacity: isDraggingThis && draggingItem?.mode === 'move' ? 0.92 : 1,
                      transition: isDraggingThis ? 'none' : 'transform 0.15s ease-out, box-shadow 0.15s ease-out'
                    }}>
                    
                    {(() => {
                      const t = item.transform || {};
                      const fIn = t.fadeIn || 0;
                      const fOut = t.fadeOut || 0;
                      const cDur = item.end - item.start;
                      const fInPct = cDur > 0 ? Math.min(100, (fIn / cDur) * 100) : 0;
                      const fOutPct = cDur > 0 ? Math.min(100, (fOut / cDur) * 100) : 0;

                      const renderFadeVisuals = () => (
                        <>
                          {fInPct > 0 && (
                            <svg style={{ position: 'absolute', top: 0, left: 0, width: `${fInPct}%`, height: '100%', zIndex: 5, pointerEvents: 'none' }} preserveAspectRatio="none" viewBox="0 0 100 100">
                              <path d="M 0,0 L 0,100 Q 50,100 100,0 Z" fill="rgba(0, 0, 0, 0.5)" />
                            </svg>
                          )}
                          {fOutPct > 0 && (
                            <svg style={{ position: 'absolute', top: 0, right: 0, width: `${fOutPct}%`, height: '100%', zIndex: 5, pointerEvents: 'none' }} preserveAspectRatio="none" viewBox="0 0 100 100">
                              <path d="M 0,0 L 100,0 L 100,100 Q 50,100 0,0 Z" fill="rgba(0, 0, 0, 0.5)" />
                            </svg>
                          )}
                        </>
                      );

                      if (track.type === 'text') {
                        return (
                          <div className="absolute box-border h-full w-full cursor-pointer overflow-hidden rounded-sm select-none flex items-center px-2" style={{ border: selectedTrackItemId === item.id ? '2px solid #ffffff' : '1px solid #78350f', backgroundColor: '#92400e' }}>
                            {renderFadeVisuals()}
                            <Type size={12} className="text-amber-200 mr-1.5 flex-shrink-0" />
                            <span style={{ fontSize: '10px', color: '#fef3c7', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              {item.text || item.name || 'Teks'}
                            </span>
                            {renderResizerHandles()}
                          </div>
                        );
                      }

                      if (item.isEffect || track.type === 'effect' || track.isEffectTrack) {
                        const isSelected = selectedTrackItemId === item.id;
                        return (
                          <div 
                            className="absolute box-border cursor-pointer select-none flex items-center"
                            style={{ 
                              top: '2px',
                              bottom: '2px',
                              height: 'calc(100% - 4px)',
                              width: '100%',
                              backgroundColor: '#744a82',
                              border: isSelected ? '2px solid #ffffff' : '1.5px solid rgba(255, 255, 255, 0.75)',
                              borderRadius: '3px',
                              padding: '0 3px',
                              overflow: 'hidden',
                              boxSizing: 'border-box'
                            }}
                          >
                            {renderFadeVisuals()}
                            
                            {/* Pill Badge with Star Icon & Effect Name */}
                            <div 
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '5px',
                                backgroundColor: '#825c8f',
                                padding: '2px 7px',
                                borderRadius: '3px',
                                maxWidth: 'calc(100% - 10px)',
                                overflow: 'hidden',
                                flexShrink: 0
                              }}
                            >
                              <Star size={11} color="#ffffff" strokeWidth={2.2} fill="none" style={{ flexShrink: 0 }} />
                              <span 
                                style={{ 
                                  fontSize: '11px', 
                                  color: '#ffffff', 
                                  fontWeight: 500, 
                                  whiteSpace: 'nowrap', 
                                  textOverflow: 'ellipsis', 
                                  overflow: 'hidden',
                                  letterSpacing: '0.01em',
                                  fontFamily: 'Inter, -apple-system, sans-serif'
                                }}
                              >
                                {item.name}
                              </span>
                            </div>

                            {/* Resizers */}
                            {renderResizerHandles()}
                          </div>
                        );
                      }

                      if (track.type === 'image' || track.type === 'video') {
                        return (
                          <div className="absolute box-border h-full w-full cursor-pointer overflow-hidden rounded-sm select-none flex flex-col" style={{ border: selectedTrackItemId === item.id ? '2px solid #ffffff' : '1px solid #000000', backgroundColor: '#02383c' }}>
                            {renderFadeVisuals()}
                            
                            {/* 1. Top Text Name & Duration */}
                            <div className="flex items-center px-1 relative z-10 justify-between" style={{ height: '18px', flexShrink: 0, backgroundColor: 'rgba(0,0,0,0.3)' }}>
                              <span style={{ fontSize: '9px', color: '#e4e4e7', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', paddingLeft: '2px' }}>{item.name} {formatTime(Math.ceil(dEnd - dStart))}</span>
                              {item.mirror && (
                                <span style={{ fontSize: '8px', backgroundColor: 'rgba(0, 216, 182, 0.25)', color: '#00d8b6', border: '1px solid rgba(0, 216, 182, 0.4)', padding: '0 3px', borderRadius: '3px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                  ⇄ Mirror
                                </span>
                              )}
                            </div>
                            
                            {/* 2. Middle Filmstrip */}
                            <div className="relative" style={{ height: '44px', flexShrink: 0, overflow: 'hidden', transform: item.mirror ? 'scaleX(-1)' : 'none', transition: 'transform 0.15s ease' }}>
                               {track.type === 'video' && (
                                 <VideoFilmstrip 
                                   file={item.file} 
                                   totalPx={widthPx} 
                                   duration={isDraggingThis ? (item.end - item.start) : (dEnd - dStart)} 
                                   sourceStart={isDraggingThis ? (item.sourceStart || 0) : dSourceStart} 
                                   isDragging={isDraggingThis} 
                                   onStatusChange={(isProc) => onStatusChange?.(isProc ? 1 : -1)} 
                                 />
                               )}
                               {track.type === 'image' && <ImageFilmstrip file={item.file} />}
                            </div>
                            
                            {/* 3. Bottom Waveform */}
                            <div className="relative flex-1" style={{ width: '100%', overflow: 'hidden', backgroundColor: '#064e3b' }}>
                               {track.type === 'video' && (
                                 <>
                                   <AudioWaveformCanvas 
                                     file={item.file} 
                                     currentTime={currentTime - dStart} 
                                     duration={dEnd - dStart} 
                                     sourceStart={dSourceStart} 
                                     sourceDuration={item.sourceDuration} 
                                     onSeek={() => {}} 
                                     onStatusChange={(isProc) => onStatusChange?.(isProc ? 1 : -1)} 
                                   />
                                   <div className="absolute h-px w-full bg-white opacity-40 pointer-events-none" style={{ top: '50%' }}></div>
                                 </>
                               )}
                            </div>

                            {/* Resizers */}
                            {renderResizerHandles()}
                          </div>
                        );
                      } else {
                        // AUDIO KOLAM
                        return (
                          <div className="absolute box-border h-full w-full cursor-pointer overflow-hidden rounded-sm select-none" style={{ border: selectedTrackItemId === item.id ? '2px solid #ffffff' : '1px solid black', backgroundColor: '#051919' }}>
                             {renderFadeVisuals()}
                             <AudioWaveformCanvas 
                               key={`${item.id}-${item.filePath || item.name}`} 
                               file={item.file} 
                               currentTime={currentTime - dStart} 
                               duration={dEnd - dStart} 
                               sourceStart={dSourceStart} 
                               sourceDuration={item.sourceDuration} 
                               onSeek={() => {}} 
                               onStatusChange={(isProc) => onStatusChange?.(isProc ? 1 : -1)} 
                             />
                             <div className="pointer-events-none absolute inset-0 z-10">
                               <div className="pointer-events-auto absolute h-px w-full bg-white opacity-40 hover:opacity-100 transition-opacity" style={{ top: '25%', cursor: 'ns-resize' }} title="Volume"></div>
                             </div>
                             <div className="pointer-events-none absolute top-0 flex h-20 w-full items-start justify-between z-20">
                                <span className="truncate px-[10px] text-xs font-medium text-white/90" style={{ padding: '2px 4px', textShadow: 'black 0px 0px 5px', fontSize: '8px', color: '#2dd4bf' }}>{item.name}</span>
                             </div>
                             {/* Overlay when isolating vocals */}
                             {isolatingItem?.id === item.id && (
                               <div style={{
                                 position: 'absolute', inset: 0, zIndex: 30,
                                 backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex',
                                 alignItems: 'center', justifyContent: 'center', gap: '6px'
                               }}>
                                 <Loader2 size={13} className="animate-spin" style={{ color: '#2dd4bf' }} />
                                 <span style={{ fontSize: '9px', color: '#2dd4bf', fontWeight: 600 }}>
                                   {isolatingItem.mode === 'remove-vocal' ? 'Removing vocal...' : 'Keeping vocal...'}
                                 </span>
                               </div>
                             )}
                            {/* Resizers */}
                            {renderResizerHandles()}
                          </div>
                        );
                      }
                    })()}
                  </div>
                );
              })}
            </div>
              </Fragment>
            );
          })}

          {/* Drop zone for new audio track at bottom */}
          {newTrackDropZone === 'bottom_audio' && (
            <div style={{
              height: '38px',
              margin: '4px 8px',
              border: '2px dashed #00d8b6',
              borderRadius: '6px',
              backgroundColor: 'rgba(0, 216, 182, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00d8b6',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              pointerEvents: 'none',
              zIndex: 50
            }}>
              + Lepaskan di sini untuk membuat Kolam Audio Baru (Bawah)
            </div>
          )}

          {/* Drop zone for new video track at bottom if no audio tracks exist */}
          {newTrackDropZone === 'bottom_visual' && tracks.every(t => t.type !== 'audio') && (
            <div style={{
              height: '42px',
              margin: '4px 8px',
              border: '2px dashed #00d8b6',
              borderRadius: '6px',
              backgroundColor: 'rgba(0, 216, 182, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00d8b6',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              pointerEvents: 'none',
              zIndex: 50
            }}>
              + Lepaskan di sini untuk membuat Kolam Video Baru
            </div>
          )}
            </>
          )}
        </div>
      </div>
      {/* Context Menu Popup */}
      {contextMenu && (
        <div 
          style={{
            position: 'fixed',
            left: Math.max(8, Math.min(contextMenu.x, window.innerWidth - 175)),
            top: Math.max(8, Math.min(contextMenu.y, window.innerHeight - (contextMenu.isAudio ? 200 : 155))),
            zIndex: 999999,
            backgroundColor: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '8px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.85)',
            padding: '4px',
            minWidth: '145px',
            userSelect: 'none',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* 1. Copy */}
          {(contextMenu.itemId || contextMenu.lineIdx !== undefined) && (
            <div
              onClick={handleCopy}
              style={{
                padding: '7px 12px',
                fontSize: '12px',
                color: '#e4e4e7',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'background 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#27272a'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Copy (Ctrl+C)
            </div>
          )}

          {/* 2. Cut */}
          {(contextMenu.itemId || contextMenu.lineIdx !== undefined) && (
            <div
              onClick={handleCut}
              style={{
                padding: '7px 12px',
                fontSize: '12px',
                color: '#e4e4e7',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'background 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#27272a'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Cut (Ctrl+X)
            </div>
          )}

          {/* 3. Paste */}
          <div
            onClick={clipboardItem ? handlePaste : undefined}
            style={{
              padding: '7px 12px',
              fontSize: '12px',
              color: clipboardItem ? '#e4e4e7' : '#52525b',
              cursor: clipboardItem ? 'pointer' : 'default',
              borderRadius: '4px',
              transition: 'background 0.1s'
            }}
            onMouseEnter={e => {
              if (clipboardItem) e.currentTarget.style.backgroundColor = '#27272a';
            }}
            onMouseLeave={e => {
              if (clipboardItem) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Paste (Ctrl+V)
          </div>

          {/* 4. Delete */}
          {(contextMenu.itemId || contextMenu.lineIdx !== undefined) && (
            <div
              onClick={() => handleDelete(contextMenu)}
              style={{
                padding: '7px 12px',
                fontSize: '12px',
                color: '#ef4444',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'background 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#27272a'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Delete (Del)
            </div>
          )}

          {/* 4b. Tukar Posisi Teks (Swap Text Tracks) */}
          {contextMenu.itemType === 'text' && contextMenu.lineIdx !== undefined && lines.length > 1 && (
            <>
              <div style={{ height: '1px', backgroundColor: '#27272a', margin: '3px 0' }} />
              {contextMenu.lineIdx > 0 && (
                <div
                  onClick={() => {
                    const idx = contextMenu.lineIdx;
                    setLines(prev => {
                      const next = [...prev];
                      const temp = next[idx];
                      next[idx] = next[idx - 1];
                      next[idx - 1] = temp;
                      return next;
                    });
                    setSelectedLineIdx(idx - 1);
                    setContextMenu(null);
                  }}
                  style={{
                    padding: '7px 12px',
                    fontSize: '12px',
                    color: '#38bdf8',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#27272a'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  ↑ Tukar Posisi ke Atas
                </div>
              )}
              {contextMenu.lineIdx < lines.length - 1 && (
                <div
                  onClick={() => {
                    const idx = contextMenu.lineIdx;
                    setLines(prev => {
                      const next = [...prev];
                      const temp = next[idx];
                      next[idx] = next[idx + 1];
                      next[idx + 1] = temp;
                      return next;
                    });
                    setSelectedLineIdx(idx + 1);
                    setContextMenu(null);
                  }}
                  style={{
                    padding: '7px 12px',
                    fontSize: '12px',
                    color: '#38bdf8',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#27272a'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  ↓ Tukar Posisi ke Bawah
                </div>
              )}
            </>
          )}

          {/* 5. Mirror toggle for visual clips */}
          {contextMenu.item && !contextMenu.isAudio && contextMenu.itemType !== 'text' && (
            <div
              onClick={() => {
                const itId = contextMenu.itemId;
                setTracks(prev => prev.map(t => ({
                  ...t,
                  items: t.items.map(it => it.id === itId ? { ...it, mirror: !it.mirror } : it)
                })));
                setContextMenu(null);
              }}
              style={{
                padding: '7px 12px',
                fontSize: '12px',
                color: '#e4e4e7',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#27272a'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FlipHorizontal size={13} style={{ color: '#00d8b6' }} />
                <span>Mirror</span>
              </div>
              {contextMenu.item.mirror && <Check size={12} color="#00d8b6" />}
            </div>
          )}

          {/* 6. Isolate voice (ONLY for Audio clips) */}
          {contextMenu.isAudio && (
            <div 
              style={{ position: 'relative' }}
              onMouseEnter={() => setSubmenuOpen(true)}
              onMouseLeave={() => setSubmenuOpen(false)}
            >
              <div
                onClick={() => setSubmenuOpen(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 12px',
                  fontSize: '12px',
                  color: '#e4e4e7',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  backgroundColor: submenuOpen ? '#27272a' : 'transparent',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#27272a'}
                onMouseLeave={e => {
                  if (!submenuOpen) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span>Isolate voice</span>
                <ChevronRight size={13} style={{ color: '#a1a1aa' }} />
              </div>

              {/* Submenu: Remove vocal & Keep vocal */}
              {submenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    left: (contextMenu.x + 300 > window.innerWidth) ? 'auto' : 'calc(100% + 4px)',
                    right: (contextMenu.x + 300 > window.innerWidth) ? 'calc(100% + 4px)' : 'auto',
                    top: '0px',
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.85)',
                    padding: '4px',
                    minWidth: '130px',
                    zIndex: 1000000
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div
                    onClick={() => handleIsolateVoice('remove-vocal')}
                    style={{
                      padding: '7px 12px',
                      fontSize: '12px',
                      color: '#e4e4e7',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      transition: 'background 0.1s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#27272a'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Remove vocal
                  </div>
                  <div
                    onClick={() => handleIsolateVoice('keep-vocal')}
                    style={{
                      padding: '7px 12px',
                      fontSize: '12px',
                      color: '#e4e4e7',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      transition: 'background 0.1s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#27272a'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Keep vocal
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </div>

      <div style={{ flexShrink: 0, height: '22px', backgroundColor: '#09090b', borderTop: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 8px' }}>
        <span style={{ fontSize: '8px', color: '#52525b' }}>Ctrl+Scroll Zoom | Snap to 1s Grid</span>
        <button onClick={() => setZoom(p => Math.max(0, Math.round(p - 5)))} style={{ padding: '1px 6px', fontSize: '10px', fontWeight: 700, backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '3px', color: '#a1a1aa', cursor: 'pointer' }}>−</button>
        <span style={{ fontSize: '9px', color: '#60a5fa', fontWeight: 700, minWidth: '32px', textAlign: 'center' }}>{Math.round(zoom)}%</span>
        <button onClick={() => setZoom(p => Math.min(100, Math.round(p + 5)))} style={{ padding: '1px 6px', fontSize: '10px', fontWeight: 700, backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '3px', color: '#a1a1aa', cursor: 'pointer' }}>+</button>
      </div>
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
          backgroundColor: '#18181b', border: '1px solid #27272a',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stem.color, flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: '#d4d4d8', width: '90px', flexShrink: 0 }}>{stem.label}</span>
          <input
            type="range" min="0" max="100" value={stem.muted ? 0 : stem.volume}
            onChange={e => setVol(stem.id, +e.target.value)}
            disabled={stem.muted}
            style={{ flex: 1, accentColor: stem.color, cursor: 'pointer' }}
          />
          <span style={{ fontSize: '11px', color: '#71717a', width: '28px', textAlign: 'right' }}>
            {stem.muted ? 0 : stem.volume}%
          </span>
          <button onClick={() => toggleMute(stem.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: stem.muted ? '#ef4444' : '#71717a', padding: '2px',
          }}>
            {stem.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
      ))}
    </div>
  );
}

const applyAudioProperties = (el, t, isActive, currentTime, item) => {
  if (!el || !el.play) return;
  if (item?.isEffect) {
    el.muted = true;
    return;
  }
  el.muted = false;
  try {
    if (!window.__shotaiAudioContext && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      window.__shotaiAudioContext = new AudioCtx();
    }
    const audioCtx = window.__shotaiAudioContext;

    if (audioCtx && !el.__sourceNode) {
      try {
        el.__gainNode = audioCtx.createGain();
        el.__analyser = audioCtx.createAnalyser();
        el.__analyser.fftSize = 64;
        el.__analyser.smoothingTimeConstant = 0.4;
        el.__sourceNode = audioCtx.createMediaElementSource(el);
        el.__sourceNode.connect(el.__gainNode);
        el.__gainNode.connect(el.__analyser);
        el.__analyser.connect(audioCtx.destination);
      } catch (e) {
        // Fallback if cross-origin or already connected
      }
    }
    
    if (audioCtx && audioCtx.state === 'suspended' && isActive && !el.paused) {
      audioCtx.resume().catch(() => {});
    }

    const db = typeof t.volume !== 'undefined' ? t.volume : 0;
    const baseGain = Math.pow(10, db / 20);

    let fadeMultiplier = 1.0;
    if (isActive) {
        const timeInClip = currentTime - item.start;
        const fIn = t.fadeIn || 0;
        const fOut = t.fadeOut || 0;
        const clipDuration = item.end - item.start;
        
        if (fIn > 0 && timeInClip < fIn) {
            fadeMultiplier = timeInClip / fIn;
        } else if (fOut > 0 && timeInClip > clipDuration - fOut) {
            fadeMultiplier = (clipDuration - timeInClip) / fOut;
        }
        fadeMultiplier = Math.max(0, Math.min(1, fadeMultiplier));
    }

    const finalGain = baseGain * fadeMultiplier;
    if (el.__gainNode) {
      el.__gainNode.gain.value = finalGain;
    }
    if (!el.__sourceNode) {
      el.volume = Math.max(0, Math.min(1, finalGain));
    }
  } catch (err) {
    const db = typeof t.volume !== 'undefined' ? t.volume : 0;
    const baseGain = Math.min(1, Math.max(0, Math.pow(10, db / 20))); 
    
    let fadeMultiplier = 1.0;
    if (isActive) {
        const timeInClip = currentTime - item.start;
        const fIn = t.fadeIn || 0;
        const fOut = t.fadeOut || 0;
        const clipDuration = item.end - item.start;
        
        if (fIn > 0 && timeInClip < fIn) {
            fadeMultiplier = timeInClip / fIn;
        } else if (fOut > 0 && timeInClip > clipDuration - fOut) {
            fadeMultiplier = (clipDuration - timeInClip) / fOut;
        }
        fadeMultiplier = Math.max(0, Math.min(1, fadeMultiplier));
    }
    el.volume = baseGain * fadeMultiplier;
  }
  
  const newSpeed = typeof t.speed !== 'undefined' ? t.speed : 1;
  if (el.playbackRate !== newSpeed) {
      el.playbackRate = newSpeed;
  }
};

/* ─── Multi-Track Audio Engine (Only for Audio Tracks - Video Audio is Handled by VideoPreview) ──────── */
function MultiTrackAudioEngine({ tracks, currentTime, isPlaying, isLooping }) {
  const mediaRefs = useRef({});

  useEffect(() => {
    if (!tracks || tracks.length === 0) return;
    tracks.forEach(track => {
      // Only process audio-type tracks! Video track elements are rendered & played natively in VideoPreview!
      if (track.type !== 'audio') return;
      (track.items || []).forEach(item => {
        if (item.isEffect) return;
        const el = mediaRefs.current[item.id];
        if (!el || el.tagName !== 'AUDIO') return;
        
        const t = item.transform || {};
        const isActive = currentTime >= item.start && currentTime <= item.end;
        
        applyAudioProperties(el, t, isActive, currentTime, item);

        const isMuted = Boolean(track.mutedAudio);
        if (el) el.muted = isMuted;

        if (isActive) {
            const speed = typeof t.speed !== 'undefined' ? t.speed : 1;
            const expectedTime = ((currentTime - item.start) + (item.sourceStart || 0)) * speed;
            if (Math.abs(el.currentTime - expectedTime) > 0.3) {
                el.currentTime = expectedTime;
            }
            if (isPlaying && el.paused) {
                el.muted = isMuted;
                el.play().catch(e => console.warn('AudioEngine play error:', e));
                if (!window.__shotaiActiveAudioElements) window.__shotaiActiveAudioElements = new Set();
                window.__shotaiActiveAudioElements.add(el);
            } else if (!isPlaying && !el.paused) {
                el.pause();
                window.__shotaiActiveAudioElements?.delete(el);
            }
        } else {
            if (!el.paused) el.pause();
            window.__shotaiActiveAudioElements?.delete(el);
        }
      });
    });
  }, [currentTime, isPlaying, tracks]);

  useEffect(() => {
    return () => {
      if (window.__shotaiActiveAudioElements) {
        Object.values(mediaRefs.current || {}).forEach(el => {
          if (el) window.__shotaiActiveAudioElements.delete(el);
        });
      }
    };
  }, []);

  useEffect(() => {
     if (!tracks) return;
     tracks.forEach(track => {
        if (track.type !== 'audio') return;
        (track.items || []).forEach(item => {
           const el = mediaRefs.current[item.id];
           if (el && el.tagName === 'AUDIO') el.loop = isLooping;
        });
     });
  }, [isLooping, tracks]);

  return (
    <div style={{ position: 'fixed', top: -9999, left: -9999, width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}>
       {tracks.filter(t => t.type === 'audio').flatMap(track => track.items || []).map(item => {
          if (item.isEffect) return null;
          return <audio key={item.id} ref={el => mediaRefs.current[item.id] = el} src={item.url} preload="auto" />;
       })}
    </div>
  );
}

// Musically calibrated energy-to-VU-level mapper (0 to 5)
// Segment 0: low green (> 0.0) | Segment 1: mid green (> 1.0) | Segment 2: lime green (> 2.0)
// Segment 3: AMBER beat hit (> 3.0) | Segment 4: RED clipping/loud peak (> 4.0, requires energy > 0.86)
const mapEnergyToLevel = (energy) => {
  if (energy <= 0.03) return 0;
  if (energy <= 0.18) {
    return 0.5 + ((energy - 0.03) / 0.15) * 0.9; // 0.5 to 1.4 -> bar 1
  }
  if (energy <= 0.42) {
    return 1.4 + ((energy - 0.18) / 0.24) * 1.0; // 1.4 to 2.4 -> bar 2
  }
  if (energy <= 0.68) {
    return 2.4 + ((energy - 0.42) / 0.26) * 1.0; // 2.4 to 3.4 -> bar 3 (lime)
  }
  if (energy <= 0.86) {
    return 3.4 + ((energy - 0.68) / 0.18) * 0.8; // 3.4 to 4.2 -> bar 4 (amber punches on kick beats)
  }
  // Red only flashes when energy > 0.86!
  return 4.2 + Math.min(0.8, ((energy - 0.86) / 0.14) * 0.8); // 4.2 to 5.0 -> bar 5 (RED peak)
};

/* ─── Stereo LED Audio VU Meter (Equalizer Volume Display) ─────── */
function StereoVuMeter({ isPlaying, currentTime = 0, tracks = [], actualHoveredMediaUrl = null }) {
  const [levels, setLevels] = useState({ left: 0, right: 0 });
  const animRef = useRef(null);

  useEffect(() => {
    let currentL = 0;
    let currentR = 0;

    const update = () => {
      // 1. Verify if audio or video-with-audio is active at currentTime
      const hasActiveTimelineAudio = (tracks || []).some(t => {
        if (t.type !== 'audio' && t.type !== 'video') return false;
        return (t.items || []).some(it => !it.isEffect && currentTime >= it.start && currentTime <= it.end);
      });
      const isAudioActive = Boolean(isPlaying && (hasActiveTimelineAudio || actualHoveredMediaUrl));

      if (isAudioActive) {
        let measuredL = 0;
        let measuredR = 0;
        let hasSignal = false;

        // A. Real-time Web Audio API Analyser reading (Primary)
        if (window.__shotaiActiveAudioElements && window.__shotaiActiveAudioElements.size > 0) {
          const freqData = new Uint8Array(32);
          for (const el of window.__shotaiActiveAudioElements) {
            if (el && !el.paused && el.__analyser) {
              el.__analyser.getByteFrequencyData(freqData);
              // Read discrete frequency bands:
              // Bins 0-3: Sub-bass & Bass (kick drum, punch)
              const bass = (freqData[0] + freqData[1] + freqData[2] + freqData[3]) / 4;
              // Bins 4-8: Low-mids & Mids (vocals, body)
              const mids = (freqData[4] + freqData[5] + freqData[6] + freqData[7] + freqData[8]) / 5;
              // Bins 9-16: Highs (hi-hats, snares, rhythm)
              const highs = (freqData[9] + freqData[11] + freqData[13] + freqData[15]) / 4;
              const totalEnergy = bass + mids + highs;

              if (totalEnergy > 4) {
                hasSignal = true;
                const gain = el.__gainNode ? Math.min(1.5, el.__gainNode.gain.value) : (el.volume || 1);
                
                // Normalizing energy to [0, 1] range:
                // Left channel: bass emphasis + mid body
                const rawEnergyL = Math.min(1.0, ((bass * 0.58 + mids * 0.32 + highs * 0.10) / 225) * gain);
                // Right channel: rhythm & mid-high stereo separation
                const rawEnergyR = Math.min(1.0, ((bass * 0.38 + mids * 0.38 + highs * 0.24) / 225) * gain);

                measuredL = Math.max(measuredL, mapEnergyToLevel(rawEnergyL));
                measuredR = Math.max(measuredR, mapEnergyToLevel(rawEnergyR));
              }
            }
          }
        }

        // B. Precision PCM Waveform Beat Analysis Fallback
        if (!hasSignal && hasActiveTimelineAudio) {
          for (const t of tracks) {
            if (t.type !== 'audio' && t.type !== 'video') continue;
            for (const it of (t.items || [])) {
              if (it.isEffect) continue;
              if (currentTime >= it.start && currentTime <= it.end) {
                const cacheKey = it.file?.path || it.filePath || it.file?._filePath || it.file?.name || it.url;
                const pcm = waveformCache.get(cacheKey);
                if (pcm && pcm.length > 0) {
                  const dur = (it.sourceDuration || it.end - it.start) || 10;
                  const timeInClip = (currentTime - it.start) + (it.sourceStart || 0);
                  const sampleRate = pcm.length / Math.max(0.1, dur);
                  const centerIdx = Math.floor(timeInClip * sampleRate);
                  const windowSize = Math.max(20, Math.floor(sampleRate * 0.04));
                  const startIdx = Math.max(0, centerIdx - windowSize / 2);
                  const endIdx = Math.min(pcm.length, startIdx + windowSize);

                  let sumSq = 0;
                  let peak = 0;
                  for (let i = startIdx; i < endIdx; i++) {
                    const v = Math.abs(pcm[i]);
                    if (v > peak) peak = v;
                    sumSq += v * v;
                  }
                  const count = Math.max(1, endIdx - startIdx);
                  const rms = Math.sqrt(sumSq / count);
                  
                  const dbVal = typeof it.transform?.volume !== 'undefined' ? it.transform.volume : 0;
                  const volGain = Math.min(1.5, Math.pow(10, dbVal / 20));
                  const combined = Math.min(1.0, Math.max(peak * 0.65, rms * 1.6) * volGain);

                  if (combined > 0.02) {
                    hasSignal = true;
                    measuredL = Math.max(measuredL, mapEnergyToLevel(combined));
                    measuredR = Math.max(measuredR, mapEnergyToLevel(combined * 0.94));
                  }
                }
              }
            }
          }
        }

        // C. Dynamic Attack & Musical Decay
        if (hasSignal) {
          if (measuredL > currentL) currentL = measuredL;
          else currentL = Math.max(0, currentL - 0.22);

          if (measuredR > currentR) currentR = measuredR;
          else currentR = Math.max(0, currentR - 0.22);
        } else {
          currentL = Math.max(0, currentL - 0.35);
          currentR = Math.max(0, currentR - 0.35);
        }
      } else {
        // No audio playing: immediately decay to zero and stay completely still!
        currentL = Math.max(0, currentL - 0.5);
        currentR = Math.max(0, currentR - 0.5);
      }

      setLevels({
        left: Math.round(currentL),
        right: Math.round(currentR)
      });
      animRef.current = requestAnimationFrame(update);
    };

    animRef.current = requestAnimationFrame(update);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, currentTime, tracks, actualHoveredMediaUrl]);

  // 5 segments (top to bottom: 4=red peak, 3=amber, 2=lime, 1=green, 0=base green)
  const segments = [4, 3, 2, 1, 0];

  const getSegmentBackground = (rowIdx, activeLevel) => {
    const isLit = activeLevel > rowIdx;
    if (!isLit) {
      return 'linear-gradient(180deg, #3f3f46 0%, #27272a 100%)';
    }
    if (rowIdx >= 4) return 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)'; // Red peak
    if (rowIdx === 3) return 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'; // Amber
    if (rowIdx >= 1) return 'linear-gradient(180deg, #00ff66 0%, #00cc55 100%)'; // Neon lime green
    return 'linear-gradient(180deg, #16a34a 0%, #14532d 100%)'; // Deeper green
  };

  const getSegmentGlow = (rowIdx, activeLevel) => {
    const isLit = activeLevel > rowIdx;
    if (!isLit) return 'none';
    if (rowIdx >= 4) return '0 0 5px rgba(239, 68, 68, 0.9)';
    if (rowIdx === 3) return '0 0 5px rgba(245, 158, 11, 0.85)';
    if (rowIdx >= 1) return '0 0 5px rgba(0, 255, 102, 0.9)';
    return '0 0 4px rgba(22, 163, 74, 0.8)';
  };

  return (
    <div 
      title="Stereo Volume Level Meter (Equalizer)"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2.5px',
        padding: '2px 3px',
        backgroundColor: '#121214',
        border: '1px solid #27272a',
        borderRadius: '3px',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.85)'
      }}
    >
      {/* Left Channel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5px' }}>
        {segments.map(rowIdx => (
          <div
            key={`l-${rowIdx}`}
            style={{
              width: '11px',
              height: '2px',
              borderRadius: '1px',
              background: getSegmentBackground(rowIdx, levels.left),
              boxShadow: getSegmentGlow(rowIdx, levels.left),
              borderTop: levels.left > rowIdx ? 'none' : '1px solid rgba(255,255,255,0.15)',
              transition: 'background 0.04s, box-shadow 0.04s'
            }}
          />
        ))}
      </div>

      {/* Right Channel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5px' }}>
        {segments.map(rowIdx => (
          <div
            key={`r-${rowIdx}`}
            style={{
              width: '11px',
              height: '2px',
              borderRadius: '1px',
              background: getSegmentBackground(rowIdx, levels.right),
              boxShadow: getSegmentGlow(rowIdx, levels.right),
              borderTop: levels.right > rowIdx ? 'none' : '1px solid rgba(255,255,255,0.15)',
              transition: 'background 0.04s, box-shadow 0.04s'
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Karaoke Preview — Full-width, multi-line, synced ──────── */
function KaraokePreview({
  preset, aspectRatio, font, lines, currentTime, isPlaying,
  activeVersion = 1,
  useLyricsVersion = true,
  textSize = 24,
  selectedLineIdx = null,
  setSelectedLineIdx = null,
  setLines = null,
  onLineTransform = null,
  setIsPlaying = null,
  baseTextColor = '#ffffff',
  baseStrokeColor = '#0000ff',
  activeTextColor = '#ff0000',
  activeStrokeColor = '#ffffff',
  standardTextColor = '#ffffff',
  standardStrokeColor = '#000000',
  bgType = 'preset',
  bgImageUrl = null,
  bgVideoUrl = null,
  videoRef = null,
  isHoverPreview = false,
  isProcessing = false,
  tracks = [],
  isLooping = false,
  selectedTrackItemId = null,
  onItemTransform = null,
  setSelectedTrackItemId = null,
  previewZoom = 'fit',
  activeTimelineVisualItem = null
}) {
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(300);
  const [containerH, setContainerH] = useState(300);
  const [originalDim, setOriginalDim] = useState({ w: 16, h: 9 });
  const mediaRefs = useRef({});

  const [dragState, setDragState] = useState(null);
  const [snapGuides, setSnapGuides] = useState({ x: false, y: false });

  useEffect(() => {
    if (!dragState) return;
    const handleMouseMove = (e) => {
      let dx = e.clientX - dragState.startX;
      let dy = e.clientY - dragState.startY;
      
      if (dragState.mode === 'move-text') {
        const SNAP_TOLERANCE = 14;
        let snapX = false;
        let newX = dragState.initialX + dx;
        let newY = dragState.initialY + dy;

        // Snapping horizontally to center (0px)
        if (Math.abs(newX) < SNAP_TOLERANCE) {
          newX = 0;
          snapX = true;
        }

        setSnapGuides({ x: snapX, y: false });

        if (onLineTransform) {
          onLineTransform(dragState.lineIdx, { x: newX, y: newY });
        } else if (setLines) {
          setLines(prev => prev.map((l, idx) => idx === dragState.lineIdx ? { ...l, x: newX, y: newY } : l));
        }
      } else if (dragState.mode === 'resize-text') {
        const corner = dragState.corner || 'se';
        const factorX = corner.includes('e') ? 1 : -1;
        const factorY = corner.includes('s') ? 1 : -1;
        const delta = (dx * factorX * 0.45) + (dy * factorY * 0.45);
        const newFontSize = Math.max(10, Math.min(120, Math.round(dragState.initialFontSize + delta)));

        if (onLineTransform) {
          onLineTransform(dragState.lineIdx, { fontSize: newFontSize });
        } else if (setLines) {
          setLines(prev => prev.map((l, idx) => idx === dragState.lineIdx ? { ...l, fontSize: newFontSize } : l));
        }
      } else if (dragState.mode === 'resize') {
        // Simple scaling logic based on X movement
        let newScale = Math.max(10, Math.min(300, dragState.initialScale + (dx * 0.5)));
        if (onItemTransform) {
           onItemTransform(dragState.trackId, dragState.itemId, { scale: newScale });
        }
      } else {
        const SNAP_TOLERANCE = 15;
        let snapX = false;
        let snapY = false;
        
        let newX = dragState.initialX + dx;
        let newY = dragState.initialY + dy;
        
        if (Math.abs(newX) < SNAP_TOLERANCE) { newX = 0; snapX = true; }
        if (Math.abs(newY) < SNAP_TOLERANCE) { newY = 0; snapY = true; }
        
        setSnapGuides({ x: snapX, y: snapY });
        if (onItemTransform) {
           onItemTransform(dragState.trackId, dragState.itemId, { x: newX, y: newY });
        }
      }
    };
    const handleMouseUp = () => {
      setDragState(null);
      setSnapGuides({ x: false, y: false });
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, onItemTransform, onLineTransform, setLines]);

  const handleTextMouseDown = (e, lineIdx) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    if (setSelectedLineIdx && selectedLineIdx !== lineIdx) {
      setSelectedLineIdx(lineIdx);
    }
    if (setSelectedTrackItemId) {
      setSelectedTrackItemId(null);
    }
    if (setIsPlaying) {
      setIsPlaying(false);
    }
    const targetLine = lines[lineIdx];
    const initialX = targetLine?.x || 0;
    const initialY = targetLine?.y || 0;
    setDragState({
      mode: 'move-text',
      lineIdx: lineIdx,
      startX: e.clientX,
      startY: e.clientY,
      initialX: initialX,
      initialY: initialY
    });
  };

  const handleTextResizeMouseDown = (e, lineIdx, corner) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    if (setSelectedLineIdx && selectedLineIdx !== lineIdx) {
      setSelectedLineIdx(lineIdx);
    }
    if (setSelectedTrackItemId) {
      setSelectedTrackItemId(null);
    }
    if (setIsPlaying) {
      setIsPlaying(false);
    }
    const targetLine = lines[lineIdx];
    const initialSize = targetLine?.fontSize || textSize || 24;
    setDragState({
      mode: 'resize-text',
      lineIdx: lineIdx,
      corner: corner,
      startX: e.clientX,
      startY: e.clientY,
      initialFontSize: initialSize
    });
  };

  const handleItemMouseDown = (e, track, item) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    if (setSelectedTrackItemId && selectedTrackItemId !== item.id) {
       setSelectedTrackItemId(item.id);
    }
    // Effect position is locked in preview - cannot be moved or dragged!
    if (item.isEffect || track.type === 'effect' || track.isEffectTrack) {
      return;
    }
    const t = item.transform || { x: 0, y: 0, scale: 100 };
    setDragState({ mode: 'move', trackId: track.id, itemId: item.id, startX: e.clientX, startY: e.clientY, initialX: t.x, initialY: t.y, initialScale: t.scale });
  };

  const handleResizeMouseDown = (e, track, item, corner) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    // Effect position is locked in preview - cannot be resized!
    if (item.isEffect || track.type === 'effect' || track.isEffectTrack) {
      return;
    }
    const t = item.transform || { x: 0, y: 0, scale: 100 };
    setDragState({ mode: 'resize', corner, trackId: track.id, itemId: item.id, startX: e.clientX, startY: e.clientY, initialScale: t.scale });
  };

  useEffect(() => {
    if (isHoverPreview || !tracks || tracks.length === 0) return;
    tracks.forEach(track => {
      track.items.forEach(item => {
        const el = mediaRefs.current[item.id];
        if (!el || el.tagName !== 'VIDEO') return;
        
        const t = item.transform || {};
        const isActive = currentTime >= item.start && currentTime <= item.end;

        if (item.isEffect) {
          el.muted = true;
          el.loop = true;
          window.__shotaiActiveAudioElements?.delete(el);
        } else {
          applyAudioProperties(el, t, isActive, currentTime, item);
        }

        if (isActive) {
            const speed = typeof t.speed !== 'undefined' ? t.speed : 1;
            const clipElapsed = (currentTime - item.start) * speed;
            let expectedTime = ((item.sourceStart || 0) * speed) + clipElapsed;
            if (item.isEffect && el.duration && el.duration > 0) {
              expectedTime = expectedTime % el.duration;
            }
            if (Math.abs(el.currentTime - expectedTime) > 0.3) {
                el.currentTime = expectedTime;
            }
            if (el.playbackRate !== speed) {
              el.playbackRate = speed;
            }
            if (isPlaying && el.paused) {
                el.play().catch(e => console.warn(e));
                if (!item.isEffect) {
                  if (!window.__shotaiActiveAudioElements) window.__shotaiActiveAudioElements = new Set();
                  window.__shotaiActiveAudioElements.add(el);
                }
            } else if (!isPlaying && !el.paused) {
                el.pause();
                window.__shotaiActiveAudioElements?.delete(el);
            }
        } else {
            if (!el.paused) el.pause();
            window.__shotaiActiveAudioElements?.delete(el);
        }
      });
    });
  }, [currentTime, isPlaying, tracks, isHoverPreview]);

  useEffect(() => {
    return () => {
      if (window.__shotaiActiveAudioElements) {
        Object.values(mediaRefs.current || {}).forEach(el => {
          if (el) window.__shotaiActiveAudioElements.delete(el);
        });
      }
    };
  }, []);

  useEffect(() => {
    if (!tracks) return;
    tracks.forEach(track => {
      track.items.forEach(item => {
         const el = mediaRefs.current[item.id];
         if (el && el.tagName === 'VIDEO') el.loop = isLooping;
      });
    });
  }, [isLooping, tracks]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      window.requestAnimationFrame(() => {
        if (!entries || entries.length === 0) return;
        setContainerW(entries[0].contentRect.width);
        setContainerH(entries[0].contentRect.height);
      });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const presetRatio = ASPECT_RATIOS.find(r => r.id === aspectRatio) || ASPECT_RATIOS[0];
  const ratio = presetRatio.id === 'original' ? { id: 'original', w: originalDim.w, h: originalDim.h } : presetRatio;
  
  const videoRatio = ratio.w / ratio.h;
  const containerRatio = containerW / Math.max(1, containerH);

  let finalW, finalH;
  if (containerRatio > videoRatio) {
    // Container is wider than video (fit to height)
    finalH = containerH;
    finalW = containerH * videoRatio;
  } else {
    // Container is taller than video (fit to width)
    finalW = containerW;
    finalH = containerW / videoRatio;
  }

  // Disable zoom effect to maintain exact aspect ratio
  const zoomTransform = { scale: 1, translateX: 0, translateY: 0 };

  // Base visual media item (video or image, non-effect)
  const baseVisualItem = useMemo(() => {
    for (const track of (tracks || [])) {
      if (track.type === 'audio' || track.type === 'effect' || track.isEffectTrack) continue;
      for (const item of (track.items || [])) {
        if (!item.isEffect) return item;
      }
    }
    return null;
  }, [tracks]);

  // Check if there is background media or visual item
  const hasBaseVisualMedia = Boolean(baseVisualItem || (bgType === 'video' && bgVideoUrl) || (bgType === 'image' && bgImageUrl));

  // Determine effect aspect ratio:
  // "Rasio pada efek harus mengikuti rasio video atau gambar.
  // Contoh: saat pertama kali efek dimasukkan ke timeline, rasionya mengikuti layar preview.
  // Namun, apabila ada video dan gambar di timeline, maka efek tersebut harus menyesuaikan dengan rasio video dan gambar itu."
  const effectRatioStyle = useMemo(() => {
    if (hasBaseVisualMedia) {
      if (baseVisualItem?.crop && baseVisualItem.crop !== 'Original') {
        return baseVisualItem.crop.replace(':', '/');
      }
      if (originalDim.w && originalDim.h) {
        return `${originalDim.w}/${originalDim.h}`;
      }
    }
    // If no video or image in timeline, follow preview screen ratio:
    return `${ratio.w}/${ratio.h}`;
  }, [hasBaseVisualMedia, baseVisualItem, originalDim, ratio]);

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

  // Calculate fill percentage for current line (per-character, tight vocal sync)
  const calcFill = (line, ct) => {
    if (!line || ct == null) return 0;
    // Lead time compensation (80ms) to sync with audio hardware buffer and vocal attack
    const adjustedCt = ct + 0.08;
    const elapsed = adjustedCt - line.start;
    
    // Tighten duration (92%) so character fill matches fast vocal cadence without lagging
    // If user set a custom animation duration, use it, otherwise use block duration
    const blockDur = (line.end - line.start);
    const dur = line.animDuration !== undefined ? line.animDuration : blockDur * 0.92;
    
    if (dur <= 0) return 0;
    return Math.max(0, Math.min(100, (elapsed / dur) * 100));
  };

  const renderLine = (line, isCurrent, fillPct, lineStyleOverrides = {}, lineIdx = null) => {
    if (!line) return null;
    if (line.hidden) return null;
    const chars = line.text.split('');
    const total = chars.length;
    const filledChars = Math.floor((fillPct / 100) * total);

    // Transition effect: appearing (enter) 0.55s, disappearing (exit) 0.22s for Versi 2..5
    const transitionTime = isCurrent ? '0.55s' : '0.22s';
    const transitionStyle = activeVersion === 1
      ? 'opacity 0.4s, font-size 0.3s'
      : `opacity ${transitionTime} cubic-bezier(0.4, 0, 0.2, 1), color 0.08s, -webkit-text-stroke 0.08s`;

    const isFixedLayout = activeVersion === 2 || activeVersion === 3 || activeVersion === 4 || activeVersion === 5;
    const baseSize = line.fontSize || textSize || 24;
    const lineFont = line.font || font || 'System';
    const fontSizePx = isFixedLayout ? `${baseSize}px` : (isCurrent ? `${baseSize}px` : `${Math.max(12, Math.round(baseSize * 0.8))}px`);
    const fontFamily = lineFont === 'System' ? 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : `'${lineFont}', sans-serif`;

    const lineX = line.x || 0;
    const lineY = line.y || 0;
    const isSelected = selectedLineIdx !== null && selectedLineIdx === lineIdx;
    const isDraggingThis = dragState?.mode === 'move-text' && dragState?.lineIdx === lineIdx;

    return (
      <div 
        key={lineIdx !== null ? `line-${lineIdx}` : undefined}
        data-text-line="true"
        onMouseDown={(e) => {
          if (lineIdx !== null) handleTextMouseDown(e, lineIdx);
        }}
        style={{
          fontSize: fontSizePx,
          fontFamily: fontFamily,
          fontWeight: isCurrent ? 700 : 500,
          textAlign: lineStyleOverrides.textAlign || 'center',
          alignSelf: lineStyleOverrides.alignSelf || 'auto',
          lineHeight: 1.4,
          opacity: isCurrent ? 1 : 0.5,
          transform: `translate(${lineX}px, ${lineY}px)`,
          transition: isDraggingThis ? 'none' : transitionStyle,
          padding: '4px 10px',
          width: 'fit-content',
          maxWidth: '96%',
          margin: (lineStyleOverrides.alignSelf === 'flex-start' || lineStyleOverrides.textAlign === 'left') 
            ? '0 auto 0 0' 
            : (lineStyleOverrides.alignSelf === 'flex-end' || lineStyleOverrides.textAlign === 'right') 
              ? '0 0 0 auto' 
              : '0 auto',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: isSelected ? 60 : 50,
          cursor: isDraggingThis ? 'grabbing' : (isSelected ? 'grab' : 'pointer'),
          border: isSelected ? '1.5px dashed #00d8b6' : '1.5px dashed transparent',
          borderRadius: '6px',
          backgroundColor: isSelected ? 'rgba(0, 216, 182, 0.08)' : 'transparent',
          boxShadow: isSelected ? '0 0 10px rgba(0, 216, 182, 0.25)' : 'none',
          userSelect: 'none',
          ...lineStyleOverrides,
        }}
        onWheel={(e) => {
          if (isSelected && lineIdx !== null) {
            e.stopPropagation();
            const curSize = line.fontSize || textSize || 24;
            const delta = e.deltaY < 0 ? 2 : -2;
            const newSize = Math.max(10, Math.min(140, curSize + delta));
            if (onLineTransform) {
              onLineTransform(lineIdx, { fontSize: newSize });
            } else if (setLines) {
              setLines(prev => prev.map((l, idx) => idx === lineIdx ? { ...l, fontSize: newSize } : l));
            }
          }
        }}>
        
        {/* Corner Resize Handles for scaling text up and down directly on preview */}
        {isSelected && (
          <>
            <div 
              onMouseDown={(e) => handleTextResizeMouseDown(e, lineIdx, 'nw')}
              title="Tarik untuk Perbesar / Perkecil Teks"
              style={{ position: 'absolute', width: '13px', height: '13px', backgroundColor: '#ffffff', border: '2.5px solid #00d8b6', borderRadius: '50%', boxShadow: '0 2px 6px rgba(0,0,0,0.85)', zIndex: 90, pointerEvents: 'auto', top: '-7px', left: '-7px', cursor: 'nwse-resize' }} 
            />
            <div 
              onMouseDown={(e) => handleTextResizeMouseDown(e, lineIdx, 'ne')}
              title="Tarik untuk Perbesar / Perkecil Teks"
              style={{ position: 'absolute', width: '13px', height: '13px', backgroundColor: '#ffffff', border: '2.5px solid #00d8b6', borderRadius: '50%', boxShadow: '0 2px 6px rgba(0,0,0,0.85)', zIndex: 90, pointerEvents: 'auto', top: '-7px', right: '-7px', cursor: 'nesw-resize' }} 
            />
            <div 
              onMouseDown={(e) => handleTextResizeMouseDown(e, lineIdx, 'sw')}
              title="Tarik untuk Perbesar / Perkecil Teks"
              style={{ position: 'absolute', width: '13px', height: '13px', backgroundColor: '#ffffff', border: '2.5px solid #00d8b6', borderRadius: '50%', boxShadow: '0 2px 6px rgba(0,0,0,0.85)', zIndex: 90, pointerEvents: 'auto', bottom: '-7px', left: '-7px', cursor: 'nesw-resize' }} 
            />
            <div 
              onMouseDown={(e) => handleTextResizeMouseDown(e, lineIdx, 'se')}
              title="Tarik untuk Perbesar / Perkecil Teks"
              style={{ position: 'absolute', width: '13px', height: '13px', backgroundColor: '#ffffff', border: '2.5px solid #00d8b6', borderRadius: '50%', boxShadow: '0 2px 6px rgba(0,0,0,0.85)', zIndex: 90, pointerEvents: 'auto', bottom: '-7px', right: '-7px', cursor: 'nwse-resize' }} 
            />
          </>
        )}

        {!useLyricsVersion ? (
          <span style={{
            color: line.color || standardTextColor || '#ffffff',
            WebkitTextStroke: `1.5px ${line.strokeColor || standardStrokeColor || '#000000'}`,
            paintOrder: 'stroke fill',
            whiteSpace: 'pre-wrap'
          }}>
            {line.text}
          </span>
        ) : isCurrent ? chars.map((char, ci) => {
          const isFilled = ci < filledChars;
          const textColor = isFilled ? activeTextColor : baseTextColor;
          const strokeColor = isFilled ? activeStrokeColor : baseStrokeColor;
          return (
            <span key={ci} style={{
              color: textColor,
              WebkitTextStroke: `1.5px ${strokeColor}`,
              paintOrder: 'stroke fill',
              transition: 'color 0.08s ease, -webkit-text-stroke 0.08s ease',
              textShadow: isFilled ? `0 0 10px ${activeTextColor}70` : 'none',
              whiteSpace: char === ' ' ? 'pre' : 'normal',
            }}>
              {char}
            </span>
          );
        }) : (
          <span style={{
            color: baseTextColor,
            WebkitTextStroke: `1.5px ${baseStrokeColor}`,
            paintOrder: 'stroke fill',
          }}>
            {line.text}
          </span>
        )}
      </div>
    );
  };

  const prevIdx = currentIdx > 0 ? currentIdx - 1 : (nextIdx > 0 ? nextIdx - 1 : -1);
  const fillPct = currentIdx >= 0 ? calcFill(lines[currentIdx], currentTime) : 0;

  // Determine flex positioning based on activeVersion and useLyricsVersion:
  let containerJustify = 'center';
  let containerPaddingBottom = '16px';
  if (!useLyricsVersion) {
    containerJustify = 'flex-end';
    containerPaddingBottom = '16px';
  } else if (activeVersion === 2 || activeVersion === 3 || activeVersion === 5) {
    containerJustify = 'flex-end';
    containerPaddingBottom = '12px';
  } else if (activeVersion === 4 || activeVersion === 1) {
    containerJustify = 'center';
    containerPaddingBottom = '16px';
  }

  const renderContent = () => {
    // Hide lyrics when there are no active lyrics and no lyric is selected
    if (lines.length === 0) {
      return null;
    }

    const activeIdx = currentIdx >= 0 ? currentIdx : (selectedLineIdx !== null && lines[selectedLineIdx] ? selectedLineIdx : -1);
    if (activeIdx === -1) {
      return null;
    }

    const currentFill = currentIdx >= 0 ? fillPct : 100;
    const effPrevIdx = prevIdx >= 0 ? prevIdx : (activeIdx > 0 ? activeIdx - 1 : -1);
    const effNextIdx = nextIdx >= 0 ? nextIdx : (activeIdx + 1 < lines.length ? activeIdx + 1 : -1);

    if (!useLyricsVersion) {
      // Mode Standar (Pilihan Versi Lirik OFF): tampilkan semua baris teks aktif (yang tidak disembunyikan)
      const currentActiveLines = lines.map((l, idx) => ({ line: l, idx })).filter(({ line, idx }) => {
        if (line.hidden) return false;
        const inTime = (currentTime >= line.start && currentTime <= line.end);
        const isSel = (selectedLineIdx === idx);
        return inTime || isSel;
      });
      if (currentActiveLines.length === 0 && selectedLineIdx !== null && lines[selectedLineIdx] && !lines[selectedLineIdx].hidden) {
        currentActiveLines.push({ line: lines[selectedLineIdx], idx: selectedLineIdx });
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', gap: '6px', position: 'relative', zIndex: 50 }}>
          {currentActiveLines.map(({ line, idx }) => (
            renderLine(line, true, 100, { textAlign: 'center' }, idx)
          ))}
        </div>
      );
    }

    if (activeVersion === 1) {
      return (
        <>
          {effPrevIdx >= 0 && effPrevIdx !== activeIdx && renderLine(lines[effPrevIdx], false, 100, {}, effPrevIdx)}
          {renderLine(lines[activeIdx], true, currentFill, {}, activeIdx)}
          {effNextIdx >= 0 && effNextIdx !== activeIdx && renderLine(lines[effNextIdx], false, 0, {}, effNextIdx)}
        </>
      );
    }

    if (activeVersion === 2) {
      // 1 Line text display (bottom center)
      return renderLine(lines[activeIdx], true, currentFill, { textAlign: 'center' }, activeIdx);
    }

    if (activeVersion === 3) {
      // 2 Lines text display (bottom center)
      const line2Idx = activeIdx + 1 < lines.length ? activeIdx + 1 : -1;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', gap: '4px', position: 'relative', zIndex: 50 }}>
          {renderLine(lines[activeIdx], true, currentFill, { textAlign: 'center' }, activeIdx)}
          {line2Idx >= 0 && renderLine(lines[line2Idx], false, 0, { textAlign: 'center' }, line2Idx)}
        </div>
      );
    }

    if (activeVersion === 4) {
      // 1 Line text display (middle center)
      return renderLine(lines[activeIdx], true, currentFill, { textAlign: 'center' }, activeIdx);
    }

    if (activeVersion === 5) {
      // 2 Lines text display (alternating left / right following timeline)
      const line2Idx = activeIdx + 1 < lines.length ? activeIdx + 1 : -1;
      const isLeft = activeIdx % 2 === 0;

      const activeAlign = isLeft ? 'left' : 'right';
      const activeSelf = isLeft ? 'flex-start' : 'flex-end';
      const activePad = isLeft ? { paddingLeft: '16px' } : { paddingRight: '16px' };

      const nextAlign = isLeft ? 'right' : 'left';
      const nextSelf = isLeft ? 'flex-end' : 'flex-start';
      const nextPad = isLeft ? { paddingRight: '16px' } : { paddingLeft: '16px' };

      return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '6px', position: 'relative', zIndex: 50, padding: '0 4px' }}>
          {/* Active Line (following timeline) */}
          {renderLine(lines[activeIdx], true, currentFill, {
            textAlign: activeAlign,
            alignSelf: activeSelf,
            ...activePad,
          }, activeIdx)}
          {/* Next Line (upcoming preview) */}
          {line2Idx >= 0 && renderLine(lines[line2Idx], false, 0, {
            textAlign: nextAlign,
            alignSelf: nextSelf,
            ...nextPad,
          }, line2Idx)}
        </div>
      );
    }

    return null;
  };

  const zoomFactor = previewZoom === 'fit' ? 1 : (parseInt(previewZoom, 10) / 100);

  const currentVisual = activeTimelineVisualItem || (selectedTrackItemId ? (tracks || []).flatMap(t => t.items || []).find(i => i.id === selectedTrackItemId) : null);
  const isMirrored = !!(currentVisual?.mirror);
  const rot = (currentVisual?.rotation || 0);
  const cropRatio = currentVisual?.crop && currentVisual.crop !== 'Original' ? currentVisual.crop.replace(':', '/') : null;

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: previewZoom !== 'fit' ? 'auto' : 'hidden' }}>
      <div 
        onMouseDown={(e) => {
          if (!e.target.closest('[data-text-line="true"]') && !e.target.closest('[data-track-item="true"]')) {
            if (setSelectedTrackItemId) setSelectedTrackItemId(null);
            if (setSelectedLineIdx) setSelectedLineIdx(null);
          }
        }}
        style={{
        width: `${finalW}px`, height: `${finalH}px`,
        background: '#09090b',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: containerJustify,
        padding: `20px 24px ${containerPaddingBottom}`, boxSizing: 'border-box',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        transform: zoomFactor !== 1 ? `scale(${zoomFactor})` : 'none',
        transformOrigin: 'center center',
        transition: 'transform 0.15s ease-out',
        flexShrink: 0
      }}>

        {/* Dynamic Background Media */}
        {isHoverPreview ? (
          <>
            {(bgType === 'preset' || bgType === 'audio') && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e1b4b, #3b0764, #09090b)', zIndex: 0 }}>
                <div style={{ opacity: 0.2, display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontSize: '120px', fontWeight: 900, fontFamily: 'Inter', letterSpacing: '-0.05em', marginBottom: '8px', color: 'white', lineHeight: 1 }}>SA</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '0.3em', color: 'white' }}>STUDIO</div>
                </div>
              </div>
            )}
            {bgType === 'image' && bgImageUrl && (
              <img
                src={bgImageUrl}
                alt="Karaoke Background"
                onLoad={(e) => {
                  if (e.target.naturalWidth && e.target.naturalHeight) {
                    setOriginalDim({ w: e.target.naturalWidth, h: e.target.naturalHeight });
                  }
                }}
                style={{ 
                  position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0,
                  transform: `translate(${zoomTransform.translateX}px, ${zoomTransform.translateY}px) scale(${zoomTransform.scale})`,
                  transformOrigin: '0 0',
                  willChange: 'transform'
                }}
              />
            )}
            {(bgType === 'video' || bgType === 'audio') && bgVideoUrl && (
              <video
                ref={videoRef}
                src={bgVideoUrl}
                playsInline
                onLoadedData={(e) => {
                  if (e.target.videoWidth && e.target.videoHeight) {
                    setOriginalDim({ w: e.target.videoWidth, h: e.target.videoHeight });
                  }
                }}
                style={{ 
                  position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0,
                  transform: `translate(${zoomTransform.translateX}px, ${zoomTransform.translateY}px) scale(${zoomTransform.scale})`,
                  transformOrigin: '0 0',
                  willChange: 'transform',
                  display: bgType === 'audio' ? 'none' : 'block'
                }}
              />
            )}
          </>
        ) : (
          <>
            {/* Fallback Base Media Layer if no regular video track exists in tracks */}
            {(!tracks || !tracks.some(t => !t.isEffectTrack && t.type === 'video' && t.items.length > 0)) && (
              <>
                {bgType === 'image' && bgImageUrl ? (
                  <img
                    src={bgImageUrl}
                    alt="background"
                    style={{ 
                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                      objectFit: cropRatio ? 'contain' : 'cover',
                      aspectRatio: cropRatio || 'auto',
                      zIndex: 0,
                      transform: `translate(${zoomTransform.translateX}px, ${zoomTransform.translateY}px) scale(${zoomTransform.scale * (isMirrored ? -1 : 1)}, ${zoomTransform.scale}) rotate(${rot}deg)`,
                      transformOrigin: 'center center',
                      willChange: 'transform'
                    }}
                  />
                ) : (bgType === 'video' || bgType === 'audio') && bgVideoUrl ? (
                  <video
                    ref={videoRef}
                    src={bgVideoUrl}
                    playsInline
                    onLoadedMetadata={(e) => {
                      if (e.target.videoWidth && e.target.videoHeight) {
                        setOriginalDim({ w: e.target.videoWidth, h: e.target.videoHeight });
                      }
                    }}
                    style={{ 
                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                      objectFit: cropRatio ? 'contain' : 'cover',
                      aspectRatio: cropRatio || 'auto',
                      zIndex: 0,
                      transform: `translate(${zoomTransform.translateX}px, ${zoomTransform.translateY}px) scale(${zoomTransform.scale * (isMirrored ? -1 : 1)}, ${zoomTransform.scale}) rotate(${rot}deg)`,
                      transformOrigin: 'center center',
                      willChange: 'transform',
                      display: bgType === 'audio' ? 'none' : 'block'
                    }}
                  />
                ) : null}
              </>
            )}

            {/* Render all timeline tracks (Base Video, Effect Overlays with Screen blending, Images, Text) */}
            {tracks && tracks.map((track, tIdx) => {
              if (track.hidden) return null;
              return track.items.map(item => {
                if (track.type === 'audio') return null;
                const isActive = currentTime >= item.start && currentTime <= item.end;
                const z = (tracks.length - tIdx) * 10;
                const isSelected = selectedTrackItemId === item.id;
                const t = item.transform || { x: 0, y: 0, scale: 100, rotate: 0 };
                const tx = t.x + zoomTransform.translateX;
                const ty = t.y + zoomTransform.translateY;
                const sc = (t.scale / 100) * zoomTransform.scale;
                const op = typeof t.opacity !== 'undefined' ? t.opacity / 100 : 1;
                const bm = t.blendMode || (item.isEffect ? 'screen' : 'normal');
                const rot = (t.rotate || 0) + (item.rotation || 0);
                const mirrorScaleX = item.mirror ? -1 : 1;
                const cropRatio = item.crop && item.crop !== 'Original' ? item.crop.replace(':', '/') : null;
                
                if (track.type === 'effect' || track.isEffectTrack || item.isEffect) {
                  return (
                    <video
                      key={item.id}
                      ref={el => mediaRefs.current[item.id] = el}
                      src={item.url}
                      playsInline
                      muted={true}
                      loop={true}
                      style={{ 
                        display: isActive ? 'block' : 'none',
                        position: 'absolute',
                        inset: 0,
                        margin: 'auto',
                        width: '100%',
                        height: '100%',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        aspectRatio: effectRatioStyle,
                        objectFit: 'cover',
                        zIndex: z,
                        transform: 'none', // Locked! Cannot be moved or transformed
                        cursor: 'default', // Locked!
                        border: 'none',
                        opacity: op,
                        mixBlendMode: bm || 'screen',
                        filter: t.filter || 'none',
                        boxSizing: 'border-box',
                        pointerEvents: 'none' // Position is locked in preview, clicks pass through
                      }}
                    />
                  );
                } else if (track.type === 'video') {
                  return (
                    <video
                      key={item.id}
                      ref={el => mediaRefs.current[item.id] = el}
                      src={item.url}
                      playsInline
                      muted={true}
                      loop={false}
                      onMouseDown={(e) => handleItemMouseDown(e, track, item)}
                      onLoadedData={(e) => {
                        if (e.target.videoWidth && e.target.videoHeight) setOriginalDim({ w: e.target.videoWidth, h: e.target.videoHeight });
                      }}
                      style={{ 
                        display: isActive ? 'block' : 'none',
                        position: 'absolute', inset: 0, width: '100%', height: '100%',
                        objectFit: cropRatio ? 'contain' : 'cover',
                        aspectRatio: cropRatio || 'auto',
                        zIndex: z,
                        transform: `translate(${tx}px, ${ty}px) scale(${sc * mirrorScaleX}, ${sc}) rotate(${rot}deg)`,
                        transformOrigin: 'center center',
                        willChange: 'transform',
                        cursor: isSelected ? (dragState?.mode === 'move' ? 'grabbing' : 'grab') : 'pointer',
                        border: isSelected ? '1.5px dashed #00d8b6' : 'none',
                        opacity: op,
                        mixBlendMode: bm,
                        filter: t.filter || 'none',
                        boxSizing: 'border-box',
                        pointerEvents: isSelected || !dragState ? 'auto' : 'none'
                      }}
                    />
                  );
                } else if (track.type === 'image') {
                  return (
                    <img
                      key={item.id}
                      src={item.url}
                      onMouseDown={(e) => handleItemMouseDown(e, track, item)}
                      onLoad={(e) => {
                        if (e.target.naturalWidth && e.target.naturalHeight) setOriginalDim({ w: e.target.naturalWidth, h: e.target.naturalHeight });
                      }}
                      style={{ 
                        display: isActive ? 'block' : 'none',
                        position: 'absolute', inset: 0, width: '100%', height: '100%',
                        objectFit: cropRatio ? 'contain' : 'cover',
                        aspectRatio: cropRatio || 'auto',
                        zIndex: z,
                        transform: `translate(${tx}px, ${ty}px) scale(${sc * mirrorScaleX}, ${sc}) rotate(${rot}deg)`,
                        transformOrigin: 'center center',
                        willChange: 'transform',
                        cursor: isSelected ? (dragState?.mode === 'move' ? 'grabbing' : 'grab') : 'pointer',
                        border: isSelected ? '1.5px dashed #00d8b6' : 'none',
                        opacity: op,
                        mixBlendMode: bm,
                        filter: t.filter || 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  );
                } else if (track.type === 'text') {
                  const itemFont = item.font || font || 'System';
                  const itemFontSize = item.fontSize || textSize || 32;
                  return (
                    <div
                      key={item.id}
                      onMouseDown={(e) => handleItemMouseDown(e, track, item)}
                      style={{
                        display: isActive ? 'flex' : 'none',
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${sc}) rotate(${rot}deg)`,
                        transformOrigin: 'center center',
                        color: item.color || '#ffffff',
                        fontSize: `${itemFontSize}px`,
                        fontWeight: 700,
                        zIndex: z + 1,
                        textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                        fontFamily: 'Inter, sans-serif',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {item.text}
                    </div>
                  );
                }
                return null;
              });
            })}
          </>
        )}


        {renderContent()}

        {/* Selected Item Resize Handles Overlay */}
        {selectedTrackItemId && (() => {
          const sTrack = tracks.find(t => t.items.some(i => i.id === selectedTrackItemId));
          if (!sTrack) return null;
          const sItem = sTrack.items.find(i => i.id === selectedTrackItemId);
          if (!sItem || sTrack.type === 'audio') return null;
          // Effect position is locked in preview - no resize overlay or handles!
          if (sItem.isEffect || sTrack.type === 'effect' || sTrack.isEffectTrack) return null;
          
          const isActive = currentTime >= sItem.start && currentTime <= sItem.end;
          if (!isActive) return null;

          const t = sItem.transform || { x: 0, y: 0, scale: 100, rotate: 0 };
          const tx = t.x + zoomTransform.translateX;
          const ty = t.y + zoomTransform.translateY;
          const sc = (t.scale / 100) * zoomTransform.scale;
          const rot = t.rotate || 0;

          const handleStyle = { position: 'absolute', width: '12px', height: '12px', background: 'white', border: '1px solid #3b82f6', borderRadius: '50%', pointerEvents: 'auto' };

          return (
            <div style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 99,
              transform: `translate(${tx}px, ${ty}px) scale(${sc}) rotate(${rot}deg)`,
              transformOrigin: 'center center',
              pointerEvents: 'none' // allow clicks to pass through except for handles
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, border: '2px solid #3b82f6' }} />
              <div onMouseDown={(e) => handleResizeMouseDown(e, sTrack, sItem, 'nw')} style={{ ...handleStyle, top: 0, left: 0, transform: 'translate(-50%, -50%)', cursor: 'nwse-resize' }} />
              <div onMouseDown={(e) => handleResizeMouseDown(e, sTrack, sItem, 'ne')} style={{ ...handleStyle, top: 0, right: 0, transform: 'translate(50%, -50%)', cursor: 'nesw-resize' }} />
              <div onMouseDown={(e) => handleResizeMouseDown(e, sTrack, sItem, 'sw')} style={{ ...handleStyle, bottom: 0, left: 0, transform: 'translate(-50%, 50%)', cursor: 'nesw-resize' }} />
              <div onMouseDown={(e) => handleResizeMouseDown(e, sTrack, sItem, 'se')} style={{ ...handleStyle, bottom: 0, right: 0, transform: 'translate(50%, 50%)', cursor: 'nwse-resize' }} />
            </div>
          );
        })()}

        {/* Snap Guides */}
        {snapGuides.x && <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '1px', backgroundColor: '#3b82f6', zIndex: 100, transform: 'translateX(-50%)', pointerEvents: 'none', opacity: 0.8 }} />}
        {snapGuides.y && <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '1px', backgroundColor: '#3b82f6', zIndex: 100, transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.8 }} />}
      </div>
    </div>
  );
}

/* ─── Audio Player Bar (1-Second Step & Ticks) ───────────────── */
function AudioPlayerBar({
  audioUrl,
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  disabled = false,
  previewZoom = 'fit',
  setPreviewZoom = () => {},
  tracks = [],
  actualHoveredMediaUrl = null
}) {
  const [showZoomDropdown, setShowZoomDropdown] = useState(false);

  useEffect(() => {
    const handleCloseZoom = () => setShowZoomDropdown(false);
    window.addEventListener('click', handleCloseZoom);
    return () => window.removeEventListener('click', handleCloseZoom);
  }, []);

  if (!audioUrl) return null;
  const currentSec = Math.floor(currentTime || 0);
  const totalSec = Math.ceil(duration || 0);
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleBarClick = (e) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newPct = Math.max(0, Math.min(1, x / rect.width));
    const targetSec = Math.round(newPct * duration);
    onSeek(targetSec);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 10px', backgroundColor: '#111113', borderRadius: '8px', border: '1px solid #27272a' }}>
      {/* Seekbar with 1-Second Grid Lines & Indicator */}
      <div
        onClick={handleBarClick}
        title="Klik/geser untuk seek per 1 detik"
        style={{
          height: '10px', borderRadius: '5px', backgroundColor: '#18181b', cursor: 'pointer', position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', border: '1px solid #27272a',
        }}
      >
        {/* 1-Second Tick Lines Layer */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
          {Array.from({ length: Math.ceil(Math.min((isFinite(duration) && !isNaN(duration) ? Math.max(0, duration) : 0), 86400) || 30) + 1 }).map((_, sec) => {
            const tickPct = (sec / duration) * 100;
            if (tickPct > 100) return null;
            return (
              <div key={sec} style={{ position: 'absolute', left: `${tickPct}%`, top: 0, bottom: 0 }}>
                <div style={{ width: '1px', height: '100%', backgroundColor: sec % 5 === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)' }} />
              </div>
            );
          })}
        </div>

        {/* Millisecond Precision Progress Fill Bar */}
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: '4px',
          background: '#38bdf8',
          transition: 'none', zIndex: 2,
        }} />

        {/* Millisecond Precision Cursor Glow Handle */}
        {duration > 0 && (
          <div style={{
            position: 'absolute', left: `${pct}%`, top: 0, bottom: 0, width: '4px',
            backgroundColor: '#ffffff', borderRadius: '2px', zIndex: 3,
            boxShadow: '0 0 8px rgba(255,255,255,0.8)', transform: 'translateX(-50%)', transition: 'none',
          }} />
        )}
      </div>

      {/* Controls & Millisecond Time Display */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {formatTimeMs(currentTime)}
          </span>
          <StereoVuMeter isPlaying={isPlaying} currentTime={currentTime} tracks={tracks} actualHoveredMediaUrl={actualHoveredMediaUrl} />
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => onSeek(Math.max(0, currentSec - 1))}
            title="Mundur 1 Detik"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a1a1aa', padding: '2px', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', fontWeight: 600 }}>
            <SkipBack size={13} /> -1s
          </button>

          <button onClick={onPlayPause} disabled={disabled}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: disabled ? '#18181b' : '#27272a',
              border: '1px solid #3f3f46', cursor: disabled ? 'not-allowed' : 'pointer', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: disabled ? 'none' : '0 2px 8px rgba(0,0,0,0.5)',
              opacity: disabled ? 0.5 : 1,
            }}>
            {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: '2px' }} />}
          </button>

          <button onClick={() => onSeek(Math.min(duration, currentSec + 1))}
            title="Maju 1 Detik"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a1a1aa', padding: '2px', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', fontWeight: 600 }}>
            +1s <SkipFwd size={13} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', position: 'relative' }}>
          <span style={{ fontSize: '11px', color: '#475569', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
            {formatTime(totalSec)}
          </span>

          {/* Video Preview Magnifier / Zoom Tool */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowZoomDropdown(prev => !prev)}
              title="Perbesar Tampilan Video Preview"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 6px',
                backgroundColor: previewZoom !== 'fit' ? 'rgba(0, 216, 182, 0.15)' : '#18181b',
                border: `1px solid ${previewZoom !== 'fit' ? '#00d8b6' : '#27272a'}`,
                borderRadius: '4px',
                color: previewZoom !== 'fit' ? '#00d8b6' : '#a1a1aa',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: 600,
                transition: 'all 0.15s'
              }}
            >
              <ZoomIn size={12} />
              <span>{previewZoom === 'fit' ? 'Fit' : previewZoom}</span>
              <ChevronDown size={10} />
            </button>

            {showZoomDropdown && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: 'calc(100% + 4px)',
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '6px',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.85)',
                  padding: '3px',
                  zIndex: 9999,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  minWidth: '85px'
                }}
              >
                {['fit', '50%', '75%', '100%', '125%', '150%', '200%'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => {
                      setPreviewZoom(opt);
                      setShowZoomDropdown(false);
                    }}
                    style={{
                      padding: '5px 8px',
                      fontSize: '11px',
                      textAlign: 'left',
                      background: previewZoom === opt ? 'rgba(0, 216, 182, 0.15)' : 'transparent',
                      color: previewZoom === opt ? '#00d8b6' : '#e4e4e7',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: previewZoom === opt ? 700 : 400
                    }}
                    onMouseEnter={e => {
                      if (previewZoom !== opt) e.currentTarget.style.backgroundColor = '#27272a';
                    }}
                    onMouseLeave={e => {
                      if (previewZoom !== opt) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {opt === 'fit' ? 'Fit' : opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */

// Safe ipcRenderer accessor (works in Electron, no-op in browser)
function getIpcRenderer() {
  try {
    if (window.require) return window.require('electron').ipcRenderer;
  } catch (e) {}
  return null;
}

export default function VideoKaraoke({ onBack }) {
  // ── Step / Screen state
  const [screen, setScreen] = useState('editor'); // 'editor' | 'generating'
  const [generateStep, setGenerateStep] = useState(0);
  const [generateError, setGenerateError] = useState('');

  // ── Input state
  const [file, setFile] = useState(null);
  const [mediaBin, setMediaBin] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState('');
  const [font, setFont] = useState('System');
  const [textSize, setTextSize] = useState(24);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [fontSearch, setFontSearch] = useState('');
  const [artist, setArtist] = useState('');
  const [lyricsSource, setLyricsSource] = useState('auto'); // 'manual' | 'auto' | 'skip'
  const [manualLyrics, setManualLyrics] = useState('');
  const [language, setLanguage] = useState('auto');
  const [error, setError] = useState('');
  const [importStatus, setImportStatus] = useState(''); // feedback message

  // ── Audio playback
  const audioRef = useRef(null);
  const videoRef = useRef(null);       // KaraokePreview visual video (muted)
  const videoAudioRef = useRef(null);  // Hidden video element for MP4 audio playback
  const mediaInputRef = useRef(null);  // Fallback web file input
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [duration, setDuration] = useState(0);

  // Cleanup audio on unmount to prevent ghost audio during HMR
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);
  const rafRef = useRef(null);

  // ── Editor state
  const [editorTab, setEditorTab] = useState('media'); // 'media' | 'caption' | 'text' | 'effects' | 'audio'
  const [effectCategory, setEffectCategory] = useState('all');
  const [effectSearch, setEffectSearch] = useState('');
  const [hoveredEffectId, setHoveredEffectId] = useState(null);
  const [timelineZoom, setTimelineZoom] = useState(0); // Default to fully zoomed out or reasonable level
  const [aspectRatio, setAspectRatio] = useState('original');
  const [lines, setLines] = useState([]);
  const [selectedLineIdx, setSelectedLineIdx] = useState(null);
  const [selectedTrackItemId, setSelectedTrackItemId] = useState(null);
  const [propertiesTab, setPropertiesTab] = useState('Video');
  const [markers, setMarkers] = useState([]);
  const [activeBeatMode, setActiveBeatMode] = useState('None');
  const [showBeatMenu, setShowBeatMenu] = useState(false);
  const [showTransformMenu, setShowTransformMenu] = useState(false);
  const [showCropMenu, setShowCropMenu] = useState(false);
  const [previewZoom, setPreviewZoom] = useState('fit');
  const [isDetectingScenes, setIsDetectingScenes] = useState(false);

  // ── Timeline History state (Undo, Redo, Reset) ──
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isHistoryActionRef = useRef(false);

  useEffect(() => {
    const handleCloseMenus = () => {
      setShowBeatMenu(false);
      setShowTransformMenu(false);
      setShowCropMenu(false);
    };
    window.addEventListener('click', handleCloseMenus);
    return () => window.removeEventListener('click', handleCloseMenus);
  }, []);
  const [videoSubTab, setVideoSubTab] = useState('Basic');
  const [audioSubTab, setAudioSubTab] = useState('Basic');
  const [speedSubTab, setSpeedSubTab] = useState('Standard');
  const visualProcessingCount = 0;

  // ── Custom Colors & Text Stroke state
  const [baseTextColor, setBaseTextColor] = useState('#ffffff');
  const [baseStrokeColor, setBaseStrokeColor] = useState('#0000ff');
  const [activeTextColor, setActiveTextColor] = useState('#ff0000');
  const [activeStrokeColor, setActiveStrokeColor] = useState('#ffffff');

  // ── Resizable Panels State (Left, Right, Timeline)
  const [leftWidth, setLeftWidth] = useState(350);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const resizeStartXRef = useRef(0);
  const initialLeftWidthRef = useRef(350);

  const [rightWidth, setRightWidth] = useState(300);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const resizeRightStartXRef = useRef(0);
  const initialRightWidthRef = useRef(300);

  const startResizingLeft = (e) => {
    e.preventDefault();
    setIsResizingLeft(true);
    resizeStartXRef.current = e.clientX;
    initialLeftWidthRef.current = leftWidth;
  };

  useEffect(() => {
    if (!isResizingLeft) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - resizeStartXRef.current;
      const maxW = Math.max(150, window.innerWidth - (rightWidth || 300) - 150);
      const newWidth = Math.max(0, Math.min(maxW, initialLeftWidthRef.current + deltaX));
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, rightWidth]);

  // ── Resizable Timeline Panel State
  const [timelineHeight, setTimelineHeight] = useState(290);
  const [isResizingTimeline, setIsResizingTimeline] = useState(false);
  const resizeTimelineStartYRef = useRef(0);
  const initialTimelineHeightRef = useRef(290);

  const startResizingTimeline = (e) => {
    e.preventDefault();
    setIsResizingTimeline(true);
    resizeTimelineStartYRef.current = e.clientY;
    initialTimelineHeightRef.current = timelineHeight;
  };

  useEffect(() => {
    if (!isResizingTimeline) return;
    const handleMouseMove = (e) => {
      const deltaY = resizeTimelineStartYRef.current - e.clientY;
      const newHeight = Math.max(150, Math.min(window.innerHeight - 300, initialTimelineHeightRef.current + deltaY));
      setTimelineHeight(newHeight);
    };
    const handleMouseUp = () => setIsResizingTimeline(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingTimeline]);

  const startResizingRight = (e) => {
    e.preventDefault();
    setIsResizingRight(true);
    resizeRightStartXRef.current = e.clientX;
    initialRightWidthRef.current = rightWidth;
  };

  useEffect(() => {
    if (!isResizingRight) return;
    const handleMouseMove = (e) => {
      const deltaX = resizeRightStartXRef.current - e.clientX;
      const maxW = Math.max(200, window.innerWidth - (leftWidth || 300) - 150);
      const newWidth = Math.max(0, Math.min(maxW, initialRightWidthRef.current + deltaX));
      setRightWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizingRight(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingRight, leftWidth]);

  // ── Background Media state
  const [bgType, setBgType] = useState('preset'); // 'preset' | 'image' | 'video'
  const [bgImageUrl, setBgImageUrl] = useState(null);
  const [bgImageName, setBgImageName] = useState('');
  const [bgVideoUrl, setBgVideoUrl] = useState(null);
  const [hoveredMediaUrl, setHoveredMediaUrl] = useState(null);
  const [hoveredMediaName, setHoveredMediaName] = useState(null);
  const [hoveredMediaType, setHoveredMediaType] = useState(null);
  const [isHoverPlaying, setIsHoverPlaying] = useState(false);
  const [hoverCurrentTime, setHoverCurrentTime] = useState(0);
  const [hoverDuration, setHoverDuration] = useState(0);
  const [selectedMediaName, setSelectedMediaName] = useState(null);
  const [clipboardItem, setClipboardItem] = useState(null);
  const [mediaContextMenu, setMediaContextMenu] = useState(null);

  // Clear media bin selection & context menu when clicking outside
  useEffect(() => {
    const handleGlobalClick = (e) => {
      setMediaContextMenu(null);
      if (e.target.closest('#preview-container')) return;
      setSelectedMediaName(null);
      setIsHoverPlaying(false);
      setHoveredMediaUrl(null);
      setHoveredMediaName(null);
      setHoveredMediaType(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Stop hover playing on right click
  useEffect(() => {
    const handleContextMenu = (e) => {
      if (e.target.closest('#preview-container')) return;
      if (isHoverPlaying) {
        setIsHoverPlaying(false);
        setHoveredMediaUrl(null);
        setHoveredMediaName(null);
        setHoveredMediaType(null);
      }
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, [isHoverPlaying]);

  const [tracks, setTracks] = useState([]);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(null);

  // Auto-sync duration with the maximum end time of any track item or line
  useEffect(() => {
    let maxDur = 0;
    if (tracks && tracks.length > 0) {
      tracks.forEach(t => {
        if (t.items) {
          t.items.forEach(i => {
            if (i.end > maxDur) maxDur = i.end;
          });
        }
      });
    }
    if (lines && lines.length > 0) {
      lines.forEach(l => {
        if (l.end > maxDur) maxDur = l.end;
      });
    }
    if (maxDur > 0) {
      setDuration(maxDur);
    } else {
      setDuration(0);
    }
  }, [tracks, lines]);

  const hasVideoTrack = tracks.some(t => t.type === 'video' && t.items.length > 0);
  const hasImageTrack = tracks.some(t => t.type === 'image' && t.items.length > 0);
  
  const selectedTrack = useMemo(() => tracks.find(t => t.items.some(i => i.id === selectedTrackItemId)), [tracks, selectedTrackItemId]);
  const selectedItem = useMemo(() => selectedTrack?.items.find(i => i.id === selectedTrackItemId), [selectedTrack, selectedTrackItemId]);
  const itemTransform = selectedItem?.transform || { x: 0, y: 0, scale: 100 };

  useEffect(() => {
    if (selectedItem?.isEffect) {
      setPropertiesTab('Effect');
    } else {
      setPropertiesTab(prev => (prev === 'Effect' ? 'Video' : prev));
    }
  }, [selectedTrackItemId, selectedItem?.isEffect]);

  const handleItemTransform = useCallback((trackId, itemId, transform) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        items: t.items.map(item => {
          if (item.id !== itemId) return item;
          const oldTransform = item.transform || {x:0,y:0,scale:100};
          let newItem = { ...item };
          
          if (typeof transform.speed !== 'undefined' && !item.isEffect) {
              const oldSpeed = typeof oldTransform.speed !== 'undefined' ? oldTransform.speed : 1;
              const newSpeed = transform.speed;
              if (newSpeed !== oldSpeed && newSpeed > 0) {
                  const duration = item.end - item.start;
                  const newDuration = duration * (oldSpeed / newSpeed);
                  newItem.end = Number((item.start + newDuration).toFixed(3));
              }
          }
          
          return { ...newItem, transform: { ...oldTransform, ...transform } };
        })
      };
    }));
  }, []);

  const handleLineTransform = useCallback((lineIdx, transform) => {
    setLines(prev => prev.map((l, idx) => {
      if (idx === lineIdx) {
        return {
          ...l,
          x: transform.x !== undefined ? transform.x : (l.x || 0),
          y: transform.y !== undefined ? transform.y : (l.y || 0),
          fontSize: transform.fontSize !== undefined ? transform.fontSize : l.fontSize,
          scale: transform.scale !== undefined ? transform.scale : l.scale
        };
      }
      return l;
    }));
    if (transform.fontSize !== undefined) {
      setTextSize(transform.fontSize);
    }
  }, []);

  
  const isMediaSelected = selectedMediaName && hoveredMediaName === selectedMediaName;
  const actualHoveredMediaType = (isPlaying && !isMediaSelected) ? null : hoveredMediaType;
  const actualHoveredMediaUrl = (isPlaying && !isMediaSelected) ? null : hoveredMediaUrl;

  // Find active visual item across visual tracks based on currentTime (excluding effects)
  const activeTimelineVisualItem = useMemo(() => {
    for (const track of tracks) {
      if (track.hidden) continue;
      if (track.type === 'audio' || track.type === 'effect' || track.isEffectTrack) continue;
      for (const item of (track.items || [])) {
        if (item.isEffect) continue;
        if (currentTime >= item.start && currentTime <= item.end) {
          return {
            ...item,
            mediaType: getItemMediaType(item)
          };
        }
      }
    }
    return null;
  }, [tracks, currentTime]);

  const derivedBgType = actualHoveredMediaType || (activeTimelineVisualItem ? activeTimelineVisualItem.mediaType : (hasVideoTrack ? 'video' : hasImageTrack ? 'image' : 'preset'));
  const derivedBgVideoUrl = (actualHoveredMediaType === 'video' || actualHoveredMediaType === 'audio')
    ? actualHoveredMediaUrl
    : (activeTimelineVisualItem?.mediaType === 'video' ? activeTimelineVisualItem.url : (hasVideoTrack ? bgVideoUrl : null));
  const derivedBgImageUrl = actualHoveredMediaType === 'image'
    ? actualHoveredMediaUrl
    : (activeTimelineVisualItem?.mediaType === 'image' ? activeTimelineVisualItem.url : (hasImageTrack ? bgImageUrl : null));
  const [bgVideoName, setBgVideoName] = useState('');

  // Auto-cleanup ghost audio when tracks are completely removed from timeline
  useEffect(() => {
    const hasVideo = tracks.some(t => t.type === 'video' && t.items.length > 0);
    const hasAudio = tracks.some(t => t.type === 'audio' && t.items.length > 0);
    
    if (!hasVideo && videoAudioRef.current) {
      videoAudioRef.current.onerror = null;
      videoAudioRef.current.pause();
      videoAudioRef.current.src = '';
    }
    if (!hasAudio && audioRef.current) {
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, [tracks]);

  const [lyricsVersions, setLyricsVersions] = useState([
    { id: 1, name: 'Versi 1', baseTextColor: '#ffffff', baseStrokeColor: '#0000ff', activeTextColor: '#ff0000', activeStrokeColor: '#ffffff' },
    { id: 2, name: 'Versi 2', baseTextColor: '#ffffff', baseStrokeColor: '#0000ff', activeTextColor: '#ff0000', activeStrokeColor: '#ffffff' },
    { id: 3, name: 'Versi 3', baseTextColor: '#ffffff', baseStrokeColor: '#0000ff', activeTextColor: '#ff0000', activeStrokeColor: '#ffffff' },
    { id: 4, name: 'Versi 4', baseTextColor: '#ffffff', baseStrokeColor: '#0000ff', activeTextColor: '#ff0000', activeStrokeColor: '#ffffff' },
    { id: 5, name: 'Versi 5', baseTextColor: '#ffffff', baseStrokeColor: '#0000ff', activeTextColor: '#ff0000', activeStrokeColor: '#ffffff' },
  ]);
  const [activeVersion, setActiveVersion] = useState(1);
  const [useLyricsVersion, setUseLyricsVersion] = useState(true);
  const [standardTextColor, setStandardTextColor] = useState('#ffffff');
  const [standardStrokeColor, setStandardStrokeColor] = useState('#000000');

  const handleStandardTextColorChange = (val) => {
    setStandardTextColor(val);
    if (selectedLineIdx !== null) {
      setLines(prev => prev.map((l, idx) => idx === selectedLineIdx ? { ...l, color: val } : l));
    }
  };

  const handleStandardStrokeColorChange = (val) => {
    setStandardStrokeColor(val);
    if (selectedLineIdx !== null) {
      setLines(prev => prev.map((l, idx) => idx === selectedLineIdx ? { ...l, strokeColor: val } : l));
    }
  };

  const switchVersion = (newId) => {
    if (!useLyricsVersion) setUseLyricsVersion(true);
    if (newId === activeVersion) return;

    // Save current active version's color settings
    const updatedVersions = lyricsVersions.map(v =>
      v.id === activeVersion ? {
        ...v,
        baseTextColor,
        baseStrokeColor,
        activeTextColor,
        activeStrokeColor,
      } : v
    );

    setLyricsVersions(updatedVersions);
    setActiveVersion(newId);

    // Update active color pickers state for the newly selected version
    const targetV = updatedVersions.find(v => v.id === newId);
    setBaseTextColor(targetV?.baseTextColor || '#ffffff');
    setBaseStrokeColor(targetV?.baseStrokeColor || '#0000ff');
    setActiveTextColor(targetV?.activeTextColor || '#ff0000');
    setActiveStrokeColor(targetV?.activeStrokeColor || '#ffffff');
  };

  const updateCurrentVersionColor = (key, val) => {
    if (key === 'baseTextColor') setBaseTextColor(val);
    if (key === 'baseStrokeColor') setBaseStrokeColor(val);
    if (key === 'activeTextColor') setActiveTextColor(val);
    if (key === 'activeStrokeColor') setActiveStrokeColor(val);

    setLyricsVersions(prev => prev.map(v => v.id === activeVersion ? { ...v, [key]: val } : v));
  };

  const handleFontChange = (newFont) => {
    setFont(newFont);
    setShowFontDropdown(false);
    if (selectedLineIdx !== null) {
      setLines(prev => prev.map((l, idx) => idx === selectedLineIdx ? { ...l, font: newFont } : l));
    } else {
      setLines(prev => prev.map(l => ({ ...l, font: newFont })));
    }
  };

  const handleFontSizeChange = (newVal) => {
    const validSize = Math.max(10, Math.min(120, Number(newVal) || 24));
    setTextSize(validSize);
    if (selectedLineIdx !== null) {
      setLines(prev => prev.map((l, idx) => idx === selectedLineIdx ? { ...l, fontSize: validSize } : l));
    } else {
      setLines(prev => prev.map(l => ({ ...l, fontSize: validSize })));
    }
  };

  const handleLinePosChange = (newVal) => {
    const validX = Math.max(-500, Math.min(500, Number(newVal) || 0));
    if (selectedLineIdx !== null) {
      setLines(prev => prev.map((l, idx) => idx === selectedLineIdx ? { ...l, x: validX } : l));
    } else {
      setLines(prev => prev.map(l => ({ ...l, x: validX })));
    }
  };

  const handleApplyToAll = () => {
    const curX = (selectedLineIdx !== null && lines[selectedLineIdx]?.x !== undefined) ? lines[selectedLineIdx].x : 0;
    setLines(prev => prev.map(l => ({ ...l, font, fontSize: textSize, x: curX })));
  };

  const handleAddTextPreset = (presetText, size) => {
    const curTime = Number((currentTime || 0).toFixed(3));
    const newEnd = Number((curTime + 3).toFixed(3));
    const newLine = {
      id: 'text-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      text: presetText,
      start: curTime,
      end: newEnd,
      animDuration: 1.5,
      font: font,
      fontSize: size || textSize,
      x: 0,
      y: 0
    };
    setLines(prev => {
      // Setiap penambahan teks membuat kolam baru di atas teks yang sudah ada
      const nextLines = [newLine, ...prev];
      setSelectedLineIdx(0);
      setSelectedTrackItemId(null);
      return nextLines;
    });
  };

  const handleAddEffectToTimeline = (eff) => {
    if (eff.type === 'filter') {
      if (selectedTrackItemId) {
        const sTrack = tracks.find(t => t.items.some(i => i.id === selectedTrackItemId));
        if (sTrack) {
          handleItemTransform(sTrack.id, selectedTrackItemId, { filter: eff.filterValue });
        }
      } else {
        const firstVisualTrack = tracks.find(t => t.type === 'video' || t.type === 'image');
        if (firstVisualTrack && firstVisualTrack.items[0]) {
          handleItemTransform(firstVisualTrack.id, firstVisualTrack.items[0].id, { filter: eff.filterValue });
        }
      }
      return;
    }

    if (eff.type === 'motion') {
      if (selectedTrackItemId) {
        const sTrack = tracks.find(t => t.items.some(i => i.id === selectedTrackItemId));
        if (sTrack) {
          const curScale = (selectedTrackItem?.transform?.scale) || 100;
          const newScale = eff.action === 'zoomin' ? Math.min(250, curScale + 25) : Math.max(50, curScale - 25);
          handleItemTransform(sTrack.id, selectedTrackItemId, { scale: newScale });
        }
      }
      return;
    }

    // Video overlay effect
    let filePath = null;
    if (window.require) {
      try {
        const path = window.require('path');
        filePath = path.join(window.process.cwd(), 'assets', 'Effects', eff.folder, eff.file);
      } catch (e) {}
    }
    const url = `/assets/Effects/${eff.folder}/${eff.file}`;
    const itemId = 'item-eff-' + Date.now();
    const trackId = 'track-eff-' + Date.now();

    const startPos = Number((currentTime || 0).toFixed(3));
    const dur = 8;
    const endPos = Number((startPos + dur).toFixed(3));

    const pseudoFile = {
      name: eff.name,
      path: filePath || url,
      _filePath: filePath || url,
      _fileUrl: url,
      type: 'video/mp4'
    };

    const newItem = {
      id: itemId,
      start: startPos,
      end: endPos,
      sourceDuration: dur,
      file: pseudoFile,
      url: url,
      filePath: filePath,
      name: eff.name,
      folder: eff.folder,
      category: eff.category,
      isEffect: true,
      transform: {
        x: 0,
        y: 0,
        scale: 100,
        rotate: 0,
        opacity: 100,
        speed: 1,
        blendMode: eff.blendMode || 'screen',
      }
    };

    setTracks(prev => {
      const newTrack = {
        id: trackId,
        type: 'effect',
        name: eff.name || 'Effects',
        isEffectTrack: true,
        items: [newItem]
      };
      // Always create a new track (kolom) for each added effect!
      // Find the last existing effect track if any, to stack the new effect track neatly with other effect tracks
      const lastEffectIdx = prev.map((t, idx) => (t.type === 'effect' || t.isEffectTrack) ? idx : -1).filter(idx => idx !== -1).pop();
      if (lastEffectIdx !== undefined) {
        const updated = [...prev];
        updated.splice(lastEffectIdx + 1, 0, newTrack);
        return updated;
      }
      // If no effect track yet, place directly above the first non-effect visual track (or at index 0)
      const firstNonEffectVisualIdx = prev.findIndex(t => !t.isEffectTrack && t.type !== 'effect' && (t.type === 'video' || t.type === 'image'));
      if (firstNonEffectVisualIdx !== -1) {
        const updated = [...prev];
        updated.splice(firstNonEffectVisualIdx, 0, newTrack);
        return updated;
      }
      const firstAudioIdx = prev.findIndex(t => t.type === 'audio');
      if (firstAudioIdx !== -1) {
        const updated = [...prev];
        updated.splice(firstAudioIdx, 0, newTrack);
        return updated;
      }
      return [newTrack, ...prev];
    });

    setDuration(prev => Math.max(prev, endPos));
    setSelectedTrackItemId(itemId);
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

  // ── Export Modal & State
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportTimeText, setExportTimeText] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTimelineName, setExportTimelineName] = useState('Timeline 01');
  const [exportName, setExportName] = useState('');
  const [exportDir, setExportDir] = useState(() => {
    try {
      if (window.require) {
        const os = window.require('os');
        const path = window.require('path');
        const fs = window.require('fs');
        const homedir = os.homedir();
        const vDir = path.join(homedir, 'Videos');
        if (fs.existsSync(vDir)) return vDir.replace(/\\/g, '/');
        const dDir = path.join(homedir, 'Downloads');
        if (fs.existsSync(dDir)) return dDir.replace(/\\/g, '/');
        return homedir.replace(/\\/g, '/');
      }
    } catch(e) {}
    return 'C:/Users/SERVERAO/Videos';
  });
  const [exportVideo, setExportVideo] = useState(true);
  const [exportAudio, setExportAudio] = useState(false);
  const [exportStatus, setExportStatus] = useState('idle'); // 'idle' | 'exporting' | 'completed' | 'error'
  const [exportResultPath, setExportResultPath] = useState('');
  const [exportErrorMsg, setExportErrorMsg] = useState('');

  useEffect(() => {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.invoke('get-default-export-dir').then(dir => {
          if (dir) setExportDir(dir.replace(/\\/g, '/'));
        });
      } catch (e) {}
    }
  }, []);

  // ── Audio/Video time update loop (Master Clock)
  useEffect(() => {
    let lastTime = null;
    const updateTime = (time) => {
      if (lastTime === null) {
        lastTime = time;
      }
      if (isPlaying) {
        const delta = Math.min((time - lastTime) / 1000, 0.1); // Cap delta at 100ms to prevent huge jumps
        const allItems = tracks.flatMap(t => t.items || []);
        const maxEnd = allItems.length > 0 ? Math.max(...allItems.map(i => i.end || 0)) : duration;

        setCurrentTime(prev => {
          let next = prev + delta;
          if (maxEnd > 0 && next >= maxEnd) {
            if (isLooping) return next % maxEnd || 0;
            setIsPlaying(false);
            return maxEnd;
          }
          return next;
        });
      }
      lastTime = time;
      rafRef.current = requestAnimationFrame(updateTime);
    };
    rafRef.current = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, duration, isLooping, tracks]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.loop = isLooping;
    if (videoAudioRef.current) videoAudioRef.current.loop = isLooping;
    if (videoRef.current) videoRef.current.loop = isLooping;
  }, [isLooping]);

  const addToTimeline = (f) => {
    const target = f || file;
    if (!target) return;

    // Use existing file:// URL if available (from IPC native dialog), otherwise create blob
    const url = target._fileUrl || URL.createObjectURL(target);
    const type = isVideoFile(target) ? 'video' : isImageFile(target) ? 'image' : 'audio';

    const trackId = 'track-' + Date.now();
    const itemId = 'item-' + Date.now();

    // Auto-select the item in timeline, deselect in media bin
    stopMediaBinPreview();
    setSelectedMediaName(null);
    setSelectedTrackItemId(itemId);

    // MULTI-TRACK (Kolam) logic:
    // 1. First video/image goes into the main visual track (posisi di tengah bersama Cover).
    // 2. Subsequent videos/images stack ABOVE existing visual tracks (menambah dari atas).
    // 3. Audio (MP3) always placed at the bottom below all visual tracks (di bawah kolam video/gambar).
    setTracks(prev => {
      const isVisual = type === 'video' || type === 'image';
      const visualTrackIndices = prev
        .map((t, idx) => (!t.isEffectTrack && t.type !== 'effect' && (t.type === 'video' || t.type === 'image')) ? idx : -1)
        .filter(idx => idx !== -1);

      if (isVisual) {
        const defaultDur = isImageFile(target) ? 5 : 10;
        const newItem = {
          id: itemId,
          start: 0,
          end: defaultDur,
          file: target,
          url: url,
          name: target.name
        };

        if (visualTrackIndices.length === 0) {
          // First visual track: placed in main position (before any audio tracks)
          const newTrack = {
            id: trackId,
            type: type,
            isMainMedia: true,
            items: [newItem]
          };
          const firstAudioIdx = prev.findIndex(t => t.type === 'audio');
          if (firstAudioIdx === -1) {
            return [...prev, newTrack];
          } else {
            const next = [...prev];
            next.splice(firstAudioIdx, 0, newTrack);
            return next;
          }
        } else {
          // Additional video/image: stack ABOVE existing visual tracks!
          // "contoh video satu posisi di tenggah maka video dua diatas video satu unda itu menambah photo maka di atas video dua mereka bisa"
          const topVisualIdx = visualTrackIndices[0];
          const newTrack = {
            id: trackId,
            type: type,
            items: [newItem]
          };
          const next = [...prev];
          next.splice(topVisualIdx, 0, newTrack);
          return next;
        }
      } else {
        // Audio (MP3): always at the bottom (di bawah kolam video/gambar) with Music icon
        const defaultDur = 10;
        const newItem = {
          id: itemId,
          start: 0,
          end: defaultDur,
          file: target,
          url: url,
          name: target.name
        };
        const newTrack = {
          id: trackId,
          type: 'audio',
          items: [newItem]
        };
        return [...prev, newTrack];
      }
    });
    
    // BACKWARD COMPATIBILITY for Preview engine
    if (isVideoFile(target)) {
      setBgType('video');
      setBgVideoUrl(url);
      setBgVideoName(target.name);
      setFile(target);
      setAudioUrl(url);

      // Use hidden <video> element for audio playback from MP4
      const setupVideo = () => {
        const vid = videoAudioRef.current;
        if (!vid) return;
        vid.src = url;
        vid.load();
        const updateDur = () => {
          if (isFinite(vid.duration) && !isNaN(vid.duration) && vid.duration > 0) {
            const realDur = vid.duration;
            setTracks(prevTracks => {
              const next = prevTracks.map(t => ({
                ...t,
                items: t.items.map(item => {
                  if (item.id === itemId) {
                    return { ...item, end: Number((item.start + realDur).toFixed(3)), sourceDuration: realDur };
                  }
                  return item;
                })
              }));
              const allItems = next.flatMap(t => t.items || []);
              const newMax = allItems.length > 0 ? Math.max(...allItems.map(i => i.end || 0)) : 10;
              setDuration(prev => Math.max(prev, newMax));
              return next;
            });
          }
        };
        vid.onloadedmetadata = updateDur;
        vid.ondurationchange = updateDur;
        vid.loop = isLooping;
        vid.onerror = (e) => {
          console.error('Video load error:', vid.src, e, vid.error);
          if (vid.error && vid.error.code === 4) { // MEDIA_ERR_SRC_NOT_SUPPORTED
            setError('Codec Video tidak didukung oleh browser/Electron (kemungkinan H.265/HEVC). Harap convert ke H.264.');
            alert('Gagal memuat video: Codec tidak didukung (H.265/HEVC). Silakan convert video Anda ke format H.264 terlebih dahulu.');
            removeFromTimeline();
          }
        };
      };

      if (videoAudioRef.current) {
        setupVideo();
      } else {
        setTimeout(setupVideo, 50);
      }

    } else if (isImageFile(target)) {
      setBgType('image');
      setBgImageUrl(url);
      setBgImageName(target.name);
      setTracks(prevTracks => {
        const allItems = prevTracks.flatMap(t => t.items || []);
        const newMax = allItems.length > 0 ? Math.max(...allItems.map(i => i.end || 0)) : 10;
        setDuration(prev => Math.max(prev, newMax));
        return prevTracks;
      });
    } else {
      // Audio file
      // Hanya ganti file utama jika sebelumnya kosong, agar tidak menimpa file video yang sudah ada
      if (!file) {
        setFile(target);
      }
      setAudioUrl(url);
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = url;

      const applyAudioDur = (dur) => {
        if (isFinite(dur) && !isNaN(dur) && dur > 0) {
          setTracks(prevTracks => {
            const next = prevTracks.map(t => ({
              ...t,
              items: t.items.map(item => {
                if (item.id === itemId) {
                  return { ...item, end: Number((item.start + dur).toFixed(3)), sourceDuration: dur };
                }
                return item;
              })
            }));
            const allItems = next.flatMap(t => t.items || []);
            const newMax = allItems.length > 0 ? Math.max(...allItems.map(i => i.end || 0)) : 10;
            setDuration(prev => Math.max(prev, newMax));
            return next;
          });
        }
      };

      const updateDur = () => {
        const dur = audioRef.current.duration;
        applyAudioDur(dur);
      };
      audioRef.current.onloadedmetadata = updateDur;
      audioRef.current.ondurationchange = updateDur;
      audioRef.current.loop = isLooping;

      // Garansi mendapatkan durasi akurat (Penting untuk file MP3 blob di Chromium yang durasinya sering Infinity)
      const getExactDuration = async () => {
        try {
          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
          }
          const ctx = audioContextRef.current;
          if (!ctx) return;
          const ab = await target.arrayBuffer();
          const abDecoded = await ctx.decodeAudioData(ab);
          const dur = abDecoded.duration;
          applyAudioDur(dur);
        } catch (e) {
          console.error('Failed to get precise audio duration', e);
        }
      };
      getExactDuration();
    }
  };

  const removeFromTimeline = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setAudioUrl(null);
    setDuration(0);
    setCurrentTime(0);
  };

  const handleRemoveTrack = (trackId, type) => {
    setTracks(prev => prev.filter(t => t.id !== trackId));
    if (type === 'audio') {
      removeFromTimeline();
    } else if (type === 'video' || type === 'image') {
      setBgType('preset');
      setBgImageUrl(null);
      setBgVideoUrl(null);
      setBgImageName('');
      setBgVideoName('');
      removeFromTimeline();
      if (videoAudioRef.current) {
         videoAudioRef.current.onerror = null;
         videoAudioRef.current.pause();
         videoAudioRef.current.removeAttribute('src');
      }
    }
  };

  const removeFromMedia = (f) => {
    const target = f || file;
    if (file && target && file.name === target.name) {
      removeFromTimeline();
      setFile(null);
    }
    if (bgVideoName === target.name || bgImageName === target.name) {
      setBgType('preset');
      setBgVideoUrl(null);
      setBgImageUrl(null);
    }
    setMediaBin(prev => prev.filter(item => (item.file || item) !== target && (item.file || item).name !== target.name));
    setTracks(prev => prev.map(t => ({ ...t, items: t.items.filter(i => i.file.name !== target.name) })).filter(t => t.items.length > 0));
  };

  // ── Keyboard Shortcuts for Media Bin (Delete, Ctrl+C) ──
  useEffect(() => {
    const handleMediaKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.isContentEditable
      );
      if (isInput) return;

      if (!selectedMediaName) return;

      const targetItem = mediaBin.find(m => (m.file || m).name === selectedMediaName);
      if (!targetItem) return;
      const targetFile = targetItem.file || targetItem;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        removeFromMedia(targetFile);
        setSelectedMediaName(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        const type = isVideoFile(targetFile) ? 'video' : isImageFile(targetFile) ? 'image' : 'audio';
        const url = targetFile._fileUrl || URL.createObjectURL(targetFile);
        setClipboardItem({
          type,
          data: {
            file: targetFile,
            url,
            name: targetFile.name,
            start: 0,
            end: isImageFile(targetFile) ? 5 : 10
          }
        });
      }
    };
    window.addEventListener('keydown', handleMediaKeyDown);
    return () => window.removeEventListener('keydown', handleMediaKeyDown);
  }, [selectedMediaName, mediaBin]);

  // Helper to stop media bin preview whenever timeline is interacted with
  const stopMediaBinPreview = useCallback(() => {
    setIsHoverPlaying(false);
    setHoveredMediaUrl(null);
    setHoveredMediaName(null);
    setHoveredMediaType(null);
    setSelectedMediaName(null);
    if (videoRef.current && !isPlaying) {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Sync isHoverPlaying to the videoRef with audible sound
  useEffect(() => {
    let animationFrameId;
    if (videoRef.current && actualHoveredMediaUrl && (hoveredMediaType === 'video' || hoveredMediaType === 'audio')) {
       const vid = videoRef.current;
       if (isHoverPlaying) {
          vid.muted = false;
          vid.volume = 1;
          vid.play().catch(()=>{});
          const updateTime = () => {
            if (videoRef.current) {
              setHoverCurrentTime(videoRef.current.currentTime);
              if (videoRef.current.duration !== hoverDuration && !isNaN(videoRef.current.duration)) {
                setHoverDuration(videoRef.current.duration);
              }
            }
            animationFrameId = requestAnimationFrame(updateTime);
          };
          updateTime();
       } else {
          vid.pause();
       }
    }
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isHoverPlaying, actualHoveredMediaUrl, hoveredMediaType, hoverDuration]);

  // Sync timeline isPlaying and currentTime to videoRef (both video visual and video audio)
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || actualHoveredMediaUrl) return;

    if (activeTimelineVisualItem && activeTimelineVisualItem.mediaType === 'video') {
      const clipTime = Math.max(0, (currentTime - activeTimelineVisualItem.start) + (activeTimelineVisualItem.sourceStart || 0));
      if (vid.src !== activeTimelineVisualItem.url && activeTimelineVisualItem.url) {
        vid.src = activeTimelineVisualItem.url;
      }
      // Check if video audio track is muted
      const isVideoTrackMuted = tracks.some(t => t.type === 'video' && t.mutedAudio);
      if (isPlaying) {
        vid.muted = Boolean(isVideoTrackMuted);
        if (Math.abs(vid.currentTime - clipTime) > 0.15) {
          vid.currentTime = clipTime;
        }
        vid.play().catch(e => console.warn('Video timeline play error:', e));
      } else {
        vid.pause();
        if (Math.abs(vid.currentTime - clipTime) > 0.05) {
          vid.currentTime = clipTime;
        }
      }
    } else {
      if (!vid.paused) vid.pause();
    }
  }, [isPlaying, actualHoveredMediaUrl, activeTimelineVisualItem, currentTime]);

  // Sync scrubbing or jumps to videoRef when timeline is active
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || actualHoveredMediaUrl) return;
    if (activeTimelineVisualItem && activeTimelineVisualItem.mediaType === 'video') {
      const clipTime = Math.max(0, (currentTime - activeTimelineVisualItem.start) + (activeTimelineVisualItem.sourceStart || 0));
      if (Math.abs(vid.currentTime - clipTime) > 0.25) {
        vid.currentTime = clipTime;
      }
    }
  }, [currentTime, actualHoveredMediaUrl, activeTimelineVisualItem]);

  // Deselect active text when clicking anywhere outside text line & text inspector
  useEffect(() => {
    const handleGlobalDeselectText = (e) => {
      if (selectedLineIdx === null) return;
      if (e.target.closest('[data-text-line="true"]')) return;
      if (e.target.closest('[data-timeline-line="true"]')) return;
      if (e.target.closest('#text-properties-panel')) return;
      if (isResizingLeft || isResizingRight || isResizingTimeline) return;
      setSelectedLineIdx(null);
    };
    window.addEventListener('mousedown', handleGlobalDeselectText);
    return () => window.removeEventListener('mousedown', handleGlobalDeselectText);
  }, [selectedLineIdx, isResizingLeft, isResizingRight, isResizingTimeline]);

  const togglePlay = useCallback(() => {
    if (visualProcessingCount > 0) return; // Prevent playback while processing visual
    
    if (actualHoveredMediaUrl) {
      setIsHoverPlaying(!isHoverPlaying);
      return;
    }

    if (!isPlaying && currentTime >= duration && duration > 0) {
      setCurrentTime(0);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, isHoverPlaying, actualHoveredMediaUrl, visualProcessingCount, currentTime, duration]);

  // ── Selected Track Item Helper ──
  const selectedTrackItem = useMemo(() => {
    if (!selectedTrackItemId) return null;
    for (const t of tracks) {
      const it = (t.items || []).find(i => i.id === selectedTrackItemId);
      if (it) return { ...it, trackType: t.type };
    }
    return null;
  }, [selectedTrackItemId, tracks]);

  // ── History Stack Helpers (Undo, Redo, Reset) ──
  const pushHistory = useCallback((curTracks, curLines, curMarkers) => {
    if (isHistoryActionRef.current) {
      isHistoryActionRef.current = false;
      return;
    }
    const snapshot = {
      tracks: JSON.parse(JSON.stringify(curTracks)),
      lines: JSON.parse(JSON.stringify(curLines)),
      markers: JSON.parse(JSON.stringify(curMarkers || []))
    };
    setHistory(prev => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(snapshot);
      if (next.length > 30) next.shift();
      return next;
    });
    setHistoryIndex(prev => Math.min(29, prev + 1));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const targetIdx = historyIndex - 1;
    const snap = history[targetIdx];
    if (!snap) return;
    isHistoryActionRef.current = true;
    setTracks(snap.tracks);
    setLines(snap.lines);
    setMarkers(snap.markers || []);
    setHistoryIndex(targetIdx);
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const targetIdx = historyIndex + 1;
    const snap = history[targetIdx];
    if (!snap) return;
    isHistoryActionRef.current = true;
    setTracks(snap.tracks);
    setLines(snap.lines);
    setMarkers(snap.markers || []);
    setHistoryIndex(targetIdx);
  }, [history, historyIndex]);

  const handleReset = useCallback(() => {
    if (history.length === 0) return;
    const snap = history[0];
    if (!snap) return;
    isHistoryActionRef.current = true;
    setTracks(snap.tracks);
    setLines(snap.lines);
    setMarkers(snap.markers || []);
    setHistoryIndex(0);
  }, [history]);

  useEffect(() => {
    if (history.length === 0 && (tracks.length > 0 || lines.length > 0)) {
      setHistory([{
        tracks: JSON.parse(JSON.stringify(tracks)),
        lines: JSON.parse(JSON.stringify(lines)),
        markers: JSON.parse(JSON.stringify(markers || []))
      }]);
      setHistoryIndex(0);
    }
  }, [tracks, lines, markers, history.length]);

  // ── Universal Split ][ (Ctrl+B) ──
  const canSplitUniversal = Boolean(
    (selectedTrackItem && currentTime > selectedTrackItem.start + 0.05 && currentTime < selectedTrackItem.end - 0.05) ||
    (selectedLineIdx !== null && lines[selectedLineIdx] && currentTime > lines[selectedLineIdx].start + 0.05 && currentTime < lines[selectedLineIdx].end - 0.05) ||
    (!selectedTrackItemId && selectedLineIdx === null && tracks.some(t => (t.items || []).some(it => currentTime > it.start + 0.05 && currentTime < it.end - 0.05)))
  );

  const handleSplitUniversal = useCallback(() => {
    pushHistory(tracks, lines, markers);

    if (selectedTrackItemId) {
      setTracks(prev => prev.map(t => {
        const idx = t.items.findIndex(it => it.id === selectedTrackItemId);
        if (idx === -1) return t;
        const item = t.items[idx];
        if (currentTime <= item.start + 0.05 || currentTime >= item.end - 0.05) return t;

        const splitTime = Number(currentTime.toFixed(3));
        const splitOffset = splitTime - item.start;
        const item1 = { ...item, end: splitTime };
        const item2 = {
          ...item,
          id: `${item.id}-split-${Date.now()}`,
          start: splitTime,
          end: item.end,
          sourceStart: Number(((item.sourceStart || 0) + splitOffset).toFixed(3))
        };
        const newItems = [...t.items];
        newItems.splice(idx, 1, item1, item2);
        return { ...t, items: newItems };
      }));
    } else if (selectedLineIdx !== null && lines[selectedLineIdx]) {
      setLines(prev => {
        const l = prev[selectedLineIdx];
        if (!l || currentTime <= l.start + 0.05 || currentTime >= l.end - 0.05) return prev;
        const splitTime = Number(currentTime.toFixed(3));
        const l1 = { ...l, end: splitTime };
        const l2 = { ...l, start: splitTime };
        const updated = [...prev];
        updated.splice(selectedLineIdx, 1, l1, l2);
        return updated;
      });
    } else {
      // Split all items intersecting currentTime
      setTracks(prev => prev.map(t => {
        const newItems = [];
        t.items.forEach(item => {
          if (currentTime > item.start + 0.05 && currentTime < item.end - 0.05) {
            const splitTime = Number(currentTime.toFixed(3));
            const splitOffset = splitTime - item.start;
            newItems.push({ ...item, end: splitTime });
            newItems.push({
              ...item,
              id: `${item.id}-split-${Date.now()}`,
              start: splitTime,
              end: item.end,
              sourceStart: Number(((item.sourceStart || 0) + splitOffset).toFixed(3))
            });
          } else {
            newItems.push(item);
          }
        });
        return { ...t, items: newItems };
      }));
    }
  }, [selectedTrackItemId, selectedLineIdx, currentTime, tracks, lines, markers, pushHistory]);

  // ── Universal Delete Left [ (Ctrl+Q) ──
  const canDeleteLeft = Boolean(
    (selectedTrackItem && currentTime > selectedTrackItem.start && currentTime < selectedTrackItem.end) ||
    (selectedLineIdx !== null && lines[selectedLineIdx] && currentTime > lines[selectedLineIdx].start && currentTime < lines[selectedLineIdx].end) ||
    (!selectedTrackItemId && selectedLineIdx === null && tracks.some(t => (t.items || []).some(it => currentTime > it.start && currentTime < it.end)))
  );

  const handleDeleteLeft = useCallback(() => {
    pushHistory(tracks, lines, markers);

    if (selectedTrackItemId) {
      setTracks(prev => prev.map(t => ({
        ...t,
        items: t.items.map(it => {
          if (it.id !== selectedTrackItemId) return it;
          if (currentTime > it.start && currentTime < it.end) {
            const cutDur = currentTime - it.start;
            return {
              ...it,
              start: Number(currentTime.toFixed(3)),
              sourceStart: Number(((it.sourceStart || 0) + cutDur).toFixed(3))
            };
          }
          return it;
        })
      })));
    } else if (selectedLineIdx !== null && lines[selectedLineIdx]) {
      setLines(prev => prev.map((l, idx) => {
        if (idx !== selectedLineIdx) return l;
        if (currentTime > l.start && currentTime < l.end) {
          return { ...l, start: Number(currentTime.toFixed(3)) };
        }
        return l;
      }));
    } else {
      setTracks(prev => prev.map(t => ({
        ...t,
        items: t.items.map(it => {
          if (currentTime > it.start && currentTime < it.end) {
            const cutDur = currentTime - it.start;
            return {
              ...it,
              start: Number(currentTime.toFixed(3)),
              sourceStart: Number(((it.sourceStart || 0) + cutDur).toFixed(3))
            };
          }
          return it;
        })
      })));
    }
  }, [selectedTrackItemId, selectedLineIdx, currentTime, tracks, lines, markers, pushHistory]);

  // ── Universal Delete Right ] (Ctrl+W) ──
  const canDeleteRight = Boolean(
    (selectedTrackItem && currentTime > selectedTrackItem.start && currentTime < selectedTrackItem.end) ||
    (selectedLineIdx !== null && lines[selectedLineIdx] && currentTime > lines[selectedLineIdx].start && currentTime < lines[selectedLineIdx].end) ||
    (!selectedTrackItemId && selectedLineIdx === null && tracks.some(t => (t.items || []).some(it => currentTime > it.start && currentTime < it.end)))
  );

  const handleDeleteRight = useCallback(() => {
    pushHistory(tracks, lines, markers);

    if (selectedTrackItemId) {
      setTracks(prev => prev.map(t => ({
        ...t,
        items: t.items.map(it => {
          if (it.id !== selectedTrackItemId) return it;
          if (currentTime > it.start && currentTime < it.end) {
            return {
              ...it,
              end: Number(currentTime.toFixed(3))
            };
          }
          return it;
        })
      })));
    } else if (selectedLineIdx !== null && lines[selectedLineIdx]) {
      setLines(prev => prev.map((l, idx) => {
        if (idx !== selectedLineIdx) return l;
        if (currentTime > l.start && currentTime < l.end) {
          return { ...l, end: Number(currentTime.toFixed(3)) };
        }
        return l;
      }));
    } else {
      setTracks(prev => prev.map(t => ({
        ...t,
        items: t.items.map(it => {
          if (currentTime > it.start && currentTime < it.end) {
            return {
              ...it,
              end: Number(currentTime.toFixed(3))
            };
          }
          return it;
        })
      })));
    }
  }, [selectedTrackItemId, selectedLineIdx, currentTime, tracks, lines, markers, pushHistory]);

  // ── Add Marker (M) ──
  const handleAddMarker = useCallback(() => {
    const t = Number((currentTime || 0).toFixed(2));
    const exists = markers.some(m => Math.abs(m.time - t) < 0.08);
    if (exists) return;
    const newMarker = {
      id: 'm-' + Date.now(),
      time: t,
      label: `M ${t}s`,
      color: '#38bdf8',
      type: 'manual'
    };
    setMarkers(prev => [...prev, newMarker].sort((a, b) => a.time - b.time));
  }, [currentTime, markers]);

  // ── Auto Mark Beats (None, Beats 1, Beats 2) ──
  const handleApplyBeatMarkers = useCallback((mode) => {
    if (!selectedTrackItem) return;
    setActiveBeatMode(mode);
    setShowBeatMenu(false);
    pushHistory(tracks, lines, markers);

    if (mode === 'None') {
      setMarkers(prev => prev.filter(m => m.type !== 'beat1' && m.type !== 'beat2'));
      return;
    }

    const start = selectedTrackItem.start;
    const end = selectedTrackItem.end;
    const interval = mode === 'Beats 1' ? 0.8 : 0.4;
    const color = mode === 'Beats 1' ? '#eab308' : '#f97316';
    const type = mode === 'Beats 1' ? 'beat1' : 'beat2';

    const newBeats = [];
    let cur = start;
    let count = 1;
    while (cur <= end) {
      newBeats.push({
        id: `beat-${mode}-${count}-${Date.now()}`,
        time: Number(cur.toFixed(3)),
        label: `${mode} #${count}`,
        color,
        type
      });
      cur += interval;
      count++;
    }

    setMarkers(prev => {
      const filtered = prev.filter(m => m.type !== 'beat1' && m.type !== 'beat2');
      return [...filtered, ...newBeats].sort((a, b) => a.time - b.time);
    });
  }, [selectedTrackItem, tracks, lines, markers, pushHistory]);

  // ── Native Direct FFmpeg Scene Transition Detection (Renderer-Safe) ──
  const detectScenesDirectlyWithFFmpeg = (filePath, start = 0, duration = 10, threshold = 0.10) => {
    return new Promise((resolve) => {
      try {
        if (!window.require) return resolve([]);
        const { spawn } = window.require('child_process');
        let ffmpegStatic = null;
        try {
          ffmpegStatic = window.require('ffmpeg-static');
        } catch (e) {
          try {
            const path = window.require('path');
            ffmpegStatic = path.join(window.process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
          } catch (e2) {}
        }
        if (!ffmpegStatic) return resolve([]);

        const safeStart = Math.max(0, Number(start) || 0);
        const safeDur = Math.max(0.5, Number(duration) || 10);

        const runDetection = (thresh) => new Promise((res) => {
          const p = spawn(ffmpegStatic, [
            '-ss', String(safeStart.toFixed(3)),
            '-t', String(safeDur.toFixed(3)),
            '-i', filePath,
            '-vf', `scale=320:-2:flags=fast_bilinear,select='gt(scene\\,${thresh})',showinfo`,
            '-f', 'null',
            '-'
          ]);

          let stderrData = '';
          p.stderr.on('data', chunk => { stderrData += chunk.toString(); });
          p.on('error', (err) => {
            console.warn('[Direct FFmpeg Spawn Error]', err);
            res([]);
          });
          p.on('close', () => {
            const timestamps = [];
            const regex = /pts_time:([0-9.]+)/g;
            let match;
            while ((match = regex.exec(stderrData)) !== null) {
              const rawTime = parseFloat(match[1]);
              const relTime = (rawTime >= safeStart && safeStart > 0) ? (rawTime - safeStart) : rawTime;
              if (!isNaN(relTime) && relTime > 0.25 && relTime < safeDur - 0.25) {
                if (timestamps.length === 0 || (relTime - timestamps[timestamps.length - 1]) >= 0.4) {
                  timestamps.push(Number(relTime.toFixed(3)));
                }
              }
            }
            res(timestamps);
          });

          // 45s timeout per pass
          setTimeout(() => {
            try { p.kill(); } catch (e) {}
            res([]);
          }, 45000);
        });

        runDetection(threshold).then(async cuts => {
          if ((!cuts || cuts.length === 0) && safeDur >= 3.0) {
            cuts = await runDetection(0.07);
          }
          resolve(cuts || []);
        }).catch(() => resolve([]));
      } catch (e) {
        console.warn('[Direct FFmpeg exception]', e);
        resolve([]);
      }
    });
  };

  // ── HTML5 Canvas Scene Transition Detection (Fallback) ──
  const detectScenesViaCanvas = (videoUrl, startSec = 0, duration = 10, threshold = 0.08) => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';

        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 18;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const cuts = [];
        let prevData = null;
        let sampleIdx = 0;
        let sampleTimes = [];
        let isFinished = false;

        const finish = () => {
          if (isFinished) return;
          isFinished = true;
          video.removeEventListener('seeked', onSeeked);
          video.removeEventListener('error', onError);
          video.src = '';
          video.remove();
          canvas.remove();
          resolve(cuts);
        };

        const onError = () => finish();

        const onSeeked = () => {
          if (isFinished) return;
          try {
            ctx.drawImage(video, 0, 0, 32, 18);
            const img = ctx.getImageData(0, 0, 32, 18).data;
            if (prevData) {
              let diff = 0;
              const total = 32 * 18;
              for (let i = 0; i < img.length; i += 4) {
                diff += Math.abs(img[i] - prevData[i]) +
                        Math.abs(img[i + 1] - prevData[i + 1]) +
                        Math.abs(img[i + 2] - prevData[i + 2]);
              }
              const normalized = diff / (total * 3 * 255);
              const curT = sampleTimes[sampleIdx];
              if (normalized > threshold && curT > 0.25) {
                if (cuts.length === 0 || (curT - cuts[cuts.length - 1]) >= 0.4) {
                  cuts.push(curT);
                }
              }
            }
            prevData = new Uint8Array(img);
          } catch (e) {
            // ignore draw error
          }

          sampleIdx++;
          if (sampleIdx < sampleTimes.length) {
            video.currentTime = startSec + sampleTimes[sampleIdx];
          } else {
            finish();
          }
        };

        video.addEventListener('seeked', onSeeked);
        video.addEventListener('error', onError);
        video.addEventListener('loadedmetadata', () => {
          const vidDur = (video.duration && !isNaN(video.duration) && video.duration > 0) ? video.duration : duration;
          const effectiveDur = Math.min(duration, Math.max(0.5, vidDur - startSec));
          const step = effectiveDur > 60 ? 0.3 : 0.15;
          for (let t = 0; t <= effectiveDur; t += step) {
            sampleTimes.push(Number(t.toFixed(2)));
          }
          video.currentTime = startSec + (sampleTimes[0] || 0);
        });

        // 30s timeout
        setTimeout(() => finish(), 30000);

        video.src = videoUrl;
      } catch (e) {
        resolve([]);
      }
    });
  };

  // ── Video Split Scenes (Setiap Transisi Video) ──
  const handleSplitScenes = useCallback(async () => {
    if (!selectedTrackItem || (selectedTrackItem.trackType !== 'video' && !isVideoFile(selectedTrackItem.file))) return;

    const dur = selectedTrackItem.end - selectedTrackItem.start;
    if (dur < 1.0) {
      alert('Durasi klip video terlalu pendek untuk dipotong transisi scene.');
      return;
    }

    setIsDetectingScenes(true);

    try {
      let cutOffsets = [];
      const file = selectedTrackItem.file;
      let actualPath = null;

      // 1. Resolve file path from all available properties
      if (file) {
        actualPath = file.path || file._filePath;
        if (!actualPath && window.require) {
          try {
            actualPath = window.require('electron').webUtils?.getPathForFile(file);
          } catch (e) {}
        }
      }

      if (!actualPath) {
        actualPath = selectedTrackItem.filePath || selectedTrackItem.path;
      }

      if (!actualPath && selectedTrackItem.url && selectedTrackItem.url.startsWith('file:///')) {
        actualPath = decodeURIComponent(selectedTrackItem.url.replace(/^file:\/\/\/?/, ''));
      }

      // Check mediaBin for matching item
      if (!actualPath && mediaBin && mediaBin.length > 0) {
        const matched = mediaBin.find(m => {
          const mf = m.file || m;
          return mf && (mf.name === selectedTrackItem.name || mf.name === selectedTrackItem.file?.name);
        });
        if (matched) {
          const mf = matched.file || matched;
          actualPath = mf.path || mf._filePath;
          if (!actualPath && window.require) {
            try {
              actualPath = window.require('electron').webUtils?.getPathForFile(mf);
            } catch (e) {}
          }
        }
      }

      // Fallback: If no file path found on disk but file is a File/Blob, write temporarily to OS temp
      let isTempFile = false;
      if (!actualPath && window.require && (file instanceof Blob || file instanceof File)) {
        try {
          const fs = window.require('fs');
          const path = window.require('path');
          const os = window.require('os');
          const ab = await file.arrayBuffer();
          const tmp = path.join(os.tmpdir(), `shotai_split_${Date.now()}.mp4`);
          fs.writeFileSync(tmp, Buffer.from(ab));
          actualPath = tmp;
          isTempFile = true;
        } catch (e) {
          console.warn('Could not create temp file for FFmpeg:', e);
        }
      }

      // 2. Primary: Direct FFmpeg spawn (Fastest & works immediately without restarting Electron)
      if (actualPath && window.require) {
        try {
          const cuts = await detectScenesDirectlyWithFFmpeg(
            actualPath,
            selectedTrackItem.sourceStart || 0,
            dur,
            0.10
          );
          if (Array.isArray(cuts) && cuts.length > 0) {
            cutOffsets = cuts;
          }
        } catch (e) {
          console.warn('[Direct FFmpeg detection error]', e);
        }
      }

      // 3. Secondary: Electron IPC detect-scenes
      if (cutOffsets.length === 0 && actualPath && window.require) {
        try {
          const { ipcRenderer } = window.require('electron');
          const res = await ipcRenderer.invoke('detect-scenes', {
            filePath: actualPath,
            start: selectedTrackItem.sourceStart || 0,
            duration: dur,
            threshold: 0.10
          });
          if (Array.isArray(res) && res.length > 0) {
            cutOffsets = res;
          }
        } catch (e) {
          console.warn('[IPC detect-scenes fallback]', e);
        }
      }

      // Clean up temporary file if created
      if (isTempFile && actualPath && window.require) {
        try {
          const fs = window.require('fs');
          if (fs.existsSync(actualPath)) fs.unlinkSync(actualPath);
        } catch (e) {}
      }

      // 4. Fallback: HTML5 Canvas frame difference analysis
      if (cutOffsets.length === 0) {
        const videoUrl = selectedTrackItem.url || (file instanceof Blob || file instanceof File ? URL.createObjectURL(file) : (typeof file === 'string' ? file : null));
        if (videoUrl) {
          cutOffsets = await detectScenesViaCanvas(videoUrl, selectedTrackItem.sourceStart || 0, dur, 0.08);
          if (cutOffsets.length === 0 && dur >= 3.0) {
            cutOffsets = await detectScenesViaCanvas(videoUrl, selectedTrackItem.sourceStart || 0, dur, 0.06);
          }
        }
      }

      const validCuts = (cutOffsets || [])
        .map(c => Number(c))
        .filter(c => c > 0.25 && c < dur - 0.25)
        .sort((a, b) => a - b);

      if (validCuts.length === 0) {
        alert('Tidak terdeteksi perubahan transisi scene baru pada video ini.');
        return;
      }

      pushHistory(tracks, lines, markers);

      setTracks(prev => prev.map(t => {
        const idx = t.items.findIndex(it => it.id === selectedTrackItemId);
        if (idx === -1) return t;
        const it = t.items[idx];

        const points = [0, ...validCuts, dur];
        const newItems = [];

        for (let s = 0; s < points.length - 1; s++) {
          const pStart = points[s];
          const pEnd = points[s + 1];
          const segStart = Number((it.start + pStart).toFixed(3));
          const segEnd = Number((it.start + pEnd).toFixed(3));
          newItems.push({
            ...it,
            id: s === 0 ? it.id : `item-scene-${Date.now()}-${s}-${Math.random().toString(36).substring(2, 6)}`,
            start: segStart,
            end: segEnd,
            sourceStart: Number(((it.sourceStart || 0) + pStart).toFixed(3))
          });
        }

        const updated = [...t.items];
        updated.splice(idx, 1, ...newItems);
        return { ...t, items: updated };
      }));

      alert(`Berhasil memotong video menjadi ${validCuts.length + 1} scene berdasarkan transisi video!`);
    } catch (err) {
      console.error('Error split scenes:', err);
      alert('Terjadi kesalahan saat memotong scene: ' + err.message);
    } finally {
      setIsDetectingScenes(false);
    }
  }, [selectedTrackItem, selectedTrackItemId, tracks, lines, markers, pushHistory, mediaBin]);

  // ── Video Transforms (Mirror, Reverse, Rotate) ──
  const handleToggleVideoTransform = useCallback((type) => {
    if (!selectedTrackItemId) return;
    pushHistory(tracks, lines, markers);

    setTracks(prev => prev.map(t => ({
      ...t,
      items: t.items.map(it => {
        if (it.id !== selectedTrackItemId) return it;
        if (type === 'mirror') return { ...it, mirror: !it.mirror };
        if (type === 'reverse') return { ...it, reverse: !it.reverse };
        if (type === 'rotate') return { ...it, rotation: ((it.rotation || 0) + 90) % 360 };
        return it;
      })
    })));
  }, [selectedTrackItemId, tracks, lines, markers, pushHistory]);

  // ── Video Crop ──
  const handleSelectCrop = useCallback((crop) => {
    if (!selectedTrackItemId) return;
    pushHistory(tracks, lines, markers);
    setTracks(prev => prev.map(t => ({
      ...t,
      items: t.items.map(it => it.id === selectedTrackItemId ? { ...it, crop: crop === 'Original' ? null : crop } : it)
    })));
    setShowCropMenu(false);
  }, [selectedTrackItemId, tracks, lines, markers, pushHistory]);

  // ── Global Keyboard Shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.isContentEditable
      );
      if (isInput) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        if (canSplitUniversal) {
          e.preventDefault();
          handleSplitUniversal();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'q') {
        if (canDeleteLeft) {
          e.preventDefault();
          handleDeleteLeft();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        if (canDeleteRight) {
          e.preventDefault();
          handleDeleteRight();
        }
      } else if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleAddMarker();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, handleUndo, handleRedo, canSplitUniversal, handleSplitUniversal, canDeleteLeft, handleDeleteLeft, canDeleteRight, handleDeleteRight, handleAddMarker]);

  const seekTo = (t) => {
    // Clamp to max video/clip end in timeline
    const allItems = tracks.flatMap(tr => tr.items || []);
    const maxEnd = allItems.length > 0 ? Math.max(...allItems.map(i => i.end || 0)) : 0;

    if (actualHoveredMediaUrl) {
       if (videoRef.current) {
          videoRef.current.currentTime = t;
          setHoverCurrentTime(t);
       }
       setIsHoverPlaying(false);
    } else {
       if (maxEnd <= 0) {
         // Tidak ada video dalam timeline -> tidak bisa digeser / tetap 0
         setCurrentTime(0);
         if (videoRef.current) videoRef.current.currentTime = 0;
         return;
       }
       const clampedTime = Math.max(0, Math.min(maxEnd, t));
       setCurrentTime(clampedTime);
       if (videoRef.current) {
          videoRef.current.currentTime = clampedTime;
       }
       setIsPlaying(false);
    }
  };

  // ── File handling
  const validateFile = (f) => {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!ALL_FORMATS.includes(ext)) return `Format tidak didukung: .${ext}`;
    // Increase limit to 2 GB for desktop app
    if (f.size > 2000 * 1024 * 1024) return 'Ukuran file melebihi batas 2 GB';
    return null;
  };

  const processNewFileForBin = async (f) => {
    if (!f._fileUrl) f._fileUrl = URL.createObjectURL(f);
    if (!f._filePath && window.require) {
      try {
        const p = window.require('electron').webUtils?.getPathForFile(f);
        if (p) f._filePath = p;
      } catch (e) {}
    }
    let isDup = false;
    setMediaBin(prev => {
      isDup = prev.some(item => (item.file || item).name === f.name && (item.file || item).size === f.size);
      if (isDup) return prev;
      return [...prev, { file: f, thumbnail: null }];
    });
    
    // We can't rely on the synchronous isDup if setMediaBin batches, but we can do our own check
    setMediaBin(prev => {
      const actuallyDup = prev.some(item => (item.file || item).name === f.name && (item.file || item).size === f.size && item.thumbnail !== undefined);
      if (actuallyDup) return prev;
      
      // Fetch thumbnail outside async if needed, but since it's async we do it outside
      return prev; 
    });

    if (isVideoFile(f)) {
      const thumb = await generateVideoThumbnail(f);
      if (thumb) {
        setMediaBin(prev => prev.map(item => {
          if ((item.file || item).name === f.name) return { ...item, file: f, thumbnail: thumb };
          return item;
        }));
      }
    } else if (isImageFile(f)) {
      const thumb = f._fileUrl || URL.createObjectURL(f);
      setMediaBin(prev => prev.map(item => {
        if ((item.file || item).name === f.name) return { ...item, file: f, thumbnail: thumb };
        return item;
      }));
    }
  };

  const handleFile = (f) => {
    const err = validateFile(f);
    if (err) { setError(err); return; }
    setError('');
    setFile(f);
    processNewFileForBin(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleImportClick = () => {
    if (mediaInputRef.current) {
      mediaInputRef.current.value = ''; // Reset to allow importing same file again
      mediaInputRef.current.click();
    }
  };

  const handleMediaImport = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((f, idx) => {
      const err = validateFile(f);
      if (!err) {
        processNewFileForBin(f);
        if (idx === 0 && !file) {
          setFile(f);
          if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
        }
      } else {
        setError(err);
      }
    });
    e.target.value = '';
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [title]);

  // ── Real Multimodal Audio Transcription via Gemini API (Gemini 1.5/2.5/3.6 Flash/Pro)
  const transcribeWithGemini = async (audioBase64, mimeType) => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('API Key Google AI Studio belum diatur di aplikasi.');

    const langHint = language === 'auto' ? '' : ` Audio Spoken Language: ${LANGUAGES.find(l => l.id === language)?.label || language}.`;
    const durInfo = duration > 0 ? ` Exact total audio file duration: ${duration.toFixed(2)} seconds.` : '';

    const models = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    let lastError = null;
    let res = null;

    const systemPrompt = `Listen carefully to this audio track from start to finish.${durInfo}${langHint}

CRITICAL INSTRUCTION: Return ONLY a raw, valid JSON object with NO markdown formatting, NO backticks (\`\`\`), and NO conversational text.

REQUIRED JSON OUTPUT FORMAT:
{
  "lyrics": [
    {
      "text": "First lyric line",
      "start_time_ms": 3250,
      "end_time_ms": 6800
    },
    {
      "text": "Second lyric line",
      "start_time_ms": 7100,
      "end_time_ms": 10450
    }
  ]
}

STRICT TIMING & TRANSCRIBE RULES FOR KARAOKE TIMELINE SYNC:
1. "start_time_ms": Exact timestamp in milliseconds (e.g., 3250 for 3.25s) when the singer utters the first syllable of this phrase.
2. "end_time_ms": Exact timestamp in milliseconds (e.g., 6800 for 6.80s) when the singer finishes the last syllable of this phrase. Do NOT include instrumental breaks or silence in end_time_ms!
3. Split lyrics into short vocal phrases (3 to 6 words per line) matching the singer's natural breath pauses.
4. Ensure strict chronological order (start_time_ms of line N < start_time_ms of line N+1).
5. Skip intro or interlude instrumental sections where there is no vocal singing.`;

    for (const modelName of models) {
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: systemPrompt },
                { inline_data: { mime_type: mimeType, data: audioBase64 } }
              ]
            }],
            generationConfig: { temperature: 0.0, response_mime_type: "application/json" }
          })
        });

        if (res.ok) break;
        const errText = await res.text();
        lastError = new Error(`Gemini API (${modelName}): ${errText.substring(0, 150)}`);
      } catch (e) {
        lastError = e;
      }
    }

    if (!res || !res.ok) {
      throw lastError || new Error('Gagal menghubungi Gemini API');
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini tidak mengembalikan respon data transkrip');

    const parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
    const rawLyrics = parsed.lyrics || parsed.data || [];

    return rawLyrics
      .map(l => {
        const startSec = l.start_time_ms != null ? l.start_time_ms / 1000 : (l.start != null ? parseFloat(l.start) : 0);
        const endSec = l.end_time_ms != null ? l.end_time_ms / 1000 : (l.end != null ? parseFloat(l.end) : 0);
        return {
          text: (l.text || '').trim(),
          start: Math.max(0, startSec),
          end: Math.max(0, endSec),
        };
      })
      .filter(l => l.text.length > 0)
      .sort((a, b) => a.start - b.start)
      .map((l, i, arr) => {
        let validStart = l.start;
        let validEnd = Math.max(validStart + 1.0, l.end);
        if (i < arr.length - 1 && validEnd > arr[i + 1].start && arr[i + 1].start > validStart) {
          validEnd = arr[i + 1].start;
        }
        return {
          text: l.text,
          start: +validStart.toFixed(2),
          end: +validEnd.toFixed(2),
        };
      });
  };

  // ── Align manual lyrics with audio via Gemini Multimodal API
  const alignLyricsWithGemini = async (audioBase64, mimeType, lyricsText) => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('API Key Google AI Studio belum diatur di aplikasi.');

    const durInfo = duration > 0 ? ` Exact total audio file duration: ${duration.toFixed(2)} seconds.` : '';
    const models = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    let lastError = null;
    let res = null;

    const alignPrompt = `Listen carefully to this audio track and align the provided lyrics with exact timestamps.${durInfo}

Lyrics to align:
${lyricsText}

CRITICAL REQUIREMENT: Return ONLY a raw, valid JSON object with NO markdown formatting, NO backticks, and NO conversational text.

REQUIRED JSON OUTPUT FORMAT:
{
  "lyrics": [
    {
      "text": "First lyric line",
      "start_time_ms": 3250,
      "end_time_ms": 6800
    },
    {
      "text": "Second lyric line",
      "start_time_ms": 7100,
      "end_time_ms": 10450
    }
  ]
}

STRICT ALIGNMENT RULES:
1. "start_time_ms": Exact timestamp in milliseconds when the singer starts the line.
2. "end_time_ms": Exact timestamp in milliseconds when the line ends. Do NOT include instrumental silence!
3. Ensure strict chronological order.`;

    for (const modelName of models) {
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: alignPrompt },
                { inline_data: { mime_type: mimeType, data: audioBase64 } }
              ]
            }],
            generationConfig: { temperature: 0.0, response_mime_type: "application/json" }
          })
        });

        if (res.ok) break;
        const errText = await res.text();
        lastError = new Error(`Gemini API (${modelName}): ${errText.substring(0, 150)}`);
      } catch (e) {
        lastError = e;
      }
    }

    if (!res || !res.ok) {
      throw lastError || new Error('Gagal menghubungi Gemini API');
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini tidak mengembalikan respon data alignment');

    const parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
    const rawLyrics = parsed.lyrics || parsed.data || [];

    return rawLyrics
      .map(l => {
        const startSec = l.start_time_ms != null ? l.start_time_ms / 1000 : (l.start != null ? parseFloat(l.start) : 0);
        const endSec = l.end_time_ms != null ? l.end_time_ms / 1000 : (l.end != null ? parseFloat(l.end) : 0);
        return {
          text: (l.text || '').trim(),
          start: Math.max(0, startSec),
          end: Math.max(0, endSec),
        };
      })
      .filter(l => l.text.length > 0)
      .sort((a, b) => a.start - b.start)
      .map((l, i, arr) => {
        let validStart = l.start;
        let validEnd = Math.max(validStart + 1.0, l.end);
        if (i < arr.length - 1 && validEnd > arr[i + 1].start && arr[i + 1].start > validStart) {
          validEnd = arr[i + 1].start;
        }
        return {
          text: l.text,
          start: +validStart.toFixed(2),
          end: +validEnd.toFixed(2),
        };
      });
  };

  // ── Generate pipeline (real)
  const STEPS_AUTO = ['Memuat audio', 'Transkripsi lirik (AI)', 'Selaraskan timing', 'Menyiapkan editor'];
  const STEPS_MANUAL = ['Memuat audio', 'Menganalisis audio', 'Selaraskan timing lirik (AI)', 'Menyiapkan editor'];
  const STEPS_SKIP = ['Memuat audio', 'Menyiapkan editor'];

  const handleGenerate = async () => {
    let targetFile = file;
    
    // Fallbacks if file isn't set (e.g., uploaded directly to media bin)
    if (!targetFile) {
      const audioTrack = tracks.find(t => t.type === 'audio');
      if (audioTrack && audioTrack.items.length > 0) targetFile = audioTrack.items[0].originalFile;
    }
    if (!targetFile) {
      const audioMedia = mediaBin.find(m => (m.file || m).type && (m.file || m).type.startsWith('audio/'));
      if (audioMedia) targetFile = audioMedia.file || audioMedia;
      else {
        const videoMedia = mediaBin.find(m => (m.file || m).type && (m.file || m).type.startsWith('video/'));
        if (videoMedia) targetFile = videoMedia.file || videoMedia;
      }
    }

    if (!targetFile) { alert('Tambahkan file audio atau video ke dalam Media/Timeline terlebih dahulu!'); return; }
    if (lyricsSource === 'manual' && !manualLyrics.trim()) { alert('Tempel lirik terlebih dahulu atau pilih Auto AI'); return; }

    const steps = lyricsSource === 'auto' ? STEPS_AUTO : lyricsSource === 'manual' ? STEPS_MANUAL : STEPS_SKIP;
    setScreen('generating');
    setGenerateStep(0);
    setGenerateError('');

    try {
      // Step 1: Load audio
      await new Promise(r => setTimeout(r, 400));
      setGenerateStep(1);

      const mimeType = targetFile.type || 'audio/mp3';

      if (lyricsSource === 'auto') {
        // Step 2: Transcribe with Gemini
        const audioBase64 = await toBase64(targetFile);
        setGenerateStep(1);
        const transcribed = await transcribeWithGemini(audioBase64, mimeType);
        setGenerateStep(2);

        // Step 3: Timing already included
        await new Promise(r => setTimeout(r, 300));
        setGenerateStep(3);

        // Step 4: Prepare editor
        const genLines = transcribed.map(l => ({
          text: l.text,
          start: parseFloat(l.start) || 0,
          end: parseFloat(l.end) || 0,
        }));
        setLines(genLines);
        setActiveVersion(1);
        await new Promise(r => setTimeout(r, 300));
        setGenerateStep(4);

      } else if (lyricsSource === 'manual') {
        // Step 2: Analyze audio
        const audioBase64 = await toBase64(targetFile);
        setGenerateStep(2);

        // Step 3: Align lyrics with audio
        const aligned = await alignLyricsWithGemini(audioBase64, mimeType, manualLyrics);
        setGenerateStep(3);

        const genLines = aligned.map(l => ({
          text: l.text,
          start: parseFloat(l.start) || 0,
          end: parseFloat(l.end) || 0,
        }));
        setLines(genLines);
        setActiveVersion(1);
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

  // ── Export Modal Handlers
  const activeExt = exportVideo ? 'mp4' : (exportAudio ? 'mp3' : 'mp4');
  const cleanExportName = (exportName || title || '0901(2)').trim().replace(/[\\/:*?"<>|]/g, '_');
  const computedExportTo = exportDir ? `${exportDir.replace(/\\/g, '/')}/${cleanExportName}.${activeExt}` : `${cleanExportName}.${activeExt}`;
  const canExport = (exportVideo || exportAudio) && cleanExportName.length > 0;

  const handleOpenExportModal = async () => {
    const projName = (title || '0901(2)').trim();
    setExportName(projName);
    setExportStatus('idle');
    setExportProgress(0);
    setExportErrorMsg('');
    setShowExportModal(true);

    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        const res = await ipcRenderer.invoke('export-video', { action: 'get-default-dir' });
        if (res && res.success && res.defaultDir) {
          setExportDir(res.defaultDir.replace(/\\/g, '/'));
        }
      } catch (e) {}
    }
  };

  const handleBrowseExportDir = async () => {
    if (!window.require) return;
    try {
      const { ipcRenderer } = window.require('electron');
      // 1. Dynamic pick-folder via export-video
      const res = await ipcRenderer.invoke('export-video', {
        action: 'pick-folder',
        defaultDir: exportDir
      });
      if (res && res.success && res.folderPath) {
        setExportDir(res.folderPath.replace(/\\/g, '/'));
        return;
      }
    } catch (e) {
      console.warn('export-video pick-folder fallback:', e);
    }

    // 2. Direct IPC fallback
    try {
      const { ipcRenderer } = window.require('electron');
      const dir = await ipcRenderer.invoke('choose-export-directory', exportDir);
      if (dir) {
        setExportDir(dir.replace(/\\/g, '/'));
      }
    } catch (err) {
      console.error('Directory browse failed:', err);
    }
  };

  const handleOpenResultFolder = async () => {
    if (!window.require || !exportResultPath) return;
    try {
      const { ipcRenderer } = window.require('electron');
      const res = await ipcRenderer.invoke('export-video', {
        action: 'open-folder',
        filePath: exportResultPath
      });
      if (res && res.success) return;
    } catch (e) {}

    try {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('open-folder', exportResultPath);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelExport = async () => {
    try {
      if (window.require) {
        const { ipcRenderer } = window.require('electron');
        await ipcRenderer.invoke('cancel-export');
      }
    } catch (err) {
      console.warn('Gagal membatalkan ekspor:', err);
    } finally {
      setExportStatus('idle');
      setExporting(false);
      setExportProgress(0);
    }
  };

  const handleStartExport = async () => {
    if (!window.require) return alert("Fitur export hanya tersedia di versi Desktop.");
    const { ipcRenderer } = window.require('electron');

    if (!exportVideo && !exportAudio) {
      return alert("Silakan centang Video atau Audio yang ingin diekspor.");
    }

    let exportDur = Number(duration) || 0;
    if (exportDur <= 0) {
      tracks.forEach(t => t.items?.forEach(i => { if (i.end && i.end > exportDur) exportDur = i.end; }));
      lines.forEach(l => { if (l.end && l.end > exportDur) exportDur = l.end; });
    }
    if (exportDur <= 0) exportDur = 10;

    setExporting(true);
    setExportStatus('exporting');
    setExportProgress(1);
    setExportTimeText(`00:00 / ${formatTime(exportDur)}`);

    ipcRenderer.removeAllListeners('export-progress');
    const onProgress = (e, data) => {
      const p = typeof data === 'number' ? data : (data?.percent !== undefined ? data.percent : 0);
      if (typeof p === 'number' && !isNaN(p)) {
        setExportProgress(Math.min(99, Math.max(1, Math.round(p))));
      }
      if (data?.timemark) {
        setExportTimeText(data.timemark);
      }
    };
    ipcRenderer.on('export-progress', onProgress);

    try {
      const sanitizedTracks = tracks.map(t => ({
        ...t,
        items: t.items.map(i => {
          let fp = i.filePath || (i.file ? (i.file.path || i.file._filePath) : null);
          if (!fp && i.file && window.require) {
            try {
              fp = window.require('electron').webUtils?.getPathForFile(i.file);
            } catch (e) {
              fp = 'Error webUtils: ' + e.message;
            }
          }
          return {
            ...i,
            filePath: fp,
            file: null 
          };
        })
      }));

      const basePayload = {
        title: cleanExportName,
        duration: exportDur,
        tracks: sanitizedTracks,
        lines,
        style: {
          font,
          baseTextColor: useLyricsVersion ? baseTextColor : standardTextColor,
          baseStrokeColor: useLyricsVersion ? baseStrokeColor : standardStrokeColor,
          activeTextColor: useLyricsVersion ? activeTextColor : standardTextColor,
          activeStrokeColor: useLyricsVersion ? activeStrokeColor : standardStrokeColor,
          version: useLyricsVersion ? activeVersion : 2
        }
      };

      let finalSavedPath = '';

      // Export Video
      if (exportVideo) {
        const videoTargetPath = exportDir ? `${exportDir.replace(/\\/g, '/')}/${cleanExportName}.mp4` : `${cleanExportName}.mp4`;
        const res = await ipcRenderer.invoke('export-video', {
          ...basePayload,
          outputPath: videoTargetPath
        });
        if (!res.success) {
          if (res.canceled) {
            setExportStatus('idle');
            return;
          }
          throw new Error(res.error || 'Gagal mengekspor video');
        }
        finalSavedPath = res.filePath;
      }

      // Export Audio
      if (exportAudio) {
        const audioTargetPath = exportDir ? `${exportDir.replace(/\\/g, '/')}/${cleanExportName}.mp3` : `${cleanExportName}.mp3`;
        let aRes = null;
        try {
          aRes = await ipcRenderer.invoke('export-video', {
            action: 'export-audio',
            ...basePayload,
            outputPath: audioTargetPath
          });
        } catch(e) {
          aRes = await ipcRenderer.invoke('export-audio', {
            ...basePayload,
            outputPath: audioTargetPath
          });
        }
        if (!aRes.success) {
          if (aRes.canceled) {
            setExportStatus('idle');
            return;
          }
          throw new Error(aRes.error || 'Gagal mengekspor audio');
        }
        if (!finalSavedPath) finalSavedPath = aRes.filePath;
      }

      setExportProgress(100);
      setExportTimeText(`${formatTime(exportDur)} / ${formatTime(exportDur)}`);
      setExportResultPath(finalSavedPath);
      setExportStatus('completed');
    } catch (err) {
      console.error('Export Error:', err);
      setExportErrorMsg(err.message || 'Terjadi kesalahan saat ekspor.');
      setExportStatus('error');
    } finally {
      ipcRenderer.removeAllListeners('export-progress');
      setExporting(false);
    }
  };

  /* ════════════════ INPUT SCREEN ════════════════ */
  if (screen === 'input') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#09090b', color: '#f4f4f5', fontFamily: 'Inter, sans-serif', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <button onClick={onBack} style={{ padding: '8px', borderRadius: '10px', border: '1px solid #27272a', backgroundColor: '#18181b', color: '#d4d4d8', cursor: 'pointer' }}>
              <ArrowLeft size={16} />
            </button>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', color: 'white' }}>
              <Music2 size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, background: 'linear-gradient(to right,#a78bfa,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Video Karaoke
              </h3>
              <p style={{ margin: 0, fontSize: '10px', color: '#71717a' }}>Upload lagu → lirik → ekspor video siap pakai</p>
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
              border: `2px dashed ${dragOver ? '#60a5fa' : file ? '#22c55e' : '#27272a'}`,
              borderRadius: '14px', padding: '20px 16px', textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
              backgroundColor: dragOver ? 'rgba(96,165,250,0.06)' : file ? 'rgba(34,197,94,0.05)' : '#18181b',
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
                <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#71717a' }}>
                  {formatBytes(file.size)}{duration > 0 ? ` • ${formatTime(duration)}` : ''}
                </p>
                {/* Mini audio play in upload zone */}
                {audioUrl && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={e => e.stopPropagation()}>
                    <button onClick={togglePlay} disabled={visualProcessingCount > 0} style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: visualProcessingCount > 0 ? '#4b5563' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                      border: 'none', cursor: visualProcessingCount > 0 ? 'not-allowed' : 'pointer', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: visualProcessingCount > 0 ? 0.5 : 1,
                    }}>
                      {(hoveredMediaUrl && hoveredMediaName === selectedMediaName ? isHoverPlaying : isPlaying) ? <Pause size={12} /> : <Play size={12} style={{ marginLeft: '1px' }} />}
                    </button>
                    <span style={{ fontSize: '10px', color: '#60a5fa' }}>
                      {(hoveredMediaUrl && hoveredMediaName === selectedMediaName ? isHoverPlaying : isPlaying) ? 'Sedang diputar...' : 'Dengar preview'}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <Upload size={24} color="#71717a" style={{ marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#d4d4d8' }}>Drag & drop atau klik untuk browse</p>
                <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#52525b' }}>MP3, WAV, FLAC, MP4, MOV, dan lainnya • Maks 300 MB / 20 menit</p>
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
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Judul & Artis</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Judul lagu"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #27272a', backgroundColor: '#18181b', color: '#f4f4f5', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
            />
            <input value={artist} onChange={e => setArtist(e.target.value)}
              placeholder="Nama artis (opsional)"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #27272a', backgroundColor: '#18181b', color: '#f4f4f5', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Lyric Source */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sumber Lirik</label>
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
                      flex: 1, padding: '8px 4px', borderRadius: '10px', border: `1.5px solid ${active ? opt.color : '#27272a'}`,
                      backgroundColor: active ? `${opt.color}18` : '#18181b', color: active ? opt.color : '#71717a',
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
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #27272a', backgroundColor: '#18181b', color: '#f4f4f5', fontSize: '11px', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            )}
            {lyricsSource === 'auto' && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', fontSize: '11px', color: '#a78bfa' }}>
                🤖 Sistem akan mentranskripsi audio secara otomatis menggunakan Gemini AI dan menghasilkan timestamp per baris.
              </div>
            )}
            {lyricsSource === 'skip' && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'rgba(148,163,184,0.08)', border: '1px solid #27272a', fontSize: '11px', color: '#71717a' }}>
                Lirik bisa ditambahkan nanti di tab <b style={{ color: '#d4d4d8' }}>Lyrics</b> di editor.
              </div>
            )}
          </div>

          {/* Language */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Globe size={11} /> Bahasa
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {LANGUAGES.map(lang => (
                <button key={lang.id} onClick={() => setLanguage(lang.id)}
                  style={{
                    padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${language === lang.id ? '#60a5fa' : '#27272a'}`,
                    backgroundColor: language === lang.id ? 'rgba(96,165,250,0.12)' : '#18181b',
                    color: language === lang.id ? '#60a5fa' : '#71717a',
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
      <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#09090b', padding: '32px 24px', textAlign: 'center' }}>
        {!generateError ? (
          <>
            <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(59,130,246,0.2))', border: '1px solid rgba(96,165,250,0.2)', marginBottom: '24px' }}>
              <Loader2 size={36} color="#60a5fa" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800, color: '#f4f4f5' }}>Membuat Video Karaoke…</h3>
            <p style={{ margin: '0 0 20px', fontSize: '11px', color: '#71717a' }}>
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
            <p style={{ margin: '0 0 20px', fontSize: '11px', color: '#a1a1aa', maxWidth: '280px', lineHeight: 1.5 }}>
              {generateError}
            </p>
            <button onClick={() => { setScreen('editor'); setGenerateError(''); }}
              style={{
                padding: '10px 24px', borderRadius: '10px', border: '1px solid #27272a',
                background: '#18181b', color: '#d4d4d8', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
              <ArrowLeft size={14} /> Kembali ke Studio
            </button>
          </>
        )}
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes floatUp { 0% { transform: translateY(0); opacity: 0.15; } 100% { transform: translateY(-200px); opacity: 0; } }`}</style>
      </div>
    );
  }


  /* ════════════════ CAPCUT DESKTOP MASTER LAYOUT ════════════════ */
  const STUDIO_TABS = [
    { id: 'media',   label: 'Media',   icon: Film },
    { id: 'caption', label: 'Caption', icon: FileText },
    { id: 'text',    label: 'Text',    icon: Type },
    { id: 'effects', label: 'Effects', icon: Sparkles },
    { id: 'audio',   label: 'Audio',   icon: Headphones },
  ];

  return (
    <div className="fixed inset-0 w-screen h-screen z-[9999] flex flex-col overflow-hidden" style={{ backgroundColor: '#09090b', color: '#d4d4d8', fontFamily: 'Inter, sans-serif' }}>

      {/* ═══ TOP BAR ═══════════════════════════════════════════════ */}
      <div className="h-11 flex-shrink-0 flex items-center px-3 gap-3" style={{ borderBottom: '1px solid #27272a', backgroundColor: '#111113' }}>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={onBack} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors" style={{ backgroundColor: '#18181b', border: '1px solid #27272a', color: '#d4d4d8' }}>
            <ArrowLeft size={13} /> Kembali
          </button>
          <div className="w-px h-5" style={{ backgroundColor: '#27272a' }} />
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 text-white">
            <Music2 size={14} />
          </div>
          <div>
            <div className="text-xs font-extrabold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent leading-none">ShotAi Studio</div>
            <div className="text-[9px] text-zinc-500 leading-none mt-0.5">Video Karaoke</div>
          </div>
        </div>

        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold max-w-xs" style={{ backgroundColor: '#18181b', border: '1px solid #27272a', color: '#d4d4d8' }}>
            <Film size={11} className="text-zinc-500 flex-shrink-0" />
            <span className="truncate">{title || 'Proyek Karaoke Baru'}</span>
            {artist && <span className="text-zinc-500 font-normal">— {artist}</span>}
          </div>
        </div>

        <div className="flex-shrink-0">
          <button onClick={handleOpenExportModal} disabled={exporting}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold text-white transition-all cursor-pointer border-0 ${exporting ? 'bg-zinc-700 cursor-not-allowed text-zinc-400' : 'bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500'}`}>
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            {exporting ? `${Math.round(exportProgress)}%` : 'Ekspor'}
          </button>
        </div>
      </div>

      {exporting && (
        <div className="h-0.5 flex-shrink-0" style={{ backgroundColor: '#18181b' }}>
          <div className="h-full bg-gradient-to-r from-violet-600 to-blue-500 transition-all duration-300" style={{ width: `${exportProgress}%` }} />
        </div>
      )}

      {/* ═══ MAIN WORKSPACE ═══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ─── WORKSPACE ATAS (3 Kolom) ──────────────────────────── */}
        <div className="flex-1 flex overflow-hidden" style={{ userSelect: (isResizingLeft || isResizingRight) ? 'none' : 'auto' }}>

          {/* ╔══ KOLOM KIRI — Panel Media/Aset ═══════════════════╗ */}
          <div style={{ width: `${leftWidth}px`, backgroundColor: '#111113', borderRight: '1px solid #27272a', color: '#d4d4d8', fontSize: '12px', fontFamily: 'Inter, -apple-system, sans-serif' }} className="flex-shrink-0 flex flex-col overflow-hidden">

            {/* Tab Nav — CapCut style (Media / Caption / Design / Audio) */}
            <div className="flex-shrink-0 h-9 flex px-1" style={{ borderBottom: '1px solid #27272a', backgroundColor: '#09090b' }}>
              {STUDIO_TABS.map(tab => {
                const Icon = tab.icon;
                const active = editorTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setEditorTab(tab.id)}
                    style={{
                      flex: 1, height: '100%', border: 'none',
                      backgroundColor: 'transparent',
                      borderBottom: active ? '2px solid #00d8b6' : '2px solid transparent',
                      display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: '6px',
                      cursor: 'pointer', transition: 'all 0.15s',
                      color: active ? '#00d8b6' : '#71717a',
                      fontFamily: 'Inter, -apple-system, sans-serif',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#e4e4e7'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#71717a'; }}
                  >
                    <Icon size={15} style={{ color: active ? '#00d8b6' : '#71717a' }} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Left Panel Content */}
            <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-3" style={{ scrollbarWidth: 'thin' }} onClick={() => { setHoveredMediaUrl(null); setHoveredMediaName(null); setHoveredMediaType(null); setIsHoverPlaying(false); }}>

                {/* TAB MEDIA */}
              {editorTab === 'media' && (
                <>
                  {/* Hidden input to handle file selection natively in browser engine */}
                  <input ref={mediaInputRef} type="file" multiple accept={ALL_FORMATS.map(e => `.${e}`).join(',')} style={{ display: 'none' }} onChange={handleMediaImport} />

                  {mediaBin.length === 0 ? (
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={onDrop}
                      onClick={handleImportClick}
                      style={{
                        border: `1.5px dashed ${dragOver ? '#00d8b6' : '#27272a'}`,
                        borderRadius: '12px',
                        padding: '32px 16px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: dragOver ? 'rgba(0, 216, 182, 0.08)' : '#18181b',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #06b6d4, #00d8b6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(0, 216, 182, 0.4)',
                      }}>
                        <Plus size={20} style={{ color: '#09090b' }} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#e4e4e7', fontFamily: 'Inter, -apple-system, sans-serif' }}>
                          Import
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#71717a', lineHeight: 1.4, fontFamily: 'Inter, -apple-system, sans-serif' }}>
                          Drag and drop videos, photos,<br />and audio files here
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', alignItems: 'center' }}>
                      <button onClick={handleImportClick}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 216, 182, 0.12)', border: '1px solid rgba(0, 216, 182, 0.3)', color: '#00d8b6', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, -apple-system, sans-serif' }}>
                        <div style={{ background: '#00d8b6', borderRadius: '50%', padding: '2px', color: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={11} strokeWidth={3} /></div> Import
                      </button>
                    </div>
                  )}

                  {/* Uploaded file list */}
                  {mediaBin.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#e4e4e7', fontFamily: 'Inter, -apple-system, sans-serif' }}>All</p>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {mediaBin.map((mediaItem, idx) => {
                          const mediaFile = mediaItem.file || mediaItem;
                          const thumb = mediaItem.thumbnail || null;
                          return (
                          <div 
                            key={idx} 
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedMediaName(mediaFile.name);
                              setMediaContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                mediaFile,
                                mediaItem
                              });
                            }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '120px' }}
                          >
                            
                            {/* Card Thumbnail */}
                            <div 
                              onMouseEnter={() => {
                                if (!isHoverPlaying) {
                                  const url = mediaFile._fileUrl || URL.createObjectURL(mediaFile);
                                  setHoveredMediaUrl(url);
                                  setHoveredMediaName(mediaFile.name);
                                  setHoveredMediaType(isVideoFile(mediaFile) ? 'video' : isImageFile(mediaFile) ? 'image' : 'audio');
                                }
                              }}
                              onMouseMove={(e) => {
                                if ((hoveredMediaType === 'video' || hoveredMediaType === 'audio') && videoRef.current && videoRef.current.duration && !isHoverPlaying) {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const x = e.clientX - rect.left;
                                  const pct = Math.max(0, Math.min(1, x / rect.width));
                                  videoRef.current.currentTime = pct * videoRef.current.duration;
                                  setHoverCurrentTime(videoRef.current.currentTime);
                                  setHoverDuration(videoRef.current.duration);
                                }
                              }}
                              onMouseLeave={() => {
                                if (!isHoverPlaying) {
                                  setHoveredMediaUrl(null);
                                  setHoveredMediaName(null);
                                  setHoveredMediaType(null);
                                  setIsHoverPlaying(false);
                                }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMediaName(mediaFile.name);
                                setIsPlaying(false);
                                setIsHoverPlaying(false);
                                const url = mediaFile._fileUrl || URL.createObjectURL(mediaFile);
                                setHoveredMediaUrl(url);
                                setHoveredMediaName(mediaFile.name);
                                setHoveredMediaType(isVideoFile(mediaFile) ? 'video' : isImageFile(mediaFile) ? 'image' : 'audio');
                              }}
                              style={{ 
                              width: '100%', 
                              height: '76px', 
                              backgroundColor: '#18181b', 
                              borderRadius: '8px', 
                              position: 'relative', 
                              overflow: 'hidden', 
                              cursor: 'pointer', 
                              border: selectedMediaName === mediaFile.name ? '2px solid #00d8b6' : '1px solid #27272a'
                            }}>
                              {/* Thumbnail or Audio Waveform */}
                              {isVideoFile(mediaFile) ? (
                                thumb ? (
                                  <img src={thumb} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="thumb" />
                                ) : (
                                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                     <Film size={24} style={{ color: '#00d8b6', opacity: 0.8 }} />
                                  </div>
                                )
                              ) : isImageFile(mediaFile) ? (
                                thumb ? (
                                  <img src={thumb} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="thumb" />
                                ) : (
                                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                     <ImageIcon size={24} style={{ color: '#10b981', opacity: 0.8 }} />
                                  </div>
                                )
                              ) : (
                                <div style={{ position: 'absolute', inset: 0, padding: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                  <div style={{ position: 'absolute', top: '5px', left: '6px', zIndex: 5, display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(0,0,0,0.6)', padding: '1px 5px', borderRadius: '4px' }}>
                                    <Music2 size={10} style={{ color: '#00d8b6' }} />
                                    <span style={{ fontSize: '8.5px', fontWeight: 700, color: '#00d8b6', letterSpacing: '0.04em' }}>MP3</span>
                                  </div>
                                  <div style={{ width: '100%', height: '48px', position: 'relative', marginTop: '10px' }}>
                                    <AudioWaveformCanvas 
                                      file={mediaFile} 
                                      currentTime={hoveredMediaName === mediaFile.name ? hoverCurrentTime : 0} 
                                      duration={hoveredMediaName === mediaFile.name && hoverDuration > 0 ? hoverDuration : (file?.name === mediaFile.name && duration > 0 ? duration : 0)} 
                                      compact={true} 
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {/* Duration badge (only for current main file for now) */}
                              {file && file.name === mediaFile.name && duration > 0 && (
                                <div style={{ position: 'absolute', top: '6px', right: '6px', fontSize: '9px', color: '#fcd34d', fontWeight: 600 }}>
                                  {formatTime(duration)}
                                </div>
                              )}
  
                              {/* Delete button (hover style) */}
                              {selectedMediaName === mediaFile.name && (
                                <button onClick={(e) => { e.stopPropagation(); removeFromMedia(mediaFile); }} 
                                  title="Hapus file"
                                  style={{ position: 'absolute', top: '4px', left: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '3px', color: '#ef4444', transition: 'all 0.2s', zIndex: 10 }} 
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.4)'} 
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.6)'}>
                                   <Trash2 size={11} />
                                </button>
                              )}
  
                              {/* Add to timeline button */}
                              {selectedMediaName === mediaFile.name && (
                                <button onClick={(e) => { e.stopPropagation(); addToTimeline(mediaFile); }} 
                                  title="Tambah ke timeline"
                                  style={{ position: 'absolute', bottom: '6px', right: '6px', background: '#00d8b6', border: 'none', borderRadius: '50%', cursor: 'pointer', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#09090b', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', transition: 'transform 0.1s', zIndex: 10 }}
                                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} 
                                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                   <Plus size={14} strokeWidth={2.5} />
                                </button>
                              )}
                            </div>
                            
                            {/* Filename */}
                            <div style={{ fontSize: '10px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                              {mediaFile.name}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </>
              )}

              {/* TAB TEXT */}
              {editorTab === 'text' && (
                <div style={{ display: 'flex', flexDirection: 'row', height: '100%', margin: '-10px', backgroundColor: '#18181b' }}>
                  
                  {/* Left Column - Menu */}
                  <div style={{ width: '38%', borderRight: '1px solid #27272a', padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    
                    <div style={{ padding: '8px 10px', backgroundColor: '#27272a', borderRadius: '6px', color: '#00d8b6', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      Add text
                    </div>
                    
                    <div style={{ padding: '8px 10px', backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#d4d4d8', fontSize: '11px', fontWeight: 500, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Text effects</span>
                      <ChevronDown size={12} style={{ color: '#71717a' }} />
                    </div>
                    
                    <div style={{ padding: '8px 10px', backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#d4d4d8', fontSize: '11px', fontWeight: 500, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Text template</span>
                      <ChevronDown size={12} style={{ color: '#71717a' }} />
                    </div>

                  </div>
                  
                  {/* Right Column - Content */}
                  <div style={{ width: '62%', padding: '12px', backgroundColor: '#111113', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                    
                    {/* Live Sync Status Info Pill */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      backgroundColor: '#18181b',
                      borderRadius: '6px',
                      border: '1px solid #27272a',
                      fontSize: '10.5px',
                      color: '#a1a1aa'
                    }}>
                      <span>Font: <strong style={{ color: '#f4f4f5', fontFamily: font === 'System' ? 'inherit' : font }}>{font}</strong></span>
                      <span>Ukuran: <strong style={{ color: '#00d8b6' }}>{textSize}px</strong></span>
                    </div>

                    {/* Preset 1: Default text */}
                    <div 
                      onClick={() => handleAddTextPreset('Default text', textSize)}
                      title="Klik untuk menambahkan teks standar"
                      style={{
                        position: 'relative',
                        padding: '12px',
                        backgroundColor: '#18181b',
                        borderRadius: '8px',
                        border: '1px solid #27272a',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#00d8b6'; e.currentTarget.querySelector('.add-text-btn').style.opacity = 1; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272a'; e.currentTarget.querySelector('.add-text-btn').style.opacity = 0; }}
                    >
                      <div style={{
                        color: '#f4f4f5',
                        fontFamily: font === 'System' ? 'inherit' : font,
                        fontSize: `${Math.min(18, Math.max(12, Math.round(textSize * 0.55)))}px`,
                        fontWeight: 600,
                        lineHeight: 1.2
                      }}>
                        Default text
                      </div>
                      <div style={{ fontSize: '9.5px', color: '#71717a' }}>
                        Standar · {font} ({textSize}px)
                      </div>
                      <div className="add-text-btn" style={{
                        position: 'absolute', top: '10px', right: '10px', width: '20px', height: '20px',
                        backgroundColor: '#0d9488', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0, transition: 'opacity 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                      }}>
                        <Plus size={13} color="white" />
                      </div>
                    </div>

                    {/* Preset 2: Judul / Heading */}
                    <div 
                      onClick={() => handleAddTextPreset('Judul Besar', Math.round(textSize * 1.5))}
                      title="Klik untuk menambahkan teks judul"
                      style={{
                        position: 'relative',
                        padding: '12px',
                        backgroundColor: '#18181b',
                        borderRadius: '8px',
                        border: '1px solid #27272a',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#00d8b6'; e.currentTarget.querySelector('.add-text-btn').style.opacity = 1; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272a'; e.currentTarget.querySelector('.add-text-btn').style.opacity = 0; }}
                    >
                      <div style={{
                        color: '#ffffff',
                        fontFamily: font === 'System' ? 'inherit' : font,
                        fontSize: `${Math.min(22, Math.max(14, Math.round(textSize * 0.75)))}px`,
                        fontWeight: 800,
                        lineHeight: 1.2
                      }}>
                        Judul Besar
                      </div>
                      <div style={{ fontSize: '9.5px', color: '#71717a' }}>
                        Heading · {font} ({Math.round(textSize * 1.5)}px)
                      </div>
                      <div className="add-text-btn" style={{
                        position: 'absolute', top: '10px', right: '10px', width: '20px', height: '20px',
                        backgroundColor: '#0d9488', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0, transition: 'opacity 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                      }}>
                        <Plus size={13} color="white" />
                      </div>
                    </div>

                    {/* Preset 3: Subjudul */}
                    <div 
                      onClick={() => handleAddTextPreset('Subjudul Teks', Math.round(textSize * 0.8))}
                      title="Klik untuk menambahkan subjudul"
                      style={{
                        position: 'relative',
                        padding: '12px',
                        backgroundColor: '#18181b',
                        borderRadius: '8px',
                        border: '1px solid #27272a',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#00d8b6'; e.currentTarget.querySelector('.add-text-btn').style.opacity = 1; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272a'; e.currentTarget.querySelector('.add-text-btn').style.opacity = 0; }}
                    >
                      <div style={{
                        color: '#d4d4d8',
                        fontFamily: font === 'System' ? 'inherit' : font,
                        fontSize: `${Math.min(15, Math.max(10, Math.round(textSize * 0.45)))}px`,
                        fontWeight: 500,
                        lineHeight: 1.2
                      }}>
                        Subjudul Teks
                      </div>
                      <div style={{ fontSize: '9.5px', color: '#71717a' }}>
                        Subheading · {font} ({Math.round(textSize * 0.8)}px)
                      </div>
                      <div className="add-text-btn" style={{
                        position: 'absolute', top: '10px', right: '10px', width: '20px', height: '20px',
                        backgroundColor: '#0d9488', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0, transition: 'opacity 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                      }}>
                        <Plus size={13} color="white" />
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB EFFECTS */}
              {editorTab === 'effects' && (
                <div style={{ display: 'flex', flexDirection: 'row', height: '100%', margin: '-10px', backgroundColor: '#18181b' }}>
                  
                  {/* Left Column - Menu Kategori Efek */}
                  <div style={{ width: '36%', borderRight: '1px solid #27272a', padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Kategori
                    </div>
                    {STUDIO_EFFECT_CATEGORIES.map(cat => {
                      const isCatActive = effectCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setEffectCategory(cat.id)}
                          style={{
                            padding: '7px 9px',
                            borderRadius: '6px',
                            backgroundColor: isCatActive ? 'rgba(0, 216, 182, 0.12)' : 'transparent',
                            border: isCatActive ? '1px solid rgba(0, 216, 182, 0.35)' : '1px solid transparent',
                            color: isCatActive ? '#00d8b6' : '#a1a1aa',
                            fontSize: '11px',
                            fontWeight: isCatActive ? 700 : 500,
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => { if (!isCatActive) e.currentTarget.style.backgroundColor = '#27272a'; }}
                          onMouseLeave={e => { if (!isCatActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                          <span style={{ fontSize: '9px', opacity: 0.6, flexShrink: 0 }}>
                            {cat.id === 'all' 
                              ? STUDIO_EFFECTS_LIST.length 
                              : STUDIO_EFFECTS_LIST.filter(e => e.category === cat.id).length}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Column - Grid Kartu Efek */}
                  <div style={{ width: '64%', padding: '10px', backgroundColor: '#111113', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                    
                    {/* Search Input */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Search size={12} style={{ position: 'absolute', left: '9px', color: '#71717a' }} />
                      <input
                        type="text"
                        placeholder="Cari efek..."
                        value={effectSearch}
                        onChange={e => setEffectSearch(e.target.value)}
                        style={{
                          width: '100%',
                          backgroundColor: '#18181b',
                          border: '1px solid #27272a',
                          borderRadius: '6px',
                          padding: '6px 8px 6px 26px',
                          fontSize: '11px',
                          color: '#f4f4f5',
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                      />
                      {effectSearch && (
                        <button onClick={() => setEffectSearch('')} style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', color: '#71717a', cursor: 'pointer' }}>
                          <X size={11} />
                        </button>
                      )}
                    </div>

                    {/* Quick Hint Pill */}
                    <div style={{ padding: '6px 8px', borderRadius: '6px', backgroundColor: '#18181b', border: '1px solid #27272a', fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={12} style={{ color: '#00d8b6', flexShrink: 0 }} />
                      <span>Klik atau tombol <strong style={{ color: '#00d8b6' }}>+</strong> untuk menambahkan efek ke timeline.</span>
                    </div>

                    {/* Grid Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      {STUDIO_EFFECTS_LIST
                        .filter(eff => effectCategory === 'all' || eff.category === effectCategory)
                        .filter(eff => !effectSearch || eff.name.toLowerCase().includes(effectSearch.toLowerCase()) || eff.desc.toLowerCase().includes(effectSearch.toLowerCase()))
                        .map(eff => {
                          const isHovered = hoveredEffectId === eff.id;
                          const isVideoEff = !eff.type;
                          const videoUrl = isVideoEff ? `/assets/Effects/${eff.folder}/${eff.file}` : null;

                          return (
                            <div
                              key={eff.id}
                              onClick={() => handleAddEffectToTimeline(eff)}
                              onMouseEnter={() => setHoveredEffectId(eff.id)}
                              onMouseLeave={() => setHoveredEffectId(null)}
                              title={`${eff.name} - Klik untuk menambahkan ke timeline`}
                              style={{
                                backgroundColor: '#18181b',
                                borderRadius: '8px',
                                border: isHovered ? '1.5px solid #00d8b6' : '1px solid #27272a',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'all 0.15s',
                                boxShadow: isHovered ? '0 4px 14px rgba(0, 216, 182, 0.2)' : 'none'
                              }}
                            >
                              {/* Visual Preview Box */}
                              <div style={{ position: 'relative', height: '62px', backgroundColor: '#09090b', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {/* 1. Base Thumbnail Image */}
                                {isVideoEff ? (
                                  <>
                                    <img
                                      src={getEffectThumbnail(eff)}
                                      alt={eff.name}
                                      style={{
                                        position: 'absolute',
                                        inset: 0,
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        opacity: isHovered ? 0.35 : 0.85,
                                        transition: 'opacity 0.2s ease'
                                      }}
                                    />
                                    {/* 2. Live Moving Video Effect when Hovered with Screen Blend Mode */}
                                    {isHovered && (
                                      <video
                                        src={videoUrl}
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        style={{
                                          position: 'absolute',
                                          inset: 0,
                                          width: '100%',
                                          height: '100%',
                                          objectFit: 'cover',
                                          mixBlendMode: 'screen',
                                          zIndex: 2,
                                          pointerEvents: 'none'
                                        }}
                                      />
                                    )}
                                  </>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: '#00d8b6', opacity: 0.85 }}>
                                    {eff.category === 'filter' ? <Palette size={18} /> : <Activity size={18} />}
                                    <span style={{ fontSize: '8px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      {eff.category === 'filter' ? 'Filter' : 'Motion'}
                                    </span>
                                  </div>
                                )}

                                {/* Folder category badge */}
                                {isVideoEff && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '4px',
                                    left: '4px',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    fontSize: '8px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    backgroundColor: 'rgba(0,0,0,0.75)',
                                    color: eff.folder === 'Fire' ? '#fb923c' : eff.folder === 'Smoke' ? '#a1a1aa' : eff.folder === 'Retro' ? '#f59e0b' : '#c084fc',
                                    border: `1px solid ${eff.folder === 'Fire' ? 'rgba(251,146,60,0.4)' : eff.folder === 'Smoke' ? 'rgba(161,161,170,0.4)' : eff.folder === 'Retro' ? 'rgba(245,158,11,0.4)' : 'rgba(192,132,252,0.4)'}`,
                                    zIndex: 3,
                                    pointerEvents: 'none'
                                  }}>
                                    {eff.folder}
                                  </div>
                                )}

                                {/* Add Button */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleAddEffectToTimeline(eff); }}
                                  title="Tambah ke Timeline"
                                  style={{
                                    position: 'absolute',
                                    bottom: '5px',
                                    right: '5px',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    backgroundColor: '#00d8b6',
                                    color: '#09090b',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: isHovered ? 1 : 0.7,
                                    transition: 'all 0.15s',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                                    zIndex: 10
                                  }}
                                >
                                  <Plus size={13} strokeWidth={3} />
                                </button>
                              </div>

                              {/* Effect Info */}
                              <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: isHovered ? '#00d8b6' : '#e4e4e7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {eff.name}
                                </div>
                                <div style={{ fontSize: '9px', color: '#71717a', lineHeight: 1.2, height: '22px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                  {eff.desc}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB CAPTION */}
              {editorTab === 'caption' && (
                <>
                  <Section title="AI Lyrics Generator">
                    <div className="flex gap-1.5">
                      {[{ id: 'auto', label: 'Auto AI', icon: Wand2 }, { id: 'manual', label: 'Tempel Lirik', icon: FileText }].map(opt => {
                        const Icon = opt.icon;
                        const active = lyricsSource === opt.id;
                        return (
                          <button key={opt.id} onClick={() => setLyricsSource(opt.id)} className={`flex-1 py-1.5 px-1 rounded-lg border flex items-center justify-center gap-1 cursor-pointer transition-all ${active ? 'border-violet-500 bg-violet-500/15 text-violet-400' : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'}`} style={{ fontSize: '10px', fontWeight: 700 }}>
                            <Icon size={11} />{opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {LANGUAGES.map(lang => (
                        <button key={lang.id} onClick={() => setLanguage(lang.id)} className={`py-0.5 px-2 rounded-full border cursor-pointer transition-all ${language === lang.id ? 'border-blue-500 bg-blue-500/15 text-blue-400' : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'}`} style={{ fontSize: '10px', fontWeight: 600 }}>
                          {lang.label}
                        </button>
                      ))}
                    </div>
                    <button onClick={handleGenerate} className="w-full py-2.5 rounded-xl border-0 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-extrabold cursor-pointer flex items-center justify-center gap-1.5 shadow-md mt-1" style={{ fontSize: '11px' }}>
                      <Wand2 size={13} /> Generate Lyrics (AI Sync)
                    </button>
                  </Section>


                </>
              )}

              {/* TAB AUDIO */}
              {editorTab === 'audio' && (
                <>
                  <Section title="Stem Separation (AI)">
                    {!stemGenerated ? (
                      <button onClick={handleGenerateStems} disabled={stemGenerating} className={`w-full py-2.5 rounded-lg border-0 font-bold cursor-pointer flex items-center justify-center gap-2 ${stemGenerating ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 text-white'}`} style={{ fontSize: '11px' }}>
                        {stemGenerating ? <><Loader2 size={13} className="animate-spin" /> Memproses…</> : <><Layers size={13} /> Generate Stem Audio</>}
                      </button>
                    ) : (
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5" style={{ fontSize: '11px' }}><CheckCircle2 size={12} /> Stem berhasil dipisahkan</div>
                    )}
                  </Section>
                  <Section title="Track Mixer"><StemMixer stems={stems} setStems={setStems} /></Section>
                  <Section title="Speed & Pitch">
                    <div className="flex flex-col gap-2">
                      <SliderRow label="Speed" value={speed} min={50} max={150} color="#60a5fa" onChange={v => setSpeed(v)} format={v => `${v}%`} />
                      <SliderRow label="Pitch" value={pitch} min={-12} max={12} color="#f472b6" onChange={v => setPitch(v)} format={v => `${v > 0 ? '+' : ''}${v} st`} />
                      <button onClick={() => { setSpeed(100); setPitch(0); }} className="flex items-center justify-center gap-1 p-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-400 cursor-pointer transition-colors" style={{ fontSize: '10px' }}>
                        <RotateCcw size={11} /> Reset
                      </button>
                    </div>
                  </Section>
                </>
              )}



            </div>
          </div>
          {/* ╚═══════════════════════════════════════════════════╝ */}

          {/* Draggable Divider (Garis Pembatas Sebelah Kiri Menu Preview) */}
          <div onMouseDown={startResizingLeft}
            title="Geser batas panel kiri"
            className={`w-1.5 flex-shrink-0 cursor-col-resize z-20 flex items-center justify-center group transition-colors ${isResizingLeft ? 'bg-[#00d8b6]' : 'bg-transparent hover:bg-zinc-700'}`}>
            <div className={`w-px h-8 rounded ${isResizingLeft ? 'bg-white' : 'bg-zinc-600'}`} />
          </div>

          {/* ╔══ KOLOM TENGAH — Player / Preview (flex-1) ═══════╗ */}
          <div id="preview-container" className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#09090b', borderLeft: '1px solid #27272a', borderRight: '1px solid #27272a' }}>

            {/* Player Toolbar */}
            <div className="flex-shrink-0 h-9 flex items-center justify-between px-3 gap-3" style={{ borderBottom: '1px solid #27272a', backgroundColor: '#09090b', fontFamily: 'Inter, -apple-system, sans-serif' }}>
              <div className="flex items-center h-full border-b-2 border-[#00d8b6] px-1">
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#00d8b6' }}>Preview</span>
              </div>
              
              {/* Aspect Ratio Selector */}
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#a1a1aa', border: '1px solid #27272a', backgroundColor: '#18181b', padding: '2px 8px', borderRadius: '4px' }}>Ratio</span>
                <div style={{ position: 'relative' }}>
                  <select 
                    value={aspectRatio} 
                    onChange={(e) => setAspectRatio(e.target.value)}
                    style={{
                      appearance: 'none',
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      color: '#e4e4e7',
                      padding: '4px 24px 4px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      outline: 'none',
                      fontFamily: 'Inter, -apple-system, sans-serif'
                    }}
                  >
                    {/* Dropdown matched to requested screenshot layout */}
                    <option value="original">Original</option>
                    <optgroup label="Custom">
                      {ASPECT_RATIOS.filter(r => r.id !== 'original').map(r => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </optgroup>
                  </select>
                  <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Black Box */}
            <div className="flex-1 flex items-center justify-center overflow-hidden p-3" style={{ backgroundColor: '#000000' }}>
              <div className="w-full h-full flex items-center justify-center">
                <MultiTrackAudioEngine 
                  tracks={tracks}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  isLooping={isLooping}
                />
                <KaraokePreview
                  isHoverPreview={!!actualHoveredMediaUrl}
                  aspectRatio={aspectRatio}
                  font={font}
                  textSize={textSize}
                  selectedLineIdx={selectedLineIdx}
                  setSelectedLineIdx={setSelectedLineIdx}
                  setLines={setLines}
                  onLineTransform={handleLineTransform}
                  setIsPlaying={setIsPlaying}
                  lines={lines}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  activeVersion={activeVersion}
                  useLyricsVersion={useLyricsVersion}
                  baseTextColor={baseTextColor}
                  baseStrokeColor={baseStrokeColor}
                  activeTextColor={activeTextColor}
                  activeStrokeColor={activeStrokeColor}
                  standardTextColor={standardTextColor}
                  standardStrokeColor={standardStrokeColor}
                  bgType={derivedBgType}
                  bgImageUrl={derivedBgImageUrl}
                  bgVideoUrl={derivedBgVideoUrl}
                  videoRef={videoRef}
                  isProcessing={visualProcessingCount > 0}
                  tracks={tracks}
                  isLooping={isLooping}
                  selectedTrackItemId={selectedTrackItemId}
                  setSelectedTrackItemId={setSelectedTrackItemId}
                  onItemTransform={handleItemTransform}
                  previewZoom={previewZoom}
                  activeTimelineVisualItem={activeTimelineVisualItem}
                />
              </div>
            </div>

            {/* Playback Control Bar */}
            <div className="flex-shrink-0 px-4 py-2" style={{ borderTop: '1px solid #27272a', backgroundColor: '#111113' }}>
              {(audioUrl || actualHoveredMediaUrl || tracks.some(t => (t.items || []).length > 0) || (lines && lines.length > 0)) ? (
                <AudioPlayerBar
                  audioUrl={audioUrl || 'timeline-playback'}
                  isPlaying={actualHoveredMediaUrl ? isHoverPlaying : isPlaying}
                  currentTime={actualHoveredMediaUrl ? hoverCurrentTime : currentTime}
                  duration={actualHoveredMediaUrl ? hoverDuration : duration}
                  onPlayPause={togglePlay}
                  onSeek={seekTo}
                  disabled={visualProcessingCount > 0}
                  previewZoom={previewZoom}
                  setPreviewZoom={setPreviewZoom}
                  tracks={tracks}
                  actualHoveredMediaUrl={actualHoveredMediaUrl}
                />
              ) : (
                <div className="flex items-center justify-center gap-2 py-1 text-zinc-600" style={{ fontSize: '10px' }}>
                  <Music2 size={13} /> Upload audio terlebih dahulu
                </div>
              )}
            </div>
          </div>
          {/* ╚═══════════════════════════════════════════════════╝ */}

          {/* Draggable Divider (Garis Pembatas Sebelah Kanan Preview) */}
          <div onMouseDown={startResizingRight}
            title="Geser batas panel kanan"
            className={`w-1.5 flex-shrink-0 cursor-col-resize z-20 flex items-center justify-center group transition-colors ${isResizingRight ? 'bg-[#00d8b6]' : 'bg-transparent hover:bg-zinc-700'}`}>
            <div className={`w-px h-8 rounded ${isResizingRight ? 'bg-white' : 'bg-zinc-600'}`} />
          </div>

          {/* ╔══ KOLOM KANAN — Panel Kanan ════════════════════════════╗ */}
          <div style={{ width: `${rightWidth}px`, backgroundColor: '#111113', borderLeft: '1px solid #27272a', color: '#d4d4d8', fontSize: '12px', fontFamily: 'Inter, -apple-system, sans-serif' }} className="flex-shrink-0 flex flex-col overflow-hidden">
            
            {selectedTrackItemId ? (
              <>
                {/* Header Tabs */}
                <div className="flex-shrink-0 flex items-center px-2 overflow-x-auto" style={{ backgroundColor: '#09090b', borderBottom: '1px solid #27272a', scrollbarWidth: 'none' }}>
                  {selectedItem?.isEffect ? (
                    <div 
                      onClick={() => setPropertiesTab('Effect')}
                      className="px-3 py-2 text-[13px] font-semibold cursor-pointer whitespace-nowrap text-[#00d8b6] border-b-2 border-[#00d8b6]">
                      Effect
                    </div>
                  ) : (
                    ['Video', 'Audio', 'Speed', 'Animation', 'Adjust'].filter(tab => {
                       if (selectedTrack?.type === 'audio') return tab === 'Audio' || tab === 'Speed';
                       if (selectedTrack?.type === 'image') return tab !== 'Audio' && tab !== 'Speed';
                       return true;
                    }).map((tab) => (
                      <div key={tab} 
                        onClick={() => setPropertiesTab(tab)}
                        className={`px-3 py-2 text-[13px] font-semibold cursor-pointer whitespace-nowrap ${propertiesTab === tab ? 'text-[#00d8b6] border-b-2 border-[#00d8b6]' : 'text-[#71717a] hover:text-[#e4e4e7] border-b-2 border-transparent'}`}>
                        {tab}
                      </div>
                    ))
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto flex flex-col p-4 gap-5" style={{ scrollbarWidth: 'thin' }}>
                  
                  {propertiesTab === 'Effect' && (
                    <div className="flex flex-col gap-5">
                      {/* 1. OPACITY (TRANSPARANSI) */}
                      <div className="flex flex-col gap-3 p-3 rounded-lg" style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm bg-[#00d8b6] flex items-center justify-center">
                              <Check size={11} color="black" strokeWidth={3} />
                            </div>
                            <span className="font-semibold text-[12px] text-white">Opacity (Transparansi)</span>
                          </div>
                          <div className="flex gap-2 text-[#71717a]">
                            <span 
                              title="Reset Opacity ke 100%"
                              className="cursor-pointer hover:text-white font-serif text-[14px] leading-none"
                              onClick={() => {
                                if (selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { opacity: 100 });
                              }}
                            >
                              ◇
                            </span>
                          </div>
                        </div>

                        {/* Slider and value */}
                        <div className="flex items-center gap-3">
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={typeof itemTransform.opacity !== 'undefined' ? itemTransform.opacity : 100} 
                            onChange={e => {
                              if (selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { opacity: Number(e.target.value) });
                            }} 
                            className="flex-1 h-1.5 bg-[#27272a] rounded-lg appearance-none cursor-pointer" 
                            style={{ accentColor: '#00d8b6' }} 
                          />
                          <div className="bg-[#09090b] border border-[#27272a] px-2 py-1 rounded text-[#00d8b6] font-mono text-[11px] w-14 text-center font-bold">
                            {typeof itemTransform.opacity !== 'undefined' ? Math.round(itemTransform.opacity) : 100}%
                          </div>
                        </div>

                        {/* Preset Buttons */}
                        <div className="grid grid-cols-4 gap-1.5 mt-1">
                          {[25, 50, 75, 100].map(pct => {
                            const cur = typeof itemTransform.opacity !== 'undefined' ? Math.round(itemTransform.opacity) : 100;
                            const isActive = cur === pct;
                            return (
                              <button
                                key={pct}
                                onClick={() => {
                                  if (selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { opacity: pct });
                                }}
                                style={{
                                  padding: '4px 0',
                                  borderRadius: '5px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  border: isActive ? '1px solid #00d8b6' : '1px solid #27272a',
                                  backgroundColor: isActive ? 'rgba(0, 216, 182, 0.15)' : '#09090b',
                                  color: isActive ? '#00d8b6' : '#a1a1aa',
                                  transition: 'all 0.15s'
                                }}
                              >
                                {pct}%
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. SPEED (KECEPATAN) */}
                      <div className="flex flex-col gap-3 p-3 rounded-lg" style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm bg-[#00d8b6] flex items-center justify-center">
                              <Check size={11} color="black" strokeWidth={3} />
                            </div>
                            <span className="font-semibold text-[12px] text-white">Speed (Kecepatan Efek)</span>
                          </div>
                          <div className="flex gap-2 text-[#71717a]">
                            <span 
                              title="Reset Speed ke 1.0x"
                              className="cursor-pointer hover:text-white font-serif text-[14px] leading-none"
                              onClick={() => {
                                if (selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { speed: 1 });
                              }}
                            >
                              ◇
                            </span>
                          </div>
                        </div>

                        {/* Slider and value */}
                        <div className="flex items-center gap-3">
                          <input 
                            type="range" 
                            min="0.1" 
                            max="3" 
                            step="0.05"
                            value={typeof itemTransform.speed !== 'undefined' ? itemTransform.speed : 1} 
                            onChange={e => {
                              if (selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { speed: Number(e.target.value) });
                            }} 
                            className="flex-1 h-1.5 bg-[#27272a] rounded-lg appearance-none cursor-pointer" 
                            style={{ accentColor: '#00d8b6' }} 
                          />
                          <div className="bg-[#09090b] border border-[#27272a] px-2 py-1 rounded text-[#00d8b6] font-mono text-[11px] w-14 text-center font-bold">
                            {(typeof itemTransform.speed !== 'undefined' ? itemTransform.speed : 1).toFixed(2)}x
                          </div>
                        </div>

                        {/* Speed Presets */}
                        <div className="grid grid-cols-6 gap-1 mt-1">
                          {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(spd => {
                            const cur = typeof itemTransform.speed !== 'undefined' ? itemTransform.speed : 1;
                            const isActive = Math.abs(cur - spd) < 0.02;
                            return (
                              <button
                                key={spd}
                                onClick={() => {
                                  if (selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { speed: spd });
                                }}
                                style={{
                                  padding: '4px 0',
                                  borderRadius: '5px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  border: isActive ? '1px solid #00d8b6' : '1px solid #27272a',
                                  backgroundColor: isActive ? 'rgba(0, 216, 182, 0.15)' : '#09090b',
                                  color: isActive ? '#00d8b6' : '#a1a1aa',
                                  transition: 'all 0.15s'
                                }}
                              >
                                {spd}x
                              </button>
                            );
                          })}
                        </div>
                        <span className="text-[10px] text-zinc-500 leading-tight">
                          Mengatur laju animasi partikel atau cahaya efek secara real-time.
                        </span>
                      </div>
                    </div>
                  )}

                  {propertiesTab === 'Video' && (
                    <>
                      {/* Sub Tabs */}
                      <div className="flex rounded overflow-hidden" style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}>
                        {['Basic', 'Remove BG', 'Mask', 'Retouch'].map((tab) => (
                          <div key={tab} 
                            onClick={() => setVideoSubTab(tab)}
                            className={`flex-1 text-center py-1.5 text-[11px] font-medium cursor-pointer ${videoSubTab === tab ? 'bg-[#27272a] text-white shadow-sm' : 'text-[#71717a] hover:text-white'}`}>
                            {tab}
                          </div>
                        ))}
                      </div>
                      
                      {videoSubTab === 'Basic' && (
                        <>
                          {/* Transform Section */}
                          <div className="flex flex-col gap-4 mt-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[13px]">Transform</span>
                              <div className="flex gap-2 text-[#71717a]">
                                <RotateCcw size={14} className="cursor-pointer hover:text-white" />
                                <span className="cursor-pointer hover:text-white font-serif text-[14px] leading-none">◇</span>
                              </div>
                            </div>
                            
                            {/* Scale */}
                            <div className="flex flex-col gap-2">
                              <span className="text-[#a1a1aa] text-[11px]">Scale</span>
                              <div className="flex items-center gap-3">
                                <input type="range" min="10" max="300" value={itemTransform.scale} onChange={e => {
                                    if(selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { scale: Number(e.target.value) });
                                }} className="flex-1 h-1.5 bg-[#27272a] rounded-lg appearance-none cursor-pointer" style={{ accentColor: 'white' }} />
                                <div className="bg-[#18181b] border border-[#27272a] px-2 py-1 rounded text-white text-[11px] w-14 text-center">{Math.round(itemTransform.scale)}%</div>
                                <div className="text-[#71717a] hover:text-white cursor-pointer font-serif text-[14px] leading-none" onClick={() => {
                                    if(selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { scale: 100 });
                                }}>◇</div>
                              </div>
                            </div>
                            
                            {/* Uniform scale */}
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[#e2e2e2] text-[12px]">Uniform scale</span>
                              <div className="w-8 h-4 rounded-full bg-[#00d8b6] flex items-center justify-end p-0.5 cursor-pointer">
                                <div className="w-3 h-3 rounded-full bg-white shadow-sm"></div>
                              </div>
                            </div>
                            
                            {/* Position */}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[#a1a1aa] text-[11px]">Position</span>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded px-1 py-1 gap-1">
                                  <span className="text-[#71717a] text-[10px] ml-1">X</span>
                                  <input type="number" value={Math.round(itemTransform.x)} onChange={e => {
                                      if(selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { x: Number(e.target.value) });
                                  }} className="bg-transparent text-white text-[11px] w-10 text-center outline-none border-none" />
                                </div>
                                <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded px-1 py-1 gap-1">
                                  <span className="text-[#71717a] text-[10px] ml-1">Y</span>
                                  <input type="number" value={Math.round(itemTransform.y)} onChange={e => {
                                      if(selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { y: Number(e.target.value) });
                                  }} className="bg-transparent text-white text-[11px] w-10 text-center outline-none border-none" />
                                </div>
                                <div className="text-[#71717a] hover:text-white cursor-pointer ml-1 font-serif text-[14px] leading-none" onClick={() => {
                                    if(selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { x: 0, y: 0 });
                                }}>◇</div>
                              </div>
                            </div>
                            
                            {/* Rotate */}
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[#a1a1aa] text-[11px]">Rotate</span>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded px-2 py-1 w-[72px] justify-center">
                                  <input type="number" value={Math.round(itemTransform.rotate || 0)} onChange={e => {
                                      if(selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { rotate: Number(e.target.value) });
                                  }} className="bg-transparent text-white text-[11px] w-full text-center outline-none border-none" />
                                </div>
                                <div className="w-6 h-6 rounded-full border border-[#3f3f46] flex items-center justify-center cursor-pointer" onClick={() => {
                                    if(selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { rotate: ((itemTransform.rotate || 0) + 90) % 360 });
                                }}>
                                  <RotateCcw size={12} className="text-[#71717a]" />
                                </div>
                                <div className="text-[#71717a] hover:text-white cursor-pointer font-serif text-[14px] leading-none" onClick={() => {
                                    if(selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { rotate: 0 });
                                }}>◇</div>
                              </div>
                            </div>
                            
                            {/* Alignment row */}
                            <div className="flex items-center justify-between bg-[#18181b] border border-[#27272a] rounded py-1.5 px-3 text-[#71717a] mt-2">
                              <AlignLeft size={14} className="hover:text-white cursor-pointer" />
                              <AlignCenter size={14} className="hover:text-white cursor-pointer" />
                              <AlignRight size={14} className="hover:text-white cursor-pointer" />
                              <div className="w-px h-4 bg-[#27272a]"></div>
                              <AlignJustify size={14} className="hover:text-white cursor-pointer" />
                              <MoreHorizontal size={14} className="hover:text-white cursor-pointer" />
                            </div>
                          </div>
                          
                          <div className="h-[1px] bg-[#27272a] w-full my-1" />
                          
                          {/* Blend Section */}
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 rounded-sm bg-[#00d8b6] flex items-center justify-center">
                                  <Check size={10} color="black" strokeWidth={4} />
                                </div>
                                <span className="font-semibold text-[13px]">Blend</span>
                                <ChevronUp size={14} className="text-[#71717a] ml-1" />
                              </div>
                              <div className="flex gap-2 text-[#71717a]">
                                <RotateCcw size={14} className="cursor-pointer hover:text-white" />
                                <span className="cursor-pointer hover:text-white font-serif text-[14px] leading-none">◇</span>
                              </div>
                            </div>
                            
                            {/* Mode */}
                            <div className="flex items-center justify-between">
                              <span className="text-[#a1a1aa] text-[11px] w-16">Mode</span>
                              <div className="flex-1 flex items-center justify-between bg-[#18181b] border border-[#27272a] rounded px-3 py-1.5 cursor-pointer relative">
                                <select value={itemTransform.blendMode || 'normal'} onChange={e => {
                                    if(selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { blendMode: e.target.value });
                                }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                                  <option value="normal">Normal</option>
                                  <option value="multiply">Multiply</option>
                                  <option value="screen">Screen</option>
                                  <option value="overlay">Overlay</option>
                                  <option value="darken">Darken</option>
                                  <option value="lighten">Lighten</option>
                                  <option value="color-dodge">Color Dodge</option>
                                  <option value="color-burn">Color Burn</option>
                                  <option value="hard-light">Hard Light</option>
                                  <option value="soft-light">Soft Light</option>
                                  <option value="difference">Difference</option>
                                  <option value="exclusion">Exclusion</option>
                                </select>
                                <span className="text-[#e2e2e2] text-[11px] capitalize">{itemTransform.blendMode || 'Normal'}</span>
                                <ChevronDown size={14} className="text-[#71717a]" />
                              </div>
                            </div>
                            
                            {/* Opacity */}
                            <div className="flex flex-col gap-2 mt-1">
                              <span className="text-[#a1a1aa] text-[11px]">Opacity</span>
                              <div className="flex items-center gap-3">
                                <input type="range" min="0" max="100" value={typeof itemTransform.opacity !== 'undefined' ? itemTransform.opacity : 100} onChange={e => {
                                    if(selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { opacity: Number(e.target.value) });
                                }} className="flex-1 h-1.5 bg-[#27272a] rounded-lg appearance-none cursor-pointer" style={{ accentColor: 'white' }} />
                                <div className="bg-[#18181b] border border-[#27272a] px-2 py-1 rounded text-white text-[11px] w-14 text-center">{typeof itemTransform.opacity !== 'undefined' ? Math.round(itemTransform.opacity) : 100}%</div>
                                <div className="text-[#71717a] hover:text-white cursor-pointer font-serif text-[14px] leading-none" onClick={() => {
                                    if(selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { opacity: 100 });
                                }}>◇</div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {propertiesTab === 'Audio' && (
                    <>
                      {/* Sub Tabs */}
                      <div className="flex rounded overflow-hidden" style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}>
                        {['Basic', 'Voice changer'].map((tab) => (
                          <div key={tab} 
                            onClick={() => setAudioSubTab(tab)}
                            className={`flex-1 text-center py-1.5 text-[11px] font-medium cursor-pointer ${audioSubTab === tab ? 'bg-[#27272a] text-white shadow-sm' : 'text-[#71717a] hover:text-white'}`}>
                            {tab}
                          </div>
                        ))}
                      </div>

                      {audioSubTab === 'Basic' && (
                        <div className="flex flex-col gap-4 mt-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3.5 h-3.5 rounded-sm bg-[#00d8b6] flex items-center justify-center">
                                <Check size={10} color="black" strokeWidth={4} />
                              </div>
                              <span className="font-semibold text-[13px]">Basic</span>
                              <ChevronUp size={14} className="text-[#71717a] ml-1" />
                            </div>
                            <div className="flex gap-2 text-[#71717a]">
                              <RotateCcw size={14} className="cursor-pointer hover:text-white" />
                              <span className="cursor-pointer hover:text-white font-serif text-[14px] leading-none">◇</span>
                            </div>
                          </div>
                          
                          {/* Volume */}
                          <div className="flex flex-col gap-2 mt-2">
                            <span className="text-[#e2e2e2] text-[11px]">Volume</span>
                            <div className="flex items-center gap-3">
                              <input type="range" min="-60" max="20" value={itemTransform.volume ?? 0} onChange={e => {
                                  if(selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { volume: Number(e.target.value) });
                              }} className="flex-1 h-1.5 bg-[#27272a] rounded-lg appearance-none cursor-pointer" style={{ accentColor: 'white' }} />
                              <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded px-2 py-1 gap-1">
                                <span className="text-[#e2e2e2] text-[11px] w-9 text-right">{(itemTransform.volume ?? 0).toFixed(1)}dB</span>
                                <div className="flex flex-col items-center justify-center ml-1 opacity-60">
                                  <ChevronUp size={8} className="cursor-pointer hover:text-white" />
                                  <ChevronDown size={8} className="-mt-0.5 cursor-pointer hover:text-white" />
                                </div>
                              </div>
                              <div className="text-[#71717a] hover:text-white cursor-pointer font-serif text-[14px] leading-none" onClick={() => {
                                  if(selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { volume: 0 });
                              }}>◇</div>
                            </div>
                          </div>
                          
                          {/* Fade in */}
                          <div className="flex flex-col gap-2 mt-2">
                            <span className="text-[#e2e2e2] text-[11px]">Fade in</span>
                            <div className="flex items-center gap-3">
                              <input type="range" min="0" max="10" step="0.1" value={itemTransform.fadeIn ?? 0} onChange={e => {
                                  if(selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { fadeIn: Number(e.target.value) });
                              }} className="flex-1 h-1.5 bg-[#27272a] rounded-lg appearance-none cursor-pointer" style={{ accentColor: 'white' }} />
                              <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded px-2 py-1 gap-1">
                                <span className="text-[#e2e2e2] text-[11px] w-9 text-right">{(itemTransform.fadeIn ?? 0).toFixed(1)}s</span>
                                <div className="flex flex-col items-center justify-center ml-1 opacity-60">
                                  <ChevronUp size={8} className="cursor-pointer hover:text-white" />
                                  <ChevronDown size={8} className="-mt-0.5 cursor-pointer hover:text-white" />
                                </div>
                              </div>
                              <div className="text-[#71717a] hover:text-white cursor-pointer font-serif text-[14px] leading-none" onClick={() => {
                                  if(selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { fadeIn: 0 });
                              }}>◇</div>
                            </div>
                          </div>

                          {/* Fade out */}
                          <div className="flex flex-col gap-2 mt-2">
                            <span className="text-[#e2e2e2] text-[11px]">Fade out</span>
                            <div className="flex items-center gap-3">
                              <input type="range" min="0" max="10" step="0.1" value={itemTransform.fadeOut ?? 0} onChange={e => {
                                  if(selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { fadeOut: Number(e.target.value) });
                              }} className="flex-1 h-1.5 bg-[#27272a] rounded-lg appearance-none cursor-pointer" style={{ accentColor: 'white' }} />
                              <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded px-2 py-1 gap-1">
                                <span className="text-[#e2e2e2] text-[11px] w-9 text-right">{(itemTransform.fadeOut ?? 0).toFixed(1)}s</span>
                                <div className="flex flex-col items-center justify-center ml-1 opacity-60">
                                  <ChevronUp size={8} className="cursor-pointer hover:text-white" />
                                  <ChevronDown size={8} className="-mt-0.5 cursor-pointer hover:text-white" />
                                </div>
                              </div>
                              <div className="text-[#71717a] hover:text-white cursor-pointer font-serif text-[14px] leading-none">◇</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="h-[1px] bg-[#27272a] w-full my-4" />
                    </>
                  )}

                  {propertiesTab === 'Speed' && (
                    <>
                      {/* Sub Tabs */}
                      <div className="flex rounded overflow-hidden p-0.5" style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}>
                        {['Standard', 'Curve', 'Velocity effects'].map((tab) => (
                          <div key={tab} 
                            onClick={() => setSpeedSubTab(tab)}
                            className={`flex-1 flex items-center justify-center py-1.5 text-[11px] font-medium cursor-pointer rounded ${speedSubTab === tab ? 'bg-[#27272a] text-white shadow-sm' : 'text-[#71717a] hover:text-white'}`}>
                            {tab === 'Velocity effects' && <div className="w-1.5 h-1.5 bg-[#a855f7] rounded-[1px] transform rotate-45 mr-1.5 opacity-90" />}
                            {tab}
                          </div>
                        ))}
                      </div>

                      {speedSubTab === 'Standard' && (
                        <div className="flex flex-col gap-5 mt-4">
                          
                          {/* Speed */}
                          <div className="flex flex-col gap-2">
                            <span className="text-[#e2e2e2] text-[12px]">Speed</span>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 relative flex items-center h-4">
                                {/* Ticks container */}
                                <div className="absolute w-full flex justify-between pointer-events-none px-1">
                                  <div className="w-px h-1.5 bg-[#71717a]" />
                                  <div className="w-px h-1.5 bg-[#71717a]" />
                                  <div className="w-px h-1.5 bg-[#71717a]" />
                                  <div className="w-px h-1.5 bg-[#71717a]" />
                                  <div className="w-px h-1.5 bg-[#71717a]" />
                                </div>
                                <input type="range" min="0.1" max="10" step="0.1" value={itemTransform.speed ?? 1} onChange={e => {
                                    if(selectedTrack) handleItemTransform(selectedTrack.id, selectedItem.id, { speed: Number(e.target.value) });
                                }} className="w-full h-1 bg-[#27272a] rounded-lg appearance-none cursor-pointer relative z-10" style={{ accentColor: '#e2e2e2' }} />
                              </div>
                              <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded px-2 py-1 gap-1">
                                <span className="text-[#00d8b6] text-[11px] w-9 text-right font-medium">{(itemTransform.speed ?? 1).toFixed(2)}x</span>
                                <div className="flex flex-col items-center justify-center ml-1 opacity-60">
                                  <ChevronUp size={8} className="cursor-pointer hover:text-white" />
                                  <ChevronDown size={8} className="-mt-0.5 cursor-pointer hover:text-white" />
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Duration */}
                          <div className="flex flex-col gap-2 mt-1">
                            <span className="text-[#e2e2e2] text-[12px]">Duration</span>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 flex items-center gap-2">
                                <span className="text-[#e2e2e2] text-[11px] min-w-[32px]">67.2s</span>
                                <div className="flex-1 h-[2px] relative flex items-center">
                                  {/* Dashed line */}
                                  <div className="w-full border-t border-dashed border-[#27272a]" />
                                  {/* Arrow head */}
                                  <div className="absolute right-0 w-0 h-0 border-t-[3px] border-l-[4px] border-b-[3px] border-transparent border-l-[#27272a]" />
                                </div>
                              </div>
                              <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded px-2 py-1 gap-1">
                                <span className="text-[#e2e2e2] text-[11px] w-9 text-right">67.2s</span>
                                <div className="flex flex-col items-center justify-center ml-1 opacity-60">
                                  <ChevronUp size={8} className="cursor-pointer hover:text-white" />
                                  <ChevronDown size={8} className="-mt-0.5 cursor-pointer hover:text-white" />
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="h-[1px] bg-[#27272a] w-full my-1" />
                          
                          {/* Change audio pitch */}
                          <div className="flex items-center justify-between">
                            <span className="text-[#e2e2e2] text-[12px]">Change audio pitch</span>
                            <div className="w-8 h-4 rounded-full bg-[#27272a] flex items-center p-0.5 cursor-pointer">
                              <div className="w-3 h-3 rounded-full bg-white shadow-sm"></div>
                            </div>
                          </div>
                          
                        </div>
                      )}
                      
                    </>
                  )}
                </div>
              </>
            ) : (selectedLineIdx !== null || editorTab === 'text') ? (
              <div id="text-properties-panel" className="flex-1 flex flex-col overflow-hidden">
                {/* Text Properties Header */}
                <div className="flex-shrink-0 flex items-center px-2 overflow-x-auto" style={{ backgroundColor: '#09090b', borderBottom: '1px solid #27272a', scrollbarWidth: 'none' }}>
                  <div className="px-3 py-2 text-[13px] font-semibold cursor-pointer whitespace-nowrap text-[#00d8b6] border-b-2 border-[#00d8b6]">
                    Text
                  </div>
                </div>
                
                {/* Text Properties Body */}
                <div className="flex-1 overflow-y-auto flex flex-col p-4 gap-5" style={{ scrollbarWidth: 'thin' }}>
                  {/* LYRIC VERSIONS DENGAN TOMBOL ON/OFF SPESIAL MEMILIH VERSI */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Versi Lirik
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '10px', color: useLyricsVersion ? '#00d8b6' : '#71717a' }}>
                          {useLyricsVersion ? `Khusus Memilih Versi (V${activeVersion} Aktif)` : 'Mode Standar (Versi Nonaktif)'}
                        </p>
                      </div>

                      {/* Tombol ON / OFF Spesial Memilih Versi */}
                      <div 
                        onClick={() => setUseLyricsVersion(prev => !prev)}
                        className="flex items-center gap-2 cursor-pointer select-none px-2 py-1 rounded-md hover:bg-zinc-800/60 transition-colors"
                        title={useLyricsVersion ? "Klik untuk Nonaktifkan Pilihan Versi (Kembali ke Standar)" : "Klik untuk Mengaktifkan Pilihan Versi Lirik"}
                      >
                        <span style={{ fontSize: '10px', fontWeight: 700, color: useLyricsVersion ? '#00d8b6' : '#71717a' }}>
                          {useLyricsVersion ? 'ON' : 'OFF'}
                        </span>
                        <div 
                          className={`w-8 h-4 rounded-full transition-colors flex items-center p-0.5 ${useLyricsVersion ? 'bg-[#00d8b6] justify-end' : 'bg-[#27272a] justify-start'}`}
                        >
                          <div className="w-3 h-3 rounded-full bg-white shadow-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Tombol V1 - V5 */}
                    <div className="flex gap-1 flex-wrap" style={{ opacity: useLyricsVersion ? 1 : 0.45, transition: 'opacity 0.2s' }}>
                      {[1,2,3,4,5].map(vId => (
                        <button 
                          key={vId} 
                          onClick={() => {
                            if (!useLyricsVersion) setUseLyricsVersion(true);
                            switchVersion(vId);
                          }} 
                          title={!useLyricsVersion ? `Klik untuk mengaktifkan & memilih Versi ${vId}` : `Pilih Versi ${vId}`}
                          className={`flex-1 py-1 rounded-lg border cursor-pointer transition-all ${
                            useLyricsVersion && activeVersion === vId 
                              ? 'border-[#00d8b6] bg-[#00d8b6]/15 text-[#00d8b6] font-bold shadow-sm' 
                              : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                          }`} 
                          style={{ fontSize: '10px', fontWeight: 700, minWidth: '44px' }}
                        >
                          V{vId}
                        </button>
                      ))}
                    </div>

                    {/* Info Ringkas Layout Versi */}
                    {useLyricsVersion ? (
                      <div className="text-[10px] text-zinc-400 px-1 flex items-center justify-between">
                        <span>Layout: <strong className="text-[#00d8b6]">
                          {activeVersion === 1 && 'V1 · 3 Baris Karaoke'}
                          {activeVersion === 2 && 'V2 · 1 Baris Bawah Tengah'}
                          {activeVersion === 3 && 'V3 · 2 Baris Bawah Tengah'}
                          {activeVersion === 4 && 'V4 · 1 Baris Tengah Layar'}
                          {activeVersion === 5 && 'V5 · 2 Baris Kiri & Kanan'}
                        </strong></span>
                      </div>
                    ) : (
                      <div className="text-[9.5px] text-zinc-500 italic px-1">
                        Pilihan versi lirik nonaktif. Klik tombol ON atau pilih V1-V5 untuk mengaktifkan.
                      </div>
                    )}

                    {/* Warna Teks Lirik Karaoke (Khusus Versi Lirik Aktif - Digabungkan ke Versi Lirik) */}
                    {useLyricsVersion && (
                      <div className="mt-2 pt-2 border-t border-[#27272a] flex flex-col gap-2">
                        <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#00d8b6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Warna Teks Lirik Karaoke · Versi {activeVersion}
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { key: 'baseTextColor', label: 'Text Dasar', val: baseTextColor },
                            { key: 'baseStrokeColor', label: 'Stroke Dasar', val: baseStrokeColor },
                            { key: 'activeTextColor', label: 'Text Aktif (Highlight)', val: activeTextColor },
                            { key: 'activeStrokeColor', label: 'Stroke Aktif', val: activeStrokeColor },
                          ].map(item => (
                            <div key={item.key} className="flex flex-col gap-1">
                              <span style={{ fontSize: '9px', color: '#71717a' }}>{item.label}</span>
                              <div className="flex items-center gap-1.5">
                                <input type="color" value={item.val} onChange={e => updateCurrentVersionColor(item.key, e.target.value)} className="w-6 h-6 rounded cursor-pointer p-0" style={{ border: 'none', background: 'none' }} />
                                <span style={{ fontSize: '9px', color: '#a1a1aa', fontFamily: 'monospace' }}>{item.val}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Kecepatan Text (Animasi) - Digabungkan ke Versi Lirik */}
                        <div className="mt-2 pt-2 border-t border-[#27272a] flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                                <path d="M1 5H11M11 5L7 1.5M11 5L7 8.5" stroke="#00d8b6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#00d8b6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Kecepatan Text (Animasi)
                              </span>
                            </div>
                            {selectedLineIdx !== null && lines[selectedLineIdx] ? (
                              <div className="flex items-center gap-1 bg-[#111113] rounded px-1.5 py-0.5 border border-zinc-700">
                                <input type="number" step="0.1" 
                                  value={lines[selectedLineIdx].animDuration !== undefined ? lines[selectedLineIdx].animDuration : +(lines[selectedLineIdx].end - lines[selectedLineIdx].start).toFixed(1)}
                                  onChange={e => setLines(prev => prev.map((l, idx) => {
                                    if (idx !== selectedLineIdx) return l;
                                    const maxDur = +(l.end - l.start).toFixed(1);
                                    const d = Math.min(maxDur, Math.max(0.1, parseFloat(e.target.value) || 0.1));
                                    return { ...l, animDuration: d };
                                  }))}
                                  className="w-8 bg-transparent text-right text-zinc-100 font-semibold outline-none" style={{ fontSize: '10px' }} />
                                <span style={{ fontSize: '10px', color: '#a1a1aa' }}>s</span>
                              </div>
                            ) : (
                              <span className="text-[9px] text-[#71717a]">Pilih baris teks</span>
                            )}
                          </div>
                          {selectedLineIdx !== null && lines[selectedLineIdx] && (
                            <>
                              <div className="flex items-center">
                                <input type="range" min="0.1" max={+(lines[selectedLineIdx].end - lines[selectedLineIdx].start).toFixed(1)} step="0.1" 
                                  value={lines[selectedLineIdx].animDuration !== undefined ? lines[selectedLineIdx].animDuration : +(lines[selectedLineIdx].end - lines[selectedLineIdx].start).toFixed(1)}
                                  onChange={e => setLines(prev => prev.map((l, idx) => {
                                    if (idx !== selectedLineIdx) return l;
                                    const d = parseFloat(e.target.value);
                                    return { ...l, animDuration: d };
                                  }))}
                                  style={{
                                    width: '100%',
                                    height: '4px',
                                    background: '#3f3f46',
                                    borderRadius: '2px',
                                    appearance: 'none',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    accentColor: '#00d8b6'
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '8.5px', color: '#71717a' }}>
                                Mengatur panjang panah animasi teks per second di timeline
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* FORMAT & PENGATURAN TEKS */}
                  <Section title={selectedLineIdx !== null && lines[selectedLineIdx] ? `Format Teks #${selectedLineIdx + 1}` : 'Format Teks'}>
                    <div className="p-2.5 rounded-xl flex flex-col gap-2.5" style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}>
                      
                      {/* Isi Teks jika baris sedang dipilih */}
                      {selectedLineIdx !== null && lines[selectedLineIdx] && (
                        <div className="flex flex-col gap-1">
                          <span style={{ fontSize: '9px', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Isi Teks</span>
                          <input 
                            value={lines[selectedLineIdx].text}
                            onChange={e => setLines(prev => prev.map((l, idx) => idx === selectedLineIdx ? { ...l, text: e.target.value } : l))}
                            className="w-full p-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100 outline-none focus:border-amber-400 font-semibold" 
                            style={{ fontSize: '11px' }} 
                          />
                        </div>
                      )}

                      {/* Pemilihan Warna Standar di Format Teks jika Versi Lirik OFF */}
                      {!useLyricsVersion && (
                        <div className="flex flex-col gap-1.5 mt-0.5 p-2 rounded-lg bg-[#111113] border border-[#27272a]">
                          <div className="flex items-center justify-between">
                            <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#00d8b6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Pemilihan Warna Teks
                            </span>
                            <span style={{ fontSize: '9px', color: '#71717a' }}>Mode Standar</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-0.5">
                            <div className="flex flex-col gap-1">
                              <span style={{ fontSize: '9px', color: '#a1a1aa' }}>Warna Teks</span>
                              <div className="flex items-center gap-1.5">
                                <input 
                                  type="color" 
                                  value={(selectedLineIdx !== null && lines[selectedLineIdx]?.color) || standardTextColor} 
                                  onChange={e => handleStandardTextColorChange(e.target.value)} 
                                  className="w-6 h-6 rounded cursor-pointer p-0" 
                                  style={{ border: 'none', background: 'none' }} 
                                />
                                <span style={{ fontSize: '9px', color: '#f4f4f5', fontFamily: 'monospace' }}>
                                  {(selectedLineIdx !== null && lines[selectedLineIdx]?.color) || standardTextColor}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span style={{ fontSize: '9px', color: '#a1a1aa' }}>Warna Stroke (Outline)</span>
                              <div className="flex items-center gap-1.5">
                                <input 
                                  type="color" 
                                  value={(selectedLineIdx !== null && lines[selectedLineIdx]?.strokeColor) || standardStrokeColor} 
                                  onChange={e => handleStandardStrokeColorChange(e.target.value)} 
                                  className="w-6 h-6 rounded cursor-pointer p-0" 
                                  style={{ border: 'none', background: 'none' }} 
                                />
                                <span style={{ fontSize: '9px', color: '#f4f4f5', fontFamily: 'monospace' }}>
                                  {(selectedLineIdx !== null && lines[selectedLineIdx]?.strokeColor) || standardStrokeColor}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Font Selector */}
                      <div className="flex items-center justify-between relative mt-1">
                        <span style={{ fontSize: '10px', color: '#a1a1aa' }}>Font</span>
                        <div 
                          onClick={() => setShowFontDropdown(!showFontDropdown)}
                          className="flex items-center justify-between border rounded-md px-2 py-1.5 cursor-pointer w-48 transition-colors"
                          style={{ backgroundColor: '#18181b', borderColor: '#27272a' }}
                        >
                          <span style={{ fontSize: '11px', color: '#f4f4f5', fontFamily: (selectedLineIdx !== null && lines[selectedLineIdx]?.font) ? lines[selectedLineIdx].font : (font === 'System' ? 'inherit' : font) }}>
                            {(selectedLineIdx !== null && lines[selectedLineIdx]?.font) || font}
                          </span>
                          <ChevronDown size={12} className="text-zinc-500" />
                        </div>
                        
                        {/* Dropdown Menu */}
                        {showFontDropdown && (
                          <div className="absolute top-full right-0 mt-1 w-52 rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden" style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}>
                            <div className="p-2" style={{ borderBottom: '1px solid #27272a' }}>
                              <div className="flex items-center rounded-md px-2 py-1.5" style={{ backgroundColor: '#111113', border: '1px solid #27272a' }}>
                                <Search size={12} className="text-zinc-500 mr-2" />
                                <input 
                                  type="text" 
                                  placeholder="Cari font..." 
                                  value={fontSearch}
                                  onChange={e => setFontSearch(e.target.value)}
                                  className="bg-transparent border-none outline-none text-zinc-300 w-full" 
                                  style={{ fontSize: '11px' }} 
                                />
                              </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto p-1 flex flex-col gap-0.5">
                              {FONTS.filter(f => f.toLowerCase().includes(fontSearch.toLowerCase())).map(f => {
                                const isCurrentFont = (selectedLineIdx !== null && lines[selectedLineIdx]?.font === f) || font === f;
                                return (
                                  <div key={f} 
                                    onClick={() => handleFontChange(f)}
                                    className="flex items-center justify-between px-2.5 py-2 hover:bg-zinc-800 rounded-md cursor-pointer group transition-colors"
                                  >
                                    <span style={{ fontSize: '12px', color: isCurrentFont ? '#00d8b6' : '#e4e4e7', fontFamily: f === 'System' ? 'inherit' : f, fontWeight: isCurrentFont ? 700 : 400 }}>
                                      {f}
                                    </span>
                                    {isCurrentFont && <Check size={12} className="text-[#00d8b6]" />}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Ukuran Text (Font Size) */}
                      <div className="flex flex-col gap-1.5 mt-1">
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: '10px', color: '#a1a1aa' }}>Ukuran Text</span>
                          <div className="flex items-center bg-[#111113] border border-[#27272a] rounded px-1.5 py-0.5 gap-1">
                            <input 
                              type="number" 
                              min="10" 
                              max="120" 
                              value={(selectedLineIdx !== null && lines[selectedLineIdx]?.fontSize) || textSize}
                              onChange={e => handleFontSizeChange(e.target.value)}
                              className="w-7 bg-transparent text-right text-white text-[11px] outline-none font-semibold"
                            />
                            <span style={{ fontSize: '10px', color: '#71717a' }}>px</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input 
                            type="range" 
                            min="10" 
                            max="80" 
                            value={(selectedLineIdx !== null && lines[selectedLineIdx]?.fontSize) || textSize}
                            onChange={e => handleFontSizeChange(e.target.value)}
                            className="flex-1 h-1.5 bg-[#27272a] rounded-lg appearance-none cursor-pointer"
                            style={{ accentColor: '#00d8b6' }}
                          />
                        </div>

                        {/* Quick preset pills */}
                        <div className="flex gap-1 mt-0.5">
                          {[14, 18, 24, 32, 44, 56].map(sz => {
                            const activeSize = (selectedLineIdx !== null && lines[selectedLineIdx]?.fontSize === sz) || (!lines[selectedLineIdx]?.fontSize && textSize === sz);
                            return (
                              <button
                                key={sz}
                                onClick={() => handleFontSizeChange(sz)}
                                style={{
                                  flex: 1,
                                  padding: '2px 0',
                                  borderRadius: '4px',
                                  fontSize: '9px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  border: '1px solid',
                                  borderColor: activeSize ? '#00d8b6' : '#27272a',
                                  backgroundColor: activeSize ? 'rgba(0,216,182,0.1)' : '#111113',
                                  color: activeSize ? '#00d8b6' : '#a1a1aa',
                                  transition: 'all 0.15s'
                                }}
                              >
                                {sz}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Posisi X (Geser Kiri/Kanan) */}
                      <div className="flex flex-col gap-1.5 mt-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <MoveHorizontal size={12} style={{ color: '#00d8b6' }} />
                            <span style={{ fontSize: '10px', color: '#a1a1aa' }}>Posisi X (Geser Kiri/Kanan)</span>
                          </div>
                          <div className="flex items-center bg-[#111113] border border-[#27272a] rounded px-1.5 py-0.5 gap-1">
                            <input 
                              type="number" 
                              min="-400" 
                              max="400" 
                              value={(selectedLineIdx !== null && lines[selectedLineIdx]?.x !== undefined) ? lines[selectedLineIdx].x : 0}
                              onChange={e => handleLinePosChange(e.target.value)}
                              className="w-8 bg-transparent text-right text-white text-[11px] outline-none font-semibold"
                            />
                            <span style={{ fontSize: '10px', color: '#71717a' }}>px</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input 
                            type="range" 
                            min="-300" 
                            max="300" 
                            value={(selectedLineIdx !== null && lines[selectedLineIdx]?.x !== undefined) ? lines[selectedLineIdx].x : 0}
                            onChange={e => handleLinePosChange(e.target.value)}
                            className="flex-1 h-1.5 bg-[#27272a] rounded-lg appearance-none cursor-pointer"
                            style={{ accentColor: '#00d8b6' }}
                          />
                          <button
                            onClick={() => handleLinePosChange(0)}
                            title="Kembali ke posisi tengah (0px)"
                            style={{
                              padding: '2px 7px',
                              borderRadius: '4px',
                              border: '1px solid #27272a',
                              backgroundColor: '#111113',
                              color: '#a1a1aa',
                              fontSize: '9.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#00d8b6'; e.currentTarget.style.borderColor = '#00d8b6'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#a1a1aa'; e.currentTarget.style.borderColor = '#27272a'; }}
                          >
                            Reset 0
                          </button>
                        </div>
                      </div>

                      {/* Terapkan ke semua baris button */}
                      <button
                        onClick={handleApplyToAll}
                        style={{
                          marginTop: '4px',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: '1px solid #27272a',
                          backgroundColor: '#111113',
                          color: '#a1a1aa',
                          fontSize: '10px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#00d8b6'; e.currentTarget.style.color = '#00d8b6'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272a'; e.currentTarget.style.color = '#a1a1aa'; }}
                      >
                        Terapkan Font, Ukuran & Posisi ke Semua Teks
                      </button>
                    </div>
                  </Section>

                  {/* SIMPAN TEXT */}
                  <Section title="Simpan Text">
                    <div className="flex gap-2">
                      <button onClick={async () => {
                        if (lines.length === 0) return alert('Belum ada data lirik');
                        const lrcContent = generateLRC(lines, title || 'Karaoke', artist || '');
                        if (window.require) {
                          const { ipcRenderer } = window.require('electron');
                          const res = await ipcRenderer.invoke('save-karaoke-lyrics', { filename: `${title || 'karaoke'}.lrc`, data: lrcContent, format: 'lrc' });
                          if (res.success) alert(`File LRC disimpan:\n${res.filePath}`);
                        } else {
                          const blob = new Blob([lrcContent], { type: 'text/plain;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a'); a.href = url; a.download = `${title || 'karaoke'}.lrc`; a.click(); URL.revokeObjectURL(url);
                        }
                      }} className="flex-1 py-2 px-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-colors" style={{ fontSize: '10px' }}>
                        <Download size={12} /> .LRC
                      </button>
                      <button onClick={async () => {
                        if (lines.length === 0) return alert('Belum ada data lirik');
                        const jsonContent = JSON.stringify({ title, artist, duration, lines }, null, 2);
                        if (window.require) {
                          const { ipcRenderer } = window.require('electron');
                          const res = await ipcRenderer.invoke('save-karaoke-lyrics', { filename: `${title || 'karaoke'}.json`, data: jsonContent, format: 'json' });
                          if (res.success) alert(`File JSON disimpan:\n${res.filePath}`);
                        } else {
                          const blob = new Blob([jsonContent], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a'); a.href = url; a.download = `${title || 'karaoke'}.json`; a.click(); URL.revokeObjectURL(url);
                        }
                      }} className="flex-1 py-2 px-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-colors" style={{ fontSize: '10px' }}>
                        <Download size={12} /> .JSON
                      </button>
                    </div>
                  </Section>

                  {/* DAFTAR LIRIK */}
                  <Section title="Daftar Baris Text">
                    <LyricsEditor lines={lines} setLines={setLines} selectedLineIdx={selectedLineIdx} setSelectedLineIdx={setSelectedLineIdx} font={font} textSize={textSize} />
                  </Section>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-shrink-0 h-9 flex items-center px-4" style={{ borderBottom: '1px solid #27272a', backgroundColor: '#09090b' }}>
                  <span className="text-[#00d8b6] text-[13px] font-semibold tracking-wide">Details</span>
                </div>
                
                <div className="flex-1 overflow-y-auto flex flex-col p-4 gap-5" style={{ scrollbarWidth: 'thin' }}>
                  <div className="flex flex-col gap-3.5">
                    <div className="flex gap-2">
                      <span className="w-[120px] text-[#71717a]">Name:</span>
                      <span className="flex-1 font-medium">{title || 'SHIFA YT'}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-[120px] text-[#71717a]">Path:</span>
                      <span className="flex-1 font-medium truncate" title={`C:/Users/SERVERAO/AppData/Local/CapCut/User Data/Projects/com.lveditor.draft/${title || 'SHIFA YT'}`}>
                        C:/Users/SERVERAO/AppData/Local/...
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-[120px] text-[#71717a]">Color space</span>
                      <span className="flex-1 font-medium">Rec. 709 SDR</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-[120px] text-[#71717a]">Imported media:</span>
                      <span className="flex-1 font-medium">Stay in original location</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="w-[120px] text-[#71717a] flex items-center gap-1.5">
                        Arrange layers 
                        <span className="flex items-center justify-center w-3 h-3 rounded-full border border-[#71717a] text-[9px] cursor-help" title="Turned on by default">?</span>
                      </span>
                      <span className="flex-1 font-medium">Turned on</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="w-[120px] text-[#71717a] flex items-center gap-1.5">
                        Proxy: 
                        <span className="flex items-center justify-center w-3 h-3 rounded-full border border-[#71717a] text-[9px] cursor-help" title="Turned off by default">?</span>
                      </span>
                      <span className="flex-1 font-medium">Turned off</span>
                    </div>
                  </div>
                  
                  <div className="h-[1px] bg-[#27272a] w-full" />
                  
                  <div className="flex flex-col gap-3.5">
                    <div className="flex gap-2">
                      <span className="w-[120px] text-[#71717a]">Timeline name</span>
                      <span className="flex-1 font-medium">Timeline 01</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-[120px] text-[#71717a]">Aspect ratio:</span>
                      <span className="flex-1 font-medium">{aspectRatio === 'original' ? '16:9' : aspectRatio}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-[120px] text-[#71717a]">Resolution:</span>
                      <span className="flex-1 font-medium">Adapted</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-[120px] text-[#71717a]">Frame rate:</span>
                      <span className="flex-1 font-medium">30.00fps</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          {/* ╚═══════════════════════════════════════════════════╝ */}

        </div>

        {/* ═══ WORKSPACE BAWAH — TIMELINE (Pro CapCut Style) ═══════════════════ */}
        {/* Resizer Handle */}
        <div 
           onMouseDown={startResizingTimeline} 
           style={{ height: '6px', cursor: 'row-resize', backgroundColor: isResizingTimeline ? '#3b82f6' : 'transparent', zIndex: 110, marginTop: '-3px', position: 'relative' }} 
        />
        <div className="flex-shrink-0" style={{ height: `${timelineHeight}px`, backgroundColor: '#09090b', borderTop: '1px solid #27272a' }} onClick={() => { setHoveredMediaUrl(null); setHoveredMediaName(null); setHoveredMediaType(null); setIsHoverPlaying(false); }}>

          {/* Timeline Toolbar */}
          <div className="flex items-center px-4 flex-shrink-0" style={{ height: '36px', backgroundColor: '#111113', borderBottom: '1px solid #27272a', justifyContent: 'space-between' }}>
            {/* Left Tools */}
            <div className="flex items-center gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
              {/* 1. Undo (Ctrl+Z) */}
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="Undo (Ctrl+Z)"
                className={`flex items-center justify-center w-7 h-7 rounded transition-all ${
                  historyIndex > 0
                    ? 'bg-[#18181b] text-zinc-200 hover:bg-[#27272a] hover:text-white border border-[#27272a] cursor-pointer'
                    : 'text-zinc-600 border border-transparent cursor-not-allowed opacity-40'
                }`}
              >
                <Undo2 size={14} />
              </button>

              {/* 2. Reset / Redo (Ctrl+Shift+Z) */}
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="Reset / Redo (Ctrl+Shift+Z)"
                className={`flex items-center justify-center w-7 h-7 rounded transition-all ${
                  historyIndex < history.length - 1
                    ? 'bg-[#18181b] text-zinc-200 hover:bg-[#27272a] hover:text-white border border-[#27272a] cursor-pointer'
                    : 'text-zinc-600 border border-transparent cursor-not-allowed opacity-40'
                }`}
              >
                <RotateCcw size={14} />
              </button>

              <div style={{ width: '1px', height: '14px', backgroundColor: '#27272a', margin: '0 2px' }} />

              {/* 3. Split ][ (Ctrl+B) */}
              <button
                onClick={handleSplitUniversal}
                disabled={!canSplitUniversal}
                title="Split di posisi jarum playhead (Ctrl+B)"
                className={`flex items-center justify-center w-7 h-7 rounded transition-all ${
                  canSplitUniversal
                    ? 'bg-[#18181b] text-zinc-100 hover:bg-[#27272a] hover:text-white border border-[#27272a] cursor-pointer shadow-sm'
                    : 'text-zinc-600 border border-transparent cursor-not-allowed opacity-40'
                }`}
              >
                <span style={{ fontSize: '13px', fontWeight: 900, color: canSplitUniversal ? '#38bdf8' : 'inherit', letterSpacing: '0.5px' }}>][</span>
              </button>

              {/* 4. Delete Left [ (Ctrl+Q) */}
              <button
                onClick={handleDeleteLeft}
                disabled={!canDeleteLeft}
                title="Hapus bagian kiri klip di posisi playhead [ (Ctrl+Q)"
                className={`flex items-center justify-center w-7 h-7 rounded transition-all ${
                  canDeleteLeft
                    ? 'bg-[#18181b] text-zinc-100 hover:bg-[#27272a] hover:text-white border border-[#27272a] cursor-pointer shadow-sm'
                    : 'text-zinc-600 border border-transparent cursor-not-allowed opacity-40'
                }`}
              >
                <span style={{ fontSize: '14px', fontWeight: 900, color: canDeleteLeft ? '#ef4444' : 'inherit' }}>[</span>
              </button>

              {/* 5. Delete Right ] (Ctrl+W) */}
              <button
                onClick={handleDeleteRight}
                disabled={!canDeleteRight}
                title="Hapus bagian kanan klip di posisi playhead ] (Ctrl+W)"
                className={`flex items-center justify-center w-7 h-7 rounded transition-all ${
                  canDeleteRight
                    ? 'bg-[#18181b] text-zinc-100 hover:bg-[#27272a] hover:text-white border border-[#27272a] cursor-pointer shadow-sm'
                    : 'text-zinc-600 border border-transparent cursor-not-allowed opacity-40'
                }`}
              >
                <span style={{ fontSize: '14px', fontWeight: 900, color: canDeleteRight ? '#ef4444' : 'inherit' }}>]</span>
              </button>

              <div style={{ width: '1px', height: '14px', backgroundColor: '#27272a', margin: '0 2px' }} />

              {/* 6. Add Marker (M) */}
              <button
                onClick={handleAddMarker}
                title="Tambah Marker di posisi playhead (M)"
                className="flex items-center justify-center w-7 h-7 rounded transition-all bg-[#18181b] text-zinc-200 hover:bg-[#27272a] hover:text-white border border-[#27272a] cursor-pointer"
              >
                <Bookmark size={14} style={{ color: '#38bdf8' }} />
              </button>

              {/* ── Contextual Audio Menu: Auto Mark Beats ── */}
              {selectedTrackItem && (selectedTrackItem.trackType === 'audio' || isAudioFile(selectedTrackItem.file)) && (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowBeatMenu(prev => !prev); }}
                    title={`Auto Mark Beats: ${activeBeatMode}`}
                    className="flex items-center gap-1 px-1.5 h-7 rounded transition-all border cursor-pointer"
                    style={{
                      backgroundColor: activeBeatMode !== 'None' ? 'rgba(234, 179, 8, 0.15)' : '#18181b',
                      borderColor: activeBeatMode !== 'None' ? '#eab308' : '#27272a',
                      color: activeBeatMode !== 'None' ? '#eab308' : '#e4e4e7',
                    }}
                  >
                    <Music2 size={13} style={{ color: activeBeatMode !== 'None' ? '#eab308' : '#a1a1aa' }} />
                    <ChevronDown size={10} />
                  </button>
                  {showBeatMenu && (
                    <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 4px)', backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', padding: '4px', zIndex: 9999, minWidth: '135px', boxShadow: '0 6px 20px rgba(0,0,0,0.85)' }}>
                      {['None', 'Beats 1', 'Beats 2'].map(mode => (
                        <div
                          key={mode}
                          onClick={() => handleApplyBeatMarkers(mode)}
                          style={{
                            padding: '6px 10px', fontSize: '11px', cursor: 'pointer', borderRadius: '4px',
                            color: activeBeatMode === mode ? '#eab308' : '#e4e4e7',
                            backgroundColor: activeBeatMode === mode ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                          }}
                          onMouseEnter={e => { if (activeBeatMode !== mode) e.currentTarget.style.backgroundColor = '#27272a'; }}
                          onMouseLeave={e => { if (activeBeatMode !== mode) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <span>{mode}</span>
                          {activeBeatMode === mode && <Check size={12} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Contextual Video Menu: Split Scenes, Transform, Crop ── */}
              {selectedTrackItem && (selectedTrackItem.trackType === 'video' || isVideoFile(selectedTrackItem.file)) && (
                <>
                  <div style={{ width: '1px', height: '14px', backgroundColor: '#27272a', margin: '0 2px' }} />

                  {/* 1. Split Scenes */}
                  <button
                    onClick={handleSplitScenes}
                    disabled={isDetectingScenes}
                    title="Split Scenes: Potong otomatis setiap ada transisi video baru"
                    className={`flex items-center justify-center w-7 h-7 rounded transition-all border cursor-pointer ${
                      isDetectingScenes
                        ? 'bg-purple-950/40 border-purple-500/50 cursor-wait'
                        : 'bg-[#18181b] text-zinc-100 hover:bg-[#27272a] hover:text-white border-[#27272a]'
                    }`}
                  >
                    {isDetectingScenes ? (
                      <Loader2 size={13} className="animate-spin" style={{ color: '#a855f7' }} />
                    ) : (
                      <Scissors size={13} style={{ color: '#a855f7' }} />
                    )}
                  </button>

                  {/* 2. Transform Menu (Mirror, Reverse, Rotate) */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowTransformMenu(prev => !prev); }}
                      title="Transform: Mirror, Reverse, Rotate"
                      className="flex items-center gap-1 px-1.5 h-7 rounded transition-all bg-[#18181b] text-zinc-100 hover:bg-[#27272a] hover:text-white border border-[#27272a] cursor-pointer"
                    >
                      <Layers size={13} style={{ color: (selectedTrackItem?.mirror || selectedTrackItem?.reverse || selectedTrackItem?.rotation) ? '#00d8b6' : '#a1a1aa' }} />
                      <ChevronDown size={10} />
                    </button>
                    {showTransformMenu && (
                      <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 4px)', backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', padding: '4px', zIndex: 9999, minWidth: '145px', boxShadow: '0 6px 20px rgba(0,0,0,0.85)' }}>
                        <div
                          onClick={() => { handleToggleVideoTransform('mirror'); setShowTransformMenu(false); }}
                          style={{ padding: '6px 10px', fontSize: '11px', cursor: 'pointer', borderRadius: '4px', color: '#e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#27272a'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FlipHorizontal size={12} />
                            <span>Mirror</span>
                          </div>
                          {selectedTrackItem?.mirror && <Check size={12} color="#00d8b6" />}
                        </div>

                        <div
                          onClick={() => { handleToggleVideoTransform('reverse'); setShowTransformMenu(false); }}
                          style={{ padding: '6px 10px', fontSize: '11px', cursor: 'pointer', borderRadius: '4px', color: '#e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#27272a'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <RotateCcw size={12} />
                            <span>Reversing clip</span>
                          </div>
                          {selectedTrackItem?.reverse && <Check size={12} color="#00d8b6" />}
                        </div>

                        <div
                          onClick={() => { handleToggleVideoTransform('rotate'); setShowTransformMenu(false); }}
                          style={{ padding: '6px 10px', fontSize: '11px', cursor: 'pointer', borderRadius: '4px', color: '#e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#27272a'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <RotateCw size={12} />
                            <span>Rotate (90°)</span>
                          </div>
                          {selectedTrackItem?.rotation ? <span style={{ fontSize: '10px', color: '#00d8b6', fontWeight: 700 }}>{selectedTrackItem.rotation}°</span> : null}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Crop Video */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowCropMenu(prev => !prev); }}
                      title={`Crop Video ${selectedTrackItem?.crop ? '(' + selectedTrackItem.crop + ')' : ''}`}
                      className="flex items-center gap-1 px-1.5 h-7 rounded transition-all bg-[#18181b] text-zinc-100 hover:bg-[#27272a] hover:text-white border border-[#27272a] cursor-pointer"
                    >
                      <Crop size={13} style={{ color: (selectedTrackItem?.crop && selectedTrackItem.crop !== 'Original') ? '#38bdf8' : '#a1a1aa' }} />
                      <ChevronDown size={10} />
                    </button>
                    {showCropMenu && (
                      <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 4px)', backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', padding: '4px', zIndex: 9999, minWidth: '130px', boxShadow: '0 6px 20px rgba(0,0,0,0.85)' }}>
                        {['Original', '16:9', '9:16', '1:1', '4:5'].map(cr => (
                          <div
                            key={cr}
                            onClick={() => handleSelectCrop(cr)}
                            style={{ padding: '6px 10px', fontSize: '11px', cursor: 'pointer', borderRadius: '4px', color: (selectedTrackItem?.crop || 'Original') === cr ? '#38bdf8' : '#e4e4e7', backgroundColor: (selectedTrackItem?.crop || 'Original') === cr ? 'rgba(56, 189, 248, 0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                            onMouseEnter={e => { if ((selectedTrackItem?.crop || 'Original') !== cr) e.currentTarget.style.backgroundColor = '#27272a'; }}
                            onMouseLeave={e => { if ((selectedTrackItem?.crop || 'Original') !== cr) e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <span>{cr}</span>
                            {(selectedTrackItem?.crop || 'Original') === cr && <Check size={12} />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right Tools */}
            <div className="flex items-center gap-5">
               <div className="flex items-center gap-1 cursor-pointer group" onClick={() => setIsLooping(!isLooping)}>
                 <Repeat size={14} color={isLooping ? "#3b82f6" : "#64748b"} className={isLooping ? "" : "group-hover:text-zinc-400"} />
                 <span style={{ fontSize: '10px', fontWeight: 600, color: isLooping ? "#3b82f6" : "#64748b" }} className={isLooping ? "" : "group-hover:text-zinc-400"}>Loop</span>
               </div>
               
               {/* Zoom Slider */}
               <div className="flex items-center gap-1 ml-2">
                 <span onClick={() => setTimelineZoom(z => Math.max(0, z - 5))} style={{ color: '#a1a1aa', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '0 4px', userSelect: 'none' }}>−</span>
                 <div 
                   onMouseDown={(e) => {
                     e.preventDefault();
                     const rect = e.currentTarget.getBoundingClientRect();
                     const updateZoom = (clientX) => {
                       const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
                       const pct = x / rect.width;
                       setTimelineZoom(+(pct * 100).toFixed(0));
                     };
                     updateZoom(e.clientX);
                     const handleMove = (ev) => updateZoom(ev.clientX);
                     const handleUp = () => {
                       window.removeEventListener('mousemove', handleMove);
                       window.removeEventListener('mouseup', handleUp);
                     };
                     window.addEventListener('mousemove', handleMove);
                     window.addEventListener('mouseup', handleUp);
                   }}
                   style={{ width: '80px', height: '4px', backgroundColor: '#27272a', borderRadius: '2px', position: 'relative', cursor: 'pointer' }}>
                    <div style={{ position: 'absolute', top: '-4px', left: `${timelineZoom}%`, width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffffff', cursor: 'grab', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
                 </div>
                 <span onClick={() => setTimelineZoom(z => Math.min(100, z + 5))} style={{ color: '#a1a1aa', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '0 4px', userSelect: 'none' }}>+</span>
               </div>
            </div>
          </div>

          {/* Track Headers + Scrollable Track Area */}
          <div style={{ display: 'flex', overflow: 'hidden', height: `calc(${timelineHeight}px - 36px)` }}>

            {/* Scrollable Timeline Tracks */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <TimelineTrack
                tracks={tracks}
                setTracks={setTracks}
                lines={lines}
                setLines={setLines}
                duration={duration}
                currentTime={currentTime}
                onSeek={seekTo}
                selectedLineIdx={selectedLineIdx}
                setSelectedLineIdx={setSelectedLineIdx}
                selectedTrackItemId={selectedTrackItemId}
                setSelectedTrackItemId={setSelectedTrackItemId}
                onRemoveTrack={handleRemoveTrack}
                zoom={timelineZoom}
                setZoom={setTimelineZoom}
                setIsPlaying={setIsPlaying}
                setAudioUrl={setAudioUrl}
                audioRef={audioRef}
                stopMediaBinPreview={stopMediaBinPreview}
                clipboardItem={clipboardItem}
                setClipboardItem={setClipboardItem}
                markers={markers}
                setMarkers={setMarkers}
                useLyricsVersion={useLyricsVersion}
                coverPhotoUrl={coverPhotoUrl}
                setCoverPhotoUrl={setCoverPhotoUrl}
              />
            </div>

          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes floatUp { 0% { transform: translateY(0); opacity: 0.15; } 100% { transform: translateY(-200px); opacity: 0; } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {/* ═══ EXPORT MODAL DIALOG ═══════════════════════════════════════════ */}
      {showExportModal && (
        <div 
          style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onClick={() => {
            if (exportStatus !== 'exporting') setShowExportModal(false);
          }}
        >
          <div 
            style={{
              width: '460px',
              maxWidth: '92vw',
              backgroundColor: '#111113',
              border: '1px solid #27272a',
              borderRadius: '12px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
              padding: '22px 24px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              color: '#f4f4f5'
            }}
            onClick={e => e.stopPropagation()}
          >
            {exportStatus === 'idle' && (
              <div>
                {/* Row 1: Export timeline */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ width: '120px', fontSize: '13px', color: '#a1a1aa' }}>Export timeline</span>
                  <span style={{ fontSize: '13px', color: '#e4e4e7', fontWeight: 500 }}>{exportTimelineName}</span>
                </div>

                {/* Row 2: Name */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ width: '120px', fontSize: '13px', color: '#a1a1aa' }}>Name</span>
                  <input
                    type="text"
                    value={exportName}
                    onChange={e => setExportName(e.target.value)}
                    style={{
                      flex: 1,
                      height: '32px',
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '6px',
                      padding: '0 10px',
                      color: '#ffffff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Row 3: Export to */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '18px' }}>
                  <span style={{ width: '120px', fontSize: '13px', color: '#a1a1aa' }}>Export to</span>
                  <div 
                    onClick={handleBrowseExportDir}
                    title="Klik untuk memilih folder tempat penyimpanan ekspor"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      height: '34px',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background-color 0.15s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#3f3f46';
                      e.currentTarget.style.backgroundColor = '#27272a';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#27272a';
                      e.currentTarget.style.backgroundColor = '#18181b';
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        padding: '0 10px',
                        color: '#ffffff',
                        fontSize: '12.5px',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        userSelect: 'none'
                      }}
                    >
                      {computedExportTo}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '100%',
                        background: '#18181b',
                        borderLeft: '1px solid #27272a',
                        color: '#a1a1aa',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s, color 0.15s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = '#27272a';
                        e.currentTarget.style.color = '#f4f4f5';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = '#18181b';
                        e.currentTarget.style.color = '#a1a1aa';
                      }}
                    >
                      <Folder size={15} />
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', backgroundColor: '#27272a', margin: '16px 0' }} />

                {/* Checkbox: Video */}
                <div 
                  onClick={() => setExportVideo(v => !v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '12px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    border: exportVideo ? '1px solid #0d9488' : '1px solid #3f3f46',
                    backgroundColor: exportVideo ? '#0d9488' : '#18181b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}>
                    {exportVideo && <Check size={11} strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: '13px', color: '#e4e4e7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Video <span style={{ fontSize: '9px', color: '#71717a' }}>▲</span>
                  </span>
                </div>

                {/* Checkbox: Audio */}
                <div 
                  onClick={() => setExportAudio(a => !a)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '20px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    border: exportAudio ? '1px solid #0d9488' : '1px solid #3f3f46',
                    backgroundColor: exportAudio ? '#0d9488' : '#18181b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}>
                    {exportAudio && <Check size={11} strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: '13px', color: '#e4e4e7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Audio <span style={{ fontSize: '9px', color: '#71717a' }}>▲</span>
                  </span>
                </div>

                {/* Bottom buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
                  <button
                    disabled={!canExport}
                    onClick={handleStartExport}
                    style={{
                      padding: '7px 22px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: canExport ? 'pointer' : 'not-allowed',
                      backgroundColor: canExport ? '#0d9488' : '#1e293b',
                      color: canExport ? '#ffffff' : '#64748b',
                      transition: 'background-color 0.15s'
                    }}
                  >
                    Export
                  </button>
                  <button
                    onClick={() => setShowExportModal(false)}
                    style={{
                      padding: '7px 18px',
                      borderRadius: '6px',
                      border: '1px solid #27272a',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      backgroundColor: '#18181b',
                      color: '#d4d4d8',
                      transition: 'background-color 0.15s, border-color 0.15s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = '#27272a';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = '#18181b';
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Loading / Progress View */}
            {exportStatus === 'exporting' && (
              <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                <Loader2 size={36} className="animate-spin text-teal-400 mx-auto mb-3" />
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', color: '#ffffff' }}>
                  Mengekspor {exportVideo && exportAudio ? 'Video & Audio' : exportVideo ? 'Video' : 'Audio'}...
                </h3>
                <p style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '16px' }}>
                  Mohon tunggu, FFmpeg sedang memproses render...
                </p>

                {/* Progress Bar */}
                <div style={{
                  width: '100%', height: '10px', backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '9999px', overflow: 'hidden', marginBottom: '10px'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.max(2, Math.min(100, exportProgress))}%`,
                    background: 'linear-gradient(90deg, #0d9488, #06b6d4)',
                    borderRadius: '9999px',
                    transition: 'width 0.25s ease-out'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
                    {exportTimeText || 'Memproses frame & audio...'}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#2dd4bf' }}>
                    {Math.round(exportProgress)}%
                  </span>
                </div>

                {/* Tombol Cancel / Batalkan Ekspor */}
                <button
                  onClick={handleCancelExport}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 20px',
                    borderRadius: '6px',
                    border: '1px solid #ef4444',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#f87171',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#ef4444';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.color = '#f87171';
                  }}
                >
                  <X size={14} /> Batalkan Ekspor
                </button>
              </div>
            )}

            {/* Completed View */}
            {exportStatus === 'completed' && (
              <div style={{ textAlign: 'center', padding: '12px 6px' }}>
                <CheckCircle2 size={44} className="text-emerald-400 mx-auto mb-2" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                  Ekspor Selesai!
                </h3>
                <p style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '14px' }}>
                  File berhasil disimpan ke direktori:
                </p>

                <div style={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#2dd4bf',
                  wordBreak: 'break-all',
                  textAlign: 'left',
                  marginBottom: '20px'
                }}>
                  {exportResultPath}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <button
                    onClick={handleOpenResultFolder}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 18px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backgroundColor: '#0d9488',
                      color: '#ffffff'
                    }}
                  >
                    <FolderOpen size={15} /> Buka Folder
                  </button>
                  <button
                    onClick={() => {
                      setShowExportModal(false);
                      setExportStatus('idle');
                    }}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '6px',
                      border: '1px solid #27272a',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      backgroundColor: '#18181b',
                      color: '#d4d4d8'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = '#27272a';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = '#18181b';
                    }}
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}

            {/* Error View */}
            {exportStatus === 'error' && (
              <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ef4444', marginBottom: '6px' }}>
                  Gagal Mengekspor
                </h3>
                <p style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '16px' }}>
                  {exportErrorMsg || 'Terjadi kesalahan saat proses render.'}
                </p>
                <button
                  onClick={() => setExportStatus('idle')}
                  style={{
                    padding: '7px 20px',
                    borderRadius: '6px',
                    border: '1px solid #27272a',
                    fontSize: '13px',
                    backgroundColor: '#18181b',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#27272a';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = '#18181b';
                  }}
                >
                  Coba Lagi
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Media Bin Context Menu Popup */}
      {mediaContextMenu && (
        <div
          style={{
            position: 'fixed',
            left: Math.max(8, Math.min(mediaContextMenu.x, window.innerWidth - 180)),
            top: Math.max(8, Math.min(mediaContextMenu.y, window.innerHeight - 165)),
            zIndex: 999999,
            backgroundColor: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '8px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.85)',
            padding: '4px',
            minWidth: '155px',
            userSelect: 'none',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* 1. Salin / Copy */}
          <div
            onClick={() => {
              const target = mediaContextMenu.mediaFile;
              const type = isVideoFile(target) ? 'video' : isImageFile(target) ? 'image' : 'audio';
              const url = target._fileUrl || URL.createObjectURL(target);
              setClipboardItem({
                type,
                data: {
                  file: target,
                  url,
                  name: target.name,
                  start: 0,
                  end: isImageFile(target) ? 5 : 10
                }
              });
              setMediaContextMenu(null);
            }}
            style={{
              padding: '7px 12px',
              fontSize: '12px',
              color: '#e4e4e7',
              cursor: 'pointer',
              borderRadius: '4px',
              transition: 'background 0.1s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#27272a'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Salin (Ctrl+C)
          </div>

          {/* 2. Masukkan ke Timeline */}
          <div
            onClick={() => {
              addToTimeline(mediaContextMenu.mediaFile);
              setMediaContextMenu(null);
            }}
            style={{
              padding: '7px 12px',
              fontSize: '12px',
              color: '#00d8b6',
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: '4px',
              transition: 'background 0.1s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#27272a'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Masukkan ke Timeline
          </div>

          {/* 3. Tempel (Paste) */}
          {clipboardItem && (
            <div
              onClick={() => {
                if (clipboardItem.data?.file) {
                  addToTimeline(clipboardItem.data.file);
                }
                setMediaContextMenu(null);
              }}
              style={{
                padding: '7px 12px',
                fontSize: '12px',
                color: '#e4e4e7',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'background 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#27272a'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Tempel (Ctrl+V)
            </div>
          )}

          <div style={{ height: '1px', backgroundColor: '#27272a', margin: '3px 0' }} />

          {/* 4. Hapus / Delete */}
          <div
            onClick={() => {
              removeFromMedia(mediaContextMenu.mediaFile);
              setMediaContextMenu(null);
            }}
            style={{
              padding: '7px 12px',
              fontSize: '12px',
              color: '#ef4444',
              cursor: 'pointer',
              borderRadius: '4px',
              transition: 'background 0.1s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#27272a'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Hapus (Del)
          </div>
        </div>
      )}

      {/* Hidden video element for MP4 audio playback — Audio API can't handle video containers in Electron */}
      <video
        ref={videoAudioRef}
        style={{ display: 'none', position: 'absolute', pointerEvents: 'none' }}
        playsInline
        preload="metadata"
      />
    </div>
  );
}


function Section({ title, subtitle, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div>
        <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
        {subtitle && <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#71717a' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function SliderRow({ label, value, min, max, color, onChange, format }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '11px', color: '#a1a1aa', width: '48px', flexShrink: 0 }}>{label}</span>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ flex: 1, accentColor: color }} />
      <span style={{ fontSize: '11px', color, width: '48px', textAlign: 'right', fontWeight: 600, flexShrink: 0 }}>
        {format ? format(value) : value}
      </span>
    </div>
  );
}
