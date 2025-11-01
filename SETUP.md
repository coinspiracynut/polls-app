# Polls App - Setup Guide

Complete multi-tenant polling application with real-time results, built with Next.js, Supabase, and Tailwind CSS.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- A Supabase account (free tier works)
- Twitter Developer account (for OAuth)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

#### Create a new project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for setup to complete

#### Run Database Migrations
Copy and paste each SQL file in order into the Supabase SQL Editor:

1. `supabase/migrations/01_schema.sql` - Creates all tables
2. `supabase/migrations/02_rls.sql` - Sets up Row Level Security
3. `supabase/migrations/03_functions.sql` - Creates database functions
4. `supabase/migrations/04_triggers.sql` - Auto-creates profiles on signup
5. `supabase/migrations/05_realtime.sql` - Enables realtime subscriptions
6. `supabase/migrations/06_poll_status.sql` - Adds draft/live/closed status
7. `supabase/migrations/07_update_rls_for_drafts.sql` - Updates RLS for draft polls

#### Enable Realtime (Critical!)
1. Go to **Table Editor** in the left sidebar
2. For each of these tables, click the table name and toggle **Realtime ON**:
   - `questions` (for live question updates)
   - `tallies` (for aggregate counts)
   - `participants` (for avatar wall)
   - `votes` (for real-time voter display - REQUIRED!)

Note: This enables websocket subscriptions for real-time updates. Without this, votes and questions won't update live!

### 3. Deploy Edge Functions

Deploy the three Edge Functions using Supabase CLI:

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy cast_vote
supabase functions deploy advance_question
supabase functions deploy close_question
```

### 4. Configure Twitter OAuth

#### Create Twitter App
1. Go to [developer.twitter.com](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app
3. Enable OAuth 2.0
4. Add callback URL: `https://your-project.supabase.co/auth/v1/callback`

#### Configure in Supabase
1. Go to **Authentication** → **Providers** in Supabase
2. Enable Twitter
3. Add your Twitter Client ID and Client Secret
4. Save changes

### 5. Set Environment Variables

Create a `.env.local` file in the root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get these values from **Project Settings** → **API** in Supabase Dashboard.

### 6. Run Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🌐 Deploy to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-repo-url
git push -u origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

### 3. Update Twitter OAuth Callback
Add your Vercel domain to Twitter app callback URLs:
- `https://your-app.vercel.app/auth/callback`

And update Supabase Auth redirect URLs in **Authentication** → **URL Configuration**.

## 📋 Usage

### Creating a Poll (Twitter-Style)

1. **Login** with Twitter
2. Click **"Create Poll"** in the navigation
3. Enter your question
4. Add at least 2 answer options (add more with the "+" button)
5. Choose to:
   - **Save as Draft** - Save for later, only you can see it
   - **Publish Now** - Goes live immediately, appears in discovery feed

### Managing Your Polls

1. Click **"My Polls"** to see all your polls organized by status:
   - **Drafts** - Unpublished polls (edit and publish when ready)
   - **Live** - Currently active and accepting votes
   - **Closed** - Voting ended, results locked
2. Click **"Manage"** or **"Edit"** on any poll to access the admin panel

### Publishing & Editing Polls

In the Admin Panel, you can:
- **Publish a draft** - Click "Publish Poll" to make it live
- **Edit a poll** - Update question text or answer options (shows "edited" badge)
- **Close voting** - Click "Close Poll" to end voting and lock results

### Voting

1. Visit a poll URL (from discovery feed or shared link)
2. Click your answer choice
3. Watch as your avatar appears under your choice with a smooth animation!
4. See everyone else's votes in real-time
5. Toggle between compact (avatars only) and expanded (avatars + handles) views

### Discovery Feed

- The homepage shows all **live** public polls
- Drafts and closed polls don't appear in discovery
- You can still visit closed polls directly to see final results

## 🔧 Database Schema

### Core Tables
- **profiles** - User metadata (handle, avatar)
- **polls** - Poll metadata (title, slug, owner, status: draft/live/closed)
- **poll_admins** - Co-admins for polls
- **questions** - Questions in a poll (each poll has one question for now)
- **options** - Answer choices (custom, minimum 2, no maximum)
- **votes** - User votes (one per question)
- **tallies** - Aggregated vote counts
- **participants** - Active users in poll (for avatar wall)

### Key Features
- **Twitter-style single-question polls** with custom answers
- **Draft/Live/Closed workflow** for poll lifecycle management
- **Edit tracking** - polls show "edited" badge after publication
- One vote per user per question
- **Individual votes are publicly visible** - see WHO voted for WHAT
- Real-time avatar animations with Framer Motion
- Compact/expanded view modes
- Atomic vote counting via database functions
- Public/private poll visibility
- Discovery feed shows only live polls

## 🔐 Security

### Row-Level Security (RLS)
All tables have RLS enabled with policies for:
- Public polls are readable by everyone
- **All votes are publicly readable** (so you can see who voted for what)
- Only poll owners/admins can manage questions
- Only authenticated users can vote
- Users can only vote once per question

### Edge Functions
Vote counting and question management use service role keys (server-side only) to ensure atomicity and prevent race conditions.

## 🎨 Customization

### Allow Multiple Questions Per Poll
The database supports multiple questions, but the UI is currently simplified to Twitter-style single-question polls. To enable multi-question:
1. Update `NewPollForm.tsx` to allow adding multiple questions
2. Update the admin panel to show all questions (already partially supported)

### Styling
All components use Tailwind CSS and shadcn/ui. Customize in:
- `src/app/globals.css` - Color scheme
- `tailwind.config.ts` - Theme settings

### Add Features
The database is ready for:
- Custom options (already supported)
- Question reordering (drag & drop UI needed)
- Poll analytics
- Export results
- Multiple choice (requires UI changes)

## 🐛 Troubleshooting

### Votes not showing up
- Check Edge Functions are deployed
- **Verify Realtime is enabled on `votes` table** (this is critical!)
- Verify Realtime is enabled on `tallies` table
- Check browser console for errors
- Look for websocket connection in Network tab

### Can't login
- Verify Twitter OAuth credentials in Supabase
- Check callback URLs match exactly
- Ensure auth redirect URLs are set in Supabase

### Questions not updating live
- Verify Realtime is enabled on `questions` table
- Check browser network tab for websocket connection
- Refresh page to reconnect

## 📚 Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **Styling**: Tailwind CSS, shadcn/ui components
- **Deployment**: Vercel (frontend), Supabase (backend)

## 🤝 Contributing

This is an open-source project. Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📝 License

MIT License - see LICENSE file

