const API_BASE = process.env.API_BASE_URL ?? 'https://el-khabir-uat.vercel.app/api/v1';

export function uniquePhone(): string {
  const ts = Date.now().toString().slice(-8);
  return `+9665${ts}`;
}

export function uniqueEmail(): string {
  const ts = Date.now().toString().slice(-8);
  return `e2e.${ts}@example.com`;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, body };
}

export async function isApiUp(): Promise<boolean> {
  try {
    const { status } = await apiFetch('/appliance-categories');
    return status === 200;
  } catch {
    return false;
  }
}

export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export function registerPayload(role: string, phone: string, password: string) {
  return { role, phone, password };
}

export function extractToken(body: unknown): string | null {
  if (body && typeof body === 'object' && 'data' in body) {
    const data = (body as Record<string, unknown>).data;
    if (data && typeof data === 'object' && 'accessToken' in data) {
      return (data as Record<string, unknown>).accessToken as string;
    }
  }
  return null;
}
