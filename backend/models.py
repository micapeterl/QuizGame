from __future__ import annotations
from pydantic import BaseModel
from typing import Optional


# ── Content (question or answer text + optional image) ──
class ContentModel(BaseModel):
    text: str = ""
    image: Optional[str] = None   # base64 dataURL


# ── Jeopardy cell ────────────────────────────────────────
class CellModel(BaseModel):
    question: ContentModel = ContentModel()
    answer:   ContentModel = ContentModel()
    answered: bool = False


# ── Jeopardy category ────────────────────────────────────
class CategoryModel(BaseModel):
    name: str
    bgImage: Optional[str] = None


# ── Jeopardy board ───────────────────────────────────────
class JeopardyBoardModel(BaseModel):
    id: str
    cols: int
    rows: int
    basePts: int
    categories: list[CategoryModel]
    cells: list[list[CellModel]]   # [col][row]


# ── Player ───────────────────────────────────────────────
class PlayerModel(BaseModel):
    id: str
    name: str
    avatar: Optional[str] = None
    points: int = 0
    color: str = '#f5a623'
    # Legacy field — ignored on load, kept for forward compat
    colorIndex: Optional[int] = None

    def model_post_init(self, __context) -> None:
        """Migrate old colorIndex to a hex color if color is still the default."""
        DEFAULTS = ['#f5a623','#6c8ef5','#4caf7d','#e05d5d','#b06cf5','#4db6ac','#f06292','#fff176']
        if self.colorIndex is not None and self.color == '#f5a623':
            self.color = DEFAULTS[self.colorIndex % len(DEFAULTS)]


# ── Home screen settings ─────────────────────────────────
class GameCardSettings(BaseModel):
    id: str
    name: str
    icon: Optional[str] = None      # legacy, no longer used
    bgImage: Optional[str] = None   # base64 dataURL
    desc: str
    available: bool


class HomeSettingsModel(BaseModel):
    title: str = "QuizArena"
    font: str = "Inter"
    cards: list[GameCardSettings] = [
        GameCardSettings(id="jeopardy", name="Jeopardy",        desc="Categories & clues — answer in the form of a question", available=True),
        GameCardSettings(id="wheel",    name="Wheel of Fortune", desc="Spin, buy vowels, solve the puzzle",                    available=False),
        GameCardSettings(id="trivia",   name="Trivia Blitz",     desc="Lightning-round rapid-fire questions",                  available=False),
        GameCardSettings(id="price",    name="Price Match",      desc="Guess the closest without going over",                  available=False),
    ]


# ── Full game state (persisted to JSON) ──────────────────
class GameStateModel(BaseModel):
    players: list[PlayerModel] = []
    activePlayerId: Optional[str] = None
    jeopardy: Optional[JeopardyBoardModel] = None
    homeSettings: HomeSettingsModel = HomeSettingsModel()


# ── Request bodies ───────────────────────────────────────
class AddPlayerRequest(BaseModel):
    name: str
    avatar: Optional[str] = None
    points: int = 0
    color: Optional[str] = None


class UpdatePlayerRequest(BaseModel):
    name:   Optional[str] = None
    avatar: Optional[str] = None
    points: Optional[int] = None
    color:  Optional[str] = None


class SetActivePlayerRequest(BaseModel):
    id: Optional[str] = None


class AwardPointsRequest(BaseModel):
    player_id: str
    points: int


class BuildBoardRequest(BaseModel):
    cols: int
    rows: int
    base_pts: int


class UpdateCategoryRequest(BaseModel):
    col: int
    name: str
    bg_image: Optional[str] = None


class UpdateCellRequest(BaseModel):
    col: int
    row: int
    side: str   # "question" | "answer"
    text: str
    image: Optional[str] = None


class MarkAnsweredRequest(BaseModel):
    col: int
    row: int
    answered: bool


class UpdateHomeSettingsRequest(BaseModel):
    title: str
    font: str
    cards: list[GameCardSettings]