import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Search,
  X,
  User as UserIcon,
  Users,
  GraduationCap,
  Regex,
  Plus,
  Check,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { groupService } from "@/services/groupService";
import { userService } from "@/services/userService";
import { academicsService } from "@/services/academicsService";
import { useDebounce } from "@/hooks/useDebounce";
import type { User } from "@/types/user";

export type InviteMode = "basic" | "advanced";

export type SelectionType = "user" | "class" | "faculty" | "pattern";

export interface SelectedItem {
  id: string | number;
  type: SelectionType;
  label: string;
  subLabel?: string;
  value: any;
}

interface InviteModalProps {
  groupId: number | string;
  onClose: () => void;
}

export default function InviteModal({ groupId, onClose }: InviteModalProps) {
  // 1. CHẾ ĐỘ HIỂN THỊ (BASIC / ADVANCED)
  const [mode, setMode] = useState<InviteMode>("basic");

  // 2. STATE ĐỒNG BỘ CHUNG CHO CẢ 2 CHẾ ĐỘ
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<number[]>([]);
  const [message, setMessage] = useState("");

  // FETCH DATA HỖ TRỢ
  const { data: faculties = [] } = useQuery({
    queryKey: ["faculties"],
    queryFn: academicsService.getFaculties,
  });
  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: academicsService.getClasses,
  });

  // TÍNH TỔNG SỐ TIÊU CHÍ ĐÃ CHỌN
  const totalCriteriaCount =
    selectedUsers.length +
    patterns.length +
    selectedClassIds.length +
    selectedFacultyIds.length;

  // MUTATION GỬI LỜI MỜI HÀNG LOẠT
  const inviteMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        identifiers: selectedUsers.map((u) => u.email || u.username),
        class_ids: selectedClassIds,
        faculty_ids: selectedFacultyIds,
        student_code_patterns: patterns,
        message: message,
      };
      return await groupService.inviteBulk(Number(groupId), payload);
    },
    onSuccess: (data: any) => {
      alert(data?.message || "Đã gửi lời mời thành công!");
      onClose();
    },
    onError: (err: any) => {
      alert(err?.response?.data?.detail || "Có lỗi xảy ra khi gửi lời mời.");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-2xl overflow-visible my-6 flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Mời thành viên vào nhóm
              </h2>
              <p className="text-xs text-gray-500">
                Lựa chọn linh hoạt theo cá nhân, mã sinh viên, lớp hoặc khoa
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* TAB CHỌN CHẾ ĐỘ (SEGMENTED CONTROL) */}
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setMode("basic")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-semibold transition-all ${
                mode === "basic"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Mời cơ bản (Tìm kiếm nhanh)
            </button>
            <button
              type="button"
              onClick={() => setMode("advanced")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-semibold transition-all ${
                mode === "advanced"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Mời nâng cao (Phân loại chi tiết)
            </button>
          </div>
        </div>

        {/* BODY (SCROLLABLE AREA) */}
        <div className="px-6 py-5 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {mode === "basic" ? (
            <BasicInviteForm
              faculties={faculties}
              classes={classes}
              selectedUsers={selectedUsers}
              setSelectedUsers={setSelectedUsers}
              patterns={patterns}
              setPatterns={setPatterns}
              selectedClassIds={selectedClassIds}
              setSelectedClassIds={setSelectedClassIds}
              selectedFacultyIds={selectedFacultyIds}
              setSelectedFacultyIds={setSelectedFacultyIds}
            />
          ) : (
            <AdvancedInviteForm
              faculties={faculties}
              classes={classes}
              selectedUsers={selectedUsers}
              setSelectedUsers={setSelectedUsers}
              patterns={patterns}
              setPatterns={setPatterns}
              selectedClassIds={selectedClassIds}
              setSelectedClassIds={setSelectedClassIds}
              selectedFacultyIds={selectedFacultyIds}
              setSelectedFacultyIds={setSelectedFacultyIds}
            />
          )}

          {/* LỜI NHẮN ĐÍNH KÈM CHUNG */}
          <div className="space-y-1.5 pt-2 border-t border-gray-100">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Lời nhắn đính kèm (tuỳ chọn)
            </label>
            <textarea
              className="min-h-20 w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
              placeholder="Nhập lời nhắn gửi đến các thành viên..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50/50 rounded-b-2xl">
          <span className="text-xs font-medium text-gray-500">
            Đã chọn tổng cộng{" "}
            <strong className="text-primary-600">{totalCriteriaCount}</strong>{" "}
            điều kiện
          </span>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={inviteMutation.isPending}
            >
              Hủy bỏ
            </Button>
            <Button
              disabled={totalCriteriaCount === 0 || inviteMutation.isPending}
              onClick={() => inviteMutation.mutate()}
            >
              {inviteMutation.isPending ? "Đang gửi..." : "Gửi lời mời"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================================
 * 1. COMPONENT MỜI CƠ BẢN (SEARCH CHUNG + CHIPS)
 * ============================================================================ */
interface SubFormProps {
  faculties: any[];
  classes: any[];
  selectedUsers: User[];
  setSelectedUsers: React.Dispatch<React.SetStateAction<User[]>>;
  patterns: string[];
  setPatterns: React.Dispatch<React.SetStateAction<string[]>>;
  selectedClassIds: number[];
  setSelectedClassIds: React.Dispatch<React.SetStateAction<number[]>>;
  selectedFacultyIds: number[];
  setSelectedFacultyIds: React.Dispatch<React.SetStateAction<number[]>>;
}

function BasicInviteForm({
  faculties,
  classes,
  selectedUsers,
  setSelectedUsers,
  patterns,
  setPatterns,
  selectedClassIds,
  setSelectedClassIds,
  selectedFacultyIds,
  setSelectedFacultyIds,
}: SubFormProps) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debouncedTerm = useDebounce(inputValue, 300);

  const { data: userSuggestions = [], isFetching } = useQuery({
    queryKey: ["users-search", debouncedTerm],
    queryFn: () => userService.searchUsers(debouncedTerm),
    enabled: debouncedTerm.trim().length > 0,
    staleTime: 60 * 1000,
  });

  // TỔNG HỢP GỢI Ý ĐỘNG
  const suggestions = useMemo(() => {
    const term = debouncedTerm.trim().toLowerCase();
    if (!term) return [];

    const results: SelectedItem[] = [];

    // 1. Mẫu mã SV
    if (/^[a-zA-Z0-9]+$/.test(term) && !patterns.includes(term)) {
      results.push({
        id: `pattern-${term}`,
        type: "pattern",
        label: `Mã SV chứa "${term}"`,
        value: term,
      });
    }

    // 2. Lọc Khoa
    const matchedFaculties = faculties.filter(
      (f: any) =>
        f.name.toLowerCase().includes(term) ||
        f.code.toLowerCase().includes(term)
    );
    results.push(
      ...matchedFaculties
        .filter((f) => !selectedFacultyIds.includes(f.id))
        .map((f: any): SelectedItem => ({
          id: `faculty-${f.id}`,
          type: "faculty",
          label: f.name,
          subLabel: `Khoa • ${f.code}`,
          value: f.id,
        }))
    );

    // 3. Lọc Lớp
    const matchedClasses = classes.filter(
      (c: any) =>
        c.name.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term)
    );
    results.push(
      ...matchedClasses
        .filter((c) => !selectedClassIds.includes(c.id))
        .map((c: any): SelectedItem => ({
          id: `class-${c.id}`,
          type: "class",
          label: c.name,
          subLabel: `Lớp • ${c.code}`,
          value: c.id,
        }))
    );

    // 4. User từ API
    results.push(
      ...userSuggestions
        .filter((u: User) => !selectedUsers.some((sel) => sel.id === u.id))
        .map((u: any): SelectedItem => ({
          id: `user-${u.id}`,
          type: "user",
          label: u.full_name || u.username,
          subLabel: u.student_code
            ? `${u.student_code} • ${u.email}`
            : u.email,
          value: u,
        }))
    );

    return results;
  }, [
    debouncedTerm,
    faculties,
    classes,
    userSuggestions,
    patterns,
    selectedFacultyIds,
    selectedClassIds,
    selectedUsers,
  ]);

  // Click ra ngoài đóng dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectItem = (item: SelectedItem) => {
    if (item.type === "user") setSelectedUsers((prev) => [...prev, item.value]);
    if (item.type === "pattern") setPatterns((prev) => [...prev, item.value]);
    if (item.type === "class") setSelectedClassIds((prev) => [...prev, item.value]);
    if (item.type === "faculty") setSelectedFacultyIds((prev) => [...prev, item.value]);

    setInputValue("");
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const getIcon = (type: SelectionType) => {
    switch (type) {
      case "class":
        return <Users className="h-3 w-3" />;
      case "faculty":
        return <GraduationCap className="h-3 w-3" />;
      case "pattern":
        return <Regex className="h-3 w-3" />;
      default:
        return <UserIcon className="h-3 w-3" />;
    }
  };

  // Gom danh sách hiển thị CHIPS
  const allChips = [
    ...selectedUsers.map((u) => ({
      id: `user-${u.id}`,
      type: "user" as const,
      label: u.full_name || u.username || u.email,
      onRemove: () => setSelectedUsers((p) => p.filter((x) => x.id !== u.id)),
    })),
    ...patterns.map((pat) => ({
      id: `pat-${pat}`,
      type: "pattern" as const,
      label: `Mã chứa: "${pat}"`,
      onRemove: () => setPatterns((p) => p.filter((x) => x !== pat)),
    })),
    ...selectedClassIds.map((id) => {
      const cls = classes.find((c) => c.id === id);
      return {
        id: `cls-${id}`,
        type: "class" as const,
        label: cls?.name || `Lớp #${id}`,
        onRemove: () => setSelectedClassIds((p) => p.filter((x) => x !== id)),
      };
    }),
    ...selectedFacultyIds.map((id) => {
      const fac = faculties.find((f) => f.id === id);
      return {
        id: `fac-${id}`,
        type: "faculty" as const,
        label: fac?.name || `Khoa #${id}`,
        onRemove: () => setSelectedFacultyIds((p) => p.filter((x) => x !== id)),
      };
    }),
  ];

  return (
    <div className="space-y-3">
      <div className="relative" ref={dropdownRef}>
        <div
          className="flex min-h-[46px] w-full flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white p-2 text-sm focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          <Search className="h-4 w-4 text-gray-400 shrink-0 ml-1" />

          {/* CHIPS BỌC DÙNG CHUNG */}
          {allChips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 px-2.5 py-1 text-xs font-medium text-primary-700"
            >
              {getIcon(chip.type)}
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  chip.onRemove();
                }}
                className="rounded-full p-0.5 hover:bg-primary-200/60 text-primary-600"
              >
                <X className="h-3 w-3" />
              </button>
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
            placeholder={
              allChips.length === 0
                ? "Nhập tên, email, MSSV, Lớp hoặc Khoa..."
                : "Thêm đối tượng khác..."
            }
            className="flex-1 bg-transparent outline-none min-w-[150px] text-sm"
          />
        </div>

        {/* DROPDOWN GỢI Ý */}
        {showDropdown && debouncedTerm.trim() !== "" && (
          <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden">
            {isFetching ? (
              <div className="p-3 text-center text-xs text-gray-500">
                Đang tìm kiếm...
              </div>
            ) : suggestions.length > 0 ? (
              <ul className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                {suggestions.map((item) => (
                  <li
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-600 shrink-0">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {item.label}
                      </span>
                      {item.subLabel && (
                        <span className="text-xs text-gray-400 truncate">
                          {item.subLabel}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-3 text-center text-xs text-gray-500">
                Không tìm thấy kết quả phù hợp.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
 * 2. COMPONENT MỜI NÂNG CAO (LỌC TỪNG MỤC RIÊNG BIỆT)
 * ============================================================================ */
function AdvancedInviteForm({
  faculties,
  classes,
  selectedUsers,
  setSelectedUsers,
  patterns,
  setPatterns,
  selectedClassIds,
  setSelectedClassIds,
  selectedFacultyIds,
  setSelectedFacultyIds,
}: SubFormProps) {
  // State quản lý ô input con
  const [userInputValue, setUserInputValue] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [patternInput, setPatternInput] = useState("");

  const [classSearch, setClassSearch] = useState("");
  const [showClassDropdown, setShowClassDropdown] = useState(false);

  const [facultySearch, setFacultySearch] = useState("");
  const [showFacultyDropdown, setShowFacultyDropdown] = useState(false);

  const userInputRef = useRef<HTMLInputElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const classDropdownRef = useRef<HTMLDivElement>(null);
  const facultyDropdownRef = useRef<HTMLDivElement>(null);

  const debouncedUserTerm = useDebounce(userInputValue, 300);

  const { data: userSuggestions = [], isFetching: isUserFetching } = useQuery({
    queryKey: ["users-search", debouncedUserTerm],
    queryFn: () => userService.searchUsers(debouncedUserTerm),
    enabled: debouncedUserTerm.trim().length > 0,
    staleTime: 60 * 1000,
  });

  const availableUserSuggestions = userSuggestions.filter(
    (sug: User) => !selectedUsers.some((u) => u.id === sug.id)
  );

  const filteredClasses = classes.filter(
    (c: any) =>
      c.name.toLowerCase().includes(classSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(classSearch.toLowerCase())
  );

  const filteredFaculties = faculties.filter(
    (f: any) =>
      f.name.toLowerCase().includes(facultySearch.toLowerCase()) ||
      f.code.toLowerCase().includes(facultySearch.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) setShowUserDropdown(false);
      if (classDropdownRef.current && !classDropdownRef.current.contains(e.target as Node)) setShowClassDropdown(false);
      if (facultyDropdownRef.current && !facultyDropdownRef.current.contains(e.target as Node)) setShowFacultyDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddPattern = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (("key" in e && e.key === "Enter") || e.type === "click") {
      e.preventDefault();
      const val = patternInput.trim();
      if (val && !patterns.includes(val)) {
        setPatterns((prev) => [...prev, val]);
        setPatternInput("");
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. CÁ NHÂN */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
          1. Mời theo cá nhân (Tên, Email, Username)
        </label>
        <div className="relative" ref={userDropdownRef}>
          <div
            onClick={() => userInputRef.current?.focus()}
            className="flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white p-2 text-sm cursor-text focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500"
          >
            <Search className="h-4 w-4 text-gray-400 shrink-0 ml-1" />
            {selectedUsers.map((user) => (
              <span
                key={user.id}
                className="inline-flex items-center gap-1 rounded-full bg-primary-50 border border-primary-200 px-2.5 py-0.5 text-xs font-medium text-primary-700"
              >
                <UserIcon className="h-3 w-3" />
                <span>{user.full_name || user.username || user.email}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUsers((p) => p.filter((u) => u.id !== user.id));
                  }}
                  className="rounded-full p-0.5 hover:bg-primary-200 text-primary-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              ref={userInputRef}
              value={userInputValue}
              onChange={(e) => {
                setUserInputValue(e.target.value);
                setShowUserDropdown(true);
              }}
              onFocus={() => setShowUserDropdown(true)}
              placeholder={
                selectedUsers.length === 0
                  ? "Nhập tên, email để tìm kiếm..."
                  : "Thêm người khác..."
              }
              className="flex-1 bg-transparent outline-none min-w-[140px] text-sm"
            />
          </div>

          {showUserDropdown && debouncedUserTerm.trim() !== "" && (
            <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden">
              {isUserFetching ? (
                <div className="p-3 text-center text-xs text-gray-500">Đang tìm kiếm...</div>
              ) : availableUserSuggestions.length > 0 ? (
                <ul className="max-h-48 overflow-y-auto py-1">
                  {availableUserSuggestions.map((user: User) => (
                    <li
                      key={user.id}
                      onClick={() => {
                        setSelectedUsers((p) => [...p, user]);
                        setUserInputValue("");
                        setShowUserDropdown(false);
                      }}
                      className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-gray-50"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-bold text-xs">
                        {user.full_name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {user.full_name || user.username}
                        </span>
                        <span className="text-xs text-gray-400 truncate">
                          {user.student_code ? `${user.student_code} • ` : ""}
                          {user.email}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-3 text-center text-xs text-gray-500">
                  Không tìm thấy người dùng.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. MÃ SINH VIÊN */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
          2. Mời theo ký tự MSSV (Ví dụ: 241, 24K)
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Regex className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={patternInput}
              onChange={(e) => setPatternInput(e.target.value)}
              onKeyDown={handleAddPattern}
              placeholder="Nhập chuỗi MSSV (VD: 241) rồi ấn Enter..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleAddPattern}
            icon={<Plus className="h-4 w-4" />}
          >
            Thêm
          </Button>
        </div>
        {patterns.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {patterns.map((pat) => (
              <span
                key={pat}
                className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700"
              >
                <span>Mã chứa: "{pat}"</span>
                <button
                  type="button"
                  onClick={() => setPatterns((p) => p.filter((x) => x !== pat))}
                  className="rounded-full p-0.5 hover:bg-amber-200 text-amber-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 3. LỚP HỌC */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
          3. Chọn theo Lớp học
        </label>
        <div className="relative" ref={classDropdownRef}>
          <div
            onClick={() => setShowClassDropdown(true)}
            className="flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white p-2 text-sm cursor-pointer"
          >
            <Users className="h-4 w-4 text-gray-400 shrink-0 ml-1" />
            {selectedClassIds.length === 0 ? (
              <span className="text-gray-400 text-sm">Nhấp để chọn lớp học...</span>
            ) : (
              selectedClassIds.map((id) => {
                const cls = classes.find((c: any) => c.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                  >
                    <span>{cls?.name || `Lớp ID: ${id}`}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClassIds((p) => p.filter((x) => x !== id));
                      }}
                      className="rounded-full p-0.5 hover:bg-blue-200 text-blue-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })
            )}
          </div>

          {showClassDropdown && (
            <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden p-2">
              <input
                type="text"
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                placeholder="Tìm tên lớp hoặc mã lớp..."
                className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-primary-500 mb-2"
              />
              <ul className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
                {filteredClasses.length > 0 ? (
                  filteredClasses.map((cls: any) => {
                    const isSelected = selectedClassIds.includes(cls.id);
                    return (
                      <li
                        key={cls.id}
                        onClick={() =>
                          setSelectedClassIds((prev) =>
                            isSelected ? prev.filter((id) => id !== cls.id) : [...prev, cls.id]
                          )
                        }
                        className={`flex cursor-pointer items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                          isSelected ? "bg-primary-50 text-primary-700 font-medium" : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <span>{cls.name} <span className="text-xs text-gray-400">({cls.code})</span></span>
                        {isSelected && <Check className="h-4 w-4 text-primary-600" />}
                      </li>
                    );
                  })
                ) : (
                  <li className="p-2 text-center text-xs text-gray-400">Không tìm thấy lớp học.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 4. KHOA */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
          4. Chọn theo Khoa
        </label>
        <div className="relative" ref={facultyDropdownRef}>
          <div
            onClick={() => setShowFacultyDropdown(true)}
            className="flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white p-2 text-sm cursor-pointer"
          >
            <GraduationCap className="h-4 w-4 text-gray-400 shrink-0 ml-1" />
            {selectedFacultyIds.length === 0 ? (
              <span className="text-gray-400 text-sm">Nhấp để chọn khoa...</span>
            ) : (
              selectedFacultyIds.map((id) => {
                const fac = faculties.find((f: any) => f.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-xs font-medium text-purple-700"
                  >
                    <span>{fac?.name || `Khoa ID: ${id}`}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFacultyIds((p) => p.filter((x) => x !== id));
                      }}
                      className="rounded-full p-0.5 hover:bg-purple-200 text-purple-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })
            )}
          </div>

          {showFacultyDropdown && (
            <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden p-2">
              <input
                type="text"
                value={facultySearch}
                onChange={(e) => setFacultySearch(e.target.value)}
                placeholder="Tìm tên khoa hoặc mã khoa..."
                className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-primary-500 mb-2"
              />
              <ul className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
                {filteredFaculties.length > 0 ? (
                  filteredFaculties.map((fac: any) => {
                    const isSelected = selectedFacultyIds.includes(fac.id);
                    return (
                      <li
                        key={fac.id}
                        onClick={() =>
                          setSelectedFacultyIds((prev) =>
                            isSelected ? prev.filter((id) => id !== fac.id) : [...prev, fac.id]
                          )
                        }
                        className={`flex cursor-pointer items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                          isSelected ? "bg-primary-50 text-primary-700 font-medium" : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <span>{fac.name} <span className="text-xs text-gray-400">({fac.code})</span></span>
                        {isSelected && <Check className="h-4 w-4 text-primary-600" />}
                      </li>
                    );
                  })
                ) : (
                  <li className="p-2 text-center text-xs text-gray-400">Không tìm thấy khoa.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}