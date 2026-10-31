# backend/app/schemas/activity.py
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class ActivityLogResponse(BaseModel):
    id: int
    document_id: int
    user_id: int
    action: str
    workspace_context: str
    workspace_id: Optional[int] = None
    extra_data: dict = {}
    created_at: datetime
    actor_name: Optional[str] = None
    document_title: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ActivityListResponse(BaseModel):
    items: List[ActivityLogResponse]
    total: int
    page: int
    total_pages: int


class DocumentStatsResponse(BaseModel):
    document_id: int
    view_count: int
    download_count: int
    save_count: int
    share_count: int
    unique_viewers: int
    trending_score: float
    last_activity_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MyStatsResponse(BaseModel):
    total_uploads: int
    total_views: int
    total_downloads: int
    recent_activities: List[ActivityLogResponse]
    activity_by_day: List[dict]
