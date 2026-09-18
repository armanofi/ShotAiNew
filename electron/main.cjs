const { app, BrowserWindow, session, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegStatic);

const isDev = process.env.NODE_ENV === 'development';
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
app.userAgentFallback = CHROME_UA;

function createWindow() {
  // Set default session User-Agent to pure Chrome (prevents Google 403 disallowed_useragent)
  try {
    session.defaultSession.setUserAgent(CHROME_UA);
  } catch {}

  // Create splash screen
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  splash.loadFile(path.join(__dirname, 'splash.html'));
  splash.center();

  // Create main window (hidden initially)
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      webSecurity: false, // Allow fetch to external URLs (Vercel API)
    },
    autoHideMenuBar: true,
  });

  // Allow all permission requests (microphone, camera, notifications etc)
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  // ──────────────────────────────────────────────────────────────
  // RIGHT-CLICK CONTEXT MENU & POPUP HANDLER
  // ──────────────────────────────────────────────────────────────
  app.on('web-contents-created', (e, contents) => {
    try {
      contents.setBackgroundColor('#09090b');
    } catch {}
    try {
      contents.setUserAgent(CHROME_UA);
    } catch {}

    // Allow Google OAuth popup windows cleanly
    contents.setWindowOpenHandler(({ url }) => {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520,
          height: 650,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          }
        }
      };
    });

    contents.on('context-menu', (event, params) => {
      const contextMenu = Menu.buildFromTemplate([
        { label: 'Potong (Cut)', role: 'cut', enabled: params.editFlags.canCut },
        { label: 'Salin (Copy)', role: 'copy', enabled: params.editFlags.canCopy },
        { label: 'Tempel (Paste)', role: 'paste', enabled: params.editFlags.canPaste },
        { type: 'separator' },
        { label: 'Pilih Semua', role: 'selectAll' },
        { type: 'separator' },
        { label: 'Muat Ulang', role: 'reload' },
        { label: 'Inspect Element', click: () => { contents.inspectElement(params.x, params.y); } },
      ]);
      contextMenu.popup();
    });
  });

  // When main window is ready to show, close splash and show main
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      splash.destroy();
      mainWindow.show();

      // ──────────────────────────────────────────────────────────────
      // AUTO-UPDATE: Check for updates after window is shown
      // ──────────────────────────────────────────────────────────────
      if (!isDev) {
        setupAutoUpdater(mainWindow);
      }
    }, 1500);
  });

  // ──────────────────────────────────────────────────────────────
  // IPC: Open AI Studio in SYSTEM BROWSER (Chrome/Edge) to bypass
  // Google's OAuth block on embedded Electron Chromium.
  // Returns true so renderer can show copy-paste instructions.
  // ──────────────────────────────────────────────────────────────
  ipcMain.handle('open-ai-studio-window', async (event, url) => {
    const targetUrl = url || 'https://aistudio.google.com/app/apikey';
    try {
      await shell.openExternal(targetUrl);
    } catch (err) {
      console.error('Failed to open external browser:', err);
    }
    return true;
  });


  // ──────────────────────────────────────────────────────────────
  // IPC: Check for updates manually (from renderer)
  // ──────────────────────────────────────────────────────────────
  ipcMain.handle('check-for-updates', () => {
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify();
    }
    return true;
  });

  // ──────────────────────────────────────────────────────────────
  // IPC: Save Karaoke Lyrics (.lrc / .json) via Native File System
  // ──────────────────────────────────────────────────────────────
  ipcMain.handle('save-karaoke-lyrics', async (event, { filename, data, format }) => {
    try {
      const fs = require('fs');
      const { filePath } = await dialog.showSaveDialog({
        title: 'Simpan File Lirik Karaoke',
        defaultPath: filename || `karaoke_lyrics.${format === 'lrc' ? 'lrc' : 'json'}`,
        filters: format === 'lrc'
          ? [{ name: 'LRC Subtitle File (*.lrc)', extensions: ['lrc'] }, { name: 'Semua File', extensions: ['*'] }]
          : [{ name: 'JSON Data File (*.json)', extensions: ['json'] }, { name: 'Semua File', extensions: ['*'] }]
      });

      if (filePath) {
        fs.writeFileSync(filePath, data, 'utf-8');
        return { success: true, filePath };
      }
      return { success: false, cancelled: true };
    } catch (err) {
      console.error('IPC Save Error:', err);
      return { success: false, error: err.message };
    }
  });

  // ──────────────────────────────────────────────────────────────
  // IPC: Export Video Karaoke via FFmpeg
  // ──────────────────────────────────────────────────────────────
  ipcMain.handle('export-video', async (event, payload) => {
    try {
      delete require.cache[require.resolve('./export.cjs')];
    } catch(e) {}
    const { handleExportVideo } = require('./export.cjs');
    return await handleExportVideo(event, payload, mainWindow);
  });

  // ──────────────────────────────────────────────────────────────
  // IPC: Export Audio via FFmpeg
  // ──────────────────────────────────────────────────────────────
  ipcMain.handle('export-audio', async (event, payload) => {
    try {
      delete require.cache[require.resolve('./export.cjs')];
    } catch(e) {}
    const { handleExportAudio } = require('./export.cjs');
    return await handleExportAudio(event, payload, mainWindow);
  });

  // ──────────────────────────────────────────────────────────────
  // IPC: Cancel Active Export
  // ──────────────────────────────────────────────────────────────
  ipcMain.handle('cancel-export', async () => {
    try {
      const { cancelExport } = require('./export.cjs');
      return cancelExport();
    } catch (e) {
      console.error('Cancel Export IPC Error:', e);
      return { success: false, error: e.message };
    }
  });

  // ──────────────────────────────────────────────────────────────
  // IPC: Export Directory Helpers & Shell Open
  // ──────────────────────────────────────────────────────────────
  ipcMain.handle('get-default-export-dir', async () => {
    try {
      const v = app.getPath('videos');
      if (v && fs.existsSync(v)) return v;
    } catch (e) {}
    try {
      const d = app.getPath('downloads');
      if (d && fs.existsSync(d)) return d;
    } catch (e) {}
    try {
      const doc = app.getPath('documents');
      if (doc && fs.existsSync(doc)) return doc;
    } catch (e) {}
    return os.homedir();
  });

  ipcMain.handle('choose-export-directory', async (event, defaultDir) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
      let startPath = defaultDir;
      if (!startPath || !fs.existsSync(startPath)) {
        try {
          const v = app.getPath('videos');
          if (v && fs.existsSync(v)) startPath = v;
        } catch(e) {}
      }
      if (!startPath || !fs.existsSync(startPath)) {
        try {
          const d = app.getPath('downloads');
          if (d && fs.existsSync(d)) startPath = d;
        } catch(e) {}
      }
      if (!startPath || !fs.existsSync(startPath)) {
        startPath = os.homedir();
      }

      const result = await dialog.showOpenDialog(win, {
        title: 'Pilih Tempat Penyimpanan Ekspor (Folder)',
        defaultPath: startPath,
        properties: ['openDirectory', 'createDirectory']
      });
      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return null;
      }
      return result.filePaths[0];
    } catch (err) {
      console.error('IPC choose-export-directory error:', err);
      return null;
    }
  });

  ipcMain.handle('open-folder', async (event, filePath) => {
    try {
      if (filePath && fs.existsSync(filePath)) {
        shell.showItemInFolder(filePath);
        return { success: true };
      } else if (filePath) {
        const dir = path.dirname(filePath);
        if (fs.existsSync(dir)) {
          shell.openPath(dir);
          return { success: true };
        }
      }
    } catch (err) {
      console.error('IPC open-folder error:', err);
    }
    return { success: false };
  });


  // ──────────────────────────────────────────────────────────────
  // IPC: Open Native Media File Dialog (more reliable than web input in Electron)
  // ──────────────────────────────────────────────────────────────
  ipcMain.handle('open-media-dialog', async (event) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Pilih File Media',
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'File Media', extensions: ['mp4','mov','webm','mkv','avi','wmv','flv','m4v','3gp','mp3','m4a','wav','flac','aac','aif','aiff','ogg','opus','wma','weba','jpg','jpeg','png','webp','gif'] },
          { name: 'Video', extensions: ['mp4','mov','webm','mkv','avi','wmv','flv','m4v','3gp'] },
          { name: 'Audio', extensions: ['mp3','m4a','wav','flac','aac','aif','aiff','ogg','opus','wma','weba'] },
          { name: 'Gambar', extensions: ['jpg','jpeg','png','webp','gif'] },
          { name: 'Semua File', extensions: ['*'] }
        ]
      });
      if (result.canceled) return [];
      return result.filePaths;
    } catch (err) {
      console.error('IPC open-media-dialog Error:', err);
      return [];
    }
  });

  // ──────────────────────────────────────────────────────────────
  // IPC: FFmpeg Thumbnail Extraction (Fast, In-Memory, 1 frame per 40s)
  // ──────────────────────────────────────────────────────────────
  ipcMain.handle('extract-thumbnails', async (event, { filePath, duration, sourceStart = 0, interval = 40 }) => {
    return new Promise(async (resolve) => {
      try {
        if (!filePath || !fs.existsSync(filePath)) return resolve([]);

        const safeDur = Math.max(1, Number(duration) || 10);
        const sStart = Math.max(0, Number(sourceStart) || 0);
        const step = Math.max(10, Number(interval) || 40); // 40 detik per frame sesuai permintaan user

        const frameItems = [];
        const numChunks = Math.min(15, Math.ceil(safeDur / step));
        for (let i = 0; i < numChunks; i++) {
          const tStart = i * step;
          const tEnd = Math.min(safeDur, (i + 1) * step);
          const weight = Math.max(1, tEnd - tStart);
          const time = sStart + tStart + 0.5;
          frameItems.push({ time, weight });
        }
        if (frameItems.length === 0) frameItems.push({ time: sStart + 0.5, weight: safeDur });

        const extractOne = (time) => new Promise((res) => {
          const { spawn } = require('child_process');
          const p = spawn(ffmpegStatic, [
            '-ss', String(time.toFixed(2)),
            '-i', filePath,
            '-frames:v', '1',
            '-vf', 'scale=160:-1',
            '-q:v', '5',
            '-f', 'image2pipe',
            'pipe:1'
          ]);

          const chunks = [];
          p.stdout.on('data', c => chunks.push(c));
          p.on('close', (code) => {
            if (code === 0 && chunks.length > 0) {
              const buf = Buffer.concat(chunks);
              res(`data:image/jpeg;base64,${buf.toString('base64')}`);
            } else {
              res(null);
            }
          });
          p.on('error', () => res(null));

          // 3 second safety timeout per frame
          setTimeout(() => {
            try { p.kill(); } catch(e) {}
            res(null);
          }, 3000);
        });

        const results = await Promise.all(frameItems.map(async (item) => {
          const url = await extractOne(item.time);
          if (!url) return null;
          return { url, weight: item.weight };
        }));
        const validThumbs = results.filter(Boolean);
        resolve(validThumbs);
      } catch (err) {
        console.error('[extract-thumbnails error]', err);
        resolve([]);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────
  // IPC: FFmpeg Waveform Extraction (Raw PCM 4000Hz to Base64)
  // ──────────────────────────────────────────────────────────────
  ipcMain.handle('extract-waveform', async (event, { filePath }) => {
    return new Promise((resolve) => {
      try {
        if (!filePath || !fs.existsSync(filePath)) return resolve('');
        const { spawn } = require('child_process');
        
        const ffmpegProcess = spawn(ffmpegStatic, [
          '-i', filePath,
          '-f', 'f32le',       // Output raw Float32 Little Endian
          '-ac', '1',          // Mono
          '-ar', '4000',       // 4000 Hz sample rate (captures speech, vocals, and full musical dynamics)
          '-map', '0:a:0?',    // Only select audio track if it exists
          'pipe:1'             // Output to stdout
        ]);

        const chunks = [];
        ffmpegProcess.stdout.on('data', (chunk) => chunks.push(chunk));

        ffmpegProcess.on('error', (err) => {
          console.error('[FFmpeg Waveform Spawn Error]', err);
          resolve('');
        });

        ffmpegProcess.on('close', (code) => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer.toString('base64')); // Send to UI
        });

        // 15s timeout
        setTimeout(() => {
          try { ffmpegProcess.kill(); } catch(e) {}
          const buffer = Buffer.concat(chunks);
          resolve(buffer.toString('base64'));
        }, 15000);
      } catch (e) {
        console.error('[extract-waveform exception]', e);
        resolve('');
      }
    });
  });

  // ──────────────────────────────────────────────────────────────
  // IPC: FFmpeg Scene Transition Detection (Optimal & Adaptive)
  // ──────────────────────────────────────────────────────────────
  ipcMain.handle('detect-scenes', async (event, { filePath, start = 0, duration, threshold = 0.10 }) => {
    return new Promise(async (resolve) => {
      try {
        if (!filePath || !fs.existsSync(filePath)) return resolve([]);
        const { spawn } = require('child_process');

        const safeStart = Math.max(0, Number(start) || 0);
        const safeDur = Math.max(0.5, Number(duration) || 10);
        const primaryThresh = Math.max(0.05, Math.min(0.5, Number(threshold) || 0.10));

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
          p.stderr.on('data', chunk => {
            stderrData += chunk.toString();
          });

          p.on('error', (err) => {
            console.error('[detect-scenes error]', err);
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

          // 60s timeout per pass
          setTimeout(() => {
            try { p.kill(); } catch(e) {}
            res([]);
          }, 60000);
        });

        // Pass 1: Primary optimal threshold (0.10)
        let cuts = await runDetection(primaryThresh);

        // Pass 2: Adaptive fallback (0.07) if no cuts detected on videos longer than 3s
        if ((!cuts || cuts.length === 0) && safeDur >= 3.0) {
          cuts = await runDetection(0.07);
        }

        resolve(cuts || []);
      } catch (err) {
        console.error('[detect-scenes exception]', err);
        resolve([]);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────
  // IPC: Isolate Voice (Remove Vocal / Keep Vocal)
  // ──────────────────────────────────────────────────────────────
  ipcMain.handle('isolate-audio', async (event, { filePath, mode }) => {
    return new Promise((resolve) => {
      try {
        if (!filePath || !fs.existsSync(filePath)) {
          return resolve({ success: false, error: 'File audio tidak ditemukan.' });
        }

        const outDir = path.join(app.getPath('temp'), 'shotai_isolated');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        const ext = path.extname(filePath) || '.mp3';
        const base = path.basename(filePath, ext);
        const suffix = mode === 'remove-vocal' ? 'no_vocal' : 'vocals_only';
        const outPath = path.join(outDir, `${base}_${suffix}_${Date.now()}.mp3`);

        let audioFilter = '';
        if (mode === 'remove-vocal') {
          audioFilter = '[0:a]asplit=2[mid][side];[mid]lowpass=f=200[bass];[side]pan=stereo|c0=0.5*c0-0.5*c1|c1=0.5*c1-0.5*c0[nobass];[bass][nobass]amix=inputs=2:weights=1 1';
        } else {
          audioFilter = 'stereotools=slev=0.015625:mlev=1.8,highpass=f=130,lowpass=f=7500';
        }

        const { spawn } = require('child_process');
        const proc = spawn(ffmpegStatic, [
          '-y',
          '-i', filePath,
          '-filter_complex', audioFilter,
          '-b:a', '320k',
          outPath
        ]);

        proc.stderr.on('data', () => {});
        proc.on('error', (err) => {
          console.error('[Isolate Audio Spawn Error]', err);
          resolve({ success: false, error: err.message });
        });

        proc.on('close', (code) => {
          if (code === 0 && fs.existsSync(outPath)) {
            resolve({
              success: true,
              filePath: outPath,
              fileUrl: `file:///${outPath.replace(/\\/g, '/')}`,
              name: `${base} (${mode === 'remove-vocal' ? 'No Vocal' : 'Vocals Only'}).mp3`
            });
          } else {
            const fallbackFilter = mode === 'remove-vocal' ? 'pan=stereo|c0=c0-c1|c1=c1-c0' : 'stereotools=slev=0:mlev=2';
            const fb = spawn(ffmpegStatic, [
              '-y', '-i', filePath, '-af', fallbackFilter, '-b:a', '320k', outPath
            ]);
            fb.on('close', (fCode) => {
              if (fCode === 0 && fs.existsSync(outPath)) {
                resolve({
                  success: true,
                  filePath: outPath,
                  fileUrl: `file:///${outPath.replace(/\\/g, '/')}`,
                  name: `${base} (${mode === 'remove-vocal' ? 'No Vocal' : 'Vocals Only'}).mp3`
                });
              } else {
                resolve({ success: false, error: `Gagal memproses audio (exit code ${fCode})` });
              }
            });
          }
        });
      } catch (err) {
        console.error('[Isolate Audio Error]', err);
        resolve({ success: false, error: err.message });
      }
    });
  });

  // ──────────────────────────────────────────────────────────────
  // IPC: Auto Album & Model Render Router (Golden Requiem, etc.)
  // ──────────────────────────────────────────────────────────────
  const getAutoAlbumModule = () => {
    try {
      delete require.cache[require.resolve('./auto_album.cjs')];
    } catch(e) {}
    return require('./auto_album.cjs');
  };

  ipcMain.handle('render-tracklist-mix', async (event, payload) => {
    const mod = getAutoAlbumModule();
    return new Promise((resolve) => {
      mod.renderTracklistMixVideo(payload, (err, res) => {
        if (err) resolve({ success: false, error: err.message });
        else resolve(res || { success: true, outputPath: payload?.outputPath });
      });
    });
  });

  ipcMain.handle('render-model-video', async (event, payload) => {
    const mod = getAutoAlbumModule();
    const { selectedModel, userImagePath, audioPath, outputPath } = payload || {};
    if (selectedModel === 'golden_requiem') {
      return new Promise((resolve) => {
        mod.renderGoldenRequiemVideo(userImagePath, audioPath, outputPath, (err, res) => {
          if (err) resolve({ success: false, error: err.message });
          else resolve(res || { success: true, outputPath });
        });
      });
    }
    return { success: false, error: `Model visualizer '${selectedModel}' belum didukung.` };
  });

  ipcMain.handle('generate-auto-album', async (event, payload) => {
    const mod = getAutoAlbumModule();
    const selectedModel = (payload && (payload.selectedModel || payload.effectType)) || 'ambient-blur';
    if (selectedModel === 'golden_requiem' && payload && payload.singleTrackMode) {
      return new Promise((resolve) => {
        mod.renderGoldenRequiemVideo(payload.coverImagePath, payload.audioPath, payload.outputPath, (err, res) => {
          if (err) resolve({ success: false, error: err.message });
          else resolve(res || { success: true, outputPath: payload.outputPath });
        });
      });
    }
    return mod.handleGenerateAutoAlbum(event, payload, mainWindow);
  });

  ipcMain.handle('cancel-auto-album', async () => {
    const mod = getAutoAlbumModule();
    return mod.cancelAutoAlbum();
  });

  ipcMain.handle('pick-auto-album-folder', async () => {
    let startPath = '';
    try { startPath = app.getPath('videos'); } catch(e) {}
    if (!startPath || !fs.existsSync(startPath)) {
      try { startPath = app.getPath('downloads'); } catch(e) {}
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Pilih Folder Penyimpanan Auto Album',
      defaultPath: startPath,
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    return { success: true, folderPath: result.filePaths[0] };
  });

  // IPC: Auto-Prompting AI Image Generator (Tied to Layouts V1 - V5)
  ipcMain.handle('generate-ai-image', async (event, payload) => {
    try {
      const { generateAiImage } = require('./ai_prompter.cjs');
      const res = await generateAiImage(payload);
      return res;
    } catch (err) {
      console.error('[generate-ai-image error]', err);
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('get-layout-ai-prompt', async (event, payload) => {
    try {
      const { getLayoutAiPrompt, buildAiImagePrompt } = require('./ai_prompter.cjs');
      const layoutKey = payload?.layout || 'layout1';
      const keywords = payload?.keywords || '';
      const promptInfo = getLayoutAiPrompt(layoutKey);
      const combinedPrompt = buildAiImagePrompt(layoutKey, keywords);
      return { success: true, promptInfo, combinedPrompt };
    } catch (err) {
      console.error('[get-layout-ai-prompt error]', err);
      return { success: false, error: err.message || String(err) };
    }
  });

  // IPC: Real Audio Beat & BPM Analyzer
  ipcMain.handle('analyze-audio-beat', async (event, payload) => {
    try {
      const { analyzeAudioBeat } = require('./beat_analyzer.cjs');
      const audioPath = typeof payload === 'string' ? payload : (payload?.filePath || payload?.audioPath);
      const res = await analyzeAudioBeat(audioPath);
      return { success: true, ...res };
    } catch (err) {
      console.error('[analyze-audio-beat error]', err);
      return { success: false, error: err.message || String(err), bpm: 125, interval: 0.48, mode: 'fallback' };
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ──────────────────────────────────────────────────────────────
// AUTO-UPDATE SETUP
// ──────────────────────────────────────────────────────────────
function setupAutoUpdater(mainWindow) {
  // Configure auto-updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdate] Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdate] Update available:', info.version);
    // Notify renderer that update is downloading
    mainWindow.webContents.send('update-status', {
      status: 'downloading',
      version: info.version,
      message: `Versi baru ${info.version} ditemukan! Sedang mengunduh...`
    });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdate] App is up to date.');
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[AutoUpdate] Download progress: ${Math.round(progress.percent)}%`);
    mainWindow.webContents.send('update-status', {
      status: 'downloading',
      percent: Math.round(progress.percent),
      message: `Mengunduh update: ${Math.round(progress.percent)}%`
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdate] Update downloaded:', info.version);
    mainWindow.webContents.send('update-status', {
      status: 'ready',
      version: info.version,
      message: `Update ${info.version} siap diinstal!`
    });

    // Show dialog to user
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Tersedia',
      message: `ShotAi versi ${info.version} sudah diunduh.`,
      detail: 'Aplikasi akan restart untuk menginstal update. Klik OK untuk restart sekarang.',
      buttons: ['Restart Sekarang', 'Nanti'],
      defaultId: 0,
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  autoUpdater.on('error', (error) => {
    console.error('[AutoUpdate] Error:', error.message);
  });

}

app.whenReady().then(() => {
  // Allow fetch to all external URLs (needed for Vercel API license check)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:"]
      }
    });
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
