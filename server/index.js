require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const connectDB = require('./db');
const License = require('./models/License');
const User = require('./models/User');

const GOOGLE_CLIENT_ID = '677784266542-sbtufl9691u1aliv8poqo399hjo6282p.apps.googleusercontent.com';

// Verify Google ID token via Google's public endpoint (no native deps needed)
async function verifyGoogleToken(credential) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
  if (!res.ok) throw new Error('Token ID Google tidak valid atau telah kadaluarsa');
  const payload = await res.json();
  if (payload.aud !== GOOGLE_CLIENT_ID && payload.azp !== GOOGLE_CLIENT_ID) {
    console.warn('Google aud mismatch. aud:', payload.aud, 'azp:', payload.azp);
  }
  return payload; // { email, name, picture, sub, ... }
}

// Verify Google Access Token via userinfo endpoint
async function verifyGoogleAccessToken(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error('Token akses Google tidak valid atau telah kadaluarsa');
  return await res.json(); // { sub, email, name, picture, ... }
}

// Helper: get Gravatar URL from email
function gravatarUrl(email) {
  const hash = crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?s=200&d=identicon`;
}

// For Vercel serverless: connectDB is called per-request (cached internally)
// No init() at startup — each route will ensure DB is connected


const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = 'shotai_super_secret_key_123'; // Use env variable in prod

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// === AUTH MIDDLEWARE ===
const requireAuth = (req, res, next) => {
  const token = req.cookies.admin_token;
  if (!token) {
    return res.redirect('/login');
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie('admin_token');
    return res.redirect('/login');
  }
};

// === PUBLIC ROUTES ===

// 1. Landing Page
app.get('/', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ShotAI</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Inter', sans-serif; background-color: #09090b; color: #f1f5f9; overflow-x: hidden; }
            .gradient-bg {
                position: absolute; top: 0; right: 0; width: 60%; height: 100%;
                background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.15) 0%, rgba(9, 9, 11, 0) 70%);
                z-index: -1; pointer-events: none;
            }
            .mockup-shadow { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8); }
        </style>
    </head>
    <body class="relative min-h-screen flex flex-col bg-[#09090b] text-[#f1f5f9]">
        <div class="gradient-bg"></div>
        
        <!-- Header -->
        <header class="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-[#27272a]">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-black border border-white/15 flex items-center justify-center shadow-lg shadow-purple-900/30">
                    <div class="w-4 h-4 rounded-sm" style="background: linear-gradient(135deg, #4f46e5, #ec4899, #eab308);"></div>
                </div>
                <span class="font-bold text-lg text-white">ShotAI</span>
            </div>
            <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
                <a href="#" class="hover:text-white transition-colors">Workspace</a>
                <a href="#" class="hover:text-white transition-colors">Privasi</a>
                <a href="#" class="hover:text-white transition-colors">Cara Mulai</a>
                <a href="#" class="hover:text-white transition-colors">FAQ</a>
                <a href="#" class="hover:text-white transition-colors">Toko</a>
                <a href="/login" class="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-2 rounded-full transition shadow-md shadow-indigo-600/30 font-semibold">Masuk</a>
            </nav>
        </header>

        <!-- Hero Section -->
        <main class="flex-grow w-full max-w-7xl mx-auto px-6 py-16 md:py-24 flex flex-col md:flex-row items-center">
            
            <!-- Left Text -->
            <div class="w-full md:w-1/2 pr-0 md:pr-12 z-10">
                <p class="text-indigo-400 text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  Workspace AI • Windows
                </p>
                <h1 class="text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6 text-white">
                    Lebih banyak berkarya.<br>
                    <span class="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Lebih sedikit berpindah.</span>
                </h1>
                <p class="text-lg text-gray-400 mb-10 leading-relaxed max-w-md">
                    Atur akun, layanan, dan sesi kerja AI milik Anda dalam satu aplikasi desktop. Setiap profil tetap terpisah, rapi, dan siap dilanjutkan.
                </p>
                
                <div class="flex items-center gap-6">
                    <a href="#" class="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 active:scale-95">
                        Download untuk Windows
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                    </a>
                    <a href="#" class="font-semibold text-gray-300 hover:text-white flex items-center gap-2 transition-colors">
                        Lihat cara kerjanya <span class="text-xl">→</span>
                    </a>
                </div>
                <p class="text-xs text-gray-500 mt-4">Windows 10/11 • Versi terbaru 1.0.17 • Update otomatis</p>
            </div>

            <!-- Right Mockup UI -->
            <div class="w-full md:w-1/2 mt-16 md:mt-0 relative">
                <div class="bg-[#18181b] rounded-2xl mockup-shadow overflow-hidden border border-[#27272a] w-full aspect-[4/3] flex flex-col relative transform rotate-1 md:rotate-2 hover:rotate-0 transition duration-500">
                    
                    <!-- Mac Window Header -->
                    <div class="h-10 bg-[#111113] border-b border-[#27272a] flex items-center px-4 gap-2">
                        <div class="w-3 h-3 rounded-full bg-red-500/80"></div>
                        <div class="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                        <div class="w-3 h-3 rounded-full bg-green-500/80"></div>
                        <span class="text-xs text-gray-400 font-semibold ml-2 font-mono">ShotAI</span>
                    </div>

                    <!-- App Body -->
                    <div class="flex flex-1">
                        <!-- Sidebar -->
                        <div class="w-48 bg-[#111113] border-r border-[#27272a] p-4 flex flex-col gap-2">
                            <div class="w-8 h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center mb-6 shadow">
                                <div class="w-4 h-4 rounded-sm" style="background: linear-gradient(135deg, #4f46e5, #ec4899, #eab308);"></div>
                            </div>
                            <div class="px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow-sm">Overview</div>
                            <div class="px-3 py-2 text-gray-400 text-xs font-semibold">Google Flow</div>
                            <div class="px-3 py-2 text-gray-400 text-xs font-semibold">Dola AI</div>
                            <div class="px-3 py-2 text-gray-400 text-xs font-semibold">Grok</div>
                            <div class="px-3 py-2 text-gray-400 text-xs font-semibold">Leonardo</div>
                            <div class="px-3 py-2 text-gray-400 text-xs font-semibold">ChatGPT</div>
                        </div>
                        
                        <!-- Content -->
                        <div class="flex-1 bg-[#18181b] p-8 text-white">
                            <p class="text-indigo-400 text-[10px] font-bold tracking-wider uppercase mb-2">WORKSPACE</p>
                            <h2 class="text-2xl font-bold text-white mb-6">Semua sesi, satu tempat.</h2>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <!-- Card 1 -->
                                <div class="bg-[#111113] border border-[#27272a] rounded-xl p-4 shadow-sm hover:border-[#3f3f46] transition">
                                    <h3 class="font-bold text-sm text-white">Google Flow</h3>
                                    <p class="text-xs text-gray-400 mb-3">3 profil siap</p>
                                    <button class="bg-[#27272a] hover:bg-[#3f3f46] text-white text-[10px] px-4 py-1.5 rounded-lg font-semibold transition">Buka</button>
                                </div>
                                <!-- Card 2 -->
                                <div class="bg-[#111113] border border-[#27272a] rounded-xl p-4 shadow-sm hover:border-[#3f3f46] transition">
                                    <h3 class="font-bold text-sm text-white">Dola AI</h3>
                                    <p class="text-xs text-gray-400 mb-3">2 profil siap</p>
                                    <button class="bg-[#27272a] hover:bg-[#3f3f46] text-white text-[10px] px-4 py-1.5 rounded-lg font-semibold transition">Buka</button>
                                </div>
                                <!-- Card 3 -->
                                <div class="bg-[#111113] border border-[#27272a] rounded-xl p-4 shadow-sm hover:border-[#3f3f46] transition">
                                    <h3 class="font-bold text-sm text-white">ChatGPT</h3>
                                    <p class="text-xs text-gray-400 mb-3">Workspace aktif</p>
                                    <button class="bg-[#27272a] hover:bg-[#3f3f46] text-white text-[10px] px-4 py-1.5 rounded-lg font-semibold transition">Buka</button>
                                </div>
                                <!-- Add New -->
                                <div class="bg-[#111113]/50 border border-dashed border-[#3f3f46] rounded-xl p-4 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-[#111113] transition">
                                    <span class="text-lg mb-1">+</span>
                                    <span class="text-[10px]">Tambah akun</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Floating Badge -->
                <div class="absolute -bottom-6 right-10 bg-[#111113] text-white px-6 py-4 rounded-xl shadow-2xl border border-[#27272a] flex items-center gap-4 z-20">
                    <div class="w-3 h-3 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.8)]"></div>
                    <div>
                        <h4 class="font-bold text-sm text-white">Sesi tersimpan</h4>
                        <p class="text-xs text-gray-400">Data tetap di perangkat</p>
                    </div>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="w-full max-w-7xl mx-auto px-6 py-8 border-t border-[#27272a] mt-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div class="font-bold text-sm text-gray-300">Akun Anda. Sesi Anda. Workflow Anda.</div>
            <div class="flex gap-6 text-xs text-gray-500 font-medium">
                <span>Profil terpisah</span>
                <span>Sesi lokal</span>
                <span>Lisensi online</span>
                <span>Pembaruan aman</span>
            </div>
        </footer>
    </body>
    </html>
  `;
  res.send(html);
});

// 2. Login Page
app.get('/login', (req, res) => {
  // If already logged in, redirect based on role
  if (req.cookies.admin_token) {
    try {
      const decoded = jwt.verify(req.cookies.admin_token, JWT_SECRET);
      return res.redirect(decoded.role === 'superadmin' ? '/admin' : '/');
    } catch(e) {
      res.clearCookie('admin_token');
    }
  }

  const GOOGLE_CLIENT_ID_HTML = '677784266542-sbtufl9691u1aliv8poqo399hjo6282p.apps.googleusercontent.com';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Masuk Superadmin - ShotAi</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script src="https://accounts.google.com/gsi/client" async defer><\/script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #09090b; color: #f1f5f9; }
    .glass { background: #111113; border: 1px solid #27272a; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8); }
    .g-btn { display:flex; align-items:center; justify-content:center; gap:10px; width:100%; padding:12px 16px; border-radius:10px; border:1px solid #27272a; background:#18181b; color:white; font-weight:600; font-size:14px; cursor:pointer; transition:all .2s; }
    .g-btn:hover { background:#27272a; border-color:#3f3f46; }
    .inp { width:100%; padding:11px 14px; border-radius:10px; border:1px solid #27272a; background:#09090b; color:white; font-size:14px; outline:none; transition:border .2s; }
    .inp:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.25); }
    .inp::placeholder { color:#71717a; }
    .lbl { display:block; font-size:12px; font-weight:600; color:#a1a1aa; margin-bottom:6px; text-transform:uppercase; letter-spacing:.05em; }
    .submit-btn { width:100%; padding:13px; border-radius:10px; border:none; background:linear-gradient(135deg,#4F7FFF,#7C3AED); color:white; font-weight:700; font-size:14px; cursor:pointer; transition:opacity .2s; box-shadow:0 4px 16px rgba(124,58,237,0.35); }
    .submit-btn:hover { opacity:.9; }
    .divider { display:flex; align-items:center; gap:12px; margin:18px 0; }
    .divider::before,.divider::after { content:''; flex:1; height:1px; background:#27272a; }
    .divider span { color:#71717a; font-size:12px; font-weight:500; }
  </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4 bg-[#09090b]">
  <div class="glass w-full max-w-md rounded-2xl p-8">
    <div class="text-center mb-6">
      <div class="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4" style="background:linear-gradient(135deg,#4F7FFF,#7C3AED);box-shadow:0 0 30px rgba(124,58,237,.5)">
        <span style="font-size:22px;font-weight:900;color:white;letter-spacing:-1px">SA</span>
      </div>
      <h1 class="text-2xl font-bold text-white tracking-tight">Login Superadmin</h1>
      <p class="text-gray-400 text-xs mt-1">Masuk untuk mengelola lisensi ShotAi</p>
    </div>

    <!-- Official Google GSI Button Container -->
    <div id="googleBtnContainer" class="w-full flex justify-center mb-3"></div>

    <!-- Fallback Custom Google Button -->
    <button class="g-btn" id="googleBtn" onclick="doGoogleLogin()">
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
      <span>Masuk dengan Akun Google</span>
    </button>

    <div class="divider"><span>atau masuk dengan email & password</span></div>

    <form id="loginForm" class="space-y-4">
      <div>
        <label class="lbl">Email Superadmin</label>
        <input type="email" id="email" class="inp" placeholder="salmanbs2018@gmail.com" required>
      </div>
      <div>
        <label class="lbl">Password</label>
        <input type="password" id="password" class="inp" placeholder="••••••••" required>
      </div>
      <button type="submit" id="submitBtn" class="submit-btn">Masuk ke Dashboard</button>
      <div id="errorMsg" class="text-red-400 text-xs text-center hidden p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 font-medium"></div>
    </form>

    <div class="mt-4 pt-3 border-t border-[#27272a] text-center">
      <button type="button" onclick="fillSuperadmin()" class="text-xs text-indigo-400 hover:text-indigo-300 transition underline cursor-pointer">
        ⚡ Masuk Cepat: salmanbs2018@gmail.com
      </button>
    </div>

    <div class="mt-4 text-center">
      <a href="/" class="text-xs text-gray-500 hover:text-gray-300 transition">← Kembali ke Beranda ShotAi</a>
    </div>
  </div>

  <script>
    const CLIENT_ID = '${GOOGLE_CLIENT_ID_HTML}';
    let tokenClient = null;

    async function sendAuthPayload(payload) {
      const errorDiv = document.getElementById('errorMsg');
      const btn = document.getElementById('googleBtn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Memverifikasi akun Google...';
      }
      try {
        const res = await fetch('/api/google-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = data.redirect || '/admin';
        } else {
          errorDiv.textContent = data.message || 'Login Google gagal';
          errorDiv.classList.remove('hidden');
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Masuk dengan Akun Google';
          }
        }
      } catch (err) {
        errorDiv.textContent = 'Kesalahan koneksi ke server';
        errorDiv.classList.remove('hidden');
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Masuk dengan Akun Google';
        }
      }
    }

    function initGoogle() {
      if (typeof google === 'undefined' || !google.accounts) {
        setTimeout(initGoogle, 200);
        return;
      }
      try {
        // 1. Google Identity Services ID Token initialization
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            if (response && response.credential) {
              sendAuthPayload({ credential: response.credential });
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });

        const container = document.getElementById('googleBtnContainer');
        if (container) {
          google.accounts.id.renderButton(container, {
            theme: 'filled_blue',
            size: 'large',
            width: 360,
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left'
          });
        }

        // 2. OAuth2 Token Client (Popup flow for custom button)
        if (google.accounts.oauth2) {
          tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: 'email profile openid',
            callback: (tokenResponse) => {
              if (tokenResponse && tokenResponse.access_token) {
                sendAuthPayload({ accessToken: tokenResponse.access_token });
              } else if (tokenResponse && tokenResponse.error) {
                const errorDiv = document.getElementById('errorMsg');
                errorDiv.textContent = 'Google Auth Error: ' + (tokenResponse.error_description || tokenResponse.error);
                errorDiv.classList.remove('hidden');
                document.getElementById('googleBtn').disabled = false;
                document.getElementById('googleBtn').textContent = 'Masuk dengan Akun Google';
              }
            }
          });
        }
      } catch (e) {
        console.warn('Google init warning:', e);
      }
    }

    function doGoogleLogin() {
      const btn = document.getElementById('googleBtn');
      const errorDiv = document.getElementById('errorMsg');
      errorDiv.classList.add('hidden');

      if (tokenClient) {
        btn.disabled = true;
        btn.textContent = 'Membuka Google...';
        tokenClient.requestAccessToken({ prompt: 'select_account' });
      } else if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        btn.disabled = true;
        btn.textContent = 'Menghubungkan ke Google...';
        google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            btn.disabled = false;
            btn.textContent = 'Masuk dengan Akun Google';
            // Trigger direct OAuth fallback
            const redirectUri = window.location.origin + '/api/google-callback';
            const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
              client_id: CLIENT_ID,
              redirect_uri: redirectUri,
              response_type: 'token',
              scope: 'email profile openid',
              prompt: 'select_account'
            }).toString();
            window.location.href = authUrl;
          }
        });
      } else {
        // Direct OAuth fallback
        const redirectUri = window.location.origin + '/api/google-callback';
        const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
          client_id: CLIENT_ID,
          redirect_uri: redirectUri,
          response_type: 'token',
          scope: 'email profile openid',
          prompt: 'select_account'
        }).toString();
        window.location.href = authUrl;
      }
    }

    function fillSuperadmin() {
      document.getElementById('email').value = 'salmanbs2018@gmail.com';
      document.getElementById('password').value = 'Armanofi88';
      document.getElementById('submitBtn').click();
    }

    window.addEventListener('load', initGoogle);

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const errorDiv = document.getElementById('errorMsg');
      const btn = document.getElementById('submitBtn');
      btn.textContent = 'Memproses...'; btn.disabled = true;
      try {
        const res = await fetch('/api/login', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = data.redirect || '/admin';
        } else {
          errorDiv.textContent = data.message;
          errorDiv.classList.remove('hidden');
          btn.textContent = 'Masuk ke Dashboard';
          btn.disabled = false;
        }
      } catch (err) {
        errorDiv.textContent = 'Terjadi kesalahan jaringan';
        errorDiv.classList.remove('hidden');
        btn.textContent = 'Masuk ke Dashboard';
        btn.disabled = false;
      }
    });
  <\/script>
</body>
</html>`;
  res.send(html);
});
// 3. Login API Endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Always ensure DB connected (critical for Vercel serverless)
    await connectDB();

    // Seed superadmin on every request if not exists (safe for serverless)
    await User.findOneAndUpdate(
      { role: 'superadmin' },
      { 
        email: 'salmanbs2018@gmail.com', password: 'Armanofi88', role: 'superadmin',
        $setOnInsert: { 
          name: 'Super Admin',
          avatarUrl: gravatarUrl('salmanbs2018@gmail.com')
        }
      },
      { upsert: true, new: true }
    );

    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ success: false, message: 'Email atau password salah' });

    // Auto-set name & avatar if not yet set
    if (!user.name || !user.avatarUrl) {
      const autoName = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      await User.findByIdAndUpdate(user._id, {
        $set: {
          name: user.name || autoName,
          avatarUrl: user.avatarUrl || gravatarUrl(email)
        }
      });
      user.name = user.name || autoName;
      user.avatarUrl = user.avatarUrl || gravatarUrl(email);
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    
    // Set cookie
    res.cookie('admin_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    // Role-based redirect
    const redirect = user.role === 'superadmin' ? '/admin' : '/';
    res.json({ success: true, message: 'Berhasil login', redirect });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// 3b. Get User Profile (used by PC app to sync account data)
app.get('/api/user-profile', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ success: false, message: 'Email diperlukan' });

  try {
    await connectDB();
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      // Return gravatar as fallback even if user not in web DB
      const autoName = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return res.json({
        success: true,
        data: { email, name: autoName, avatarUrl: gravatarUrl(email) }
      });
    }
    res.json({
      success: true,
      data: {
        email: user.email,
        name: user.name || email.split('@')[0],
        avatarUrl: user.avatarUrl || gravatarUrl(email),
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 3c. Update User Profile (from web profile page)
app.post('/api/update-profile', async (req, res) => {
  const { email, name, avatarUrl } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email diperlukan' });

  try {
    await connectDB();
    await User.findOneAndUpdate(
      { email: email.trim().toLowerCase() },
      { $set: { name: name || '', avatarUrl: avatarUrl || gravatarUrl(email) } },
      { upsert: false }
    );
    res.json({ success: true, message: 'Profil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 3d. Google OAuth Login
app.post('/api/google-login', async (req, res) => {
  const { credential, accessToken } = req.body;
  if (!credential && !accessToken) {
    return res.status(400).json({ success: false, message: 'Token Google tidak ditemukan.' });
  }

  try {
    await connectDB();

    let email, name, picture, googleId;

    if (credential) {
      // Verify Google ID token using lightweight fetch (no native deps)
      const payload = await verifyGoogleToken(credential);
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
      googleId = payload.sub;
    } else if (accessToken) {
      // Verify Google Access Token via userinfo endpoint
      const gUser = await verifyGoogleAccessToken(accessToken);
      email = gUser.email;
      name = gUser.name;
      picture = gUser.picture;
      googleId = gUser.sub;
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email tidak ditemukan dari akun Google.' });
    }

    // Always grant 'superadmin' role on Google Login to the superadmin dashboard
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        $set: {
          name: name || email.split('@')[0],
          avatarUrl: picture || gravatarUrl(email),
          role: 'superadmin',
        },
        $setOnInsert: {
          password: `google_${googleId || Date.now()}`,
        }
      },
      { upsert: true, new: true }
    );

    // Generate JWT token with superadmin role
    const token = jwt.sign(
      { id: user._id, email: user.email, role: 'superadmin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('admin_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      redirect: '/admin',
      profile: { name: user.name, email: user.email, avatarUrl: user.avatarUrl }
    });
  } catch (err) {
    console.error('Google login error:', err.message);
    res.status(401).json({ success: false, message: 'Token Google tidak valid: ' + err.message });
  }
});

// 3e. Direct Google OAuth Callback Fallback
app.get('/api/google-callback', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Memproses Login Google...</title>
</head>
<body style="background:#09090b;color:#f1f5f9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;">
    <div style="font-size:24px;margin-bottom:12px;">🔄</div>
    <p style="font-size:16px;">Memproses autentikasi Google...</p>
    <script>
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      if (accessToken) {
        fetch('/api/google-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken })
        })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            window.location.href = data.redirect || '/admin';
          } else {
            alert(data.message || 'Login gagal');
            window.location.href = '/login';
          }
        })
        .catch(() => {
          window.location.href = '/login';
        });
      } else {
        window.location.href = '/login';
      }
    <\/script>
  </div>
</body>
</html>`);
});

// 4. Logout API
app.get('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.redirect('/');
});


// === PROTECTED ADMIN ROUTES ===

// 5. Admin Dashboard (Protected)
app.get('/admin', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const rows = await License.find().sort({ createdAt: -1 });
    
    let rowsHtml = '';
    rows.forEach(row => {
      rowsHtml += `
        <tr class="border-b border-[#27272a] hover:bg-white/[0.03] transition-colors">
          <td class="py-3.5 px-6 text-left whitespace-nowrap">
            <span class="font-medium font-mono text-indigo-300 bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-800/60 text-xs shadow-sm">${row.code}</span>
          </td>
          <td class="py-3.5 px-6 text-left">
            <span class="${row.type === 'premium' ? 'bg-purple-950/80 text-purple-300 border border-purple-800/80 shadow-purple-950/50' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 shadow-emerald-950/50'} font-bold py-1 px-3 rounded-full text-xs shadow-sm">${row.type.toUpperCase()}</span>
          </td>
          <td class="py-3.5 px-6 text-left text-xs font-mono text-gray-300">${row.owner_email || '<span class="text-gray-600">-</span>'}</td>
          <td class="py-3.5 px-6 text-center">
            <span class="bg-blue-950/80 text-blue-300 border border-blue-800/80 py-1 px-3 rounded-full text-xs shadow-sm shadow-blue-950/50 font-medium">${row.status}</span>
          </td>
        </tr>
      `;
    });

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ShotAi Superadmin Dashboard</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #09090b; color: #f1f5f9; min-height: 100vh; }
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: #09090b; }
            ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
          </style>
      </head>
      <body class="bg-[#09090b] text-[#f1f5f9]">
          <div class="min-h-screen p-6 md:p-10 bg-[#09090b]">
              <div class="max-w-5xl mx-auto bg-[#111113] rounded-2xl border border-[#27272a] shadow-2xl overflow-hidden">
                  <!-- Header -->
                  <div class="bg-[#18181b] border-b border-[#27272a] p-6 flex flex-wrap justify-between items-center gap-4">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/40 flex-shrink-0">
                          <span class="text-white font-black text-base tracking-tight">SA</span>
                        </div>
                        <div>
                          <h1 class="text-xl font-bold text-white tracking-tight">ShotAi Superadmin Dashboard</h1>
                          <p class="text-gray-400 text-xs mt-0.5">Logged in as: <span class="text-indigo-300 font-mono">${req.user.email}</span></p>
                        </div>
                      </div>
                      <div class="flex items-center gap-3">
                        <span class="text-emerald-400 text-xs bg-emerald-950/60 px-3 py-1.5 rounded-full border border-emerald-800/80 font-medium flex items-center gap-1.5 shadow-sm shadow-emerald-950">
                          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          API Online
                        </span>
                        <a href="/logout" class="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold py-2 px-4 rounded-lg transition border border-white/10">Logout</a>
                      </div>
                  </div>
                  
                  <div class="p-6 md:p-8 bg-[#111113]">
                      <!-- Generate License Section -->
                      <div class="mb-8 p-5 bg-[#18181b] rounded-xl border border-[#27272a] shadow-lg">
                          <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <span>🔑</span>
                            <span>Buat Lisensi Baru</span>
                          </h3>
                          <form id="generateForm" class="flex flex-wrap md:flex-nowrap items-end gap-4">
                              <div class="w-full md:flex-1">
                                  <label class="block text-xs font-semibold text-gray-400 mb-1.5">Tipe Lisensi</label>
                                  <select id="licType" class="w-full p-2.5 bg-[#09090b] text-white border border-[#27272a] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" onchange="toggleEmailField()">
                                      <option value="free">Free</option>
                                      <option value="premium">Premium</option>
                                  </select>
                              </div>
                              <div class="w-full md:flex-1" id="emailContainer" style="display: none;">
                                  <label class="block text-xs font-semibold text-gray-400 mb-1.5">Email Pemilik (Wajib untuk Premium)</label>
                                  <input type="email" id="licEmail" placeholder="email@contoh.com" class="w-full p-2.5 bg-[#09090b] text-white border border-[#27272a] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder-gray-600">
                              </div>
                              <div class="w-full md:w-auto">
                                  <button type="submit" class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-2.5 px-6 rounded-lg transition shadow-lg shadow-indigo-600/30 text-sm cursor-pointer active:scale-95">Generate Lisensi</button>
                              </div>
                          </form>
                      </div>

                      <div class="flex items-center justify-between mb-4">
                        <h2 class="text-base font-bold text-white flex items-center gap-2">
                          <span>📋</span>
                          <span>Daftar Lisensi Terdaftar</span>
                        </h2>
                        <span class="text-xs text-gray-400 font-mono">${rows.length} lisensi</span>
                      </div>
                      
                      <div class="overflow-x-auto rounded-xl border border-[#27272a] bg-[#111113]">
                          <table class="min-w-full table-auto border-collapse">
                              <thead>
                                  <tr class="bg-[#18181b] text-gray-400 uppercase text-xs leading-normal font-semibold border-b border-[#27272a]">
                                      <th class="py-3.5 px-6 text-left">Kode Lisensi</th>
                                      <th class="py-3.5 px-6 text-left">Tipe</th>
                                      <th class="py-3.5 px-6 text-left">Email Pemilik</th>
                                      <th class="py-3.5 px-6 text-center">Status</th>
                                  </tr>
                              </thead>
                              <tbody class="text-sm">
                                  ${rowsHtml || '<tr><td colspan="4" class="text-center py-8 text-gray-500">Belum ada lisensi terdaftar</td></tr>'}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          </div>

          <script>
            function toggleEmailField() {
                const type = document.getElementById('licType').value;
                document.getElementById('emailContainer').style.display = type === 'premium' ? 'block' : 'none';
            }

            document.getElementById('generateForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const type = document.getElementById('licType').value;
                const email = document.getElementById('licEmail').value;

                if (type === 'premium' && !email) {
                    alert('Email wajib diisi untuk lisensi premium!');
                    return;
                }

                try {
                    const res = await fetch('/api/admin/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type, email })
                    });
                    const data = await res.json();
                    if(data.success) {
                        window.location.reload();
                    } else {
                        alert('Gagal: ' + data.message);
                    }
                } catch(err) {
                    alert('Terjadi kesalahan server.');
                }
            });
          </script>
      </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    res.send('Error loading dashboard');
  }
});

// 6. Admin Generate API (Protected)
app.post('/api/admin/generate', requireAuth, async (req, res) => {
  const { type, email } = req.body;
  if (type === 'premium' && !email) {
    return res.status(400).json({ success: false, message: 'Email required for premium' });
  }

  const prefix = type === 'premium' ? 'AKA' : 'SHOTAI';
  const randomPart1 = Math.random().toString(36).substring(2, 10).toUpperCase();
  const randomPart2 = Math.random().toString(36).substring(2, 8).toUpperCase();
  const newCode = `${prefix}-${randomPart1}-${randomPart2}`;

  try {
    await connectDB();
    await License.create({ code: newCode, type, owner_email: email || null });
    res.json({ success: true, code: newCode });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// === PUBLIC API FOR ELECTRON APP ===

// 7. Verify License API (Used by PC App)
app.post('/api/verify-license', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, message: 'Kode lisensi diperlukan.' });

  try {
    await connectDB();
    const row = await License.findOne({ code: code.trim().toUpperCase() });
    if (!row) return res.status(404).json({ success: false, message: 'Lisensi tidak valid.' });
    if (row.status !== 'active') return res.status(403).json({ success: false, message: 'Lisensi dinonaktifkan.' });

    let obfuscatedEmail = null;
    if (row.type === 'premium' && row.owner_email) {
      const parts = row.owner_email.split('@');
      if (parts.length === 2) {
        obfuscatedEmail = `${parts[0].substring(0, 2)}***@${parts[1]}`;
      }
    }
    res.json({ success: true, data: { type: row.type, obfuscatedEmail } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 8. Login Premium API (Used by PC App)
app.post('/api/login-premium', async (req, res) => {
  const { code, email } = req.body;
  if (!code || !email) return res.status(400).json({ success: false, message: 'Kode & email diperlukan.' });

  try {
    await connectDB();
    const row = await License.findOne({ code: code.trim().toUpperCase(), type: 'premium' });
    if (!row) return res.status(404).json({ success: false, message: 'Lisensi tidak ditemukan.' });
    if (row.owner_email.toLowerCase() === email.trim().toLowerCase()) {
      res.json({ success: true, message: 'Berhasil login.' });
    } else {
      res.status(401).json({ success: false, message: 'Email tidak cocok.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Backend API Server running at http://localhost:${PORT}`);
  });
}

// Export for Vercel Serverless
module.exports = app;

