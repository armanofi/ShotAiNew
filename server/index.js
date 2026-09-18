require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const connectDB = require('./db');
const License = require('./models/License');
const User = require('./models/User');
const Order = require('./models/Order');

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
  let currentUser = null;
  if (req.cookies && req.cookies.admin_token) {
    try {
      currentUser = jwt.verify(req.cookies.admin_token, JWT_SECRET);
    } catch (e) {
      res.clearCookie('admin_token');
    }
  }

  let userNavHtml = '';
  let mobileUserNavHtml = '';

  if (currentUser) {
    const initial = (currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase();
    userNavHtml = `
      <div class="relative flex items-center gap-2.5">
        <!-- Theme Button -->
        <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#18181b] border border-[#27272a] text-gray-300 text-xs font-semibold hover:border-gray-500 transition shadow-sm">
          <span>☾</span>
          <span>Gelap</span>
        </button>

        <!-- Profile Pill Button (Circled in Red in User Screenshot) -->
        <button id="userProfileBtn" onclick="toggleUserDropdown(event)" class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-indigo-500/70 text-white transition focus:outline-none cursor-pointer shadow-sm group">
          <div class="w-6 h-6 rounded-full bg-[#543b2b] border border-[#78523c] text-amber-100 flex items-center justify-center font-bold text-xs">
            ${initial}
          </div>
          <span class="text-xs font-medium text-gray-200 max-w-[160px] truncate">${currentUser.email}</span>
          <svg id="profileChevron" class="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>

        <!-- Dropdown Card -->
        <div id="userDropdown" class="hidden absolute right-0 top-12 w-64 rounded-2xl bg-[#18181b] border border-[#27272a] shadow-2xl p-3 z-50 transition-all">
          <div class="px-2 py-1.5">
            <p class="text-[10px] font-extrabold uppercase tracking-wider text-purple-400 mb-0.5">AKUN SAYA</p>
            <p class="text-xs font-bold text-white truncate">${currentUser.email}</p>
          </div>
          <div class="border-t border-[#27272a] my-2"></div>
          <div class="space-y-1">
            <a href="/dashboard" class="flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-white/5 transition group text-left">
              <div class="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-sm text-indigo-300 flex-shrink-0">
                📊
              </div>
              <div>
                <div class="text-xs font-bold text-white group-hover:text-indigo-300">Dashboard Saya</div>
                <div class="text-[10px] text-gray-400">Pesanan, hasil & lisensi</div>
              </div>
            </a>
            ${currentUser.role === 'superadmin' ? `
            <a href="/admin" class="flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-white/5 transition group text-left">
              <div class="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-sm text-purple-300 flex-shrink-0">
                👑
              </div>
              <div>
                <div class="text-xs font-bold text-white group-hover:text-purple-300">Dashboard Superadmin</div>
                <div class="text-[10px] text-gray-400">Kelola semua lisensi & user</div>
              </div>
            </a>` : ''}
          </div>
          <div class="border-t border-[#27272a] my-2"></div>
          <a href="/logout" class="flex items-center gap-3 px-2.5 py-1.5 rounded-xl hover:bg-red-950/40 text-left group transition">
            <div class="w-8 h-8 rounded-lg bg-red-950/60 border border-red-800/60 flex items-center justify-center text-sm text-red-400 flex-shrink-0">
              ↩️
            </div>
            <div>
              <div class="text-xs font-bold text-red-400">Logout</div>
              <div class="text-[10px] text-gray-500">Keluar dari akun ini</div>
            </div>
          </a>
        </div>
      </div>
    `;

    mobileUserNavHtml = `
      <div class="pt-3 border-t border-[#27272a] space-y-2">
        <div class="flex items-center gap-2 px-1 py-1">
          <div class="w-6 h-6 rounded-full bg-[#543b2b] text-amber-100 flex items-center justify-center font-bold text-xs">
            ${initial}
          </div>
          <span class="text-xs font-semibold text-gray-300 truncate">${currentUser.email}</span>
        </div>
        <a href="/dashboard" class="block text-center w-full bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 font-semibold text-xs py-2 rounded-lg transition" onclick="closeMobileMenu()">📊 Dashboard Saya</a>
        ${currentUser.role === 'superadmin' ? '<a href="/admin" class="block text-center w-full bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 font-semibold text-xs py-2 rounded-lg transition" onclick="closeMobileMenu()">👑 Dashboard Superadmin</a>' : ''}
        <a href="/logout" class="block text-center w-full bg-red-950/40 text-red-400 border border-red-800/40 font-semibold text-xs py-2 rounded-lg transition" onclick="closeMobileMenu()">Logout</a>
      </div>
    `;
  } else {
    userNavHtml = `
      <a href="/login" class="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2 rounded-full transition shadow-lg shadow-indigo-600/30 font-semibold text-xs active:scale-95">Masuk</a>
    `;
    mobileUserNavHtml = `
      <a href="/login" class="block text-center w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 rounded-lg transition" onclick="closeMobileMenu()">Masuk ke Portal</a>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="id" class="scroll-smooth">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ShotAI - Workspace AI Desktop Terpadu</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Inter', sans-serif; background-color: #09090b; color: #f1f5f9; overflow-x: hidden; }
            .gradient-bg {
                position: absolute; top: 0; right: 0; width: 60%; height: 100%;
                background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.15) 0%, rgba(9, 9, 11, 0) 70%);
                z-index: -1; pointer-events: none;
            }
            .mockup-shadow { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85); }
            .glow-card:hover {
                box-shadow: 0 0 30px rgba(99, 102, 241, 0.2);
                border-color: rgba(99, 102, 241, 0.5);
            }
        </style>
    </head>
    <body class="relative min-h-screen flex flex-col bg-[#09090b] text-[#f1f5f9]">
        <div class="gradient-bg"></div>
        
        <!-- Sticky Header & Navigation -->
        <header class="sticky top-0 z-50 w-full backdrop-blur-md bg-[#09090b]/85 border-b border-[#27272a] transition-all">
            <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <a href="#home" class="flex items-center gap-3 group">
                    <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-900/40 group-hover:scale-105 transition-transform">
                        <span class="text-white font-black text-sm">SA</span>
                    </div>
                    <span class="font-extrabold text-xl tracking-tight text-white">ShotAI</span>
                </a>

                <!-- Desktop Nav -->
                <nav class="hidden md:flex items-center gap-7 text-sm font-medium text-gray-300">
                    <a href="#home" class="hover:text-white hover:text-indigo-400 transition-colors">Home</a>
                    <a href="#produk" class="hover:text-white hover:text-indigo-400 transition-colors">Produk</a>
                    <a href="#keunggulan" class="hover:text-white hover:text-indigo-400 transition-colors">Keunggulan</a>
                    <a href="#tutorial" class="hover:text-white hover:text-indigo-400 transition-colors">Tutorial</a>
                    <a href="#toko" class="hover:text-white hover:text-indigo-400 transition-colors">Toko</a>
                    ${userNavHtml}
                </nav>

                <!-- Mobile Menu Button -->
                <button id="mobileMenuBtn" class="md:hidden p-2 rounded-lg bg-[#18181b] border border-[#27272a] text-gray-300 hover:text-white focus:outline-none">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path id="menuIcon" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                </button>
            </div>

            <!-- Mobile Dropdown Menu -->
            <div id="mobileMenu" class="hidden md:hidden border-t border-[#27272a] bg-[#111113]/95 px-6 py-4 space-y-3">
                <a href="#home" class="block text-sm font-medium text-gray-300 hover:text-indigo-400 py-1" onclick="closeMobileMenu()">Home</a>
                <a href="#produk" class="block text-sm font-medium text-gray-300 hover:text-indigo-400 py-1" onclick="closeMobileMenu()">Produk</a>
                <a href="#keunggulan" class="block text-sm font-medium text-gray-300 hover:text-indigo-400 py-1" onclick="closeMobileMenu()">Keunggulan</a>
                <a href="#tutorial" class="block text-sm font-medium text-gray-300 hover:text-indigo-400 py-1" onclick="closeMobileMenu()">Tutorial</a>
                <a href="#toko" class="block text-sm font-medium text-gray-300 hover:text-indigo-400 py-1" onclick="closeMobileMenu()">Toko</a>
                ${mobileUserNavHtml}
            </div>
        </header>

        <!-- 1. SECTION: HOME (Hero) -->
        <section id="home" class="scroll-mt-24 w-full max-w-7xl mx-auto px-6 py-16 md:py-24 flex flex-col md:flex-row items-center">
            <!-- Left Text -->
            <div class="w-full md:w-1/2 pr-0 md:pr-12 z-10">
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-xs font-semibold mb-6">
                    <span class="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                    <span>Workspace AI Terpadu • Windows</span>
                </div>
                <h1 class="text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6 text-white">
                    Lebih banyak berkarya.<br>
                    <span class="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Lebih sedikit berpindah.</span>
                </h1>
                <p class="text-base md:text-lg text-gray-400 mb-8 leading-relaxed max-w-md">
                    Atur puluhan akun AI, layanan otomasi, dan sesi kerja Anda dalam satu aplikasi desktop yang aman, terisolasi, dan hemat daya.
                </p>
                
                <div class="flex flex-wrap items-center gap-4">
                    <a href="#toko" class="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 px-7 rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 active:scale-95 text-sm">
                        <span>Dapatkan Lisensi</span>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                    </a>
                    <a href="#produk" class="bg-[#18181b] hover:bg-[#27272a] text-gray-300 hover:text-white font-semibold py-3.5 px-6 rounded-xl border border-[#27272a] transition flex items-center gap-2 text-sm">
                        Jelajahi Produk <span class="text-indigo-400">→</span>
                    </a>
                </div>
                <div class="flex items-center gap-4 text-xs text-gray-500 mt-6">
                    <span class="flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg> Windows 10/11</span>
                    <span class="flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg> Multi-Sesi Terisolasi</span>
                    <span class="flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg> Lisensi Instan</span>
                </div>
            </div>

            <!-- Right Mockup UI -->
            <div class="w-full md:w-1/2 mt-12 md:mt-0 relative">
                <div class="bg-[#18181b] rounded-2xl mockup-shadow overflow-hidden border border-[#27272a] w-full aspect-[4/3] flex flex-col relative transform rotate-1 hover:rotate-0 transition duration-500">
                    
                    <!-- App Window Header -->
                    <div class="h-10 bg-[#111113] border-b border-[#27272a] flex items-center px-4 gap-2">
                        <div class="w-3 h-3 rounded-full bg-red-500/80"></div>
                        <div class="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                        <div class="w-3 h-3 rounded-full bg-green-500/80"></div>
                        <span class="text-xs text-gray-400 font-semibold ml-2 font-mono">ShotAI Desktop Suite</span>
                    </div>

                    <!-- App Body -->
                    <div class="flex flex-1 overflow-hidden">
                        <!-- Sidebar -->
                        <div class="w-48 bg-[#111113] border-r border-[#27272a] p-3 flex flex-col gap-1.5">
                            <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-3 shadow">
                                <span class="text-[10px] font-black text-white">SA</span>
                            </div>
                            <div class="px-3 py-1.5 bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold rounded-lg">Overview</div>
                            <div class="px-3 py-1.5 text-gray-400 text-xs font-semibold hover:text-white transition">Google Flow</div>
                            <div class="px-3 py-1.5 text-gray-400 text-xs font-semibold hover:text-white transition">Dola AI</div>
                            <div class="px-3 py-1.5 text-gray-400 text-xs font-semibold hover:text-white transition">Grok AI</div>
                            <div class="px-3 py-1.5 text-gray-400 text-xs font-semibold hover:text-white transition">Storyboard Maker</div>
                            <div class="px-3 py-1.5 text-gray-400 text-xs font-semibold hover:text-white transition">Video Karaoke</div>
                        </div>
                        
                        <!-- Content -->
                        <div class="flex-1 bg-[#18181b] p-6 text-white overflow-y-auto">
                            <div class="flex items-center justify-between mb-4">
                                <div>
                                    <p class="text-indigo-400 text-[10px] font-bold tracking-wider uppercase">WORKSPACE AKTIF</p>
                                    <h2 class="text-lg font-bold text-white">Semua sesi dalam satu layar.</h2>
                                </div>
                                <span class="text-[11px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-2.5 py-0.5 rounded-full font-semibold">● 6 Sesi Aktif</span>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-3">
                                <div class="bg-[#111113] border border-[#27272a] rounded-xl p-3.5 hover:border-[#3f3f46] transition">
                                    <div class="flex justify-between items-center mb-1">
                                        <h3 class="font-bold text-xs text-white">Google Flow</h3>
                                        <span class="text-[9px] bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded font-mono">3 Akun</span>
                                    </div>
                                    <p class="text-[11px] text-gray-400 mb-2.5">Sesi otomasi riset aktif</p>
                                    <button class="bg-[#27272a] hover:bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-md font-semibold transition">Buka Workspace</button>
                                </div>
                                <div class="bg-[#111113] border border-[#27272a] rounded-xl p-3.5 hover:border-[#3f3f46] transition">
                                    <div class="flex justify-between items-center mb-1">
                                        <h3 class="font-bold text-xs text-white">Dola AI</h3>
                                        <span class="text-[9px] bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded font-mono">2 Profil</span>
                                    </div>
                                    <p class="text-[11px] text-gray-400 mb-2.5">Profil siap digunakan</p>
                                    <button class="bg-[#27272a] hover:bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-md font-semibold transition">Buka Workspace</button>
                                </div>
                                <div class="bg-[#111113] border border-[#27272a] rounded-xl p-3.5 hover:border-[#3f3f46] transition">
                                    <div class="flex justify-between items-center mb-1">
                                        <h3 class="font-bold text-xs text-white">Storyboard</h3>
                                        <span class="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded font-mono">Studio</span>
                                    </div>
                                    <p class="text-[11px] text-gray-400 mb-2.5">Visual scene builder</p>
                                    <button class="bg-[#27272a] hover:bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-md font-semibold transition">Buka Studio</button>
                                </div>
                                <div class="bg-[#111113]/50 border border-dashed border-[#3f3f46] rounded-xl p-3.5 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-[#111113] transition">
                                    <span class="text-base mb-0.5 text-indigo-400">+</span>
                                    <span class="text-[10px] font-semibold">Tambah Akun Baru</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Floating Badge -->
                <div class="absolute -bottom-5 right-6 bg-[#111113] text-white px-5 py-3 rounded-xl shadow-2xl border border-[#27272a] flex items-center gap-3 z-20">
                    <div class="w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse"></div>
                    <div>
                        <h4 class="font-bold text-xs text-white">Sesi Tersimpan Lokal</h4>
                        <p class="text-[11px] text-gray-400">Privasi & cache aman di PC</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- 2. SECTION: PRODUK -->
        <section id="produk" class="scroll-mt-24 w-full max-w-7xl mx-auto px-6 py-20 border-t border-[#27272a]">
            <div class="text-center max-w-3xl mx-auto mb-16">
                <span class="px-3.5 py-1 rounded-full bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 text-xs font-bold uppercase tracking-wider">Produk & Layanan</span>
                <h2 class="text-3xl md:text-4xl font-extrabold text-white mt-4 mb-3 tracking-tight">Ekosistem Tool AI Terlengkap</h2>
                <p class="text-gray-400 text-sm md:text-base">Semua modul dibuat khusus untuk mengoptimalkan pembuatan konten, riset, otomasi, dan visualisasi tanpa batasan.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Card 1: Google Flow -->
                <div class="bg-[#111113] border border-[#27272a] rounded-2xl p-6 glow-card transition duration-300 flex flex-col justify-between">
                    <div>
                        <div class="w-12 h-12 rounded-xl bg-blue-950/60 border border-blue-800/50 flex items-center justify-center text-xl mb-4">
                            🌐
                        </div>
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="text-lg font-bold text-white">Google Flow Manager</h3>
                            <span class="text-[10px] font-bold bg-blue-950 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800/60">Multi-Akun</span>
                        </div>
                        <p class="text-gray-400 text-xs leading-relaxed mb-4">
                            Jalankan 3 atau lebih akun Google Flow secara simultan dengan sesi terisolasi. Tidak perlu bolak-balik logout atau menggunakan jendela incognito.
                        </p>
                    </div>
                    <ul class="text-xs text-gray-400 space-y-1.5 border-t border-[#27272a] pt-4">
                        <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> Sesi login tersimpan permanen</li>
                        <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> Cookie terisolasi per profil</li>
                    </ul>
                </div>

                <!-- Card 2: Dola AI -->
                <div class="bg-[#111113] border border-[#27272a] rounded-2xl p-6 glow-card transition duration-300 flex flex-col justify-between">
                    <div>
                        <div class="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-800/50 flex items-center justify-center text-xl mb-4">
                            🤖
                        </div>
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="text-lg font-bold text-white">Dola AI Workspace</h3>
                            <span class="text-[10px] font-bold bg-purple-950 text-purple-300 px-2 py-0.5 rounded-full border border-purple-800/60">Otomasi</span>
                        </div>
                        <p class="text-gray-400 text-xs leading-relaxed mb-4">
                            Ruang kerja khusus untuk Dola AI dengan manajemen multi-akun. Buat prompt riset dan konten secara massal dengan navigasi super cepat.
                        </p>
                    </div>
                    <ul class="text-xs text-gray-400 space-y-1.5 border-t border-[#27272a] pt-4">
                        <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> Auto-switch antar profil</li>
                        <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> Riwayat prompt tertata rapi</li>
                    </ul>
                </div>

                <!-- Card 3: Grok & ChatGPT -->
                <div class="bg-[#111113] border border-[#27272a] rounded-2xl p-6 glow-card transition duration-300 flex flex-col justify-between">
                    <div>
                        <div class="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-800/50 flex items-center justify-center text-xl mb-4">
                            ⚡
                        </div>
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="text-lg font-bold text-white">Grok & ChatGPT Hub</h3>
                            <span class="text-[10px] font-bold bg-amber-950 text-amber-300 px-2 py-0.5 rounded-full border border-amber-800/60">Smart LLM</span>
                        </div>
                        <p class="text-gray-400 text-xs leading-relaxed mb-4">
                            Akses model bahasa terdepan langsung dari sidebar desktop tanpa perlu membuka browser. Responsif, bebas distraksi, dan selalu siap digunakan.
                        </p>
                    </div>
                    <ul class="text-xs text-gray-400 space-y-1.5 border-t border-[#27272a] pt-4">
                        <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> Akses cepat via keyboard shortcut</li>
                        <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> Mode canvas gelap anti-silau</li>
                    </ul>
                </div>

                <!-- Card 4: Storyboard Maker -->
                <div class="bg-[#111113] border border-[#27272a] rounded-2xl p-6 glow-card transition duration-300 flex flex-col justify-between">
                    <div>
                        <div class="w-12 h-12 rounded-xl bg-pink-950/60 border border-pink-800/50 flex items-center justify-center text-xl mb-4">
                            🎬
                        </div>
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="text-lg font-bold text-white">Storyboard Maker</h3>
                            <span class="text-[10px] font-bold bg-pink-950 text-pink-300 px-2 py-0.5 rounded-full border border-pink-800/60">Creative</span>
                        </div>
                        <p class="text-gray-400 text-xs leading-relaxed mb-4">
                            Rancang alur video, visualisasi tiap adegan, dan integrasikan naskah audio langsung ke dalam kanvas visual yang terorganisir per scene.
                        </p>
                    </div>
                    <ul class="text-xs text-gray-400 space-y-1.5 border-t border-[#27272a] pt-4">
                        <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> Timeline adegan visual</li>
                        <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> Sinkronisasi prompt image AI</li>
                    </ul>
                </div>

                <!-- Card 5: Video Karaoke -->
                <div class="bg-[#111113] border border-[#27272a] rounded-2xl p-6 glow-card transition duration-300 flex flex-col justify-between">
                    <div>
                        <div class="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center text-xl mb-4">
                            🎤
                        </div>
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="text-lg font-bold text-white">AI Video Karaoke</h3>
                            <span class="text-[10px] font-bold bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-800/60">AI Audio</span>
                        </div>
                        <p class="text-gray-400 text-xs leading-relaxed mb-4">
                            Transkripsi cerdas audio menggunakan Google Gemini AI dengan penandaan waktu presisi kata per kata, playback live, dan rendering subtitle.
                        </p>
                    </div>
                    <ul class="text-xs text-gray-400 space-y-1.5 border-t border-[#27272a] pt-4">
                        <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> Transkripsi otomatis Google Gemini</li>
                        <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> Export video karaoke siap tayang</li>
                    </ul>
                </div>

                <!-- Card 6: Multi-Session Engine -->
                <div class="bg-[#111113] border border-[#27272a] rounded-2xl p-6 glow-card transition duration-300 flex flex-col justify-between">
                    <div>
                        <div class="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-xl mb-4">
                            🛡️
                        </div>
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="text-lg font-bold text-white">Sandbox Isolation Engine</h3>
                            <span class="text-[10px] font-bold bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800/60">Security</span>
                        </div>
                        <p class="text-gray-400 text-xs leading-relaxed mb-4">
                            Teknologi partisi container khusus yang memisahkan storage, cache, dan data autentikasi setiap akun tanpa saling mencemari.
                        </p>
                    </div>
                    <ul class="text-xs text-gray-400 space-y-1.5 border-t border-[#27272a] pt-4">
                        <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> Bebas bentrok session cookie</li>
                        <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> Proteksi data lokal maksimal</li>
                    </ul>
                </div>
            </div>
        </section>

        <!-- 3. SECTION: KEUNGGULAN -->
        <section id="keunggulan" class="scroll-mt-24 w-full max-w-7xl mx-auto px-6 py-20 border-t border-[#27272a]">
            <div class="text-center max-w-3xl mx-auto mb-16">
                <span class="px-3.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 text-xs font-bold uppercase tracking-wider">Mengapa ShotAI?</span>
                <h2 class="text-3xl md:text-4xl font-extrabold text-white mt-4 mb-3 tracking-tight">Keunggulan Dibandingkan Browser Biasa</h2>
                <p class="text-gray-400 text-sm md:text-base">Dirancang spesifik untuk kreator konten dan praktisi otomasi yang membutuhkan efisiensi dan kecepatan tanpa kompromi.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-[#111113] border border-[#27272a] rounded-2xl p-7 flex gap-5 hover:border-indigo-500/50 transition">
                    <div class="w-12 h-12 rounded-xl bg-indigo-950 border border-indigo-800/60 flex-shrink-0 flex items-center justify-center text-indigo-400 font-bold text-lg">
                        01
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-white mb-2">Isolasi Profil 100% Mandiri</h3>
                        <p class="text-gray-400 text-xs leading-relaxed">
                            Setiap profil AI berjalan di container Electron terpisah dengan direktori partisi sendiri. Tidak ada risiko akun tertukar, tidak ada sesi yang terhapus tiba-tiba, dan tidak perlu puluhan jendela browser yang berantakan.
                        </p>
                    </div>
                </div>

                <div class="bg-[#111113] border border-[#27272a] rounded-2xl p-7 flex gap-5 hover:border-indigo-500/50 transition">
                    <div class="w-12 h-12 rounded-xl bg-purple-950 border border-purple-800/60 flex-shrink-0 flex items-center justify-center text-purple-400 font-bold text-lg">
                        02
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-white mb-2">Privasi & Keamanan Data Lokal</h3>
                        <p class="text-gray-400 text-xs leading-relaxed">
                            Data kredensial dan sesi kerja tersimpan langsung di storage perangkat komputer Anda. Kami tidak menyimpan login session Anda di server pihak ketiga, menjamin kerahasiaan penuh pada akun dan proyek Anda.
                        </p>
                    </div>
                </div>

                <div class="bg-[#111113] border border-[#27272a] rounded-2xl p-7 flex gap-5 hover:border-indigo-500/50 transition">
                    <div class="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-800/60 flex-shrink-0 flex items-center justify-center text-emerald-400 font-bold text-lg">
                        03
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-white mb-2">Hemat RAM & Optimalisasi Resource</h3>
                        <p class="text-gray-400 text-xs leading-relaxed">
                            Dibangun dengan manajemen memori cerdas yang menonaktifkan proses background tidak aktif saat sedang fokus pada satu workspace, membuat PC Anda tetap enteng dan responsif sepanjang hari.
                        </p>
                    </div>
                </div>

                <div class="bg-[#111113] border border-[#27272a] rounded-2xl p-7 flex gap-5 hover:border-indigo-500/50 transition">
                    <div class="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-800/60 flex-shrink-0 flex items-center justify-center text-cyan-400 font-bold text-lg">
                        04
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-white mb-2">Sistem Lisensi & Update Otomatis</h3>
                        <p class="text-gray-400 text-xs leading-relaxed">
                            Aktivasi kode lisensi langsung dari aplikasi, integrasi login Google ke portal pelanggan, dan pembaruan berkala otomatis memastikan Anda selalu mendapatkan fitur dan kompatibilitas AI paling mutakhir.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <!-- 4. SECTION: TUTORIAL -->
        <section id="tutorial" class="scroll-mt-24 w-full max-w-7xl mx-auto px-6 py-20 border-t border-[#27272a]">
            <div class="text-center max-w-3xl mx-auto mb-16">
                <span class="px-3.5 py-1 rounded-full bg-purple-950/70 border border-purple-800/60 text-purple-300 text-xs font-bold uppercase tracking-wider">Tutorial & Panduan</span>
                <h2 class="text-3xl md:text-4xl font-extrabold text-white mt-4 mb-3 tracking-tight">Cara Mudah Memulai ShotAI</h2>
                <p class="text-gray-400 text-sm md:text-base">Mulai optimalkan alur kerja AI Anda hanya dalam beberapa langkah sederhana.</p>
            </div>

            <!-- Steps Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
                <div class="bg-[#111113] border border-[#27272a] rounded-2xl p-6 relative">
                    <div class="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center mb-4">1</div>
                    <h3 class="font-bold text-white text-base mb-2">Download & Install</h3>
                    <p class="text-xs text-gray-400 leading-relaxed">
                        Unduh installer aplikasi ShotAi untuk Windows 10/11. Jalankan proses instalasi dengan sekali klik tanpa ribet.
                    </p>
                </div>

                <div class="bg-[#111113] border border-[#27272a] rounded-2xl p-6 relative">
                    <div class="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center mb-4">2</div>
                    <h3 class="font-bold text-white text-base mb-2">Login & Ambil Lisensi</h3>
                    <p class="text-xs text-gray-400 leading-relaxed">
                        Buka portal <a href="/login" class="text-indigo-400 underline font-semibold">Login</a> dengan akun Google Anda. Buka Dashboard Pelanggan dan salin kode lisensi aktif Anda.
                    </p>
                </div>

                <div class="bg-[#111113] border border-[#27272a] rounded-2xl p-6 relative">
                    <div class="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center mb-4">3</div>
                    <h3 class="font-bold text-white text-base mb-2">Aktivasi Desktop</h3>
                    <p class="text-xs text-gray-400 leading-relaxed">
                        Masukkan kode lisensi pada tampilan awal aplikasi desktop ShotAi. Aplikasi akan teraktivasi secara instan.
                    </p>
                </div>

                <div class="bg-[#111113] border border-[#27272a] rounded-2xl p-6 relative">
                    <div class="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center mb-4">4</div>
                    <h3 class="font-bold text-white text-base mb-2">Mulai Bekerja</h3>
                    <p class="text-xs text-gray-400 leading-relaxed">
                        Klik "+ Tambah Akun", pilih layanan AI (Google Flow, Dola, Grok, dll), dan nikmati multi-workspace terpadu!
                    </p>
                </div>
            </div>

            <!-- Interactive FAQ Accordion -->
            <div class="max-w-3xl mx-auto bg-[#111113] border border-[#27272a] rounded-2xl p-6 md:p-8">
                <h3 class="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <span>💡</span>
                    <span>Pertanyaan yang Sering Diajukan (FAQ)</span>
                </h3>

                <div class="space-y-4">
                    <!-- Q1 -->
                    <div class="border-b border-[#27272a] pb-4">
                        <button class="w-full text-left font-semibold text-sm text-white flex justify-between items-center focus:outline-none" onclick="toggleFaq('faq1')">
                            <span>Apakah login akun Google di ShotAI aman?</span>
                            <span id="faq1-icon" class="text-indigo-400 font-bold text-lg">+</span>
                        </button>
                        <p id="faq1" class="hidden text-xs text-gray-400 mt-2 leading-relaxed">
                            Sangat aman. ShotAi bekerja langsung di desktop lokal Anda menggunakan engine Electron terisolasi. Seluruh sesi, token, dan cookie disimpan di komputer Anda dan tidak diunggah ke pihak ketiga.
                        </p>
                    </div>

                    <!-- Q2 -->
                    <div class="border-b border-[#27272a] pb-4">
                        <button class="w-full text-left font-semibold text-sm text-white flex justify-between items-center focus:outline-none" onclick="toggleFaq('faq2')">
                            <span>Bagaimana jika masa aktif lisensi saya telah habis?</span>
                            <span id="faq2-icon" class="text-indigo-400 font-bold text-lg">+</span>
                        </button>
                        <p id="faq2" class="hidden text-xs text-gray-400 mt-2 leading-relaxed">
                            Anda dapat memperpanjang masa aktif lisensi kapan saja dengan menghubungi admin WhatsApp atau login ke Dashboard Pelanggan untuk menautkan lisensi baru yang telah diperpanjang.
                        </p>
                    </div>

                    <!-- Q3 -->
                    <div class="border-b border-[#27272a] pb-4">
                        <button class="w-full text-left font-semibold text-sm text-white flex justify-between items-center focus:outline-none" onclick="toggleFaq('faq3')">
                            <span>Apakah ShotAI dapat digunakan di banyak perangkat?</span>
                            <span id="faq3-icon" class="text-indigo-400 font-bold text-lg">+</span>
                        </button>
                        <p id="faq3" class="hidden text-xs text-gray-400 mt-2 leading-relaxed">
                            Setiap lisensi ditautkan dengan akun pemiliknya. Anda dapat mengelola lisensi melalui dashboard dan memindahkan perangkat dengan bantuan tim support kami.
                        </p>
                    </div>

                    <!-- Q4 -->
                    <div>
                        <button class="w-full text-left font-semibold text-sm text-white flex justify-between items-center focus:outline-none" onclick="toggleFaq('faq4')">
                            <span>Bagaimana cara mendapatkan update ke versi terbaru?</span>
                            <span id="faq4-icon" class="text-indigo-400 font-bold text-lg">+</span>
                        </button>
                        <p id="faq4" class="hidden text-xs text-gray-400 mt-2 leading-relaxed">
                            ShotAi dilengkapi sistem auto-updater. Setiap kali pembaruan fitur dirilis, aplikasi akan otomatis memberi notifikasi untuk mengunduh update terbaru secara gratis.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <!-- 5. SECTION: TOKO / LISENSI -->
        <section id="toko" class="scroll-mt-24 w-full max-w-7xl mx-auto px-6 py-20 border-t border-[#27272a]">
            <div class="text-center max-w-3xl mx-auto mb-16">
                <span class="px-3.5 py-1 rounded-full bg-cyan-950/70 border border-cyan-800/60 text-cyan-300 text-xs font-bold uppercase tracking-wider">Toko & Pilihan Lisensi</span>
                <h2 class="text-3xl md:text-4xl font-extrabold text-white mt-4 mb-3 tracking-tight">Pilih Paket Lisensi ShotAI</h2>
                <p class="text-gray-400 text-sm md:text-base">Investasi terbaik untuk akselerasi produktivitas konten kreator, freelancer, dan digital agency.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                <!-- Package 1: 1 Bulan -->
                <div class="bg-[#111113] border border-[#27272a] rounded-2xl p-7 flex flex-col justify-between hover:border-indigo-500/50 transition">
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-[#18181b] px-3 py-1 rounded-full border border-[#27272a]">Bulanan</span>
                        <h3 class="text-xl font-bold text-white mt-4">Paket 1 Bulan</h3>
                        <p class="text-xs text-gray-400 mt-1 mb-5">Pilihan tepat untuk project bulanan atau mencoba seluruh fitur.</p>
                        
                        <div class="mb-6">
                            <span class="text-3xl font-black text-white">Rp 49.000</span>
                            <span class="text-xs text-gray-400 font-medium"> / bulan</span>
                        </div>

                        <ul class="text-xs text-gray-300 space-y-2.5 mb-6">
                            <li class="flex items-center gap-2"><span class="text-indigo-400 font-bold">✓</span> Masa aktif 30 hari penuh</li>
                            <li class="flex items-center gap-2"><span class="text-indigo-400 font-bold">✓</span> Multi-akun Google Flow & Dola</li>
                            <li class="flex items-center gap-2"><span class="text-indigo-400 font-bold">✓</span> Storyboard Maker Studio</li>
                            <li class="flex items-center gap-2"><span class="text-indigo-400 font-bold">✓</span> AI Video Karaoke Sync</li>
                        </ul>
                    </div>
                    <button onclick="orderPackage('1 Bulan', 'Rp 49.000')" class="w-full text-center bg-[#18181b] hover:bg-[#27272a] text-white border border-[#27272a] hover:border-indigo-500 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer">
                        Pesan via WhatsApp
                    </button>
                </div>

                <!-- Package 2: 1 Tahun (Popular) -->
                <div class="bg-[#111113] border-2 border-indigo-500/80 rounded-2xl p-7 flex flex-col justify-between relative shadow-xl shadow-indigo-950/40">
                    <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-extrabold uppercase tracking-wider py-1 px-4 rounded-full shadow">
                        Paling Populer
                    </div>
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-800/60">Tahunan</span>
                        <h3 class="text-xl font-bold text-white mt-4">Paket 1 Tahun</h3>
                        <p class="text-xs text-gray-400 mt-1 mb-5">Hemat lebih dari 50% untuk kreator aktif dan profesional.</p>
                        
                        <div class="mb-6">
                            <span class="text-3xl font-black text-white">Rp 249.000</span>
                            <span class="text-xs text-gray-400 font-medium"> / tahun</span>
                        </div>

                        <ul class="text-xs text-gray-300 space-y-2.5 mb-6">
                            <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> Masa aktif 365 hari penuh</li>
                            <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> Semua fitur modul AI lengkap</li>
                            <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> Storyboard Maker & Karaoke</li>
                            <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> Prioritas update & support VIP</li>
                        </ul>
                    </div>
                    <button onclick="orderPackage('1 Tahun', 'Rp 249.000')" class="w-full text-center bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-lg shadow-indigo-600/30 cursor-pointer">
                        Pesan Paket 1 Tahun
                    </button>
                </div>

                <!-- Package 3: Lifetime -->
                <div class="bg-[#111113] border border-[#27272a] rounded-2xl p-7 flex flex-col justify-between hover:border-purple-500/50 transition">
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-950/60 px-3 py-1 rounded-full border border-purple-800/60">Lifetime</span>
                        <h3 class="text-xl font-bold text-white mt-4">Selamanya / Lifetime</h3>
                        <p class="text-xs text-gray-400 mt-1 mb-5">Sekali bayar, akses selamanya tanpa perlu perpanjang lisensi.</p>
                        
                        <div class="mb-6">
                            <span class="text-3xl font-black text-white">Rp 499.000</span>
                            <span class="text-xs text-gray-400 font-medium"> / sekali bayar</span>
                        </div>

                        <ul class="text-xs text-gray-300 space-y-2.5 mb-6">
                            <li class="flex items-center gap-2"><span class="text-purple-400 font-bold">✓</span> Masa aktif permanen seumur hidup</li>
                            <li class="flex items-center gap-2"><span class="text-purple-400 font-bold">✓</span> Semua modul & fitur mendatang</li>
                            <li class="flex items-center gap-2"><span class="text-purple-400 font-bold">✓</span> Bebas biaya bulanan selamanya</li>
                            <li class="flex items-center gap-2"><span class="text-purple-400 font-bold">✓</span> Bantuan teknis langsung WhatsApp</li>
                        </ul>
                    </div>
                    <button onclick="orderPackage('Lifetime', 'Rp 499.000')" class="w-full text-center bg-[#18181b] hover:bg-[#27272a] text-white border border-[#27272a] hover:border-purple-500 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer">
                        Dapatkan Akses Lifetime
                    </button>
                </div>
            </div>
        </section>

        <!-- Footer -->
        <footer class="w-full max-w-7xl mx-auto px-6 py-10 border-t border-[#27272a] mt-auto">
            <div class="flex flex-col md:flex-row justify-between items-center gap-6">
                <div class="flex items-center gap-3">
                    <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <span class="text-white font-black text-xs">SA</span>
                    </div>
                    <div>
                        <span class="font-bold text-sm text-white">ShotAI Workspace</span>
                        <p class="text-[11px] text-gray-500">Akun Anda. Sesi Anda. Workflow Anda.</p>
                    </div>
                </div>

                <!-- Footer Navigation -->
                <div class="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400 font-medium">
                    <a href="#home" class="hover:text-white transition">Home</a>
                    <a href="#produk" class="hover:text-white transition">Produk</a>
                    <a href="#keunggulan" class="hover:text-white transition">Keunggulan</a>
                    <a href="#tutorial" class="hover:text-white transition">Tutorial</a>
                    <a href="#toko" class="hover:text-white transition">Toko</a>
                    <a href="/login" class="text-indigo-400 hover:text-indigo-300 font-semibold transition">Portal Login</a>
                    <a href="https://wa.me/6285261475052" target="_blank" class="text-emerald-400 hover:text-emerald-300 font-semibold transition">WhatsApp Admin</a>
                </div>
            </div>
            <div class="text-center text-xs text-gray-600 mt-8 pt-4 border-t border-[#27272a]/50">
                &copy; 2026 ShotAI. Hak cipta dilindungi undang-undang.
            </div>
        </footer>

        <script>
            // Mobile Menu Toggle
            const mobileMenuBtn = document.getElementById('mobileMenuBtn');
            const mobileMenu = document.getElementById('mobileMenu');
            if (mobileMenuBtn && mobileMenu) {
                mobileMenuBtn.addEventListener('click', () => {
                    mobileMenu.classList.toggle('hidden');
                });
            }

            function closeMobileMenu() {
                if (mobileMenu) mobileMenu.classList.add('hidden');
            }

            // Interactive FAQ Accordion Toggle
            function toggleFaq(id) {
                const el = document.getElementById(id);
                const icon = document.getElementById(id + '-icon');
                if (!el) return;
                const isHidden = el.classList.contains('hidden');
                if (isHidden) {
                    el.classList.remove('hidden');
                    if (icon) icon.textContent = '−';
                } else {
                    el.classList.add('hidden');
                    if (icon) icon.textContent = '+';
                }
            }

            // User Profile Dropdown Toggle
            function toggleUserDropdown(event) {
                if (event) event.stopPropagation();
                const dd = document.getElementById('userDropdown');
                const chevron = document.getElementById('profileChevron');
                if (dd) {
                    const isHidden = dd.classList.contains('hidden');
                    if (isHidden) {
                        dd.classList.remove('hidden');
                        if (chevron) chevron.classList.add('rotate-180');
                    } else {
                        dd.classList.add('hidden');
                        if (chevron) chevron.classList.remove('rotate-180');
                    }
                }
            }

            // Close Dropdown when clicking outside
            window.addEventListener('click', (e) => {
                const dd = document.getElementById('userDropdown');
                const btn = document.getElementById('userProfileBtn');
                const chevron = document.getElementById('profileChevron');
                if (dd && !dd.classList.contains('hidden')) {
                    if (!btn || (!btn.contains(e.target) && !dd.contains(e.target))) {
                        dd.classList.add('hidden');
                        if (chevron) chevron.classList.remove('rotate-180');
                    }
                }
            });

            // Order Package helper from Toko
            async function orderPackage(pkgName, price) {
                try {
                    const res = await fetch('/api/create-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ product_name: 'PAKET LISENSI SHOTAI - ' + pkgName, package_type: pkgName, price: price })
                    });
                    const data = await res.json();
                    const orderNum = (data && data.success && data.order_number) ? data.order_number : '';
                    const textMsg = encodeURIComponent('Halo Admin, saya ingin memesan Lisensi ShotAi ' + pkgName + ' (' + price + ')' + (orderNum ? ' dengan No. Pesanan: ' + orderNum : ''));
                    window.open('https://wa.me/6285261475052?text=' + textMsg, '_blank');
                } catch (e) {
                    window.open('https://wa.me/6285261475052?text=' + encodeURIComponent('Halo Admin, saya ingin memesan Lisensi ShotAi ' + pkgName + ' (' + price + ')'), '_blank');
                }
            }
        </script>
    </body>
    </html>
  `;
  res.send(html);
});

// 2. Login Page
app.get('/login', (req, res) => {
  // If already logged in, redirect to home
  if (req.cookies.admin_token) {
    try {
      jwt.verify(req.cookies.admin_token, JWT_SECRET);
      return res.redirect('/');
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

    // Redirect to main web beranda initially
    const redirect = '/';
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

    // All users initially land on the main web beranda
    const redirect = '/';

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

// 6d. Create Order API (records order from Toko or checkout)
app.post('/api/create-order', async (req, res) => {
  try {
    await connectDB();
    let userEmail = 'guest@shotai.app';
    if (req.cookies && req.cookies.admin_token) {
      try {
        const decoded = jwt.verify(req.cookies.admin_token, JWT_SECRET);
        userEmail = decoded.email.toLowerCase();
      } catch (e) {}
    }

    const { product_name, package_type, price } = req.body;
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderNum = `AKA - WEB-${(package_type || 'PREMIUM').toUpperCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-8)}-${rand}`;

    const newOrder = await Order.create({
      order_number: orderNum,
      user_email: userEmail,
      product_name: product_name || `BUNDLING LISENSI PREMIUM APP (${package_type || '1 TAHUN'})`,
      package_type: package_type || '1 Tahun',
      price: price || 'Rp 100.000',
      status: 'Pending',
      notes: 'Pesanan baru via Toko Web'
    });

    res.json({ success: true, order_number: newOrder.order_number, order: newOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal membuat pesanan: ' + err.message });
  }
});

// === 7. DASHBOARD PELANGGAN (Protected - For Customers) ===
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const userEmail = req.user.email ? req.user.email.toLowerCase() : '';
    const myLicenses = await License.find({ owner_email: userEmail }).sort({ createdAt: -1 });

    // Auto-seed orders from existing licenses if user has licenses
    for (const lic of myLicenses) {
      const existingOrder = await Order.findOne({ license_code: lic.code });
      if (!existingOrder) {
        const isBundling = lic.duration === '1 Tahun' || lic.type === 'premium';
        const prodName = isBundling
          ? 'BUNDLING LISENSI PREMIUM APP 1 TAHUN + GEMINI PRO 18 BULAN'
          : `PAKET LISENSI ${lic.type.toUpperCase()} APP (${lic.duration || '1 BULAN'})`;
        const priceMap = {
          '7 Hari': 'Rp 0 (Trial)',
          '1 Bulan': 'Rp 49.000',
          '3 Bulan': 'Rp 129.000',
          '6 Bulan': 'Rp 199.000',
          '1 Tahun': 'Rp 100.000',
          'Selamanya': 'Rp 499.000'
        };
        const orderNumber = `AKA - WEB-BUNDLING-PREMIUM-${(lic.duration || '1-TAHUN').toUpperCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-8)}-C${Math.floor(10000 + Math.random()*90000)}`;
        await Order.create({
          order_number: orderNumber,
          user_email: userEmail,
          product_name: prodName,
          package_type: lic.duration || '1 Tahun',
          price: priceMap[lic.duration] || 'Rp 100.000',
          status: 'Selesai',
          license_code: lic.code,
          notes: 'Pesanan terhubung dari lisensi aktif'
        });
      }
    }

    const myOrders = await Order.find({ user_email: userEmail }).sort({ createdAt: -1 });

    const activeLicensesCount = myLicenses.filter(l => l.status === 'active' && (!l.expires_at || new Date() <= new Date(l.expires_at))).length;
    const pendingOrdersCount = myOrders.filter(o => o.status === 'Pending').length;
    const completedOrdersCount = myOrders.filter(o => o.status === 'Selesai').length;

    const formatDate = (d) => {
      if (!d) return '-';
      const date = new Date(d);
      return date.toLocaleDateString('id-ID') + ', ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatSimpleDate = (d) => {
      if (!d) return '-';
      return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // Construct Orders HTML (matching screenshot green tinted cards)
    let ordersHtml = '';
    if (myOrders.length > 0) {
      myOrders.forEach(ord => {
        const isSelesai = ord.status === 'Selesai';
        ordersHtml += `
          <div class="order-card bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition duration-200" data-status="${ord.status.toLowerCase()}">
            <div class="flex-1">
              <div class="flex items-center gap-2 flex-wrap mb-1.5">
                <span class="font-extrabold text-xs md:text-sm text-gray-900 uppercase tracking-tight">${ord.product_name}</span>
                <span class="bg-gray-200 text-gray-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">${ord.package_type || '1 TAHUN'}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs text-gray-600 select-all font-semibold tracking-wide">${ord.license_code || ord.order_number}</span>
                <button onclick="copyCode('${ord.license_code || ord.order_number}')" title="Salin Kode" class="text-gray-400 hover:text-gray-800 transition p-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
              </div>
            </div>
            <div class="text-left md:text-right flex-shrink-0">
              <div class="text-sm md:text-base font-black text-gray-900">${ord.price}</div>
              <div class="flex items-center md:justify-end gap-1.5 mt-0.5">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelesai ? 'text-emerald-700 bg-emerald-100 border border-emerald-200' : 'text-amber-700 bg-amber-100 border border-amber-200'}">
                  ${ord.status}
                </span>
                <span class="text-gray-400 font-bold text-xs">›</span>
              </div>
              <div class="text-[10px] text-gray-500 mt-1">${formatDate(ord.createdAt)}</div>
            </div>
          </div>
        `;
      });
    } else {
      ordersHtml = `
        <div class="border border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50/50">
          <div class="text-3xl mb-2">📦</div>
          <h4 class="text-sm font-bold text-gray-800 mb-1">Belum Ada Riwayat Pesanan</h4>
          <p class="text-xs text-gray-500 max-w-sm mx-auto mb-4">Anda belum melakukan pemesanan paket lisensi. Pilih paket yang sesuai di toko kami.</p>
          <a href="/#toko" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow">
            <span>🛒</span> Beli Lisensi di Toko
          </a>
        </div>
      `;
    }

    // Construct Licenses HTML
    let licenseCardsHtml = '';
    if (myLicenses.length > 0) {
      myLicenses.forEach(lic => {
        const isExpired = lic.expires_at && new Date() > new Date(lic.expires_at);
        licenseCardsHtml += `
          <div class="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div class="flex items-center justify-between mb-3">
              <span class="${lic.type === 'premium' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'} font-bold py-0.5 px-3 rounded-full text-xs">
                ${lic.type === 'premium' ? '⭐ PREMIUM' : 'FREE'}
              </span>
              <span class="${isExpired ? 'text-red-700 bg-red-100 border border-red-200' : 'text-emerald-700 bg-emerald-100 border border-emerald-200'} text-xs font-semibold px-2.5 py-0.5 rounded-full">
                ${isExpired ? 'Kadaluarsa' : (lic.status === 'active' ? 'Aktif' : 'Nonaktif')}
              </span>
            </div>
            <div class="mb-4">
              <label class="block text-[10px] text-gray-500 uppercase font-semibold mb-1">Kode Lisensi</label>
              <div class="flex items-center gap-2">
                <span class="font-mono text-sm font-bold text-indigo-700 bg-white px-3 py-1.5 rounded-lg border border-gray-300 flex-1 select-all tracking-wider">${lic.code}</span>
                <button onclick="copyCode('${lic.code}')" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow">Salin</button>
              </div>
            </div>
            <div class="text-xs text-gray-500 space-y-1 border-t border-gray-200 pt-3">
              <div class="flex justify-between">
                <span>Masa Aktif:</span>
                <span class="text-gray-900 font-semibold">${lic.duration || 'Aktif'}</span>
              </div>
              <div class="flex justify-between">
                <span>Berlaku Sampai:</span>
                <span class="text-gray-900 font-semibold">${lic.expires_at ? formatSimpleDate(lic.expires_at) : 'Selamanya / Lifetime'}</span>
              </div>
            </div>
          </div>
        `;
      });
    } else {
      licenseCardsHtml = `
        <div class="col-span-2 border border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50/50">
          <div class="text-3xl mb-2">🔑</div>
          <h4 class="text-sm font-bold text-gray-800 mb-1">Belum Ada Lisensi Tertaut</h4>
          <p class="text-xs text-gray-500 max-w-sm mx-auto mb-4">Email ini belum memiliki lisensi yang aktif. Tautkan kode lisensi Anda di bawah ini.</p>
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Dashboard Saya - ShotAi</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #09090b; color: #18181b; min-height: 100vh; }
          </style>
      </head>
      <body class="bg-[#09090b] min-h-screen py-8 px-4 flex flex-col items-center">
          
          <!-- Top Navigation Header -->
          <div class="w-full max-w-4xl flex items-center justify-between mb-4">
              <a href="/" class="flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white transition bg-[#18181b] border border-[#27272a] hover:border-gray-500 px-4 py-2 rounded-xl">
                  <span>←</span>
                  <span>Kembali ke Beranda</span>
              </a>
              <div class="flex items-center gap-3">
                  ${req.user.role === 'superadmin' ? '<a href="/admin" class="text-xs font-semibold text-purple-300 bg-purple-950/60 border border-purple-800/60 px-3.5 py-2 rounded-xl hover:bg-purple-900/60 transition">👑 Dashboard Superadmin</a>' : ''}
                  <a href="/logout" class="text-xs font-semibold text-red-300 bg-red-950/60 border border-red-800/60 px-3.5 py-2 rounded-xl hover:bg-red-900/60 transition">Logout</a>
              </div>
          </div>

          <!-- Main White Card Container (Circled in Blue in User Screenshot) -->
          <div class="w-full max-w-4xl bg-white rounded-2xl p-6 md:p-10 border border-gray-200 shadow-2xl">
              
              <!-- Header Section -->
              <div class="mb-8">
                  <p class="text-[11px] font-extrabold uppercase tracking-wider text-purple-600 mb-1">AKUN SAYA</p>
                  <h1 class="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">${userEmail}</h1>
                  <p class="text-xs text-gray-500 mt-1">Lisensi, pesanan, dan pembayaran yang terhubung dengan email Google Anda.</p>
              </div>

              <!-- 3 Summary Stat Boxes -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <!-- Box 1: Lisensi aktif -->
                  <div class="bg-gray-50/90 border border-gray-200/90 rounded-2xl p-5 hover:border-gray-300 transition">
                      <span class="text-xs font-medium text-gray-500">Lisensi aktif</span>
                      <div class="text-3xl font-black text-blue-600 mt-2">${activeLicensesCount}</div>
                  </div>

                  <!-- Box 2: Pesanan berjalan -->
                  <div class="bg-gray-50/90 border border-gray-200/90 rounded-2xl p-5 hover:border-gray-300 transition">
                      <span class="text-xs font-medium text-gray-500">Pesanan berjalan</span>
                      <div class="text-3xl font-black text-gray-900 mt-2">${pendingOrdersCount}</div>
                  </div>

                  <!-- Box 3: Pesanan selesai -->
                  <div class="bg-gray-50/90 border border-gray-200/90 rounded-2xl p-5 hover:border-gray-300 transition">
                      <span class="text-xs font-medium text-gray-500">Pesanan selesai</span>
                      <div class="text-3xl font-black text-blue-600 mt-2">${completedOrdersCount}</div>
                  </div>
              </div>

              <!-- Tabs Navigation -->
              <div class="flex border-b border-gray-200 gap-8 mb-6">
                  <button id="tabBtnOrders" onclick="switchTab('orders')" class="pb-3 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 transition cursor-pointer">
                      Riwayat Pesanan & Hasil
                  </button>
                  <button id="tabBtnLicenses" onclick="switchTab('licenses')" class="pb-3 text-sm font-semibold text-gray-500 hover:text-gray-900 transition cursor-pointer">
                      Lisensi Saya
                  </button>
              </div>

              <!-- TAB 1: Riwayat Pesanan & Hasil -->
              <div id="tabContentOrders">
                  <!-- Filter Row -->
                  <div class="flex justify-end items-center mb-4">
                      <div class="flex items-center gap-2">
                          <span class="text-xs text-gray-500 font-medium">Tampilkan</span>
                          <select id="orderFilter" onchange="filterOrders(this.value)" class="text-xs bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                              <option value="all">Pending & Selesai</option>
                              <option value="selesai">Selesai</option>
                              <option value="pending">Pending</option>
                          </select>
                      </div>
                  </div>

                  <!-- Orders List -->
                  <div class="space-y-3" id="ordersContainer">
                      ${ordersHtml}
                  </div>
              </div>

              <!-- TAB 2: Lisensi Saya -->
              <div id="tabContentLicenses" class="hidden">
                  <!-- Licenses Grid -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      ${licenseCardsHtml}
                  </div>

                  <!-- Claim Form -->
                  <div class="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Tautkan Lisensi Baru</h4>
                      <p class="text-xs text-gray-500 mb-3">Masukkan kode lisensi ShotAi untuk menautkannya secara instan ke email ini.</p>
                      <form id="claimForm" class="flex flex-col sm:flex-row gap-2">
                          <input type="text" id="claimCode" placeholder="Contoh: AKA-XXXX-XXXX" class="flex-1 p-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500">
                          <button type="submit" id="claimBtn" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition shadow cursor-pointer">Tautkan Lisensi</button>
                      </form>
                  </div>

                  <!-- Download & Support Links -->
                  <div class="flex flex-wrap gap-3 pt-6 border-t border-gray-200">
                      <a href="/#tutorial" class="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow flex items-center gap-2">
                          <span>⬇️</span> Download untuk Windows
                      </a>
                      <a href="https://wa.me/6285261475052" target="_blank" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow flex items-center gap-2">
                          <span>💬</span> WhatsApp Bantuan Pelanggan
                      </a>
                  </div>
              </div>

          </div>

          <script>
            function copyCode(text) {
              navigator.clipboard.writeText(text).then(() => {
                alert('Kode disalin: ' + text);
              }).catch(() => {
                prompt('Salin kode berikut:', text);
              });
            }

            function switchTab(tab) {
              const btnOrders = document.getElementById('tabBtnOrders');
              const btnLicenses = document.getElementById('tabBtnLicenses');
              const contentOrders = document.getElementById('tabContentOrders');
              const contentLicenses = document.getElementById('tabContentLicenses');

              if (tab === 'orders') {
                btnOrders.className = 'pb-3 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 transition cursor-pointer';
                btnLicenses.className = 'pb-3 text-sm font-semibold text-gray-500 hover:text-gray-900 transition cursor-pointer';
                contentOrders.classList.remove('hidden');
                contentLicenses.classList.add('hidden');
              } else {
                btnLicenses.className = 'pb-3 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600 transition cursor-pointer';
                btnOrders.className = 'pb-3 text-sm font-semibold text-gray-500 hover:text-gray-900 transition cursor-pointer';
                contentLicenses.classList.remove('hidden');
                contentOrders.classList.add('hidden');
              }
            }

            function filterOrders(status) {
              const cards = document.querySelectorAll('.order-card');
              cards.forEach(c => {
                const cardStatus = c.getAttribute('data-status');
                if (status === 'all') {
                  c.style.display = 'flex';
                } else if (cardStatus === status) {
                  c.style.display = 'flex';
                } else {
                  c.style.display = 'none';
                }
              });
            }

            const claimForm = document.getElementById('claimForm');
            if (claimForm) {
              claimForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const code = document.getElementById('claimCode').value;
                const btn = document.getElementById('claimBtn');
                if (!code) return;

                btn.disabled = true;
                btn.textContent = 'Memproses...';

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
                    btn.disabled = false;
                    btn.textContent = 'Tautkan Lisensi';
                  }
                } catch(e) {
                  alert('Terjadi kesalahan jaringan.');
                  btn.disabled = false;
                  btn.textContent = 'Tautkan Lisensi';
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

