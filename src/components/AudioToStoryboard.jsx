import { useState, useRef } from 'react';
import { Upload, FileAudio, Loader2, Play, CheckCircle, Image as ImageIcon, Copy, ArrowRight } from 'lucide-react';

export default function AudioToStoryboard() {
  const [step, setStep] = useState(1); // 1: Upload, 2: Character Images, 3: Result
  const [file, setFile] = useState(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  // Step 1 Data
  const [characters, setCharacters] = useState([]);
  const [locations, setLocations] = useState([]);
  const [storySummary, setStorySummary] = useState('');
  
  // Step 2 Data
  const [charImages, setCharImages] = useState({}); // { charName: base64Image }

  // Step 3 Data
  const [prompts, setPrompts] = useState({ character: '', location: '', scenes: '' });

  const getApiKey = () => {
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
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    
    if (!selected.type.startsWith('audio/')) {
      setError('Harap pilih file audio (mp3, wav, dll).');
      return;
    }

    const url = URL.createObjectURL(selected);
    const audio = new Audio(url);
    
    audio.onloadedmetadata = () => {
      // 300 seconds = 5 minutes
      if (audio.duration > 300) {
        setError(`Durasi terlalu panjang (${Math.round(audio.duration / 60)} menit). Maksimal 5 menit.`);
        setFile(null);
      } else {
        setError('');
        setFile(selected);
        setDuration(Math.floor(audio.duration));
      }
    };
  };

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const analyzeAudio = async () => {
    if (!file) return;
    const apiKey = getApiKey();
    if (!apiKey) {
      alert("API Key Google AI Studio belum diatur."); return;
    }

    setIsLoading(true);
    setError('');
    setLoadingText('Menganalisa audio dan mengekstrak karakter...');

    try {
      const base64Audio = await toBase64(file);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: `Dengarkan lagu/audio ini secara detail. Balas HANYA dengan JSON murni (tanpa markdown). Ekstrak informasi berikut:\n1. "characters": array string berisi nama/peran semua karakter yang ada di lagu ini (misal ["Pria Patah Hati", "Wanita Misterius"]).\n2. "locations": array string berisi nama lokasi yang mungkin ada (misal ["Kafe Hujan", "Kamar Tidur"]).\n3. "story": string ringkasan cerita lagu ini dalam 2-3 kalimat.` },
              { inline_data: { mime_type: file.type || 'audio/mp3', data: base64Audio } }
            ]
          }],
          generationConfig: { temperature: 0.2, response_mime_type: "application/json" }
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(text);

      setCharacters(parsed.characters || []);
      setLocations(parsed.locations || []);
      setStorySummary(parsed.story || '');
      
      // Initialize image state
      const initialImages = {};
      (parsed.characters || []).forEach(c => initialImages[c] = null);
      setCharImages(initialImages);
      
      setStep(2);
    } catch (err) {
      console.error(err);
      setError(`Gagal menganalisa audio: Pastikan file audio jelas atau coba lagi.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (char, file) => {
    if (!file) return;
    try {
      const b64 = await toBase64(file);
      setCharImages(prev => ({ ...prev, [char]: { base64: b64, mime: file.type } }));
    } catch (e) {
      console.error("Gagal convert gambar", e);
    }
  };

  const generateFinalPrompts = async () => {
    const apiKey = getApiKey();
    setIsLoading(true);
    setError('');
    setLoadingText('Membangun Prompt Karakter & Storyboard (Proses Berat)...');

    try {
      // 1. Generate Character Prompts & Outfit DNA
      const charPromptLines = [];
      const charDetails = {}; // To pass to scene generator

      for (const char of characters) {
        const imgData = charImages[char];
        if (!imgData) continue;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey.trim()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: `Kamu adalah ahli desain karakter Midjourney. Analisa foto ini (dia adalah karakter "${char}"). Buat prompt karakter persis seperti template ini (PENTING: Jangan ada gambar kartun, harus sinematik seperti film layar lebar. Karakter dan bajunya harus 100% konsisten sesuai foto referensi, tidak boleh diubah):\n\nCreate a single unified professional character design showcase sheet.\nCRITICAL ASPECT RATIO: 16:9.\nART STYLE: photorealistic cinematic, 35mm lens, live-action movie style, NOT cartoon, NO illustration, consistent color grading across all variations.\nLayout: 1 full presentation image showing multiple character sheets and clean turnarounds.\nSubject: Exactly matching the provided reference image (clothing and facial features MUST remain 100% consistent with the reference photo).\nConsistency: Face: [Jelaskan wajah dari gambar]. Hair: [Jelaskan rambut]. Body: [Jelaskan tubuh]. Outfit DNA: [Berikan JSON objek pakaian, aksesoris, dll secara detail dari gambar referensi agar tidak berubah]. Signature: [Ciri khas].\nVariations: Variation 1: front_full_body view, natural standing pose, neutral expression, camera: eye-level 50mm | Variation 2: side_profile_full_body view, natural standing pose, neutral expression, camera: eye-level 50mm | Variation 3: back_view_full_body view, natural standing pose, neutral expression, camera: eye-level 50mm | Variation 4: close_up_face view, natural standing pose, neutral expression, camera: eye-level 50mm | Variation 5: three_quarter_full_body view, natural standing pose, neutral expression, camera: eye-level 50mm | Variation 6: front_half_body view, natural standing pose, neutral expression, camera: eye-level 50mm\nEnvironment: flat studio grey background, soft even lighting, no harsh shadow.\nNegative: cartoon, illustration, anime, 3d render, painting, text overlay, watermark, inconsistent face, extra limbs.\n\nKeluarkan HANYA prompt tersebut, tanpa teks tambahan.` },
                { inline_data: { mime_type: imgData.mime, data: imgData.base64 } }
              ]
            }],
            generationConfig: { temperature: 0.4 }
          })
        });
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        charPromptLines.push(`=== KARAKTER: ${char} ===\n${text}\n`);
        charDetails[char] = text; // store for reference
      }

      // 2. Calculate Scenes (10s per scene, 6 panels per scene)
      const totalScenes = Math.ceil(duration / 10);
      
      const resScene = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: `Kamu adalah Sutradara Storyboard. Cerita: "${storySummary}". Karakter yang ada: ${characters.join(', ')}. Lokasi: ${locations.join(', ')}.\nTugas: Buat storyboard berkesinambungan bergaya sinematik layar lebar (bukan kartun). Total Durasi: ${duration} detik. Buat tepat ${totalScenes} Scene (masing-masing 10 detik).\nDi SETIAP Scene, WAJIB buat tepat 6 panel/shot (TIDAK BOLEH lebih atau kurang dari 6 panel per grid) yang menceritakan pergerakan kamera & aksi berkesinambungan.\nOutput dalam bahasa Indonesia. Format:\n\nScene 1 (0s-10s) - Lokasi: ...\nPanel 1: [Deskripsi visual visual, apa yang dilakukan karakter]\nPanel 2: ...\n(sampai Panel 6)\n\nScene 2 (10s-20s) - Lokasi: ...\nPanel 1: ...\n\nLakukan sampai Scene ${totalScenes}. Pastikan cerita menyambung dan selalu gunakan tepat 6 panel di setiap scene.` }
            ]
          }],
          generationConfig: { temperature: 0.7 }
        })
      });
      const dataScene = await resScene.json();
      const textScene = dataScene.candidates?.[0]?.content?.parts?.[0]?.text;

      // 3. Format Locations
      const locationPrompts = locations.map(loc => `=== LOKASI: ${loc} ===\nPhotorealistic establishing shot of ${loc}, cinematic lighting, 8k resolution, highly detailed, unpopulated. --ar 16:9`).join('\n\n');

      setPrompts({
        character: charPromptLines.join('\n'),
        location: locationPrompts || 'Tidak terdeteksi lokasi spesifik.',
        scenes: textScene
      });

      setStep(3);
    } catch (err) {
      console.error(err);
      setError(`Gagal generate prompt: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Berhasil disalin!');
  };

  return (
    <div className="flex flex-col gap-4 text-left">
      {/* STEPS INDICATOR */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-amber-500' : 'bg-slate-700'}`}></div>
        <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-amber-500' : 'bg-slate-700'}`}></div>
        <div className={`flex-1 h-1.5 rounded-full ${step >= 3 ? 'bg-amber-500' : 'bg-slate-700'}`}></div>
      </div>

      {error && (
        <div className="text-red-400 text-xs p-3 bg-red-400/10 rounded-lg border border-red-400/20">{error}</div>
      )}

      {/* STEP 1: UPLOAD AUDIO */}
      {step === 1 && (
        <div className="animate-in fade-in duration-300">
          <div className="p-4 rounded-xl border border-dashed border-slate-600 bg-slate-800/50 flex flex-col items-center justify-center relative hover:bg-slate-800 transition-colors cursor-pointer"
               onClick={() => document.getElementById('audio-upload').click()}
          >
            <input id="audio-upload" type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileAudio size={32} className="text-blue-400" />
                <span className="text-sm font-medium text-slate-200">{file.name}</span>
                <span className="text-xs text-slate-400">Durasi: {Math.floor(duration/60)}m {duration%60}s</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={32} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-200">Upload lagu/audio (Max 5 menit)</span>
              </div>
            )}
          </div>

          {file && !isLoading && (
            <button onClick={analyzeAudio} className="w-full mt-4 py-2.5 rounded-lg text-sm font-bold text-white transition-all flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500">
              Analisa Lagu <ArrowRight size={16} />
            </button>
          )}
        </div>
      )}

      {/* STEP 2: UPLOAD CHARACTERS */}
      {step === 2 && !isLoading && (
        <div className="animate-in fade-in duration-300 flex flex-col gap-4">
          <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
            <h5 className="text-sm font-semibold text-white mb-1">Cerita Ditemukan:</h5>
            <p className="text-xs text-slate-300">{storySummary}</p>
            <p className="text-xs text-slate-400 mt-2">Lokasi: {locations.join(', ') || '-'}</p>
          </div>

          <h5 className="text-sm font-bold text-slate-200 border-b border-slate-700 pb-2">Upload Referensi Wajah Karakter</h5>
          {characters.length === 0 ? (
            <p className="text-xs text-slate-400">Tidak ada karakter spesifik yang terdeteksi. AI akan menggunakan karakter default.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {characters.map(char => (
                <div key={char} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center text-center gap-2">
                  <span className="text-xs font-semibold text-amber-400">{char}</span>
                  <label className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-slate-500 hover:border-blue-400 transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(char, e.target.files[0])} />
                    {charImages[char]?.base64 ? (
                      <img src={`data:${charImages[char].mime};base64,${charImages[char].base64}`} alt={char} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={20} className="text-slate-400" />
                    )}
                  </label>
                  <span className="text-[10px] text-slate-400">{charImages[char] ? 'Diganti' : 'Pilih Foto'}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={generateFinalPrompts} className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-all flex items-center justify-center gap-2" style={{ backgroundColor: '#f59e0b', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.2)' }}>
            <Play size={16} /> Generate Master Prompt
          </button>
        </div>
      )}

      {/* STEP 3: RESULTS */}
      {step === 3 && (
        <div className="animate-in fade-in duration-500 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-green-400 font-bold text-sm bg-green-400/10 p-3 rounded-lg">
            <CheckCircle size={18} /> Sukses Generate Seluruh Prompt!
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">1. Prompt Karakter (Grid)</span>
              <button onClick={() => copyToClipboard(prompts.character)} className="text-xs flex items-center gap-1 bg-slate-700 px-2 py-1 rounded text-white hover:bg-slate-600"><Copy size={12}/> Copy</button>
            </div>
            <textarea readOnly value={prompts.character} className="w-full h-24 p-2 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-mono resize-none" />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">2. Prompt Lokasi</span>
              <button onClick={() => copyToClipboard(prompts.location)} className="text-xs flex items-center gap-1 bg-slate-700 px-2 py-1 rounded text-white hover:bg-slate-600"><Copy size={12}/> Copy</button>
            </div>
            <textarea readOnly value={prompts.location} className="w-full h-16 p-2 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-mono resize-none" />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">3. Scene Berkesinambungan (Per 10 Detik)</span>
              <button onClick={() => copyToClipboard(prompts.scenes)} className="text-xs flex items-center gap-1 bg-amber-600 px-2 py-1 rounded text-white hover:bg-amber-500"><Copy size={12}/> Copy Semua Scene</button>
            </div>
            <textarea readOnly value={prompts.scenes} className="w-full h-48 p-2 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-mono resize-none" />
          </div>
          
          <button onClick={() => { setStep(1); setFile(null); }} className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-lg mt-2">
            Buat Lagu Baru
          </button>
        </div>
      )}

      {/* LOADING STATE */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-6 gap-3">
          <Loader2 size={28} className="text-amber-500 animate-spin" />
          <span className="text-sm text-slate-400 text-center px-4">{loadingText}</span>
        </div>
      )}
    </div>
  );
}
