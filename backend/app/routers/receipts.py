"""Receipt endpoints — the hero flow.

POST /receipts            multipart image -> Gemini parse -> engine -> store
GET  /receipts            list, newest first
GET  /receipts/{id}       single
DELETE /receipts/{id}     remove
POST /receipts/parse-only multipart image -> LineItem[] (no storage)
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.carbon.engine import CarbonEngine
from app.deps import UserIdQuery, get_engine, get_seeded_repo
from app.gemini.client import parse_receipt
from app.models import ParseOnlyResponse, Receipt
from app.pipeline import build_receipt
from app.store import Repository
from app.uploads import read_image_upload

router = APIRouter(prefix="/receipts")


def _guess_mime(upload: UploadFile) -> str:
    return upload.content_type or "image/jpeg"


@router.post("", response_model=Receipt)
async def create_receipt(
    file: UploadFile = File(...),
    merchant: Optional[str] = Form(None, max_length=120),
    userId: str = UserIdQuery,
    engine: CarbonEngine = Depends(get_engine),
    repo: Repository = Depends(get_seeded_repo),
) -> Receipt:
    """Full pipeline: vision parse the receipt image, score it, store it."""
    image_bytes = await read_image_upload(file)
    items = parse_receipt(image_bytes, _guess_mime(file))
    if not items:
        raise HTTPException(
            status_code=422,
            detail="Could not extract any line items from the receipt image.",
        )
    receipt = build_receipt(engine, items, merchant=merchant)
    repo.add_receipt(receipt, userId)
    return receipt


@router.get("", response_model=List[Receipt])
def list_receipts(
    userId: str = UserIdQuery,
    repo: Repository = Depends(get_seeded_repo),
) -> List[Receipt]:
    return repo.list_receipts(userId)


@router.get("/{receipt_id}", response_model=Receipt)
def get_receipt(
    receipt_id: str,
    userId: str = UserIdQuery,
    repo: Repository = Depends(get_seeded_repo),
) -> Receipt:
    receipt = repo.get_receipt(receipt_id, userId)
    if receipt is None:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt


@router.delete("/{receipt_id}")
def delete_receipt(
    receipt_id: str,
    userId: str = UserIdQuery,
    repo: Repository = Depends(get_seeded_repo),
) -> dict:
    if not repo.delete_receipt(receipt_id, userId):
        raise HTTPException(status_code=404, detail="Receipt not found")
    return {"ok": True}


@router.post("/parse-only", response_model=ParseOnlyResponse)
async def parse_only(
    file: UploadFile = File(...),
    merchant: Optional[str] = Form(None),
) -> ParseOnlyResponse:
    """Vision-parse the image to LineItem[] without scoring or storing."""
    image_bytes = await read_image_upload(file)
    items = parse_receipt(image_bytes, _guess_mime(file))
    return ParseOnlyResponse(items=items, merchant=merchant)
