# app/routers/search.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.search_service import search_documents

from app.schemas.search import QuickSearchOut, FullSearchOut
from app.services.search_service import SearchService

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/")
async def search(
    q: str = Query(min_length=1),
    workspace_id: int = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await search_documents(
        db,
        owner_id=current_user.id,
        workspace_id=workspace_id,
        query=q,
        limit=limit
    )
    
@router.get("/quick", response_model=QuickSearchOut)
async def quick_search(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = await SearchService.quick_search(db, q, current_user.id)
    return {"items": results}

@router.get("/full", response_model=FullSearchOut)
async def full_text_search(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = await SearchService.full_text_search(db, q, current_user.id, page, page_size)
    return results