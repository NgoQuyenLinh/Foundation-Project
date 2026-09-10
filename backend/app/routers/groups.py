# backend/app/routers/groups.py

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.document import Document
from app.models.document_tag import document_tags
from app.models.folder import Folder
from app.models.folder_tag import FolderTag
from app.models.notification import Notification
from app.models.tag import Tag
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_invitation import WorkspaceInvitation
from app.models.workspace_member import WorkspaceMember
from app.routers.documents import _process_document_background
from app.schemas.document import DocumentOut, DocumentUpdate, PaginatedDocuments
from app.schemas.folder import AddTagsToFolder, FolderCreate, FolderOut, FolderUpdate
from app.schemas.group import (
    BulkInviteCreate,
    BulkInviteOut,
    GroupCreate,
    GroupListItem,
    GroupUpdate,
    InvitationOut,
    InviteCreate,
    MemberOut,
    PermissionUpdate,
    ShareDocumentsPayload,
    ShareFolderPayload,
    ShareResult,
    TransferOwnerPayload,
    WorkspaceOut,
)
from app.schemas.tag import TagCreate, TagOut, TagUpdate
from app.services.document_service import create_document_from_upload
from app.services.folder_service import get_folders_with_stats
from app.services.group_service import require_write_permission
from app.services.group_service import (
    mark_group_document_deleted,
    require_full_permission,
    require_member,
    require_owner,
    save_to_personal,
    share_document_to_group,
    share_folder_to_group,
)

router = APIRouter(tags=["groups"])


def _role_for(workspace: Workspace, member: WorkspaceMember) -> str:
    if workspace.owner_id == member.user_id:
        return "Trưởng nhóm"
    if member.permission_level == "full":
        return "Cố vấn"
    return "Thành viên"


def _invitation_out(invitation: WorkspaceInvitation) -> InvitationOut:
    return InvitationOut(
        id=invitation.id,
        workspace_id=invitation.workspace_id,
        workspace_name=invitation.workspace.name,
        invited_by_name=invitation.inviter.full_name or invitation.inviter.username,
        message=invitation.message,
        permission_level=invitation.workspace.default_member_permission or "view",
        created_at=invitation.created_at,
        status=invitation.status or "pending",
    )


@router.post("/groups/", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
async def create_group(
    payload: GroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = Workspace(
        type="group",
        name=payload.name,
        description=payload.description,
        owner_id=current_user.id,
        default_member_permission=payload.default_member_permission,
    )
    db.add(workspace)
    await db.flush()
    db.add(
        WorkspaceMember(
            workspace_id=workspace.id,
            user_id=current_user.id,
            permission_level="full",
        )
    )
    await db.commit()
    await db.refresh(workspace)
    return workspace


@router.get("/groups/", response_model=list[GroupListItem])
async def list_groups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Workspace, WorkspaceMember, func.count(WorkspaceMember.user_id).over(partition_by=Workspace.id))
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(
            Workspace.type == "group",
            Workspace.is_deleted == False,
            Workspace.id.in_(
                select(WorkspaceMember.workspace_id).where(WorkspaceMember.user_id == current_user.id)
            ),
        )
        .order_by(Workspace.updated_at.desc().nullslast(), Workspace.created_at.desc())
    )
    items = []
    seen: set[int] = set()
    for workspace, member, member_count in result.all():
        if workspace.id in seen or member.user_id != current_user.id:
            continue
        seen.add(workspace.id)
        items.append(
            GroupListItem(
                id=workspace.id,
                type=workspace.type,
                name=workspace.name,
                description=workspace.description,
                owner_id=workspace.owner_id,
                default_member_permission=workspace.default_member_permission or "view",
                is_deleted=bool(workspace.is_deleted),
                is_dissolving=workspace.is_dissolving,
                dissolve_at=workspace.dissolve_at,
                created_at=workspace.created_at,
                updated_at=workspace.updated_at,
                member_count=member_count,
                my_permission=member.permission_level,
                is_owner=workspace.owner_id == current_user.id,
                role=_role_for(workspace, member),
                last_updated=workspace.updated_at or workspace.created_at,
            )
        )
    return items


@router.get("/groups/{group_id}", response_model=WorkspaceOut)
async def get_group(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_member(db, group_id, current_user.id)
    workspace = await db.get(Workspace, group_id)
    if not workspace or workspace.is_deleted or workspace.type != "group":
        raise HTTPException(404, "Không tìm thấy nhóm")
    return workspace


@router.patch("/groups/{group_id}", response_model=WorkspaceOut)
async def update_group(
    group_id: int,
    payload: GroupUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = await require_owner(db, group_id, current_user.id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(workspace, key, value)
    await db.commit()
    await db.refresh(workspace)
    return workspace


@router.delete("/groups/{group_id}", status_code=status.HTTP_202_ACCEPTED)
async def dissolve_group(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = await require_owner(db, group_id, current_user.id)
    members = (
        await db.execute(select(WorkspaceMember).where(WorkspaceMember.workspace_id == group_id))
    ).scalars().all()
    workspace.is_dissolving = True
    workspace.dissolve_at = datetime.utcnow() + timedelta(hours=24)
    for member in members:
        db.add(
            Notification(
                user_id=member.user_id,
                type="group_dissolving",
                workspace_id=group_id,
                document_id=None,
                message=f"Nhóm {workspace.name} sẽ bị giải tán sau 24h. Hãy lưu tài liệu bạn cần.",
            )
        )
    await db.commit()
    return {"message": "Nhóm sẽ bị giải tán sau 24 giờ"}


@router.get("/groups/{group_id}/documents/", response_model=PaginatedDocuments)
async def list_group_documents(
    group_id: int,
    folder_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_member(db, group_id, current_user.id)
    offset = (page - 1) * page_size
    query = (
        select(Document)
        .options(selectinload(Document.tags))
        .where(Document.workspace_id == group_id, Document.is_deleted == False)
    )
    if folder_id is not None:
        folder = await db.get(Folder, folder_id)
        if not folder or folder.workspace_id != group_id:
            raise HTTPException(404, "Không tìm thấy thư mục")
        query = query.join(document_tags, document_tags.c.document_id == Document.id).join(
            FolderTag,
            and_(
                FolderTag.folder_id == folder_id,
                FolderTag.tag_id == document_tags.c.tag_id,
            ),
        )
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0
    result = await db.execute(query.order_by(Document.created_at.desc()).offset(offset).limit(page_size))
    return {
        "items": result.scalars().all(),
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size else 1,
    }

@router.get("/groups/{group_id}/documents/{document_id}", response_model=DocumentOut)
async def get_group_document(
    group_id: int,
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Kiểm tra quyền thành viên trong nhóm
    await require_member(db, group_id, current_user.id)

    # Truy vấn tài liệu kèm theo danh sách tags
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.tags))
        .where(
            Document.id == document_id,
            Document.workspace_id == group_id,
            Document.is_deleted == False,
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài liệu trong nhóm này",
        )

    return document

@router.post("/groups/{group_id}/documents/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_group_document(
    group_id: int,
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category_id: Optional[int] = Form(None),
    tag_ids: list[int] = Form(default=[]),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_full_permission(db, group_id, current_user.id)
    document = await create_document_from_upload(
        db,
        upload=file,
        owner_id=current_user.id,
        title=title,
        description=description,
        category_id=category_id,
        workspace_id=group_id,
        tag_ids=tag_ids,
    )
    await db.commit()
    await db.refresh(document)
    background_tasks.add_task(_process_document_background, document.id, document.file_path, document.file_type or "")
    return document


@router.post("/groups/{group_id}/share/documents", response_model=ShareResult)
async def share_documents(
    group_id: int,
    payload: ShareDocumentsPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_full_permission(db, group_id, current_user.id)
    for document_id in payload.document_ids:
        await share_document_to_group(db, document_id, group_id, current_user.id)
    return ShareResult(shared_count=len(payload.document_ids))

# ==========================================
# API CẬP NHẬT TÀI LIỆU NHÓM (Bọc cả 2 route trailing slash)
# ==========================================
@router.patch("/groups/{group_id}/documents/{document_id}", response_model=DocumentOut)
@router.patch("/groups/{group_id}/documents/{document_id}/", response_model=DocumentOut)
async def update_group_document(
    group_id: int,
    document_id: int,
    payload: DocumentUpdate,  # Hoặc dùng dict/schema update của bạn
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cập nhật thông tin/đổi tên tài liệu nhóm"""
    # 1. Kiểm tra quyền của người dùng trong nhóm
    await require_full_permission(db, group_id, current_user.id)
    
    # 2. Truy vấn tài liệu
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.tags))
        .where(
            Document.id == document_id,
            Document.workspace_id == group_id,
            Document.is_deleted == False
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Không tìm thấy tài liệu trong nhóm này"
        )
    
    # 3. Cập nhật thông tin
    if payload.title is not None:
        document.title = payload.title
    if hasattr(payload, 'description') and payload.description is not None:
        document.description = payload.description
    if hasattr(payload, 'category_id') and payload.category_id is not None:
        document.category_id = payload.category_id
        
    await db.commit()
    await db.refresh(document)
    
    return document

@router.post("/groups/{group_id}/share/folder", response_model=ShareResult)
async def share_folder(
    group_id: int,
    payload: ShareFolderPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_full_permission(db, group_id, current_user.id)
    count = await share_folder_to_group(db, payload.folder_id, group_id, current_user.id)
    return ShareResult(shared_count=count)


@router.post("/groups/{group_id}/documents/{document_id}/save-to-personal", response_model=DocumentOut)
async def save_group_document_to_personal(
    group_id: int,
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_member(db, group_id, current_user.id)
    return await save_to_personal(db, document_id, group_id, current_user.id)


@router.delete("/groups/{group_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group_document(
    group_id: int,
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_full_permission(db, group_id, current_user.id)
    document = await db.get(Document, document_id)
    if not document or document.workspace_id != group_id or document.is_deleted:
        raise HTTPException(404, "Không tìm thấy tài liệu")
    await mark_group_document_deleted(db, document)


@router.get("/groups/{group_id}/members/", response_model=list[MemberOut])
async def list_members(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_member(db, group_id, current_user.id)
    workspace = await db.get(Workspace, group_id)
    result = await db.execute(
        select(WorkspaceMember, User)
        .join(User, User.id == WorkspaceMember.user_id)
        .where(WorkspaceMember.workspace_id == group_id)
        .order_by(WorkspaceMember.joined_at.asc())
    )
    return [
        MemberOut(
            user_id=user.id,
            username=user.username,
            full_name=user.full_name,
            role=_role_for(workspace, member),
            student_code=user.student_code,
            permission_level=member.permission_level,
            joined_at=member.joined_at,
            is_owner=workspace.owner_id == user.id,
        )
        for member, user in result.all()
    ]


@router.patch("/groups/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def update_member_permission(
    group_id: int,
    user_id: int,
    payload: PermissionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = await require_owner(db, group_id, current_user.id)
    if workspace.owner_id == user_id:
        raise HTTPException(400, "Không thể đổi quyền của chủ nhóm")
    member = (
        await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == group_id,
                WorkspaceMember.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if not member:
        raise HTTPException(404, "Không tìm thấy thành viên")
    member.permission_level = payload.permission_level
    await db.commit()


@router.delete("/groups/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    group_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = await require_owner(db, group_id, current_user.id)
    if workspace.owner_id == user_id:
        raise HTTPException(400, "Không thể xóa chủ nhóm")
    member = (
        await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == group_id,
                WorkspaceMember.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if not member:
        raise HTTPException(404, "Không tìm thấy thành viên")
    await db.delete(member)
    await db.commit()


@router.post("/groups/{group_id}/members/transfer-owner", status_code=status.HTTP_204_NO_CONTENT)
async def transfer_owner(
    group_id: int,
    payload: TransferOwnerPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = await require_owner(db, group_id, current_user.id)
    member = (
        await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == group_id,
                WorkspaceMember.user_id == payload.new_owner_id,
            )
        )
    ).scalar_one_or_none()
    if not member:
        raise HTTPException(404, "Người nhận quyền chưa phải thành viên nhóm")
    workspace.owner_id = payload.new_owner_id
    member.permission_level = "full"
    await db.commit()


@router.post("/groups/{group_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_group(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = await db.get(Workspace, group_id)
    if not workspace or workspace.owner_id == current_user.id:
        raise HTTPException(400, "Chủ nhóm không thể rời nhóm")
    member = (
        await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == group_id,
                WorkspaceMember.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()
    if not member:
        raise HTTPException(404, "Bạn không phải thành viên của nhóm này")
    await db.delete(member)
    await db.commit()


@router.post("/groups/{group_id}/invitations/", response_model=InvitationOut, status_code=status.HTTP_201_CREATED)
async def invite_member(
    group_id: int,
    payload: InviteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = await require_owner(db, group_id, current_user.id)
    user = (
        await db.execute(
            select(User).where(
                or_(
                    User.username == payload.identifier,
                    User.email == payload.identifier,
                    User.student_code == payload.identifier,
                )
            )
        )
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Không tìm thấy người dùng")
    existing_member = await db.execute(
        select(WorkspaceMember).where(WorkspaceMember.workspace_id == group_id, WorkspaceMember.user_id == user.id)
    )
    if existing_member.scalar_one_or_none():
        raise HTTPException(400, "Người dùng đã là thành viên")
    existing_invitation = await db.execute(
        select(WorkspaceInvitation).where(
            WorkspaceInvitation.workspace_id == group_id,
            WorkspaceInvitation.invited_user_id == user.id,
            WorkspaceInvitation.status == "pending",
        )
    )
    if existing_invitation.scalar_one_or_none():
        raise HTTPException(400, "Đã có lời mời đang chờ")
    invitation = WorkspaceInvitation(
        workspace_id=group_id,
        invited_user_id=user.id,
        invited_by=current_user.id,
        message=payload.message,
        status="pending",
    )
    db.add(invitation)
    db.add(
        Notification(
            user_id=user.id,
            type="group_invitation",
            workspace_id=group_id,
            document_id=None,
            message=f"Bạn được mời tham gia nhóm {workspace.name}.",
        )
    )
    await db.commit()
    result = await db.execute(
        select(WorkspaceInvitation)
        .options(selectinload(WorkspaceInvitation.workspace), selectinload(WorkspaceInvitation.inviter))
        .where(WorkspaceInvitation.id == invitation.id)
    )
    return _invitation_out(result.scalar_one())

@router.post("/groups/{group_id}/invitations/", response_model=BulkInviteOut, status_code=status.HTTP_201_CREATED)
async def invite_members_bulk(
    group_id: int,
    payload: BulkInviteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = await require_owner(db, group_id, current_user.id)

    conditions = []
    
    # 1. Mời cá nhân (theo username, email, MSSV)
    if payload.identifiers:
        conditions.append(
            or_(
                User.username.in_(payload.identifiers),
                User.email.in_(payload.identifiers),
                User.student_code.in_(payload.identifiers)
            )
        )
    # 2. Mời theo Lớp
    if payload.class_ids:
        conditions.append(User.class_id.in_(payload.class_ids))
    
    # 3. Mời theo Khoa
    if payload.faculty_ids:
        conditions.append(User.faculty_id.in_(payload.faculty_ids))
        
    # 4. Mời theo Pattern mã Sinh Viên (vd: '241')
    if payload.student_code_patterns:
        pattern_conditions = [User.student_code.ilike(f"%{pat}%") for pat in payload.student_code_patterns]
        conditions.append(or_(*pattern_conditions))

    if not conditions:
        raise HTTPException(400, "Vui lòng chọn ít nhất một tiêu chí mời")

    # Lấy toàn bộ User hợp lệ
    target_users = await db.execute(select(User.id).where(or_(*conditions)))
    target_user_ids = [uid for uid in target_users.scalars().all() if uid != current_user.id]

    if not target_user_ids:
        return BulkInviteOut(message="Không tìm thấy người dùng nào phù hợp", invited_count=0)

    # Lọc những người ĐÃ LÀ THÀNH VIÊN
    existing_members = await db.execute(
        select(WorkspaceMember.user_id).where(
            WorkspaceMember.workspace_id == group_id,
            WorkspaceMember.user_id.in_(target_user_ids)
        )
    )
    existing_member_ids = set(existing_members.scalars().all())

    # Lọc những người ĐÃ ĐƯỢC MỜI (đang chờ)
    existing_invites = await db.execute(
        select(WorkspaceInvitation.invited_user_id).where(
            WorkspaceInvitation.workspace_id == group_id,
            WorkspaceInvitation.invited_user_id.in_(target_user_ids),
            WorkspaceInvitation.status == "pending"
        )
    )
    existing_invite_ids = set(existing_invites.scalars().all())

    # Chốt danh sách cuối cùng cần mời
    valid_user_ids = set(target_user_ids) - existing_member_ids - existing_invite_ids

    if not valid_user_ids:
        return BulkInviteOut(message="Tất cả người dùng được chọn đã có trong nhóm hoặc đã được mời", invited_count=0)

    # Bulk Insert Lời mời
    new_invitations = [
        WorkspaceInvitation(
            workspace_id=group_id,
            invited_user_id=uid,
            invited_by=current_user.id,
            message=payload.message,
            status="pending"
        ) for uid in valid_user_ids
    ]
    db.add_all(new_invitations)

    # Bulk Insert Thông báo
    new_notifications = [
        Notification(
            user_id=uid,
            type="group_invitation",
            workspace_id=group_id,
            document_id=None,
            message=f"Bạn được mời tham gia nhóm {workspace.name}."
        ) for uid in valid_user_ids
    ]
    db.add_all(new_notifications)

    await db.commit()

    return BulkInviteOut(
        message=f"Đã gửi lời mời thành công tới {len(valid_user_ids)} người", 
        invited_count=len(valid_user_ids)
    )

@router.get("/groups/{group_id}/invitations/", response_model=list[InvitationOut])
async def list_sent_invitations(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_owner(db, group_id, current_user.id)
    result = await db.execute(
        select(WorkspaceInvitation)
        .options(selectinload(WorkspaceInvitation.workspace), selectinload(WorkspaceInvitation.inviter))
        .where(WorkspaceInvitation.workspace_id == group_id)
        .order_by(WorkspaceInvitation.created_at.desc())
    )
    return [_invitation_out(invitation) for invitation in result.scalars().all()]


@router.delete("/groups/{group_id}/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_invitation(
    group_id: int,
    invitation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_owner(db, group_id, current_user.id)
    invitation = await db.get(WorkspaceInvitation, invitation_id)
    if not invitation or invitation.workspace_id != group_id:
        raise HTTPException(404, "Không tìm thấy lời mời")
    await db.delete(invitation)
    await db.commit()


@router.get("/invitations/", response_model=list[InvitationOut])
async def list_my_invitations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkspaceInvitation)
        .options(selectinload(WorkspaceInvitation.workspace), selectinload(WorkspaceInvitation.inviter))
        .where(WorkspaceInvitation.invited_user_id == current_user.id)
        .order_by(WorkspaceInvitation.created_at.desc())
    )
    return [_invitation_out(invitation) for invitation in result.scalars().all()]


@router.post("/invitations/{invitation_id}/accept", status_code=status.HTTP_204_NO_CONTENT)
async def accept_invitation(
    invitation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invitation = await db.get(WorkspaceInvitation, invitation_id)
    if not invitation or invitation.invited_user_id != current_user.id or invitation.status != "pending":
        raise HTTPException(404, "Không tìm thấy lời mời")
    workspace = await db.get(Workspace, invitation.workspace_id)
    invitation.status = "accepted"
    invitation.responded_at = datetime.utcnow()
    db.add(
        WorkspaceMember(
            workspace_id=invitation.workspace_id,
            user_id=current_user.id,
            permission_level=workspace.default_member_permission or "view",
        )
    )
    db.add(
        Notification(
            user_id=workspace.owner_id,
            type="group_invitation_accepted",
            workspace_id=workspace.id,
            document_id=None,
            message=f"{current_user.full_name or current_user.username} đã chấp nhận lời mời vào nhóm {workspace.name}.",
        )
    )
    await db.commit()


@router.post("/invitations/{invitation_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
async def reject_invitation(
    invitation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invitation = await db.get(WorkspaceInvitation, invitation_id)
    if not invitation or invitation.invited_user_id != current_user.id or invitation.status != "pending":
        raise HTTPException(404, "Không tìm thấy lời mời")
    invitation.status = "rejected"
    invitation.responded_at = datetime.utcnow()
    await db.commit()


@router.get("/groups/{group_id}/folders/", response_model=list[FolderOut])
async def list_group_folders(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_member(db, group_id, current_user.id)
    return await get_folders_with_stats(db, current_user.id, group_id)

@router.post("/groups/{group_id}/folders", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
@router.post("/groups/{group_id}/folders/", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
async def create_group_folder(
    group_id: int,
    folder_in: FolderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_write_permission(db, group_id, current_user.id)

    new_folder = Folder(
        name=folder_in.name,
        color=folder_in.color or "#2196F3",
        owner_id=current_user.id,
        workspace_id=group_id,
    )

    # Gán trực tiếp qua relationship folder_tags (không bị vướng viewonly)
    if folder_in.tag_ids:
        new_folder.folder_tags = [FolderTag(tag_id=tid) for tid in folder_in.tag_ids]

    db.add(new_folder)
    await db.commit()

    folders = await get_folders_with_stats(db, current_user.id, group_id)
    created_folder = next((f for f in folders if f["id"] == new_folder.id), None)

    return created_folder or new_folder


@router.post("/groups/", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
async def create_group(
    payload: GroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = Workspace(
        type="group",
        name=payload.name,
        description=payload.description,
        owner_id=current_user.id,
        default_member_permission=payload.default_member_permission,
    )
    db.add(workspace)
    await db.flush() # Flush để lấy workspace.id trước khi gán cho member
    
    # BỔ SUNG: Thêm chủ nhóm vào bảng thành viên với quyền cao nhất (full)
    db.add(
        WorkspaceMember(
            workspace_id=workspace.id,
            user_id=current_user.id,
            permission_level="full",
        )
    )
    
    await db.commit()
    await db.refresh(workspace)
    return workspace

@router.get("/groups/{group_id}/trash/", response_model=list[DocumentOut])
async def list_group_trash(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_owner(db, group_id, current_user.id)
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.tags))
        .where(Document.workspace_id == group_id, Document.is_deleted == True)
        .order_by(Document.deleted_at.desc())
    )
    return result.scalars().all()


@router.post("/groups/{group_id}/trash/{document_id}/restore", status_code=status.HTTP_204_NO_CONTENT)
async def restore_group_document(
    group_id: int,
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_owner(db, group_id, current_user.id)
    document = await db.get(Document, document_id)
    if not document or document.workspace_id != group_id or not document.is_deleted:
        raise HTTPException(404, "Không tìm thấy tài liệu trong thùng rác")
    document.is_deleted = False
    document.deleted_at = None
    await db.commit()

# ==========================================
# 1. API XÓA THƯ MỤC (Bọc cả 2 route)
# ==========================================
@router.delete("/groups/{group_id}/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/groups/{group_id}/folders/{folder_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group_folder(
    group_id: int,
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_full_permission(db, group_id, current_user.id)
    
    folder = await db.get(Folder, folder_id)
    if not folder or folder.workspace_id != group_id:
        raise HTTPException(status_code=404, detail="Không tìm thấy thư mục trong nhóm này")
    
    await db.delete(folder)
    await db.commit()


# ==========================================
# 2. API CẬP NHẬT THƯ MỤC (Bọc cả 2 route) 
# Để khi bạn sửa thư mục cũng không bị lỗi 405
# ==========================================
@router.patch("/groups/{group_id}/folders/{folder_id}", response_model=FolderOut)
@router.patch("/groups/{group_id}/folders/{folder_id}/", response_model=FolderOut)
async def update_group_folder(
    group_id: int,
    folder_id: int,
    payload: FolderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_full_permission(db, group_id, current_user.id)
    
    folder = await db.get(Folder, folder_id)
    if not folder or folder.workspace_id != group_id:
        raise HTTPException(status_code=404, detail="Không tìm thấy thư mục trong nhóm này")
    
    if payload.name is not None: 
        folder.name = payload.name
    if payload.color is not None: 
        folder.color = payload.color

    if payload.tag_ids is not None:
        await db.execute(delete(FolderTag).where(FolderTag.folder_id == folder_id))
        
        for tid in payload.tag_ids:
            db.add(FolderTag(folder_id=folder_id, tag_id=tid))
        
    await db.commit()
    
    folders = await get_folders_with_stats(db, current_user.id, group_id)
    return next((f for f in folders if f["id"] == folder_id), folder)

# ==========================================
# QUẢN LÝ TAGS CỦA TÀI LIỆU TRONG GROUP
# ==========================================

@router.post("/groups/{group_id}/documents/{document_id}/tags", status_code=status.HTTP_204_NO_CONTENT)
async def add_tags_to_group_document(
    group_id: int,
    document_id: int,
    payload: AddTagsToFolder, # Tái sử dụng schema chứa list tag_ids
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_full_permission(db, group_id, current_user.id)
    
    document = await db.get(Document, document_id)
    if not document or document.workspace_id != group_id or document.is_deleted:
        raise HTTPException(404, "Không tìm thấy tài liệu trong nhóm này")
    
    for tag_id in payload.tag_ids:
        # Dùng SQLAlchemy Core để insert vào bảng trung gian document_tags
        # Bỏ qua nếu đã tồn tại bằng cách kiểm tra trước
        check_stmt = select(document_tags).where(
            and_(
                document_tags.c.document_id == document_id,
                document_tags.c.tag_id == tag_id
            )
        )
        existing = (await db.execute(check_stmt)).first()
        if not existing:
            insert_stmt = document_tags.insert().values(document_id=document_id, tag_id=tag_id)
            await db.execute(insert_stmt)
            
    await db.commit()

@router.delete("/groups/{group_id}/documents/{document_id}/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_tag_from_group_document(
    group_id: int,
    document_id: int,
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_full_permission(db, group_id, current_user.id)
    
    document = await db.get(Document, document_id)
    if not document or document.workspace_id != group_id or document.is_deleted:
        raise HTTPException(404, "Không tìm thấy tài liệu trong nhóm này")
    
    delete_stmt = delete(document_tags).where(
        and_(
            document_tags.c.document_id == document_id,
            document_tags.c.tag_id == tag_id
        )
    )
    await db.execute(delete_stmt)
    await db.commit()
    
    # ==========================================
# QUẢN LÝ DANH MỤC TAGS DÙNG CHUNG CỦA GROUP
# ==========================================

@router.get("/groups/{group_id}/tags/", response_model=list[TagOut])
async def list_group_tags(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách tất cả các tags có trong Group (Ai là thành viên cũng xem được)"""
    await require_member(db, group_id, current_user.id)
    
    result = await db.execute(
        select(Tag)
        .where(Tag.workspace_id == group_id)
        .order_by(Tag.name.asc())
    )
    return result.scalars().all()


@router.post("/groups/{group_id}/tags/", response_model=TagOut, status_code=status.HTTP_201_CREATED)
async def create_group_tag(
    group_id: int,
    payload: TagCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tạo tag mới cho Group (Yêu cầu quyền Cố vấn/Admin)"""
    await require_full_permission(db, group_id, current_user.id)
    
    # Kiểm tra tag trùng tên trong group
    existing_tag = await db.execute(
        select(Tag).where(
            Tag.workspace_id == group_id,
            func.lower(Tag.name) == payload.name.lower()
        )
    )
    if existing_tag.scalar_one_or_none():
        raise HTTPException(400, "Nhãn dán với tên này đã tồn tại trong nhóm")

    new_tag = Tag(
        name=payload.name,
        color=payload.color,
        owner_id=current_user.id, # Lưu lại ai là người tạo
        workspace_id=group_id     # Gắn tag này vào Group
    )
    db.add(new_tag)
    await db.commit()
    await db.refresh(new_tag)
    return new_tag


@router.patch("/groups/{group_id}/tags/{tag_id}", response_model=TagOut)
async def update_group_tag(
    group_id: int,
    tag_id: int,
    payload: TagUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sửa tên/màu tag của Group"""
    await require_full_permission(db, group_id, current_user.id)
    
    tag = await db.get(Tag, tag_id)
    if not tag or tag.workspace_id != group_id:
        raise HTTPException(404, "Không tìm thấy nhãn dán trong nhóm này")
    
    if payload.name is not None:
        # Kiểm tra trùng tên với các tag khác
        existing_tag = await db.execute(
            select(Tag).where(
                Tag.workspace_id == group_id,
                Tag.id != tag_id,
                func.lower(Tag.name) == payload.name.lower()
            )
        )
        if existing_tag.scalar_one_or_none():
            raise HTTPException(400, "Nhãn dán với tên này đã tồn tại trong nhóm")
        tag.name = payload.name
        
    if payload.color is not None:
        tag.color = payload.color
        
    await db.commit()
    await db.refresh(tag)
    return tag


@router.delete("/groups/{group_id}/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group_tag(
    group_id: int,
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Xóa tag khỏi Group (Các tài liệu/thư mục đang gắn tag này sẽ tự động bị gỡ tag nếu DB setup cascade)"""
    await require_full_permission(db, group_id, current_user.id)
    
    tag = await db.get(Tag, tag_id)
    if not tag or tag.workspace_id != group_id:
        raise HTTPException(404, "Không tìm thấy nhãn dán trong nhóm này")
    
    await db.delete(tag)
    await db.commit()
