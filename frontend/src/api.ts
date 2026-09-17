// Get backend API base URL from Vite environment variable (or fallback to empty string for same-domain/proxy)
const RAW_API_URL = (import.meta.env.VITE_API_URL as string) || '';
export const API_BASE_URL = RAW_API_URL.trim().replace(/\/+$/, '');

/**
 * Returns full URL for an API endpoint.
 * In development (or monolithic deployment), returns e.g. '/api/estimate'
 * In split production (e.g. Render), returns e.g. 'https://backend.onrender.com/api/estimate'
 */
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}

/**
 * Safely parse JSON from a fetch Response, with descriptive error messages
 * if the server returns HTML (e.g. Render SPA fallback / 404 / 502) or empty string.
 */
export async function parseJsonResponse<T = any>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (!text || !text.trim()) {
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status} (${response.statusText || 'Empty response'})`);
    }
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    if (text.includes('<!DOCTYPE') || text.includes('<html') || contentType.includes('text/html')) {
      throw new Error(
        `Received HTML instead of JSON from API (HTTP ${response.status}). If deployed on Render/Vercel, make sure VITE_API_URL is set in your frontend environment settings pointing to your backend URL.`
      );
    }
    throw new Error(`Invalid JSON received: ${text.slice(0, 100)}`);
  }
}
