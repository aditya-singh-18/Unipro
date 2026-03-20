import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const makeNonce = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

export function middleware(request: NextRequest) {
  const nonce = makeNonce();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${apiUrl} ${supabaseUrl}`.trim(),
    "img-src 'self' data: https:",
    "font-src 'self' https: data:",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "report-uri /api/csp-report",
  ].join('; ');

  response.headers.set('Content-Security-Policy-Report-Only', csp);
  response.headers.set('x-nonce', nonce);

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
