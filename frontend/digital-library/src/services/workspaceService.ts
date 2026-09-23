// frontend/digital-library/src/services/workspaceService.ts

import api from './api';

export type WorkspaceType = 'personal' | 'group' | 'class' | 'faculty' | 'school';

export interface WorkspaceConfig {
  type: WorkspaceType;
  id?: number | string;
  name?: string;
}

export interface WorkspaceOperations {
  getDocuments: (params?: any) => Promise<any>;
  getFolders: () => Promise<any>;
  deleteDocumentToTrash: (docId: number) => Promise<any>;
}

export function createWorkspaceOperations(config: WorkspaceConfig): WorkspaceOperations {
  return {
    getDocuments: (params?: any) => {
      if (config.type === 'group') {
        return api.get(`/workspaces/${config.id}/documents/`, { params }).then((r) => r.data);
      }
      return api.get('/documents/', { params }).then((r) => r.data);
    },
    getFolders: () => {
      if (config.type === 'group') {
        return api.get(`/workspaces/${config.id}/folders/`).then((r) => r.data);
      }
      return api.get('/folders/').then((r) => r.data);
    },
    deleteDocumentToTrash: (docId: number) => {
      return api.delete(`/documents/${docId}`);
    },
  };
}
