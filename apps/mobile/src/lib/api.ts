import { getAccessToken } from './session';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_GET_ATTEMPTS = 3;

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

type UnauthorizedHandler = (error: ApiError) => void | Promise<void>;
let unauthorizedHandler: UnauthorizedHandler | undefined;

export function configureUnauthorizedHandler(handler: UnauthorizedHandler | undefined): void {
  unauthorizedHandler = handler;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new ApiError('API manzili sozlanmagan. EXPO_PUBLIC_API_URL qiymatini kiriting.');

  const method = (options.method || 'GET').toUpperCase();
  const attempts = method === 'GET' ? MAX_GET_ATTEMPTS : 1;
  const token = await getAccessToken();
  let lastError: ApiError | undefined;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${API_URL}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });
      const data: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = getErrorMessage(data, response.status);
        const error = new ApiError(message, response.status);
        if (response.status === 401) await unauthorizedHandler?.(error);
        if ([502, 503, 504].includes(response.status) && attempt < attempts - 1) {
          lastError = error;
          await wait(800 * (attempt + 1));
          continue;
        }
        throw error;
      }
      return data as T;
    } catch (error) {
      const apiError = error instanceof ApiError
        ? error
        : new ApiError(error instanceof Error && error.name === 'AbortError'
          ? 'Server javob berishi kutilganidan uzoq davom etdi. Internetni tekshirib, qayta urinib ko‘ring.'
          : 'Serverga ulanib bo‘lmadi. Internetni tekshirib, birozdan so‘ng qayta urinib ko‘ring.');
      lastError = apiError;
      if (attempt < attempts - 1 && (apiError.status === undefined || [502, 503, 504].includes(apiError.status))) {
        await wait(800 * (attempt + 1));
        continue;
      }
      throw apiError;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new ApiError('Server vaqtincha javob bermayapti. Birozdan so‘ng qayta urinib ko‘ring.', 503);
}

function getErrorMessage(data: unknown, status: number): string {
  const body = data as { message?: unknown };
  const message = Array.isArray(body?.message)
    ? body.message.join(' · ')
    : typeof body?.message === 'string' ? body.message : '';
  if (message) return message;
  if (status === 503 || status === 502 || status === 504) return 'Server vaqtincha ishga tushmoqda. Biroz kutib qayta urinib ko‘ring.';
  if (status === 401) return 'Sessiya tugagan. Qayta kiring.';
  return 'So‘rovni bajarib bo‘lmadi. Qayta urinib ko‘ring.';
}
