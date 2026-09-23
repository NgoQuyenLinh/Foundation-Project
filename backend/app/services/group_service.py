import os
import shutil
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.document_tag import document_tags
from app.models.folder import Folder
from app.models.folder_tag import FolderTag
from app.models.tag import Tag
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.utils.checksum import compute_file_checksum


async def get_member_permission(
    db: AsyncSession, workspace_id: int, user_id: int
) -> Optional[str]:
    result = await db.execute(
        select(WorkspaceMember.permission_level).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def require_member(db: AsyncSession, workspace_id: int, user_id: int) -> str:
    # 1. Truy vấn Workspace để kiểm tra sự tồn tại và Owner
    workspace = await db.get(Workspace, workspace_id)
    if not workspace or workspace.is_deleted or workspace.type != "group":
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")
        
    # 2. Nếu là Owner -> Trả về quyền 'full' ngay lập tức
    if workspace.owner_id == user_id:
        return "full"

    # 3. Nếu không phải Owner -> Kiểm tra bảng WorkspaceMember
    perm = await get_member_permission(db, workspace_id, user_id)
    if perm is None:
        raise HTTPException(status_code=403, detail="Bạn không phải thành viên của nhóm này")
        
    return perm


async def require_full_permission(db: AsyncSession, workspace_id: int, user_id: int) -> None:
    perm = await require_member(db, workspace_id, user_id)
    workspace = await db.get(Workspace, workspace_id)
    if not workspace or workspace.is_deleted:
        raise HTTPException(404, "Không tìm thấy nhóm")
    if perm != "full" and workspace.owner_id != user_id:
        raise HTTPException(403, "Bạn không có quyền thực hiện hành động này")
    
async def require_write_permission(db: AsyncSession, workspace_id: int, user_id: int) -> None:
    perm = await require_member(db, workspace_id, user_id)
    workspace = await db.get(Workspace, workspace_id)
    if not workspace or workspace.is_deleted:
        raise HTTPException(404, "Không tìm thấy nhóm")
    # Cho phép nếu là owner, hoặc permission_level là 'write' hoặc 'full'
    if perm not in ["write", "full"] and workspace.owner_id != user_id:
        raise HTTPException(403, "Bạn không có quyền chỉnh sửa/tạo dữ liệu trong nhóm này")


async def require_owner(db: AsyncSession, workspace_id: int, user_id: int) -> Workspace:
    workspace = await db.get(Workspace, workspace_id)
    if not workspace or workspace.is_deleted or workspace.type != "group":
        raise HTTPException(404, "Không tìm thấy nhóm")
    if workspace.owner_id != user_id:
        raise HTTPException(403, "Chỉ chủ nhóm mới có quyền thực hiện")
    return workspace


async def copy_file(src_path: str, dst_dir: str, filename: str) -> str:
    os.makedirs(dst_dir, exist_ok=True)
    unique_name = f"{uuid4().hex}_{filename}"
    dst_path = os.path.join(dst_dir, unique_name)
    shutil.copy2(src_path, dst_path)
    return dst_path


async def _copy_document_tags(db: AsyncSession, source_id: int, target_id: int) -> None:
    tag_result = await db.execute(
        select(document_tags.c.tag_id).where(document_tags.c.document_id == source_id)
    )
    for tag_id in tag_result.scalars().all():
        await db.execute(
            insert(document_tags).values(document_id=target_id, tag_id=tag_id)
        )


async def share_document_to_group(
    db: AsyncSession, document_id: int, workspace_id: int, sharer_id: int
) -> Document:
    src_doc = await db.get(Document, document_id)
    if (
        not src_doc
        or src_doc.owner_id != sharer_id
        or src_doc.workspace_id is not None
        or src_doc.is_deleted
    ):
        raise HTTPException(404, "Không tìm thấy tài liệu")

    dst_dir = f"storage/groups/{workspace_id}"
    new_path = await copy_file(src_doc.file_path, dst_dir, os.path.basename(src_doc.file_path))

    new_doc = Document(
        owner_id=sharer_id,
        workspace_id=workspace_id,
        source_document_id=src_doc.id,
        title=src_doc.title,
        description=src_doc.description,
        category_id=src_doc.category_id,
        file_path=new_path,
        thumbnail_path=src_doc.thumbnail_path,
        file_type=src_doc.file_type,
        file_size=src_doc.file_size,
        checksum=compute_file_checksum(new_path),
        content=src_doc.content,
        metadata_=src_doc.metadata_,
    )
    db.add(new_doc)
    await db.flush()
    await _copy_document_tags(db, src_doc.id, new_doc.id)
    await db.commit()
    await db.refresh(new_doc)
    return new_doc


async def save_to_personal(
    db: AsyncSession, document_id: int, workspace_id: int, user_id: int
) -> Document:
    src_doc = await db.get(Document, document_id)
    if not src_doc or src_doc.workspace_id != workspace_id or src_doc.is_deleted:
        raise HTTPException(404, "Không tìm thấy tài liệu")

    dst_dir = f"storage/personal/{user_id}/from_group"
    new_path = await copy_file(src_doc.file_path, dst_dir, os.path.basename(src_doc.file_path))

    new_doc = Document(
        owner_id=user_id,
        workspace_id=None,
        source_document_id=src_doc.id,
        title=src_doc.title,
        description=src_doc.description,
        category_id=src_doc.category_id,
        file_path=new_path,
        thumbnail_path=src_doc.thumbnail_path,
        file_type=src_doc.file_type,
        file_size=src_doc.file_size,
        checksum=compute_file_checksum(new_path),
        content=src_doc.content,
        metadata_=src_doc.metadata_,
    )
    db.add(new_doc)
    await db.flush()

    tags_result = await db.execute(
        select(Tag)
        .join(document_tags, document_tags.c.tag_id == Tag.id)
        .where(document_tags.c.document_id == src_doc.id)
    )
    for src_tag in tags_result.scalars().all():
        existing = await db.execute(
            select(Tag).where(Tag.owner_id == user_id, Tag.name == src_tag.name)
        )
        personal_tag = existing.scalar_one_or_none()
        if not personal_tag:
            personal_tag = Tag(owner_id=user_id, name=src_tag.name, color=src_tag.color)
            db.add(personal_tag)
            await db.flush()
        await db.execute(
            insert(document_tags).values(document_id=new_doc.id, tag_id=personal_tag.id)
        )

    await db.commit()
    await db.refresh(new_doc)
    return new_doc


async def share_folder_to_group(
    db: AsyncSession, folder_id: int, workspace_id: int, sharer_id: int
) -> int:
    folder = await db.get(Folder, folder_id)
    if not folder or folder.owner_id != sharer_id or folder.workspace_id is not None:
        raise HTTPException(404, "Không tìm thấy thư mục")

    tag_ids_result = await db.execute(
        select(FolderTag.tag_id).where(FolderTag.folder_id == folder_id)
    )
    tag_ids = tag_ids_result.scalars().all()
    if not tag_ids:
        return 0

    docs_result = await db.execute(
        select(Document)
        .join(document_tags, document_tags.c.document_id == Document.id)
        .where(
            document_tags.c.tag_id.in_(tag_ids),
            Document.owner_id == sharer_id,
            Document.workspace_id.is_(None),
            Document.is_deleted == False,
        )
        .distinct()
    )
    docs = docs_result.scalars().all()

    for doc in docs:
        await share_document_to_group(db, doc.id, workspace_id, sharer_id)

    group_folder = Folder(
        owner_id=sharer_id,
        workspace_id=workspace_id,
        name=f"{folder.name} (từ người chia sẻ)",
        color=folder.color,
    )
    db.add(group_folder)
    await db.flush()
    for tag_id in tag_ids:
        db.add(FolderTag(folder_id=group_folder.id, tag_id=tag_id))
    await db.commit()
    return len(docs)


async def mark_group_document_deleted(db: AsyncSession, document: Document) -> None:
    now = datetime.utcnow()
    document.is_deleted = True
    document.deleted_at = now
    if document.is_bundle:
        children_result = await db.execute(
            select(Document).where(
                Document.bundle_parent_id == document.id,
                Document.is_deleted == False
            )
        )
        for child in children_result.scalars().all():
            child.is_deleted = True
            child.deleted_at = now
    await db.commit()
