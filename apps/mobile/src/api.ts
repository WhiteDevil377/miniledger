import { Platform } from 'react-native';

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000')
).replace(/\/$/, '');
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}
let onExpired: (() => void) | undefined;
export function setSessionExpiredHandler(handler?: () => void) {
  onExpired = handler;
}

export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${API_URL}/api${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (response.status === 204) return undefined as T;
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) onExpired?.();
      throw new ApiError(
        data.error || 'Something went wrong. Please try again.',
        response.status,
        data.fields,
      );
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      'Could not reach MiniLedger. Check that the API is running and your phone is on the same Wi-Fi.',
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
}
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';
