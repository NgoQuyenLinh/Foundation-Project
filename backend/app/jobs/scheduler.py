import os
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.document import Document
from app.models.document_stats import DocumentStats
from app.models.download_log import DownloadLog
from app.models.workspace import Workspace
from app.models.workspace_invitation import WorkspaceInvitation
from app.models.workspace_member import WorkspaceMember
from app.constants.activity_actions import ActivityAction
from app.services.file_service import remove_file_if_unreferenced, safe_remove as _safe_remove
from app.services.group_service import copy_file

scheduler = AsyncIOScheduler()


async def dissolve_workspace(db: AsyncSession, workspace: Workspace) -> None:
    docs_result = await db.execute(
        select(Document).where(
            Document.workspace_id == workspace.id,
            Document.is_deleted == False,
        )
    )
    docs = docs_result.scalars().all()

    for doc in docs:
        saved_result = await db.execute(
            select(Document).where(
                Document.source_document_id == doc.id,
                Document.workspace_id.is_(None),
            )
        )
        saved_copies = saved_result.scalars().all()

        if saved_copies:
            for copy in saved_copies:
                copy.is_deleted = True
                copy.deleted_at = datetime.utcnow()
                copy.trash_source = "group_dissolved"
                copy.trash_group_name = workspace.name
        else:
            orphan_dir = f"storage/orphaned/{workspace.id}"
            try:
                doc.file_path = await copy_file(
                    doc.file_path,
                    orphan_dir,
                    os.path.basename(doc.file_path),
                )
            except OSError:
                pass
            doc.is_orphaned = True
            doc.orphaned_at = datetime.utcnow()

        doc.is_deleted = True
        doc.deleted_at = datetime.utcnow()

    members = (
        await db.execute(select(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace.id))
    ).scalars().all()
    invitations = (
        await db.execute(select(WorkspaceInvitation).where(WorkspaceInvitation.workspace_id == workspace.id))
    ).scalars().all()
    for member in members:
        await db.delete(member)
    for invitation in invitations:
        await db.delete(invitation)

    workspace.is_deleted = True
    workspace.deleted_at = datetime.utcnow()
    await db.commit()


async def execute_group_dissolution() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Workspace).where(
                Workspace.is_dissolving == True,
                Workspace.dissolve_at <= datetime.utcnow(),
                Workspace.is_deleted == False,
            )
        )
        for workspace in result.scalars().all():
            await dissolve_workspace(db, workspace)


async def cleanup_orphaned_documents() -> None:
    async with AsyncSessionLocal() as db:
        cutoff = datetime.utcnow() - timedelta(days=10)
        result = await db.execute(
            select(Document).where(
                Document.is_orphaned == True,
                Document.orphaned_at < cutoff,
            )
        )
        for doc in result.scalars().all():
            await remove_file_if_unreferenced(db, doc.file_path, exclude_doc_ids={doc.id})
            await remove_file_if_unreferenced(db, doc.thumbnail_path, exclude_doc_ids={doc.id})
            await remove_file_if_unreferenced(db, doc.markdown_path, exclude_doc_ids={doc.id})
            await db.delete(doc)
        await db.commit()


async def cleanup_deleted_documents() -> None:
    async with AsyncSessionLocal() as db:
        cutoff = datetime.utcnow() - timedelta(days=30)
        result = await db.execute(
            select(Document).where(
                Document.is_deleted == True,
                Document.deleted_at < cutoff,
            )
        )
        docs = result.scalars().all()
        for doc in docs:
            exclude_ids = {doc.id}
            if doc.is_bundle:
                children = (await db.execute(
                    select(Document).where(
                        Document.bundle_parent_id == doc.id
                    )
                )).scalars().all()
                exclude_ids.update(c.id for c in children)
                for child in children:
                    await remove_file_if_unreferenced(db, child.file_path, exclude_doc_ids=exclude_ids)
                    await remove_file_if_unreferenced(db, child.thumbnail_path, exclude_doc_ids=exclude_ids)
                    await remove_file_if_unreferenced(db, child.markdown_path, exclude_doc_ids=exclude_ids)
                    await db.delete(child)
            await remove_file_if_unreferenced(db, doc.file_path, exclude_doc_ids=exclude_ids)
            await remove_file_if_unreferenced(db, doc.thumbnail_path, exclude_doc_ids=exclude_ids)
            await remove_file_if_unreferenced(db, doc.markdown_path, exclude_doc_ids=exclude_ids)
            await db.delete(doc)
        await db.commit()


# Alias để tương thích ngược
cleanup_personal_trash = cleanup_deleted_documents


async def refresh_document_stats() -> None:
    """
    Chạy mỗi giờ: tính lại view_count, download_count, save_count,
    share_count, unique_viewers, trending_score cho tất cả document
    có activity trong 48h gần nhất (để không scan toàn bảng).
    """
    async with AsyncSessionLocal() as db:
        now_utc = datetime.now(timezone.utc)
        cutoff = now_utc - timedelta(hours=48)
        result = await db.execute(
            select(DownloadLog.document_id)
            .where(DownloadLog.created_at > cutoff)
            .distinct()
        )
        doc_ids = [row[0] for row in result.all()]

        for doc_id in doc_ids:
            counts = await db.execute(
                select(
                    func.count().filter(DownloadLog.action == ActivityAction.VIEWED).label("views"),
                    func.count().filter(DownloadLog.action == ActivityAction.DOWNLOADED).label("downloads"),
                    func.count().filter(DownloadLog.action == ActivityAction.SAVED).label("saves"),
                    func.count().filter(DownloadLog.action == ActivityAction.SHARED).label("shares"),
                    func.count(func.distinct(DownloadLog.user_id)).filter(
                        DownloadLog.action == ActivityAction.VIEWED
                    ).label("unique_viewers"),
                    func.max(DownloadLog.created_at).label("last_activity"),
                ).where(DownloadLog.document_id == doc_id)
            )
            row = counts.one()

            doc = await db.get(Document, doc_id)
            if not doc:
                continue

            doc_created_at = doc.created_at
            if doc_created_at.tzinfo is None:
                doc_created_at = doc_created_at.replace(tzinfo=timezone.utc)

            age_hours = max((now_utc - doc_created_at).total_seconds() / 3600, 0.001)

            views = row.views or 0
            downloads = row.downloads or 0
            saves = row.saves or 0
            shares = row.shares or 0
            unique_viewers = row.unique_viewers or 0
            last_activity = row.last_activity
            if last_activity and last_activity.tzinfo is None:
                last_activity = last_activity.replace(tzinfo=timezone.utc)

            weighted = views * 1 + downloads * 2 + saves * 3 + shares * 2
            recency = 1.5 if (
                last_activity
                and last_activity > now_utc - timedelta(hours=24)
            ) else 1.0
            score = (weighted / ((age_hours + 2) ** 1.5)) * recency

            stmt = insert(DocumentStats).values(
                document_id=doc_id,
                view_count=views,
                download_count=downloads,
                save_count=saves,
                share_count=shares,
                unique_viewers=unique_viewers,
                trending_score=score,
                last_activity_at=last_activity,
                updated_at=now_utc,
            ).on_conflict_do_update(
                index_elements=["document_id"],
                set_=dict(
                    view_count=views,
                    download_count=downloads,
                    save_count=saves,
                    share_count=shares,
                    unique_viewers=unique_viewers,
                    trending_score=score,
                    last_activity_at=last_activity,
                    updated_at=now_utc,
                ),
            )
            await db.execute(stmt)

        await db.commit()


def register_jobs() -> None:
    scheduler.add_job(execute_group_dissolution, CronTrigger(minute="*/5"))
    scheduler.add_job(cleanup_orphaned_documents, CronTrigger(hour=0, minute=0))
    scheduler.add_job(cleanup_deleted_documents, CronTrigger(hour=0, minute=10))
    scheduler.add_job(
        refresh_document_stats,
        CronTrigger(minute=0),
        id="refresh_document_stats",
        replace_existing=True,
    )
