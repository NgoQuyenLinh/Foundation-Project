// frontend/digital-library/src/components/library/SubjectCard.tsx

import { BookOpen, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StarRating } from "@/components/shared/StarRating";
import type { Subject } from "@/types/library";

export interface SubjectCardProps {
  subject: Subject;
  onClick: () => void;
}

export function SubjectCard({ subject, onClick }: SubjectCardProps) {
  return (
    <Card
      className="
        group
        relative
        flex
        min-h-[110px]
        cursor-pointer
        flex-col
        justify-between
        rounded-xl
        border
        border-gray-200/90
        bg-white
        p-4
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-1
        hover:border-primary-500
        hover:shadow-md
      "
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
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
            {subject.document_count} tài liệu
          </span>
        </div>

        <div className="mt-3">
          <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">
            {subject.code}
          </span>
          <h3
            className="mt-0.5 text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2 leading-snug"
            title={subject.name}
          >
            {subject.name}
          </h3>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5">
        <StarRating value={subject.avg_rating} size="sm" showValue={subject.avg_rating > 0} />
        <div className="flex items-center text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold">
          <span>Xem môn</span>
          <ArrowRight className="h-3 w-3 ml-1" />
        </div>
      </div>
    </Card>
  );
}

export default SubjectCard;
