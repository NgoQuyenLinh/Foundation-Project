# backend/app/routers/documents.py
import asyncio
import hashlib
import io
import logging
import os
import uuid
import zipfile
from datetime import datetime
from typing import Optional

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
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal, get_db
from app.core.dependencies import get_current_user
from app.models.document import Document
from app.models.folder import Folder
from app.models.user import User
from app.schemas.document import DocumentOut, DocumentTagsUpdate, DocumentUpdate, PaginatedDocuments
from app.schemas.tag import TagOut
from app.services.document_service import create_document_from_upload
from app.services.file_processor import create_thumbnail, extract_text
from app.services.folder_service import get_documents_by_folder
from app.models.tag import Tag

router = APIRouter(prefix="/documents", tags=["documents"])


class AddFromPersonalPayload(BaseModel):
    document_ids: list[int] = []


async def _process_document_background(doc_id: int, file_path: str, mime_type: str):
    """Chạy nền: extract text + tạo thumbnail, dùng session riêng"""
    async with AsyncSessionLocal() as db:
        try:
            doc = await db.get(Document, doc_id)
            if not doc:
                return

            loop = asyncio.get_event_loop()
            content = await loop.run_in_executor(
                None, extract_text, file_path, mime_type
            )
            thumbnail_path = await loop.run_in_executor(
                None, create_thumbnail, file_path, mime_type, doc_id
            )

            doc.content = content
            doc.thumbnail_path = thumbnail_path
            await db.commit()
        except Exception as e:
            logging.getLogger(__name__).error(
                f"Background processing lỗi doc {doc_id}: {e}"
            )

@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category_id: Optional[int] = Form(None),
    workspace_id: Optional[int] = Form(None),
    tag_ids: list[int] = Form(default=[]), # <-- Khai báo default=[] để nhận list[int]
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        document = await create_document_from_upload(
            db,
            upload=file,
            owner_id=current_user.id,
            title=title,
            description=description,
            category_id=category_id,
            workspace_id=workspace_id,
            tag_ids=tag_ids, # Pass mảng tag_ids vào service
        )
    except ValueError as exc:
        if str(exc).startswith("duplicate_document:"):
            raise HTTPException(status_code=409, detail="Tài liệu đã tồn tại")
        raise

    await db.commit()

    # Query lại document cùng quan hệ tags để trả về JSON chuẩn
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.tags))
        .where(Document.id == document.id)
    )
    document = result.scalar_one()

    background_tasks.add_task(
        _process_document_background,
        document.id,
        document.file_path,
        document.file_type or "",
    )

    return document


@router.post("/upload-batch", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_batch_documents(
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
            tags=tags_list,
        )
        db.add(bundle)
        await db.flush()

        total_size = 0
        storage_dir = f"storage/personal/{current_user.id}"
        os.makedirs(storage_dir, exist_ok=True)

        for file in files:
            content = await file.read()
            total_size += len(content)
            unique_name = f"{uuid.uuid4().hex}_{file.filename}"
            file_path = f"{storage_dir}/{unique_name}"
            with open(file_path, "wb") as f:
                f.write(content)
            saved_file_paths.append(file_path)

            checksum = hashlib.sha256(content).hexdigest()
            child = Document(
                owner_id=current_user.id,
                workspace_id=None,
                category_id=category_id,
                title=file.filename or "Untitled",
                file_path=file_path,
                file_type=file.content_type or "application/octet-stream",
                file_size=len(content),
                checksum=checksum,
                is_bundle=False,
                bundle_parent_id=bundle.id,
                is_deleted=False,
            )
            db.add(child)
            await db.flush()  # get child.id
            # Gán tags giống bundle cho từng child
            child.tags = tags_list

        bundle.file_size = total_size


        await db.commit()

        # Query lại bundle cùng quan hệ tags & owner để tránh greenlet_spawn error
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
        return bundle_out
    except Exception as e:
        await db.rollback()
        for p in saved_file_paths:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass
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
            db, current_user.id, folder_id, page, page_size
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

    query = (
        select(Document)
        .options(selectinload(Document.tags))
        .where(
            Document.owner_id == current_user.id,
            Document.is_deleted == False,
            Document.bundle_parent_id.is_(None),
        )
    )
    if workspace_id:
        query = query.where(Document.workspace_id == workspace_id)

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
            Document.is_deleted == False,
            Document.file_type.is_not(None),
        )
        .distinct()
        .order_by(Document.file_type)
    )

    return result.scalars().all()


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(
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
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    doc_out = DocumentOut.model_validate(document)
    if document.is_bundle:
        cnt = await db.scalar(
            select(func.count(Document.id)).where(
                Document.bundle_parent_id == document.id,
                Document.is_deleted == False
            )
        )
        doc_out.bundle_children_count = cnt or 0
    return doc_out


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
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Không tìm thấy tài liệu"
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
        )
    )

    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy tài liệu"
        )

    # Loại ID trùng
    tag_ids = list(set(payload.tag_ids))

    # Không có tag -> xóa toàn bộ tag
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

        # Kiểm tra tất cả tag có tồn tại
        found_tag_ids = {tag.id for tag in tags}

        missing_tag_ids = [
            tag_id
            for tag_id in tag_ids
            if tag_id not in found_tag_ids
        ]

        if missing_tag_ids:
            raise HTTPException(
                status_code=404,
                detail=f"Không tìm thấy tag: {missing_tag_ids}"
            )

        document.tags = tags

    # Nếu đây là bundle, đồng bộ tags xuống tất cả children
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
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Thêm file mới vào bundle đã tồn tại"""
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.tags))
        .where(
            Document.id == bundle_id,
            Document.owner_id == current_user.id,
            Document.is_bundle == True,
            Document.is_deleted == False,
        )
    )
    bundle = result.scalar_one_or_none()
    if not bundle:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói tài liệu")

    if not files or len(files) < 1:
        raise HTTPException(status_code=400, detail="Phải chọn ít nhất 1 file")

    bundle_tags = list(bundle.tags)
    storage_dir = f"storage/personal/{current_user.id}"
    os.makedirs(storage_dir, exist_ok=True)
    saved_paths = []
    new_children = []
    added_size = 0

    try:
        for file in files:
            content = await file.read()
            unique_name = f"{uuid.uuid4().hex}_{file.filename}"
            file_path = f"{storage_dir}/{unique_name}"
            with open(file_path, "wb") as f:
                f.write(content)
            saved_paths.append(file_path)

            checksum = hashlib.sha256(content).hexdigest()
            child = Document(
                owner_id=current_user.id,
                workspace_id=None,
                title=file.filename or "Untitled",
                file_path=file_path,
                file_type=file.content_type or "application/octet-stream",
                file_size=len(content),
                checksum=checksum,
                is_bundle=False,
                bundle_parent_id=bundle_id,
                is_deleted=False,
                tags=bundle_tags,
            )
            db.add(child)
            new_children.append(child)
            added_size += len(content)

        bundle.file_size = (bundle.file_size or 0) + added_size
        await db.commit()

        # Query lại children với tags
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
    """Thêm tài liệu cá nhân chưa thuộc bundle nào vào bundle"""
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.tags))
        .where(
            Document.id == bundle_id,
            Document.owner_id == current_user.id,
            Document.is_bundle == True,
            Document.is_deleted == False,
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
                Document.is_bundle == False,
                Document.bundle_parent_id.is_(None),  # Chưa thuộc bundle nào
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tải xuống tất cả file trong bundle dưới dạng ZIP"""
    result = await db.execute(
        select(Document)
        .where(
            Document.id == bundle_id,
            Document.owner_id == current_user.id,
            Document.is_bundle == True,
            Document.is_deleted == False,
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
            if child.file_path and os.path.exists(child.file_path):
                fname = child.title
                ext = os.path.splitext(child.file_path)[1]
                if ext and not fname.endswith(ext):
                    fname = fname + ext
                zf.write(child.file_path, arcname=fname)

    zip_buffer.seek(0)
    safe_name = bundle.title.replace(' ', '_').replace('/', '_')
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
    """Tách tài liệu khỏi bundle — tài liệu vẫn giữ trong kho cá nhân"""
    result = await db.execute(
        select(Document)
        .where(
            Document.id == doc_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == False,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    if doc.bundle_parent_id is None:
        raise HTTPException(status_code=400, detail="Tài liệu này không thuộc gói nào")

    # Lấy bundle cha để trừ file_size
    bundle = await db.get(Document, doc.bundle_parent_id)
    if bundle:
        bundle.file_size = max(0, (bundle.file_size or 0) - (doc.file_size or 0))

    doc.bundle_parent_id = None
    await db.commit()
    return {"success": True}




@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == False,
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
                Document.is_deleted == False
            )
        )
        for child in children_result.scalars().all():
            child.is_deleted = True
            child.deleted_at = now

    await db.commit()


@router.delete("/{document_id}/tags/{tag_id}", response_model=DocumentOut)
async def remove_document_tag(
    document_id: int,
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Xóa một tag cụ thể khỏi tài liệu
    """
    # 1. Truy vấn document và load sẵn danh sách tags (selectinload)
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.tags))
        .where(
            Document.id == document_id,
            Document.owner_id == current_user.id,
            Document.is_deleted == False,
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Không tìm thấy tài liệu"
        )

    # 2. Kiểm tra xem tag_id có nằm trong danh sách tags của document không
    tag_to_remove = next((tag for tag in document.tags if tag.id == tag_id), None)

    if not tag_to_remove:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nhãn dán không tồn tại trong tài liệu này"
        )

    # 3. Xóa tag khỏi danh sách và commit
    document.tags.remove(tag_to_remove)
    
    await db.commit()
    await db.refresh(document)

    # Trả về document đã được cập nhật danh sách tags mới
    return document

    