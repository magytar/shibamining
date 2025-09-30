import { NextResponse } from 'next/server';

export function middleware(request) {
	const url = request.nextUrl;
	const isDashboard = url.pathname.startsWith('/dashboard');
	const isLogin = url.pathname === '/';

	// Verifica se existe token de autenticação do Supabase
	const supabaseToken = request.cookies.get('sb-access-token');

	if (isDashboard && !supabaseToken) {
		url.pathname = '/'; // Redireciona para login
		return NextResponse.redirect(url);
	}

	// Se estiver na página de login e já estiver autenticado, redireciona para dashboard
	if (isLogin && supabaseToken) {
		url.pathname = '/dashboard';
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/', '/dashboard/:path*'],
};
