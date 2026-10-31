// src/hooks/useHoverExpand.ts

import { useRef, useState, useCallback, useEffect } from "react";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface UseHoverExpandOptions {
  delay?: number;
  scale?: number;
  enabled?: boolean;
}

export function useHoverExpand({
  delay = 2000,
  scale = 1.8,
  enabled = true,
}: UseHoverExpandOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isExpanded, setIsExpanded] = useState(false); // Điều khiển mount/unmount portal
  const [isZoomed, setIsZoomed] = useState(false);     // Kích hoạt transition phóng to / thu nhỏ
  const [originRect, setOriginRect] = useState<Rect | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!enabled) return;
    clearTimer();

    timerRef.current = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setOriginRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });

      // 1. Mount portal vào vị trí thẻ ban đầu
      setIsExpanded(true);

      // 2. Kích hoạt hiệu ứng bay ra giữa màn hình ở frame kế tiếp
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsZoomed(true);
        });
      });
    }, delay);
  }, [delay, enabled, clearTimer]);

  const handleMouseLeave = useCallback(() => {
    clearTimer();
    // 1. Thu nhỏ mượt mà trở lại vị trí gốc
    setIsZoomed(false);

    // 2. Đợi animation thu nhỏ chạy xong (300ms) rồi mới unmount
    closeTimerRef.current = setTimeout(() => {
      setIsExpanded(false);
      setOriginRect(null);
    }, 300);
  }, [clearTimer]);

  // Đóng khi nhấn ESC
  useEffect(() => {
    if (!isExpanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleMouseLeave();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isExpanded, handleMouseLeave]);

  useEffect(() => clearTimer, [clearTimer]);

  // Vị trí khi phóng to ở giữa màn hình
  const expandedStyle = useCallback((): React.CSSProperties => {
    if (!originRect) return {};

    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.88;

    const targetWidth = Math.min(originRect.width * scale, maxWidth);
    const targetHeight = Math.min(originRect.height * scale, maxHeight);
    const targetLeft = window.innerWidth / 2 - targetWidth / 2;
    const targetTop = window.innerHeight / 2 - targetHeight / 2;

    return {
      position: "fixed",
      top: targetTop,
      left: targetLeft,
      width: targetWidth,
      height: targetHeight,
      zIndex: 100,
    };
  }, [originRect, scale]);

  // Vị trí gốc ban đầu của thẻ
  const originStyle = useCallback((): React.CSSProperties => {
    if (!originRect) return {};
    return {
      position: "fixed",
      top: originRect.top,
      left: originRect.left,
      width: originRect.width,
      height: originRect.height,
      zIndex: 100,
    };
  }, [originRect]);

  return {
    containerRef,
    isExpanded,
    isZoomed,
    originRect,
    handleMouseEnter,
    handleMouseLeave,
    expandedStyle,
    originStyle,
  };
}