import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Crown,
  Search,
  Users,
} from "lucide-react";

import type { GroupListItem } from "@/types/group";
import { cn } from "@/utils/cn";
import { formatRelativeDate } from "@/utils/formatDate";

interface GroupSwitcherProps {
  currentGroup: GroupListItem | {
    id: number;
    name: string;
    description?: string | null;
  };
  currentGroupId: number;
  groups: GroupListItem[];
  onSelectGroup: (groupId: number) => void;
  onViewAllGroups?: () => void;
}

export default function GroupSwitcher({
  currentGroup,
  currentGroupId,
  groups,
  onSelectGroup,
  onViewAllGroups,
}: GroupSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const currentGroupFromList = groups.find(
    (group) => Number(group.id) === Number(currentGroupId),
  );

  const filteredGroups = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    const result = groups.filter((group) => {
      if (!keyword) return true;

      return (
        group.name.toLowerCase().includes(keyword) ||
        group.role?.toLowerCase().includes(keyword)
      );
    });

    return [...result].sort((a, b) => {
      if (Number(a.id) === Number(currentGroupId)) return -1;
      if (Number(b.id) === Number(currentGroupId)) return 1;
      return a.name.localeCompare(b.name, "vi");
    });
  }, [groups, searchQuery, currentGroupId]);

  const getRoleInfo = (group: GroupListItem) => {
    if (group.is_owner) {
      return {
        label: "Trưởng nhóm",
        className: "bg-primary-50 text-primary-700",
        icon: <Crown className="h-3 w-3" />,
      };
    }

    if (group.my_permission === "full") {
      return {
        label: "Toàn quyền",
        className: "bg-blue-50 text-blue-700",
        icon: <Users className="h-3 w-3" />,
      };
    }

    return {
      label: "Thành viên",
      className: "bg-gray-100 text-gray-600",
      icon: <Users className="h-3 w-3" />,
    };
  };

  const handleSelect = (groupId: number) => {
    setIsOpen(false);
    setSearchQuery("");

    if (Number(groupId) === Number(currentGroupId)) {
      return;
    }

    onSelectGroup(groupId);
  };

  const displayName = currentGroupFromList?.name ?? currentGroup.name;

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          "group flex min-w-0 items-center gap-3 rounded-xl px-1.5 py-1.5 text-left",
          "transition-colors duration-150",
          "hover:bg-gray-50",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30",
        )}
      >
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl",
            isOpen
              ? "bg-primary-100 text-primary-700"
              : "bg-primary-50 text-primary-600",
            "transition-colors",
          )}
        >
          <Users className="h-7 w-7" />
        </div>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1
              className={cn(
                "max-w-[min(62vw,420px)] truncate text-xl font-bold",
                "text-gray-900",
              )}
              title={displayName}
            >
              {displayName}
            </h1>

            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200",
                isOpen && "rotate-180 text-primary-600",
              )}
            />
          </div>

          <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
            <span>
              {currentGroupFromList?.member_count ??
                "—"}{" "}
              thành viên
            </span>

            {currentGroupFromList?.is_owner && (
              <>
                <span>·</span>
                <span className="font-medium text-primary-600">
                  Trưởng nhóm
                </span>
              </>
            )}
          </div>
        </div>
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute left-0 top-[calc(100%+8px)] z-50",
            "w-[min(420px,calc(100vw-32px))]",
            "overflow-hidden rounded-2xl border border-gray-200",
            "bg-white shadow-xl shadow-gray-200/40",
            "animate-in fade-in slide-in-from-top-2 duration-150",
          )}
        >
          <div className="border-b border-gray-100 p-3">
            <div className="mb-2 px-1">
              <p className="text-sm font-semibold text-gray-900">
                Chuyển nhóm
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                Chọn một nhóm để chuyển sang không gian tương ứng
              </p>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm tên nhóm..."
                className={cn(
                  "w-full rounded-xl border border-gray-200 bg-gray-50",
                  "py-2.5 pl-9 pr-3 text-sm text-gray-900",
                  "placeholder:text-gray-400",
                  "outline-none transition",
                  "focus:border-primary-500 focus:bg-white",
                  "focus:ring-2 focus:ring-primary-500/10",
                )}
              />
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto p-2">
            <div className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Nhóm của tôi
            </div>

            {filteredGroups.length > 0 ? (
              <div className="space-y-1">
                {filteredGroups.map((group) => {
                  const isCurrent =
                    Number(group.id) === Number(currentGroupId);

                  const role = getRoleInfo(group);

                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => handleSelect(group.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl p-3 text-left",
                        "transition-colors duration-150",
                        isCurrent
                          ? "bg-primary-50/80"
                          : "hover:bg-gray-50",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                          isCurrent
                            ? "bg-primary-100 text-primary-700"
                            : "bg-gray-100 text-gray-500",
                        )}
                      >
                        <Users className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              "truncate text-sm font-semibold",
                              isCurrent
                                ? "text-primary-800"
                                : "text-gray-900",
                            )}
                            title={group.name}
                          >
                            {group.name}
                          </span>

                          {isCurrent && (
                            <span className="shrink-0 text-primary-600">
                              <Check className="h-4 w-4" />
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-gray-400">
                          <span className="shrink-0">
                            {group.member_count} thành viên
                          </span>

                          <span>·</span>

                          <span className="truncate">
                            {formatRelativeDate(group.last_updated)}
                          </span>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "hidden shrink-0 items-center gap-1 rounded-full px-2 py-1",
                          "text-[10px] font-medium sm:flex",
                          role.className,
                        )}
                      >
                        {role.icon}
                        <span>{role.label}</span>
                      </div>

                      {!isCurrent && (
                        <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <Search className="h-5 w-5" />
                </div>

                <p className="mt-3 text-sm font-medium text-gray-700">
                  Không tìm thấy nhóm
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Thử tìm kiếm bằng tên nhóm khác.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 bg-gray-50/70 p-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setSearchQuery("");
                onViewAllGroups?.();
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2.5",
                "text-sm font-medium text-gray-600",
                "transition-colors hover:bg-white hover:text-primary-700",
              )}
            >
              <span>Xem tất cả nhóm</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}