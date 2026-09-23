// frontend/digital-library/src/services/libraryService.ts

import api from './api';
import type {
  Faculty,
  Subject,
  CommunityDocument,
  Rating,
  Submission,
  SubmitPayload,
  PaginatedCommunityDocuments,
  PaginatedSubmissions,
} from '@/types/library';

export interface SearchLibraryParams {
  q?: string;
  faculty_id?: number;
  subject_id?: number;
  doc_type?: string;
  academic_year?: string;
  sort?: 'newest' | 'popular' | 'rating';
  page?: number;
  page_size?: number;
}

export interface GetDocumentsParams {
  page?: number;
  page_size?: number;
  sort?: 'newest' | 'popular' | 'rating';
  doc_type?: string;
  academic_year?: string;
}

export interface GetAdminSubmissionsParams {
  status?: 'pending' | 'approved' | 'rejected';
  subject_id?: number;
  faculty_id?: number;
  page?: number;
  page_size?: number;
}

export const libraryService = {
  // Public
  getFaculties: (): Promise<Faculty[]> =>
    api.get('/library/faculties/').then((r) => r.data),

  getSubjects: (facultyId: number): Promise<Subject[]> =>
    api.get(`/library/faculties/${facultyId}/subjects/`).then((r) => r.data),

  getDocuments: (
    subjectId: number,
    params?: GetDocumentsParams
  ): Promise<PaginatedCommunityDocuments> =>
    api.get(`/library/subjects/${subjectId}/documents/`, { params }).then((r) => r.data),

  getDocument: (docId: number): Promise<CommunityDocument> =>
    api.get(`/library/documents/${docId}`).then((r) => r.data),

  getDownloadUrl: (docId: number): string =>
    `${api.defaults.baseURL ?? 'http://localhost:8000'}/library/documents/${docId}/download`,

  search: (params: SearchLibraryParams): Promise<PaginatedCommunityDocuments> =>
    api.get('/library/search/', { params }).then((r) => r.data),

  getRatings: (docId: number, params?: { page?: number; page_size?: number }): Promise<Rating[]> =>
    api.get(`/library/documents/${docId}/ratings/`, { params }).then((r) => r.data),

  // Auth required
  saveToPersonal: (docId: number): Promise<{ id: number; title: string; message: string }> =>
    api.post(`/library/documents/${docId}/save-to-personal`).then((r) => r.data),

  submitRating: (
    docId: number,
    payload: { stars: number; comment?: string }
  ): Promise<Rating> =>
    api.post(`/library/documents/${docId}/ratings/`, payload).then((r) => r.data),

  updateRating: (
    docId: number,
    ratingId: number,
    payload: { stars?: number; comment?: string }
  ): Promise<Rating> =>
    api.put(`/library/documents/${docId}/ratings/${ratingId}`, payload).then((r) => r.data),

  deleteRating: (docId: number, ratingId: number): Promise<void> =>
    api.delete(`/library/documents/${docId}/ratings/${ratingId}`).then((r) => r.data),

  submit: (payload: SubmitPayload): Promise<Submission> =>
    api.post('/library/submissions/', payload).then((r) => r.data),

  getMySubmissions: (): Promise<Submission[]> =>
    api.get('/library/submissions/my/').then((r) => r.data),

  // Admin
  getAdminSubmissions: (
    params?: GetAdminSubmissionsParams
  ): Promise<PaginatedSubmissions> =>
    api.get('/library/admin/submissions/', { params }).then((r) => r.data),

  getAdminSubmissionDetail: (id: number): Promise<Submission> =>
    api.get(`/library/admin/submissions/${id}`).then((r) => r.data),

  approveSubmission: (id: number): Promise<Submission> =>
    api.post(`/library/admin/submissions/${id}/approve`).then((r) => r.data),

  rejectSubmission: (id: number, reason: string): Promise<Submission> =>
    api.post(`/library/admin/submissions/${id}/reject`, { reason }).then((r) => r.data),
};
