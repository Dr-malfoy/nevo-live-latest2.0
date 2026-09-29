import type { AxiosResponse } from 'axios';

/**
 * Wrapper for endpoints that are specified in API-SPEC.md but not built yet.
 *
 * Screens in this batch are written against the final contract. Until the
 * backend ships an endpoint, calling it returns 404/501 — `optional()` turns
 * that into `null` so the section quietly hides instead of throwing a red error
 * at the user. Every other failure (500, network, auth) still rejects, because
 * those are real problems worth surfacing.
 *
 * When the endpoint lands, nothing in the screen changes — it just starts
 * returning data.
 */
const NOT_BUILT = new Set([404, 501]);

export async function optional<T>(request: Promise<AxiosResponse<T>>): Promise<T | null> {
  try {
    const { data } = await request;
    return data;
  } catch (err: any) {
    const status = err?.response?.status;
    if (NOT_BUILT.has(status)) return null;
    throw err;
  }
}

/** Same, but returns `fallback` instead of null — handy for list endpoints. */
export async function optionalOr<T>(request: Promise<AxiosResponse<T>>, fallback: T): Promise<T> {
  const result = await optional(request);
  return result ?? fallback;
}
