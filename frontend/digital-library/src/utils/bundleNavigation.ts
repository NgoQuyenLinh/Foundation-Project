// frontend/digital-library/src/utils/bundleNavigation.ts

import type { Location, NavigateFunction } from "react-router-dom";

const STORAGE_KEY_PREFIX = "bundle_from_";

/**
 * Trả về đường dẫn đầy đủ hiện tại bao gồm cả search params và hash
 */
export function getCurrentFullPath(location: Location): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

/**
 * Điều hướng vào trang chi tiết gói (BundleDetailPage), đồng thời lưu trữ
 * đường dẫn trang xuất phát vào cả router state và sessionStorage (để giữ được sau khi F5).
 */
export function navigateToBundle(
  navigate: NavigateFunction,
  location: Location,
  targetUrl: string,
  options?: { replace?: boolean }
) {
  const currentFullPath = getCurrentFullPath(location);

  // Trích xuất bundleId từ targetUrl nếu có (dạng /personal/bundle/123 hoặc /groups/1/bundle/123)
  const match = targetUrl.match(/\/bundle\/(\d+)/);
  if (match && match[1]) {
    const bundleId = match[1];
    try {
      sessionStorage.setItem(`${STORAGE_KEY_PREFIX}${bundleId}`, currentFullPath);
    } catch {
      // bỏ qua nếu storage bị đầy hoặc private mode
    }
  }

  navigate(targetUrl, {
    state: { from: currentFullPath },
    replace: options?.replace,
  });
}

/**
 * Lấy đường dẫn trang xuất phát khi đang ở trong BundleDetailPage.
 * Ưu tiên:
 * 1. `location.state?.from` (nếu vừa chuyển trang trong SPA)
 * 2. `sessionStorage.getItem('bundle_from_<bundleId>')` (nếu người dùng bấm F5 reload trang)
 * 3. `fallbackUrl` (nếu mở link bundle trực tiếp ở tab mới hoặc không có lịch sử)
 */
export function getBundleOriginPath(
  location: Location,
  bundleId?: string | number,
  fallbackUrl: string = "/personal/documents"
): string {
  const stateFrom = (location.state as { from?: string } | null)?.from;
  if (stateFrom && typeof stateFrom === "string" && stateFrom.trim().length > 0) {
    return stateFrom;
  }

  if (bundleId) {
    try {
      const storedFrom = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${bundleId}`);
      if (storedFrom && storedFrom.trim().length > 0) {
        return storedFrom;
      }
    } catch {
      // ignore
    }
  }

  return fallbackUrl;
}
