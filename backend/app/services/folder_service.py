# backend/app/services/folder_service.py
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.models.tag import Tag
from app.models.folder import Folder
from app.models.folder_tag import FolderTag

DEFAULT_FOLDERS = [
    {"name": "Giáo trình",           "color": "#4CAF50",
     "default_tags": ["Giáo trình"]},
    {"name": "Bài tập",              "color": "#2196F3",
     "default_tags": ["Bài tập"]},
    {"name": "Tài liệu tham khảo",  "color": "#FF9800",
     "default_tags": ["Tham khảo"]},
    {"name": "Đồ án tốt nghiệp",     "color": "#9C27B0",
     "default_tags": ["Đồ án"]},
]

async def create_default_folders_for_user(db: AsyncSession, user_id: int) -> None:
    """Gọi sau khi tạo user mới thành công"""
    for folder_data in DEFAULT_FOLDERS:
        # 1. Tạo các Tag mặc định chưa tồn tại
        tag_ids = []
        for tag_name in folder_data["default_tags"]:
            result = await db.execute(
                select(Tag).where(Tag.owner_id == user_id, Tag.name == tag_name)
            )
            tag = result.scalar_one_or_none()
            if not tag:
                tag = Tag(owner_id=user_id, name=tag_name)
                db.add(tag)
                await db.flush()   # lấy id mà không commit
            tag_ids.append(tag.id)

        # 2. Tạo Folder
        folder = Folder(owner_id=user_id, name=folder_data["name"],
                        color=folder_data["color"])
        db.add(folder)
        await db.flush()

        # 3. Gán tag vào folder
        for tag_id in tag_ids:
            db.add(FolderTag(folder_id=folder.id, tag_id=tag_id))

    await db.commit()

async def get_folders_with_stats(
    db: AsyncSession,
    owner_id: int,
    workspace_id: Optional[int] = None,
) -> List[dict]:
    """Lấy danh sách folder kèm tag_count, document_count và danh sách tags"""

    # 1. Tách biệt điều kiện lọc giữa Personal Space và Group Space
    if workspace_id is not None:
        folder_where_clause = "f.workspace_id = :workspace_id"
        doc_where_clause = "d.workspace_id = :workspace_id"
    else:
        folder_where_clause = "f.owner_id = :owner_id AND f.workspace_id IS NULL"
        doc_where_clause = "d.workspace_id IS NULL AND d.owner_id = :owner_id"

    # 2. Truy vấn đếm document thông qua trung gian document_tags (dt)
    sql = text(f"""
        SELECT
            f.id, f.owner_id, f.workspace_id, f.name, f.color, f.created_at,
            COUNT(DISTINCT ft.tag_id) AS tag_count,
            COUNT(DISTINCT d.id) AS document_count
        FROM folders f
        LEFT JOIN folder_tags ft ON ft.folder_id = f.id
        LEFT JOIN document_tags dt ON dt.tag_id = ft.tag_id
        LEFT JOIN documents d ON d.id = dt.document_id
            AND {doc_where_clause}
            AND d.is_deleted = false
        WHERE {folder_where_clause}
        GROUP BY f.id, f.owner_id, f.workspace_id, f.name, f.color, f.created_at
        ORDER BY f.created_at ASC
    """)

    result = await db.execute(sql, {"owner_id": owner_id, "workspace_id": workspace_id})
    rows = result.mappings().all()

    folders_out = []
    for row in rows:
        # 3. Query lấy danh sách Tag objects
        tags_result = await db.execute(
            select(Tag)
            .join(FolderTag, FolderTag.tag_id == Tag.id)
            .where(FolderTag.folder_id == row["id"])
        )
        tags = tags_result.scalars().all()

        folder_dict = dict(row)
        folder_dict["tags"] = tags
        folders_out.append(folder_dict)

    return folders_out
from sqlalchemy import select, func
from app.models.document import Document
from app.models.document_tag import document_tags
from app.models.folder_tag import FolderTag

async def get_documents_by_folder(
    db: AsyncSession, owner_id: int, folder_id: int,
    page: int = 1, page_size: int = 20
) -> dict:
    """Lấy document thuộc folder: is_deleted=false + có tag thuộc folder"""
    offset = (page - 1) * page_size
    
    query = (
        select(Document)
        .join(document_tags, document_tags.c.document_id == Document.id)
        .join(FolderTag, FolderTag.tag_id == document_tags.c.tag_id)
        .where(
            FolderTag.folder_id == folder_id,
            Document.owner_id == owner_id,
            Document.is_deleted == False
        )
        .distinct()
    )
    
    count_sql = select(func.count(Document.id.distinct())).select_from(query.subquery())
    total = (await db.execute(count_sql)).scalar() or 0
    
    query = query.order_by(Document.created_at.desc()).offset(offset).limit(page_size)
    items = (await db.execute(query)).scalars().all()
    
    return {
        "items": list(items),
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1
    }
