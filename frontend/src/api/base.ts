export const getBaseURL = (): string => '';

export type ApiErrorPayload = {
  error?: {
    code?: string;
    params?: Record<string, unknown>;
  };
  detail?: unknown;
};

type NestedDetailEnvelope = {
  error?: {
    code?: string;
    params?: Record<string, unknown>;
  };
  detail?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly params?: Record<string, unknown>;
  readonly detail?: string;

  constructor(args: {
    status: number;
    message: string;
    code?: string;
    params?: Record<string, unknown>;
    detail?: string;
  }) {
    super(args.message);
    this.name = 'ApiError';
    this.status = args.status;
    this.code = args.code;
    this.params = args.params;
    this.detail = args.detail;
  }
}

function asDetailString(detail: unknown): string | undefined {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((x) => String(x)).join('; ');
  if (detail && typeof detail === 'object') return JSON.stringify(detail);
  return undefined;
}

export async function expectOk(r: Response): Promise<void> {
  if (r.ok) return;
  const ct = r.headers.get('content-type') ?? '';
  let payload: ApiErrorPayload | null = null;
  let raw: string;
  if (ct.includes('application/json')) {
    try {
      payload = (await r.json()) as ApiErrorPayload;
      raw = JSON.stringify(payload);
    } catch {
      raw = await r.text();
    }
  } else {
    raw = await r.text();
  }
  const code = payload?.error?.code;
  const nested = payload?.detail && typeof payload.detail === 'object'
    ? (payload.detail as NestedDetailEnvelope)
    : null;
  const resolvedCode = code ?? nested?.error?.code;
  const params =
    (payload?.error?.params && typeof payload.error.params === 'object'
      ? payload.error.params
      : undefined)
    ?? (nested?.error?.params && typeof nested.error.params === 'object'
      ? nested.error.params
      : undefined);
  const detail = asDetailString(
    nested && 'detail' in nested ? nested.detail : payload?.detail,
  );
  throw new ApiError({
    status: r.status,
    code: resolvedCode,
    params,
    detail,
    message: detail ?? (raw || `HTTP ${r.status}`),
  });
}

export function getApiErrorMeta(e: unknown): {
  code?: string;
  params?: Record<string, unknown>;
  detail?: string;
  message: string;
} {
  if (e instanceof ApiError) {
    return {
      code: e.code,
      params: e.params,
      detail: e.detail,
      message: e.message,
    };
  }
  if (e instanceof Error) {
    return { message: e.message };
  }
  return { message: String(e) };
}
