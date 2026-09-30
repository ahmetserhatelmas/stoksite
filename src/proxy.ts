import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "stok_session";

type SessionPayload = {
  id?: string;
  role?: "admin" | "user";
};

function readSession(request: NextRequest): SessionPayload | null {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as SessionPayload;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = readSession(request);

  if (pathname === "/giris") {
    if (session?.id) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!session?.id) {
    const loginUrl = new URL("/giris", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  const isAdminOnly =
    pathname.startsWith("/yonetim") || pathname.startsWith("/admin");

  if (isAdminOnly && session.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\..*).*)",
  ],
};
