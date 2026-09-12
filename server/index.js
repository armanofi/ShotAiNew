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
  if (!res.ok) throw new Error('Token tidak valid atau kadaluarsa');
  const payload = await res.json();
  if (payload.aud !== GOOGLE_CLIENT_ID) throw new Error('Token bukan untuk aplikasi ini');
  return payload; // { email, name, picture, sub, ... }
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
            body { font-family: 'Inter', sans-serif; background-color: #f8faf9; color: #1a1a2e; overflow-x: hidden; }
            .gradient-bg {
                position: absolute; top: 0; right: 0; width: 60%; height: 100%;
                background: radial-gradient(circle at top right, rgba(230,244,233,0.8) 0%, rgba(248,250,249,0) 70%);
                z-index: -1; pointer-events: none;
            }
            .mockup-shadow { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        </style>
    </head>
    <body class="relative min-h-screen flex flex-col">
        <div class="gradient-bg"></div>
        
        <!-- Header -->
        <header class="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-gray-200/60">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                    <div class="w-4 h-4 rounded-sm" style="background: linear-gradient(135deg, #4f46e5, #ec4899, #eab308);"></div>
                </div>
                <span class="font-bold text-lg">ShotAI</span>
            </div>
            <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
                <a href="#" class="hover:text-black">Workspace</a>
                <a href="#" class="hover:text-black">Privasi</a>
                <a href="#" class="hover:text-black">Cara Mulai</a>
                <a href="#" class="hover:text-black">FAQ</a>
                <a href="#" class="hover:text-black">Toko</a>
                <a href="/login" class="bg-[#3b5bdb] hover:bg-blue-700 text-white px-6 py-2 rounded-full transition shadow-md">Masuk</a>
            </nav>
        </header>

        <!-- Hero Section -->
        <main class="flex-grow w-full max-w-7xl mx-auto px-6 py-16 md:py-24 flex flex-col md:flex-row items-center">
            
            <!-- Left Text -->
            <div class="w-full md:w-1/2 pr-0 md:pr-12 z-10">
                <p class="text-[#3b5bdb] text-xs font-bold tracking-widest uppercase mb-4">Workspace AI • Windows</p>
                <h1 class="text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6">
                    Lebih banyak berkarya.<br>
                    <span class="text-[#3b5bdb]">Lebih sedikit berpindah.</span>
                </h1>
                <p class="text-lg text-gray-600 mb-10 leading-relaxed max-w-md">
                    Atur akun, layanan, dan sesi kerja AI milik Anda dalam satu aplikasi desktop. Setiap profil tetap terpisah, rapi, dan siap dilanjutkan.
                </p>
                
                <div class="flex items-center gap-6">
                    <a href="#" class="bg-[#3b5bdb] hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg shadow-lg shadow-blue-500/30 transition flex items-center gap-2">
                        Download untuk Windows
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                    </a>
                    <a href="#" class="font-semibold text-gray-800 hover:text-black flex items-center gap-2">
                        Lihat cara kerjanya <span class="text-xl">→</span>
                    </a>
                </div>
                <p class="text-xs text-gray-400 mt-4">Windows 10/11 • Versi terbaru 1.0.17 • Update otomatis</p>
            </div>

            <!-- Right Mockup UI -->
            <div class="w-full md:w-1/2 mt-16 md:mt-0 relative">
                <div class="bg-[#1e1e24] rounded-xl mockup-shadow overflow-hidden border border-gray-700 w-full aspect-[4/3] flex flex-col relative transform rotate-1 md:rotate-2 hover:rotate-0 transition duration-500">
                    
                    <!-- Mac Window Header -->
                    <div class="h-10 bg-[#16161a] border-b border-gray-800 flex items-center px-4 gap-2">
                        <div class="w-3 h-3 rounded-full bg-gray-600"></div>
                        <div class="w-3 h-3 rounded-full bg-gray-600"></div>
                        <div class="w-3 h-3 rounded-full bg-gray-600"></div>
                        <span class="text-xs text-gray-400 font-semibold ml-2">ShotAI</span>
                    </div>

                    <!-- App Body -->
                    <div class="flex flex-1">
                        <!-- Sidebar -->
                        <div class="w-48 bg-[#1e1e24] border-r border-gray-800 p-4 flex flex-col gap-2">
                            <div class="w-8 h-8 rounded bg-black flex items-center justify-center mb-6">
                                <div class="w-4 h-4 rounded-sm" style="background: linear-gradient(135deg, #4f46e5, #ec4899, #eab308);"></div>
                            </div>
                            <div class="px-3 py-2 bg-[#3b5bdb] text-white text-xs font-semibold rounded">Overview</div>
                            <div class="px-3 py-2 text-gray-400 text-xs font-semibold">Google Flow</div>
                            <div class="px-3 py-2 text-gray-400 text-xs font-semibold">Dola AI</div>
                            <div class="px-3 py-2 text-gray-400 text-xs font-semibold">Grok</div>
                            <div class="px-3 py-2 text-gray-400 text-xs font-semibold">Leonardo</div>
                            <div class="px-3 py-2 text-gray-400 text-xs font-semibold">ChatGPT</div>
                        </div>
                        
                        <!-- Content -->
                        <div class="flex-1 bg-white p-8">
                            <p class="text-[#3b5bdb] text-[10px] font-bold tracking-wider uppercase mb-2">WORKSPACE</p>
                            <h2 class="text-2xl font-bold text-gray-800 mb-6">Semua sesi, satu tempat.</h2>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <!-- Card 1 -->
                                <div class="border border-gray-200 rounded-lg p-4 shadow-sm">
                                    <h3 class="font-bold text-sm">Google Flow</h3>
                                    <p class="text-xs text-gray-400 mb-3">3 profil siap</p>
                                    <button class="bg-[#1e1e24] text-white text-[10px] px-4 py-1.5 rounded font-semibold">Buka</button>
                                </div>
                                <!-- Card 2 -->
                                <div class="border border-gray-200 rounded-lg p-4 shadow-sm">
                                    <h3 class="font-bold text-sm">Dola AI</h3>
                                    <p class="text-xs text-gray-400 mb-3">2 profil siap</p>
                                    <button class="bg-[#1e1e24] text-white text-[10px] px-4 py-1.5 rounded font-semibold">Buka</button>
                                </div>
                                <!-- Card 3 -->
                                <div class="border border-gray-200 rounded-lg p-4 shadow-sm">
                                    <h3 class="font-bold text-sm">ChatGPT</h3>
                                    <p class="text-xs text-gray-400 mb-3">Workspace aktif</p>
                                    <button class="bg-[#1e1e24] text-white text-[10px] px-4 py-1.5 rounded font-semibold">Buka</button>
                                </div>
                                <!-- Add New -->
                                <div class="border border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50">
                                    <span class="text-lg mb-1">+</span>
                                    <span class="text-[10px]">Tambah akun</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Floating Badge -->
                <div class="absolute -bottom-6 right-10 bg-[#1e1e24] text-white px-6 py-4 rounded-xl shadow-2xl border border-gray-700 flex items-center gap-4 z-20">
                    <div class="w-3 h-3 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.8)]"></div>
                    <div>
                        <h4 class="font-bold text-sm">Sesi tersimpan</h4>
                        <p class="text-xs text-gray-400">Data tetap di perangkat</p>
                    </div>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="w-full max-w-7xl mx-auto px-6 py-8 border-t border-gray-200/60 mt-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div class="font-bold text-sm text-gray-800">Akun Anda. Sesi Anda. Workflow Anda.</div>
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
  <title>Masuk - ShotAi</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script src="https://accounts.google.com/gsi/client" async defer><\/script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); }
    .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.10); }
    .g-btn { display:flex; align-items:center; justify-content:center; gap:10px; width:100%; padding:12px 16px; border-radius:10px; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.08); color:white; font-weight:600; font-size:14px; cursor:pointer; transition:all .2s; }
    .g-btn:hover { background:rgba(255,255,255,0.16); }
    .inp { width:100%; padding:11px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.07); color:white; font-size:14px; outline:none; transition:border .2s; }
    .inp:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.2); }
    .inp::placeholder { color:rgba(255,255,255,.3); }
    .lbl { display:block; font-size:12px; font-weight:600; color:rgba(255,255,255,.6); margin-bottom:6px; text-transform:uppercase; letter-spacing:.05em; }
    .submit-btn { width:100%; padding:13px; border-radius:10px; border:none; background:linear-gradient(135deg,#4F7FFF,#7C3AED); color:white; font-weight:700; font-size:14px; cursor:pointer; transition:opacity .2s; }
    .submit-btn:hover { opacity:.9; }
    .divider { display:flex; align-items:center; gap:12px; margin:20px 0; }
    .divider::before,.divider::after { content:''; flex:1; height:1px; background:rgba(255,255,255,.1); }
    .divider span { color:rgba(255,255,255,.3); font-size:12px; }
  </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4">
  <div class="glass w-full max-w-md rounded-2xl p-8">
    <div class="text-center mb-8">
      <div class="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4" style="background:linear-gradient(135deg,#4F7FFF,#7C3AED);box-shadow:0 0 30px rgba(124,58,237,.4)">
        <span style="font-size:22px;font-weight:900;color:white;letter-spacing:-1px">SA</span>
      </div>
      <h1 class="text-2xl font-bold text-white">Selamat Datang</h1>
      <p class="text-gray-400 text-sm mt-1">Masuk untuk melanjutkan ke ShotAI</p>
    </div>

    <button class="g-btn" id="googleBtn" onclick="doGoogleLogin()">
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
      Masuk dengan Google
    </button>

    <div class="divider"><span>atau masuk dengan email</span></div>

    <form id="loginForm" class="space-y-4">
      <div><label class="lbl">Email</label><input type="email" id="email" class="inp" placeholder="email@contoh.com" required></div>
      <div><label class="lbl">Password</label><input type="password" id="password" class="inp" placeholder="••••••••" required></div>
      <button type="submit" id="submitBtn" class="submit-btn">Masuk</button>
      <div id="errorMsg" class="text-red-400 text-sm text-center hidden"></div>
    </form>

    <div class="mt-6 text-center">
      <a href="/" class="text-sm text-gray-500 hover:text-gray-300 transition">← Kembali ke Halaman Utama</a>
    </div>
  </div>

  <script>
    const CLIENT_ID = '${GOOGLE_CLIENT_ID_HTML}';

    function doGoogleLogin() {
      const btn = document.getElementById('googleBtn');
      btn.disabled = true;
      btn.textContent = 'Menghubungkan ke Google...';
      google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (response) => {
          try {
            const res = await fetch('/api/google-login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ credential: response.credential }) });
            const data = await res.json();
            if (data.success) { window.location.href = data.redirect || '/'; }
            else { alert(data.message || 'Login gagal'); btn.disabled=false; btn.textContent='Masuk dengan Google'; }
          } catch(e) { alert('Kesalahan jaringan'); btn.disabled=false; }
        },
        ux_mode: 'popup'
      });
      google.accounts.id.prompt();
    }

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const errorDiv = document.getElementById('errorMsg');
      const btn = document.getElementById('submitBtn');
      btn.textContent = 'Memproses...'; btn.disabled = true;
      try {
        const res = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if(data.success) { window.location.href = data.redirect || '/'; }
        else { errorDiv.textContent = data.message; errorDiv.classList.remove('hidden'); btn.textContent='Masuk'; btn.disabled=false; }
      } catch(err) { errorDiv.textContent='Terjadi kesalahan jaringan'; errorDiv.classList.remove('hidden'); btn.textContent='Masuk'; btn.disabled=false; }
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
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ success: false, message: 'Token Google tidak ditemukan.' });

  try {
    await connectDB();

    // Verify Google ID token using lightweight fetch (no native deps)
    const payload = await verifyGoogleToken(credential);
    const { email, name, picture, sub: googleId } = payload;

    if (!email) return res.status(400).json({ success: false, message: 'Email tidak ditemukan dari akun Google.' });

    // Upsert user: create if not exists, update profile if exists
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        $set: {
          name: name || email.split('@')[0],
          avatarUrl: picture || gravatarUrl(email),
        },
        $setOnInsert: {
          password: `google_${googleId}`,
          role: 'user',
        }
      },
      { upsert: true, new: true }
    );

    // Generate JWT token
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('admin_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    const redirect = user.role === 'superadmin' ? '/admin' : '/';
    res.json({ success: true, redirect, profile: { name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (err) {
    console.error('Google login error:', err.message);
    res.status(401).json({ success: false, message: 'Token Google tidak valid: ' + err.message });
  }
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
        <tr class="border-b border-gray-200 hover:bg-gray-50">
          <td class="py-3 px-6 text-left whitespace-nowrap">
            <span class="font-medium font-mono">${row.code}</span>
          </td>
          <td class="py-3 px-6 text-left">
            <span class="${row.type === 'premium' ? 'bg-purple-200 text-purple-600 py-1 px-3 rounded-full text-xs' : 'bg-green-200 text-green-600 py-1 px-3 rounded-full text-xs'} font-bold">${row.type.toUpperCase()}</span>
          </td>
          <td class="py-3 px-6 text-left">${row.owner_email || '-'}</td>
          <td class="py-3 px-6 text-center">
            <span class="bg-blue-200 text-blue-600 py-1 px-3 rounded-full text-xs">${row.status}</span>
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
          <style> body { font-family: 'Inter', sans-serif; background-color: #f3f4f6; } </style>
      </head>
      <body>
          <div class="min-h-screen p-8">
              <div class="max-w-5xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
                  <div class="bg-indigo-600 p-6 flex justify-between items-center">
                      <div>
                        <h1 class="text-2xl font-bold text-white">ShotAi Superadmin Dashboard</h1>
                        <p class="text-indigo-200 text-sm mt-1">Logged in as: ${req.user.email}</p>
                      </div>
                      <div class="flex items-center gap-4">
                        <span class="text-indigo-100 text-sm bg-indigo-800/50 px-3 py-1 rounded-full border border-indigo-500">🟢 API Online</span>
                        <a href="/logout" class="bg-white/10 hover:bg-white/20 text-white text-sm font-semibold py-1.5 px-4 rounded transition">Logout</a>
                      </div>
                  </div>
                  
                  <div class="p-6">
                      <!-- Generate License Section -->
                      <div class="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-inner">
                          <h3 class="text-md font-bold text-gray-700 mb-3">Buat Lisensi Baru</h3>
                          <form id="generateForm" class="flex flex-wrap md:flex-nowrap items-end gap-4">
                              <div class="w-full md:flex-1">
                                  <label class="block text-xs font-semibold text-gray-600 mb-1">Tipe Lisensi</label>
                                  <select id="licType" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" onchange="toggleEmailField()">
                                      <option value="free">Free</option>
                                      <option value="premium">Premium</option>
                                  </select>
                              </div>
                              <div class="w-full md:flex-1" id="emailContainer" style="display: none;">
                                  <label class="block text-xs font-semibold text-gray-600 mb-1">Email Pemilik (Wajib untuk Premium)</label>
                                  <input type="email" id="licEmail" placeholder="email@contoh.com" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                              </div>
                              <div class="w-full md:w-auto">
                                  <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md transition duration-200">Generate</button>
                              </div>
                          </form>
                      </div>

                      <h2 class="text-lg font-semibold text-gray-700 mb-4">Daftar Lisensi Terdaftar</h2>
                      
                      <div class="overflow-x-auto rounded-lg border border-gray-200">
                          <table class="min-w-full table-auto border-collapse">
                              <thead>
                                  <tr class="bg-gray-100 text-gray-600 uppercase text-xs leading-normal font-bold">
                                      <th class="py-3 px-6 text-left">Kode Lisensi</th>
                                      <th class="py-3 px-6 text-left">Tipe</th>
                                      <th class="py-3 px-6 text-left">Email Pemilik</th>
                                      <th class="py-3 px-6 text-center">Status</th>
                                  </tr>
                              </thead>
                              <tbody class="text-gray-600 text-sm font-light">
                                  ${rowsHtml}
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

