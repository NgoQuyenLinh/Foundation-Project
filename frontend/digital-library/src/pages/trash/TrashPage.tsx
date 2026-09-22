// // src/pages/personal/TrashPage.tsx

// // ==========================================
// // 1. IMPORTS
// // ==========================================
// import { useMemo, useState } from "react";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import {
//   ArchiveRestore,
//   ChevronDown,
//   ChevronRight,
//   FileText,
//   HardDrive,
//   RotateCcw,
//   Star,
//   Trash2,
//   X,
// } from "lucide-react";

// // UI Components & Services
// import { Button } from "@/components/ui/Button";
// import { trashService } from "@/services/trashService";
// import { formatSize } from "@/utils/formatSize";
// import { cn } from "@/utils/cn";

// const getTrashSourceLabel = (source: TrashBatch["source"], groupName?: string | null) => {
//   if (source === "group_orphaned") {
//     return groupName ? `Từ nhóm ${groupName}` : "Từ nhóm đã giải tán";
//   }
//   return "Kho cá nhân";
// };

// // ==========================================
// // 2. TYPES
// // ==========================================
// interface TrashDocument {
//   id: number;
//   name: string;
//   type: string;
//   size: string;
//   source: "personal" | "group_orphaned" | string;
//   groupName?: string | null;
// }

// interface TrashBatch {
//   id: number;
//   deletedAt: string;
//   deletedAtTimestamp: number;
//   documentCount: number;
//   totalSize: string;
//   source: "personal" | "group_orphaned" | string;
//   groupName?: string | null;
//   expiresAt: string;
//   remainingDays: number;
//   documents: TrashDocument[];
//   docIds: number[];
// }

// // ==========================================
// // 3. MAIN COMPONENT
// // ==========================================
// export default function TrashPage() {
//   const queryClient = useQueryClient();
//   const [expandedBatchId, setExpandedBatchId] = useState<number | null>(null);
//   const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

//   // --- QUERIES ---
//   const { data: trashedDocs = [], isLoading } = useQuery({
//     queryKey: ["trash"],
//     queryFn: trashService.getAll,
//   });

//   // --- DATA GROUPING (HƯỚNG B) ---
//   const batches = useMemo(() => {
//     const grouped = new Map<number, typeof trashedDocs>();

//     trashedDocs.forEach((doc: any) => {
//       // Nếu doc không thuộc batch nào, coi như 1 batch riêng bằng doc.id
//       const batchKey = doc.trash_batch_id ?? doc.id;
//       if (!grouped.has(batchKey)) grouped.set(batchKey, []);
//       grouped.get(batchKey)!.push(doc);
//     });

//     return Array.from(grouped.entries())
//       .map(([batchId, docs]) => {
//         const firstDoc = docs[0];
//         const deletedAtDate = new Date(
//           firstDoc.deleted_at ?? firstDoc.updated_at ?? Date.now()
//         );
//         const expiresAtDate = new Date(deletedAtDate);
//         expiresAtDate.setDate(expiresAtDate.getDate() + 30);

//         const remainingDays = Math.max(
//           0,
//           Math.ceil((expiresAtDate.getTime() - Date.now()) / 86400000)
//         );

//         const totalBytes = docs.reduce(
//           (sum: number, d: any) => sum + (d.file_size ?? 0),
//           0
//         );

//         return {
//           id: batchId,
//           deletedAt: deletedAtDate.toLocaleString("vi-VN"),
//           deletedAtTimestamp: deletedAtDate.getTime(),
//           documentCount: docs.length,
//           totalSize: formatSize(totalBytes),
//           source: firstDoc.trash_source ?? "personal",
//           groupName: firstDoc.trash_group_name,
//           expiresAt: expiresAtDate.toLocaleDateString("vi-VN"),
//           remainingDays,
//           documents: docs.map((d: any) => ({
//             id: d.id,
//             name: d.title,
//             type: d.file_type?.split("/")[1]?.toUpperCase() ?? "FILE",
//             size: formatSize(d.file_size ?? 0),
//             source: d.trash_source ?? "personal",
//             groupName: d.trash_group_name,
//           })),
//           docIds: docs.map((d: any) => d.id),
//         };
//       })
//       .sort((a, b) => b.deletedAtTimestamp - a.deletedAtTimestamp);
//   }, [trashedDocs]);

//   // --- MUTATIONS ---
//   const restoreMutation = useMutation({
//     mutationFn: async (docIds: number[]) => {
//       await Promise.all(docIds.map((id) => trashService.restore(id)));
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["trash"] });
//       queryClient.invalidateQueries({ queryKey: ["documents"] });
//       setExpandedBatchId(null);
//     },
//   });

//   const emptyTrashMutation = useMutation({
//     mutationFn: trashService.emptyTrash,
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["trash"] });
//       setShowEmptyConfirm(false);
//     },
//   });

//   // --- HANDLERS ---
//   const handleRestoreBatch = (batchId: number) => {
//     const batch = batches.find((b) => b.id === batchId);
//     if (!batch) return;
//     restoreMutation.mutate(batch.docIds);
//   };

//   const handleEmptyTrash = () => {
//     emptyTrashMutation.mutate();
//   };

//   // --- STATISTICS ---
//   const totalDocuments = trashedDocs.length;
//   const totalStorageBytes = trashedDocs.reduce(
//     (sum: number, d: any) => sum + (d.file_size ?? 0),
//     0
//   );
//   const totalStorage = formatSize(totalStorageBytes);

//   // --- SKELETON LOADING ---
//   if (isLoading) {
//     return (
//       <div className="flex flex-col gap-6">
//         <section>
//           <div className="h-7 w-32 rounded bg-gray-200 animate-pulse" />
//           <div className="mt-2 h-4 w-80 rounded bg-gray-200 animate-pulse" />
//         </section>

//         <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
//           {Array.from({ length: 3 }).map((_, i) => (
//             <div key={i} className="h-20 rounded-xl bg-gray-200 animate-pulse" />
//           ))}
//         </div>

//         <div className="h-64 rounded-xl bg-gray-200 animate-pulse" />
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col gap-6">
//       {/* Page Header */}
//       <section>
//         <h1 className="text-xl font-semibold text-gray-900">Thùng rác</h1>
//         <p className="mt-1 text-sm text-gray-500">
//           Tài liệu trong thùng rác sẽ bị xóa vĩnh viễn sau 30 ngày.
//         </p>
//       </section>

//       {/* Statistics */}
//       <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
//         <StatCard
//           icon={<ArchiveRestore className="h-5 w-5" />}
//           iconClassName="bg-green-50 text-green-600"
//           label="Gói xóa"
//           value={batches.length}
//           description="Gói lưu trữ tạm thời"
//         />

//         <StatCard
//           icon={<FileText className="h-5 w-5" />}
//           iconClassName="bg-blue-50 text-blue-600"
//           label="Tài liệu"
//           value={totalDocuments}
//           description="Tổng số tệp tin"
//         />

//         <StatCard
//           icon={<HardDrive className="h-5 w-5" />}
//           iconClassName="bg-yellow-50 text-yellow-600"
//           label="Dung lượng"
//           value={totalStorage}
//           description="Khả năng phục hồi tối đa"
//         />
//       </section>

//       {/* Trash Batch Table */}
//       <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
//         {/* Table header */}
//         <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
//           <div>
//             <h2 className="text-sm font-semibold text-gray-800">
//               Các gói xóa gần đây
//             </h2>
//             <p className="mt-0.5 text-xs text-gray-400">
//               Các tài liệu được xóa theo từng đợt.
//             </p>
//           </div>

//           <Button
//             variant="outline"
//             size="sm"
//             icon={<Trash2 className="h-4 w-4" />}
//             disabled={batches.length === 0 || emptyTrashMutation.isPending}
//             onClick={() => setShowEmptyConfirm(true)}
//             className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
//           >
//             Dọn sạch thùng rác
//           </Button>
//         </div>

//         {batches.length === 0 ? (
//           <EmptyTrash />
//         ) : (
//           <>
//             {/* Desktop Table */}
//             <div className="hidden overflow-x-auto md:block">
//               <table className="w-full min-w-[760px] text-sm">
//                 <thead>
//                   <tr className="border-b border-gray-100 bg-gray-50/70 text-left text-xs text-gray-500">
//                     <th className="px-4 py-3 font-medium">Tên gói xóa</th>
//                     <th className="px-4 py-3 font-medium">Số tài liệu</th>
//                     <th className="px-4 py-3 font-medium">Dung lượng</th>
//                     <th className="px-4 py-3 font-medium">Tự động xóa sau</th>
//                     <th className="px-4 py-3 text-right font-medium">Thao tác</th>
//                   </tr>
//                 </thead>

//                 <tbody>
//                   {batches.map((batch) => (
//                     <TrashBatchRow
//                       key={batch.id}
//                       batch={batch}
//                       expanded={expandedBatchId === batch.id}
//                       isRestoring={restoreMutation.isPending}
//                       onToggle={() =>
//                         setExpandedBatchId((current) =>
//                           current === batch.id ? null : batch.id
//                         )
//                       }
//                       onRestore={() => handleRestoreBatch(batch.id)}
//                     />
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             {/* Mobile Cards */}
//             <div className="divide-y divide-gray-100 md:hidden">
//               {batches.map((batch) => (
//                 <MobileTrashBatch
//                   key={batch.id}
//                   batch={batch}
//                   expanded={expandedBatchId === batch.id}
//                   isRestoring={restoreMutation.isPending}
//                   onToggle={() =>
//                     setExpandedBatchId((current) =>
//                       current === batch.id ? null : batch.id
//                     )
//                   }
//                   onRestore={() => handleRestoreBatch(batch.id)}
//                 />
//               ))}
//             </div>
//           </>
//         )}
//       </section>

//       {/* Note */}
//       <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
//         <Star className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
//         <p className="text-xs leading-5 text-green-700">
//           <span className="font-semibold">Mẹo:</span> Bạn có thể khôi phục cả gói
//           hoặc xem chi tiết từng tài liệu để chọn khôi phục riêng.
//         </p>
//       </div>

//       {/* Empty Trash Confirmation Modal */}
//       {showEmptyConfirm && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
//           <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
//             <div className="flex items-start justify-between gap-4">
//               <div>
//                 <h3 className="text-base font-semibold text-gray-900">
//                   Dọn sạch thùng rác?
//                 </h3>
//                 <p className="mt-1 text-sm leading-5 text-gray-500">
//                   Tất cả tài liệu trong thùng rác sẽ bị xóa vĩnh viễn. Hành động
//                   này không thể hoàn tác.
//                 </p>
//               </div>

//               <button
//                 type="button"
//                 onClick={() => setShowEmptyConfirm(false)}
//                 className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
//               >
//                 <X className="h-5 w-5" />
//               </button>
//             </div>

//             <div className="mt-5 flex justify-end gap-2">
//               <Button
//                 variant="outline"
//                 disabled={emptyTrashMutation.isPending}
//                 onClick={() => setShowEmptyConfirm(false)}
//               >
//                 Hủy
//               </Button>

//               <Button
//                 variant="primary"
//                 disabled={emptyTrashMutation.isPending}
//                 onClick={handleEmptyTrash}
//                 className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
//               >
//                 {emptyTrashMutation.isPending ? "Đang xóa..." : "Dọn sạch"}
//               </Button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // ==========================================
// // 4. SUB-COMPONENTS
// // ==========================================
// interface StatCardProps {
//   icon: React.ReactNode;
//   iconClassName: string;
//   label: string;
//   value: string | number;
//   description: string;
// }

// function StatCard({
//   icon,
//   iconClassName,
//   label,
//   value,
//   description,
// }: StatCardProps) {
//   return (
//     <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
//       <div
//         className={cn(
//           "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
//           iconClassName
//         )}
//       >
//         {icon}
//       </div>

//       <div className="min-w-0">
//         <p className="text-xs text-gray-500">{label}</p>
//         <p className="mt-0.5 text-lg font-semibold leading-5 text-gray-900">
//           {value}
//         </p>
//         <p className="mt-1 truncate text-[10px] text-gray-400">
//           {description}
//         </p>
//       </div>
//     </div>
//   );
// }

// interface TrashBatchRowProps {
//   batch: TrashBatch;
//   expanded: boolean;
//   isRestoring?: boolean;
//   onToggle: () => void;
//   onRestore: () => void;
// }

// function TrashBatchRow({
//   batch,
//   expanded,
//   isRestoring,
//   onToggle,
//   onRestore,
// }: TrashBatchRowProps) {
//   return (
//     <>
//       <tr
//         className={cn(
//           "border-b border-gray-100 transition-colors hover:bg-gray-50/70",
//           expanded && "bg-gray-50/50"
//         )}
//       >
//         <td className="px-4 py-3">
//           <button
//             type="button"
//             onClick={onToggle}
//             className="flex min-w-0 items-center gap-2 text-left"
//           >
//             {expanded ? (
//               <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
//             ) : (
//               <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
//             )}

//             <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-orange-50 text-orange-500">
//               <Trash2 className="h-4 w-4" />
//             </div>

//             <div className="min-w-0">
//               <p className="truncate text-xs font-medium text-gray-800">
//                 Xóa ngày {batch.deletedAt.split(" ")[0]}
//               </p>
//               <div className="mt-1 flex flex-wrap items-center gap-1.5">
//                 <span className="text-[10px] text-gray-400">{batch.deletedAt}</span>
//                 <span
//                   className={cn(
//                     "rounded-full px-2 py-0.5 text-[10px] font-medium",
//                     batch.source === "group_orphaned"
//                       ? "bg-orange-50 text-orange-600"
//                       : "bg-gray-100 text-gray-500"
//                   )}
//                 >
//                   {getTrashSourceLabel(batch.source, batch.groupName)}
//                 </span>
//               </div>
//             </div>
//           </button>
//         </td>

//         <td className="px-4 py-3 text-xs text-gray-600">
//           {batch.documentCount} tệp tin
//         </td>

//         <td className="px-4 py-3 text-xs text-gray-600">
//           {batch.totalSize}
//         </td>

//         <td className="px-4 py-3">
//           <div>
//             <p
//               className={cn(
//                 "text-xs font-medium",
//                 batch.remainingDays <= 7 ? "text-red-600" : "text-red-500"
//               )}
//             >
//               Còn {batch.remainingDays} ngày
//             </p>
//             <p className="mt-0.5 text-[10px] text-gray-400">
//               {batch.expiresAt}
//             </p>
//           </div>
//         </td>

//         <td className="px-4 py-3 text-right">
//           <button
//             type="button"
//             disabled={isRestoring}
//             onClick={onRestore}
//             className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 transition-colors hover:text-green-700 disabled:opacity-50"
//           >
//             <RotateCcw className="h-3.5 w-3.5" />
//             {isRestoring ? "Đang khôi phục..." : "Khôi phục"}
//           </button>
//         </td>
//       </tr>

//       {expanded && (
//         <tr className="border-b border-gray-100 bg-gray-50/50">
//           <td colSpan={5} className="px-8 py-3">
//             <div className="rounded-lg border border-gray-200 bg-white">
//               <div className="border-b border-gray-100 px-3 py-2">
//                 <p className="text-xs font-semibold text-gray-700">
//                   Tài liệu trong gói
//                 </p>
//               </div>

//               <div className="divide-y divide-gray-100">
//                 {batch.documents.map((document) => (
//                   <div
//                     key={document.id}
//                     className="flex items-center justify-between gap-3 px-3 py-2.5"
//                   >
//                     <div className="flex min-w-0 items-center gap-2">
//                       <FileText className="h-4 w-4 shrink-0 text-gray-400" />
//                       <div className="min-w-0">
//                         <p className="truncate text-xs text-gray-700">
//                           {document.name}
//                         </p>
//                         <p className="text-[10px] text-gray-400">
//                           {document.type} · {getTrashSourceLabel(document.source, document.groupName)}
//                         </p>
//                       </div>
//                     </div>

//                     <span className="shrink-0 text-[10px] text-gray-400">
//                       {document.size}
//                     </span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </td>
//         </tr>
//       )}
//     </>
//   );
// }

// function MobileTrashBatch({
//   batch,
//   expanded,
//   isRestoring,
//   onToggle,
//   onRestore,
// }: TrashBatchRowProps) {
//   return (
//     <div className="p-4">
//       <div className="flex items-start gap-3">
//         <button
//           type="button"
//           onClick={onToggle}
//           className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500"
//         >
//           {expanded ? (
//             <ChevronDown className="h-4 w-4" />
//           ) : (
//             <ChevronRight className="h-4 w-4" />
//           )}
//         </button>

//         <div className="min-w-0 flex-1">
//           <button type="button" onClick={onToggle} className="text-left">
//             <p className="text-sm font-medium text-gray-800">
//               Xóa ngày {batch.deletedAt.split(" ")[0]}
//             </p>
//             <p className="mt-0.5 text-xs text-gray-400">{batch.deletedAt}</p>
//             <p
//               className={cn(
//                 "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
//                 batch.source === "group_orphaned"
//                   ? "bg-orange-50 text-orange-600"
//                   : "bg-gray-100 text-gray-500"
//               )}
//             >
//               {getTrashSourceLabel(batch.source, batch.groupName)}
//             </p>
//           </button>

//           <div className="mt-3 grid grid-cols-2 gap-2">
//             <div>
//               <p className="text-[10px] text-gray-400">Tài liệu</p>
//               <p className="text-xs text-gray-700">
//                 {batch.documentCount} tệp tin
//               </p>
//             </div>

//             <div>
//               <p className="text-[10px] text-gray-400">Dung lượng</p>
//               <p className="text-xs text-gray-700">{batch.totalSize}</p>
//             </div>
//           </div>

//           <div className="mt-3 flex items-center justify-between">
//             <div>
//               <p className="text-[10px] text-gray-400">Tự động xóa</p>
//               <p className="text-xs font-medium text-red-500">
//                 Còn {batch.remainingDays} ngày
//               </p>
//             </div>

//             <button
//               type="button"
//               disabled={isRestoring}
//               onClick={onRestore}
//               className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 disabled:opacity-50"
//             >
//               <RotateCcw className="h-3.5 w-3.5" />
//               {isRestoring ? "Đang khôi phục..." : "Khôi phục"}
//             </button>
//           </div>

//           {expanded && (
//             <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
//               {batch.documents.map((document) => (
//                 <div
//                   key={document.id}
//                   className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 last:border-b-0"
//                 >
//                   <div className="flex min-w-0 items-center gap-2">
//                     <FileText className="h-4 w-4 shrink-0 text-gray-400" />
//                     <div className="min-w-0">
//                       <p className="truncate text-xs text-gray-700">{document.name}</p>
//                       <p className="truncate text-[10px] text-gray-400">
//                         {getTrashSourceLabel(document.source, document.groupName)}
//                       </p>
//                     </div>
//                   </div>

//                   <span className="shrink-0 text-[10px] text-gray-400">
//                     {document.size}
//                   </span>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// function EmptyTrash() {
//   return (
//     <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
//       <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
//         <Trash2 className="h-7 w-7" />
//       </div>

//       <h3 className="mt-4 text-sm font-semibold text-gray-800">
//         Thùng rác đang trống
//       </h3>

//       <p className="mt-1 max-w-sm text-xs leading-5 text-gray-400">
//         Các tài liệu bạn xóa sẽ xuất hiện ở đây và được giữ trong 30 ngày trước
//         khi xóa vĩnh viễn.
//       </p>
//     </div>
//   );
// }
