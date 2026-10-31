export function getThumbnailUrl(path?: string | null): string | null {
  if (!path) return null;
  if (
    path.startsWith("data:") ||
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  
  const baseUrl = import.meta.env.VITE_API_URL || "";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}?t=${Date.now()}`;
}
