# backend/app/routers/documents.py

import asyncio
import hashlib
import io
import logging
import math
import os
import uuid
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import quote

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import s3_client, settings
from app.core.database import AsyncSessionLocal, get_db
from app.core.dependencies import get_current_user, get_optional_user
from app.core.security import decode_access_token
from app.models.document import Document
from app.models.document_stats import DocumentStats
from app.models.download_log import DownloadLog
from app.models.folder import Folder
from app.models.tag import Tag
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.activity import ActivityListResponse, ActivityLogResponse, DocumentStatsResponse
from app.schemas.document import BatchUploadOut, DocumentOut, DocumentTagsUpdate, DocumentUpdate, PaginatedDocuments
from app.schemas.tag import TagOut
from app.services.document_service import create_document_from_upload, log_activity as _log_activity
from app.constants.activity_actions import ActivityAction
from app.services.file_service import (
    checksum_for_file,
    download_file_from_r2,
    download_r2_to_temp_file,
    get_file_url,
    get_r2_key_from_path,
    safe_remove as _safe_remove,
    save_upload_file,
    upload_bytes_to_r2,
)
from app.services.file_processor import (
    create_thumbnail,
    extract_first_image_from_markdown,
    extract_text,
    generate_markdown,
)
from app.services.folder_service import get_documents_by_folder

router = APIRouter(prefix="/documents", tags=["documents"])


class AddFromPersonalPayload(BaseModel):
    document_ids: list[int] = []


async def _process_document_background(doc_id: int, file_path: str, mime_type: str):
    """Chạy nền: extract text + tạo thumbnail + generate markdown, hỗ trợ file lưu trên Cloudflare R2"""
    async with AsyncSessionLocal() as db:
        temp_file = None
        try:
            doc = await db.get(Document, doc_id)
            if not doc:
                return

            # Nếu tài liệu đã có đầy đủ thumbnail, markdown và content (tái sử dụng từ CAS), bỏ qua xử lý nặng
            if doc.thumbnail_path and doc.markdown_path and doc.content:
                return

            effective_path = file_path
            # Nếu file không tồn tại trên ổ đĩa local, tải tạm thời từ Cloudflare R2 về để xử lý
            if not os.path.exists(effective_path):
                suffix = Path(file_path).suffix or (Path(doc.title).suffix if doc.title else "")
                temp_file = download_r2_to_temp_file(file_path, suffix=suffix)
                if temp_file and temp_file.exists():
                    effective_path = str(temp_file)

            loop = asyncio.get_event_loop()
            content = await loop.run_in_executor(
                None, extract_text, effective_path, mime_type
            )
            thumbnail_path = await loop.run_in_executor(
                None, create_thumbnail, effective_path, mime_type, doc_id
            )
            markdown_path = await loop.run_in_executor(
                None, generate_markdown, effective_path, doc_id
            )

            # Chỉ ghi đè content nếu trích xuất được nội dung mới, không xóa trắng nội dung đã có
            if content and content.strip():
                doc.content = content

            if thumbnail_path and os.path.exists(thumbnail_path):
                # Đồng bộ thumbnail lên Cloudflare R2
                try:
                    with open(thumbnail_path, "rb") as f:
                        upload_bytes_to_r2(thumbnail_path, f.read(), "image/jpeg")
                except Exception as up_err:
                    logging.getLogger(__name__).warning(f"Lỗi upload thumbnail lên R2: {up_err}")
                doc.thumbnail_path = thumbnail_path
            elif not doc.thumbnail_path and markdown_path:
                # Nếu không convert được ảnh bìa từ file gốc và doc chưa có thumbnail, lấy ảnh đầu tiên trong markdown
                first_md_img = await loop.run_in_executor(
                    None, extract_first_image_from_markdown, markdown_path, doc_id
                )
                if first_md_img:
                    if os.path.exists(first_md_img):
                        try:
                            with open(first_md_img, "rb") as f:
                                upload_bytes_to_r2(first_md_img, f.read(), "image/jpeg")
                        except Exception:
                            pass
                    doc.thumbnail_path = first_md_img

            if markdown_path and os.path.exists(markdown_path):
                # Đồng bộ markdown lên Cloudflare R2
                try:
                    with open(markdown_path, "rb") as f:
                        upload_bytes_to_r2(markdown_path, f.read(), "text/markdown")
                except Exception as md_err:
                    logging.getLogger(__name__).warning(f"Lỗi upload markdown lên R2: {md_err}")
                doc.markdown_path = markdown_path

            await db.commit()
        except Exception as e:
            logging.getLogger(__name__).error(
                f"Background processing lỗi doc {doc_id}: {e}"
            )
        finally:
            # Xóa file temp sau khi hoàn tất xử lý
            if temp_file and temp_file.exists():
                try:
                    temp_file.unlink()
                except Exception:
                    pass



@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category_id: Optional[int] = Form(None),
    workspace_id: Optional[int] = Form(None),
    tag_ids: list[int] = Form(default=[]),
    thumbnail_path: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        content = None
        from app.services.file_processor import get_file_group
        if get_file_group(file.content_type or "", file.filename or "") == "text":
            file_bytes = await file.read()
            content = file_bytes.decode('utf-8', errors='replace')
            await file.seek(0)
            
        document = await create_document_from_upload(
            db,
            upload=file,
            owner_id=current_user.id,
            title=title,
            description=description,
            category_id=category_id,
            workspace_id=workspace_id,
            tag_ids=tag_ids,
            thumbnail_path=thumbnail_path,
            content=content,
        )
    except ValueError as exc:
        msg = str(exc)
        if msg.startswith("duplicate_document:"):
            doc_id = msg.split(":")[1]
            raise HTTPException(409, {"code": "DUPLICATE", "document_id": int(doc_id)})
        elif msg.startswith("in_trash:"):
            parts = msg.split(":")
            raise HTTPException(409, {
                "code": "IN_TRASH",
                "document_id": int(parts[1]),
                "title": parts[2] if len(parts) > 2 else "tài liệu này"
            })
        raise

    await db.commit()

    result = await db.execute(
        select(Document)
        .options(selectinload(Document.tags))
        .where(Document.id == document.id)
    )
    document = result.scalar_one_or_none() or document

    background_tasks.add_task(
        _process_document_background,
        document.id,
        document.file_path,
        document.file_type or "",
    )
    background_tasks.add_task(
        _log_activity,
        db,
        document.id,
        current_user.id,
        ActivityAction.UPLOADED,
        "personal",
        None,
        None,
        0,
    )

    return document


@router.post("/upload-batch", response_model=BatchUploadOut, status_code=status.HTTP_201_CREATED)
async def upload_batch_documents(
    background_tasks: BackgroundTasks,
    bundle_title: str = Form(...),
    bundle_description: Optional[str] = Form(None),
    tag_ids: str = Form(""),
    category_id: Optional[int] = Form(None),
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not bundle_title or not bundle_title.strip():
        raise HTTPException(status_code=400, detail="Tên gói tài liệu không được để trống")
    if not files or len(files) < 1 or len(files) > 10:
        raise HTTPException(status_code=400, detail="Số lượng file phải từ 1 đến 10")

    tag_ids_list = []
    if tag_ids:
        try:
            tag_ids_list = [int(x.strip()) for x in tag_ids.split(",") if x.strip()]
        except ValueError:
            raise HTTPException(status_code=400, detail="tag_ids không hợp lệ")

    saved_file_paths = []
    try:
        tags_list = []
        if tag_ids_list:
            tag_result = await db.execute(
                select(Tag).where(Tag.id.in_(tag_ids_list), Tag.owner_id == current_user.id)
            )
            tags_list = list(tag_result.scalars().all())

        bundle = Document(
            owner_id=current_user.id,
            workspace_id=None,
            category_id=category_id,
            title=bundle_title.strip(),
            description=bundle_description,
            file_path="__bundle__",
            file_type="application/bundle",
            file_size=0,
            checksum="bundle",
            is_bundle=True,
            bundle_parent_id=None,
            is_deleted=False,
            is_public=False,
            tags=tags_list,
        )
        db.add(bundle)
        await db.flush()

        total_size = 0
        skipped = []

        for file in files:
            content = await file.read()
            checksum = hashlib.sha256(content).hexdigest()

            # Kiểm tra trùng trong kho cá nhân (active + trash)
            dup_active = (await db.execute(
                select(Document).where(
                    Document.checksum == checksum,
                    Document.owner_id == current_user.id,
                    Document.workspace_id.is_(None),
                    Document.is_deleted == False,
                )
            )).scalar_one_or_none()

            dup_trash = (await db.execute(
                select(Document).where(
                    Document.checksum == checksum,
                    Document.owner_id == current_user.id,
                    Document.workspace_id.is_(None),
                    Document.is_deleted == True,
                )
            )).scalar_one_or_none()

            if dup_active:
                skipped.append({
                    "filename": file.filename,
                    "reason": "duplicate",
                    "existing_id": dup_active.id
                })
                continue

            if dup_trash:
                skipped.append({
                    "filename": file.filename,
                    "reason": "in_trash",
                    "existing_id": dup_trash.id
                })
                continue

            # Single-Instance Storage: Tái sử dụng file nếu checksum đã có trên hệ thống
            query_storage = select(Document).where(
                Document.checksum == checksum,
                Document.file_path != "__bundle__",
                Document.file_path.is_not(None)
            )
            existing_storage = (await db.execute(query_storage)).scalars().first()

            if existing_storage:
                file_path = existing_storage.file_path
                thumbnail_path = existing_storage.thumbnail_path
                markdown_path = existing_storage.markdown_path
                text_content = existing_storage.content
            else:
                total_size += len(content)
                await file.seek(0)
                file_path = await save_upload_file(file, current_user.id)
                saved_file_paths.append(file_path)
                thumbnail_path = None
                markdown_path = None
                from app.services.file_processor import get_file_group
                text_content = None
                if get_file_group(file.content_type or "", file.filename or "") == "text":
                    text_content = content.decode("utf-8", errors="replace")
            
            child = Document(
                owner_id=current_user.id,
                workspace_id=None,  
                category_id=category_id,
                title=file.filename or "Untitled",
                file_path=file_path,
                thumbnail_path=thumbnail_path,
                markdown_path=markdown_path,
                file_type=file.content_type or "application/octet-stream",
                file_size=len(content),
                checksum=checksum,
                content=text_content,
                is_bundle=False,
                bundle_parent_id=bundle.id,
                is_deleted=False,
                is_public=False,
                tags=tags_list,
            )
            db.add(child)
            await db.flush()
            background_tasks.add_task(
                _process_document_background,
                child.id,
                child.file_path,
                child.file_type or "",
            )
            background_tasks.add_task(
                _log_activity,
                db,
                child.id,
                current_user.id,
                ActivityAction.UPLOADED,
                "personal",
                None,
                None,
                0,
            )

        bundle.file_size = total_size

        await db.commit()

        result = await db.execute(
            select(Document)
            .options(
                selectinload(Document.tags),
                selectinload(Document.owner),
            )
            .where(Document.id == bundle.id)
        )
        fresh_bundle = result.scalar_one()

        count_result = await db.execute(
            select(func.count(Document.id)).where(
                Document.bundle_parent_id == bundle.id,
                Document.is_deleted == False,
            )
        )
        bundle_out = DocumentOut.model_validate(fresh_bundle)
        bundle_out.bundle_children_count = count_result.scalar() or 0
        return {
            "bundle": bundle_out,
            "skipped": skipped,
        }
    except Exception as e:
        await db.rollback()
        for p in saved_file_paths:
            _safe_remove(p)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Lỗi khi tải lên gói tài liệu: {str(e)}")


@router.get("/{doc_id}/children", response_model=list[DocumentOut])
async def get_bundle_children(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bundle = await db.get(Document, doc_id)
    if not bundle or bundle.owner_id != current_user.id or not bundle.is_bundle or bundle.is_deleted:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói tài liệu")

    result = await db.execute(
        select(Document)
        .options(
            selectinload(Document.tags),
            selectinload(Document.owner),
        )
        .where(
            Document.bundle_parent_id == doc_id,
            Document.is_deleted == False,
        )
        .order_by(Document.created_at.asc())
    )
    return result.scalars().all()


@router.get("/", response_model=PaginatedDocuments)
async def list_documents(
    workspace_id: Optional[int] = Query(None),
    folder_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if folder_id is not None:
        folder = await db.get(Folder, folder_id)
        if not folder or folder.owner_id != current_user.id:
            raise HTTPException(status_code=404, detail="Không tìm thấy thư mục")
        folder_docs = await get_documents_by_folder(
            db, current_user.id, folder_id, page, page_size, workspace_id=folder.workspace_id
        )
        items = folder_docs["items"]
        bundle_ids = [d.id for d in items if getattr(d, "is_bundle", False)]
        counts_map = {}
        if bundle_ids:
            counts_res = await db.execute(
                select(Document.bundle_parent_id, func.count(Document.id))
                .where(Document.bundle_parent_id.in_(bundle_ids), Document.is_deleted == False)
                .group_by(Document.bundle_parent_id)
            )
            counts_map = dict(counts_res.all())
        items_out = []
        for doc in items:
            doc_out = DocumentOut.model_validate(doc)
            if doc.is_bundle:
                doc_out.bundle_children_count = counts_map.get(doc.id, 0)
            items_out.append(doc_out)
        return {
            "items": items_out,
            "total": folder_docs["total"],
            "page": folder_docs["page"],
            "page_size": folder_docs["page_size"],
            "total_pages": folder_docs["total_pages"],
        }

    offset = (page - 1) * page_size

    # Đã thêm Document.is_public == False để ngăn lấy tài liệu công khai đã được approve
    query = (
        select(Document)
        .options(selectinload(Document.tags))
        .where(
            Document.owner_id == current_user.id,
            Document.is_deleted == False,
            Document.is_public == False,
            Document.bundle_parent_id.is_(None),
        )
    )
    if workspace_id is not None:
        query = query.where(Document.workspace_id == workspace_id)
    else:
        query = query.where(Document.workspace_id.is_(None))

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0

    query = query.order_by(Document.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    bundle_ids = [d.id for d in items if d.is_bundle]
    counts_map = {}
    if bundle_ids:
        counts_res = await db.execute(
            select(Document.bundle_parent_id, func.count(Document.id))
            .where(Document.bundle_parent_id.in_(bundle_ids), Document.is_deleted == False)
            .group_by(Document.bundle_parent_id)
        )
        counts_map = dict(counts_res.all())

    items_out = []
    for doc in items:
        doc_out = DocumentOut.model_validate(doc)
        if doc.is_bundle:
            doc_out.bundle_children_count = counts_map.get(doc.id, 0)
        items_out.append(doc_out)

    return {
        "items": items_out,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size else 1,
    }


@router.get("/file-types", response_model=list[str])
async def get_document_file_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document.file_type)
        .where(
            Document.owner_id == current_user.id,
            Document.workspace_id.is_(None),
            Document.is_deleted == False,
            Document.is_public == False,
            Document.file_type.is_not(None),
        )
        .distinct()
        .order_by(Document.file_type)
    )

    return result.scalars().all()


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    include_deleted: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Document)
        .options(selectinload(Document.tags))
        .where(
            Document.id == document_id,
        )
    )
    if not include_deleted:
        query = query.where(Document.is_deleted == False)

    result = await db.execute(query)
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    # Kiểm tra quyền: chủ sở hữu, tài liệu công khai, hoặc thành viên workspace
    if document.owner_id != current_user.id and not document.is_public:
        if document.workspace_id:
            from app.services.group_service import require_member
            await require_member(db, document.workspace_id, current_user.id)
        else:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập tài liệu này")


    doc_out = DocumentOut.model_validate(document)
    if document.is_bundle:
        cnt = await db.scalar(
            select(func.count(Document.id)).where(
                Document.bundle_parent_id == document.id,
                Document.is_deleted == False,
            )
        )
        doc_out.bundle_children_count = cnt or 0

    background_tasks.add_task(
        _log_activity, db, document_id, current_user.id,
        ActivityAction.VIEWED, "personal", None, None, 30,
    )
    return doc_out


@router.get("/{document_id}/activities", response_model=ActivityListResponse)
async def get_document_activities(
    document_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    action: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = (
        await db.execute(select(Document).where(Document.id == document_id))
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    # Kiểm tra phân quyền:
    # 1. Owner của document
    # 2. Hoặc nếu tài liệu thuộc workspace, current_user là owner của workspace đó
    # 3. Hoặc có log trong nhóm mà current_user là owner của nhóm đó
    has_permission = False
    if doc.owner_id == current_user.id:
        has_permission = True
    elif doc.workspace_id:
        ws = (
            await db.execute(select(Workspace).where(Workspace.id == doc.workspace_id))
        ).scalar_one_or_none()
        if ws and ws.owner_id == current_user.id:
            has_permission = True

    if not has_permission:
        group_ws_check = (
            await db.execute(
                select(Workspace.id)
                .join(DownloadLog, DownloadLog.workspace_id == Workspace.id)
                .where(
                    DownloadLog.document_id == document_id,
                    DownloadLog.workspace_context == "group",
                    Workspace.owner_id == current_user.id,
                )
                .limit(1)
            )
        ).scalar_one_or_none()
        if group_ws_check:
            has_permission = True

    if not has_permission:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem lịch sử tài liệu này")

    base_query = (
        select(DownloadLog, User.full_name, User.username)
        .outerjoin(User, DownloadLog.user_id == User.id)
        .where(DownloadLog.document_id == document_id)
    )
    count_query = (
        select(func.count(DownloadLog.id))
        .where(DownloadLog.document_id == document_id)
    )

    if action:
        base_query = base_query.where(DownloadLog.action == action)
        count_query = count_query.where(DownloadLog.action == action)

    total = (await db.execute(count_query)).scalar() or 0

    items_query = (
        base_query
        .order_by(DownloadLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(items_query)).all()

    items = [
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
            document_title=doc.title,
        )
        for log, full_name, username in rows
    ]

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return ActivityListResponse(
        items=items,
        total=total,
        page=page,
        total_pages=total_pages,
    )


@router.get("/{document_id}/stats", response_model=DocumentStatsResponse)
async def get_document_stats_endpoint(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = (
        await db.execute(select(Document).where(Document.id == document_id))
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    stats = (
        await db.execute(select(DocumentStats).where(DocumentStats.document_id == document_id))
    ).scalar_one_or_none()

    if not stats:
        return DocumentStatsResponse(
            document_id=document_id,
            view_count=0,
            download_count=0,
            save_count=0,
            share_count=0,
            unique_viewers=0,
            trending_score=0.0,
            last_activity_at=None,
        )
    return DocumentStatsResponse.model_validate(stats)


@router.get("/{document_id}/file")
async def get_document_file(
    document_id: int,
    background_tasks: BackgroundTasks,
    download: bool = Query(False),
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    bearer_user: Optional[User] = Depends(get_optional_user),
):
    current_user = bearer_user
    if not current_user and token:
        payload = decode_access_token(token)
        if payload and payload.get("sub"):
            try:
                res = await db.execute(select(User).where(User.id == int(payload["sub"])))
                current_user = res.scalar_one_or_none()
            except Exception:
                pass

    doc = await db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    # Kiểm tra quyền truy cập: chủ sở hữu, tài liệu công khai, hoặc thành viên nhóm
    if not doc.is_public:
        if not current_user:
            raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để truy cập tài liệu")
        if doc.owner_id != current_user.id:
            if doc.workspace_id:
                from app.services.group_service import require_member
                await require_member(db, doc.workspace_id, current_user.id)
            else:
                raise HTTPException(status_code=403, detail="Không có quyền truy cập tài liệu này")

    file_path = doc.file_path
    if not file_path:
        raise HTTPException(status_code=404, detail="Tài liệu không có tệp tin đính kèm")

    filename = doc.title
    ext = Path(file_path).suffix
    if ext and not filename.endswith(ext):
        filename = f"{filename}{ext}"

    disposition = "attachment" if download else "inline"
    encoded_filename = quote(filename)

    if current_user:
        act = ActivityAction.DOWNLOADED if download else ActivityAction.VIEWED
        w_ctx = "group" if doc.workspace_id else "personal"
        dedup = 0 if download else 30
        background_tasks.add_task(
            _log_activity, db, document_id, current_user.id,
            act, w_ctx, doc.workspace_id, None, dedup,
        )

    # 1. Thử đọc từ local disk
    if os.path.exists(file_path):
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type=doc.file_type or "application/octet-stream",
            content_disposition_type=disposition,
        )

    # 2. Thử lấy từ Cloudflare R2 / S3 nếu có cấu hình
    if s3_client and settings.BUCKET_NAME:
        key = file_path
        if key.startswith("http://") or key.startswith("https://"):
            if "/storage/" in key:
                key = "storage/" + key.split("/storage/", 1)[1]
            else:
                key = key.split("/", 3)[-1]

        try:
            s3_obj = s3_client.get_object(Bucket=settings.BUCKET_NAME, Key=key)
            content_type = doc.file_type or s3_obj.get("ContentType") or "application/octet-stream"

            def iterfile():
                for chunk in s3_obj["Body"].iter_chunks(chunk_size=64 * 1024):
                    yield chunk

            headers = {
                "Content-Disposition": f"{disposition}; filename*=UTF-8''{encoded_filename}",
                "Access-Control-Allow-Origin": "*",
            }
            if s3_obj.get("ContentLength"):
                headers["Content-Length"] = str(s3_obj["ContentLength"])

            return StreamingResponse(
                iterfile(),
                media_type=content_type,
                headers=headers,
            )
        except Exception as e:
            logging.warning(f"Không thể đọc file từ R2 ({key}): {e}")

    raise HTTPException(status_code=404, detail="Tệp tin không tồn tại trên hệ thống lưu trữ")



@router.get("/{document_id}/raw")
async def get_document_raw(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document)
        .where(
            Document.id == document_id,
            Document.is_deleted == False,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    
    # Kiểm tra quyền truy cập: chủ sở hữu, tài liệu công khai, hoặc thành viên nhóm
    if document.owner_id != current_user.id and not document.is_public:
        if document.workspace_id:
            from app.services.group_service import require_member
            await require_member(db, document.workspace_id, current_user.id)
        else:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập tài liệu này")

    content = document.content
    if not content:
        # Fallback 1: đọc trực tiếp file nếu tồn tại trên ổ đĩa local
        if document.file_path and os.path.exists(document.file_path):
            try:
                with open(document.file_path, "rb") as f:
                    content = f.read().decode('utf-8', errors='replace')
            except Exception as read_err:
                logging.warning(f"Lỗi đọc file local ({document.file_path}): {read_err}")

        # Fallback 2: đọc từ Cloudflare R2
        if not content and document.file_path:
            file_bytes = download_file_from_r2(document.file_path)
            if file_bytes is not None:
                content = file_bytes.decode('utf-8', errors='replace')
                # Cache lại vào database để các lần sau không cần gọi lại R2
                document.content = content
                try:
                    await db.commit()
                except Exception:
                    pass

    if not content:
        raise HTTPException(status_code=404, detail="Tài liệu không có nội dung text")

    return StreamingResponse(
        io.StringIO(content),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'inline; filename="{document.title}"'}
    )


@router.get("/{document_id}/tags", response_model=list[TagOut])
async def get_document_tags(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.tags))
        .where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == False,
            Document.is_public == False,
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài liệu",
        )

    return document.tags


@router.patch("/{document_id}", response_model=DocumentOut)
async def update_document(
    document_id: int,
    payload: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == False,
            Document.is_public == False,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(document, key, value)

    await db.commit()
    await db.refresh(document)
    return document


@router.patch("/{document_id}/tags", response_model=DocumentOut)
async def update_document_tags(
    document_id: int,
    payload: DocumentTagsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == False,
            Document.is_public == False,
        )
    )

    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy tài liệu",
        )

    tag_ids = list(set(payload.tag_ids))

    if not tag_ids:
        tags = []
        document.tags = []
    else:
        result = await db.execute(
            select(Tag).where(
                Tag.id.in_(tag_ids)
            )
        )

        tags = list(result.scalars().all())

        found_tag_ids = {tag.id for tag in tags}

        missing_tag_ids = [
            tag_id
            for tag_id in tag_ids
            if tag_id not in found_tag_ids
        ]

        if missing_tag_ids:
            raise HTTPException(
                status_code=404,
                detail=f"Không tìm thấy tag: {missing_tag_ids}",
            )

        document.tags = tags

    if document.is_bundle:
        children_result = await db.execute(
            select(Document)
            .options(selectinload(Document.tags))
            .where(
                Document.bundle_parent_id == document_id,
                Document.is_deleted == False,
            )
        )
        for child in children_result.scalars().all():
            child.tags = tags

    await db.commit()
    await db.refresh(document)

    return document


@router.post("/{bundle_id}/add-files", response_model=list[DocumentOut], status_code=status.HTTP_201_CREATED)
async def add_files_to_bundle(
    bundle_id: int,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.tags))
        .where(
            Document.id == bundle_id,
            Document.owner_id == current_user.id,
            Document.is_bundle == True,
            Document.is_deleted == False,
            Document.is_public == False,
        )
    )
    bundle = result.scalar_one_or_none()
    if not bundle:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói tài liệu")

    if not files or len(files) < 1:
        raise HTTPException(status_code=400, detail="Phải chọn ít nhất 1 file")

    bundle_tags = list(bundle.tags)
    saved_paths = []
    new_children = []
    added_size = 0

    try:
        for file in files:
            content = await file.read()
            await file.seek(0)
            added_size += len(content)
            checksum = checksum_for_file(content)

            file_path = await save_upload_file(file, current_user.id)
            saved_paths.append(file_path)

            from app.services.file_processor import get_file_group
            text_content = None
            if get_file_group(file.content_type or "", file.filename or "") == "text":
                text_content = content.decode("utf-8", errors="replace")

            child = Document(
                owner_id=current_user.id,
                workspace_id=None,
                title=file.filename or "Untitled",
                file_path=file_path,
                file_type=file.content_type or "application/octet-stream",
                file_size=len(content),
                checksum=checksum,
                content=text_content,
                is_bundle=False,
                bundle_parent_id=bundle_id,
                is_deleted=False,
                is_public=False,
                tags=bundle_tags,
            )
            db.add(child)
            new_children.append(child)
            background_tasks.add_task(
                _process_document_background,
                child.id,
                child.file_path,
                child.file_type or "",
            )
            background_tasks.add_task(
                _log_activity,
                db,
                child.id,
                current_user.id,
                ActivityAction.UPLOADED,
                "personal",
                None,
                None,
                0,
            )

        bundle.file_size = (bundle.file_size or 0) + added_size
        await db.commit()

        result = await db.execute(
            select(Document)
            .options(selectinload(Document.tags), selectinload(Document.owner))
            .where(Document.bundle_parent_id == bundle_id, Document.is_deleted == False)
            .order_by(Document.created_at.desc())
            .limit(len(files))
        )
        return result.scalars().all()

    except Exception as e:
        await db.rollback()
        for p in saved_paths:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Lỗi khi thêm file vào gói: {str(e)}")


@router.post("/{bundle_id}/add-from-personal", status_code=status.HTTP_200_OK)
async def add_from_personal_to_bundle(
    bundle_id: int,
    payload: AddFromPersonalPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.tags))
        .where(
            Document.id == bundle_id,
            Document.owner_id == current_user.id,
            Document.is_bundle == True,
            Document.is_deleted == False,
            Document.is_public == False,
        )
    )
    bundle = result.scalar_one_or_none()
    if not bundle:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói tài liệu")

    bundle_tags = list(bundle.tags)
    added_count = 0
    added_size = 0

    for doc_id in payload.document_ids:
        doc_result = await db.execute(
            select(Document)
            .options(selectinload(Document.tags))
            .where(
                Document.id == doc_id,
                Document.owner_id == current_user.id,
                Document.is_deleted == False,
                Document.is_public == False,
                Document.is_bundle == False,
                Document.bundle_parent_id.is_(None),
            )
        )
        doc = doc_result.scalar_one_or_none()
        if not doc:
            continue

        doc.bundle_parent_id = bundle_id
        doc.tags = bundle_tags
        added_size += doc.file_size or 0
        added_count += 1

    bundle.file_size = (bundle.file_size or 0) + added_size
    await db.commit()
    return {"added_count": added_count}


@router.get("/{bundle_id}/download-zip")
async def download_bundle_zip(
    bundle_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document)
        .where(
            Document.id == bundle_id,
            Document.owner_id == current_user.id,
            Document.is_bundle == True,
            Document.is_deleted == False,
            Document.is_public == False,
        )
    )
    bundle = result.scalar_one_or_none()
    if not bundle:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói tài liệu")

    children_result = await db.execute(
        select(Document)
        .where(
            Document.bundle_parent_id == bundle_id,
            Document.is_deleted == False,
        )
        .order_by(Document.created_at.asc())
    )
    children = children_result.scalars().all()

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for child in children:
            if not child.file_path:
                continue
            fname = child.title
            ext = os.path.splitext(child.file_path)[1]
            if ext and not fname.endswith(ext):
                fname = fname + ext
            if os.path.exists(child.file_path):
                zf.write(child.file_path, arcname=fname)
            else:
                data = download_file_from_r2(child.file_path)
                if data:
                    zf.writestr(fname, data)

    zip_buffer.seek(0)
    safe_name = bundle.title.replace(' ', '_').replace('/', '_')
    background_tasks.add_task(
        _log_activity, db, bundle_id, current_user.id,
        ActivityAction.DOWNLOADED, "personal", None, None, 0,
    )
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={safe_name}.zip"}
    )


@router.post("/{doc_id}/remove-from-bundle", status_code=status.HTTP_200_OK)
async def remove_from_bundle(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document)
        .where(
            Document.id == doc_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == False,
            Document.is_public == False,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    if doc.bundle_parent_id is None:
        raise HTTPException(status_code=400, detail="Tài liệu này không thuộc gói nào")

    bundle = await db.get(Document, doc.bundle_parent_id)
    if bundle:
        bundle.file_size = max(0, (bundle.file_size or 0) - (doc.file_size or 0))

    doc.bundle_parent_id = None
    await db.commit()
    return {"success": True}


@router.post("/{document_id}/thumbnail", response_model=DocumentOut)
async def update_document_thumbnail(
    document_id: int,
    page_number: int = Form(1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.tags))
        .where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == False,
            Document.is_public == False,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    if not document.file_type or "pdf" not in document.file_type.lower():
        raise HTTPException(status_code=400, detail="Tính năng này chỉ hỗ trợ PDF")

    loop = asyncio.get_event_loop()
    effective_path = document.file_path
    temp_file = None
    if not os.path.exists(effective_path):
        temp_file = download_r2_to_temp_file(document.file_path, suffix=".pdf")
        if temp_file and temp_file.exists():
            effective_path = str(temp_file)

    try:
        thumbnail_path = await loop.run_in_executor(
            None, create_thumbnail, effective_path, document.file_type, document.id, page_number
        )
    finally:
        if temp_file and temp_file.exists():
            try:
                temp_file.unlink()
            except Exception:
                pass
    
    if thumbnail_path:
        if os.path.exists(thumbnail_path):
            try:
                with open(thumbnail_path, "rb") as f:
                    upload_bytes_to_r2(thumbnail_path, f.read(), "image/jpeg")
            except Exception as up_err:
                logging.warning(f"Lỗi upload thumbnail lên R2: {up_err}")
        document.thumbnail_path = thumbnail_path
        await db.commit()
        await db.refresh(document)
    else:
        raise HTTPException(status_code=500, detail="Không thể tạo ảnh bìa")
        
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == False,
            Document.is_public == False,
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    now = datetime.utcnow()
    document.is_deleted = True
    document.deleted_at = now

    if document.is_bundle:
        children_result = await db.execute(
            select(Document).where(
                Document.bundle_parent_id == document.id,
                Document.is_deleted == False,
            )
        )
        for child in children_result.scalars().all():
            child.is_deleted = True
            child.deleted_at = now

    await db.commit()

    background_tasks.add_task(
        _log_activity, db, document_id, current_user.id,
        ActivityAction.DELETED, "personal", None, None, 0,
    )


@router.delete("/{document_id}/tags/{tag_id}", response_model=DocumentOut)
async def remove_document_tag(
    document_id: int,
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.tags))
        .where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == False,
            Document.is_public == False,
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài liệu",
        )

    tag_to_remove = next((tag for tag in document.tags if tag.id == tag_id), None)

    if not tag_to_remove:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nhãn dán không tồn tại trong tài liệu này",
        )

    document.tags.remove(tag_to_remove)

    await db.commit()
    await db.refresh(document)

    return document