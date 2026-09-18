let electron = null;
let dialog = null;
let app = null;
let shell = null;
let BrowserWindow = null;

try {
  electron = require('electron');
  if (electron) {
    dialog = electron.dialog || electron.remote?.dialog;
    app = electron.app || electron.remote?.app;
    shell = electron.shell || electron.remote?.shell;
    BrowserWindow = electron.BrowserWindow || electron.remote?.BrowserWindow;
  }
} catch (e) {}

const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const os = require('os');

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

const {
  LAYOUT_AI_PROMPTS,
  getLayoutAiPrompt,
  buildAiImagePrompt,
  generateBackgroundPrompt,
  generateThumbnailPrompt,
  generateAiImage
} = require('./ai_prompter.cjs');

const { analyzeAudioBeat } = require('./beat_analyzer.cjs');

let activeAlbumCmd = null;
let activeAlbumOutputPath = null;

function cancelAutoAlbum() {
  if (activeAlbumCmd) {
    try {
      activeAlbumCmd.kill('SIGKILL');
    } catch (err) {
      console.warn('[cancelAutoAlbum kill error]', err);
    }
    activeAlbumCmd = null;
  }
  if (activeAlbumOutputPath && fs.existsSync(activeAlbumOutputPath)) {
    try {
      fs.unlinkSync(activeAlbumOutputPath);
    } catch (e) {}
    activeAlbumOutputPath = null;
  }
  return { success: true, canceled: true };
}

// Map dropdown effect names to actual filenames in assets/Effects/
const TRACKLIST_EFFECTS_MAP = {
  'none': null,
  'atmospheric': 'atmospheric.mp4',
  'fire-embers': 'fire embers flying particles.mp4',
  'fire-particles': 'fire particles.mp4',
  'fire-sparks': 'fire sparks.mp4',
  'old-film-grain': 'old film grain.mp4',
  'smoke-effect': 'smoke effect.mp4',
  // Linght category mappings
  'linght-blaze-sparks': 'Blaze sparks.mp4',
  'linght-bokeh-rays': 'Bokeh Rays.mp4',
  'linght-chroma-flows': 'Chroma Flows.mp4',
  'linght-cold-leak': 'Cold Leak.mp4',
  'linght-film-passion': 'Film Passion.mp4',
  'linght-frost-light': 'Frost Light.mp4',
  'linght-fuzzy': 'Fuzzy.mp4',
  'linght-glowing-mystery': 'Glowing Mystery.mp4',
  'linght-grainy-spots': 'Grainy Spots.mp4',
  'linght-heart-bokeh': 'Heart Bokeh.mp4',
  'linght-heart-haze': 'Heart Haze.mp4',
  'linght-hive-matrik': 'Hive Matrik.mp4',
  'linght-lightning-battle': 'Lightning Battle.mp4',
  'linght-bokeh': 'Linght Bokeh.mp4',
  'linght-neon-sunlight': 'Neaon Sunglight.mp4',
  'linght-neon-sunglight': 'Neaon Sunglight.mp4',
  'linght-neon-aura': 'Neon Aura.mp4',
  'linght-purple-leak': 'Purple Leak.mp4',
  'linght-reflective': 'Reflective.mp4',
  'linght-sun-dust': 'Sun Dust.mp4',
  'linght-contour-light': 'contour light.mp4',
  'linght-laser': 'laser.mp4',
  'linght-red-leak': 'red leak.mp4',
  'linght-warm-fireflies': 'warm fire files.mp4'
};

function resolveEffectPath(effectName) {
  if (!effectName || effectName === 'none' || effectName === 'None') return null;
  const raw = String(effectName).trim();
  if (fs.existsSync(raw)) {
    return raw;
  }
  const lower = raw.toLowerCase();

  let targetFilename = null;
  if (TRACKLIST_EFFECTS_MAP[raw]) {
    targetFilename = TRACKLIST_EFFECTS_MAP[raw];
  } else if (TRACKLIST_EFFECTS_MAP[lower]) {
    targetFilename = TRACKLIST_EFFECTS_MAP[lower];
  } else if (lower.includes('atmospher')) {
    targetFilename = 'atmospheric.mp4';
  } else if (lower.includes('ember')) {
    targetFilename = 'fire embers flying particles.mp4';
  } else if (lower.includes('spark')) {
    targetFilename = 'fire sparks.mp4';
  } else if (lower.includes('particle')) {
    targetFilename = 'fire particles.mp4';
  } else if (lower.includes('grain') || lower.includes('film') && !lower.includes('passion')) {
    targetFilename = 'old film grain.mp4';
  } else if (lower.includes('smoke')) {
    targetFilename = 'smoke effect.mp4';
  } else {
    targetFilename = raw;
  }

  const candidateDirs = [
    path.join(process.cwd(), 'assets', 'Effects'),
    path.join(process.cwd(), 'assets', 'effects'),
    path.join(process.cwd(), 'assets', 'Linght'),
    path.join(process.cwd(), 'assets', 'linght'),
    path.join(process.cwd(), 'assets'),
    path.join(__dirname, '..', 'assets', 'Effects'),
    path.join(__dirname, '..', 'assets', 'effects'),
    path.join(__dirname, '..', 'assets', 'Linght'),
    path.join(__dirname, '..', 'assets', 'linght'),
    path.join(__dirname, 'assets', 'Effects'),
    path.join(__dirname, 'assets', 'Linght'),
    path.join(__dirname, 'assets')
  ];

  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue;
    const full = path.join(dir, targetFilename);
    if (fs.existsSync(full)) {
      return full;
    }
    // Case-insensitive / extension check
    try {
      const files = fs.readdirSync(dir);
      const match = files.find(f => 
        f.toLowerCase() === targetFilename.toLowerCase() || 
        f.toLowerCase() === (targetFilename + '.mp4').toLowerCase() ||
        f.toLowerCase().replace(/\.[^.]+$/, '') === targetFilename.toLowerCase()
      );
      if (match) return path.join(dir, match);
    } catch (e) {}
  }
  return null;
}

// Helper to locate Golden Requiem and common assets
function resolveAssetPath(filename) {
  const candidateDirs = [
    path.join(process.cwd(), 'assets', 'golden requiem'),
    path.join(process.cwd(), 'assets', 'cyberrage'),
    path.join(process.cwd(), 'assets'),
    path.join(process.cwd(), 'public', 'assets'),
    path.join(process.cwd(), 'public'),
    path.join(process.cwd()),
    path.join(__dirname, '..', 'assets', 'golden requiem'),
    path.join(__dirname, '..', 'assets', 'cyberrage'),
    path.join(__dirname, '..', 'assets'),
    path.join(__dirname, 'assets', 'golden requiem'),
    path.join(__dirname, 'assets', 'cyberrage'),
    path.join(__dirname, 'assets'),
    path.join(__dirname)
  ];
  for (const dir of candidateDirs) {
    const full = path.join(dir, filename);
    if (fs.existsSync(full)) {
      return full;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// REVISI TOTAL: Clean Visual Engine Filtergraph (Tanpa Render Teks FFmpeg)
// ─────────────────────────────────────────────────────────────────────────────
// Layer 0: Background (Photo or Looped Video) & Jedak-Jeduk (Real Audio Beat Sync)
// Layer 1: Efek Video (Screen Blend via gbrp to prevent magenta clashes)
// Layer 2: Visualizer 1:1 (Optional circular user photo + Golden Requiem frame)
// ─────────────────────────────────────────────────────────────────────────────
function buildCleanAutoAlbumComplexFilter(options = {}) {
  const {
    bgInputPad = '0:v',
    audioVisPad = null,
    cover1to1Pad = null,
    effectInputPad = null,
    effectInputPads = [],
    goldenFramePad = null,
    useJedakJeduk = true,
    bpm = 125,
    useVisualizer = true,
    visualizerType = 'neon_waveform',
    visualizerPosX = 0,
    visualizerPosY = 0,
    outputPad = 'vout'
  } = options;

  let filterStr = '';
  const safeBpm = Math.max(60, Math.min(220, Number(bpm) || 125));

  // ── 1. [Layer 0: Background & Jedak-Jeduk] ──
  filterStr += `[${bgInputPad}]scale=1920:1080:force_original_aspect_ratio=increase[bg_scaled];\n`;
  filterStr += `[bg_scaled]crop=1920:1080[bg_cropped];\n`;

  if (useJedakJeduk) {
    // Dynamic sharp kick scale pulse synchronized with the analyzed/selected BPM
    filterStr += `[bg_cropped]scale=w='1920+38*pow(max(0,sin(PI*t*(${safeBpm}/60))),6)':h='1080+21*pow(max(0,sin(PI*t*(${safeBpm}/60))),6)':eval=frame,crop=1920:1080[bg_base];\n`;
  } else {
    filterStr += `[bg_cropped]null[bg_base];\n`;
  }
  let currentLayer = 'bg_base';

  // ── 2. [Layer 1: Efek Video (Screen Blend di Depan Background - Chained Multi-Layer)] ──
  const activePads = Array.isArray(effectInputPads) && effectInputPads.length > 0
    ? effectInputPads
    : (effectInputPad ? [effectInputPad] : []);

  if (activePads.length > 0) {
    activePads.forEach((pad, idx) => {
      filterStr += `[${currentLayer}]format=gbrp[bg_fmt_${idx}];\n`;
      filterStr += `[${pad}]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,format=gbrp[eff_fmt_${idx}];\n`;
      filterStr += `[bg_fmt_${idx}][eff_fmt_${idx}]blend=all_mode=screen:shortest=1,format=yuv420p[bg_eff_${idx}];\n`;
      currentLayer = `bg_eff_${idx}`;
    });
  }

  // ── 3. [Layer 2: Visualizer Audio Efek Tengah (5 Gaya Modern & Estetik)] ──
  if (useVisualizer && audioVisPad) {
    if (visualizerType === 'eq_bars') {
      // Style 2: Dynamic EQ Bars (Equalizer Spektrum Modern)
      filterStr += `[${audioVisPad}]showfreqs=s=1400x500:mode=bar:fscale=log:ascale=cbrt:colors=0x00f2fe|0x4facfe,format=rgba,colorkey=0x000000:0.1:0.1[vis_raw];\n`;
    } else if (visualizerType === 'spectrogram') {
      // Style 3: Cinematic Spectrogram (Heatmap Magma Mengalir)
      filterStr += `[${audioVisPad}]showspectrum=s=1400x450:slide=scroll:mode=combined:color=magma:scale=log:fscale=log:saturation=2,format=rgba,colorkey=0x000000:0.12:0.1,colorchannelmixer=aa=0.88[vis_raw];\n`;
    } else if (visualizerType === 'musical_matrix') {
      // Style 4: Musical Matrix (Constant-Q Transform Not Musik)
      filterStr += `[${audioVisPad}]showcqt=s=1400x380:bar_g=2:bar_v=15:axis=0:tc=0.5:gamma=3:sono_h=0,format=rgba,colorkey=0x000000:0.1:0.1[vis_raw];\n`;
    } else if (visualizerType === 'lissajous') {
      // Style 5: Abstract Lissajous (Laser Vector Stereo Phase)
      filterStr += `[${audioVisPad}]avectorscope=s=700x700:m=lissajous:scale=lin:draw=line:rc=0:gc=216:bc=182:rf=251:gf=191:bf=36:zoom=1.4,format=rgba,colorkey=0x000000:0.1:0.1[vis_raw];\n`;
    } else {
      // Style 1 (Default): Neon Waveform (Garis Neon Glowing Halus)
      filterStr += `[${audioVisPad}]showwaves=s=1920x360:mode=cline:colors=0x00d8b6@0.95|0xfbbf24@0.95:scale=cbrt:draw=full,format=rgba,colorkey=0x000000:0.12:0.1[vis_raw];\n`;
    }
    // Positioning: default centered, supports dynamic offset shift (Atas/Tengah/Bawah/Custom)
    const xExpr = Number(visualizerPosX) !== 0 ? `(W-w)/2+(${Math.round(visualizerPosX)}/100)*W` : `(W-w)/2`;
    const yExpr = Number(visualizerPosY) !== 0 ? `(H-h)/2+(${Math.round(visualizerPosY)}/100)*H` : `(H-h)/2`;
    filterStr += `[${currentLayer}][vis_raw]overlay=${xExpr}:${yExpr}[with_vis];\n`;
    currentLayer = 'with_vis';
  }

  // ── 4. [Layer 3: Visualizer 1:1 (Foto bulat + Bingkai di Depan Gelombang Audio)] ──
  if (useVisualizer && cover1to1Pad) {
    filterStr += `[${cover1to1Pad}]scale=500:500:force_original_aspect_ratio=increase,crop=500:500,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(hypot(X-250,Y-250),245),255,0)'[c_circle];\n`;
    if (useJedakJeduk) {
      filterStr += `[c_circle]scale=w='500+38*pow(max(0,sin(PI*t*(${safeBpm}/60))),6)':h='500+38*pow(max(0,sin(PI*t*(${safeBpm}/60))),6)':eval=frame[c_pulse];\n`;
      filterStr += `[${currentLayer}][c_pulse]overlay=(W-w)/2:(H-h)/2[with_circle];\n`;
    } else {
      filterStr += `[${currentLayer}][c_circle]overlay=(W-w)/2:(H-h)/2[with_circle];\n`;
    }

    if (goldenFramePad && visualizerType === 'golden_requiem') {
      filterStr += `[${goldenFramePad}]scale=700:700,format=rgba[g_frame];\n`;
      filterStr += `[with_circle][g_frame]overlay=(W-w)/2:(H-h)/2[with_vis];\n`;
      currentLayer = 'with_vis';
    } else {
      currentLayer = 'with_circle';
    }
  }

  // Clean finish: No FFmpeg text is added!
  filterStr += `[${currentLayer}]null[${outputPad}];\n`;

  return filterStr;
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Render Function for Clean Auto Album Video
// ─────────────────────────────────────────────────────────────────────────────
function renderCleanAutoAlbumVideo(options, callback) {
  return new Promise((resolve, reject) => {
    try {
      const {
        albumTitle = 'BEST AUTO ALBUM',
        bgSourcePath,
        coverImagePath,
        cover1to1Path,
        audioPath,
        songs = [],
        overlayEffect = 'none',
        overlayEffects = [],
        customOverlayVideoPath = null,
        useVisualizer = false,
        visualizerType = 'neon_waveform',
        visualizerPosX = 0,
        visualizerPosY = 0,
        useVinylPlayer = true,
        vinylModel = 'classic',
        useJedakJeduk = true,
        bpm = 125,
        outputPath,
        totalDuration = null
      } = options || {};

      const resolvedBg = (bgSourcePath && fs.existsSync(bgSourcePath))
        ? bgSourcePath
        : ((coverImagePath && fs.existsSync(coverImagePath)) ? coverImagePath : null);

      if (!resolvedBg) {
        const err = new Error('File background (foto atau video) tidak ditemukan.');
        if (typeof callback === 'function') callback(err);
        return reject(err);
      }

      const hasMultiSongs = Array.isArray(songs) && songs.length > 0;
      if (!hasMultiSongs && (!audioPath || !fs.existsSync(audioPath))) {
        const err = new Error('File audio lagu tidak ditemukan.');
        if (typeof callback === 'function') callback(err);
        return reject(err);
      }

      const cmd = ffmpeg();
      activeAlbumCmd = cmd;
      activeAlbumOutputPath = outputPath;

      // Input 0: Background (Foto atau Video Looping ~20s)
      const isVideoBg = /\.(mp4|mkv|mov|webm|avi|flv)$/i.test(resolvedBg);
      if (isVideoBg) {
        cmd.input(resolvedBg).inputOptions(['-stream_loop', '-1']);
      } else {
        cmd.input(resolvedBg).inputOptions(['-loop', '1']);
      }

      let nextInputIdx = 1;
      let audioConcatFilter = '';
      let targetDuration = totalDuration || 0;

      if (hasMultiSongs) {
        const songInputs = [];
        songs.forEach((s) => {
          cmd.input(s.filePath);
          songInputs.push(`[${nextInputIdx++}:a]`);
          targetDuration += Number(s.duration || 0);
        });
        if (useVisualizer) {
          audioConcatFilter = `${songInputs.join('')}concat=n=${songs.length}:v=0:a=1[amerged];\n[amerged]asplit=2[aout][avis];\n`;
        } else {
          audioConcatFilter = `${songInputs.join('')}concat=n=${songs.length}:v=0:a=1[aout];\n`;
        }
      } else {
        cmd.input(audioPath);
        const aIdx = nextInputIdx++;
        if (useVisualizer) {
          audioConcatFilter = `[${aIdx}:a]asplit=2[aout][avis];\n`;
        } else {
          audioConcatFilter = `[${aIdx}:a]anull[aout];\n`;
        }
      }

      // Input for Overlay Effects (Screen Blend di Depan Background - Chained Multi-Layer)
      const effectInputPads = [];
      const activeEffectPaths = [];

      const rawEffects = Array.isArray(overlayEffects) && overlayEffects.length > 0
        ? overlayEffects
        : (overlayEffect ? [overlayEffect] : []);

      for (const eff of rawEffects) {
        if (!eff || eff === 'none' || eff === 'None') continue;
        if (eff === 'custom') {
          if (customOverlayVideoPath && fs.existsSync(customOverlayVideoPath) && !activeEffectPaths.includes(customOverlayVideoPath)) {
            activeEffectPaths.push(customOverlayVideoPath);
          }
        } else {
          const resolved = resolveEffectPath(eff);
          if (resolved && fs.existsSync(resolved) && !activeEffectPaths.includes(resolved)) {
            activeEffectPaths.push(resolved);
          }
        }
      }

      for (const effPath of activeEffectPaths) {
        const effIdx = nextInputIdx++;
        cmd.input(effPath).inputOptions(['-stream_loop', '-1']);
        effectInputPads.push(`${effIdx}:v`);
      }

      // Input for 1:1 Cover Photo (if visualizer enabled)
      let cover1to1Pad = null;
      let goldenFramePad = null;
      const resolved1to1 = (cover1to1Path && fs.existsSync(cover1to1Path)) 
        ? cover1to1Path 
        : ((coverImagePath && fs.existsSync(coverImagePath)) ? coverImagePath : null);

      if (useVisualizer && resolved1to1) {
        const cIdx = nextInputIdx++;
        cmd.input(resolved1to1).inputOptions(['-loop', '1']);
        cover1to1Pad = `${cIdx}:v`;

        const goldenFramePath = resolveAssetPath('golden requiem.png') || resolveAssetPath('golden_requiem.png');
        if (goldenFramePath) {
          const gfIdx = nextInputIdx++;
          cmd.input(goldenFramePath).inputOptions(['-loop', '1']);
          goldenFramePad = `${gfIdx}:v`;
        }
      }

      const visualFilterChain = buildCleanAutoAlbumComplexFilter({
        bgInputPad: '0:v',
        audioVisPad: useVisualizer ? 'avis' : null,
        cover1to1Pad,
        effectInputPad: effectInputPads[0] || null,
        effectInputPads,
        goldenFramePad,
        useJedakJeduk,
        bpm,
        useVisualizer,
        visualizerType,
        visualizerPosX,
        visualizerPosY,
        outputPad: 'vout'
      });

      const fullComplexFilter = `${audioConcatFilter}${visualFilterChain}`;

      const outputOpts = [
        '-map', '[vout]',
        '-map', '[aout]',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '22',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '320k',
        '-ar', '44100',
        '-movflags', '+faststart'
      ];

      if (targetDuration > 0) {
        outputOpts.push('-t', String(targetDuration.toFixed(2)));
      } else {
        outputOpts.push('-shortest');
      }

      cmd
        .complexFilter(fullComplexFilter)
        .outputOptions(outputOpts)
        .output(outputPath)
        .on('progress', (prog) => {
          if (typeof callback === 'function') {
            callback(null, { type: 'progress', data: prog });
          }
        })
        .on('end', () => {
          activeAlbumCmd = null;
          activeAlbumOutputPath = null;
          if (typeof callback === 'function') {
            callback(null, { success: true, outputPath });
          }
          resolve({ success: true, outputPath });
        })
        .on('error', (err) => {
          activeAlbumCmd = null;
          if (typeof callback === 'function') callback(err);
          reject(err);
        })
        .run();

    } catch (err) {
      activeAlbumCmd = null;
      if (typeof callback === 'function') callback(err);
      reject(err);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main IPC Generation Handler for Auto Album
// ─────────────────────────────────────────────────────────────────────────────
async function handleGenerateAutoAlbum(event, payload, mainWindow) {
  try {
    let win = null;
    try {
      win = (event && event.sender && BrowserWindow && BrowserWindow.fromWebContents ? BrowserWindow.fromWebContents(event.sender) : null) || mainWindow;
    } catch (e) {}

    const {
      albumTitle = 'BEST AUTO ALBUM',
      backgroundType = 'image', // 'image' | 'video'
      bgSourcePath,
      customBgPath,
      coverImagePath,
      cover1to1Path,
      useVisualizer = false,
      visualizerType = 'neon_waveform',
      visualizerPosX = 0,
      visualizerPosY = 0,
      useVinylPlayer = true,
      vinylModel = 'classic',
      useJedakJeduk = true,
      beatMode = 'auto',
      bpm = 125,
      overlayEffect = 'none',
      overlayEffects = [],
      customOverlayVideoPath = null,
      songs = [],
      exportFolder,
      thumbnailBase64
    } = payload || {};

    const activeBg = bgSourcePath || customBgPath || coverImagePath;

    if (!activeBg || !fs.existsSync(activeBg)) {
      return { success: false, error: 'File gambar/video background tidak ditemukan.' };
    }

    if (!Array.isArray(songs) || songs.length === 0) {
      return { success: false, error: 'Daftar lagu kosong. Masukkan minimal 1 lagu.' };
    }

    const validSongs = songs.filter(s => s && s.filePath && fs.existsSync(s.filePath));
    if (validSongs.length === 0) {
      return { success: false, error: 'Tidak ada file audio yang valid di komputer ini.' };
    }

    // Determine target export folder safely
    let targetFolder = exportFolder;
    if (!targetFolder || !fs.existsSync(targetFolder)) {
      try { if (app && app.getPath) targetFolder = app.getPath('videos'); } catch(e) {}
    }
    if (!targetFolder || !fs.existsSync(targetFolder)) {
      try { if (app && app.getPath) targetFolder = app.getPath('downloads'); } catch(e) {}
    }
    if (!targetFolder || !fs.existsSync(targetFolder)) {
      const vPath = path.join(os.homedir(), 'Videos');
      const dPath = path.join(os.homedir(), 'Downloads');
      if (fs.existsSync(vPath)) targetFolder = vPath;
      else if (fs.existsSync(dPath)) targetFolder = dPath;
      else targetFolder = os.homedir();
    }

    // Sanitize filename
    const sanitizedTitle = (albumTitle || 'Auto_Album')
      .replace(/[<>:"/\\|?*]/g, '')
      .trim()
      .substring(0, 80) || 'Auto_Album';

    const timestamp = Date.now();
    const outputVideoName = `${sanitizedTitle}_${timestamp}.mp4`;
    const finalVideoPath = path.join(targetFolder, outputVideoName);
    activeAlbumOutputPath = finalVideoPath;

    // Save thumbnail image alongside video if available
    let finalThumbnailPath = null;
    if (thumbnailBase64 && typeof thumbnailBase64 === 'string') {
      try {
        const thumbData = thumbnailBase64.replace(/^data:image\/\w+;base64,/, '');
        const thumbBuf = Buffer.from(thumbData, 'base64');
        const thumbFileName = `${sanitizedTitle}_${timestamp}_thumbnail.png`;
        finalThumbnailPath = path.join(targetFolder, thumbFileName);
        fs.writeFileSync(finalThumbnailPath, thumbBuf);
      } catch (err) {
        console.warn('[Save thumbnail warning]', err);
      }
    }

    // Calculate Song Durations
    let totalAlbumDuration = 0;
    const processedSongs = [];
    for (let i = 0; i < validSongs.length; i++) {
      const s = validSongs[i];
      let dur = Number(s.duration) || 0;
      if (dur <= 0) {
        dur = await new Promise((res) => {
          ffmpeg.ffprobe(s.filePath, (err, metadata) => {
            if (!err && metadata && metadata.format && metadata.format.duration) {
              res(Number(metadata.format.duration) || 180);
            } else {
              res(180);
            }
          });
        });
      }
      processedSongs.push({
        ...s,
        duration: dur
      });
      totalAlbumDuration += dur;
    }

    // Determine target BPM
    let finalBpm = Number(bpm) || 125;
    if (useJedakJeduk && (beatMode === 'auto' || !finalBpm)) {
      try {
        const beatResult = await analyzeAudioBeat(processedSongs[0].filePath);
        if (beatResult && beatResult.bpm) {
          finalBpm = beatResult.bpm;
        }
      } catch (e) {
        finalBpm = 125;
      }
    } else if (beatMode === 'beats1') {
      finalBpm = 75; // 0.8s interval
    } else if (beatMode === 'beats2') {
      finalBpm = 150; // 0.4s interval
    }

    // Execute render
    const renderRes = await new Promise((resolve, reject) => {
      renderCleanAutoAlbumVideo({
        albumTitle,
        bgSourcePath: activeBg,
        coverImagePath: activeBg,
        cover1to1Path: cover1to1Path || coverImagePath || activeBg,
        songs: processedSongs,
        overlayEffect,
        overlayEffects,
        customOverlayVideoPath,
        useVisualizer,
        visualizerType,
        visualizerPosX,
        visualizerPosY,
        useVinylPlayer,
        vinylModel,
        useJedakJeduk,
        bpm: finalBpm,
        outputPath: finalVideoPath,
        totalDuration: totalAlbumDuration
      }, (err, tick) => {
        if (err) return reject(err);
        if (tick && tick.type === 'progress' && tick.data) {
          const prog = tick.data;
          let percent = 0;
          if (prog.percent) {
            percent = Math.min(100, Math.round(prog.percent));
          } else if (prog.timemark && totalAlbumDuration > 0) {
            const parts = prog.timemark.split(':');
            const curSec = (parseFloat(parts[0]) || 0) * 3600 + (parseFloat(parts[1]) || 0) * 60 + (parseFloat(parts[2]) || 0);
            percent = Math.min(100, Math.round((curSec / totalAlbumDuration) * 100));
          }
          const progressPayload = {
            percent,
            currentTimemark: prog.timemark || '00:00:00',
            totalDuration: totalAlbumDuration
          };
          if (win && win.webContents) {
            win.webContents.send('auto-album-progress', progressPayload);
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auto-album-progress-direct', { detail: progressPayload }));
          }
        }
      }).then(resolve).catch(reject);
    });

    return {
      success: true,
      videoPath: finalVideoPath,
      videoUrl: `file:///${finalVideoPath.replace(/\\/g, '/')}`,
      thumbnailPath: finalThumbnailPath,
      title: albumTitle,
      totalDuration: totalAlbumDuration,
      songCount: processedSongs.length,
      bpm: finalBpm
    };

  } catch (err) {
    console.error('[handleGenerateAutoAlbum Error]', err);
    return {
      success: false,
      error: err.message || 'Terjadi kesalahan sistem saat membuat video Auto Album.'
    };
  }
}

module.exports = {
  buildCleanAutoAlbumComplexFilter,
  buildLightweightAutoAlbumComplexFilter: buildCleanAutoAlbumComplexFilter,
  renderCleanAutoAlbumVideo,
  renderTracklistMixVideo: renderCleanAutoAlbumVideo,
  handleGenerateAutoAlbum,
  cancelAutoAlbum,
  resolveEffectPath,
  resolveAssetPath,
  analyzeAudioBeat
};
