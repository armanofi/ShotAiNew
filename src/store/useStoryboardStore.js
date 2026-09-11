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
  shotCount: 9, // panels per scene
  sceneDuration: 10, // seconds per scene
  lyrics: '',

  // Characters
  artistUtama: { ...defaultCharacter('Artis Utama'), active: true },
  artistFeaturing: { ...defaultCharacter('Artis Featuring'), active: false },
  bandPersonil: defaultBandPersonil,

  // Results
  scenes: [],
  isGenerating: false,
  generatingStatus: '',
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

    const au = state.artistUtama;
    characters.push(buildCharacterBible('Artis Utama', au));

    if (state.artistFeaturing.active) {
      characters.push(buildCharacterBible('Artis Featuring', state.artistFeaturing));
    }

    Object.entries(state.bandPersonil).forEach(([key, p]) => {
      if (p.active) {
        characters.push(buildCharacterBible(p.name || key, p));
      }
    });

    const bible = characters.join('\n\n');
    set({ characterBible: bible });
    return bible;
  },

  generateStoryboard: async () => {
    const state = get();
    const { lyrics, sceneCount, sceneDuration, shotCount, videoModel, location } = state;
    if (!lyrics || !videoModel) return;

    // Get API Key
    const keysRaw = localStorage.getItem('google_ai_studio_keys');
    const oldKey = localStorage.getItem('google_ai_studio_key');
    let apiKey = '';
    
    if (keysRaw) {
      try {
        const keys = JSON.parse(keysRaw);
        if (Array.isArray(keys) && keys.length > 0) apiKey = keys[0].key;
      } catch (e) {}
    }
    if (!apiKey && oldKey) apiKey = oldKey;

    if (!apiKey) {
      alert("API Key Google AI Studio belum diatur. Silakan atur di pengaturan AI Studio.");
      return;
    }

    set({ isGenerating: true, scenes: [], generatingStatus: 'Menyiapkan data...' });

    try {
      const bibleText = get().generateCharacterBible();
      const activeChars = getActiveCharsFullList(state);
      
      const lines = lyrics.split('\n').filter(l => l.trim() !== '');
      const linesPerScene = Math.max(1, Math.ceil(lines.length / sceneCount));
      const baseScenes = [];
      for (let i = 0; i < sceneCount; i++) {
        const sceneLyrics = lines.slice(i * linesPerScene, (i + 1) * linesPerScene).join('\n') || `[Instrumental]`;
        baseScenes.push({ id: i + 1, lyrics: sceneLyrics, prompts: [] });
      }

      const modelLabel = {
        'video-klip': 'Video Klip',
        'video-band': 'Video Band',
        'video-drama': 'Video Drama',
      }[videoModel];

      // Request generation for each active character concurrently
      const charPromises = activeChars.map(async (char) => {
        set({ generatingStatus: `Generating adegan untuk ${char.role}...` });
        
        const charSpecificBible = buildCharacterBible(char.role, char.data);
        
        const systemPrompt = `Kamu adalah sutradara video AI profesional. 
Tugasmu membuat storyboard berurutan untuk karakter: "${char.role}".
Lokasi: ${location || 'Sesuai lirik'}. Konsep: ${modelLabel}.
Terdapat ${sceneCount} scene, tiap scene wajib memiliki tepat ${shotCount} deskripsi panel/shot yang berbeda (sudut kamera, pose, dll).

KEMBALIKAN OUTPUT SEBAGAI JSON ARRAY SEPERTI INI:
[
  {
    "sceneId": 1,
    "panels": ["shot 1 desc", "shot 2 desc", "shot 3 desc"... sampai ${shotCount}]
  }
]
DILARANG ADA TEKS LAIN SELAIN JSON!`;

        const userPrompt = `Lirik per scene:\n${baseScenes.map(s => `Scene ${s.id}: "${s.lyrics}"`).join('\n')}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }
            ],
            generationConfig: {
              temperature: 0.7,
              response_mime_type: "application/json"
            }
          })
        });

        if (!res.ok) throw new Error(`Gemini API Error: ${res.status}`);
        
        const data = await res.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!jsonText) throw new Error("Format balasan Gemini tidak valid");
        
        const generatedPanels = JSON.parse(jsonText);
        
        return { charRole: char.role, charBible: charSpecificBible, data: generatedPanels };
      });

      const results = await Promise.all(charPromises);

      // Merge results back into scenes
      const finalScenes = baseScenes.map(scene => {
        const charPrompts = [];
        const panelDuration = (sceneDuration / shotCount).toFixed(1);

        results.forEach(res => {
          const charScene = res.data.find(s => s.sceneId === scene.id) || { panels: [] };
          const panels = charScene.panels || [];
          
          // Fallback if AI gave wrong number of panels
          while (panels.length < shotCount) panels.push(`Melanjutkan aksi di ${location || 'lokasi'}`);
          const exactPanels = panels.slice(0, shotCount);

          // Build ITI
          const itiPrompt = `=== PROMPT IMAGE-TO-IMAGE: SCENE ${scene.id} (${shotCount} Shot) ===\n\nKARAKTER: ${res.charRole}\n\n--- CHARACTER BIBLE (KONSISTEN) ---\n${res.charBible}\n---\n\nINSTRUKSI GRID: Buat 1 gambar grid berisi ${shotCount} panel/shot untuk karakter ini. Karakter wajib identik di setiap panel (wajah, kostum). Beda pose/sudut saja.\n\n${exactPanels.map((p, idx) => `[SHOT ${idx+1}] ${p}`).join('\n')}\n\nSTYLE: Sinematik, 4K, konsistensi karakter 100%.`;

          // Build ITV
          const timings = exactPanels.map((p, idx) => {
            const start = (idx * panelDuration).toFixed(1);
            const end = ((idx + 1) * panelDuration).toFixed(1);
            return `Shot ${idx+1} (${start}s–${end}s): ${p} [Transisi: ${idx < shotCount - 1 ? 'cut' : 'fade'}]`;
          });
          const itvPrompt = `=== PROMPT IMAGE-TO-VIDEO: SCENE ${scene.id} ===\n\nKARAKTER: ${res.charRole}\nDURASI: ${sceneDuration} detik\n\n--- CHARACTER BIBLE ---\n${res.charBible}\n---\n\nBuat video ${sceneDuration} detik yang mengalir mulus dengan konsistensi penuh untuk karakter ini.\n\nTIMING:\n${timings.join('\n')}`;

          charPrompts.push({
            character: res.charRole,
            itiPrompt,
            itvPrompt
          });
        });

        return { ...scene, prompts: charPrompts };
      });

      set({ scenes: finalScenes, isGenerating: false, generatingStatus: '' });

    } catch (e) {
      console.error(e);
      alert(`Terjadi kesalahan saat generate: ${e.message}`);
      set({ isGenerating: false, generatingStatus: '' });
    }
  },

  regenerateScene: async (sceneId) => {
    // Regenerating specific scene logic can be similar, for now we leave it simple or disable it in complex mode
    alert("Fitur Regenerate per Scene sedang disesuaikan dengan API Gemini.");
  },
}));

function getActiveCharsFullList(state) {
  const list = [];
  list.push({ role: 'Artis Utama', data: state.artistUtama });
  if (state.artistFeaturing.active) list.push({ role: 'Artis Featuring', data: state.artistFeaturing });
  Object.entries(state.bandPersonil).forEach(([key, p]) => {
    if (p.active) list.push({ role: p.name || key, data: p });
  });
  return list;
}

function buildCharacterBible(role, char) {
  const lines = [`[CHARACTER BIBLE: ${role.toUpperCase()}]`];
  lines.push(`Gender: ${char.gender === 'pria' ? 'Pria (Male)' : 'Wanita (Female)'}`);
  if (char.facePhotoUrl) lines.push(`Foto Referensi Wajah: [GUNAKAN FOTO INPUT SEBAGAI REFERENSI WAJAH]`);
  if (char.clothesPhotoUrl) lines.push(`Foto Referensi Baju: [GUNAKAN FOTO INPUT SEBAGAI REFERENSI KOSTUM]`);
  if (!char.clothesPhotoUrl && char.baju) lines.push(`Baju: ${char.baju}${char.warnaBaju ? `, Warna: ${char.warnaBaju}` : ''}`);
  if (!char.clothesPhotoUrl && char.celana) lines.push(`Celana: ${char.celana}${char.warnaCelana ? `, Warna: ${char.warnaCelana}` : ''}`);
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
