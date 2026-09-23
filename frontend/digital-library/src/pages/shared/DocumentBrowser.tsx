/**
 * Reusable Document Browser — dùng cho Personal, Group, Class, Faculty, School
 * - Nhận config workspace
 * - Quản lý state: filters, folders, pagination, upload
 * - Render DocumentCard + FolderCard
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Upload, FolderPlus, FileX, FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DocumentCard } from '@/components/shared/DocumentCard';
import { FolderCard } from '@/components/shared/FolderCard';
import EmptyState from '@/components/shared/EmptyState';
import { useWorkspaceOperations } from '@/hooks/useWorkspaceOperations';
import type { WorkspaceConfig } from '@/services/workspaceService';
import type { DocumentAction } from '@/components/shared/DocumentContextMenu';
import { formatSize } from '@/utils/formatSize';
import { formatRelativeDate } from '@/utils/formatDate';

interface DocumentBrowserProps {
  workspace: WorkspaceConfig;
  showSaveToPersonal?: boolean;
  onDocumentAction?: (action: DocumentAction | string, docId: string | number) => void;
  navigationPath?: (docId: string | number) => string;
  UploadModalComponent?: React.ComponentType<any>;
  CreateFolderModalComponent?: React.ComponentType<any>;
}

export function DocumentBrowser({
  workspace,
  showSaveToPersonal: _showSaveToPersonal = false,
  onDocumentAction,
  navigationPath: _navigationPath,
  UploadModalComponent,
  CreateFolderModalComponent,
}: DocumentBrowserProps) {
  const ops = useWorkspaceOperations(workspace);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'document' | 'image' | 'pdf' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);

  // Fetch documents
  const { data: docData, isLoading: docsLoading } = useQuery({
    queryKey: ['documents', workspace.type, workspace.id, selectedFolderId, page],
    queryFn: () => ops.getDocuments({ page, folder_id: selectedFolderId || undefined }),
  });

  // Fetch folders
  const { data: folders, isLoading: foldersLoading } = useQuery({
    queryKey: ['folders', workspace.type, workspace.id],
    queryFn: () => ops.getFolders(),
  });

  // Delete document mutation
  const deleteDocMutation = useMutation({
    mutationFn: (docId: number) => ops.deleteDocumentToTrash(docId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  const handleDocumentAction = (action: DocumentAction | string, docId: string | number) => {
    if (onDocumentAction) {
      onDocumentAction(action, docId);
    }

    if (action === 'delete') {
      if (window.confirm('Xóa tài liệu này?')) {
        deleteDocMutation.mutate(Number(docId));
      }
    }
  };

  const rawDocs = Array.isArray(docData) ? docData : docData?.items ?? [];

  const allDocCards = rawDocs.map((doc: any) => ({
    id: doc.id.toString(),
    name: doc.title || doc.name || '',
    type: doc.file_type || 'unknown',
    updatedAt: doc.created_at ? formatRelativeDate(doc.created_at) : '',
    size: doc.file_size ? formatSize(doc.file_size) : '0 B',
    thumbnail_path: doc.thumbnail_path,
    tags: doc.tags || [],
  }));

  const filteredDocs = allDocCards.filter((doc: any) => {
    if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (activeTab === 'image' && !doc.type.includes('image')) return false;
    if (activeTab === 'pdf' && !doc.type.includes('pdf')) return false;
    if (activeTab === 'document' && !doc.type.includes('word') && !doc.type.includes('document')) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[240px] flex-1">
          <Input
            placeholder="Tìm nhanh..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="ml-auto">
          <Button
            variant="primary"
            icon={<Upload className="h-4 w-4" />}
            onClick={() => setIsUploadOpen(true)}
          >
            + Tải lên
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200">
        {(['all', 'document', 'image', 'pdf', 'other'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-primary-600 text-primary-600 font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'all' && 'Tất cả'}
            {tab === 'document' && 'Tài liệu'}
            {tab === 'image' && 'Hình ảnh'}
            {tab === 'pdf' && 'PDF'}
            {tab === 'other' && 'Khác'}
          </button>
        ))}
      </div>

      {/* Folders Section */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Thư mục</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {foldersLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-200 animate-pulse" />
            ))
          ) : (
            <>
              <div
                onClick={() => { setSelectedFolderId(null); setPage(1); }}
                className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                  selectedFolderId === null ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <FolderOpen className="h-6 w-6 text-gray-500" />
                <p className="text-sm font-semibold text-gray-900 mt-1">Tất cả</p>
              </div>
              {folders?.map((folder: any) => (
                <div
                  key={folder.id}
                  onClick={() => { setSelectedFolderId(folder.id); setPage(1); }}
                  className="cursor-pointer"
                >
                  <FolderCard 
                    id={folder.id} 
                    name={folder.name} 
                    count={folder.document_count} 
                    color={folder.color}
                    onClick={() => { setSelectedFolderId(folder.id); setPage(1); }}
                  />
                </div>
              ))}
            </>
          )}
          <button
            onClick={() => setIsCreateFolderOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-5 text-sm font-medium text-gray-400 hover:border-primary-300 hover:text-primary-600 transition-all"
          >
            <FolderPlus className="h-5 w-5" />
            + Thêm thư mục
          </button>
        </div>
      </section>

      {/* Documents Section */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Tài liệu</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {docsLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-gray-200 animate-pulse" />
            ))
          ) : filteredDocs.length > 0 ? (
            filteredDocs.map((doc: any) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onAction={handleDocumentAction}
              />
            ))
          ) : (
            <div className="col-span-full">
              <EmptyState
                icon={<FileX className="h-6 w-6" />}
                title="Chưa có tài liệu nào"
                description="Tải lên tài liệu đầu tiên của bạn ngay."
              />
            </div>
          )}
        </div>
      </section>

      {/* Upload Modal */}
      {isUploadOpen && UploadModalComponent && (
        <UploadModalComponent onClose={() => setIsUploadOpen(false)} />
      )}

      {/* Create Folder Modal */}
      {isCreateFolderOpen && CreateFolderModalComponent && (
        <CreateFolderModalComponent onClose={() => setIsCreateFolderOpen(false)} />
      )}
    </div>
  );
}
