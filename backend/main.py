from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from store import get_state, mutate_and_save
from models import UpdateHomeSettingsRequest, HomeSettingsModel
from routers import players, jeopardy, commonlink

app = FastAPI(title="Quiz Arena API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(players.router)
app.include_router(jeopardy.router)
app.include_router(commonlink.router)


@app.get("/api/state")
def get_full_state():
    """Return the full game state — players, active player, jeopardy board."""
    return get_state()


@app.patch("/api/home-settings")
def update_home_settings(req: UpdateHomeSettingsRequest):
    def _update(s):
        s.homeSettings = HomeSettingsModel(
            title=req.title,
            font=req.font,
            cards=req.cards,
            customFonts=req.customFonts,
        )
    mutate_and_save(_update)
    return {"ok": True}


@app.get("/api/health")
def health():
    return {"status": "ok"}