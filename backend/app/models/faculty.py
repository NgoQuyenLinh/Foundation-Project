# app/models/faculty.py
from typing import TYPE_CHECKING, List
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .academic_class import Class
    from .user import User
    from .workspace import Workspace
    from .subject import Subject

class Faculty(Base, TimestampMixin):
    __tablename__ = "faculties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)

    # Relationships
    classes: Mapped[List["Class"]] = relationship("Class", back_populates="faculty")
    users: Mapped[List["User"]] = relationship("User", back_populates="faculty")
    workspaces: Mapped[List["Workspace"]] = relationship("Workspace", back_populates="ref_faculty")
    subjects: Mapped[List["Subject"]] = relationship("Subject", back_populates="faculty")