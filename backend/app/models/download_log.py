from typing import TYPE_CHECKING, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, ForeignKey, String, Index
from sqlalchemy.dialects.postgresql import JSONB
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .user import User
    from .document import Document
    from .workspace import Workspace


class DownloadLog(Base, TimestampMixin):
    __tablename__ = "download_logs"
    __table_args__ = (
        Index("ix_download_logs_document_id_created_at", "document_id", "created_at"),
        Index("ix_download_logs_user_id_created_at", "user_id", "created_at"),
        Index("ix_download_logs_action_created_at", "action", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey("documents.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(30), nullable=False)
    workspace_context: Mapped[str] = mapped_column(String(20), nullable=False, default="personal")
    workspace_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True
    )
    extra_data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    user: Mapped["User"] = relationship("User", back_populates="download_logs")
    document: Mapped["Document"] = relationship("Document", back_populates="activity_logs")