interface GoogleErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export class GoogleApiError extends Error {
  constructor(
    readonly service: "gmail" | "calendar",
    readonly statusCode: number,
    readonly providerStatus: string | null,
    readonly providerMessage: string | null,
  ) {
    super(
      `${service} API error: ${statusCode}${
        providerStatus ? ` ${providerStatus}` : ""
      }${providerMessage ? ` - ${providerMessage}` : ""}`,
    );
    this.name = "GoogleApiError";
  }
}

export async function readGoogleApiError(
  service: "gmail" | "calendar",
  response: Response,
): Promise<GoogleApiError> {
  const body = (await response.json().catch(() => ({}))) as GoogleErrorBody;
  return new GoogleApiError(
    service,
    response.status,
    body.error?.status ?? null,
    body.error?.message ?? null,
  );
}

export function isGoogleApiDisabledError(err: unknown): boolean {
  return (
    err instanceof GoogleApiError &&
    err.statusCode === 403 &&
    /has not been used|disabled/i.test(err.providerMessage ?? "")
  );
}
