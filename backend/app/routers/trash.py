# app/routers/trash.py
import os
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.document import Document
from app.models.user import User
from app.services.file_service import remove_file_if_unreferenced, safe_remove as _safe_remove
from app.services.document_service import log_activity as _log_activity
from app.constants.activity_actions import ActivityAction

router = APIRouter(prefix="/trash", tags=["trash"])


@router.get("/")
async def list_trash(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.owner_id == current_user.id,
            Document.workspace_id.is_(None),
            Document.is_deleted == True
        )
    )
    return result.scalars().all()


@router.post("/{document_id}/restore")
async def restore_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == True
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu trong thùng rác")

    document.is_deleted = False
    document.deleted_at = None
    await db.commit()
    background_tasks.add_task(
        _log_activity, db, document_id, current_user.id,
        ActivityAction.RESTORED, "personal", None, None, 0,
    )
    return {"detail": "Khôi phục tài liệu thành công"}


@router.delete("/{document_id}/purge", status_code=status.HTTP_204_NO_CONTENT)
async def hard_delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == True
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu trong thùng rác")

    # Bảo vệ kho tài liệu cộng đồng: chỉ admin/superadmin mới có thể xóa vĩnh viễn
    if document.is_public and current_user.role not in ["admin", "superadmin", "faculty_admin"]:
        raise HTTPException(status_code=403, detail="Chỉ quản trị viên mới có thể xóa tài liệu trong kho cộng đồng")

    exclude_ids = {document.id}
    children = []
    if document.is_bundle:
        children_result = await db.execute(
            select(Document).where(Document.bundle_parent_id == document.id)
        )
        children = list(children_result.scalars().all())
        exclude_ids.update(c.id for c in children)

    # Nếu document là bundle (is_bundle=True), xóa file của children trước (nếu không còn ai tham chiếu):
    for child in children:
        await remove_file_if_unreferenced(db, child.file_path, exclude_doc_ids=exclude_ids)
        await remove_file_if_unreferenced(db, child.thumbnail_path, exclude_doc_ids=exclude_ids)
        await remove_file_if_unreferenced(db, child.markdown_path, exclude_doc_ids=exclude_ids)
        await db.delete(child)

    await remove_file_if_unreferenced(db, document.file_path, exclude_doc_ids=exclude_ids)
    await remove_file_if_unreferenced(db, document.thumbnail_path, exclude_doc_ids=exclude_ids)
    await remove_file_if_unreferenced(db, document.markdown_path, exclude_doc_ids=exclude_ids)

    await db.delete(document)
    await db.commit()