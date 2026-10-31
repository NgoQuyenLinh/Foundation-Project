from typing import TYPE_CHECKING, List, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, Text, ForeignKey, CheckConstraint
from .base import Base, TimestampMixin
from .favorite_tag import favorite_tags

if TYPE_CHECKING:
    from .user import User
    from .document import Document
    from .tag import Tag


class Favorite(Base, TimestampMixin):
    __tablename__ = "favorites"
    __table_args__ = (
        CheckConstraint(
            "reading_status IN ('to_read', 'reading', 'completed')",
            name="chk_favorite_reading_status",
        ),
    )

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    document_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True
    )
    reading_status: Mapped[str] = mapped_column(
        String(20),
        default="to_read",
        server_default="to_read",
        nullable=False,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="favorites")
    document: Mapped["Document"] = relationship("Document", lazy="selectin")
    tags: Mapped[List["Tag"]] = relationship(
        "Tag",
        secondary=favorite_tags,
        primaryjoin="(Favorite.user_id == favorite_tags.c.user_id) & (Favorite.document_id == favorite_tags.c.document_id)",
        secondaryjoin="favorite_tags.c.tag_id == Tag.id",
        lazy="selectin",
        viewonly=False,
    )