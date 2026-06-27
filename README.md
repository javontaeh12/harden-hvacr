# Quote Sheet

A full-stack Next.js application for HVAC service technicians with:

- **Public Quote Form** - Create service quotes with auto-save and PDF export
- **Admin Portal** (login required):
  - AI-powered HVAC/Refrigeration troubleshooting (OpenAI GPT-4o-mini)
  - Van inventory management
  - Low-stock tracking with Excel export
  - User approval system

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Google OAuth
- **AI**: OpenAI API (GPT-4o-mini)
- **Email**: Resend

## Getting Started

### 1. Clone and Install

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase/schema.sql`
3. Enable Google OAuth in Authentication > Providers
4. Add your site URL to Authentication > URL Configuration

### 3. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-api-key
RESEND_API_KEY=your-resend-key
ADMIN_EMAIL=your-email@example.com
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the quote form.

## Project Structure

```
app/
├── page.tsx              # Public quote form
├── login/                # Google OAuth login
├── pending/              # Awaiting approval page
├── admin/
│   ├── page.tsx          # Dashboard
│   ├── inventory/        # Van inventory management
│   ├── orders/           # Low-stock orders & export
│   ├── ai-helper/        # AI troubleshooting chat
│   └── users/            # User management (admin only)
└── api/
    ├── chat/             # OpenAI chat endpoint
    ├── inventory/        # Inventory CRUD
    ├── export/           # Excel export
    └── users/approve/    # User approval

components/
├── ui/                   # Reusable UI components
├── ChatInterface.tsx     # AI chat component
├── InventoryTable.tsx    # Inventory management
├── Sidebar.tsx           # Admin navigation
└── AuthProvider.tsx      # Auth context

lib/
├── supabase.ts           # Browser Supabase client
├── supabase-server.ts    # Server Supabase client
├── openai.ts             # OpenAI client
└── utils.ts              # Helpers
```

## User Roles

- **Admin**: Full access to all features, can approve users, manage all vans
- **Tech**: Can manage their assigned van's inventory, use AI helper

## User Approval Flow

1. User signs in with Google
2. Profile created with `status: 'pending'`
3. Admin receives email notification
4. User sees pending approval page
5. Admin approves in User Management
6. User can access admin portal

## Deployment

Deploy to Vercel:

```bash
vercel
```

Make sure to:
1. Add environment variables in Vercel dashboard
2. Update Supabase redirect URLs to include your production domain
3. Configure Google OAuth with production URLs

## License

MIT
