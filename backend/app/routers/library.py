# app/routers/library.py
import os
import shutil
import math
from datetime import datetime
from typing import Optional, List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import FileResponse
from sqlalchemy import select, func, or_, and_, desc, asc, insert, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_optional_user
from app.models.user import User
from app.models.faculty import Faculty
from app.models.subject import Subject
from app.models.document import Document
from app.models.document_rating import DocumentRating
from app.models.community_submission import CommunitySubmission
from app.models.download_log import DownloadLog
from app.models.document_tag import document_tags
from app.models.tag import Tag
from app.models.notification import Notification
from app.utils.checksum import compute_file_checksum
from app.schemas.library import (
    FacultyLibraryOut,
    SubjectOut,
    RatingCreate,
    RatingUpdate,
    RatingOut,
    SubmissionCreate,
    SubmissionOut,
    SubmissionRejectPayload,
    CommunityDocumentOut,
    PaginatedCommunityDocuments,
    PaginatedSubmissions,
)

router = APIRouter(prefix="/library", tags=["Community Library"])


async def copy_file_local(src_path: str, dst_dir: str, filename: str) -> str:
    os.makedirs(dst_dir, exist_ok=True)
    clean_name = os.path.basename(filename)
    unique_name = f"{uuid4().hex}_{clean_name}"
    dst_path = os.path.join(dst_dir, unique_name)
    if os.path.exists(src_path):
        shutil.copy2(src_path, dst_path)
    else:
        # Create empty file if src missing in dev
        with open(dst_path, "wb") as f:
            f.write(b"")
    return dst_path


# ══════════════════════════════════════════════════════════
# 1. PUBLIC ENDPOINTS
# ══════════════════════════════════════════════════════════

@router.get("/faculties/", response_model=List[FacultyLibraryOut])
async def get_faculties(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách khoa kèm số môn và số tài liệu công khai."""
    query = (
        select(
            Faculty.id,
            Faculty.code,
            Faculty.name,
            func.count(func.distinct(Subject.id)).label("subject_count"),
            func.count(
                func.distinct(
                    func.nullif(
                        and_(Document.is_public == True, Document.is_deleted == False),
                        False,
                    )
                )
            ).label("document_count"),
        )
        .outerjoin(Subject, Subject.faculty_id == Faculty.id)
        .outerjoin(
            Document,
            and_(
                Document.subject_id == Subject.id,
                Document.is_public == True,
                Document.is_deleted == False,
            ),
        )
        .group_by(Faculty.id)
        .order_by(Faculty.name.asc())
    )
    result = await db.execute(query)
    rows = result.all()
    return [
        FacultyLibraryOut(
            id=r[0],
            code=r[1],
            name=r[2],
            subject_count=r[3] or 0,
            document_count=r[4] or 0,
        )
        for r in rows
    ]


@router.get("/faculties/{faculty_id}/subjects/", response_model=List[SubjectOut])
async def get_subjects_by_faculty(
    faculty_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Lấy danh sách môn học theo khoa kèm số tài liệu và điểm đánh giá trung bình."""
    # Subquery điểm đánh giá
    ratings_sq = (
        select(
            Document.subject_id,
            func.avg(DocumentRating.stars).label("avg_rating"),
        )
        .join(DocumentRating, DocumentRating.document_id == Document.id)
        .where(Document.is_public == True, Document.is_deleted == False)
        .group_by(Document.subject_id)
        .subquery()
    )

    query = (
        select(
            Subject,
            func.count(
                func.distinct(
                    func.nullif(
                        and_(Document.is_public == True, Document.is_deleted == False),
                        False,
                    )
                )
            ).label("document_count"),
            func.coalesce(ratings_sq.c.avg_rating, 0.0).label("avg_rating"),
        )
        .outerjoin(
            Document,
            and_(
                Document.subject_id == Subject.id,
                Document.is_public == True,
                Document.is_deleted == False,
            ),
        )
        .outerjoin(ratings_sq, ratings_sq.c.subject_id == Subject.id)
        .where(Subject.faculty_id == faculty_id)
        .group_by(Subject.id, ratings_sq.c.avg_rating)
        .order_by(Subject.name.asc())
    )

    result = await db.execute(query)
    rows = result.all()
    subjects_out = []
    for subject, doc_count, avg_rate in rows:
        subjects_out.append(
            SubjectOut(
                id=subject.id,
                faculty_id=subject.faculty_id,
                code=subject.code,
                name=subject.name,
                description=subject.description,
                document_count=doc_count or 0,
                avg_rating=round(float(avg_rate or 0.0), 1),
                created_at=subject.created_at,
            )
        )
    return subjects_out


@router.get("/subjects/{subject_id}/documents/", response_model=PaginatedCommunityDocuments)
async def get_documents_by_subject(
    subject_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    sort: str = Query("newest", regex="^(newest|popular|rating)$"),
    doc_type: Optional[str] = None,
    academic_year: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Lấy danh sách tài liệu công khai thuộc môn học với phân trang, lọc, sắp xếp."""
    # Subquery stats
    rating_sq = (
        select(
            DocumentRating.document_id,
            func.avg(DocumentRating.stars).label("avg_rating"),
            func.count(DocumentRating.id).label("rating_count"),
        )
        .group_by(DocumentRating.document_id)
        .subquery()
    )

    download_sq = (
        select(
            DownloadLog.document_id,
            func.count(DownloadLog.id).label("download_count"),
        )
        .group_by(DownloadLog.document_id)
        .subquery()
    )

    base_filter = [
        Document.is_public == True,
        Document.is_deleted == False,
        Document.subject_id == subject_id,
    ]

    if doc_type and doc_type != "Tất cả":
        base_filter.append(
            func.coalesce(Document.metadata_["doc_type"].astext, "") == doc_type
        )
    if academic_year and academic_year != "Tất cả":
        base_filter.append(
            func.coalesce(Document.metadata_["academic_year"].astext, "") == academic_year
        )

    # Đếm tổng
    count_query = select(func.count(Document.id)).where(and_(*base_filter))
    total = (await db.execute(count_query)).scalar() or 0

    # Main query
    query = (
        select(
            Document,
            Subject.name.label("subject_name"),
            Faculty.id.label("faculty_id"),
            Faculty.name.label("faculty_name"),
            User.full_name.label("user_full_name"),
            User.username.label("username"),
            func.coalesce(rating_sq.c.avg_rating, 0.0).label("rating_avg"),
            func.coalesce(rating_sq.c.rating_count, 0).label("rating_count"),
            func.coalesce(download_sq.c.download_count, 0).label("download_count"),
        )
        .join(Subject, Subject.id == Document.subject_id)
        .join(Faculty, Faculty.id == Subject.faculty_id)
        .join(User, User.id == Document.owner_id)
        .outerjoin(rating_sq, rating_sq.c.document_id == Document.id)
        .outerjoin(download_sq, download_sq.c.document_id == Document.id)
        .where(and_(*base_filter))
    )

    if sort == "popular":
        query = query.order_by(desc("download_count"), desc(Document.created_at))
    elif sort == "rating":
        query = query.order_by(desc("rating_avg"), desc("rating_count"), desc(Document.created_at))
    else:
        query = query.order_by(desc(Document.created_at))

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    rows = result.all()

    items = []
    for doc, subj_name, fac_id, fac_name, full_name, username, r_avg, r_count, d_count in rows:
        meta = doc.metadata_ or {}
        items.append(
            CommunityDocumentOut(
                id=doc.id,
                title=doc.title,
                description=doc.description,
                file_type=doc.file_type,
                file_size=doc.file_size,
                subject_id=doc.subject_id,
                subject_name=subj_name,
                faculty_id=fac_id,
                faculty_name=fac_name,
                doc_type=meta.get("doc_type"),
                academic_year=meta.get("academic_year"),
                owner_id=doc.owner_id,
                contributed_by=full_name or username or "Ẩn danh",
                rating_avg=round(float(r_avg or 0.0), 1),
                rating_count=int(r_count or 0),
                download_count=int(d_count or 0),
                created_at=doc.created_at,
            )
        )

    total_pages = math.ceil(total / page_size) if total > 0 else 1
    return PaginatedCommunityDocuments(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/documents/{document_id}", response_model=CommunityDocumentOut)
async def get_community_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Lấy chi tiết một tài liệu công khai."""
    rating_sq = (
        select(
            DocumentRating.document_id,
            func.avg(DocumentRating.stars).label("avg_rating"),
            func.count(DocumentRating.id).label("rating_count"),
        )
        .where(DocumentRating.document_id == document_id)
        .group_by(DocumentRating.document_id)
        .subquery()
    )

    download_sq = (
        select(
            DownloadLog.document_id,
            func.count(DownloadLog.id).label("download_count"),
        )
        .where(DownloadLog.document_id == document_id)
        .group_by(DownloadLog.document_id)
        .subquery()
    )

    query = (
        select(
            Document,
            Subject.name.label("subject_name"),
            Faculty.id.label("faculty_id"),
            Faculty.name.label("faculty_name"),
            User.full_name.label("user_full_name"),
            User.username.label("username"),
            func.coalesce(rating_sq.c.avg_rating, 0.0).label("rating_avg"),
            func.coalesce(rating_sq.c.rating_count, 0).label("rating_count"),
            func.coalesce(download_sq.c.download_count, 0).label("download_count"),
        )
        .outerjoin(Subject, Subject.id == Document.subject_id)
        .outerjoin(Faculty, Faculty.id == Subject.faculty_id)
        .join(User, User.id == Document.owner_id)
        .outerjoin(rating_sq, rating_sq.c.document_id == Document.id)
        .outerjoin(download_sq, download_sq.c.document_id == Document.id)
        .where(Document.id == document_id, Document.is_public == True, Document.is_deleted == False)
    )

    result = await db.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu trong kho cộng đồng")

    doc, subj_name, fac_id, fac_name, full_name, username, r_avg, r_count, d_count = row
    meta = doc.metadata_ or {}
    return CommunityDocumentOut(
        id=doc.id,
        title=doc.title,
        description=doc.description,
        file_type=doc.file_type,
        file_size=doc.file_size,
        subject_id=doc.subject_id,
        subject_name=subj_name,
        faculty_id=fac_id,
        faculty_name=fac_name,
        doc_type=meta.get("doc_type"),
        academic_year=meta.get("academic_year"),
        owner_id=doc.owner_id,
        contributed_by=full_name or username or "Ẩn danh",
        rating_avg=round(float(r_avg or 0.0), 1),
        rating_count=int(r_count or 0),
        download_count=int(d_count or 0),
        created_at=doc.created_at,
    )


@router.get("/documents/{document_id}/download")
async def download_community_document(
    document_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Tải xuống tài liệu công khai và ghi log."""
    doc = await db.get(Document, document_id)
    if not doc or not doc.is_public or doc.is_deleted:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    # Ghi log nếu người dùng đã đăng nhập
    if current_user:
        ip_addr = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        log_entry = DownloadLog(
            user_id=current_user.id,
            document_id=doc.id,
            ip_address=ip_addr,
            user_agent=user_agent,
        )
        db.add(log_entry)
        await db.commit()

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File vật lý không tồn tại trên hệ thống")

    filename = f"{doc.title}.{doc.file_type}" if doc.file_type and not doc.title.endswith(f".{doc.file_type}") else doc.title
    return FileResponse(
        path=doc.file_path,
        filename=filename,
        media_type="application/octet-stream",
    )


@router.get("/search/", response_model=PaginatedCommunityDocuments)
async def search_community_documents(
    q: Optional[str] = Query(None, description="Từ khóa tìm kiếm"),
    faculty_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    doc_type: Optional[str] = None,
    academic_year: Optional[str] = None,
    sort: str = Query("newest", regex="^(newest|popular|rating)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Tìm kiếm tài liệu trong kho cộng đồng (Full-text search & Filter)."""
    rating_sq = (
        select(
            DocumentRating.document_id,
            func.avg(DocumentRating.stars).label("avg_rating"),
            func.count(DocumentRating.id).label("rating_count"),
        )
        .group_by(DocumentRating.document_id)
        .subquery()
    )

    download_sq = (
        select(
            DownloadLog.document_id,
            func.count(DownloadLog.id).label("download_count"),
        )
        .group_by(DownloadLog.document_id)
        .subquery()
    )

    filters = [
        Document.is_public == True,
        Document.is_deleted == False,
    ]

    if faculty_id:
        filters.append(Subject.faculty_id == faculty_id)
    if subject_id:
        filters.append(Document.subject_id == subject_id)
    if doc_type and doc_type != "Tất cả":
        filters.append(func.coalesce(Document.metadata_["doc_type"].astext, "") == doc_type)
    if academic_year and academic_year != "Tất cả":
        filters.append(func.coalesce(Document.metadata_["academic_year"].astext, "") == academic_year)

    if q and q.strip():
        term = f"%{q.strip()}%"
        filters.append(
            or_(
                Document.title.ilike(term),
                Document.description.ilike(term),
                Document.content.ilike(term),
                Subject.name.ilike(term),
                Subject.code.ilike(term),
                Faculty.name.ilike(term),
            )
        )

    count_query = (
        select(func.count(Document.id))
        .join(Subject, Subject.id == Document.subject_id)
        .join(Faculty, Faculty.id == Subject.faculty_id)
        .where(and_(*filters))
    )
    total = (await db.execute(count_query)).scalar() or 0

    query = (
        select(
            Document,
            Subject.name.label("subject_name"),
            Faculty.id.label("faculty_id"),
            Faculty.name.label("faculty_name"),
            User.full_name.label("user_full_name"),
            User.username.label("username"),
            func.coalesce(rating_sq.c.avg_rating, 0.0).label("rating_avg"),
            func.coalesce(rating_sq.c.rating_count, 0).label("rating_count"),
            func.coalesce(download_sq.c.download_count, 0).label("download_count"),
        )
        .join(Subject, Subject.id == Document.subject_id)
        .join(Faculty, Faculty.id == Subject.faculty_id)
        .join(User, User.id == Document.owner_id)
        .outerjoin(rating_sq, rating_sq.c.document_id == Document.id)
        .outerjoin(download_sq, download_sq.c.document_id == Document.id)
        .where(and_(*filters))
    )

    if sort == "popular":
        query = query.order_by(desc("download_count"), desc(Document.created_at))
    elif sort == "rating":
        query = query.order_by(desc("rating_avg"), desc("rating_count"), desc(Document.created_at))
    else:
        query = query.order_by(desc(Document.created_at))

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    rows = result.all()

    items = []
    for doc, subj_name, fac_id, fac_name, full_name, username, r_avg, r_count, d_count in rows:
        meta = doc.metadata_ or {}
        items.append(
            CommunityDocumentOut(
                id=doc.id,
                title=doc.title,
                description=doc.description,
                file_type=doc.file_type,
                file_size=doc.file_size,
                subject_id=doc.subject_id,
                subject_name=subj_name,
                faculty_id=fac_id,
                faculty_name=fac_name,
                doc_type=meta.get("doc_type"),
                academic_year=meta.get("academic_year"),
                owner_id=doc.owner_id,
                contributed_by=full_name or username or "Ẩn danh",
                rating_avg=round(float(r_avg or 0.0), 1),
                rating_count=int(r_count or 0),
                download_count=int(d_count or 0),
                created_at=doc.created_at,
            )
        )

    total_pages = math.ceil(total / page_size) if total > 0 else 1
    return PaginatedCommunityDocuments(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/documents/{document_id}/ratings/", response_model=List[RatingOut])
async def get_document_ratings(
    document_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Lấy danh sách đánh giá của một tài liệu."""
    query = (
        select(DocumentRating, User.full_name, User.username)
        .join(User, User.id == DocumentRating.user_id)
        .where(DocumentRating.document_id == document_id)
        .order_by(desc(DocumentRating.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    rows = result.all()
    return [
        RatingOut(
            id=r[0].id,
            document_id=r[0].document_id,
            user_id=r[0].user_id,
            user_name=r[1] or r[2] or "Người dùng",
            stars=r[0].stars,
            comment=r[0].comment,
            created_at=r[0].created_at,
            updated_at=r[0].updated_at,
        )
        for r in rows
    ]


# ══════════════════════════════════════════════════════════
# 2. AUTH REQUIRED ENDPOINTS
# ══════════════════════════════════════════════════════════

@router.post("/documents/{document_id}/save-to-personal")
async def save_community_document_to_personal(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lưu tài liệu công khai về kho cá nhân của người dùng."""
    src_doc = await db.get(Document, document_id)
    if not src_doc or not src_doc.is_public or src_doc.is_deleted:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    dst_dir = f"storage/personal/{current_user.id}/from_community"
    new_path = await copy_file_local(src_doc.file_path, dst_dir, os.path.basename(src_doc.file_path))

    new_doc = Document(
        owner_id=current_user.id,
        workspace_id=None,
        source_document_id=src_doc.id,
        is_public=False,
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

    # Sao chép tags
    tags_result = await db.execute(
        select(Tag)
        .join(document_tags, document_tags.c.tag_id == Tag.id)
        .where(document_tags.c.document_id == src_doc.id)
    )
    for src_tag in tags_result.scalars().all():
        existing = await db.execute(
            select(Tag).where(Tag.owner_id == current_user.id, Tag.name == src_tag.name)
        )
        personal_tag = existing.scalar_one_or_none()
        if not personal_tag:
            personal_tag = Tag(owner_id=current_user.id, name=src_tag.name, color=src_tag.color)
            db.add(personal_tag)
            await db.flush()
        await db.execute(
            insert(document_tags).values(document_id=new_doc.id, tag_id=personal_tag.id)
        )

    await db.commit()
    await db.refresh(new_doc)
    return {
        "id": new_doc.id,
        "title": new_doc.title,
        "file_type": new_doc.file_type,
        "message": "Đã lưu tài liệu về kho cá nhân thành công",
    }


@router.post("/documents/{document_id}/ratings/", response_model=RatingOut)
async def create_or_update_rating(
    document_id: int,
    payload: RatingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gửi hoặc cập nhật đánh giá cho tài liệu."""
    doc = await db.get(Document, document_id)
    if not doc or not doc.is_public or doc.is_deleted:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    # Kiểm tra đã có rating của user này chưa
    result = await db.execute(
        select(DocumentRating).where(
            DocumentRating.document_id == document_id,
            DocumentRating.user_id == current_user.id,
        )
    )
    rating = result.scalar_one_or_none()
    if rating:
        rating.stars = payload.stars
        rating.comment = payload.comment
    else:
        rating = DocumentRating(
            document_id=document_id,
            user_id=current_user.id,
            stars=payload.stars,
            comment=payload.comment,
        )
        db.add(rating)

    await db.commit()
    await db.refresh(rating)

    return RatingOut(
        id=rating.id,
        document_id=rating.document_id,
        user_id=rating.user_id,
        user_name=current_user.full_name or current_user.username,
        stars=rating.stars,
        comment=rating.comment,
        created_at=rating.created_at,
        updated_at=rating.updated_at,
    )


@router.put("/documents/{document_id}/ratings/{rating_id}", response_model=RatingOut)
async def update_rating(
    document_id: int,
    rating_id: int,
    payload: RatingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cập nhật đánh giá của chính mình."""
    rating = await db.get(DocumentRating, rating_id)
    if not rating or rating.document_id != document_id:
        raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá")
    if rating.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền sửa đánh giá này")

    if payload.stars is not None:
        rating.stars = payload.stars
    if payload.comment is not None:
        rating.comment = payload.comment

    await db.commit()
    await db.refresh(rating)

    return RatingOut(
        id=rating.id,
        document_id=rating.document_id,
        user_id=rating.user_id,
        user_name=current_user.full_name or current_user.username,
        stars=rating.stars,
        comment=rating.comment,
        created_at=rating.created_at,
        updated_at=rating.updated_at,
    )


@router.delete("/documents/{document_id}/ratings/{rating_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rating(
    document_id: int,
    rating_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Xóa đánh giá của chính mình (hoặc admin xóa)."""
    rating = await db.get(DocumentRating, rating_id)
    if not rating or rating.document_id != document_id:
        raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá")

    is_admin = current_user.role in ["faculty_admin", "school_admin", "system_admin"]
    if rating.user_id != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xóa đánh giá này")

    await db.delete(rating)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/submissions/", response_model=SubmissionOut)
async def submit_document_to_library(
    payload: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gửi yêu cầu đóng góp tài liệu từ kho cá nhân/nhóm vào kho cộng đồng."""
    src_doc = await db.get(Document, payload.source_document_id)
    if not src_doc or src_doc.is_deleted:
        raise HTTPException(status_code=404, detail="Tài liệu nguồn không tồn tại")
    if src_doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bạn chỉ có thể đóng góp tài liệu do bạn sở hữu")

    subject = await db.get(Subject, payload.subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Môn học không tồn tại")

    faculty = await db.get(Faculty, subject.faculty_id)

    submission = CommunitySubmission(
        source_document_id=src_doc.id,
        submitter_id=current_user.id,
        subject_id=subject.id,
        academic_year=payload.academic_year,
        doc_type=payload.doc_type,
        note=payload.note,
        status="pending",
    )
    db.add(submission)
    await db.flush()

    # Tạo thông báo cho faculty_admin của khoa hoặc system_admin
    admins_res = await db.execute(
        select(User).where(
            or_(
                and_(User.role == "faculty_admin", User.faculty_id == subject.faculty_id),
                User.role == "system_admin",
            )
        )
    )
    admins = admins_res.scalars().all()
    for admin in admins:
        notif = Notification(
            user_id=admin.id,
            type="community_submission_received",
            document_id=src_doc.id,
            message=f"Có tài liệu mới chờ duyệt: {src_doc.title}",
        )
        db.add(notif)

    await db.commit()
    await db.refresh(submission)

    return SubmissionOut(
        id=submission.id,
        source_document_id=src_doc.id,
        source_document_title=src_doc.title,
        published_document_id=submission.published_document_id,
        submitter_id=current_user.id,
        submitter_name=current_user.full_name or current_user.username,
        subject_id=subject.id,
        subject_name=subject.name,
        faculty_name=faculty.name if faculty else "Chưa xác định",
        academic_year=submission.academic_year,
        doc_type=submission.doc_type,
        note=submission.note,
        status=submission.status,
        reject_reason=submission.reject_reason,
        reviewed_by=submission.reviewed_by,
        reviewed_at=submission.reviewed_at,
        created_at=submission.created_at,
    )


@router.get("/submissions/my/", response_model=List[SubmissionOut])
async def get_my_submissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy lịch sử đóng góp của người dùng hiện tại."""
    query = (
        select(
            CommunitySubmission,
            Document.title.label("source_doc_title"),
            Subject.name.label("subject_name"),
            Faculty.name.label("faculty_name"),
        )
        .join(Document, Document.id == CommunitySubmission.source_document_id)
        .join(Subject, Subject.id == CommunitySubmission.subject_id)
        .join(Faculty, Faculty.id == Subject.faculty_id)
        .where(CommunitySubmission.submitter_id == current_user.id)
        .order_by(desc(CommunitySubmission.created_at))
    )
    result = await db.execute(query)
    rows = result.all()

    return [
        SubmissionOut(
            id=sub.id,
            source_document_id=sub.source_document_id,
            source_document_title=src_title,
            published_document_id=sub.published_document_id,
            submitter_id=sub.submitter_id,
            submitter_name=current_user.full_name or current_user.username,
            subject_id=sub.subject_id,
            subject_name=subj_name,
            faculty_name=fac_name,
            academic_year=sub.academic_year,
            doc_type=sub.doc_type,
            note=sub.note,
            status=sub.status,
            reject_reason=sub.reject_reason,
            reviewed_by=sub.reviewed_by,
            reviewed_at=sub.reviewed_at,
            created_at=sub.created_at,
        )
        for sub, src_title, subj_name, fac_name in rows
    ]


# ══════════════════════════════════════════════════════════
# 3. ADMIN ENDPOINTS
# ══════════════════════════════════════════════════════════

def check_admin_permission(user: User):
    if user.role not in ["faculty_admin", "school_admin", "system_admin"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền quản trị kho học liệu")


@router.get("/admin/submissions/", response_model=PaginatedSubmissions)
async def get_admin_submissions(
    status: Optional[str] = Query(None, regex="^(pending|approved|rejected)$"),
    subject_id: Optional[int] = None,
    faculty_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Danh sách yêu cầu đóng góp cần duyệt (faculty_admin chỉ xem của khoa mình, system_admin xem tất cả)."""
    check_admin_permission(current_user)

    filters = []
    if current_user.role == "faculty_admin":
        if not current_user.faculty_id:
            raise HTTPException(status_code=403, detail="Tài khoản faculty_admin chưa được gán khoa quản lý")
        filters.append(Subject.faculty_id == current_user.faculty_id)
    elif faculty_id:
        filters.append(Subject.faculty_id == faculty_id)

    if status:
        filters.append(CommunitySubmission.status == status)
    if subject_id:
        filters.append(CommunitySubmission.subject_id == subject_id)

    count_query = (
        select(func.count(CommunitySubmission.id))
        .join(Subject, Subject.id == CommunitySubmission.subject_id)
        .where(and_(*filters) if filters else True)
    )
    total = (await db.execute(count_query)).scalar() or 0

    query = (
        select(
            CommunitySubmission,
            Document.title.label("source_doc_title"),
            Subject.name.label("subject_name"),
            Faculty.name.label("faculty_name"),
            User.full_name.label("submitter_full_name"),
            User.username.label("submitter_username"),
        )
        .join(Document, Document.id == CommunitySubmission.source_document_id)
        .join(Subject, Subject.id == CommunitySubmission.subject_id)
        .join(Faculty, Faculty.id == Subject.faculty_id)
        .join(User, User.id == CommunitySubmission.submitter_id)
        .where(and_(*filters) if filters else True)
        .order_by(desc(CommunitySubmission.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    result = await db.execute(query)
    rows = result.all()

    items = [
        SubmissionOut(
            id=sub.id,
            source_document_id=sub.source_document_id,
            source_document_title=src_title,
            published_document_id=sub.published_document_id,
            submitter_id=sub.submitter_id,
            submitter_name=sub_fname or sub_uname or "Sinh viên",
            subject_id=sub.subject_id,
            subject_name=subj_name,
            faculty_name=fac_name,
            academic_year=sub.academic_year,
            doc_type=sub.doc_type,
            note=sub.note,
            status=sub.status,
            reject_reason=sub.reject_reason,
            reviewed_by=sub.reviewed_by,
            reviewed_at=sub.reviewed_at,
            created_at=sub.created_at,
        )
        for sub, src_title, subj_name, fac_name, sub_fname, sub_uname in rows
    ]

    total_pages = math.ceil(total / page_size) if total > 0 else 1
    return PaginatedSubmissions(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/admin/submissions/{submission_id}", response_model=SubmissionOut)
async def get_admin_submission_detail(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Chi tiết một submission kèm tài liệu gốc."""
    check_admin_permission(current_user)

    query = (
        select(
            CommunitySubmission,
            Document.title.label("source_doc_title"),
            Subject.name.label("subject_name"),
            Faculty.name.label("faculty_name"),
            User.full_name.label("submitter_full_name"),
            User.username.label("submitter_username"),
        )
        .join(Document, Document.id == CommunitySubmission.source_document_id)
        .join(Subject, Subject.id == CommunitySubmission.subject_id)
        .join(Faculty, Faculty.id == Subject.faculty_id)
        .join(User, User.id == CommunitySubmission.submitter_id)
        .where(CommunitySubmission.id == submission_id)
    )
    result = await db.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu đóng góp")

    sub, src_title, subj_name, fac_name, sub_fname, sub_uname = row
    return SubmissionOut(
        id=sub.id,
        source_document_id=sub.source_document_id,
        source_document_title=src_title,
        published_document_id=sub.published_document_id,
        submitter_id=sub.submitter_id,
        submitter_name=sub_fname or sub_uname or "Sinh viên",
        subject_id=sub.subject_id,
        subject_name=subj_name,
        faculty_name=fac_name,
        academic_year=sub.academic_year,
        doc_type=sub.doc_type,
        note=sub.note,
        status=sub.status,
        reject_reason=sub.reject_reason,
        reviewed_by=sub.reviewed_by,
        reviewed_at=sub.reviewed_at,
        created_at=sub.created_at,
    )


@router.post("/admin/submissions/{submission_id}/approve", response_model=SubmissionOut)
async def approve_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Duyệt yêu cầu đóng góp tài liệu vào kho học liệu cộng đồng."""
    check_admin_permission(current_user)

    submission = await db.get(CommunitySubmission, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu đóng góp")

    if submission.status != "pending":
        raise HTTPException(status_code=400, detail=f"Yêu cầu đã ở trạng thái {submission.status}")

    source_doc = await db.get(Document, submission.source_document_id)
    if not source_doc or source_doc.is_deleted:
        raise HTTPException(status_code=404, detail="Tài liệu gốc không tồn tại")

    subject = await db.get(Subject, submission.subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Môn học không tồn tại")
    faculty = await db.get(Faculty, subject.faculty_id)

    # Quyền faculty_admin kiểm tra khoa
    if current_user.role == "faculty_admin" and current_user.faculty_id != subject.faculty_id:
        raise HTTPException(status_code=403, detail="Bạn chỉ có thể duyệt tài liệu thuộc khoa của mình")

    # 1. Copy file vật lý vào storage/community/{faculty_code}/{subject_code}/
    fac_code = faculty.code if faculty else "GENERAL"
    subj_code = subject.code
    dst_dir = f"storage/community/{fac_code}/{subj_code}"
    new_file_path = await copy_file_local(
        source_doc.file_path, dst_dir, os.path.basename(source_doc.file_path)
    )

    # 2. Tạo document công khai mới
    metadata = dict(source_doc.metadata_ or {})
    if submission.doc_type:
        metadata["doc_type"] = submission.doc_type
    if submission.academic_year:
        metadata["academic_year"] = submission.academic_year

    new_doc = Document(
        owner_id=submission.submitter_id,
        workspace_id=None,
        subject_id=subject.id,
        is_public=True,
        source_document_id=source_doc.id,
        title=source_doc.title,
        description=source_doc.description,
        file_path=new_file_path,
        thumbnail_path=source_doc.thumbnail_path,
        file_type=source_doc.file_type,
        file_size=source_doc.file_size,
        checksum=compute_file_checksum(new_file_path),
        content=source_doc.content,
        metadata_=metadata,
    )
    db.add(new_doc)
    await db.flush()

    # Sao chép tags sang document mới
    tags_res = await db.execute(
        select(Tag)
        .join(document_tags, document_tags.c.tag_id == Tag.id)
        .where(document_tags.c.document_id == source_doc.id)
    )
    for tag_item in tags_res.scalars().all():
        await db.execute(
            insert(document_tags).values(document_id=new_doc.id, tag_id=tag_item.id)
        )

    # 3. Cập nhật submission
    submission.status = "approved"
    submission.reviewed_by = current_user.id
    submission.reviewed_at = datetime.utcnow()
    submission.published_document_id = new_doc.id

    # 4. Tạo thông báo cho người đóng góp
    notif = Notification(
        user_id=submission.submitter_id,
        type="community_submission_approved",
        document_id=new_doc.id,
        message=f'Tài liệu "{source_doc.title}" đã được duyệt vào kho học liệu!',
    )
    db.add(notif)

    await db.commit()
    await db.refresh(submission)

    submitter = await db.get(User, submission.submitter_id)

    return SubmissionOut(
        id=submission.id,
        source_document_id=source_doc.id,
        source_document_title=source_doc.title,
        published_document_id=new_doc.id,
        submitter_id=submission.submitter_id,
        submitter_name=(submitter.full_name or submitter.username) if submitter else "Người dùng",
        subject_id=subject.id,
        subject_name=subject.name,
        faculty_name=faculty.name if faculty else "Chưa xác định",
        academic_year=submission.academic_year,
        doc_type=submission.doc_type,
        note=submission.note,
        status=submission.status,
        reject_reason=submission.reject_reason,
        reviewed_by=submission.reviewed_by,
        reviewed_at=submission.reviewed_at,
        created_at=submission.created_at,
    )


@router.post("/admin/submissions/{submission_id}/reject", response_model=SubmissionOut)
async def reject_submission(
    submission_id: int,
    payload: SubmissionRejectPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Từ chối yêu cầu đóng góp tài liệu."""
    check_admin_permission(current_user)

    submission = await db.get(CommunitySubmission, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu đóng góp")

    if submission.status != "pending":
        raise HTTPException(status_code=400, detail=f"Yêu cầu đã ở trạng thái {submission.status}")

    subject = await db.get(Subject, submission.subject_id)
    if subject and current_user.role == "faculty_admin" and current_user.faculty_id != subject.faculty_id:
        raise HTTPException(status_code=403, detail="Bạn chỉ có thể từ chối tài liệu thuộc khoa của mình")

    source_doc = await db.get(Document, submission.source_document_id)
    faculty = await db.get(Faculty, subject.faculty_id) if subject else None

    # Cập nhật submission
    submission.status = "rejected"
    submission.reviewed_by = current_user.id
    submission.reviewed_at = datetime.utcnow()
    submission.reject_reason = payload.reason

    # Tạo thông báo cho submitter
    doc_title = source_doc.title if source_doc else "Tài liệu"
    notif = Notification(
        user_id=submission.submitter_id,
        type="community_submission_rejected",
        document_id=submission.source_document_id,
        message=f'Tài liệu "{doc_title}" bị từ chối: {payload.reason}',
    )
    db.add(notif)

    await db.commit()
    await db.refresh(submission)

    submitter = await db.get(User, submission.submitter_id)

    return SubmissionOut(
        id=submission.id,
        source_document_id=submission.source_document_id,
        source_document_title=doc_title,
        published_document_id=submission.published_document_id,
        submitter_id=submission.submitter_id,
        submitter_name=(submitter.full_name or submitter.username) if submitter else "Người dùng",
        subject_id=submission.subject_id,
        subject_name=subject.name if subject else "Chưa xác định",
        faculty_name=faculty.name if faculty else "Chưa xác định",
        academic_year=submission.academic_year,
        doc_type=submission.doc_type,
        note=submission.note,
        status=submission.status,
        reject_reason=submission.reject_reason,
        reviewed_by=submission.reviewed_by,
        reviewed_at=submission.reviewed_at,
        created_at=submission.created_at,
    )
