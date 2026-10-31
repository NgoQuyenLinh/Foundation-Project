# backend/app/routers/favorites.py
from datetime import datetime
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.document import Document
from app.models.document_share import DocumentShare
from app.models.favorite import Favorite
from app.models.favorite_tag import favorite_tags
from app.models.tag import Tag
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.schemas.document import DocumentOut
from app.schemas.favorite import (
    FavoriteCreate,
    FavoriteDocumentOut,
    FavoriteDocumentOwnerOut,
    FavoriteDocumentSummaryOut,
    FavoriteListOut,
    FavoriteOut,
    FavoriteStatsOut,
    FavoriteTagAdd,
    FavoriteTagOut,
    FavoriteTagWithCountOut,
    FavoriteUpdate,
    ReadingStatus,
)

router = APIRouter(prefix="/favorites", tags=["favorites"])


async def _can_user_access_document(db: AsyncSession, user_id: int, doc: Document) -> bool:
    """Kiểm tra quyền xem tài liệu của user."""
    if doc.is_deleted or doc.is_orphaned or doc.trash_source is not None:
        return False

    # Tài liệu công khai hoặc do chính user sở hữu
    if doc.is_public or doc.owner_id == user_id:
        return True

    # Tài liệu trong workspace/nhóm mà user tham gia
    if doc.workspace_id:
        ws_stmt = (
            select(Workspace.id)
            .outerjoin(WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id)
            .where(
                Workspace.id == doc.workspace_id,
                Workspace.is_deleted == False,
                or_(
                    Workspace.owner_id == user_id,
                    WorkspaceMember.user_id == user_id,
                ),
            )
        )
        ws_result = await db.execute(ws_stmt)
        if ws_result.scalar_one_or_none() is not None:
            return True

    # Tài liệu được chia sẻ trực tiếp với user
    share_stmt = select(DocumentShare.id).where(
        DocumentShare.to_user_id == user_id,
        or_(
            DocumentShare.document_id == doc.id,
            DocumentShare.source_document_id == doc.id,
        ),
    )
    share_result = await db.execute(share_stmt)
    if share_result.scalar_one_or_none() is not None:
        return True

    return False


def _normalize_tag_name(name: str) -> str:
    """Chuẩn hóa tên thẻ: trim, bỏ ký tự # đầu."""
    cleaned = name.strip()
    while cleaned.startswith("#"):
        cleaned = cleaned[1:].strip()
    return cleaned


# =========================================================================
# 1. ROUTE TĨNH: /stats & /tags
# =========================================================================


@router.get("/stats", response_model=FavoriteStatsOut)
async def get_favorite_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Thống kê số lượng tài liệu yêu thích theo trạng thái đọc."""
    # Lấy danh sách favorites kèm document để loại các tài liệu đã bị xóa/gỡ
    stmt = (
        select(Favorite.reading_status)
        .join(Document, Favorite.document_id == Document.id)
        .where(
            Favorite.user_id == current_user.id,
            Document.is_deleted == False,
            Document.is_orphaned == False,
            Document.trash_source.is_(None),
        )
    )
    result = await db.execute(stmt)
    statuses = result.scalars().all()

    to_read_cnt = sum(1 for s in statuses if s == "to_read")
    reading_cnt = sum(1 for s in statuses if s == "reading")
    completed_cnt = sum(1 for s in statuses if s == "completed")

    return FavoriteStatsOut(
        total=len(statuses),
        to_read=to_read_cnt,
        reading=reading_cnt,
        completed=completed_cnt,
    )


@router.get("/tags", response_model=list[FavoriteTagWithCountOut])
async def list_favorite_tags(
    q: Optional[str] = Query(None, description="Từ khóa gợi ý tag khi gõ"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách thẻ cá nhân của user kèm số lượng tài liệu yêu thích đang gắn thẻ đó."""
    # Tag cá nhân: workspace_id IS NULL và (owner_id = current_user.id hoặc owner_id IS NULL)
    tag_filter = [
        Tag.workspace_id.is_(None),
        or_(Tag.owner_id == current_user.id, Tag.owner_id.is_(None)),
    ]
    if q:
        normalized_q = _normalize_tag_name(q)
        if normalized_q:
            tag_filter.append(Tag.name.ilike(f"%{normalized_q}%"))

    # Đếm số lượng tài liệu yêu thích của user đang gắn từng tag
    stmt = (
        select(
            Tag.id,
            Tag.name,
            Tag.color,
            func.count(favorite_tags.c.document_id).label("doc_count"),
        )
        .outerjoin(
            favorite_tags,
            (favorite_tags.c.tag_id == Tag.id) & (favorite_tags.c.user_id == current_user.id),
        )
        .where(*tag_filter)
        .group_by(Tag.id, Tag.name, Tag.color)
        .order_by(func.count(favorite_tags.c.document_id).desc(), Tag.name.asc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        FavoriteTagWithCountOut(
            id=row[0],
            name=row[1],
            color=row[2],
            document_count=row[3],
        )
        for row in rows
    ]


@router.get("/ids", response_model=list[int])
async def list_favorite_ids(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách ID các tài liệu đã yêu thích còn hợp lệ và có quyền truy cập của user."""
    stmt = (
        select(Favorite)
        .join(Document, Favorite.document_id == Document.id)
        .options(selectinload(Favorite.document))
        .where(
            Favorite.user_id == current_user.id,
            Document.is_deleted == False,
            Document.is_orphaned == False,
            Document.trash_source.is_(None),
        )
    )
    result = await db.execute(stmt)
    favs = result.scalars().all()

    valid_ids: list[int] = []
    for fav in favs:
        if fav.document and await _can_user_access_document(db, current_user.id, fav.document):
            valid_ids.append(fav.document_id)
    return valid_ids


# =========================================================================
# 2. ROUTE DANH SÁCH & TẠO: GET / & POST /
# =========================================================================


@router.get("/", response_model=FavoriteListOut)
async def list_favorites(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    reading_status: Optional[ReadingStatus] = Query(None, description="Lọc theo trạng thái đọc"),
    tag_ids: Optional[list[int]] = Query(None, description="Lọc theo danh sách tag ID"),
    tag_mode: Literal["any", "all"] = Query("any", description="Chế độ lọc tag: any hoặc all"),
    sort_by: Literal["created_at", "title"] = Query("created_at", description="Trường sắp xếp"),
    sort_order: Literal["asc", "desc"] = Query("desc", description="Thứ tự sắp xếp"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Danh sách tài liệu yêu thích có phân trang, lọc trạng thái, lọc thẻ và sắp xếp."""
    base_query = (
        select(Favorite)
        .join(Document, Favorite.document_id == Document.id)
        .options(
            selectinload(Favorite.document).selectinload(Document.owner),
            selectinload(Favorite.tags),
        )
        .where(
            Favorite.user_id == current_user.id,
            Document.is_deleted == False,
            Document.is_orphaned == False,
            Document.trash_source.is_(None),
        )
    )

    # Lọc theo trạng thái đọc
    if reading_status:
        base_query = base_query.where(Favorite.reading_status == reading_status)

    # Lọc theo tags
    if tag_ids:
        if tag_mode == "any":
            # Có ít nhất 1 tag trong tag_ids
            subq = (
                select(favorite_tags.c.document_id)
                .where(
                    favorite_tags.c.user_id == current_user.id,
                    favorite_tags.c.tag_id.in_(tag_ids),
                )
                .scalar_subquery()
            )
            base_query = base_query.where(Favorite.document_id.in_(subq))
        else:
            # Phải có TẤT CẢ các tag trong tag_ids
            subq = (
                select(favorite_tags.c.document_id)
                .where(
                    favorite_tags.c.user_id == current_user.id,
                    favorite_tags.c.tag_id.in_(tag_ids),
                )
                .group_by(favorite_tags.c.document_id)
                .having(func.count(favorite_tags.c.tag_id.distinct()) == len(tag_ids))
                .scalar_subquery()
            )
            base_query = base_query.where(Favorite.document_id.in_(subq))

    # Sắp xếp
    if sort_by == "title":
        order_col = Document.title.asc() if sort_order == "asc" else Document.title.desc()
    else:
        order_col = Favorite.created_at.asc() if sort_order == "asc" else Favorite.created_at.desc()
    base_query = base_query.order_by(order_col)

    # Đếm tổng số lượng
    count_stmt = select(func.count()).select_from(base_query.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    # Phân trang
    offset = (page - 1) * page_size
    paginated_stmt = base_query.offset(offset).limit(page_size)
    result = await db.execute(paginated_stmt)
    fav_items = result.scalars().all()

    # Tính bundle_children_count cho các bundle (cùng logic với trang Tài liệu)
    bundle_ids = [
        fav.document.id
        for fav in fav_items
        if fav.document and getattr(fav.document, "is_bundle", False)
    ]
    bundle_counts_map: dict[int, int] = {}
    if bundle_ids:
        counts_res = await db.execute(
            select(Document.bundle_parent_id, func.count(Document.id))
            .where(
                Document.bundle_parent_id.in_(bundle_ids),
                Document.is_deleted == False,
                Document.is_orphaned == False,
                Document.trash_source.is_(None),
            )
            .group_by(Document.bundle_parent_id)
        )
        bundle_counts_map = dict(counts_res.all())

    # Kiểm tra quyền truy cập cho từng document
    items: list[FavoriteDocumentOut] = []
    for fav in fav_items:
        doc = fav.document
        if not doc:
            continue
        # Kiểm tra quyền truy cập
        has_access = await _can_user_access_document(db, current_user.id, doc)
        if not has_access:
            continue

        if doc.is_important is None:
            doc.is_important = False
        if doc.is_bundle is None:
            doc.is_bundle = False
        if doc.is_deleted is None:
            doc.is_deleted = False
        if doc.is_orphaned is None:
            doc.is_orphaned = False

        doc_out = DocumentOut.model_validate(doc)
        # Gán bundle_children_count cho bundle
        if doc.is_bundle:
            doc_out.bundle_children_count = bundle_counts_map.get(doc.id, 0)

        fav_doc_data = doc_out.model_dump()
        fav_doc_data["favorited_at"] = fav.created_at
        fav_doc_data["reading_status"] = fav.reading_status
        fav_doc_data["notes"] = fav.notes
        fav_doc_data["favorite_tags"] = [
            FavoriteTagOut(id=t.id, name=t.name, color=t.color)
            for t in (fav.tags or [])
        ]

        items.append(FavoriteDocumentOut(**fav_doc_data))

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return FavoriteListOut(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/", response_model=FavoriteOut, status_code=status.HTTP_201_CREATED)
async def add_favorite(
    payload: FavoriteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Thêm tài liệu vào danh sách yêu thích."""
    # 1. Kiểm tra tài liệu tồn tại và quyền truy cập
    doc_stmt = select(Document).where(Document.id == payload.document_id)
    doc_res = await db.execute(doc_stmt)
    doc = doc_res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    has_access = await _can_user_access_document(db, current_user.id, doc)
    if not has_access:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    # 2. Kiểm tra xem đã yêu thích trước đó chưa
    existing_stmt = select(Favorite).where(
        Favorite.user_id == current_user.id,
        Favorite.document_id == payload.document_id,
    )
    existing_res = await db.execute(existing_stmt)
    existing = existing_res.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tài liệu đã có trong danh sách yêu thích",
        )

    # 3. Tạo Favorite mới
    favorite = Favorite(
        user_id=current_user.id,
        document_id=payload.document_id,
        reading_status=payload.reading_status,
        notes=payload.notes,
    )

    # 4. Gắn tags nếu có
    if payload.tag_ids:
        if len(payload.tag_ids) > 10:
            raise HTTPException(
                status_code=400, detail="Tối đa 10 thẻ cho mỗi tài liệu yêu thích"
            )
        tag_stmt = select(Tag).where(
            Tag.id.in_(payload.tag_ids),
            Tag.workspace_id.is_(None),
            or_(Tag.owner_id == current_user.id, Tag.owner_id.is_(None)),
        )
        tag_res = await db.execute(tag_stmt)
        valid_tags = tag_res.scalars().all()
        favorite.tags = list(valid_tags)

    db.add(favorite)
    await db.commit()

    # Load lại quan hệ tags
    load_stmt = (
        select(Favorite)
        .options(selectinload(Favorite.tags))
        .where(
            Favorite.user_id == current_user.id,
            Favorite.document_id == payload.document_id,
        )
    )
    loaded_res = await db.execute(load_stmt)
    favorite = loaded_res.scalar_one()

    return FavoriteOut(
        user_id=favorite.user_id,
        document_id=favorite.document_id,
        created_at=favorite.created_at,
        reading_status=favorite.reading_status,
        notes=favorite.notes,
        tags=[
            FavoriteTagOut(id=t.id, name=t.name, color=t.color)
            for t in (favorite.tags or [])
        ],
    )


# =========================================================================
# 3. ROUTE ĐỘNG THEO {document_id}: PATCH, DELETE, TAGS
# =========================================================================


@router.patch("/{document_id}", response_model=FavoriteOut)
async def update_favorite(
    document_id: int,
    payload: FavoriteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cập nhật trạng thái đọc, ghi chú hoặc danh sách thẻ của tài liệu yêu thích."""
    stmt = (
        select(Favorite)
        .options(selectinload(Favorite.tags))
        .where(
            Favorite.user_id == current_user.id,
            Favorite.document_id == document_id,
        )
    )
    res = await db.execute(stmt)
    favorite = res.scalar_one_or_none()
    if not favorite:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu thích")

    update_data = payload.model_dump(exclude_unset=True)

    if "reading_status" in update_data:
        favorite.reading_status = update_data["reading_status"]

    if "notes" in update_data:
        favorite.notes = update_data["notes"]

    if "tag_ids" in update_data:
        new_tag_ids = update_data["tag_ids"] or []
        if len(new_tag_ids) > 10:
            raise HTTPException(
                status_code=400, detail="Tối đa 10 thẻ cho mỗi tài liệu yêu thích"
            )
        if new_tag_ids:
            tag_stmt = select(Tag).where(
                Tag.id.in_(new_tag_ids),
                Tag.workspace_id.is_(None),
                or_(Tag.owner_id == current_user.id, Tag.owner_id.is_(None)),
            )
            tag_res = await db.execute(tag_stmt)
            valid_tags = tag_res.scalars().all()
            favorite.tags = list(valid_tags)
        else:
            favorite.tags = []

    await db.commit()
    await db.refresh(favorite)

    return FavoriteOut(
        user_id=favorite.user_id,
        document_id=favorite.document_id,
        created_at=favorite.created_at,
        reading_status=favorite.reading_status,
        notes=favorite.notes,
        tags=[
            FavoriteTagOut(id=t.id, name=t.name, color=t.color)
            for t in (favorite.tags or [])
        ],
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Xóa tài liệu khỏi danh sách yêu thích (tự động cascade xóa favorite_tags)."""
    stmt = select(Favorite).where(
        Favorite.user_id == current_user.id,
        Favorite.document_id == document_id,
    )
    res = await db.execute(stmt)
    favorite = res.scalar_one_or_none()
    if not favorite:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu thích")

    await db.delete(favorite)
    await db.commit()


@router.post("/{document_id}/tags", response_model=FavoriteOut)
async def add_tag_to_favorite(
    document_id: int,
    payload: FavoriteTagAdd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gắn thẻ vào tài liệu yêu thích theo tag_id hoặc tên thẻ (tìm hoặc tạo thẻ cá nhân)."""
    stmt = (
        select(Favorite)
        .options(selectinload(Favorite.tags))
        .where(
            Favorite.user_id == current_user.id,
            Favorite.document_id == document_id,
        )
    )
    res = await db.execute(stmt)
    favorite = res.scalar_one_or_none()
    if not favorite:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu thích")

    target_tag: Optional[Tag] = None

    if payload.tag_id is not None:
        tag_stmt = select(Tag).where(
            Tag.id == payload.tag_id,
            Tag.workspace_id.is_(None),
            or_(Tag.owner_id == current_user.id, Tag.owner_id.is_(None)),
        )
        tag_res = await db.execute(tag_stmt)
        target_tag = tag_res.scalar_one_or_none()
        if not target_tag:
            raise HTTPException(status_code=404, detail="Không tìm thấy thẻ")

    elif payload.name:
        clean_name = _normalize_tag_name(payload.name)
        if not clean_name:
            raise HTTPException(status_code=422, detail="Tên thẻ không hợp lệ")

        # Tìm tag cá nhân trùng tên (so sánh không phân biệt hoa thường, lấy id nhỏ nhất)
        search_stmt = (
            select(Tag)
            .where(
                func.lower(Tag.name) == clean_name.lower(),
                Tag.workspace_id.is_(None),
                or_(Tag.owner_id == current_user.id, Tag.owner_id.is_(None)),
            )
            .order_by(Tag.id.asc())
        )
        search_res = await db.execute(search_stmt)
        target_tag = search_res.scalars().first()

        # Nếu chưa có thì tạo mới thẻ cá nhân với owner_id = current_user.id
        if not target_tag:
            target_tag = Tag(
                name=clean_name,
                owner_id=current_user.id,
                workspace_id=None,
            )
            db.add(target_tag)
            await db.flush()
    else:
        raise HTTPException(status_code=422, detail="Cần cung cấp tag_id hoặc name")

    # Kiểm tra số lượng thẻ tối đa 10
    current_tag_ids = [t.id for t in favorite.tags]
    if target_tag.id not in current_tag_ids:
        if len(current_tag_ids) >= 10:
            raise HTTPException(
                status_code=400, detail="Tối đa 10 thẻ cho mỗi tài liệu yêu thích"
            )
        favorite.tags.append(target_tag)
        await db.commit()
        await db.refresh(favorite)

    return FavoriteOut(
        user_id=favorite.user_id,
        document_id=favorite.document_id,
        created_at=favorite.created_at,
        reading_status=favorite.reading_status,
        notes=favorite.notes,
        tags=[
            FavoriteTagOut(id=t.id, name=t.name, color=t.color)
            for t in (favorite.tags or [])
        ],
    )


@router.delete("/{document_id}/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_tag_from_favorite(
    document_id: int,
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bỏ thẻ khỏi tài liệu yêu thích (chỉ xóa liên kết favorite_tags, không xóa thẻ gốc)."""
    stmt = (
        select(Favorite)
        .options(selectinload(Favorite.tags))
        .where(
            Favorite.user_id == current_user.id,
            Favorite.document_id == document_id,
        )
    )
    res = await db.execute(stmt)
    favorite = res.scalar_one_or_none()
    if not favorite:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu thích")

    # Lọc bỏ tag_id khỏi danh sách tags
    favorite.tags = [t for t in favorite.tags if t.id != tag_id]
    await db.commit()
