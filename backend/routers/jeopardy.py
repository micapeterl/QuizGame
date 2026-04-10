import uuid
from fastapi import APIRouter, HTTPException
from models import (
    JeopardyBoardModel,
    CategoryModel,
    CellModel,
    ContentModel,
    BuildBoardRequest,
    UpdateCategoryRequest,
    UpdateCellRequest,
    MarkAnsweredRequest,
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

    # Preserve existing category names/images if column count allows
    def prev_cat(c: int) -> CategoryModel:
        if old and c < old.cols and c < len(old.categories):
            return old.categories[c]
        return CategoryModel(name=f"Category {c + 1}")

    # Preserve existing cell content if dimensions allow
    def prev_cell(c: int, r: int) -> CellModel:
        if old and c < old.cols and r < old.rows:
            try:
                return old.cells[c][r]
            except IndexError:
                pass
        return CellModel()

    new_board = JeopardyBoardModel(
        id=str(uuid.uuid4()),
        cols=cols,
        rows=rows,
        basePts=base_pts,
        categories=[prev_cat(c) for c in range(cols)],
        cells=[[prev_cell(c, r) for r in range(rows)] for c in range(cols)],
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
        s.jeopardy.categories[req.col].name    = req.name
        s.jeopardy.categories[req.col].bgImage = req.bg_image
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


@router.post("/reset")
def reset_board():
    """Mark all cells as unanswered, making the full board visible again."""
    state = get_state()
    if not state.jeopardy:
        raise HTTPException(status_code=400, detail="No board configured")

    def _reset(s):
        for col in s.jeopardy.cells:
            for cell in col:
                cell.answered = False
    mutate_and_save(_reset)
    return {"ok": True}