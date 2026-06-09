"""Shared dependencies: the singleton carbon engine and repository.

The engine is built lazily and cached. Tests can override these via
`app.dependency_overrides` if needed, but the defaults are offline-safe
(network tiers self-disable / guard with try-except).
"""
from __future__ import annotations

from functools import lru_cache

from app.carbon.engine import CarbonEngine, build_default_engine
from app.store import repo, Repository


@lru_cache(maxsize=1)
def get_engine() -> CarbonEngine:
    return build_default_engine()


def get_repo() -> Repository:
    return repo
