from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.schemas.search import SearchResultItem

class SearchService:
    @staticmethod
    async def _get_accessible_workspace_ids(db: AsyncSession, user_id: int) -> list[int]:
        # Tìm các nhóm mà user làm chủ hoặc là thành viên
        stmt = select(Workspace.id).outerjoin(
            WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id
        ).where(
            or_(
                Workspace.owner_id == user_id,
                WorkspaceMember.user_id == user_id
            ),
            Workspace.is_deleted == False
        )
        result = await db.execute(stmt)
        return [row_id for row_id in result.scalars().all()]

    @staticmethod
    async def quick_search(db: AsyncSession, query: str, user_id: int, limit: int = 5) -> list[SearchResultItem]:
        accessible_ws_ids = await SearchService._get_accessible_workspace_ids(db, user_id)
        search_pattern = f"%{query}%"
        
        # 1. Tìm Documents (Trigram ILIKE trên title)
        doc_stmt = select(Document).where(
            Document.title.ilike(search_pattern),
            Document.is_deleted == False,
            or_(
                Document.owner_id == user_id,
                Document.workspace_id.in_(accessible_ws_ids)
            )
        ).limit(limit)
        
        doc_results = await db.execute(doc_stmt)
        documents = doc_results.scalars().all()
        
        results = []
        for doc in documents:
            if doc.workspace_id:
                # Tài liệu nhóm
                results.append(SearchResultItem(
                    id=doc.id,
                    type="group_doc",
                    title=doc.title,
                    subtitle="Tài liệu nhóm",
                    url=f"/groups/{doc.workspace_id}?tab=documents&highlight_doc={doc.id}"
                ))
            else:
                # Tài liệu cá nhân
                results.append(SearchResultItem(
                    id=doc.id,
                    type="personal_doc",
                    title=doc.title,
                    subtitle="Tài liệu cá nhân",
                    url=f"/personal/documents?highlight_doc={doc.id}"
                ))
                
        return results

    @staticmethod
    async def full_text_search(db: AsyncSession, query: str, user_id: int, page: int = 1, page_size: int = 20):
        accessible_ws_ids = await SearchService._get_accessible_workspace_ids(db, user_id)
        
        # Chuyển query thành tsquery (Full Text Search)
        # websearch_to_tsquery xử lý tốt các toán tử logic tự nhiên hơn plainto_tsquery
        ts_query = func.websearch_to_tsquery('simple', query)
        
        stmt = select(Document).where(
            Document.is_deleted == False,
            Document.search_vector.bool_op('@@')(ts_query),
            or_(
                Document.owner_id == user_id,
                Document.workspace_id.in_(accessible_ws_ids)
            )
        ).order_by(
            func.ts_rank(Document.search_vector, ts_query).desc()
        )
        
        # Phân trang
        offset = (page - 1) * page_size
        paginated_stmt = stmt.limit(page_size).offset(offset)
        
        results = await db.execute(paginated_stmt)
        documents = results.scalars().all()
        
        # Đếm tổng
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_count = await db.execute(count_stmt)
        total = total_count.scalar() or 0
        
        items = []
        for doc in documents:
            items.append(SearchResultItem(
                id=doc.id,
                type="document",
                title=doc.title,
                subtitle="Tài liệu",
                url=f"/personal/documents?highlight_doc={doc.id}" if not doc.workspace_id else f"/groups/{doc.workspace_id}?tab=documents&highlight_doc={doc.id}"
            ))
            
        return {"items": items, "total": total, "page": page, "page_size": page_size}

async def search_documents(
    db: AsyncSession, 
    *, 
    owner_id: int, 
    workspace_id: int | None = None, # Thêm tham số này để khớp với routers/search.py
    query: str, 
    limit: int = 20
):
    # Xác định phạm vi tìm kiếm: Cá nhân hay Workspace
    workspace_filter = "workspace_id = :workspace_id" if workspace_id else "owner_id = :owner_id AND workspace_id IS NULL"

    sql = text(
        f"""
        SELECT *
        FROM documents
        WHERE is_deleted = false AND ({workspace_filter})
          AND (
            search_vector @@ websearch_to_tsquery('simple', :query)
            OR unaccent(lower(title)) LIKE unaccent(lower(:like_query))
            OR unaccent(lower(coalesce(description, ''))) LIKE unaccent(lower(:like_query))
          )
        ORDER BY updated_at DESC
        LIMIT :limit
        """
    )
    
    result = await db.execute(
        sql, 
        {
            "owner_id": owner_id, 
            "workspace_id": workspace_id,
            "query": query, 
            "like_query": f"%{query}%", 
            "limit": limit
        }
    )
    rows = result.mappings().all()
    return rows