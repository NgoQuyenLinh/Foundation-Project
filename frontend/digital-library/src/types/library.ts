// frontend/digital-library/src/types/library.ts

export interface Faculty {
  id: number;
  code: string;
  name: string;
  document_count: number;
  subject_count: number;
}

export interface Subject {
  id: number;
  faculty_id: number;
  code: string;
  name: string;
  description?: string | null;
  document_count: number;
  avg_rating: number;
  created_at?: string | null;
}

export interface CommunityDocument {
  id: number;
  title: string;
  description?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  subject_id?: number | null;
  subject_name?: string | null;
  faculty_id?: number | null;
  faculty_name?: string | null;
  doc_type?: string | null;
  academic_year?: string | null;
  owner_id: number;
  contributed_by: string;
  rating_avg: number;
  rating_count: number;
  download_count: number;
  created_at?: string | null;
}

export interface Rating {
  id: number;
  document_id: number;
  user_id: number;
  user_name: string;
  stars: number;
  comment?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Submission {
  id: number;
  source_document_id: number;
  source_document_title: string;
  published_document_id?: number | null;
  submitter_id: number;
  submitter_name: string;
  subject_id: number;
  subject_name: string;
  faculty_name: string;
  academic_year?: string | null;
  doc_type?: string | null;
  note?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  created_at?: string | null;
}

export interface SubmitPayload {
  source_document_id: number;
  subject_id: number;
  academic_year?: string;
  doc_type?: string;
  note?: string;
}

export interface PaginatedCommunityDocuments {
  items: CommunityDocument[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedSubmissions {
  items: Submission[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
