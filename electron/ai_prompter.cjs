const fs = require('fs');
const path = require('path');

// ── Tema Visual Preset untuk Agen AI ──
const ALBUM_THEME_PRESETS = [
  {
    id: 'rock-stage',
    label: '🎸 Konser Rock Dramatis',
    desc: 'Panggung gelap, bara api melayang, spotlight oranye hangat, kabut atmosferik',
    genre: 'Rock Energy',
    promptVisual: 'Cinematic wide shot of an energetic rock vocalist and lead guitarist on an atmospheric concert stage, surrounded by floating fire embers and volumetrics, warm orange and crimson dramatic rim lighting, dark moody background with high contrast',
    colorPalette: 'Deep charcoal, fiery amber, crimson red'
  },
  {
    id: 'nu-metal',
    label: '⚡ Nu Metal Industrial',
    desc: 'Langit badai, petir merah/cyan, reruntuhan besi industrial, edgy & agresif',
    genre: 'Nu Metal',
    promptVisual: 'Dark industrial metal setting amidst a dramatic thunderstorm, striking red and cyan lightning bolts in the stormy sky, gothic metal aesthetic, heavy shadows and misty fog',
    colorPalette: 'Electric cyan, blood red, dark metallic gunmetal'
  },
  {
    id: 'pop-galau',
    label: '🌧️ Pop Galau Melankolis',
    desc: 'Malam kota basah berhujan, jendela berembun, lampu kota bokeh, suasana sedih sendu',
    genre: 'Pop Galau',
    promptVisual: 'Melancholic cinematic rainy midnight city street, warm blurred streetlights and glowing shop windows reflecting on wet asphalt, a solitary figure with an acoustic guitar sitting in a misty bus stop, emotional moody atmospheric photography',
    colorPalette: 'Moody deep indigo, soft amber streetlights, rainy asphalt grey'
  },
  {
    id: 'acoustic-sunset',
    label: '☕ Kafe Akustik Santai',
    desc: 'Kafe kayu hangat, sunset golden hour, jendela hujan rintik, nuansa tenang',
    genre: 'Acoustic Pop',
    promptVisual: 'Cozy rustic wooden music studio by a rainy window, warm golden hour sunset rays pouring in, vintage acoustic guitar resting on an armchair, soft dust particles and bokeh',
    colorPalette: 'Golden amber, warm mahogany brown, cream sunlight'
  },
  {
    id: 'nocturnal-neon',
    label: '🌙 Jalanan Kota Malam',
    desc: 'Jalanan kota basah malam hari, pantulan lampu neon ungu/cyan, nuansa galau',
    genre: 'Synthwave / Indie Pop',
    promptVisual: 'Cinematic rainy city street at midnight, reflective wet asphalt glowing with purple and cyan neon signs, a contemplative musician walking with a guitar case, melancholic moody cinema lighting',
    colorPalette: 'Vibrant neon purple, electric cyan, midnight navy'
  },
  {
    id: 'hype-laser',
    label: '💥 Panggung Dangdut / EDM',
    desc: 'Panggung megah, sorotan sinar laser RGB, asap panggung dinamis, festival',
    genre: 'Dangdut Koplo / EDM',
    promptVisual: 'Spectacular live festival music stage, sweeping emerald and magenta laser beams cutting through thick dynamic stage haze, energetic crowd silhouettes, ultra vibrant night concert',
    colorPalette: 'Neon emerald green, electric magenta, laser gold'
  },
  {
    id: 'gothic-fantasy',
    label: '🏛️ Gothic Dark Fantasy',
    desc: 'Kastil tua berawan gelap, mistis, lilin antik, nuansa simfoni epik',
    genre: 'Symphonic Metal / Gothic',
    promptVisual: 'Gothic cathedral ruins under an ominous full moon, swirling dark mist, ancient candles flickering with mystical golden light, epic dark symphonic fantasy atmosphere',
    colorPalette: 'Antique gold, deep charcoal, ethereal moonlight silver'
  },
  {
    id: 'lofi-chill',
    label: '🎧 Lo-Fi Chill Beats',
    desc: 'Kamar senja estetik, lampu meja hangat, headphone, pemandangan jendela kota',
    genre: 'Lo-Fi Chillhop',
    promptVisual: 'Aesthetic cozy bedroom studio at twilight, soft glowing desk lamp illuminating a vintage turntable and vinyl records, city skyline at dusk outside the window, warm nostalgic anime-inspired cinematic lighting, relaxing serene vibe',
    colorPalette: 'Pastel twilight purple, warm peach, soft dusty rose'
  },
  {
    id: 'indie-folk',
    label: '🌲 Hutan Kabut Indie Folk',
    desc: 'Hutan pinus berkabut pagi, api unggun kecil, nuansa alam hangat & petualangan',
    genre: 'Indie Folk / Akustik Alam',
    promptVisual: 'Mystical pine forest shrouded in dense morning mist, golden sunbeams piercing through pine trees, a gentle campfire casting warm amber glow on a vintage acoustic guitar, peaceful wilderness cinematic photography',
    colorPalette: 'Forest green, earthy wood, golden sunbeams'
  }
];

// ── Layout Specific Prompt Templates (Layout V1 - V5) ──
const LAYOUT_AI_PROMPTS = {
  layout1: {
    layout: 'layout1',
    version: 'V1',
    name: 'Layout V1 (Kiri 20 Lagu)',
    composition: 'Area kiri 40% kosong gelap untuk tracklist, fokus visual di sisi kanan',
    systemPrompt: 'Cinematic 16:9 widescreen composition for a music album backdrop. The LEFT 40% of the frame is heavily shadowed, clean, and softly out of focus to serve as dedicated negative space for text and visualizer. The RIGHT 60% of the frame features dramatic cinematic subject matter. Volumetric lighting, atmospheric smoke, high contrast, 8k resolution.'
  },
  layout2: {
    layout: 'layout2',
    version: 'V2',
    name: 'Layout V2 (Kiri 10 Lagu)',
    composition: 'Area kiri berbayang gelap untuk 10 lagu, subjek karismatik di sisi kanan',
    systemPrompt: 'Epic 16:9 concert stage aesthetic. The LEFT side is dark with subtle moody gradient shadows for legible text overlay. The RIGHT side showcases an expressive musical performance with intense rim lighting and dynamic smoke particles. 8k, photorealistic, cinematic depth of field.'
  },
  layout3: {
    layout: 'layout3',
    version: 'V3',
    name: 'Layout V3 (2 Kolom Tengah)',
    composition: 'Area atas & tengah bersih untuk judul raksasa dan 2 kolom lagu, visual di bawah/kanan',
    systemPrompt: 'Dramatic 16:9 wide landscape composition. The upper half and center areas are kept clean with soft moody sky or ambient haze for overlay elements. The subject is positioned at the lower right third. High dynamic range, cinematic rim lights, masterpiece 8k.'
  },
  layout4: {
    layout: 'layout4',
    version: 'V4',
    name: 'Layout V4 (Kotak Waktu / Modern)',
    composition: 'Area kiri gelap bertekstur badai/kabut, objek di kanan',
    systemPrompt: 'Dark atmospheric 16:9 album cover art. The LEFT side features dark stormy clouds and soft atmospheric volumetrics providing clean negative space. The RIGHT side features high energy musical elements with dramatic lighting. 16:9 aspect ratio, ultra-detailed, 8k.'
  },
  layout5: {
    layout: 'layout5',
    version: 'V5',
    name: 'Layout V5 (2 Kolom Kiri)',
    composition: 'Sisi kiri luas untuk 2 kolom tracklist, subjek di kanan dengan pencahayaan neon',
    systemPrompt: 'Moody cinematic portrait in 16:9. The entire LEFT half is a softly blurred, deeply shadowed studio background designed for dual-column overlay. The RIGHT half features a detailed focal musician in cinematic lighting. 8k, photorealistic.'
  }
};

function getLayoutAiPrompt(layoutKey) {
  const key = String(layoutKey || 'layout1').toLowerCase().replace('v', 'layout');
  return LAYOUT_AI_PROMPTS[key] || LAYOUT_AI_PROMPTS.layout1;
}

function buildAiImagePrompt(layoutKey, userKeywords = '') {
  const template = getLayoutAiPrompt(layoutKey);
  const systemPrompt = template.systemPrompt;
  const userExtra = String(userKeywords || '').trim();

  if (!userExtra) {
    return systemPrompt;
  }

  return `${systemPrompt} Subject details: ${userExtra}. Composition requirement: Keep the designated negative space dark, clean, and free of clutter.`;
}

/**
 * Format tracklist strings into a clean representation
 */
function formatTracklistList(songs, maxTracks = 12) {
  const trackLines = (Array.isArray(songs) ? songs : [])
    .map((s, idx) => {
      const raw = typeof s === 'string' ? s : (s.titleArtist || s.title || '');
      const clean = raw.replace(/^\d+[\.\-\s)]+/, '').trim();
      return clean ? `${String(idx + 1).padStart(2, '0')}. ${clean}` : null;
    })
    .filter(Boolean)
    .slice(0, maxTracks);

  return trackLines.length > 0 
    ? trackLines.join(', ')
    : '01. Track One - Artist, 02. Track Two - Artist, 03. Track Three - Artist';
}

/**
 * Meracik Prompt Background Video (16:9) berdasarkan Judul, Daftar Lagu, Genre, dan Model AI Target
 * Mendukung opsi `includeText`:
 * - `false` (default): Menghasilkan background murni dengan negative space bersih TANPA teks drawtext/typo (ideal untuk Auto Album video engine).
 * - `true`: Menghasilkan poster full album lengkap dengan tipografi judul dan tracklist (untuk model seperti Ideogram / Recraft / Flux).
 */
function craftAlbumBackgroundPrompt(options = {}) {
  const {
    albumTitle = 'LAGU GALAU VERSI ROCK ENERGY',
    songs = [],
    genre = 'Rock Galau',
    themeObj = null,
    customTheme = '',
    modelTarget = 'ideogram', // 'ideogram' | 'recraft' | 'flux' | 'midjourney' | 'universal'
    includeText = false,      // default false: clean background without baked-in text
    layout = 'layout1'
  } = options;

  const titleStr = (albumTitle || 'BEST MUSIC ALBUM').trim().toUpperCase();
  const visualDesc = customTheme.trim() || (themeObj?.promptVisual || ALBUM_THEME_PRESETS[0].promptVisual);
  const tracklistText = formatTracklistList(songs, 12);
  const layoutInfo = getLayoutAiPrompt(layout);

  // ── Mode A: Clean Background (No Baked-in Text, Negative Space for UI / Visualizer) ──
  if (!includeText) {
    if (modelTarget === 'ideogram') {
      return `Cinematic 16:9 widescreen wallpaper for an album video backdrop. 
Composition: The LEFT 40% and center of the frame are kept clear as deep shadowed negative space with soft volumetric haze. 
The RIGHT side features ${visualDesc}. 
Color mood: harmonious ${genre} aesthetic, dramatic rim lighting, atmospheric depth of field, 8k resolution, photorealistic masterpiece. 
Negative constraints: text, typography, letters, words, titles, watermark, logo, frame, border.`;
    }

    if (modelTarget === 'recraft') {
      return `Modern digital art album background in 16:9 aspect ratio. 
Composition: Minimalist negative space occupying the left half with soft ambient gradient. 
Focal subject on the right: ${visualDesc}. 
Crisp contrast, refined color palette, sleek contemporary aesthetic, 8k. 
Negative constraints: no text, no letters, no typography, no watermarks, no titles.`;
    }

    if (modelTarget === 'flux') {
      return `Photorealistic 16:9 cinematic wallpaper for music album background. 
Wide angle composition where the left third is deeply shadowed negative space with subtle stage fog and soft particles. 
On the right side: ${visualDesc}. 
Filmic color grading, natural atmospheric volumetric light, ultra-detailed, 8k resolution, raw photography. 
Negative prompt: text, watermark, signature, font, letters, typography.`;
    }

    if (modelTarget === 'midjourney') {
      return `Cinematic music album background art in 16:9, left half has dark moody negative space with atmospheric fog, right side features ${visualDesc}, dramatic rim lights, subtle dust particles, 8k resolution --ar 16:9 --style raw --v 6.0 --no text letters words watermark font logo`;
    }

    // Universal / Pollinations / DALL-E / SDXL
    return `Cinematic 16:9 widescreen album background art for "${genre}" music mood. 
${visualDesc}. 
The left 40% of the frame is dark, softly shadowed negative space. 
Dramatic rim lighting, atmospheric fog and subtle particles. Ultra-detailed, photorealistic, 8k resolution. 
Negative constraint: absolutely no text, no letters, no typography, no watermark.`;
  }

  // ── Mode B: Full Graphic Design Poster / Album Cover with Baked-in Typography ──
  if (modelTarget === 'ideogram') {
    return `A 16:9 graphic design full album cover poster. 
Top center features bold 3D metallic typography reading "${titleStr}". 
A small sleek subtitle badge reading "FULL ALBUM • ${genre.toUpperCase()}". 
The LEFT third of the frame is dedicated to negative space with a sharp, neatly organized vertical tracklist in clean white sans-serif typography displaying: ${tracklistText}. 
The RIGHT half features ${visualDesc}. 
Center area kept clear for visualizer effects. 16:9 aspect ratio, 8k resolution, ultra-clean typography, professional album art, masterpiece.`;
  }

  if (modelTarget === 'recraft') {
    return `Modern 16:9 album compilation poster graphic design. 
Prominent clean bold header typography reading "${titleStr}". 
Below the title is a sleek minimalist badge "FULL ALBUM • ${genre.toUpperCase()}". 
On the left side, an orderly structured tracklist in clean sans-serif font: ${tracklistText}. 
The right half showcases ${visualDesc}. 
High-end graphic design, sharp branding layout, crisp typography, 8k resolution.`;
  }

  if (modelTarget === 'flux') {
    return `Cinematic 16:9 wallpaper for a music album compilation. 
Prominently in stylized embossed font at the top reads "${titleStr}". 
Golden subtitle badge reading "FULL ALBUM • ${genre.toUpperCase()}". 
On the left side against a dark, foggy background, there is a neatly formatted readable tracklist: ${tracklistText}. 
On the right side: ${visualDesc}. 
Dramatic lighting, atmospheric smoke, rich color grading, ultra-detailed, photorealistic 8k, aspect ratio 16:9.`;
  }

  if (modelTarget === 'midjourney') {
    return `Cinematic music album background art, with large stylized typography text "${titleStr}" at the top, left side has a dark moody negative space area featuring a subtle song list "${tracklistText}", right side shows ${visualDesc}, atmospheric rim light, fog and dust embers, high contrast composition --ar 16:9 --style raw --v 6.0`;
  }

  // Universal format
  return `16:9 music album background art for "${titleStr}", ${genre} music mood. ${visualDesc}. Left side has dark negative space with typography text listing songs: ${tracklistText}. Top center has bold title "${titleStr}". Center has clear space for visualizer effects. Ultra-detailed, 8k, photorealistic.`;
}

/**
 * Meracik Prompt Thumbnail YouTube (16:9 High CTR) berdasarkan Judul, Daftar Lagu, Genre, dan Tema
 */
function craftAlbumThumbnailPrompt(options = {}) {
  const {
    albumTitle = 'LAGU GALAU VERSI ROCK ENERGY',
    songs = [],
    genre = 'ROCK ENERGY',
    themeObj = null,
    customTheme = '',
    modelTarget = 'ideogram' // 'ideogram' | 'recraft' | 'flux' | 'midjourney' | 'universal'
  } = options;

  const titleStr = (albumTitle || 'BEST MUSIC ALBUM').trim().toUpperCase();
  const visualDesc = customTheme.trim() || (themeObj?.promptVisual || ALBUM_THEME_PRESETS[0].promptVisual);

  // Extract top 4 highlight songs for thumbnail punch
  const top4 = (Array.isArray(songs) ? songs : [])
    .map(s => {
      const raw = typeof s === 'string' ? s : (s.titleArtist || s.title || '');
      return raw.replace(/^\d+[\.\-\s)]+/, '').trim();
    })
    .filter(Boolean)
    .slice(0, 4);

  const songsHighlight = top4.length > 0 ? top4.join(' • ') : 'HIT TRACKS COMPILATION';

  if (modelTarget === 'ideogram') {
    return `Viral high-CTR YouTube music compilation thumbnail, 16:9 ratio. 
Dominant giant 3D bold glossy typography at the top reading "${titleStr}" with vibrant neon yellow and white glow. 
A sleek badge reading "FULL ALBUM • ${genre.toUpperCase()}". 
Bottom highlight banner displaying text: "${songsHighlight}". 
Right side features an expressive close-up shot: ${visualDesc}. 
Extreme contrast, saturated vivid colors, eye-catching composition, trending on YouTube, 8k. 
Negative constraints: blurry text, misspelled words, cluttered background.`;
  }

  if (modelTarget === 'recraft') {
    return `High impact YouTube compilation thumbnail design, 16:9 ratio. 
Massive 3D modern display typography reading "${titleStr}" with sharp bevels and neon drop shadow. 
Top badge reading "FULL ALBUM • ${genre.toUpperCase()}". 
Bottom ribbon highlighting hit songs "${songsHighlight}". 
Clean expressive artwork on the right: ${visualDesc}. 
High contrast, eye-catching composition optimized for mobile screens, 8k resolution.`;
  }

  if (modelTarget === 'flux') {
    return `Ultra high CTR 16:9 YouTube thumbnail for music album "${titleStr}". 
Giant glowing 3D typography of "${titleStr}" at the top center. 
Bright badge reading "FULL ALBUM • ${genre.toUpperCase()}". 
Bottom callout banner reading "${songsHighlight}". 
On the right: ${visualDesc} with vivid dramatic rim lights, intense cinematic expressions, rich saturated color contrast, photorealistic, 8k.`;
  }

  if (modelTarget === 'midjourney') {
    return `Viral YouTube music album thumbnail, giant 3D typography text "${titleStr}", golden badge text "FULL ALBUM", featuring songs "${songsHighlight}", ${visualDesc}, dynamic expressive pose, vibrant rim lights, extreme contrast and click-worthy composition --ar 16:9 --style raw --v 6.0`;
  }

  // Universal format
  return `Viral high CTR YouTube album thumbnail in 16:9. Giant 3D embossed typography reading "${titleStr}". Golden banner text "FULL ALBUM • ${genre.toUpperCase()}". Highlight tracklist text reading "${songsHighlight}". ${visualDesc}. Hyper-detailed, vibrant neon lighting, high contrast.`;
}

// ── Backward-compatible Aliases ──
function generateBackgroundPrompt(options) {
  return craftAlbumBackgroundPrompt(options);
}

function generateThumbnailPrompt(options) {
  return craftAlbumThumbnailPrompt(options);
}

/**
 * Generate AI Image Direct Function
 * Supports Pollinations.ai (Free, Fast, Flux-based, HD 1080p), OpenAI DALL-E 3, and Stability AI
 */
async function generateAiImage(payload = {}) {
  const {
    customPrompt = '',
    layout = 'layout1',
    userKeywords = '',
    provider = 'pollinations',
    apiKey = '',
    outputFolder = null
  } = payload;

  // Determine final prompt text
  let finalPrompt = customPrompt?.trim();
  if (!finalPrompt) {
    if (layout) {
      finalPrompt = buildAiImagePrompt(layout, userKeywords);
    } else {
      finalPrompt = craftAlbumBackgroundPrompt({ includeText: false });
    }
  }

  // Prepare destination folder on disk
  const targetDir = outputFolder || path.join(process.cwd(), 'scratch', 'output');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const timestamp = Date.now();
  const filename = `ai_bg_${timestamp}.png`;
  const targetFilePath = path.join(targetDir, filename);

  // 1. Pollinations AI (Free, 1080p, Flux model, No API key needed)
  if (provider === 'pollinations' || !provider) {
    const seed = Math.floor(Math.random() * 1000000);
    // Sanitize prompt for URL
    const safePrompt = encodeURIComponent(finalPrompt.substring(0, 800));
    const imageUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=1920&height=1080&model=flux&nologo=true&seed=${seed}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout

    try {
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'ShotAiStudio/1.0'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Pollinations API HTTP error: ${response.status} ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 5000) {
        throw new Error('Image response buffer is too small or invalid.');
      }

      fs.writeFileSync(targetFilePath, buffer);

      return {
        success: true,
        imagePath: targetFilePath,
        imageUrl,
        filename,
        prompt: finalPrompt,
        provider: 'pollinations'
      };
    } catch (err) {
      clearTimeout(timeout);
      throw new Error(`Pollinations AI generation failed: ${err.message}`);
    }
  }

  // 2. OpenAI DALL-E 3
  if (provider === 'dalle') {
    if (!apiKey) {
      throw new Error('OpenAI API Key is required for DALL-E 3.');
    }

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: finalPrompt,
        size: '1792x1024',
        quality: 'hd',
        n: 1
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(`OpenAI error: ${errJson.error?.message || res.statusText}`);
    }

    const data = await res.json();
    const remoteUrl = data.data?.[0]?.url;
    if (!remoteUrl) throw new Error('No image URL returned from OpenAI');

    // Download image
    const imgRes = await fetch(remoteUrl);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(targetFilePath, buf);

    return {
      success: true,
      imagePath: targetFilePath,
      imageUrl: remoteUrl,
      filename,
      prompt: finalPrompt,
      provider: 'dalle'
    };
  }

  // 3. Stability AI SDXL
  if (provider === 'stability') {
    if (!apiKey) {
      throw new Error('Stability API Key is required.');
    }

    const res = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        text_prompts: [{ text: finalPrompt, weight: 1 }],
        cfg_scale: 7,
        height: 768,
        width: 1344,
        samples: 1,
        steps: 30
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Stability API error: ${errText}`);
    }

    const data = await res.json();
    const b64 = data.artifacts?.[0]?.base64;
    if (!b64) throw new Error('No image data returned from Stability AI');

    const buf = Buffer.from(b64, 'base64');
    fs.writeFileSync(targetFilePath, buf);

    return {
      success: true,
      imagePath: targetFilePath,
      imageUrl: `data:image/png;base64,${b64.substring(0, 100)}...`,
      filename,
      prompt: finalPrompt,
      provider: 'stability'
    };
  }

  throw new Error(`Provider "${provider}" is not supported.`);
}

module.exports = {
  ALBUM_THEME_PRESETS,
  LAYOUT_AI_PROMPTS,
  getLayoutAiPrompt,
  buildAiImagePrompt,
  craftAlbumBackgroundPrompt,
  craftAlbumThumbnailPrompt,
  generateBackgroundPrompt,
  generateThumbnailPrompt,
  generateAiImage
};
