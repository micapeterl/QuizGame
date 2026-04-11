import uuid
from fastapi import APIRouter, HTTPException
from models import (
    CLBoardModel,
    CLCategoryModel,
    CLQuestionModel,
    CLSlotModel,
    BuildCLBoardRequest,
    UpdateCLCategoryRequest,
    UpdateCLQuestionRequest,
    MarkCLAnsweredRequest,
)
from store import get_state, mutate_and_save

router = APIRouter(prefix="/api/commonlink", tags=["commonlink"])

VARIANTS = ["common_link", "odd_one_out", "sequence"]
VARIANT_NAMES = {
    "common_link": "Common Link",
    "odd_one_out":  "Odd One Out",
    "sequence":     "Finish the Sequence",
}


def _get_board():
    board = get_state().commonLink
    if not board:
        raise HTTPException(status_code=400, detail="No board configured")
    return board


@router.post("/build", response_model=CLBoardModel)
def build_board(req: BuildCLBoardRequest):
    state = get_state()
    old = state.commonLink

    def prev_cat(variant: str) -> CLCategoryModel:
        """Preserve existing category meta + questions if variant matches."""
        if old:
            for c in old.categories:
                if c.variant == variant:
                    return c
        return CLCategoryModel(variant=variant, name=VARIANT_NAMES[variant])

    round_counts = {
        "common_link": max(1, min(20, req.common_link_rounds)),
        "odd_one_out":  max(1, min(20, req.odd_one_out_rounds)),
        "sequence":     max(1, min(20, req.sequence_rounds)),
    }
    point_values = {
        "common_link": max(100, req.common_link_pts),
        "odd_one_out":  max(100, req.odd_one_out_pts),
        "sequence":     max(100, req.sequence_pts),
    }

    new_categories = []
    for variant in VARIANTS:
        base = prev_cat(variant)
        n    = round_counts[variant]
        pts  = point_values[variant]
        base.points = pts

        # Preserve existing questions, trim/extend to match new count
        existing = base.questions[:n]
        while len(existing) < n:
            existing.append(CLQuestionModel(variant=variant))
        base.questions = existing
        new_categories.append(base)

    new_board = CLBoardModel(id=str(uuid.uuid4()), categories=new_categories)

    def _build(s):
        s.commonLink = new_board
    mutate_and_save(_build)
    return new_board


@router.patch("/category")
def update_category(req: UpdateCLCategoryRequest):
    _get_board()
    def _update(s):
        cat = s.commonLink.categories[req.cat_index]
        cat.name        = req.name
        cat.description = req.description
        cat.bgImage     = req.bg_image
    mutate_and_save(_update)
    return {"ok": True}


@router.patch("/question")
def update_question(req: UpdateCLQuestionRequest):
    _get_board()
    def _update(s):
        q = s.commonLink.categories[req.cat_index].questions[req.q_index]
        q.slots        = req.slots
        q.answerText   = req.answer_text
        q.answerIndex  = req.answer_index
        q.hiddenIndex  = req.hidden_index
    mutate_and_save(_update)
    return {"ok": True}


@router.patch("/question/answered")
def mark_answered(req: MarkCLAnsweredRequest):
    _get_board()
    def _update(s):
        s.commonLink.categories[req.cat_index].questions[req.q_index].answered = req.answered
    mutate_and_save(_update)
    return {"ok": True}


@router.post("/reset")
def reset_board():
    _get_board()
    def _reset(s):
        for cat in s.commonLink.categories:
            for q in cat.questions:
                q.answered = False
    mutate_and_save(_reset)
    return {"ok": True}