# WatchParty

Watch Netflix, Prime Video, and YouTube in sync with friends. Includes text + voice chat.

## Structure

```
watchparty/
├── frontend/    → React + Vite (deploy to Vercel)
├── backend/     → Node.js + Socket.io (deploy to Railway)
└── extension/   → Chrome Extension (load unpacked)
```

## Local Dev

**Backend:**
```bash
cd backend && npm run dev
```

**Frontend:**
```bash
cd frontend && npm run dev
```
Open http://localhost:5173

**Extension:**
1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `extension/` folder
4. Click the extension icon, enter Room ID + Backend URL, click Connect

## Deploy

### Backend → Railway
1. Push `backend/` to a GitHub repo
2. New project on railway.app → Deploy from GitHub
3. Set env var: `FRONTEND_URL=https://your-app.vercel.app`
4. Railway auto-detects Node.js, runs `npm start`

### Frontend → Vercel
1. Push `frontend/` to GitHub
2. New project on vercel.com → import repo
3. Set env var: `VITE_BACKEND_URL=https://your-backend.railway.app`
4. Vercel auto-detects Vite

### Extension (share with friend)
- Zip the `extension/` folder and share it
- Friend loads it unpacked in Chrome dev mode
- Or publish to Chrome Web Store (requires developer account)

## How it works

| Platform | How sync works |
|---|---|
| YouTube | Embedded iframe API — fully in-app |
| Netflix | Extension detects play/pause/seek on netflix.com |
| Prime Video | Extension detects play/pause/seek on primevideo.com |

Voice chat uses WebRTC (peer-to-peer, no relay server needed for most connections).
