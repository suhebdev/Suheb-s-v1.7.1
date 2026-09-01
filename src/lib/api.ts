/**
 * ============================================================================
 * Centralized API URL Resolution Helper (CORS & Cross-Domain Deployment Support)
 * ============================================================================
 * Responsibility: Prepends the production backend URL (VITE_BACKEND_URL) when
 * running in a decoupled cross-domain environment (e.g. frontend on InfinityFree
 * and backend on Render). In local development or unified builds, falls back
 * to relative routing.
 */

export function getApiUrl(path: string): string {
  // If path is already a fully qualified URL, return it as is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Ensure path starts with a leading slash
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // Read backend URL defined at compile-time in Vite environment
  const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL;
  if (backendUrl) {
    const base = backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl;
    return `${base}${cleanPath}`;
  }

  return cleanPath;
}

export default getApiUrl;
