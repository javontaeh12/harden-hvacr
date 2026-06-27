import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.signOut();

  // Also explicitly delete all Supabase auth cookies
  request.cookies.getAll().forEach((cookie) => {
    if (cookie.name.includes('sb-') && cookie.name.includes('auth-token')) {
      response.cookies.set(cookie.name, '', {
        expires: new Date(0),
        path: '/',
      });
    }
  });

  return response;
}
