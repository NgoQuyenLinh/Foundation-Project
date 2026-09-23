// frontend/digital-library/src/components/shared/RatingCard.tsx

import { StarRating } from "./StarRating";
import { Avatar } from "@/components/ui/Avatar";
import { Trash2 } from "lucide-react";
import type { Rating } from "@/types/library";

export interface RatingCardProps {
  rating: Rating;
  isOwner?: boolean;
  onDelete?: (id: number) => void;
}

export function RatingCard({ rating, isOwner, onDelete }: RatingCardProps) {
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="flex gap-3.5 p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-colors">
      <Avatar name={rating.user_name} size="default" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 leading-tight">
              {rating.user_name}
            </h4>
            <div className="mt-1 flex items-center gap-2">
              <StarRating value={rating.stars} size="sm" />
              <span className="text-xs text-gray-400">
                {formatDate(rating.created_at)}
              </span>
            </div>
          </div>

          {isOwner && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(rating.id)}
              className="text-gray-400 hover:text-red-600 p-1 rounded-md transition-colors"
              title="Xóa đánh giá"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {rating.comment && (
          <p className="mt-2 text-sm text-gray-700 leading-relaxed break-words whitespace-pre-line">
            {rating.comment}
          </p>
        )}
      </div>
    </div>
  );
}

export default RatingCard;
