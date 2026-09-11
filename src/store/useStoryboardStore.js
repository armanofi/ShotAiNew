import { create } from 'zustand';

const defaultCharacter = (name = '') => ({
  name,
  active: true,
  gender: 'pria',
  facePhotoFile: null,
  facePhotoUrl: null,
  clothesPhotoFile: null,
  clothesPhotoUrl: null,
  aksesoriKepala: '',
  aksesoriTangan: '',
  aksesoriLeher: '',
  baju: '',
  warnaBaju: '',
  celana: '',
  warnaCelana: '',
  instrumenActive: false,
  jenisInstrumen: '',
  warnaInstrumen: '',
  gearActive: false,
  jenisMic: '',
  warnaMic: '',
  handset: '',
  warnaHandset: '',
});

const defaultBandPersonil = {
  gitaris: { ...defaultCharacter('Gitaris'), active: false, gearActive: false },
  bassis: { ...defaultCharacter('Bassis'), active: false, gearActive: false },
  drummer: { ...defaultCharacter('Drummer'), active: false, gearActive: false },
  saxophonist: { ...defaultCharacter('Saxophonist'), active: false, gearActive: false },
  trumpeter: { ...defaultCharacter('Trumpeter'), active: false, gearActive: false },
  violinist: { ...defaultCharacter('Violinist'), active: false, gearActive: false },
  pianis: { ...defaultCharacter('Pianis'), active: false, gearActive: false },
};

export const useStoryboardStore = create((set, get) => ({
  // Global settings
  location: '',
  videoModel: 'video-klip', // 'video-klip' | 'video-band' | 'video-drama'
  sceneCount: 6,
  shotCount: 9, // newly added shot count (panels per scene)
  sceneDuration: 10, // seconds per scene
  lyrics: '',

  // Characters
  artistUtama: { ...defaultCharacter('Artis Utama'), active: true },
  artistFeaturing: { ...defaultCharacter('Artis Featuring'), active: false },
  bandPersonil: defaultBandPersonil,

  // Results
  scenes: [],
  isGenerating: false,
  characterBible: null,

  // Actions
  setField: (field, value) => set({ [field]: value }),

  updateArtistUtama: (updates) =>
    set(state => ({ artistUtama: { ...state.artistUtama, ...updates } })),

  updateArtistFeaturing: (updates) =>
    set(state => ({ artistFeaturing: { ...state.artistFeaturing, ...updates } })),

  updateBandPersonil: (personilKey, updates) =>
    set(state => ({
      bandPersonil: {
        ...state.bandPersonil,
        [personilKey]: { ...state.bandPersonil[personilKey], ...updates },
      },
    })),

  generateCharacterBible: () => {
    const state = get();
    const characters = [];

    // Artis Utama (always active)
    const au = state.artistUtama;
    characters.push(buildCharacterBible('Artis Utama', au));

    // Artis Featuring
    if (state.artistFeaturing.active) {
      characters.push(buildCharacterBible('Artis Featuring', state.artistFeaturing));
    }

    // Band Personil
    Object.entries(state.bandPersonil).forEach(([key, p]) => {
      if (p.active) {
        characters.push(buildCharacterBible(p.name || key, p));
      }
    });

    const bible = characters.join('\n\n');
    set({ characterBible: bible });
    return bible;
  },

  generateStoryboard: () => {
    const state = get();
    const { lyrics, sceneCount, sceneDuration, videoModel, location } = state;
    if (!lyrics || !videoModel) return;

    set({ isGenerating: true, scenes: [] });

    // Build character bible
    const bible = get().generateCharacterBible();

    // Split lyrics into scenes
    const lines = lyrics.split('\n').filter(l => l.trim() !== '');
    const linesPerScene = Math.max(1, Math.ceil(lines.length / sceneCount));

    const panelDuration = (sceneDuration / state.shotCount).toFixed(1);
    const modelLabel = {
      'video-klip': 'Video Klip (Artis Utama bernyanyi + b-roll)',
      'video-band': 'Video Band (Full band tampil)',
      'video-drama': 'Video Drama (Alur cerita + selingan artis bernyanyi)',
    }[videoModel];

    const scenes = [];
    for (let i = 0; i < sceneCount; i++) {
      const sceneLyrics = lines.slice(i * linesPerScene, (i + 1) * linesPerScene).join('\n') || `[Instrumental / Interlude Scene ${i + 1}]`;
      const prevSummary = i > 0 ? `Scene sebelumnya (Scene ${i}): ${scenes[i-1].summary}` : '';

      // Build image-to-image prompt (dynamic panels based on shotCount)
      const itiPrompt = buildImageToImagePrompt(i + 1, sceneLyrics, bible, location, modelLabel, videoModel, state);

      // Build image-to-video prompt
      const itvPrompt = buildImageToVideoPrompt(i + 1, sceneLyrics, bible, sceneDuration, parseFloat(panelDuration), location, modelLabel, videoModel, state);

      const summary = `Lokasi: ${location || 'Tidak ditentukan'}. Lirik: "${sceneLyrics.substring(0, 60)}..."`;

      scenes.push({
        id: i + 1,
        lyrics: sceneLyrics,
        summary,
        prevSummary,
        itiPrompt,
        itvPrompt,
        isRegenerating: false,
      });
    }

    set({ scenes, isGenerating: false });
  },

  regenerateScene: (sceneId) => {
    const state = get();
    const { sceneDuration, videoModel, location } = state;
    const sceneIdx = state.scenes.findIndex(s => s.id === sceneId);
    if (sceneIdx === -1) return;

    const bible = state.characterBible || get().generateCharacterBible();
    const scene = state.scenes[sceneIdx];
    const modelLabel = {
      'video-klip': 'Video Klip (Artis Utama bernyanyi + b-roll)',
      'video-band': 'Video Band (Full band tampil)',
      'video-drama': 'Video Drama (Alur cerita + selingan artis bernyanyi)',
    }[videoModel];

    const panelDuration = (sceneDuration / state.shotCount).toFixed(1);
    const itiPrompt = buildImageToImagePrompt(sceneId, scene.lyrics, bible, location, modelLabel, videoModel, state);
    const itvPrompt = buildImageToVideoPrompt(sceneId, scene.lyrics, bible, sceneDuration, parseFloat(panelDuration), location, modelLabel, videoModel, state);

    set(state => ({
      scenes: state.scenes.map(s => s.id === sceneId ? { ...s, itiPrompt, itvPrompt } : s),
    }));
  },
}));

// Helper: Build a Character Bible text block for one character
function buildCharacterBible(role, char) {
  const lines = [`[CHARACTER BIBLE: ${role.toUpperCase()}]`];
  lines.push(`Gender: ${char.gender === 'pria' ? 'Pria (Male)' : 'Wanita (Female)'}`);
  if (char.facePhotoUrl) lines.push(`Foto Referensi Wajah: [ATTACHED IMAGE - gunakan sebagai acuan wajah utama]`);
  if (char.clothesPhotoUrl) lines.push(`Foto Referensi Baju: [ATTACHED IMAGE - gunakan sebagai acuan kostum utama]`);
  if (!char.clothesPhotoUrl && char.baju) lines.push(`Baju: ${char.baju}${char.warnaBaju ? `, Warna: ${char.warnaBaju}` : ''}`);
  if (char.celana) lines.push(`Celana: ${char.celana}${char.warnaCelana ? `, Warna: ${char.warnaCelana}` : ''}`);
  if (char.aksesoriKepala) lines.push(`Aksesori Kepala: ${char.aksesoriKepala}`);
  if (char.aksesoriTangan) lines.push(`Aksesori Tangan: ${char.aksesoriTangan}`);
  if (char.aksesoriLeher) lines.push(`Aksesori Leher: ${char.aksesoriLeher}`);
  if (char.instrumenActive && char.jenisInstrumen) {
    lines.push(`Instrumen: ${char.jenisInstrumen}${char.warnaInstrumen ? `, Warna: ${char.warnaInstrumen}` : ''}`);
  }
  if (char.gearActive && char.jenisMic) {
    lines.push(`Mic: ${char.jenisMic}${char.warnaMic ? `, Warna: ${char.warnaMic}` : ''}`);
    if (char.handset) lines.push(`Handset: ${char.handset}${char.warnaHandset ? `, Warna: ${char.warnaHandset}` : ''}`);
  }
  return lines.join('\n');
}

// Helper: Build image-to-image prompt
function buildImageToImagePrompt(sceneNum, lyrics, bible, location, modelLabel, videoModel, state) {
  const activeChars = getActiveCharsList(state);
  const panels = generatePanelDescriptions(sceneNum, lyrics, videoModel, activeChars, location, state.shotCount);

  return `=== PROMPT IMAGE-TO-IMAGE: SCENE ${sceneNum} (${state.shotCount} Shot / Panel) ===

KONTEKS MODEL CERITA: ${modelLabel}
LOKASI SYUTING: ${location || 'Belum ditentukan'}
LIRIK SCENE: "${lyrics}"

--- CHARACTER BIBLE (KONSISTEN DI SEMUA PANEL) ---
${bible}
---

INSTRUKSI GRID: Hasilkan 1 gambar komposit berisi ${state.shotCount} panel/shot. Semua panel menampilkan karakter yang IDENTIK (wajah, kostum, aksesori, instrumen sama persis) — hanya pose, ekspresi, dan framing yang berbeda antar panel. Urutan menggambarkan momen berurutan dalam 1 scene.

${panels.map((desc, i) => `[SHOT ${i+1}] ${desc}`).join('\n')}

STYLE: Sinematik, pencahayaan dramatis profesional, kualitas film 4K, konsistensi karakter 100% antar panel.`;
}

// Helper: Build image-to-video prompt with timing
function buildImageToVideoPrompt(sceneNum, lyrics, bible, totalDuration, panelDuration, location, modelLabel, videoModel, state) {
  const activeChars = getActiveCharsList(state);
  const panels = generatePanelDescriptions(sceneNum, lyrics, videoModel, activeChars, location, state.shotCount);

  const timings = panels.map((desc, i) => {
    const start = (i * panelDuration).toFixed(1);
    const end = ((i + 1) * panelDuration).toFixed(1);
    return `Shot ${i+1} (${start}s–${end}s): ${desc} [Transisi: ${i < state.shotCount - 1 ? 'smooth cut ke shot berikutnya' : 'fade out'}]`;
  });

  return `=== PROMPT IMAGE-TO-VIDEO: SCENE ${sceneNum} ===

MODEL CERITA: ${modelLabel}
LOKASI: ${location || 'Belum ditentukan'}
TOTAL DURASI SCENE: ${totalDuration} detik
LIRIK: "${lyrics}"

--- CHARACTER BIBLE ---
${bible}
---

Buat video berdurasi ${totalDuration} detik dari ${state.shotCount} shot untuk scene ${sceneNum}. Video harus mengalir mulus dari shot 1 hingga shot ${state.shotCount}, memvisualisasikan ${activeChars.join(', ')} dengan konsistensi karakter penuh.

BREAKDOWN TIMING:
${timings.join('\n')}

CATATAN TEKNIS: Gunakan gerakan kamera yang smooth (slow zoom, pan halus). Pertahankan pencahayaan dan warna konsisten di seluruh ${totalDuration} detik. Karakter wajib identik dengan Character Bible di atas.`;
}

// Helper: Get list of active characters
function getActiveCharsList(state) {
  const list = ['Artis Utama'];
  if (state.artistFeaturing.active) list.push('Artis Featuring');
  Object.entries(state.bandPersonil).forEach(([key, p]) => {
    if (p.active) list.push(p.name || key);
  });
  return list;
}

// Helper: Generate N panel descriptions for a scene
function generatePanelDescriptions(sceneNum, lyrics, videoModel, activeChars, location, shotCount) {
  const charStr = activeChars.join(', ');
  const loc = location || 'lokasi syuting';
  
  const generatedShots = [];
  
  for (let i = 0; i < shotCount; i++) {
    // Generate dynamic simple shot descriptions based on index
    if (i % 3 === 0) {
      generatedShots.push(`Wide shot ${charStr} di ${loc}, suasana terlihat jelas.`);
    } else if (i % 3 === 1) {
      generatedShots.push(`Medium shot ${charStr} bernyanyi/beraksi, emosi sesuai lirik "${lyrics.substring(0,20)}..."`);
    } else {
      generatedShots.push(`Close-up wajah/detail ${charStr} untuk penekanan dramatis.`);
    }
  }

  return generatedShots;
}
