const { dialog } = require('electron');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const os = require('os');

ffmpeg.setFfmpegPath(ffmpegStatic);

let activeExportCmd = null;
let activeExportPath = null;

function cancelExport() {
  if (activeExportCmd) {
    try {
      activeExportCmd.kill('SIGKILL');
    } catch (err) {
      console.warn('Error killing active export process:', err);
    }
    activeExportCmd = null;
  }
  if (activeExportPath && fs.existsSync(activeExportPath)) {
    try {
      fs.unlinkSync(activeExportPath);
    } catch (e) {}
    activeExportPath = null;
  }
  return { success: true, canceled: true };
}

// Helper to escape text for FFmpeg drawtext
function escapeDrawText(text) {
  if (!text) return '';
  return text.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/%/g, '\\%');
}

async function handleExportVideo(event, payload, mainWindow) {
  try {
    const { dialog, BrowserWindow, app, shell } = require('electron');
    const win = (event && event.sender && BrowserWindow.fromWebContents(event.sender)) || mainWindow;

    // Action: Cancel Export
    if (payload && payload.action === 'cancel') {
      return cancelExport();
    }

    // Action: Pick Folder (Native Folder Selection Dialog)
    if (payload && payload.action === 'pick-folder') {
      let startPath = payload.defaultDir;
      if (!startPath || !fs.existsSync(startPath)) {
        try { if (app) startPath = app.getPath('videos'); } catch(e) {}
      }
      if (!startPath || !fs.existsSync(startPath)) {
        try { if (app) startPath = app.getPath('downloads'); } catch(e) {}
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
        return { success: false, canceled: true };
      }
      return { success: true, folderPath: result.filePaths[0] };
    }

    // Action: Get Default Export Directory
    if (payload && payload.action === 'get-default-dir') {
      try {
        if (app) {
          const v = app.getPath('videos');
          if (v && fs.existsSync(v)) return { success: true, defaultDir: v };
        }
      } catch(e) {}
      try {
        if (app) {
          const d = app.getPath('downloads');
          if (d && fs.existsSync(d)) return { success: true, defaultDir: d };
        }
      } catch(e) {}
      return { success: true, defaultDir: os.homedir() };
    }

    // Action: Open Folder and highlight file
    if (payload && payload.action === 'open-folder') {
      const target = payload.filePath;
      if (target && fs.existsSync(target)) {
        shell.showItemInFolder(target);
        return { success: true };
      } else if (target) {
        const dir = path.dirname(target);
        if (fs.existsSync(dir)) {
          shell.openPath(dir);
          return { success: true };
        }
      }
      return { success: false };
    }

    // Action: Export Audio
    if (payload && payload.action === 'export-audio') {
      return await handleExportAudio(event, payload, mainWindow);
    }

    let filePath = payload.outputPath;
    if (!filePath) {
      const saveRes = await dialog.showSaveDialog(win, {
        title: 'Export Video Karaoke',
        defaultPath: `${payload.title || 'karaoke_export'}.mp4`,
        filters: [{ name: 'Video MP4', extensions: ['mp4'] }]
      });
      filePath = saveRes.filePath;
    }

    if (!filePath) return { success: false, canceled: true };

    const outDir = path.dirname(filePath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    return new Promise((resolve, reject) => {
      let command = ffmpeg();
      let inputCount = 0;
      let filterComplex = [];
      
      const videoItems = [];
      const audioItems = [];

      // Extract items
      require('fs').writeFileSync('export_debug.json', JSON.stringify(payload.tracks, null, 2));
      if (payload.tracks) {
        for (const track of payload.tracks) {
          for (const item of track.items) {
            if (item.filePath) {
              if (track.type === 'video') videoItems.push(item);
              if (track.type === 'audio') audioItems.push(item);
            }
          }
        }
      }

      // Determine Output Resolution based on Aspect Ratio
      let outW = 1280;
      let outH = 720;
      if (payload.aspectRatio === '9:16') { outW = 720; outH = 1280; }
      else if (payload.aspectRatio === '1:1') { outW = 720; outH = 720; }
      else if (payload.aspectRatio === '4:3') { outW = 960; outH = 720; }

      // Add Video Input
      let currentVid = '[0:v]';
      if (videoItems.length > 0) {
        const v = videoItems[0];
        command.input(v.filePath);
        if (v.sourceStart) command.inputOptions([`-ss ${v.sourceStart}`]);
        const dur = (v.end - v.start);
        if (dur > 0) command.inputOptions([`-t ${dur}`]);
        
        const scale = (v.transform && v.transform.scale) ? v.transform.scale / 100 : 1;
        let vFilter = `[0:v]scale=${outW}:${outH}:force_original_aspect_ratio=decrease,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2:color=black`;
        
        if (scale > 1) {
            vFilter += `,scale=iw*${scale}:ih*${scale},crop=${outW}:${outH}`;
        } else if (scale < 1) {
            vFilter += `,scale=iw*${scale}:ih*${scale},pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2:color=black`;
        }

        if (v.mirror) {
            vFilter += `,hflip`;
        }
        if (v.rotation === 90) {
            vFilter += `,transpose=1`;
        } else if (v.rotation === 180) {
            vFilter += `,transpose=1,transpose=1`;
        } else if (v.rotation === 270) {
            vFilter += `,transpose=2`;
        }
        
        vFilter += `[vscaled]`;
        filterComplex.push(vFilter);
        currentVid = '[vscaled]';
        
        inputCount++;
      } else {
        // Dummy black video
        command.input(`color=c=black:s=${outW}x${outH}:r=30`)
          .inputFormat('lavfi')
          .inputOptions([`-t ${payload.duration > 0 ? payload.duration : 10}`]);
        inputCount++;
      }

      // Add Audio Inputs
      let audioInputs = [];
      for (const a of audioItems) {
        command.input(a.filePath);
        if (a.sourceStart) command.inputOptions([`-ss ${a.sourceStart}`]);
        const dur = (a.end - a.start);
        if (dur > 0) command.inputOptions([`-t ${dur}`]);
        
        let audioFilter = '';
        if (a.start > 0) audioFilter += `adelay=${Math.round(a.start * 1000)}|${Math.round(a.start * 1000)}`;
        
        if (audioFilter) {
          filterComplex.push(`[${inputCount}:a]${audioFilter}[a${inputCount}]`);
          audioInputs.push(`[a${inputCount}]`);
        } else {
          audioInputs.push(`[${inputCount}:a]`);
        }
        inputCount++;
      }

      // Audio mixing
      let finalAudio = '';
      if (audioInputs.length > 1) {
        filterComplex.push(`${audioInputs.join('')}amix=inputs=${audioInputs.length}:duration=longest[aout]`);
        finalAudio = '[aout]';
      } else if (audioInputs.length === 1) {
        const match = audioInputs[0].match(/^\[(\d+:[a-z]+)\]$/);
        if (match) {
          finalAudio = match[1];
        } else {
          finalAudio = audioInputs[0];
        }
      }

      // Text Overlays (ASS Karaoke)
      if (payload.lines && payload.lines.length > 0) {
        const assPath = require('path').join(__dirname, 'temp_karaoke.ass');
        const {
          font,
          baseTextColor,
          baseStrokeColor,
          activeTextColor,
          activeStrokeColor,
          version
        } = payload.style || {};

        const hexToAss = (h, fallback = '&H00FFFFFF') => {
          if (!h) return fallback;
          let hex = h.replace('#', '').trim();
          if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
          if (hex.length === 8) {
            const r = hex.substring(0, 2);
            const g = hex.substring(2, 4);
            const b = hex.substring(4, 6);
            const a = hex.substring(6, 8);
            const alphaNum = parseInt(a, 16);
            const assAlpha = (255 - alphaNum).toString(16).padStart(2, '0');
            return `&H${assAlpha}${b}${g}${r}`;
          }
          if (hex.length !== 6) return fallback;
          return `&H00${hex.substring(4,6)}${hex.substring(2,4)}${hex.substring(0,2)}`;
        };

        const primaryActive = hexToAss(activeTextColor, '&H000000FF');   // default red
        const strokeActive  = hexToAss(activeStrokeColor, '&H00FFFFFF');  // default white
        const primaryBase   = hexToAss(baseTextColor, '&H00FFFFFF');     // default white
        const strokeBase    = hexToAss(baseStrokeColor, '&H00FF0000');   // default blue
        const transparentColor = '&HFFFFFFFF'; // 100% transparent for un-sung characters in Active layer

        let fontName = font || 'Arial';
        if (fontName === 'System') fontName = 'Arial';

        let fontSize = Math.round(52 * (outW / 1280));
        let outlineWidth = +(1.5 * (outW / 1280)).toFixed(1);

        let assStr = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${outW}\nPlayResY: ${outH}\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n`;

        const variants = [
          { name: 'V1', align: 8, marginL: 10, marginR: 10, marginV: 80 },
          { name: 'V2', align: 2, marginL: 10, marginR: 10, marginV: 80 },
          { name: 'V3', align: 2, marginL: 10, marginR: 10, marginV: 80 },
          { name: 'V4', align: 5, marginL: 10, marginR: 10, marginV: 0 },
          { name: 'V5L', align: 4, marginL: 40, marginR: 40, marginV: 0 },
          { name: 'V5R', align: 6, marginL: 40, marginR: 40, marginV: 0 },
        ];

        for (const v of variants) {
          // Layer 0 Base Style: baseTextColor with baseStrokeColor
          assStr += `Style: Base_${v.name},${fontName},${fontSize},${primaryBase},${primaryBase},${strokeBase},&H00000000,-1,0,0,0,100,100,0,0,1,${outlineWidth},0,${v.align},${v.marginL},${v.marginR},${v.marginV},1\n`;
          // Layer 1 Active Style: activeTextColor with activeStrokeColor (Secondary is transparent)
          assStr += `Style: Active_${v.name},${fontName},${fontSize},${primaryActive},${transparentColor},${strokeActive},&H00000000,-1,0,0,0,100,100,0,0,1,${outlineWidth},0,${v.align},${v.marginL},${v.marginR},${v.marginV},1\n`;
        }

        assStr += `\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

        const toAssTime = (sec) => {
          const h = Math.floor(sec / 3600);
          const m = Math.floor((sec % 3600) / 60);
          const s = Math.floor(sec % 60);
          const cs = Math.floor((sec % 1) * 100);
          return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}.${cs.toString().padStart(2,'0')}`;
        };

        for (let i = 0; i < payload.lines.length; i++) {
          const line = payload.lines[i];
          if (!line.text) continue;

          let styleName = 'V2';
          if (version === 1) styleName = 'V1';
          else if (version === 3) styleName = 'V3';
          else if (version === 4) styleName = 'V4';
          else if (version === 5) styleName = (i % 2 === 0) ? 'V5L' : 'V5R';

          const dur = line.animDuration !== undefined ? line.animDuration : (line.end - line.start) * 0.92;
          const cleanText = line.text.replace(/[{}]/g, '');
          const chars = cleanText.split('');
          const totalChars = Math.max(1, chars.length);
          const durPerChar = dur / totalChars;
          const kDurPerChar = Math.max(1, Math.round(durPerChar * 100)); // centiseconds per character

          // Generate per-character karaoke tags (\k) matching preview animation per letter
          const kTags = chars.map(c => `{\\k${kDurPerChar}}${c}`).join('');

          const startTime = toAssTime(line.start);
          const endTime = toAssTime(line.end);

          let posPrefix = '';
          if (line.x && typeof line.x === 'number' && line.x !== 0) {
            const scaleFactor = outW / 640;
            const posX = Math.round((outW / 2) + (line.x * scaleFactor));
            let posY = Math.round(outH - (80 * (outH / 720)));
            if (version === 1) posY = Math.round(80 * (outH / 720));
            else if (version === 4) posY = Math.round(outH / 2);
            posPrefix = `{\\pos(${posX},${posY})}`;
          }

          // Layer 0: Inactive text with baseTextColor and baseStrokeColor
          assStr += `Dialogue: 0,${startTime},${endTime},Base_${styleName},,0,0,0,,${posPrefix}${cleanText}\n`;
          // Layer 1: Active karaoke text walking per character with activeTextColor and activeStrokeColor
          assStr += `Dialogue: 1,${startTime},${endTime},Active_${styleName},,0,0,0,,${posPrefix}${kTags}\n`;
        }

        require('fs').writeFileSync(assPath, assStr, 'utf8');

        const escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
        filterComplex.push(`${currentVid}subtitles='${escapedAssPath}'[vtext]`);
        currentVid = '[vtext]';
      }

      // Calculate reliable total duration from payload or track items
      let totalDuration = Number(payload.duration) || 0;
      if (payload.tracks) {
        for (const track of payload.tracks) {
          if (track.items) {
            for (const item of track.items) {
              if (item.end && item.end > totalDuration) totalDuration = item.end;
            }
          }
        }
      }
      if (payload.lines) {
        for (const line of payload.lines) {
          if (line.end && line.end > totalDuration) totalDuration = line.end;
        }
      }
      if (totalDuration <= 0) totalDuration = 10;

      let outputOptions = [
        '-c:v libx264',
        '-preset veryfast',
        '-crf 22',
        '-threads 0',
        '-pix_fmt yuv420p',
        '-movflags +faststart'
      ];

      outputOptions.push('-t', String(totalDuration));

      if (filterComplex.length > 0) {
        command.complexFilter(filterComplex.join(';'));
      }

      command.outputOptions(outputOptions);
      if (currentVid !== '[0:v]') {
        command.outputOptions(['-map', currentVid]);
      } else {
        command.outputOptions(['-map', '0:v']);
      }

      if (finalAudio) {
        command.outputOptions(['-map', finalAudio]);
        command.outputOptions('-c:a aac');
      } else if (videoItems.length > 0) {
        // Fallback: If no dedicated audio track is imported, try to use the audio from the original video
        command.outputOptions(['-map', '0:a?']);
        command.outputOptions('-c:a aac');
      }

      command.output(filePath);
      activeExportCmd = command;
      activeExportPath = filePath;

      command.on('start', (cmdLine) => {
        console.log('FFmpeg command started:', cmdLine);
      });

      command.on('progress', (progress) => {
        let percent = 0;
        let secs = 0;
        if (typeof progress.percent === 'number' && progress.percent > 0) {
          percent = progress.percent;
        }
        if (progress.timemark && typeof progress.timemark === 'string' && progress.timemark !== 'N/A') {
          const parts = progress.timemark.split(':');
          if (parts.length === 3) {
            const h = parseFloat(parts[0].trim()) || 0;
            const m = parseFloat(parts[1].trim()) || 0;
            const s = parseFloat(parts[2].trim()) || 0;
            secs = h * 3600 + m * 60 + s;
            if (totalDuration > 0) {
              percent = (secs / totalDuration) * 100;
            }
          }
        }

        const clampedPct = Math.min(99, Math.max(1, Math.round(percent)));
        const formatSec = (sec) => {
          const m = Math.floor(sec / 60);
          const s = Math.floor(sec % 60);
          return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };
        const timemarkText = `${formatSec(secs)} / ${formatSec(totalDuration)}`;

        console.log(`[Export Progress] ${clampedPct}% (${timemarkText})`);

        const msg = {
          percent: clampedPct,
          timemark: timemarkText,
          currentSec: Math.round(secs),
          totalSec: Math.round(totalDuration)
        };

        if (event && event.sender && !event.sender.isDestroyed()) {
          event.sender.send('export-progress', msg);
        }
        if (mainWindow && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
          mainWindow.webContents.send('export-progress', msg);
        }
      });

      command.on('end', () => {
        activeExportCmd = null;
        activeExportPath = null;
        resolve({ success: true, filePath });
      });

      command.on('error', (err) => {
        const wasKilled = !activeExportCmd || (err && err.message && (err.message.includes('SIGKILL') || err.message.includes('SIGTERM') || err.message.includes('kill') || err.message.includes('code 255')));
        activeExportCmd = null;
        if (activeExportPath && wasKilled && fs.existsSync(activeExportPath)) {
          try { fs.unlinkSync(activeExportPath); } catch (e) {}
        }
        activeExportPath = null;
        if (wasKilled) {
          resolve({ success: false, canceled: true });
        } else {
          console.error('Export error:', err);
          resolve({ success: false, error: err.message });
        }
      });

      command.run();
    });
  } catch (err) {
    console.error('Export Exception:', err);
    return { success: false, error: err.message };
  }
}

async function handleExportAudio(event, payload, mainWindow) {
  try {
    let filePath = payload.outputPath;
    if (!filePath) {
      const saveRes = await dialog.showSaveDialog({
        title: 'Export Audio',
        defaultPath: `${payload.title || 'audio_export'}.mp3`,
        filters: [{ name: 'Audio MP3', extensions: ['mp3'] }]
      });
      filePath = saveRes.filePath;
    }

    if (!filePath) return { success: false, canceled: true };

    const outDir = path.dirname(filePath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    return new Promise((resolve) => {
      let command = ffmpeg();
      let inputCount = 0;
      let filterComplex = [];
      const audioItems = [];

      if (payload.tracks) {
        for (const track of payload.tracks) {
          for (const item of track.items) {
            if (item.filePath) {
              if (track.type === 'audio') audioItems.push(item);
              else if (track.type === 'video') audioItems.push(item);
            }
          }
        }
      }

      if (audioItems.length === 0) {
        return resolve({ success: false, error: 'Tidak ada audio atau video di timeline untuk diekspor.' });
      }

      let audioInputs = [];
      for (const a of audioItems) {
        command.input(a.filePath);
        if (a.sourceStart) command.inputOptions([`-ss ${a.sourceStart}`]);
        const dur = (a.end - a.start);
        if (dur > 0) command.inputOptions([`-t ${dur}`]);

        let audioFilter = '';
        if (a.start > 0) audioFilter += `adelay=${Math.round(a.start * 1000)}|${Math.round(a.start * 1000)}`;

        if (audioFilter) {
          filterComplex.push(`[${inputCount}:a]${audioFilter}[a${inputCount}]`);
          audioInputs.push(`[a${inputCount}]`);
        } else {
          audioInputs.push(`[${inputCount}:a]`);
        }
        inputCount++;
      }

      let finalAudio = '';
      if (audioInputs.length > 1) {
        filterComplex.push(`${audioInputs.join('')}amix=inputs=${audioInputs.length}:duration=longest[aout]`);
        finalAudio = '[aout]';
      } else if (audioInputs.length === 1) {
        const match = audioInputs[0].match(/^\[(\d+:[a-z]+)\]$/);
        finalAudio = match ? match[1] : audioInputs[0];
      }

      if (filterComplex.length > 0) {
        command.complexFilter(filterComplex.join(';'));
      }

      if (finalAudio) {
        command.outputOptions(['-map', finalAudio]);
      } else {
        command.outputOptions(['-map', '0:a?']);
      }

      // Calculate reliable total duration from payload or track items
      let totalDuration = Number(payload.duration) || 0;
      if (payload.tracks) {
        for (const track of payload.tracks) {
          if (track.items) {
            for (const item of track.items) {
              if (item.end && item.end > totalDuration) totalDuration = item.end;
            }
          }
        }
      }
      if (payload.lines) {
        for (const line of payload.lines) {
          if (line.end && line.end > totalDuration) totalDuration = line.end;
        }
      }
      if (totalDuration <= 0) totalDuration = 10;

      command.outputOptions(['-c:a libmp3lame', '-b:a 320k', '-ar 44100', '-threads 0']);
      command.outputOptions(['-t', String(totalDuration)]);
      command.output(filePath);
      activeExportCmd = command;
      activeExportPath = filePath;

      command.on('progress', (progress) => {
        let percent = 0;
        let secs = 0;
        if (typeof progress.percent === 'number' && progress.percent > 0) {
          percent = progress.percent;
        }
        if (progress.timemark && typeof progress.timemark === 'string' && progress.timemark !== 'N/A') {
          const parts = progress.timemark.split(':');
          if (parts.length === 3) {
            const h = parseFloat(parts[0].trim()) || 0;
            const m = parseFloat(parts[1].trim()) || 0;
            const s = parseFloat(parts[2].trim()) || 0;
            secs = h * 3600 + m * 60 + s;
            if (totalDuration > 0) {
              percent = (secs / totalDuration) * 100;
            }
          }
        }

        const clampedPct = Math.min(99, Math.max(1, Math.round(percent)));
        const formatSec = (sec) => {
          const m = Math.floor(sec / 60);
          const s = Math.floor(sec % 60);
          return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };
        const timemarkText = `${formatSec(secs)} / ${formatSec(totalDuration)}`;

        console.log(`[Audio Progress] ${clampedPct}% (${timemarkText})`);

        const msg = {
          percent: clampedPct,
          timemark: timemarkText,
          currentSec: Math.round(secs),
          totalSec: Math.round(totalDuration)
        };

        if (event && event.sender && !event.sender.isDestroyed()) {
          event.sender.send('export-progress', msg);
        }
        if (mainWindow && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
          mainWindow.webContents.send('export-progress', msg);
        }
      });

      command.on('end', () => {
        activeExportCmd = null;
        activeExportPath = null;
        resolve({ success: true, filePath });
      });

      command.on('error', (err) => {
        const wasKilled = !activeExportCmd || (err && err.message && (err.message.includes('SIGKILL') || err.message.includes('SIGTERM') || err.message.includes('kill') || err.message.includes('code 255')));
        activeExportCmd = null;
        if (activeExportPath && wasKilled && fs.existsSync(activeExportPath)) {
          try { fs.unlinkSync(activeExportPath); } catch (e) {}
        }
        activeExportPath = null;
        if (wasKilled) {
          resolve({ success: false, canceled: true });
        } else {
          console.error('Audio export error:', err);
          resolve({ success: false, error: err.message });
        }
      });

      command.run();
    });
  } catch (err) {
    console.error('Audio Export Exception:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { handleExportVideo, handleExportAudio, cancelExport };

