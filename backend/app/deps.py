"""Shared dependencies: the singleton carbon engine and repository.

The engine is built lazily and cached. Tests can override these via
`app.dependency_overrides` if needed, but the defaults are offline-safe
(network tiers self-disable / guard with try-except).
"""

from __future__ import annotations

from functools import lru_cache

from fastapi import Depends, Query

from app.carbon.engine import CarbonEngine, build_default_engine
from app.seed import seed_if_empty
from app.store import DEFAULT_USER, Repository, repo

# Anonymous user ids are browser-minted UUIDs (or the shared demo id). Every
# endpoint validates the shape here — defined once — before the value is used
# as a Firestore document path.
USER_ID_PATTERN = r"^[A-Za-z0-9_-]{1,64}$"
UserIdQuery = Query(DEFAULT_USER, pattern=USER_ID_PATTERN)


@lru_cache(maxsize=1)
def get_engine() -> CarbonEngine:
    return build_default_engine()


def get_repo() -> Repository:
    return repo


def get_seeded_repo(
    userId: str = UserIdQuery,
    repo: Repository = Depends(get_repo),
) -> Repository:
    """The repository, with demo receipts seeded for the shared demo identity only.

    Real visitors (anonymous browser UUIDs) start with an empty history and see
    the first-run upload state. Only the fallback `demo-user` identity — used by
    the API docs and the live-preview demo — gets the sample receipts.
    """
    if userId == DEFAULT_USER:
        seed_if_empty(repo, userId)
    return repo
