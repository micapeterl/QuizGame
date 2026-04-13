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
    doubleIndex: Optional[int] = None   # which row is the double-points question


# ── Double-points popup settings ─────────────────────────
class DoubleSettingsModel(BaseModel):
    text:  str = "DOUBLE POINTS!"
    image: Optional[str] = None   # base64 dataURL
    audio: Optional[str] = None   # base64 dataURL


# ── Jeopardy board ───────────────────────────────────────
class JeopardyBoardModel(BaseModel):
    id: str
    cols: int
    rows: int
    basePts: int
    categories: list[CategoryModel]
    cells: list[list[CellModel]]   # [col][row]
    doubleSettings: DoubleSettingsModel = DoubleSettingsModel()


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


# ── Custom font ──────────────────────────────────────────
class CustomFontModel(BaseModel):
    label: str
    value: str
    dataUrl: str
    format: str = "truetype"


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
        GameCardSettings(id="jeopardy",    name="Jeopardy",        desc="Categories & clues — answer in the form of a question", available=True),
        GameCardSettings(id="commonlink",  name="Common Link",     desc="Find the link, spot the odd one out, or finish the sequence", available=True),
        GameCardSettings(id="trivia",      name="Trivia Blitz",    desc="Lightning-round rapid-fire questions",                  available=False),
        GameCardSettings(id="price",       name="Price Match",     desc="Guess the closest without going over",                  available=False),
    ]
    customFonts: list[CustomFontModel] = []


# ── Full game state (persisted to JSON) ──────────────────
class GameStateModel(BaseModel):
    players: list[PlayerModel] = []
    activePlayerId: Optional[str] = None
    jeopardy: Optional[JeopardyBoardModel] = None
    commonLink: Optional[CLBoardModel] = None
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


class UpdateDoubleSettingsRequest(BaseModel):
    text:  str
    image: Optional[str] = None
    audio: Optional[str] = None


class UpdateHomeSettingsRequest(BaseModel):
    title: str
    font: str
    cards: list[GameCardSettings]
    customFonts: list[CustomFontModel] = []


# ══════════════════════════════════════════════════════════
# ── Common Link game models ───────────────────────────────
# ══════════════════════════════════════════════════════════

# One of the four slots shown on a question page
class CLSlotModel(BaseModel):
    text: str = ""
    image: Optional[str] = None   # base64 dataURL

# A single question — variant determines behaviour
# variant: "common_link" | "odd_one_out" | "sequence"
class CLQuestionModel(BaseModel):
    variant: str = "common_link"
    slots: list[CLSlotModel] = [CLSlotModel(), CLSlotModel(), CLSlotModel(), CLSlotModel()]
    # common_link: revealed answer text
    answerText: str = ""
    # odd_one_out: index (0-3) of the correct slot
    answerIndex: Optional[int] = None
    # sequence: index (0-3) of the hidden slot
    hiddenIndex: Optional[int] = None
    answered: bool = False

# A category column (one of the three variant categories)
class CLCategoryModel(BaseModel):
    variant: str          # "common_link" | "odd_one_out" | "sequence"
    name: str
    description: str = ""
    bgImage: Optional[str] = None
    points: int = 200
    questions: list[CLQuestionModel] = []

# The full board
class CLBoardModel(BaseModel):
    id: str
    categories: list[CLCategoryModel] = []

# ── CL request bodies ─────────────────────────────────────
class BuildCLBoardRequest(BaseModel):
    common_link_rounds: int = 3
    odd_one_out_rounds: int = 3
    sequence_rounds: int = 3
    common_link_pts: int = 200
    odd_one_out_pts: int = 200
    sequence_pts: int = 200

class UpdateCLCategoryRequest(BaseModel):
    cat_index: int
    name: str
    description: str = ""
    bg_image: Optional[str] = None

class UpdateCLQuestionRequest(BaseModel):
    cat_index: int
    q_index: int
    slots: list[CLSlotModel]
    answer_text: str = ""
    answer_index: Optional[int] = None
    hidden_index: Optional[int] = None

class MarkCLAnsweredRequest(BaseModel):
    cat_index: int
    q_index: int
    answered: bool