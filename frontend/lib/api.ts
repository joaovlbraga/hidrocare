const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = sessionStorage.getItem("access_token");
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  if (response.status === 401) {
    location.href = "/login";
    return null;
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Não foi possível concluir a operação");
  }
  return response.status === 204 ? null : response.json();
}
