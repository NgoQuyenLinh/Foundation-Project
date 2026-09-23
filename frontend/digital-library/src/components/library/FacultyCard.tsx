// frontend/digital-library/src/components/library/FacultyCard.tsx

import { GraduationCap, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Faculty } from "@/types/library";

const CARD_COLORS = [
  { bg: "#2F6B3C12", text: "#2F6B3C", hoverBorder: "hover:border-primary-500" }, // primary
  { bg: "#2563EB12", text: "#2563EB", hoverBorder: "hover:border-blue-500" },    // blue
  { bg: "#D9770612", text: "#D97706", hoverBorder: "hover:border-amber-500" },   // orange/amber
  { bg: "#7C3AED12", text: "#7C3AED", hoverBorder: "hover:border-purple-500" },  // purple
  { bg: "#0891B212", text: "#0891B2", hoverBorder: "hover:border-cyan-500" },    // cyan
  { bg: "#E11D4812", text: "#E11D48", hoverBorder: "hover:border-rose-500" },    // rose
];

export interface FacultyCardProps {
  faculty: Faculty;
  index?: number;
  onClick: () => void;
}

export function FacultyCard({ faculty, index = 0, onClick }: FacultyCardProps) {
  const colorTheme = CARD_COLORS[index % CARD_COLORS.length];

  return (
    <Card
      className={`
        group
        relative
        flex
        min-h-[120px]
        cursor-pointer
        flex-col
        justify-between
        rounded-xl
        border
        border-gray-200/90
        bg-white
        p-5
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-1
        hover:shadow-md
        ${colorTheme.hoverBorder}
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-start gap-4">
        {/* Icon tile */}
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
          style={{
            backgroundColor: colorTheme.bg,
            color: colorTheme.text,
          }}
        >
          <GraduationCap className="h-6 w-6" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase"
              style={{
                backgroundColor: colorTheme.bg,
                color: colorTheme.text,
              }}
            >
              {faculty.code}
            </span>
          </div>
          <h3
            className="mt-1.5 text-base font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2 leading-snug"
            title={faculty.name}
          >
            {faculty.name}
          </h3>
        </div>
      </div>

      {/* Footer stats */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500 font-medium">
        <span>
          {faculty.subject_count} môn học · {faculty.document_count} tài liệu
        </span>
        <div className="flex items-center text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
          <span className="text-xs mr-1">Khám phá</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </Card>
  );
}

export default FacultyCard;
