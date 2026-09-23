# backend/app/schemas/library.py
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, ConfigDict, Field

class FacultyLibraryOut(BaseModel):
    id: int
    code: str
    name: str
    document_count: int = 0
    subject_count: int = 0
    model_config = ConfigDict(from_attributes=True)

class SubjectOut(BaseModel):
    id: int
    faculty_id: int
    code: str
    name: str
    description: Optional[str] = None
    document_count: int = 0
    avg_rating: float = 0.0
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class RatingCreate(BaseModel):
    stars: int = Field(..., ge=1, le=5, description="Điểm đánh giá từ 1 đến 5 sao")
    comment: Optional[str] = None

class RatingUpdate(BaseModel):
    stars: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None

class RatingOut(BaseModel):
    id: int
    document_id: int
    user_id: int
    user_name: str
    stars: int
    comment: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class SubmissionCreate(BaseModel):
    source_document_id: int
    subject_id: int
    academic_year: Optional[str] = None
    doc_type: Optional[str] = None
    note: Optional[str] = None

class SubmissionRejectPayload(BaseModel):
    reason: str = Field(..., min_length=5, description="Lý do từ chối tài liệu")

class SubmissionOut(BaseModel):
    id: int
    source_document_id: int
    source_document_title: str
    published_document_id: Optional[int] = None
    submitter_id: int
    submitter_name: str
    subject_id: int
    subject_name: str
    faculty_name: str
    academic_year: Optional[str] = None
    doc_type: Optional[str] = None
    note: Optional[str] = None
    status: str  # pending | approved | rejected
    reject_reason: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class CommunityDocumentOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    faculty_id: Optional[int] = None
    faculty_name: Optional[str] = None
    doc_type: Optional[str] = None
    academic_year: Optional[str] = None
    owner_id: int
    contributed_by: str
    rating_avg: float = 0.0
    rating_count: int = 0
    download_count: int = 0
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class PaginatedCommunityDocuments(BaseModel):
    items: List[CommunityDocumentOut]
    total: int
    page: int
    page_size: int
    total_pages: int

class PaginatedSubmissions(BaseModel):
    items: List[SubmissionOut]
    total: int
    page: int
    page_size: int
    total_pages: int
