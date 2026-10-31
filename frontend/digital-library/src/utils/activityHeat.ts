// frontend/digital-library/src/utils/activityHeat.ts

export interface ActivityHeatStyle {
  level: number; // 0: <5, 1: 5-9, 2: 10-19, 3: >=20
  cardBg: string; // Background class for the card
  hoverBg: string; // Hover background class for list view
  border: string; // Border color class
  badgeText: string | null;
  badgeClass: string;
}

/**
 * Tính toán mức độ nhiệt (activity heat) dựa trên số lần xem tài liệu.
 * Mức 0 (< 5 lần): Giao diện trắng tiêu chuẩn.
 * Mức 1 (5 - 9 lần): Nền ngả vàng hổ phách rất nhẹ (amber-50/25), viền ấm nhẹ, badge "5+ xem".
 * Mức 2 (10 - 19 lần): Nền ngả vàng hổ phách vừa (amber-50/70), viền amber-300, badge "🔥 10+ xem".
 * Mức 3 (>= 20 lần): Nền đậm nổi bật (orange-50/80), viền orange-300, badge "⚡ Thường dùng (20+)".
 */
export function getActivityHeat(viewCount: number = 0): ActivityHeatStyle {
  if (viewCount >= 20) {
    return {
      level: 3,
      cardBg: "bg-orange-50/80",
      hoverBg: "hover:bg-orange-100/60",
      border: "border-orange-300 group-hover:border-orange-400",
      badgeText: "⚡ Thường dùng (20+)",
      badgeClass: "bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-xs",
    };
  }

  if (viewCount >= 10) {
    return {
      level: 2,
      cardBg: "bg-amber-50/70",
      hoverBg: "hover:bg-amber-100/50",
      border: "border-amber-200 group-hover:border-amber-300",
      badgeText: "🔥 10+ xem",
      badgeClass: "bg-amber-100 text-amber-800 font-medium border border-amber-200",
    };
  }

  if (viewCount >= 5) {
    return {
      level: 1,
      cardBg: "bg-amber-50/30",
      hoverBg: "hover:bg-amber-50/60",
      border: "border-amber-200/60 group-hover:border-amber-200",
      badgeText: "5+ xem",
      badgeClass: "bg-amber-50/90 text-amber-700 font-medium border border-amber-200/60",
    };
  }

  return {
    level: 0,
    cardBg: "bg-white",
    hoverBg: "hover:bg-slate-50/80",
    border: "border-gray-200/80",
    badgeText: null,
    badgeClass: "",
  };
}
