import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Helper: create a redirect that preserves refreshed session cookies.
  // Without this, Supabase refresh token rotation invalidates the old token
  // but the new one never reaches the browser, killing the session.
  // IMPORTANT: Pass the full cookie object (not just name/value) so maxAge,
  // path, sameSite etc. are preserved. Without options, cookies become
  // session-only and are lost when the browser closes.
  function redirect(url: URL) {
    const res = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie);
    });
    return res;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Portal routes — handled by server-side layout auth, just refresh session cookies
  if (pathname.startsWith('/portal')) {
    return supabaseResponse;
  }

  // Public routes that don't require auth
  const publicRoutes = [
    '/',
    '/login',
    '/auth/callback',
    '/onboarding',
    '/api/pricing/public',
    '/api/request',
    '/api/webhooks/discord',
    '/api/webhooks/inbound-email',
    '/api/webhooks/vapi',
    '/api/truck/bouncie/webhook',
    '/api/truck/bouncie/auth',
  ];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route
  ) || pathname.startsWith('/api/cron/');

  // If accessing admin routes without being logged in
  if (pathname.startsWith('/admin') || pathname === '/pending' || pathname === '/onboarding') {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return redirect(url);
    }

    // Check user profile for onboarding and admin routes
    if (pathname.startsWith('/admin') || pathname === '/onboarding') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('status, role, group_id')
        .eq('id', user.id)
        .single();

      // No group_id yet — redirect to onboarding (unless already there)
      if (profile && !profile.group_id && pathname !== '/onboarding') {
        const url = request.nextUrl.clone();
        url.pathname = '/onboarding';
        return redirect(url);
      }

      // If on onboarding but already has group_id, redirect to appropriate page
      if (pathname === '/onboarding' && profile?.group_id) {
        const url = request.nextUrl.clone();
        url.pathname = profile.status === 'approved' ? '/admin' : '/pending';
        return redirect(url);
      }

      // Admin route checks
      if (pathname.startsWith('/admin')) {
        // If no profile or pending, redirect to pending page
        if (!profile || profile.status === 'pending') {
          const url = request.nextUrl.clone();
          url.pathname = '/pending';
          return redirect(url);
        }

        // If rejected, redirect to login with error
        if (profile.status === 'rejected') {
          const url = request.nextUrl.clone();
          url.pathname = '/login';
          url.searchParams.set('error', 'access_denied');
          return redirect(url);
        }

        // Admin-only routes
        if ((pathname === '/admin/users' || pathname === '/admin/stock-parts') && profile.role !== 'admin') {
          const url = request.nextUrl.clone();
          url.pathname = '/admin';
          return redirect(url);
        }

        // Developer-only routes (restricted to specific email)
        if ((pathname.startsWith('/admin/developer') || pathname === '/admin/create-group') && user.email !== (process.env.DEVELOPER_EMAIL || 'javontaedharden@gmail.com')) {
          const url = request.nextUrl.clone();
          url.pathname = '/admin';
          return redirect(url);
        }

        // Pass verified user ID and group_id to layout via headers so it skips re-fetching
        supabaseResponse.headers.set('x-user-id', user.id);
        if (profile.group_id) {
          supabaseResponse.headers.set('x-group-id', profile.group_id);
        }
        supabaseResponse.headers.set('x-user-role', profile.role);
        supabaseResponse.headers.set('x-user-status', profile.status);
      }
    }
  }

  // If user is logged in and approved, redirect away from login/pending
  if (user && (pathname === '/login' || pathname === '/pending')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status, group_id')
      .eq('id', user.id)
      .single();

    // No group yet — send to onboarding
    if (profile && !profile.group_id && pathname !== '/login') {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return redirect(url);
    }

    if (profile?.status === 'approved') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
