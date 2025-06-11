// apps/web/src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Rotas que requerem autenticação
const protectedRoutes = ['/admin', '/profile'];

// Rotas que são apenas para usuários não autenticados
const authRoutes = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verificar se é uma rota protegida
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Verificar se é uma rota de autenticação
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Se não for uma rota que precisa de verificação, continuar
  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  // Tentar verificar autenticação via API
  try {
    const authResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        // Passar cookies do request original
        cookie: request.headers.get('cookie') || '',
      },
    });

    const isAuthenticated = authResponse.ok;

    // Se estiver tentando acessar rota protegida sem estar autenticado
    if (isProtectedRoute && !isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Se estiver tentando acessar rota de auth já estando autenticado
    if (isAuthRoute && isAuthenticated) {
      const redirectTo =
        request.nextUrl.searchParams.get('redirect') || '/admin';
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Erro no middleware de auth:', error);

    // Em caso de erro, permitir acesso a rotas não protegidas
    // e redirecionar rotas protegidas para login
    if (isProtectedRoute) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
