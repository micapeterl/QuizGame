import uuid
import random
from fastapi import APIRouter, HTTPException
from models import (
    JeopardyBoardModel,
    CategoryModel,
    CellModel,
    ContentModel,
    DoubleSettingsModel,
    BuildBoardRequest,
    UpdateCategoryRequest,
    UpdateCellRequest,
    MarkAnsweredRequest,
    UpdateDoubleSettingsRequest,
)
from store import get_state, mutate_and_save

router = APIRouter(prefix="/api/jeopardy", tags=["jeopardy"])


@router.post("/build", response_model=JeopardyBoardModel)
def build_board(req: BuildBoardRequest):
    cols     = max(1, min(12, req.cols))
    rows     = max(1, min(10, req.rows))
    base_pts = max(100, req.base_pts)

    state = get_state()
    old   = state.jeopardy

    def prev_cat(c: int) -> CategoryModel:
        if old and c < old.cols and c < len(old.categories):
            existing = old.categories[c]
            # Re-assign a fresh random doubleIndex for the new row count
            existing.doubleIndex = random.randint(0, rows - 1)
            return existing
        return CategoryModel(name=f"Category {c + 1}", doubleIndex=random.randint(0, rows - 1))

    def prev_cell(c: int, r: int) -> CellModel:
        if old and c < old.cols and r < old.rows:
            try:
                return old.cells[c][r]
            except IndexError:
                pass
        return CellModel()

    # Preserve existing double settings if board already had them
    prev_double = old.doubleSettings if old else DoubleSettingsModel()

    new_board = JeopardyBoardModel(
        id=str(uuid.uuid4()),
        cols=cols,
        rows=rows,
        basePts=base_pts,
        baseTimer=max(0, req.base_timer),
        timerIncrement=max(0, req.timer_increment),
        categories=[prev_cat(c) for c in range(cols)],
        cells=[[prev_cell(c, r) for r in range(rows)] for c in range(cols)],
        doubleSettings=prev_double,
    )

    def _build(s):
        s.jeopardy = new_board
    mutate_and_save(_build)
    return new_board


@router.patch("/category")
def update_category(req: UpdateCategoryRequest):
    state = get_state()
    if not state.jeopardy:
        raise HTTPException(status_code=400, detail="No board configured")
    if req.col < 0 or req.col >= state.jeopardy.cols:
        raise HTTPException(status_code=400, detail="Column out of range")

    def _update(s):
        s.jeopardy.categories[req.col].name                   = req.name
        s.jeopardy.categories[req.col].bgImage                = req.bg_image
        s.jeopardy.categories[req.col].timerOverride           = req.timer_override
        s.jeopardy.categories[req.col].timerIncrementOverride  = req.timer_increment_override
    mutate_and_save(_update)
    return {"ok": True}


@router.patch("/cell")
def update_cell(req: UpdateCellRequest):
    state = get_state()
    if not state.jeopardy:
        raise HTTPException(status_code=400, detail="No board configured")
    if req.col < 0 or req.col >= state.jeopardy.cols:
        raise HTTPException(status_code=400, detail="Column out of range")
    if req.row < 0 or req.row >= state.jeopardy.rows:
        raise HTTPException(status_code=400, detail="Row out of range")
    if req.side not in ("question", "answer"):
        raise HTTPException(status_code=400, detail="side must be 'question' or 'answer'")

    content = ContentModel(text=req.text, image=req.image)

    def _update(s):
        cell = s.jeopardy.cells[req.col][req.row]
        if req.side == "question":
            cell.question = content
        else:
            cell.answer = content
        # -1 is a sentinel meaning "clear the override" (JSON doesn't distinguish null from absent)
        if req.timer_override is not None:
            cell.timerOverride = None if req.timer_override == -1 else req.timer_override
    mutate_and_save(_update)
    return {"ok": True}


@router.patch("/cell/answered")
def mark_answered(req: MarkAnsweredRequest):
    state = get_state()
    if not state.jeopardy:
        raise HTTPException(status_code=400, detail="No board configured")

    def _update(s):
        s.jeopardy.cells[req.col][req.row].answered = req.answered
    mutate_and_save(_update)
    return {"ok": True}


@router.patch("/double-settings")
def update_double_settings(req: UpdateDoubleSettingsRequest):
    state = get_state()
    if not state.jeopardy:
        raise HTTPException(status_code=400, detail="No board configured")

    def _update(s):
        s.jeopardy.doubleSettings = DoubleSettingsModel(
            text=req.text,
            image=req.image,
            audio=req.audio,
        )
    mutate_and_save(_update)
    return {"ok": True}


@router.post("/reset")
def reset_board():
    state = get_state()
    if not state.jeopardy:
        raise HTTPException(status_code=400, detail="No board configured")

    def _reset(s):
        for col in s.jeopardy.cells:
            for cell in col:
                cell.answered = False
    mutate_and_save(_reset)
    return {"ok": True}