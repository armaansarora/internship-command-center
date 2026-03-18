/** Standard API response shape — all routes use this */
export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string } };

/** Create a success response */
export function success<T>(data: T): ApiResponse<T> {
  return { data, error: null };
}

/** Create an error response */
export function apiError(code: string, message: string): ApiResponse<never> {
  return { data: null, error: { code, message } };
}
