import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Operational error with an HTTP status. Throw it anywhere inside a route
 * handler (including inside a Prisma `$transaction` callback) and let
 * `errorHandler` translate it into the right JSON response.
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
    // Restore the prototype chain for `instanceof` across transpilation.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Centralised error → Response mapper. Keeps the existing `{ error: string }`
 * shape that the frontend already consumes. Unknown errors are logged and
 * collapsed to a generic 500 so internals never leak to clients.
 */
export function errorHandler(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? 'Validation error.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.error('Unexpected API error:', error);
  return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
}
