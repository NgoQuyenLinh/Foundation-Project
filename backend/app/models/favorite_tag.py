# backend/app/models/favorite_tag.py
from sqlalchemy import Table, Column, Integer, ForeignKey, ForeignKeyConstraint, Index
from .base import Base

favorite_tags = Table(
    "favorite_tags",
    Base.metadata,
    Column("user_id", Integer, primary_key=True),
    Column("document_id", Integer, primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
    ForeignKeyConstraint(
        ["user_id", "document_id"],
        ["favorites.user_id", "favorites.document_id"],
        ondelete="CASCADE",
        name="fk_favorite_tags_favorite",
    ),
    Index("ix_favorite_tags_tag_id", "tag_id"),
)
