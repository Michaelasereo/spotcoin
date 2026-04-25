import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttps = forwardedProto === "https" || request.nextUrl.protocol === "https:";
  if (isHttps) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.protocol = "https:";
  return NextResponse.redirect(redirectUrl, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
