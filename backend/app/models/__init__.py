# app/models/__init__.py
from .base import Base, TimestampMixin
from .faculty import Faculty
from .academic_class import Class
from .user import User
from .category import Category
from .tag import Tag
from .workspace import Workspace
from .workspace_member import WorkspaceMember
from .workspace_invitation import WorkspaceInvitation
from .document_tag import document_tags, document_tags as DocumentTag
from .document import Document
from .document_version import DocumentVersion
from .note import Note
from .trash_batch import TrashBatch
from .document_share import DocumentShare
from .notification import Notification
from .favorite import Favorite
from .download_log import DownloadLog
from .processing_job import ProcessingJob
from .folder import Folder
from .folder_tag import FolderTag
from .subject import Subject
from .community_submission import CommunitySubmission
from .document_rating import DocumentRating


__all__ = [
    "Base",
    "TimestampMixin",
    "Faculty",
    "Class",
    "User",
    "Category",
    "Tag",
    "Workspace",
    "WorkspaceMember",
    "WorkspaceInvitation",
    "document_tags",
    "Document",
    "DocumentVersion",
    "Note",
    "TrashBatch",
    "DocumentShare",
    "Notification",
    "Favorite",
    "DownloadLog",
    "ProcessingJob",
    "Folder",
    "FolderTag",
    "Subject",
    "CommunitySubmission",
    "DocumentRating",
]