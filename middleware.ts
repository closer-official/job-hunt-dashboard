import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/companies/:path*', '/compare/:path*', '/history/:path*']
};
