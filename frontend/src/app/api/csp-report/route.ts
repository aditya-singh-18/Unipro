import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.warn('[CSP] Violation report:', body);
  } catch {
    console.warn('[CSP] Violation report parsing failed');
  }

  return new NextResponse(null, { status: 204 });
}
