import uuid
from fastapi import APIRouter, HTTPException
from models import (
    PlayerModel,
    AddPlayerRequest,
    UpdatePlayerRequest,
    SetActivePlayerRequest,
    AwardPointsRequest,
)
from store import get_state, mutate_and_save

router = APIRouter(prefix="/api/players", tags=["players"])


@router.post("", response_model=PlayerModel)
def add_player(req: AddPlayerRequest):
    state = get_state()
    DEFAULT_COLORS = ['#f5a623','#6c8ef5','#4caf7d','#e05d5d','#b06cf5','#4db6ac','#f06292','#fff176']
    default_color = DEFAULT_COLORS[len(state.players) % len(DEFAULT_COLORS)]
    new_player = PlayerModel(
        id=str(uuid.uuid4()),
        name=req.name.strip(),
        avatar=req.avatar,
        points=req.points,
        color=req.color if req.color else default_color,
    )
    def _add(s):
        s.players.append(new_player)
    mutate_and_save(_add)
    return new_player


@router.patch("/{player_id}", response_model=PlayerModel)
def update_player(player_id: str, req: UpdatePlayerRequest):
    state = get_state()
    player = next((p for p in state.players if p.id == player_id), None)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    def _update(s):
        p = next(p for p in s.players if p.id == player_id)
        if req.name   is not None: p.name   = req.name.strip()
        if req.avatar is not None: p.avatar = req.avatar
        if req.points is not None: p.points = req.points
        if req.color  is not None: p.color  = req.color

    mutate_and_save(_update)
    return next(p for p in get_state().players if p.id == player_id)


@router.delete("/{player_id}")
def delete_player(player_id: str):
    def _delete(s):
        s.players = [p for p in s.players if p.id != player_id]
        if s.activePlayerId == player_id:
            s.activePlayerId = None
    mutate_and_save(_delete)
    return {"ok": True}


@router.post("/active")
def set_active_player(req: SetActivePlayerRequest):
    def _set(s):
        s.activePlayerId = req.id
    mutate_and_save(_set)
    return {"ok": True, "activePlayerId": req.id}


@router.post("/award")
def award_points(req: AwardPointsRequest):
    state = get_state()
    player = next((p for p in state.players if p.id == req.player_id), None)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    def _award(s):
        p = next(p for p in s.players if p.id == req.player_id)
        p.points += req.points
    mutate_and_save(_award)
    return {"ok": True, "newPoints": player.points + req.points}


@router.post("/advance-turn")
def advance_turn():
    """Set the active player to the next one in the list (wraps around)."""
    state = get_state()
    players = state.players
    if not players:
        return {"ok": True, "activePlayerId": None}

    if not state.activePlayerId:
        # No one active — just pick the first player
        next_id = players[0].id
    else:
        current_index = next((i for i, p in enumerate(players) if p.id == state.activePlayerId), None)
        if current_index is None:
            next_id = players[0].id
        else:
            next_id = players[(current_index + 1) % len(players)].id

    def _advance(s):
        s.activePlayerId = next_id
    mutate_and_save(_advance)
    return {"ok": True, "activePlayerId": next_id}


@router.post("/reorder")
def reorder_players(body: dict):
    """Receive an ordered list of player IDs and reorder players to match."""
    ordered_ids: list[str] = body.get("ids", [])
    state = get_state()
    id_to_player = {p.id: p for p in state.players}

    # Build new list in the requested order, ignoring any unknown IDs
    new_order = [id_to_player[pid] for pid in ordered_ids if pid in id_to_player]
    # Append any players not mentioned (safety net)
    mentioned = set(ordered_ids)
    for p in state.players:
        if p.id not in mentioned:
            new_order.append(p)

    def _reorder(s):
        s.players = new_order
    mutate_and_save(_reorder)
    return {"ok": True}