import json
import os
from pathlib import Path
from models import GameStateModel

DATA_DIR  = Path(__file__).parent / "data"
DATA_FILE = DATA_DIR / "state.json"

DATA_DIR.mkdir(exist_ok=True)


def load_state() -> GameStateModel:
    """Load game state from disk, or return a fresh state if file doesn't exist."""
    if DATA_FILE.exists():
        try:
            raw = DATA_FILE.read_text(encoding="utf-8")
            state = GameStateModel.model_validate_json(raw)
            # Migration: if any player has a colorIndex but the color is still
            # the default, the model_post_init already fixed it in memory.
            # Re-save so the JSON reflects the migrated color field.
            _needs_migration = any(
                '"colorIndex"' in raw and '"color"' not in raw
                for _ in [1]  # single-iteration trick
            )
            if _needs_migration:
                save_state(state)
            return state
        except Exception:
            pass
    return GameStateModel()


def save_state(state: GameStateModel) -> None:
    """Persist game state to disk as pretty-printed JSON."""
    DATA_FILE.write_text(
        state.model_dump_json(indent=2),
        encoding="utf-8"
    )


# ── Singleton in-memory state ─────────────────────────────────────────────────
# Loaded once on startup; every route mutates this object then calls save_state.
_state: GameStateModel = load_state()


def get_state() -> GameStateModel:
    return _state


def mutate_and_save(fn) -> GameStateModel:
    """
    Helper: call fn(_state), then persist and return the updated state.
    fn should mutate _state in place.
    """
    fn(_state)
    save_state(_state)
    return _state