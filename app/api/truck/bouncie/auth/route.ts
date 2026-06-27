import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/bouncie';

// GET /api/truck/bouncie/auth — OAuth callback or get auth URL
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  const clientId = process.env.BOUNCIE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'BOUNCIE_CLIENT_ID not configured' }, { status: 500 });
  }

  // If code is present, this is the OAuth callback — exchange for token
  if (code) {
    const redirectUri = `${request.nextUrl.origin}/api/truck/bouncie/auth`;

    try {
      const tokenData = await exchangeCodeForToken(code, redirectUri);
      const accessToken = tokenData.access_token;

      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head><title>Bouncie Connected</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 640px; margin: 0 auto; background: #f9fafb; }
          .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          h1 { color: #10b981; margin-top: 0; }
          .token-box { background: #f3f4f6; padding: 16px; border-radius: 8px; font-family: monospace; word-break: break-all; font-size: 13px; margin: 16px 0; }
          .steps { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-top: 16px; }
          .steps li { margin-bottom: 8px; font-size: 14px; color: #1e40af; }
          a { color: #2563eb; }
        </style>
        </head>
        <body>
          <div class="card">
            <h1>Bouncie Connected!</h1>
            <p>Your Bouncie account has been authorized and tokens are stored securely. They will auto-refresh — no need to re-authenticate.</p>
            <div class="steps">
              <strong>You're all set!</strong>
              <ol>
                <li>Go to <a href="/admin/truck">Truck Management</a> → GPS Live tab</li>
                <li>Click "Sync Bouncie" to pull latest data</li>
                <li>Tokens will auto-refresh every hour — no manual steps needed</li>
              </ol>
            </div>
          </div>
        </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Token exchange failed';
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head><title>Bouncie Auth Error</title></head>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ef4444;">Authorization Failed</h1>
          <p>${message}</p>
          <p>Make sure <code>BOUNCIE_CLIENT_ID</code> and <code>BOUNCIE_CLIENT_SECRET</code> are set in your environment.</p>
          <a href="/admin/truck">Back to Truck Management</a>
        </body>
        </html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }
  }

  // No code — return the auth URL for the user to visit
  const redirectUri = `${request.nextUrl.origin}/api/truck/bouncie/auth`;
  const authUrl = `https://auth.bouncie.com/dialog/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;

  return NextResponse.json({
    auth_url: authUrl,
    redirect_uri: redirectUri,
    configured: !!process.env.BOUNCIE_ACCESS_TOKEN,
  });
}
