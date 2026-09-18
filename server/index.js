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

// === EXPIRY HELPER ===
function calculateExpiry(duration) {
  const now = new Date();
  switch (duration) {
    case '7 Hari': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case '1 Bulan': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    case '3 Bulan': return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    case '6 Bulan': return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
    case '1 Tahun': return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    case 'Selamanya':
    default: return null;
  }
}

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

const requireSuperadmin = (req, res, next) => {
  const token = req.cookies.admin_token;
  if (!token) return res.redirect('/login');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    if (decoded.role !== 'superadmin') {
      return res.redirect('/dashboard');
    }
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
      return res.redirect(decoded.role === 'superadmin' ? '/admin' : '/dashboard');
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
  <title>Login - ShotAi</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script src="https://accounts.google.com/gsi/client" async defer><\/script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #09090b; color: #f1f5f9; }
    .glass { background: #111113; border: 1px solid #27272a; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8); }
  </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4 bg-[#09090b]">
  <div class="glass w-full max-w-sm rounded-2xl p-8 border border-[#27272a] shadow-2xl bg-[#111113]">
    <div class="text-center mb-6">
      <div class="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4" style="background:linear-gradient(135deg,#4F7FFF,#7C3AED);box-shadow:0 0 30px rgba(124,58,237,.5)">
        <span style="font-size:22px;font-weight:900;color:white;letter-spacing:-1px">SA</span>
      </div>
      <h1 class="text-2xl font-bold text-white tracking-tight">Login</h1>
      <p class="text-gray-400 text-xs mt-1.5">Masuk dengan akun Google untuk melanjutkan</p>
    </div>

    <!-- Official Google GSI Button Container (Single Google Menu) -->
    <div id="googleBtnContainer" class="w-full flex justify-center mb-4 min-h-[44px]"></div>

    <div id="errorMsg" class="text-red-400 text-xs text-center hidden p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 font-medium mb-3"></div>

    <div class="mt-6 pt-4 border-t border-[#27272a] text-center">
      <a href="/" class="text-xs text-gray-500 hover:text-gray-300 transition">← Kembali ke Beranda ShotAi</a>
    </div>
  </div>

  <script>
    const CLIENT_ID = '${GOOGLE_CLIENT_ID_HTML}';

    async function sendAuthPayload(payload) {
      const errorDiv = document.getElementById('errorMsg');
      if (errorDiv) errorDiv.classList.add('hidden');
      try {
        const res = await fetch('/api/google-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = data.redirect || '/dashboard';
        } else {
          if (errorDiv) {
            errorDiv.textContent = data.message || 'Login gagal';
            errorDiv.classList.remove('hidden');
          }
        }
      } catch (err) {
        if (errorDiv) {
          errorDiv.textContent = 'Terjadi kesalahan koneksi ke server';
          errorDiv.classList.remove('hidden');
        }
      }
    }

    function initGoogle() {
      if (typeof google === 'undefined' || !google.accounts) {
        setTimeout(initGoogle, 150);
        return;
      }
      try {
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
            width: 320,
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left'
          });
        }
      } catch (e) {
        console.warn('Google init error:', e);
      }
    }

    window.addEventListener('load', initGoogle);
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

    const cleanEmail = email.trim().toLowerCase();
    const isSuperadmin = cleanEmail === 'salmanbs2018@gmail.com';
    const role = isSuperadmin ? 'superadmin' : 'user';

    const user = await User.findOneAndUpdate(
      { email: cleanEmail },
      {
        $set: {
          name: name || cleanEmail.split('@')[0],
          avatarUrl: picture || gravatarUrl(cleanEmail),
          role: role,
        },
        $setOnInsert: {
          password: `google_${googleId || Date.now()}`,
        }
      },
      { upsert: true, new: true }
    );

    // Generate JWT token with appropriate role
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name, avatarUrl: user.avatarUrl },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('admin_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    const redirect = isSuperadmin ? '/admin' : '/dashboard';

    res.json({
      success: true,
      redirect,
      profile: { name: user.name, email: user.email, avatarUrl: user.avatarUrl, role: user.role }
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

// === PROTECTED ADMIN & CUSTOMER ROUTES ===

// 5. Admin Dashboard (Protected - Superadmin Only)
app.get('/admin', requireSuperadmin, async (req, res) => {
  try {
    await connectDB();
    const rows = await License.find().sort({ createdAt: -1 });

    const formatDate = (d) => {
      if (!d) return '-';
      return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    let rowsHtml = '';
    rows.forEach(row => {
      const isExpired = row.expires_at && new Date() > new Date(row.expires_at);
      const displayStatus = isExpired ? 'expired' : row.status;

      let masaAktifHtml = '';
      if (!row.expires_at || row.duration === 'Selamanya') {
        masaAktifHtml = `<span class="bg-emerald-950/80 text-emerald-300 border border-emerald-800/70 py-0.5 px-2.5 rounded-full text-xs font-semibold">Selamanya</span>`;
      } else if (isExpired) {
        masaAktifHtml = `<span class="bg-red-950/80 text-red-400 border border-red-800/70 py-0.5 px-2.5 rounded-full text-xs font-semibold">Kadaluarsa (${formatDate(row.expires_at)})</span>`;
      } else {
        masaAktifHtml = `<span class="text-xs text-indigo-300 font-medium">${row.duration || 'Aktif'} <span class="text-gray-400 text-[11px]">(s/d ${formatDate(row.expires_at)})</span></span>`;
      }

      let statusBadge = '';
      if (displayStatus === 'active') {
        statusBadge = `<span class="bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 py-1 px-3 rounded-full text-xs font-semibold">Aktif</span>`;
      } else if (displayStatus === 'expired') {
        statusBadge = `<span class="bg-red-950/80 text-red-300 border border-red-800/80 py-1 px-3 rounded-full text-xs font-semibold">Kadaluarsa</span>`;
      } else {
        statusBadge = `<span class="bg-zinc-800 text-zinc-400 border border-zinc-700 py-1 px-3 rounded-full text-xs font-semibold">Nonaktif</span>`;
      }

      const rowJson = JSON.stringify({
        id: row._id.toString(),
        code: row.code,
        type: row.type,
        owner_email: row.owner_email || '',
        status: row.status,
        duration: row.duration || 'Selamanya',
        expires_at: row.expires_at ? row.expires_at.toISOString().split('T')[0] : ''
      }).replace(/"/g, '&quot;');

      rowsHtml += `
        <tr class="border-b border-[#27272a] hover:bg-white/[0.03] transition-colors">
          <td class="py-3.5 px-6 text-left whitespace-nowrap">
            <div class="flex items-center gap-2">
              <span class="font-mono text-indigo-300 bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-800/60 text-xs shadow-sm font-semibold">${row.code}</span>
              <button onclick="copyToClipboard('${row.code}')" title="Salin Kode" class="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            </div>
          </td>
          <td class="py-3.5 px-6 text-left">
            <span class="${row.type === 'premium' ? 'bg-purple-950/80 text-purple-300 border border-purple-800/80' : 'bg-blue-950/80 text-blue-300 border border-blue-800/80'} font-bold py-1 px-3 rounded-full text-xs shadow-sm">${row.type.toUpperCase()}</span>
          </td>
          <td class="py-3.5 px-6 text-left text-xs font-mono text-gray-300">${row.owner_email || '<span class="text-gray-600">-</span>'}</td>
          <td class="py-3.5 px-6 text-left">${masaAktifHtml}</td>
          <td class="py-3.5 px-6 text-center">${statusBadge}</td>
          <td class="py-3.5 px-6 text-center whitespace-nowrap">
            <div class="flex items-center justify-center gap-2">
              <button onclick="openEditModal(${rowJson})" class="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 cursor-pointer">
                <span>✏️</span> Edit
              </button>
              <button onclick="deleteLicense('${row._id}')" class="bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 cursor-pointer">
                <span>🗑️</span> Hapus
              </button>
            </div>
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
              <div class="max-w-6xl mx-auto bg-[#111113] rounded-2xl border border-[#27272a] shadow-2xl overflow-hidden">
                  <!-- Header -->
                  <div class="bg-[#18181b] border-b border-[#27272a] p-6 flex flex-wrap justify-between items-center gap-4">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/40 flex-shrink-0">
                          <span class="text-white font-black text-base tracking-tight">SA</span>
                        </div>
                        <div>
                          <div class="flex items-center gap-2">
                            <h1 class="text-xl font-bold text-white tracking-tight">ShotAi Superadmin Dashboard</h1>
                            <span class="bg-indigo-900/60 text-indigo-300 border border-indigo-700/60 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Superadmin</span>
                          </div>
                          <p class="text-gray-400 text-xs mt-0.5">Logged in as: <span class="text-indigo-300 font-mono">${req.user.email}</span></p>
                        </div>
                      </div>
                      <div class="flex items-center gap-3">
                        <a href="/dashboard" class="bg-[#27272a] hover:bg-[#3f3f46] text-gray-300 text-xs font-semibold py-2 px-3.5 rounded-lg transition border border-[#3f3f46]">Lihat Tampilan Pelanggan</a>
                        <a href="/logout" class="bg-red-950/50 hover:bg-red-900/60 text-red-300 text-xs font-semibold py-2 px-3.5 rounded-lg transition border border-red-800/60">Logout</a>
                      </div>
                  </div>
                  
                  <div class="p-6 md:p-8 bg-[#111113]">
                      <!-- Generate License Section -->
                      <div class="mb-8 p-5 bg-[#18181b] rounded-xl border border-[#27272a] shadow-lg">
                          <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <span>🔑</span>
                            <span>Buat Lisensi Baru</span>
                          </h3>
                          <form id="generateForm" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                              <div>
                                  <label class="block text-xs font-semibold text-gray-400 mb-1.5">Tipe Lisensi</label>
                                  <select id="licType" class="w-full p-2.5 bg-[#09090b] text-white border border-[#27272a] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" onchange="toggleEmailField()">
                                      <option value="premium">Premium</option>
                                      <option value="free">Free</option>
                                  </select>
                              </div>
                              <div>
                                  <label class="block text-xs font-semibold text-gray-400 mb-1.5">Masa Aktif</label>
                                  <select id="licDuration" class="w-full p-2.5 bg-[#09090b] text-white border border-[#27272a] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                                      <option value="1 Bulan" selected>1 Bulan (30 Hari)</option>
                                      <option value="7 Hari">7 Hari (Trial)</option>
                                      <option value="3 Bulan">3 Bulan</option>
                                      <option value="6 Bulan">6 Bulan</option>
                                      <option value="1 Tahun">1 Tahun</option>
                                      <option value="Selamanya">Selamanya / Lifetime</option>
                                  </select>
                              </div>
                              <div id="emailContainer">
                                  <label class="block text-xs font-semibold text-gray-400 mb-1.5">Email Pemilik (Wajib untuk Premium)</label>
                                  <input type="email" id="licEmail" placeholder="pelanggan@gmail.com" class="w-full p-2.5 bg-[#09090b] text-white border border-[#27272a] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder-gray-600">
                              </div>
                              <div>
                                  <button type="submit" id="genBtn" class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-2.5 px-4 rounded-lg transition shadow-lg shadow-indigo-600/30 text-sm cursor-pointer active:scale-95">Generate Lisensi</button>
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
                                      <th class="py-3.5 px-6 text-left">Masa Aktif</th>
                                      <th class="py-3.5 px-6 text-center">Status</th>
                                      <th class="py-3.5 px-6 text-center">Aksi</th>
                                  </tr>
                              </thead>
                              <tbody class="text-sm">
                                  ${rowsHtml || '<tr><td colspan="6" class="text-center py-8 text-gray-500">Belum ada lisensi terdaftar</td></tr>'}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          </div>

          <!-- Edit License Modal -->
          <div id="editModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
            <div class="bg-[#18181b] border border-[#27272a] rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div class="flex items-center justify-between pb-4 border-b border-[#27272a] mb-5">
                <h3 class="text-base font-bold text-white flex items-center gap-2">
                  <span>✏️</span> Edit Lisensi
                </h3>
                <button onclick="closeEditModal()" class="text-gray-400 hover:text-white text-lg font-bold">&times;</button>
              </div>
              <form id="editForm" class="space-y-4">
                <input type="hidden" id="editId">
                <div>
                  <label class="block text-xs font-semibold text-gray-400 mb-1">Kode Lisensi</label>
                  <input type="text" id="editCode" disabled class="w-full p-2.5 bg-[#09090b] text-gray-400 border border-[#27272a] rounded-lg text-sm font-mono cursor-not-allowed">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-400 mb-1">Tipe Lisensi</label>
                  <select id="editType" class="w-full p-2.5 bg-[#09090b] text-white border border-[#27272a] rounded-lg text-sm">
                    <option value="premium">Premium</option>
                    <option value="free">Free</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-400 mb-1">Email Pemilik</label>
                  <input type="email" id="editEmail" class="w-full p-2.5 bg-[#09090b] text-white border border-[#27272a] rounded-lg text-sm placeholder-gray-600">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-400 mb-1">Perbarui Masa Aktif</label>
                  <select id="editDuration" class="w-full p-2.5 bg-[#09090b] text-white border border-[#27272a] rounded-lg text-sm">
                    <option value="keep" selected>Biarkan Tetap (Tidak Mengubah Waktu Kadaluarsa)</option>
                    <option value="7 Hari">Ubah ke 7 Hari dari sekarang</option>
                    <option value="1 Bulan">Ubah ke 1 Bulan dari sekarang</option>
                    <option value="3 Bulan">Ubah ke 3 Bulan dari sekarang</option>
                    <option value="6 Bulan">Ubah ke 6 Bulan dari sekarang</option>
                    <option value="1 Tahun">Ubah ke 1 Tahun dari sekarang</option>
                    <option value="Selamanya">Ubah ke Selamanya / Lifetime</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-400 mb-1">Status Lisensi</label>
                  <select id="editStatus" class="w-full p-2.5 bg-[#09090b] text-white border border-[#27272a] rounded-lg text-sm">
                    <option value="active">Aktif</option>
                    <option value="disabled">Nonaktif</option>
                    <option value="expired">Kadaluarsa</option>
                  </select>
                </div>
                <div class="flex items-center justify-end gap-3 pt-4 border-t border-[#27272a] mt-6">
                  <button type="button" onclick="closeEditModal()" class="px-4 py-2 bg-transparent text-gray-400 hover:text-white text-xs font-semibold rounded-lg transition">Batal</button>
                  <button type="submit" id="saveEditBtn" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shadow-md shadow-indigo-600/30">Simpan Perubahan</button>
                </div>
              </form>
            </div>
          </div>

          <script>
            function toggleEmailField() {
              const type = document.getElementById('licType').value;
              document.getElementById('emailContainer').style.opacity = type === 'premium' ? '1' : '0.7';
            }

            function copyToClipboard(text) {
              navigator.clipboard.writeText(text).then(() => {
                alert('Kode lisensi disalin: ' + text);
              }).catch(() => {
                prompt('Salin kode berikut:', text);
              });
            }

            document.getElementById('generateForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              const type = document.getElementById('licType').value;
              const email = document.getElementById('licEmail').value;
              const duration = document.getElementById('licDuration').value;
              const btn = document.getElementById('genBtn');

              if (type === 'premium' && !email) {
                alert('Email pemilik wajib diisi untuk lisensi premium!');
                return;
              }

              btn.disabled = true;
              btn.textContent = 'Memproses...';

              try {
                const res = await fetch('/api/admin/generate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type, email, duration })
                });
                const data = await res.json();
                if (data.success) {
                  window.location.reload();
                } else {
                  alert('Gagal: ' + data.message);
                  btn.disabled = false;
                  btn.textContent = 'Generate Lisensi';
                }
              } catch(err) {
                alert('Terjadi kesalahan server.');
                btn.disabled = false;
                btn.textContent = 'Generate Lisensi';
              }
            });

            function openEditModal(license) {
              document.getElementById('editId').value = license.id;
              document.getElementById('editCode').value = license.code;
              document.getElementById('editType').value = license.type;
              document.getElementById('editEmail').value = license.owner_email || '';
              document.getElementById('editStatus').value = license.status || 'active';
              document.getElementById('editDuration').value = 'keep';
              document.getElementById('editModal').classList.remove('hidden');
            }

            function closeEditModal() {
              document.getElementById('editModal').classList.add('hidden');
            }

            document.getElementById('editForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              const id = document.getElementById('editId').value;
              const type = document.getElementById('editType').value;
              const email = document.getElementById('editEmail').value;
              const status = document.getElementById('editStatus').value;
              const duration = document.getElementById('editDuration').value;
              const btn = document.getElementById('saveEditBtn');

              btn.disabled = true;
              btn.textContent = 'Menyimpan...';

              try {
                const res = await fetch('/api/admin/license/' + id + '/update', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type, email, status, duration })
                });
                const data = await res.json();
                if (data.success) {
                  window.location.reload();
                } else {
                  alert('Gagal: ' + data.message);
                  btn.disabled = false;
                  btn.textContent = 'Simpan Perubahan';
                }
              } catch(err) {
                alert('Terjadi kesalahan jaringan.');
                btn.disabled = false;
                btn.textContent = 'Simpan Perubahan';
              }
            });

            async function deleteLicense(id) {
              if (!confirm('Apakah Anda yakin ingin menghapus lisensi ini secara permanen?')) return;
              try {
                const res = await fetch('/api/admin/license/' + id + '/delete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (data.success) {
                  window.location.reload();
                } else {
                  alert('Gagal menghapus: ' + data.message);
                }
              } catch(err) {
                alert('Terjadi kesalahan jaringan.');
              }
            }
          </script>
      </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    res.send('Error loading dashboard: ' + err.message);
  }
});

// 6. Admin Generate API (Protected - Superadmin Only)
app.post('/api/admin/generate', requireSuperadmin, async (req, res) => {
  const { type, email, duration } = req.body;
  if (type === 'premium' && !email) {
    return res.status(400).json({ success: false, message: 'Email wajib diisi untuk lisensi premium' });
  }

  const prefix = type === 'premium' ? 'AKA' : 'SHOTAI';
  const randomPart1 = Math.random().toString(36).substring(2, 10).toUpperCase();
  const randomPart2 = Math.random().toString(36).substring(2, 8).toUpperCase();
  const newCode = `${prefix}-${randomPart1}-${randomPart2}`;

  const selectedDuration = duration || '1 Bulan';
  const expires_at = calculateExpiry(selectedDuration);

  try {
    await connectDB();
    const newLic = await License.create({
      code: newCode,
      type: type || 'premium',
      owner_email: email ? email.trim().toLowerCase() : null,
      duration: selectedDuration,
      expires_at: expires_at,
      status: 'active'
    });
    res.json({ success: true, code: newCode, license: newLic });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error: ' + err.message });
  }
});

// 6b. Admin Update License API
app.post('/api/admin/license/:id/update', requireSuperadmin, async (req, res) => {
  const { id } = req.params;
  const { type, email, status, duration } = req.body;

  try {
    await connectDB();
    const updateData = {};
    if (type) updateData.type = type;
    if (email !== undefined) updateData.owner_email = email ? email.trim().toLowerCase() : null;
    if (status) updateData.status = status;

    if (duration && duration !== 'keep') {
      updateData.duration = duration;
      updateData.expires_at = calculateExpiry(duration);
    }

    const updated = await License.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Lisensi tidak ditemukan' });

    res.json({ success: true, message: 'Lisensi berhasil diperbarui', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// 6c. Admin Delete License API
app.post('/api/admin/license/:id/delete', requireSuperadmin, async (req, res) => {
  const { id } = req.params;
  try {
    await connectDB();
    const deleted = await License.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Lisensi tidak ditemukan' });
    res.json({ success: true, message: 'Lisensi berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// === 7. DASHBOARD PELANGGAN (Protected - For Customers) ===
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const userEmail = req.user.email ? req.user.email.toLowerCase() : '';
    const myLicenses = await License.find({ owner_email: userEmail }).sort({ createdAt: -1 });

    const formatDate = (d) => {
      if (!d) return '-';
      return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    let licenseCardsHtml = '';
    if (myLicenses.length > 0) {
      myLicenses.forEach(lic => {
        const isExpired = lic.expires_at && new Date() > new Date(lic.expires_at);
        licenseCardsHtml += `
          <div class="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div class="flex items-center justify-between mb-3">
              <span class="${lic.type === 'premium' ? 'bg-purple-950/80 text-purple-300 border border-purple-800/80' : 'bg-blue-950/80 text-blue-300 border border-blue-800/80'} font-bold py-1 px-3 rounded-full text-xs">
                ${lic.type === 'premium' ? '⭐ PREMIUM LICENSE' : 'FREE LICENSE'}
              </span>
              <span class="${isExpired ? 'text-red-400 bg-red-950/50 border border-red-900/50' : 'text-emerald-400 bg-emerald-950/50 border border-emerald-900/50'} text-xs font-semibold px-2.5 py-0.5 rounded-full">
                ${isExpired ? 'Kadaluarsa' : (lic.status === 'active' ? 'Aktif' : 'Nonaktif')}
              </span>
            </div>
            <div class="mb-4">
              <label class="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Kode Lisensi Anda</label>
              <div class="flex items-center gap-2">
                <span class="font-mono text-base font-bold text-indigo-300 bg-[#09090b] px-3 py-1.5 rounded-lg border border-[#27272a] flex-1 select-all tracking-wider">${lic.code}</span>
                <button onclick="copyCode('${lic.code}')" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition shadow">Salin</button>
              </div>
            </div>
            <div class="text-xs text-gray-400 space-y-1 border-t border-[#27272a] pt-3">
              <div class="flex justify-between">
                <span>Masa Aktif:</span>
                <span class="text-white font-medium">${lic.duration || 'Aktif'}</span>
              </div>
              <div class="flex justify-between">
                <span>Berlaku Sampai:</span>
                <span class="text-white font-medium">${lic.expires_at ? formatDate(lic.expires_at) : 'Selamanya / Lifetime'}</span>
              </div>
            </div>
          </div>
        `;
      });
    } else {
      licenseCardsHtml = `
        <div class="bg-[#18181b] border border-dashed border-[#3f3f46] rounded-xl p-8 text-center">
          <div class="text-3xl mb-2">🔑</div>
          <h3 class="text-sm font-bold text-white mb-1">Belum Ada Lisensi Tertaut</h3>
          <p class="text-xs text-gray-400 max-w-sm mx-auto mb-4">Email ini belum memiliki lisensi terdaftar. Jika Anda sudah membeli lisensi, masukkan kode di bawah ini untuk menautkannya ke akun Anda.</p>
          <form id="claimForm" class="flex max-w-md mx-auto gap-2">
            <input type="text" id="claimCode" placeholder="Masukkan kode lisensi..." class="flex-1 p-2 bg-[#09090b] text-white border border-[#27272a] rounded-lg text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <button type="submit" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition">Tautkan</button>
          </form>
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Dashboard Pelanggan - ShotAi</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>body { font-family: 'Inter', sans-serif; background-color: #09090b; color: #f1f5f9; min-height: 100vh; }</style>
      </head>
      <body class="bg-[#09090b] text-[#f1f5f9]">
          <div class="min-h-screen p-6 md:p-10 bg-[#09090b]">
              <div class="max-w-4xl mx-auto space-y-6">
                  <!-- Header -->
                  <div class="bg-[#111113] border border-[#27272a] rounded-2xl p-6 flex flex-wrap justify-between items-center gap-4 shadow-xl">
                      <div class="flex items-center gap-3.5">
                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/40 flex-shrink-0">
                          <span class="text-white font-black text-lg">SA</span>
                        </div>
                        <div>
                          <div class="flex items-center gap-2">
                            <h1 class="text-lg font-bold text-white">Dashboard Pelanggan</h1>
                            <span class="bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 text-[10px] font-semibold px-2 py-0.5 rounded-full">Pelanggan</span>
                          </div>
                          <p class="text-gray-400 text-xs mt-0.5">${req.user.email}</p>
                        </div>
                      </div>
                      <div class="flex items-center gap-3">
                        ${req.user.role === 'superadmin' ? '<a href="/admin" class="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-semibold py-2 px-3 rounded-lg transition">👑 Ke Dashboard Superadmin</a>' : ''}
                        <a href="/logout" class="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold py-2 px-3.5 rounded-lg transition border border-white/10">Logout</a>
                      </div>
                  </div>

                  <!-- Lisensi Saya -->
                  <div class="bg-[#111113] border border-[#27272a] rounded-2xl p-6 shadow-xl space-y-4">
                    <div class="flex items-center justify-between">
                      <h2 class="text-base font-bold text-white flex items-center gap-2">
                        <span>📦</span>
                        <span>Lisensi ShotAi Saya</span>
                      </h2>
                      <span class="text-xs text-gray-400">${myLicenses.length} Lisensi Tertaut</span>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      ${licenseCardsHtml}
                    </div>
                  </div>

                  <!-- Download & Panduan -->
                  <div class="bg-[#111113] border border-[#27272a] rounded-2xl p-6 shadow-xl">
                    <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <span>💻</span> Download & Akses Aplikasi Desktop
                    </h3>
                    <p class="text-xs text-gray-400 mb-4 leading-relaxed">
                      Gunakan aplikasi ShotAi di PC/Laptop Windows Anda untuk menjalankan Google Flow, Dola AI, Grok, ChatGPT, Storyboard Maker, dan Video Karaoke dalam satu desktop workspace.
                    </p>
                    <div class="flex flex-wrap gap-3">
                      <a href="https://shot-ai-new.vercel.app/" class="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shadow-md shadow-indigo-600/30 flex items-center gap-1.5">
                        <span>⬇️</span> Download untuk Windows
                      </a>
                      <a href="https://wa.me/6285261475052" target="_blank" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shadow-md flex items-center gap-1.5">
                        <span>💬</span> WhatsApp Bantuan Pelanggan
                      </a>
                    </div>
                  </div>
              </div>
          </div>

          <script>
            function copyCode(code) {
              navigator.clipboard.writeText(code).then(() => {
                alert('Kode lisensi disalin: ' + code);
              }).catch(() => {
                prompt('Salin kode berikut:', code);
              });
            }

            const claimForm = document.getElementById('claimForm');
            if (claimForm) {
              claimForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const code = document.getElementById('claimCode').value;
                if (!code) return;
                try {
                  const res = await fetch('/api/claim-license', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                  });
                  const data = await res.json();
                  if (data.success) {
                    alert('Lisensi berhasil ditautkan ke akun Anda!');
                    window.location.reload();
                  } else {
                    alert('Gagal: ' + data.message);
                  }
                } catch(e) {
                  alert('Terjadi kesalahan jaringan.');
                }
              });
            }
          </script>
      </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    res.send('Error loading dashboard: ' + err.message);
  }
});

// 7b. Claim License API (Customer can link license code to their email)
app.post('/api/claim-license', requireAuth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, message: 'Kode lisensi diperlukan' });

  try {
    await connectDB();
    const lic = await License.findOne({ code: code.trim().toUpperCase() });
    if (!lic) return res.status(404).json({ success: false, message: 'Kode lisensi tidak ditemukan' });
    if (lic.owner_email && lic.owner_email.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Lisensi ini sudah tertaut dengan email lain' });
    }

    lic.owner_email = req.user.email.toLowerCase();
    await lic.save();

    res.json({ success: true, message: 'Lisensi berhasil ditautkan', data: lic });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// === PUBLIC API FOR ELECTRON APP ===

// 8. Verify License API (Used by PC App)
app.post('/api/verify-license', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, message: 'Kode lisensi diperlukan.' });

  try {
    await connectDB();
    const row = await License.findOne({ code: code.trim().toUpperCase() });
    if (!row) return res.status(404).json({ success: false, message: 'Lisensi tidak valid.' });
    if (row.status !== 'active') return res.status(403).json({ success: false, message: 'Lisensi dinonaktifkan.' });

    // Check expiration
    if (row.expires_at && new Date() > new Date(row.expires_at)) {
      if (row.status !== 'expired') {
        row.status = 'expired';
        await row.save();
      }
      return res.status(403).json({ success: false, message: 'Lisensi telah kadaluarsa.' });
    }

    let obfuscatedEmail = null;
    if (row.type === 'premium' && row.owner_email) {
      const parts = row.owner_email.split('@');
      if (parts.length === 2) {
        obfuscatedEmail = `${parts[0].substring(0, 2)}***@${parts[1]}`;
      }
    }
    res.json({
      success: true,
      data: {
        type: row.type,
        duration: row.duration || 'Selamanya',
        expires_at: row.expires_at,
        obfuscatedEmail
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 9. Login Premium API (Used by PC App)
app.post('/api/login-premium', async (req, res) => {
  const { code, email } = req.body;
  if (!code || !email) return res.status(400).json({ success: false, message: 'Kode & email diperlukan.' });

  try {
    await connectDB();
    const row = await License.findOne({ code: code.trim().toUpperCase(), type: 'premium' });
    if (!row) return res.status(404).json({ success: false, message: 'Lisensi tidak ditemukan.' });

    // Check expiration
    if (row.expires_at && new Date() > new Date(row.expires_at)) {
      if (row.status !== 'expired') {
        row.status = 'expired';
        await row.save();
      }
      return res.status(403).json({ success: false, message: 'Lisensi telah kadaluarsa.' });
    }

    if (row.owner_email && row.owner_email.toLowerCase() === email.trim().toLowerCase()) {
      res.json({ success: true, message: 'Berhasil login.' });
    } else {
      res.status(401).json({ success: false, message: 'Email tidak cocok dengan pemilik lisensi.' });
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

