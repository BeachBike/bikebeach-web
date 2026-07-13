import type { AxiosError } from 'axios';

/// Flattens an API error into a human-readable string.
///
/// NestJS's `ValidationPipe` returns `message` as a **string[]** (one entry
/// per failed rule); a hand-thrown `HttpException` returns it as a plain
/// **string**. The signup form used to render only the string case and fell
/// back to a generic "tenta de novo" for arrays — which hid the real reason
/// (e.g. "Senha precisa ter no mínimo 10 caracteres", "CPF inválido") and
/// left users stuck with no idea what to fix. Always surface the actual
/// message(s) here so the UI can show them verbatim.
export function extractApiError(err: unknown, fallback: string): string {
  const data = (err as AxiosError<{ message?: string | string[] }> | undefined)
    ?.response?.data;
  const msg = data?.message;
  if (Array.isArray(msg)) {
    const joined = msg.filter(Boolean).join('. ');
    return joined || fallback;
  }
  if (typeof msg === 'string' && msg.trim()) return msg;
  return fallback;
}
