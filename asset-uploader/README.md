# ShotAi Asset Uploader (Windows Client)

Node.js CLI scanner and uploader that scans `D:\apps\ShotAiNew\assets`, generates FFmpeg thumbnails, calculates streaming SHA-256 checksums, and uploads assets in parallel with automatic resume and retry to the **ShotAi Asset Server**.

---

## 1. Features

- **Recursive Scanner**: Scans `assets\Effects` and `assets\Transitions` subdirectories recursively.
- **Smart Category Detection**: First subfolder is assigned as the asset category (e.g. `Effects/Fire/fire01.mp4` -> Category `Fire`).
- **Streaming SHA-256**: High-performance streaming hashing with negligible RAM usage.
- **Fast Pre-check & Resume**: Checks server with checksum before uploading. If identical, outputs `[SKIP] fire01.mp4 Reason: checksum unchanged`.
- **Automatic Versioning**: If a file changes on disk, the uploader uploads the update and increments the version number.
- **FFmpeg 16:9 Thumbnails**: Automatically seeks to ~1.0s and outputs a 320x180 JPG thumbnail into `cache/thumbnails/`.
- **Parallel Workers (Concurrency 2)**: Processes 2 files concurrently to balance speed and system stability.
- **Resilient 3-Stage Retry**: Automatically retries 500, 502, 503, and network timeouts with backoff delays (2s, 5s, 10s).
- **Clean Audit Log**: Saves detailed logs to `logs/uploader.log` without exposing any passwords or API keys.

---

## 2. Prerequisites

1. **Node.js**: v18.0.0 or higher.
2. **FFmpeg**:
   - Bundled with project at `D:\apps\ShotAiNew\node_modules\ffmpeg-static\ffmpeg.exe` (automatically detected as fallback).
   - Or installed globally in Windows PATH (`winget install Gyan.FFmpeg`).

---

## 3. Configuration (`config.json`)

Ensure `config.json` exists in the `asset-uploader` root directory:

```json
{
  "serverUrl": "https://your-api-domain.com",
  "apiKey": "YOUR_ADMIN_API_KEY",
  "assetRoot": "D:\\apps\\ShotAiNew\\assets",
  "ffmpegPath": "ffmpeg",
  "concurrency": 2
}
```

### Parameters:
- `serverUrl`: The public or internal URL where ShotAi Asset Server is reachable.
- `apiKey`: Must match `ADMIN_API_KEY` defined in the server's `.env`.
- `assetRoot`: Path to the assets folder containing `Effects/` and `Transitions/`.
- `ffmpegPath`: Command or path to FFmpeg (`"ffmpeg"` or specific path).
- `concurrency`: Number of simultaneous uploads (default: `2`).

---

## 4. Usage

### A. Install Dependencies
```bash
cd D:\apps\ShotAiNew\asset-uploader
npm install
```

### B. Run Uploader
```bash
npm start
```
or
```bash
node uploader.js
```

---

## 5. Output Indicators

During execution, the terminal displays clear progress:

```
[1/250] Uploading:
Effects/Fire/fire01.mp4
[OK] Uploaded
Version: 1
Size: 12.4 MB

[2/250] Processing:
Effects/Fire/fire02.mp4
[SKIP] fire02.mp4
Reason: checksum unchanged

[3/250] Uploading:
Effects/Classic/glow.mp4
[UPDATE] glow.mp4
Version: 2
Size: 8.2 MB

[4/250] Processing:
Effects/Corrupt/bad.mp4
[ERROR] bad.mp4
Reason: Corrupt video container
```

---

## 6. Logs & Auditing

Logs are written to:
`logs/uploader.log`

Example log entry:
```
[2026-09-17T12:30:00.123Z] [OK] file="fire01.mp4" action="upload" version="1" checksum="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
[2026-09-17T12:30:01.456Z] [SKIP] file="fire02.mp4" action="skip" version="1" checksum="2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae"
```

---

## 7. Troubleshooting

| Issue | Explanation | Solution |
|---|---|---|
| `Authentication failed (HTTP 401)` | Incorrect API key | Verify `apiKey` in `config.json` matches `ADMIN_API_KEY` in server `.env` |
| `FFmpeg executable not found` | FFmpeg is neither in PATH nor in `node_modules` | Set exact path in `config.json` (e.g. `"D:\\apps\\ShotAiNew\\node_modules\\ffmpeg-static\\ffmpeg.exe"`) |
| `Asset root directory does not exist` | Wrong path configured | Verify path `D:\apps\ShotAiNew\assets` |
| `Connection refused (ECONNREFUSED)` | Asset Server is not running | Start the server with `npm start` in `asset-server` |
