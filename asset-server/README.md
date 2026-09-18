# ShotAi Asset Server

Production-ready master asset API server for **ShotAi Effect and Transition** assets.
Built for deployment on **Ubuntu 22.04 LTS** (with aaPanel / Nginx reverse proxy) and compatible with local development.

---

## 1. System Architecture

- **Runtime**: Node.js 18+ / 20+ LTS
- **Framework**: Express.js
- **Database**: PostgreSQL 18 (`shotaistudio`)
- **Storage**: Local filesystem (`/www/wwwroot/shotai-assets/`)
- **Security**: Helmet, CORS origin whitelisting, Bearer API Key auth, path-traversal prevention
- **Internal Binding**: `127.0.0.1:3100` (Never exposed directly to public internet; fronted by Nginx / aaPanel)

---

## 2. Directory Structure

```
/www/wwwroot/shotai-assets/
├── effects/
│   ├── Classic/
│   │   ├── effect01.mp4
│   │   └── thumbnails/
│   │       └── effect01.jpg
│   └── Fire/
│       ├── fire01.mp4
│       └── thumbnails/
│           └── fire01.jpg
└── transitions/
    └── Basic/
        ├── transition01.mp4
        └── thumbnails/
            └── transition01.jpg
```

---

## 3. Installation & Setup

### A. Clone or Copy Files
Place this repository at your server directory, e.g. `/www/wwwroot/shotai-asset-server/`.

### B. Install Dependencies
```bash
npm install
```

### C. Environment Configuration (.env)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
nano .env
```

Configure the following variables:
```ini
PORT=3100
HOST=127.0.0.1
NODE_ENV=production

# PostgreSQL Connection
DATABASE_URL=postgresql://shotaistudio:YOUR_DB_PASSWORD@127.0.0.1:5432/shotaistudio

# Storage Root Directory
STORAGE_ROOT=/www/wwwroot/shotai-assets

# Security: Admin API Key
ADMIN_API_KEY=YOUR_SUPER_SECRET_API_KEY

# CORS Whitelist (comma separated)
ALLOWED_ORIGINS=https://your-domain.com,http://localhost:5173
```

---

## 4. Database Setup

The server automatically initializes tables and indexes on first startup using `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`. Existing data is **never** dropped or deleted.

### Tables Created:
1. `effects`
2. `transitions`

### Columns:
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR(255))
- `category` (VARCHAR(100))
- `filename` (VARCHAR(255))
- `file_path` (VARCHAR(500))
- `thumbnail_path` (VARCHAR(500))
- `version` (INTEGER DEFAULT 1)
- `file_size` (BIGINT)
- `status` (VARCHAR(50) DEFAULT 'active')
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `checksum` (VARCHAR(64))
- `mime_type` (VARCHAR(100))
- `storage_key` (VARCHAR(500))
- `thumbnail_key` (VARCHAR(500))

### Indexes Created:
- `effects(category)`, `effects(status)`, `effects(checksum)`
- `transitions(category)`, `transitions(status)`, `transitions(checksum)`

---

## 5. Starting the Server

### Production (Node):
```bash
npm start
```

### Production with PM2 (Recommended for Ubuntu / aaPanel):
```bash
pm2 start src/server.js --name "shotai-asset-server"
pm2 save
pm2 startup
```

### Development Mode:
```bash
npm run dev
```

---

## 6. Nginx / aaPanel Reverse Proxy Configuration

Configure Nginx on aaPanel to proxy public traffic to the internal server:

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name api-assets.yourdomain.com;

    # SSL configuration managed by aaPanel / Let's Encrypt
    # ...

    client_max_body_size 500M;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 600s;
        proxy_connect_timeout 600s;
    }
}
```

---

## 7. API Endpoints Reference

### Public Endpoints

#### 1. Health Check
- **Endpoint**: `GET /api/health`
- **Description**: Verifies API availability and tests PostgreSQL with `SELECT 1`.
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "service": "shotai-asset-server",
    "database": true
  }
  ```
- **Error Response (503)**:
  ```json
  {
    "success": false,
    "service": "shotai-asset-server",
    "database": false
  }
  ```

#### 2. Get Effects (Paginated)
- **Endpoint**: `GET /api/effects?page=1&limit=50&category=Fire&status=active`
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "name": "fire01",
        "category": "Fire",
        "filename": "fire01.mp4",
        "version": 1,
        "file_size": 12456789,
        "status": "active",
        "checksum": "a3f5...",
        "mime_type": "video/mp4"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

#### 3. Get Transitions (Paginated)
- **Endpoint**: `GET /api/transitions?page=1&limit=50&category=Basic&status=active`
- **Response**: Same format as effects.

#### 4. Get Single Effect / Transition Metadata
- **Endpoint**: `GET /api/effects/:id` or `GET /api/transitions/:id`

#### 5. Get Manifest (Lightweight for Desktop App)
- **Endpoint**: `GET /api/effects/manifest` or `GET /api/transitions/manifest`
- **Response**:
  ```json
  {
    "success": true,
    "version": 1,
    "data": [
      {
        "id": 1,
        "name": "Fire 01",
        "category": "Fire",
        "filename": "fire01.mp4",
        "version": 1,
        "checksum": "a3f5...",
        "file_size": 12456789,
        "thumbnail_url": "https://api-assets.yourdomain.com/storage/effects/Fire/thumbnails/fire01.jpg",
        "download_url": "https://api-assets.yourdomain.com/api/effects/1/download"
      }
    ]
  }
  ```

#### 6. Streaming Download
- **Endpoint**: `GET /api/effects/:id/download` or `GET /api/transitions/:id/download`
- **Features**:
  - Memory-efficient streaming (`fs.createReadStream()`).
  - Supports HTTP Range requests (`bytes=start-end`) returning HTTP 206 Partial Content.
  - Supports `Content-Length`, `Content-Type: video/mp4`, `Accept-Ranges: bytes`.

---

### Admin Endpoints (Requires `Authorization: Bearer <API_KEY>`)

#### 1. Check Existing Checksum (Pre-upload optimization)
- **Endpoint**: `GET /api/admin/check-checksum?type=effects&checksum=...`
- **Response**:
  ```json
  {
    "success": true,
    "exists": true,
    "data": { "id": 1, "filename": "fire01.mp4", "version": 1 }
  }
  ```

#### 2. Upload Effect
- **Endpoint**: `POST /api/admin/upload/effect`
- **Content-Type**: `multipart/form-data`
- **Headers**: `Authorization: Bearer <ADMIN_API_KEY>`
- **Fields**:
  - `file`: .mp4 video file (required)
  - `thumbnail`: .jpg image file (optional)
  - `name`: Human readable title (optional)
  - `category`: Category string (required, e.g. "Fire", "Classic")
  - `checksum`: Expected SHA-256 (optional, verified server-side)
- **Auto-Versioning Rules**:
  - **Identical Checksum**: Skips creation, returns existing asset record.
  - **Identical Filename & Category + Different Checksum**: Increments `version = old_version + 1`, updates file and database.
  - **New Asset**: Sets `version = 1`.

#### 3. Upload Transition
- **Endpoint**: `POST /api/admin/upload/transition`
- **Content-Type**: `multipart/form-data`
- Same rules and fields as upload effect.

---

## 8. Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `HTTP 503` on `/api/health` | PostgreSQL not running or wrong credentials | Verify `DATABASE_URL` in `.env`, run `systemctl status postgresql` |
| `HTTP 401` on upload | Missing or incorrect API key | Provide header `Authorization: Bearer <ADMIN_API_KEY>` |
| `HTTP 413` Entity Too Large | Nginx request body limit reached | Add `client_max_body_size 500M;` in Nginx configuration |
| Path Traversal Error | Target path attempts `../` | Server safely blocks all path traversal. Keep categories within alphanumeric boundaries |
