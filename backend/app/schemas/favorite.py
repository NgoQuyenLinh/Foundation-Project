# backend/app/schemas/favorite.py
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.document import DocumentOut

ReadingStatus = Literal["to_read", "reading", "completed"]


class FavoriteTagOut(BaseModel):
    id: int
    name: str
    color: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FavoriteTagWithCountOut(BaseModel):
    id: int
    name: str
    color: Optional[str] = None
    document_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class FavoriteTagAdd(BaseModel):
    tag_id: Optional[int] = None
    name: Optional[str] = Field(None, max_length=128)


class FavoriteCreate(BaseModel):
    document_id: int
    reading_status: ReadingStatus = "to_read"
    notes: Optional[str] = Field(None, max_length=5000)
    tag_ids: Optional[list[int]] = None


class FavoriteUpdate(BaseModel):
    reading_status: Optional[ReadingStatus] = None
    notes: Optional[str] = Field(None, max_length=5000)
    tag_ids: Optional[list[int]] = None


class FavoriteOut(BaseModel):
    user_id: int
    document_id: int
    created_at: Optional[datetime] = None
    reading_status: ReadingStatus = "to_read"
    notes: Optional[str] = None
    tags: list[FavoriteTagOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class FavoriteDocumentOwnerOut(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    avatar: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FavoriteDocumentOut(DocumentOut):
    favorited_at: datetime
    reading_status: ReadingStatus = "to_read"
    notes: Optional[str] = None
    favorite_tags: list[FavoriteTagOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# Giữ FavoriteDocumentSummaryOut để tương thích ngược 100%
FavoriteDocumentSummaryOut = FavoriteDocumentOut


class FavoriteListOut(BaseModel):
    items: list[FavoriteDocumentOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class FavoriteStatsOut(BaseModel):
    total: int
    to_read: int
    reading: int
    completed: int
