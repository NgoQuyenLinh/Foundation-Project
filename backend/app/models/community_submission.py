# app/models/community_submission.py
from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey, Text, DateTime
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .document import Document
    from .user import User
    from .subject import Subject

class CommunitySubmission(Base, TimestampMixin):
    __tablename__ = "community_submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_document_id: Mapped[int] = mapped_column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    published_document_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    submitter_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[int] = mapped_column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    academic_year: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    doc_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # pending, approved, rejected
    reviewed_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reject_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    source_document: Mapped["Document"] = relationship("Document", foreign_keys=[source_document_id], lazy="selectin")
    published_document: Mapped[Optional["Document"]] = relationship("Document", foreign_keys=[published_document_id], lazy="selectin")
    submitter: Mapped["User"] = relationship("User", foreign_keys=[submitter_id], lazy="selectin")
    reviewer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reviewed_by], lazy="selectin")
    subject: Mapped["Subject"] = relationship("Subject", back_populates="submissions", lazy="selectin")
