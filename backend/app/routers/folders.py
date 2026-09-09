# backend/app/routers/folders.py

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.folder import Folder
from app.models.folder_tag import FolderTag
from app.models.tag import Tag
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.schemas.folder import FolderOut, FolderCreate, FolderUpdate, AddTagsToFolder
from app.services.folder_service import get_folders_with_stats
from sqlalchemy import delete
from app.models.folder_tag import FolderTag

router = APIRouter(prefix="/folders", tags=["folders"])


# --------------------------------------------------------------------------
# HELPER FUNCTIONS
# --------------------------------------------------------------------------
async def verify_workspace_access(workspace_id: int, user_id: int, db: AsyncSession) -> Workspace:
    """Kiểm tra Workspace tồn tại và User có quyền truy cập hay không."""
    workspace = await db.get(Workspace, workspace_id)
    if not workspace or workspace.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không gian làm việc không tồn tại hoặc đã bị xóa"
        )

    if workspace.owner_id != user_id:
        stmt = select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id
        )
        result = await db.execute(stmt)
        member = result.scalar_one_or_none()
        
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền truy cập vào không gian làm việc này"
            )

    return workspace


# --------------------------------------------------------------------------
# ENDPOINTS
# --------------------------------------------------------------------------

@router.get("/", response_model=List[FolderOut])
async def list_folders(
    workspace_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lấy danh sách thư mục cá nhân (workspace_id = None) 
    hoặc danh sách thư mục trong một Workspace cụ thể.
    """
    if workspace_id:
        await verify_workspace_access(workspace_id, current_user.id, db)

    return await get_folders_with_stats(db, current_user.id, workspace_id=workspace_id)


@router.get("/{folder_id}", response_model=FolderOut)
async def get_folder(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    folder = await db.get(Folder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Không tìm thấy thư mục")

    if folder.workspace_id:
        await verify_workspace_access(folder.workspace_id, current_user.id, db)
    elif folder.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Không tìm thấy thư mục")

    folders = await get_folders_with_stats(db, current_user.id, workspace_id=folder.workspace_id)

    return next((f for f in folders if f["id"] == folder_id), None)


@router.post("/", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
async def create_folder(
    folder_in: FolderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace_id = getattr(folder_in, "workspace_id", None)

    new_folder = Folder(
        name=folder_in.name,
        color=folder_in.color,
        owner_id=current_user.id,
        workspace_id=workspace_id,
    )
    db.add(new_folder)
    await db.flush()  # Lấy new_folder.id trước khi commit

    # 1. Gán tags trực tiếp vào bảng trung gian FolderTag
    if folder_in.tag_ids:
        for tid in folder_in.tag_ids:
            db.add(FolderTag(folder_id=new_folder.id, tag_id=tid))

    await db.commit()
    
    # 2. Query lại thư mục và nạp sẵn tags để trả về Schema
    stmt = (
        select(Folder)
        .options(selectinload(Folder.tags))
        .where(Folder.id == new_folder.id)
    )
    result = await db.execute(stmt)
    created_folder = result.scalar_one()

    created_folder.document_count = 0
    created_folder.tag_count = len(created_folder.tags)

    return created_folder



@router.patch("/{folder_id}", response_model=FolderOut)
async def update_folder(
    folder_id: int,
    payload: FolderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    folder = await db.get(Folder, folder_id)
    if not folder:
        raise HTTPException(404, "Không tìm thấy thư mục")

    if folder.workspace_id:
        await verify_workspace_access(folder.workspace_id, current_user.id, db)
    elif folder.owner_id != current_user.id:
        raise HTTPException(404, "Không tìm thấy thư mục")

    if payload.name is not None:
        folder.name = payload.name
    if payload.color is not None:
        folder.color = payload.color

    await db.commit()

    folders = await get_folders_with_stats(db, current_user.id, workspace_id=folder.workspace_id)
    return next(f for f in folders if f["id"] == folder_id)


@router.delete("/{folder_id}", status_code=204)
async def delete_folder(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    folder = await db.get(Folder, folder_id)
    if not folder:
        raise HTTPException(404, "Không tìm thấy thư mục")

    if folder.workspace_id:
        await verify_workspace_access(folder.workspace_id, current_user.id, db)
    elif folder.owner_id != current_user.id:
        raise HTTPException(404, "Không tìm thấy thư mục")

    await db.delete(folder)
    await db.commit()


@router.post("/{folder_id}/tags", status_code=204)
async def add_tags_to_folder(
    folder_id: int,
    payload: AddTagsToFolder,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    folder = await db.get(Folder, folder_id)
    if not folder:
        raise HTTPException(404, "Không tìm thấy thư mục")

    if folder.workspace_id:
        await verify_workspace_access(folder.workspace_id, current_user.id, db)
    elif folder.owner_id != current_user.id:
        raise HTTPException(404, "Không tìm thấy thư mục")

    for tag_id in payload.tag_ids:
        tag = await db.get(Tag, tag_id)
        # Bỏ kiểm tra owner_id của tag để cho phép gán mọi tag hợp lệ
        if tag:
            existing = await db.get(FolderTag, (folder_id, tag_id))
            if not existing:
                db.add(FolderTag(folder_id=folder_id, tag_id=tag_id))

    await db.commit()

@router.delete("/{folder_id}/tags/{tag_id}", status_code=204)
async def remove_tag_from_folder(
    folder_id: int,
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    folder = await db.get(Folder, folder_id)
    if not folder:
        raise HTTPException(404, "Không tìm thấy thư mục")

    if folder.workspace_id:
        await verify_workspace_access(folder.workspace_id, current_user.id, db)
    elif folder.owner_id != current_user.id:
        raise HTTPException(404, "Không tìm thấy thư mục")

    ft = await db.get(FolderTag, (folder_id, tag_id))
    if ft:
        await db.delete(ft)
        await db.commit()


@router.get("/workspace/{workspace_id}", response_model=List[FolderOut])
async def list_workspace_folders(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lấy danh sách tất cả folder thuộc về một workspace_id
    """
    # 1. Kiểm tra quyền truy cập workspace
    await verify_workspace_access(workspace_id, current_user.id, db)

    # 2. Trả về danh sách folder có kèm stats (truyền workspace_id vào hàm service)
    return await get_folders_with_stats(db, current_user.id, workspace_id=workspace_id)


@router.post("/workspace/{workspace_id}", response_model=FolderOut, status_code=201)
async def create_workspace_folder(
    workspace_id: int,
    payload: FolderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Tạo folder mới gắn trực tiếp với một workspace_id
    """
    # 1. Kiểm tra quyền truy cập workspace
    await verify_workspace_access(workspace_id, current_user.id, db)

    # 2. Tạo Folder
    folder = Folder(
        owner_id=current_user.id,
        workspace_id=workspace_id,
        name=payload.name,
        color=payload.color
    )
    db.add(folder)
    await db.flush()

    # 3. Gắn tag (nếu có)
    for tag_id in payload.tag_ids:
        tag = await db.get(Tag, tag_id)
        if tag and tag.owner_id == current_user.id:
            db.add(FolderTag(folder_id=folder.id, tag_id=tag_id))

    await db.commit()
    await db.refresh(folder)

    # 4. Trả về folder mới tạo kèm các thông số stats
    folders = await get_folders_with_stats(db, current_user.id, workspace_id=workspace_id)
    return next(f for f in folders if f["id"] == folder.id)