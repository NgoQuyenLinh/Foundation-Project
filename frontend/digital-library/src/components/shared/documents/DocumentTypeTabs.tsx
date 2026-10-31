// frontend/digital-library/src/components/shared/DocumentTypeTabs.tsx

import { cn } from "@/utils/cn";
import { type TabKey } from "@/hooks/useDocumentFilters";

export interface TabItem<T = TabKey> {
  key: T;
  label: string;
}

const DEFAULT_TABS: TabItem<TabKey>[] = [
  { key: "all", label: "Tất cả" },
  { key: "document", label: "Tài liệu" },
  { key: "image", label: "Hình ảnh" },
  { key: "pdf", label: "PDF" },
  { key: "code", label: "Code mẫu" },
  { key: "other", label: "Khác" },
];

interface DocumentTypeTabsProps<T = TabKey> {
  activeTab: T;
  onChangeTab: (tab: T) => void;
  tabs?: TabItem<T>[];
  className?: string;
}

export function DocumentTypeTabs<T extends string = TabKey>({
  activeTab,
  onChangeTab,
  tabs = DEFAULT_TABS as unknown as TabItem<T>[],
  className,
}: DocumentTypeTabsProps<T>) {
  return (
    <div className={cn("flex items-center gap-6 border-b border-gray-200", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChangeTab(tab.key)}
          className={cn(
            "pb-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
            activeTab === tab.key
              ? "border-b-2 border-primary-600 font-semibold text-primary-600"
              : "border-b-2 border-transparent text-gray-600 hover:text-gray-900"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}