# app/schemas/search.py
from pydantic import BaseModel
from typing import List, Optional

class SearchResultItem(BaseModel):
    id: int
    type: str  # 'personal_doc', 'group_doc', 'workspace'
    title: str
    subtitle: str
    url: str

class QuickSearchOut(BaseModel):
    items: List[SearchResultItem]

class FullSearchOut(BaseModel):
    items: List[SearchResultItem]
    total: int
    page: int
    page_size: int