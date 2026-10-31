// src/components/shared/modals/UserSearchPicker.tsx
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, User as UserIcon } from "lucide-react";
import { userService } from "@/services/userService";
import { useDebounce } from "@/hooks/useDebounce";
import type { User } from "@/types/user";

export interface UserSearchPickerProps {
  selectedUsers: User[];
  onSelect: (user: User) => void;
  onRemove: (userId: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function UserSearchPicker({
  selectedUsers,
  onSelect,
  onRemove,
  placeholder = "Nhập tên, email hoặc MSSV để tìm kiếm...",
  disabled = false,
}: UserSearchPickerProps) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedTerm = useDebounce(inputValue, 300);

  const { data: suggestions = [], isFetching } = useQuery({
    queryKey: ["users-search", debouncedTerm],
    queryFn: () => userService.searchUsers(debouncedTerm),
    enabled: debouncedTerm.trim().length > 0,
    staleTime: 60 * 1000,
  });

  const availableSuggestions = suggestions.filter(
    (u: User) => !selectedUsers.some((sel) => sel.id === u.id)
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (user: User) => {
    onSelect(user);
    setInputValue("");
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={containerRef}>
      <div
        className="flex min-h-[46px] w-full flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white p-2 text-sm focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 cursor-text"
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        <Search className="h-4 w-4 text-gray-400 shrink-0 ml-1" />

        {selectedUsers.map((user) => (
          <span
            key={user.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 px-2.5 py-1 text-xs font-medium text-primary-700"
          >
            <UserIcon className="h-3 w-3" />
            <span>{user.full_name || user.username || user.email}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(user.id);
                }}
                className="rounded-full p-0.5 hover:bg-primary-200/60 text-primary-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}

        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={selectedUsers.length === 0 ? placeholder : "Thêm người khác..."}
          className="flex-1 bg-transparent outline-none min-w-[150px] text-sm"
          disabled={disabled}
        />
      </div>

      {showDropdown && debouncedTerm.trim() !== "" && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden">
          {isFetching ? (
            <div className="p-3 text-center text-xs text-gray-500">Đang tìm kiếm...</div>
          ) : availableSuggestions.length > 0 ? (
            <ul className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
              {availableSuggestions.map((user: User) => (
                <li
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-bold text-xs shrink-0">
                    {user.full_name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {user.full_name || user.username}
                    </span>
                    <span className="text-xs text-gray-400 truncate">
                      {user.student_code ? `${user.student_code} • ` : ""}{user.email}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 text-center text-xs text-gray-500">
              Không tìm thấy người dùng phù hợp.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
