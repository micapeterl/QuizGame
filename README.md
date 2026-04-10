# 🎯 Quiz Arena

A game show quiz platform with Jeopardy (and more to come). Built with Next.js 14 + FastAPI + Tailwind CSS v3. Game state persists to a local JSON file between sessions.

---

## Quick Start (Windows)

Double-click **`start.bat`** in the root of this folder.

It will:
1. Install frontend npm dependencies (first run only)
2. Create a Python venv and install backend packages (first run only)
3. Open two terminal windows — one for the backend, one for the frontend

Then open **http://localhost:3000** in your browser.

---

## Manual Start (two terminals)

**Terminal 1 — Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
quizgame/
├── start.bat                  ← Double-click to launch everything
├── README.md
│
├── frontend/                  ← Next.js 14 + Tailwind CSS v3
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx       ← Root page / screen router
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── TopBar.tsx
│   │   │   │   └── PlayerSidebar.tsx
│   │   │   ├── games/
│   │   │   │   ├── HomeScreen.tsx
│   │   │   │   └── jeopardy/
│   │   │   │       ├── BoardView.tsx
│   │   │   │       └── QuestionScreen.tsx
│   │   │   └── ui/
│   │   │       ├── Modal.tsx
│   │   │       ├── ImageUpload.tsx
│   │   │       └── FormField.tsx
│   │   ├── lib/
│   │   │   ├── api.ts         ← All backend calls
│   │   │   └── colors.ts      ← Player color helpers
│   │   └── types/
│   │       └── index.ts       ← Shared TypeScript types
│   ├── tailwind.config.js
│   ├── next.config.js         ← Proxies /api/* → localhost:8000
│   └── package.json
│
└── backend/                   ← FastAPI + Pydantic
    ├── main.py                ← App entry, CORS, /api/state, /api/health
    ├── models.py              ← Pydantic models + request bodies
    ├── store.py               ← JSON load/save + in-memory singleton
    ├── routers/
    │   ├── players.py         ← CRUD + award points + set active
    │   └── jeopardy.py        ← Build board, edit categories/cells
    ├── data/
    │   └── state.json         ← Persisted game state
    └── requirements.txt
```

---

## How to Play

### Players
- Click **Players** (top right) to open the sidebar
- Add players with name, optional photo, and starting point total
- Click any player chip in the **top bar** to mark them as the active player (colored border glow = their turn)

### Jeopardy
1. Click **Jeopardy** on the home screen
2. Click **Settings** → set number of categories, rows, and base point value → **Build Board**
3. Click any **category header** to set its name and an optional background image
4. Click a **point value cell** to open the question screen
5. On the **question page**: click ⚙ to add text/image content
6. Click **Reveal Answer →** to show the answer page
7. On the **answer page**: click **✓ Award Points** to give points to the active player and mark the question as used

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/state` | Full game state |
| GET | `/api/health` | Health check |
| POST | `/api/players` | Add player |
| PATCH | `/api/players/{id}` | Update player |
| DELETE | `/api/players/{id}` | Remove player |
| POST | `/api/players/active` | Set active player |
| POST | `/api/players/award` | Award points |
| POST | `/api/jeopardy/build` | Build board |
| PATCH | `/api/jeopardy/category` | Update category name/image |
| PATCH | `/api/jeopardy/cell` | Update question/answer content |
| PATCH | `/api/jeopardy/cell/answered` | Mark cell as answered |
