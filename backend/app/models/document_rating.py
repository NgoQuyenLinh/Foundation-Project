# app/models/document_rating.py
from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, ForeignKey, Text, CheckConstraint, UniqueConstraint, DateTime, func
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .document import Document
    from .user import User

class DocumentRating(Base, TimestampMixin):
    __tablename__ = "document_ratings"
    __table_args__ = (
        CheckConstraint("stars >= 1 AND stars <= 5", name="check_document_ratings_stars_range"),
        UniqueConstraint("document_id", "user_id", name="uq_document_ratings_document_user"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    stars: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="ratings", lazy="selectin")
    user: Mapped["User"] = relationship("User", back_populates="ratings", lazy="selectin")
