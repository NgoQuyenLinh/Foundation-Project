# backend/app/schemas/group.py

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


PermissionLevel = Literal["view", "edit", "full"]


class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    default_member_permission: PermissionLevel = "view"


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None


class WorkspaceOut(BaseModel):
    id: int
    type: str
    name: str
    description: Optional[str] = None
    owner_id: int
    default_member_permission: PermissionLevel = "view"
    is_deleted: bool = False
    is_dissolving: bool = False
    dissolve_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class GroupListItem(WorkspaceOut):
    member_count: int
    my_permission: PermissionLevel
    is_owner: bool
    role: str
    last_updated: Optional[datetime] = None


class MemberOut(BaseModel):
    user_id: int
    username: str
    full_name: Optional[str] = None
    role: str
    student_code: Optional[str] = None
    permission_level: PermissionLevel
    joined_at: Optional[datetime] = None
    is_owner: bool


class InviteCreate(BaseModel):
    identifier: str = Field(..., min_length=1, max_length=255)
    message: Optional[str] = Field(default=None, max_length=500)


class InvitationOut(BaseModel):
    id: int
    workspace_id: int
    workspace_name: str
    invited_by_name: str
    message: Optional[str] = None
    permission_level: PermissionLevel
    created_at: Optional[datetime] = None
    status: Literal["pending", "accepted", "rejected"]


class PermissionUpdate(BaseModel):
    permission_level: PermissionLevel


class TransferOwnerPayload(BaseModel):
    new_owner_id: int


class ShareDocumentsPayload(BaseModel):
    document_ids: list[int] = Field(default_factory=list)


class ShareFolderPayload(BaseModel):
    folder_id: int


class ShareResult(BaseModel):
    shared_count: int
    
class BulkInviteCreate(BaseModel):
    identifiers: List[str] = []           # Chứa email, username, mssv cụ thể
    class_ids: List[int] = []             # Chứa ID của các lớp
    faculty_ids: List[int] = []           # Chứa ID của các khoa
    student_code_patterns: List[str] = [] # Chứa các chuỗi mã sinh viên (vd: '241')
    message: Optional[str] = ""

class BulkInviteOut(BaseModel):
    message: str
    invited_count: int
