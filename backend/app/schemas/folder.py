from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

class TagOut(BaseModel):
    id: int
    name: str
    color: Optional[str]
    class Config: from_attributes = True

class FolderOut(BaseModel):
    id: int
    owner_id: int
    workspace_id: Optional[int] = None
    name: str
    color: Optional[str]
    tag_count: int
    document_count: int
    tags: List[TagOut]
    created_at: datetime
    class Config: from_attributes = True

class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    color: Optional[str] = None
    tag_ids: Optional[List[int]] = None
    workspace_id: Optional[int] = None

class FolderUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    color: Optional[str] = None
    tag_ids: Optional[List[int]] = None

class AddTagsToFolder(BaseModel):
    tag_ids: List[int]
