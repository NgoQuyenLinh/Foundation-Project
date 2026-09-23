// frontend/digital-library/src/components/shared/StarRating.tsx

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/utils/cn";

export interface StarRatingProps {
  value: number;
  onChange?: (val: number) => void;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  count?: number;
  className?: string;
}

export function StarRating({
  value,
  onChange,
  size = "md",
  showValue = false,
  count,
  className,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const isInteractive = Boolean(onChange);

  const starSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base font-semibold",
  };

  const displayVal = hoverValue !== null ? hoverValue : value;

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => isInteractive && setHoverValue(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = displayVal >= star;
          const isHalf = !isFilled && displayVal >= star - 0.5;

          return (
            <button
              key={star}
              type="button"
              disabled={!isInteractive}
              onClick={() => onChange?.(star)}
              onMouseEnter={() => isInteractive && setHoverValue(star)}
              className={cn(
                "p-0.5 transition-transform focus:outline-none",
                isInteractive ? "cursor-pointer hover:scale-115" : "cursor-default"
              )}
              title={isInteractive ? `${star} sao` : `${value} sao`}
            >
              <div className="relative">
                {/* Background empty star */}
                <Star
                  className={cn(
                    starSizes[size],
                    "text-gray-300 transition-colors"
                  )}
                />
                {/* Filled overlay */}
                {(isFilled || isHalf) && (
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: isFilled ? "100%" : "50%" }}
                  >
                    <Star
                      className={cn(
                        starSizes[size],
                        "text-amber-400 fill-amber-400"
                      )}
                    />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {showValue && (
        <span className={cn(textSizes[size], "font-semibold text-gray-800 ml-0.5")}>
          {value > 0 ? value.toFixed(1) : "Chưa có"}
        </span>
      )}

      {typeof count === "number" && (
        <span className="text-xs text-gray-400">
          ({count})
        </span>
      )}
    </div>
  );
}

export default StarRating;
