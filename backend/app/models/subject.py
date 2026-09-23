# app/models/subject.py
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey, Text
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .faculty import Faculty
    from .document import Document
    from .community_submission import CommunitySubmission

class Subject(Base, TimestampMixin):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    faculty_id: Mapped[int] = mapped_column(Integer, ForeignKey("faculties.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    faculty: Mapped["Faculty"] = relationship("Faculty", back_populates="subjects")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="subject")
    submissions: Mapped[List["CommunitySubmission"]] = relationship("CommunitySubmission", back_populates="subject")
