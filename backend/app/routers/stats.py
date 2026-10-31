# backend/app/routers/stats.py
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.activity_actions import ActivityAction
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.document import Document
from app.models.download_log import DownloadLog
from app.models.user import User
from app.schemas.activity import ActivityLogResponse, MyStatsResponse

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/me", response_model=MyStatsResponse)
async def get_my_stats(
    scope: str = Query("me", pattern="^(me|my_documents)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Thống kê tổng quan cho người dùng:
    - scope="me" (mặc định): Thống kê hoạt động của bản thân user (tài liệu đã tải lên, số lượt xem, số lượt tải của tôi)
    - scope="my_documents": Thống kê tương tác của người khác trên các tài liệu do user tải lên
    """
    # 1. Total uploads (active documents owned by current_user)
    total_uploads = (
        await db.execute(
            select(func.count(Document.id)).where(
                Document.owner_id == current_user.id,
                Document.is_deleted == False,
            )
        )
    ).scalar() or 0

    # 2. Total views & downloads
    if scope == "my_documents":
        total_views = (
            await db.execute(
                select(func.count(DownloadLog.id))
                .join(Document, DownloadLog.document_id == Document.id)
                .where(
                    Document.owner_id == current_user.id,
                    DownloadLog.action.in_([ActivityAction.VIEWED, "view"]),
                )
            )
        ).scalar() or 0

        total_downloads = (
            await db.execute(
                select(func.count(DownloadLog.id))
                .join(Document, DownloadLog.document_id == Document.id)
                .where(
                    Document.owner_id == current_user.id,
                    DownloadLog.action.in_([ActivityAction.DOWNLOADED, "download"]),
                )
            )
        ).scalar() or 0
    else:
        total_views = (
            await db.execute(
                select(func.count(DownloadLog.id)).where(
                    DownloadLog.user_id == current_user.id,
                    DownloadLog.action.in_([ActivityAction.VIEWED, "view"]),
                )
            )
        ).scalar() or 0

        total_downloads = (
            await db.execute(
                select(func.count(DownloadLog.id)).where(
                    DownloadLog.user_id == current_user.id,
                    DownloadLog.action.in_([ActivityAction.DOWNLOADED, "download"]),
                )
            )
        ).scalar() or 0

    # 3. Recent 20 activities
    recent_query = (
        select(DownloadLog, User.full_name, User.username, Document.title)
        .outerjoin(User, DownloadLog.user_id == User.id)
        .outerjoin(Document, DownloadLog.document_id == Document.id)
    )
    if scope == "my_documents":
        recent_query = recent_query.where(Document.owner_id == current_user.id)
    else:
        recent_query = recent_query.where(DownloadLog.user_id == current_user.id)

    recent_query = recent_query.order_by(DownloadLog.created_at.desc()).limit(20)
    recent_rows = (await db.execute(recent_query)).all()

    recent_activities = [
        ActivityLogResponse(
            id=log.id,
            document_id=log.document_id,
            user_id=log.user_id,
            action=log.action,
            workspace_context=log.workspace_context,
            workspace_id=log.workspace_id,
            extra_data=log.extra_data or {},
            created_at=log.created_at,
            actor_name=full_name or username or "Unknown",
            document_title=doc_title,
        )
        for log, full_name, username, doc_title in recent_rows
    ]

    # 4. Activity by day (last 30 days)
    now = datetime.now(timezone.utc)
    start_date = (now - timedelta(days=29)).date()

    by_day_query = (
        select(
            func.date(DownloadLog.created_at).label("log_date"),
            func.count(DownloadLog.id).label("count"),
        )
    )
    if scope == "my_documents":
        by_day_query = by_day_query.join(Document, DownloadLog.document_id == Document.id).where(
            Document.owner_id == current_user.id,
            func.date(DownloadLog.created_at) >= start_date,
        )
    else:
        by_day_query = by_day_query.where(
            DownloadLog.user_id == current_user.id,
            func.date(DownloadLog.created_at) >= start_date,
        )

    by_day_query = by_day_query.group_by(func.date(DownloadLog.created_at))
    by_day_rows = (await db.execute(by_day_query)).all()

    daily_map = {str(r.log_date): r.count for r in by_day_rows}

    activity_by_day = [
        {
            "date": (start_date + timedelta(days=i)).isoformat(),
            "count": daily_map.get((start_date + timedelta(days=i)).isoformat(), 0),
        }
        for i in range(30)
    ]

    return MyStatsResponse(
        total_uploads=total_uploads,
        total_views=total_views,
        total_downloads=total_downloads,
        recent_activities=recent_activities,
        activity_by_day=activity_by_day,
    )
