// frontend/digital-library/src/pages/group/GroupList.tsx

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Users, X, Check, Bell, List, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import EmptyState from "@/components/shared/EmptyState";
import { groupService } from "@/services/groupService";
import { tagService } from "@/services/tagService";
import { NotificationsTab } from "./components/NotificationsTab";
import type { GroupListItem, PermissionLevel } from "@/types/group";
import { cn } from "@/utils/cn";
import { mockGroups } from "@/mocks/groups";
import { formatRelativeDate } from "@/utils/formatDate";
import { useHighlightElement } from "@/hooks/useHighlightElement";

export interface Tag {
  id: number;
  name: string;
}

export interface CreateGroupSubmitData {
  name: string;
  description?: string;
  default_member_permission: PermissionLevel;
  tagIds: number[];
}

type TabKey = "groups" | "notifications";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  {
    key: "groups",
    label: "Danh sách nhóm",
    icon: <List className="h-4 w-4" />,
  },
  {
    key: "notifications",
    label: "Thông báo",
    icon: <Bell className="h-4 w-4" />,
  },
];

export default function GroupList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("groups");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: groupService.getAll,
    retry: false,
  });

  useHighlightElement("highlight_group");

  // Query lấy danh sách lời mời tham gia nhóm của user hiện tại
  const { data: invitationsData = [] } = useQuery({
    queryKey: ["my-invitations"],
    queryFn: groupService.getMyInvitations,
  });

  const { data: tagsData } = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: () => tagService.getAll(),
    retry: false,
  });

  const availableTags: Tag[] = tagsData || [];
  const groups = data && data.length > 0 ? data : mockGroups;
  const filteredGroups = useMemo(
    () =>
      groups.filter((group) =>
        group.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
      ),
    [groups, searchQuery],
  );

  const createMutation = useMutation({
    mutationFn: async (payload: CreateGroupSubmitData) => {
      const workspace = await groupService.create({
        name: payload.name,
        description: payload.description,
        default_member_permission: payload.default_member_permission,
      });

      if (payload.tagIds && payload.tagIds.length > 0) {
        await groupService.addTagsToGroup(workspace.id, payload.tagIds);
      }

      return workspace;
    },
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setIsCreateOpen(false);

      navigate(`/groups?highlight_group=${workspace.id}`, { replace: true });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Nhóm của tôi</h1>
        <Button
          variant="primary"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setIsCreateOpen(true)}
        >
          + Tạo nhóm
        </Button>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 pb-3 text-sm font-medium transition-colors focus:outline-none",
              activeTab === tab.key
                ? "border-b-2 border-primary-600 text-primary-600"
                : "text-gray-600 hover:text-gray-900",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "groups" && (
        <div className="flex flex-col gap-4">
          <div className="max-w-md">
            <Input
              icon={<Search className="h-4 w-4" />}
              placeholder="Tìm kiếm nhóm của bạn..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Card key={index} className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gray-200 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
                    <div className="h-3 w-64 rounded bg-gray-200 animate-pulse" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredGroups.length > 0 ? (
            <div className="space-y-3">
              {filteredGroups.map((group) => (
                <GroupListCard
                  key={group.id}
                  id={`group-${group.id}`}
                  group={group}
                  onEnter={() => navigate(`/groups/${group.id}`)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="Chưa có nhóm nào"
              description="Tạo nhóm đầu tiên để chia sẻ tài liệu học tập với bạn bè hoặc giảng viên."
              actionLabel="Tạo nhóm"
              onAction={() => setIsCreateOpen(true)}
            />
          )}
        </div>
      )}

      {/* Truyền invitations và callback vào NotificationsTab */}
      {activeTab === "notifications" && (
        <NotificationsTab
          invitations={invitationsData}
          onActionSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["my-invitations"] });
            queryClient.invalidateQueries({ queryKey: ["groups"] });
          }}
        />
      )}

      {isCreateOpen && (
        <CreateGroupModal
          isPending={createMutation.isPending}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={(payload) => createMutation.mutate(payload)}
          availableTags={availableTags}
        />
      )}
    </div>
  );
}

interface GroupListCardProps {
  id?: string;
  group: GroupListItem;
  onEnter: () => void;
}

function GroupListCard({ id, group, onEnter }: GroupListCardProps) {
  const roleLabel = group.is_owner
    ? "Trưởng nhóm"
    : group.my_permission === "full"
      ? "Cố vấn"
      : "Thành viên";
  return (
    <Card id={id} className="flex items-center gap-4 p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
        <Users className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold text-gray-900">
          {group.name}
        </h2>
        <p className="mt-1 text-xs text-gray-400">
          {group.member_count} thành viên ·{" "}
          {formatRelativeDate(group.last_updated)}
        </p>
      </div>
      <Badge
        variant={
          group.is_owner
            ? "primary"
            : group.my_permission === "full"
              ? "success"
              : "default"
        }
        className={cn(
          !group.is_owner &&
            group.my_permission === "full" &&
            "bg-blue-50 text-blue-600",
        )}
      >
        {roleLabel}
      </Badge>
      <Button variant="outline" onClick={onEnter}>
        Vào không gian
      </Button>
    </Card>
  );
}

interface CreateGroupModalProps {
  isPending: boolean;
  onClose: () => void;
  onSubmit: (data: CreateGroupSubmitData) => void;
  availableTags?: Tag[];
}

function CreateGroupModal({
  isPending,
  onClose,
  onSubmit,
  availableTags = [],
}: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permission, setPermission] = useState<PermissionLevel>("view");

  const [allowTags, setAllowTags] = useState<boolean>(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState("");

  const handleAllowTagsChange = (allow: boolean) => {
    setAllowTags(allow);
    if (allow) {
      setSelectedTagIds(availableTags.map((tag) => tag.id));
    } else {
      setSelectedTagIds([]);
      setTagSearchQuery("");
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const filteredTags = useMemo(() => {
    if (!tagSearchQuery.trim()) return availableTags;
    return availableTags.filter((tag) =>
      tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase()),
    );
  }, [availableTags, tagSearchQuery]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg p-0 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Tạo nhóm mới</h2>
          <button
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition-colors"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto custom-scrollbar p-5">
          <form
            id="create-group-form"
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit({
                name,
                description: description || undefined,
                default_member_permission: permission,
                tagIds: selectedTagIds,
              });
            }}
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tên nhóm
              </label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Mô tả
              </label>
              <textarea
                className="min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-600"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className="space-y-4">
              {/* Lựa chọn bật/tắt tính năng lấy danh sách thẻ */}
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="allowTagsOption"
                    className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-600 cursor-pointer"
                    checked={allowTags === true}
                    onChange={() => handleAllowTagsChange(true)}
                  />
                  <span className="text-sm font-semibold text-gray-900">
                    Cho phép lấy danh sách thẻ
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="allowTagsOption"
                    className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-600 cursor-pointer"
                    checked={allowTags === false}
                    onChange={() => handleAllowTagsChange(false)}
                  />
                  <span className="text-sm font-semibold text-gray-900">
                    Không cho phép lấy danh sách thẻ
                  </span>
                </label>
              </div>

              {/* Khung danh sách và tìm kiếm thẻ */}
              {allowTags && (
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 animate-in fade-in slide-in-from-top-2">
                  {/* Search Input Header */}
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={tagSearchQuery}
                        onChange={(e) => setTagSearchQuery(e.target.value)}
                        placeholder="Tìm tên tag..."
                        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
                      />
                    </div>
                    {selectedTagIds.length > 0 && (
                      <span className="shrink-0 text-xs font-medium text-gray-500">
                        Đã chọn:{" "}
                        <strong className="text-primary-600">
                          {selectedTagIds.length}
                        </strong>
                      </span>
                    )}
                  </div>

                  {/* Tags Chips Container */}
                  <div className="max-h-40 overflow-y-auto flex flex-wrap gap-2 pt-1 custom-scrollbar">
                    {filteredTags.length > 0 ? (
                      filteredTags.map((tag) => {
                        const isSelected = selectedTagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className={cn(
                              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border cursor-pointer",
                              isSelected
                                ? "bg-primary-600 border-primary-600 text-white shadow-sm hover:bg-primary-700"
                                : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-100",
                            )}
                          >
                            #{tag.name}
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="w-full text-center text-xs text-gray-400 py-3">
                        Không tìm thấy thẻ phù hợp.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  value: "full" as const,
                  label: "Toàn quyền",
                  desc: "Thành viên có thể upload, sửa và xóa tài liệu.",
                },
                {
                  value: "view" as const,
                  label: "Chỉ xem",
                  desc: "Thành viên xem, tải và lưu tài liệu về cá nhân.",
                },
              ].map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "cursor-pointer rounded-xl border p-4 transition-colors",
                    permission === option.value
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 bg-white hover:border-gray-300",
                  )}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    checked={permission === option.value}
                    onChange={() => setPermission(option.value)}
                  />
                  <span className="text-sm font-semibold text-gray-900">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    {option.desc}
                  </span>
                </label>
              ))}
            </div>
          </form>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 bg-white px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            form="create-group-form"
            disabled={isPending || !name.trim()}
          >
            Tạo
          </Button>
        </div>
      </Card>
    </div>
  );
}
