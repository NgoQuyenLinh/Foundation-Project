// src/pages/group/hooks/useGroupDocuments.ts
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { groupService } from "@/services/groupService";
import { groupDocumentService } from "@/services/documentService";

export function useGroupDocuments(groupId: number, hasWorkspace: boolean) {
  const queryClient = useQueryClient();

  const [isGroupRenameModalOpen, setIsGroupRenameModalOpen] = useState(false);
  const [renamingGroupDoc, setRenamingGroupDoc] = useState<{ id: string | number; title: string } | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const { data: documentsData, isLoading: docsLoading } = useQuery({
    queryKey: ["group-documents", groupId],
    queryFn: () => groupService.getDocuments(groupId),
    enabled: hasWorkspace,
  });

  const documents = documentsData?.items ?? [];

  const invalidateDocQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["group-documents", groupId] });
    queryClient.invalidateQueries({ queryKey: ["group-trash", groupId] });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  };

  const saveDocument = useMutation({
    mutationFn: (docId: number) => groupService.saveToPersonal(groupId, docId),
    onSuccess: invalidateDocQueries,
  });

  const deleteDocument = useMutation({
    mutationFn: (docId: number) => groupService.deleteDocument(groupId, docId),
    onSuccess: invalidateDocQueries,
  });

  const renameGroupDocumentMutation = useMutation({
    mutationFn: ({ id, title }: { id: string | number; title: string }) =>
      groupService.updateDocument(groupId, Number(id), { title }),
    onSuccess: () => {
      invalidateDocQueries();
      setIsGroupRenameModalOpen(false);
      setRenamingGroupDoc(null);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (fd: FormData) => groupDocumentService.upload(fd, groupId),
    onSuccess: () => invalidateDocQueries(),
  });

  const handleRenameDocument = (docId: string | number, currentTitle: string) => {
    setRenamingGroupDoc({ id: docId, title: currentTitle });
    setIsGroupRenameModalOpen(true);
  };

  return {
    documents, docsLoading,
    isUploadModalOpen, setIsUploadModalOpen,
    isGroupRenameModalOpen, setIsGroupRenameModalOpen,
    renamingGroupDoc, setRenamingGroupDoc,
    saveDocument, deleteDocument, renameGroupDocumentMutation, uploadMutation,
    handleRenameDocument,
  };
}