// apps/web/src/middleware.ts (CORRIGIDO - BASEADO NO SEU ORIGINAL)
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Rotas que requerem autenticação
const protectedRoutes = ['/admin', '/profile'];

// Rotas que são apenas para usuários não autenticados
const authRoutes = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🎯 CORREÇÃO: Adicionar logs de debug
  console.log(`🔍 Middleware verificando: ${pathname}`);

  // Verificar se é uma rota protegida
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Verificar se é uma rota de autenticação
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Se não for uma rota que precisa de verificação, continuar
  if (!isProtectedRoute && !isAuthRoute) {
    console.log(`➡️ Rota neutra, continuando: ${pathname}`);
    return NextResponse.next();
  }

  // Tentar verificar autenticação via API
  try {
    // 🎯 CORREÇÃO: Verificar cookies também
    const sessionToken = request.cookies.get('session_token')?.value;
    const sessionId = request.cookies.get('session_id')?.value;

    console.log(
      `🔑 Verificando tokens: token=${!!sessionToken}, id=${!!sessionId}`
    );

    // Construir headers para autenticação
    const cookieHeader = request.headers.get('cookie') || '';

    const authResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        // 🎯 CORREÇÃO: Passar cookies do request original + verificar se tem session_token
        cookie: cookieHeader,
      },
    });

    const isAuthenticated = authResponse.ok;
    console.log(
      `🔐 Status de autenticação: ${isAuthenticated} (${authResponse.status})`
    );

    // Se estiver tentando acessar rota protegida sem estar autenticado
    if (isProtectedRoute && !isAuthenticated) {
      console.log(`🚫 Acesso negado à rota protegida: ${pathname}`);

      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);

      console.log(`↩️ Redirecionando para login: ${loginUrl.toString()}`);
      return NextResponse.redirect(loginUrl);
    }

    // Se estiver tentando acessar rota de auth já estando autenticado
    if (isAuthRoute && isAuthenticated) {
      console.log(
        `🔄 Usuário autenticado tentando acessar ${pathname}, redirecionando`
      );

      const redirectTo =
        request.nextUrl.searchParams.get('redirect') || '/admin';
      const redirectUrl = new URL(redirectTo, request.url);

      console.log(
        `➡️ Redirecionando usuário autenticado para: ${redirectUrl.toString()}`
      );
      return NextResponse.redirect(redirectUrl);
    }

    console.log(`✅ Acesso permitido: ${pathname}`);
    return NextResponse.next();
  } catch (error) {
    console.error('❌ Erro no middleware de auth:', error);

    // Em caso de erro, permitir acesso a rotas não protegidas
    // e redirecionar rotas protegidas para login
    if (isProtectedRoute) {
      console.log(
        `🚨 Erro na verificação, redirecionando rota protegida para login`
      );

      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    console.log(
      `⚠️ Erro na verificação, mas permitindo acesso à rota não protegida: ${pathname}`
    );
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
