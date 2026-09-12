import { useState, useRef } from 'react';
import { Upload, FileAudio, Loader2, Play, Pause, CheckCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function AudioToStoryboard() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const audioRef = useRef(null);
  
  const setStudioView = useAppStore(state => state.setStudioView);
  const setLyrics = useAppStore(state => state.setLyrics);

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
      }
    };
  };

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove data:audio/mp3;base64,
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = error => reject(error);
  });

  const generateStoryboard = async () => {
    if (!file) return;

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
    
    if (!apiKey) {
      alert("API Key Google AI Studio belum diatur. Silakan atur di halaman depan AI Studio.");
      return;
    }

    setIsLoading(true);
    setResult('');
    setError('');

    try {
      const base64Audio = await toBase64(file);
      const safeKey = apiKey.trim();
      const model = 'gemini-3.6-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${safeKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Dengarkan lagu/audio ini dan buatkan liriknya. Jika tidak ada lirik, buatkan ringkasan suasana lagunya. Format teks biasa agar mudah disalin ke Storyboard Maker." },
              {
                inline_data: {
                  mime_type: file.type || 'audio/mp3',
                  data: base64Audio
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.7,
          }
        })
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Gemini API Error ${res.status}: ${errorBody.substring(0, 150)}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) throw new Error("Format balasan Gemini tidak valid");
      
      setResult(text);
    } catch (err) {
      console.error(err);
      setError(`Gagal generate: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseInStoryboard = () => {
    if (result) {
      setLyrics(result);
      setStudioView('storyboard');
    }
  };

  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="p-4 rounded-xl border border-dashed border-slate-600 bg-slate-800/50 flex flex-col items-center justify-center relative hover:bg-slate-800 transition-colors cursor-pointer"
           onClick={() => document.getElementById('audio-upload').click()}
      >
        <input 
          id="audio-upload"
          type="file" 
          accept="audio/*"
          className="hidden" 
          onChange={handleFileChange}
        />
        
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <FileAudio size={32} className="text-blue-400" />
            <span className="text-sm font-medium text-slate-200">{file.name}</span>
            <span className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB - Siap diproses</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={32} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-200">Klik untuk upload lagu (Max 5 menit)</span>
            <span className="text-xs text-slate-400">mp3, wav, m4a</span>
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-400 text-xs p-3 bg-red-400/10 rounded-lg border border-red-400/20">
          {error}
        </div>
      )}

      {file && !result && !isLoading && (
        <button
          onClick={generateStoryboard}
          className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
          style={{ backgroundColor: '#f59e0b', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.2)' }}
        >
          <Play size={16} />
          Generate Lirik & Storyboard
        </button>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-6 gap-3">
          <Loader2 size={28} className="text-amber-500 animate-spin" />
          <span className="text-sm text-slate-400">Gemini sedang mendengarkan lagu... (Bisa butuh 10-30 detik)</span>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              Hasil Generate
            </h5>
            <button
              onClick={handleUseInStoryboard}
              className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 transition-colors"
            >
              Gunakan di Storyboard Maker
            </button>
          </div>
          <textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className="w-full h-48 p-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-sm focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>
      )}
    </div>
  );
}
