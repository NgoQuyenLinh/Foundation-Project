import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search, X, User as UserIcon, Users, GraduationCap, Regex } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { groupService } from "@/services/groupService";
import { userService } from "@/services/userService";
import { academicsService } from "@/services/academicsService";
import { useDebounce } from "@/hooks/useDebounce";

// Kiểu dữ liệu linh hoạt cho Thẻ (Chips)
type SelectionType = "user" | "class" | "faculty" | "pattern";
interface SelectedItem {
  id: string | number; // Unique key
  type: SelectionType;
  label: string;
  subLabel?: string;
  value: any; // User obj, Class ID, Faculty ID, hoặc pattern string
}

export default function InviteModal({ groupId, onClose }: any) {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [message, setMessage] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debouncedTerm = useDebounce(inputValue, 300);

  // FETCH DATA
  const { data: faculties = [] } = useQuery({ queryKey: ["faculties"], queryFn: academicsService.getFaculties });
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: academicsService.getClasses });
  const { data: userSuggestions = [], isFetching } = useQuery({
    queryKey: ["users-search", debouncedTerm],
    queryFn: () => userService.searchUsers(debouncedTerm),
    enabled: debouncedTerm.trim().length > 0,
    staleTime: 60 * 1000,
  });

  // TỔNG HỢP DANH SÁCH GỢI Ý (Lớp, Khoa, Pattern, User)
  const suggestions = useMemo(() => {
    const term = debouncedTerm.trim().toLowerCase();
    if (!term) return [];

    let results: SelectedItem[] = [];

    // 1. Gợi ý Pattern mã SV (Nếu nhập chữ số)
    if (/^[a-zA-Z0-9]+$/.test(term)) {
      results.push({
        id: `pattern-${term}`,
        type: "pattern",
        label: `Tất cả SV có mã chứa "${term}"`,
        value: term,
      });
    }

    // 2. Lọc Khoa
    const matchedFaculties = faculties.filter((f: any) => f.name.toLowerCase().includes(term) || f.code.toLowerCase().includes(term));
    results.push(...matchedFaculties.map((f: any): SelectedItem => ({
      id: `faculty-${f.id}`, type: "faculty", label: f.name, subLabel: `Khoa • ${f.code}`, value: f.id
    })));

    // 3. Lọc Lớp
    const matchedClasses = classes.filter((c: any) => c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term));
    results.push(...matchedClasses.map((c: any): SelectedItem => ({
      id: `class-${c.id}`, type: "class", label: c.name, subLabel: `Lớp • ${c.code}`, value: c.id
    })));

    // 4. User gợi ý từ API
    results.push(...userSuggestions.map((u: any): SelectedItem => ({
      id: `user-${u.id}`, type: "user", label: u.full_name || u.username, subLabel: u.student_code ? `${u.student_code} • ${u.email}` : u.email, value: u
    })));

    // Lọc bỏ những mục ĐÃ CHỌN
    return results.filter(sug => !selectedItems.some(sel => sel.id === sug.id));
  }, [debouncedTerm, faculties, classes, userSuggestions, selectedItems]);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      // Phân tách các selection thành Payload chuẩn gửi cho Backend
      const payload = {
        identifiers: [] as string[],
        class_ids: [] as number[],
        faculty_ids: [] as number[],
        student_code_patterns: [] as string[],
        message: message,
      };

      selectedItems.forEach(item => {
        if (item.type === "user") payload.identifiers.push(item.value.email || item.value.username);
        if (item.type === "class") payload.class_ids.push(item.value);
        if (item.type === "faculty") payload.faculty_ids.push(item.value);
        if (item.type === "pattern") payload.student_code_patterns.push(item.value);
      });

      return await groupService.inviteBulk(groupId, payload);
    },
    onSuccess: (data) => {
      alert(data.message); // Hiển thị "Đã gửi lời mời tới 50 người"
      onClose();
    }
  });

  const handleSelectItem = (item: SelectedItem) => {
    setSelectedItems(prev => [...prev, item]);
    setInputValue("");
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleRemoveItem = (id: string | number) => {
    setSelectedItems(prev => prev.filter(i => i.id !== id));
  };

  // Icon động theo Type
  const getIcon = (type: SelectionType) => {
    switch(type) {
      case "class": return <Users className="h-3 w-3" />;
      case "faculty": return <GraduationCap className="h-3 w-3" />;
      case "pattern": return <Regex className="h-3 w-3" />;
      default: return <UserIcon className="h-3 w-3" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-xl overflow-visible">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Mời thành viên hàng loạt</h2>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="relative" ref={dropdownRef}>
            <div className="flex min-h-[46px] w-full flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white p-2 text-sm focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 cursor-text" onClick={() => inputRef.current?.focus()}>
              <Search className="h-4 w-4 text-gray-400 shrink-0 ml-1" />

              {/* CHIPS */}
              {selectedItems.map((item) => (
                <span key={item.id} className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 px-2.5 py-1 text-xs font-medium text-primary-700">
                  {getIcon(item.type)}
                  <span>{item.label}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.id); }} className="rounded-full p-0.5 hover:bg-primary-200/60 text-primary-600"><X className="h-3 w-3" /></button>
                </span>
              ))}

              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                placeholder={selectedItems.length === 0 ? "Nhập MSSV, email, Tên Lớp, Khoa..." : "Thêm người/nhóm khác..."}
                className="flex-1 bg-transparent outline-none min-w-[150px]"
              />
            </div>

            {/* DROPDOWN */}
            {showDropdown && debouncedTerm.trim() !== "" && (
              <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden animate-in fade-in">
                {isFetching ? <div className="p-3 text-center text-xs text-gray-500">Đang tìm kiếm...</div> 
                : suggestions.length > 0 ? (
                  <ul className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                    {suggestions.map((item) => (
                      <li key={item.id} onClick={() => handleSelectItem(item)} className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-gray-50">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                          {getIcon(item.type)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-gray-900 truncate">{item.label}</span>
                          {item.subLabel && <span className="text-xs text-gray-400 truncate">{item.subLabel}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <div className="p-3 text-center text-xs text-gray-500">Không có kết quả.</div>}
              </div>
            )}
          </div>

          <textarea
            className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            placeholder="Lời nhắn đính kèm (tuỳ chọn)..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={inviteMutation.isPending}>Hủy</Button>
          <Button disabled={selectedItems.length === 0 || inviteMutation.isPending} onClick={() => inviteMutation.mutate()}>
            {inviteMutation.isPending ? "Đang gửi..." : "Gửi lời mời"}
          </Button>
        </div>
      </Card>
    </div>
  );
}