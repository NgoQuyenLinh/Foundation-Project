// frontend/digital-library/src/types/activity.ts

export interface ActivityLog {
  id: number;
  document_id: number;
  user_id: number;
  action: string;
  workspace_context: 'personal' | 'group' | 'library';
  workspace_id: number | null;
  extra_data: Record<string, unknown>;
  created_at: string;
  actor_name?: string | null;
  document_title?: string | null;
}

export interface ActivityListResponse {
  items: ActivityLog[];
  total: number;
  page: number;
  total_pages: number;
}

export interface DocumentStats {
  document_id: number;
  view_count: number;
  download_count: number;
  save_count: number;
  share_count: number;
  unique_viewers: number;
  trending_score: number;
  last_activity_at: string | null;
}

export interface MyStats {
  total_uploads: number;
  total_views: number;
  total_downloads: number;
  recent_activities: ActivityLog[];
  activity_by_day: { date: string; count: number }[];
}
