/** Lightweight HTTP helper (fallback)
 * Prefer importing apiRequest from "@/lib/queryClient" if available in the app.
 */
export async function http(method: string, url: string, body?: any, headers: Record<string,string> = {}) {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  };
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
  }
  return res;
}
