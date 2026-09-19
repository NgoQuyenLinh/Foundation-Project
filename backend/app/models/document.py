# app/models/document.py
from typing import TYPE_CHECKING, List, Optional
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey, Text, Boolean, DateTime, BigInteger, Index
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .user import User
    from .workspace import Workspace
    from .category import Category
    from .tag import Tag
    from .document_version import DocumentVersion
    from .note import Note
    from .trash_batch import TrashBatch

class Document(Base, TimestampMixin):
    __tablename__ = "documents"
    __table_args__ = (
        Index("ix_documents_checksum", "checksum"),
        Index("ix_documents_search_vector", "search_vector", postgresql_using="gin"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    workspace_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("workspaces.id"))
    category_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("categories.id"))
    source_document_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("documents.id"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    thumbnail_path: Mapped[Optional[str]] = mapped_column(String(1024))
    file_type: Mapped[Optional[str]] = mapped_column(String(255))
    file_size: Mapped[Optional[int]] = mapped_column(BigInteger)
    checksum: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[Optional[str]] = mapped_column(Text)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True) 
    search_vector = mapped_column(TSVECTOR)
    is_important: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    is_deleted: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    is_orphaned: Mapped[bool] = mapped_column(Boolean, default=False)
    orphaned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    trash_source: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    trash_group_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    trash_batch_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("trash_batches.id"))

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="documents",lazy="selectin")
    workspace: Mapped[Optional["Workspace"]] = relationship("Workspace", back_populates="documents")
    category: Mapped[Optional["Category"]] = relationship("Category", back_populates="documents")
    source_document: Mapped[Optional["Document"]] = relationship("Document", remote_side=[id], back_populates="derived_documents")
    derived_documents: Mapped[List["Document"]] = relationship("Document", back_populates="source_document")
    tags: Mapped[List["Tag"]] = relationship("Tag", secondary="document_tags", back_populates="documents",lazy="selectin",)
    versions: Mapped[List["DocumentVersion"]] = relationship("DocumentVersion", back_populates="document")
    notes: Mapped[List["Note"]] = relationship("Note", back_populates="document")
    trash_batch: Mapped[Optional["TrashBatch"]] = relationship("TrashBatch", back_populates="documents")
    workspace: Mapped[Optional["Workspace"]] = relationship(
    "Workspace", back_populates="documents"
)
