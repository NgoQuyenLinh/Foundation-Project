# backend/app/schemas/document.py

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.tag import TagOut




class DocumentBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[int] = None
    workspace_id: Optional[int] = None


class DocumentCreate(DocumentBase):
    file_path: Optional[str] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[int] = None
    workspace_id: Optional[int] = None
    is_important: Optional[bool] = None

class DocumentTagsUpdate(BaseModel):
    tag_ids: list[int] = Field(default_factory=list)

class DocumentOwnerOut(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    avatar: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class DocumentOut(DocumentBase):
    id: int
    owner_id: int
    owner: Optional[DocumentOwnerOut] = None
    source_document_id: Optional[int] = None
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    thumbnail_path: Optional[str] = None
    checksum: str
    content: Optional[str] = None
    # Đổi alias thành serialization_alias để Pydantic đọc doc.metadata_ từ ORM
    metadata_: Optional[dict] = Field(default=None, serialization_alias="metadata")
    search_vector: Optional[str] = None
    is_important: bool = False
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    is_orphaned: bool = False
    orphaned_at: Optional[datetime] = None
    trash_source: Optional[str] = None
    trash_group_name: Optional[str] = None
    trash_batch_id: Optional[int] = None
    is_bundle: bool = False
    bundle_parent_id: Optional[int] = None
    bundle_children_count: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    tags: list[TagOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class PaginatedDocuments(BaseModel):
    items: list[DocumentOut]
    total: int
    page: int
    page_size: int
    total_pages: int
