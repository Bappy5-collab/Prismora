# Prismora

A minimal, production-grade **AI-powered project management SaaS**. Workspaces → projects → tasks, with an AI task-breakdown feature. Built on Next.js 15 (App Router), TypeScript, Material UI, Supabase (Postgres + Auth + Realtime), TanStack Query and Zustand.

> Design system is strict: two colors only — **`#2563eb`** (primary blue) and **`#111827`** (secondary dark gray). No gradients, no glassmorphism, no decorative animation.

---

## Architecture

```
prismora/
├─ supabase/
│  └─ schema.sql              # Tables, enums, triggers, RLS policies, realtime
├─ middleware.ts              # Session refresh + route protection
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx           # Root layout (fonts + providers)
│  │  ├─ providers.tsx        # MUI theme + React Query providers
│  │  ├─ page.tsx             # Auth-aware redirect (→ dashboard | login)
│  │  ├─ login/ · signup/     # Supabase email/password auth
│  │  ├─ auth/callback/       # Email-confirmation code exchange
│  │  ├─ api/
│  │  │  ├─ ai/route.ts            # → /lib/ai.ts (OpenAI), auth-gated
│  │  │  ├─ workspaces/route.ts    # Privileged tenant creation (service role)
│  │  │  └─ invites/accept/route.ts# Claim pending invites on login
│  │  └─ (app)/               # Protected route group (AppShell)
│  │     ├─ dashboard/        # Stat cards
│  │     ├─ projects/         # List + [projectId] task management
│  │     ├─ members/          # Invite + manage workspace members
│  │     └─ notifications/    # In-app notifications
│  ├─ components/             # Reusable UI (layout, tasks, projects, ui/…)
│  ├─ hooks/                  # React Query hooks (one per domain)
│  ├─ services/               # Supabase data-access functions
│  ├─ store/                  # Zustand (active workspace only)
│  └─ lib/                    # supabase clients, theme, ai, types, utils
```

**Layering rule:** UI → `hooks/` (React Query) → `services/` (Supabase queries) → `lib/`. No data fetching in components, no business logic duplicated.

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

In [supabase.com](https://supabase.com), create a project. Then open the **SQL Editor** and run the entire contents of [`supabase/schema.sql`](./supabase/schema.sql). This creates all tables, triggers, helper functions and **Row Level Security policies**.

In **Authentication → Providers**, ensure *Email* is enabled. For the smoothest local dev, you may disable "Confirm email" (Authentication → Sign In / Providers) so signups log in immediately.

### 3. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in:

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same | public |
| `SUPABASE_SERVICE_ROLE_KEY` | same | **server only** |
| `OPENAI_API_KEY` | platform.openai.com | **server only**, used by `/lib/ai.ts` |
| `OPENAI_MODEL` | optional | defaults to `gpt-4o-mini` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` for dev | |

### 4. Run

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run typecheck
```

---

## Multi-tenancy & security (RLS)

The isolation boundary is the **workspace**. Every domain row (`projects`, `tasks`, `notifications`) carries a `workspace_id`, and RLS allows access only to members of that workspace.

Membership checks go through two `SECURITY DEFINER` helper functions:

```sql
public.is_workspace_member(ws_id uuid)  -- accepted member?
public.is_workspace_admin(ws_id uuid)   -- owner/admin?
```

These run as the table owner, so the `select` inside them is **not** re-filtered by RLS — this deliberately breaks the infinite-recursion trap you hit when a `workspace_members` policy selects from `workspace_members`. Example policy:

```sql
create policy "tasks_select_member" on public.tasks
  for select to authenticated
  using (public.is_workspace_member(workspace_id));
```

Triggers handle the boilerplate:
- `handle_new_user` → mirrors `auth.users` into `public.profiles`.
- `handle_new_workspace` → adds the creator as an `owner` member.
- `touch_updated_at` → maintains `tasks.updated_at`.

---

## AI module — `src/lib/ai.ts`

Server-only. Accepts a task description, calls OpenAI with a JSON-mode prompt, and returns a **strict** shape:

```json
{ "subtasks": ["…"], "priority": "low|medium|high", "estimatedTime": "2h" }
```

Output is normalized/validated before returning, so callers always get a valid `AiTaskBreakdown`. It's consumed through the auth-gated `POST /api/ai` route and the `useAiBreakdown` hook — used in the task dialog's **"AI breakdown"** button. The module is intentionally generic so future AI features can reuse it.

---

## Tech choices

- **Supabase Auth** (not NextAuth) via `@supabase/ssr` — cookie sessions shared across middleware, server components and the browser client.
- **TanStack Query** owns all server state/caching; **Zustand** holds only the selected workspace id (persisted to localStorage).
- **MUI** is the only UI library, themed to the two-color system in `src/lib/theme.ts`.
- **Supabase Realtime** — `tasks` and `notifications` are in the `supabase_realtime` publication. `src/hooks/useRealtime.ts` subscribes to Postgres changes and invalidates the React Query cache, so the task table and the notification badge update live (RLS-respected).

## Workspaces & invites

- **Workspace creation** runs through `POST /api/workspaces` using the service-role client (a tenant is a privileged, server-side concern). It authenticates the session and forces `owner_id = the current user`, then a DB trigger adds the creator as an `owner` member.
- **Invites**: an admin invites by email → a `pending` `workspace_members` row. When that person signs up / logs in, `POST /api/invites/accept` links the row to their user id and flips it to `accepted`, so they join every workspace they were invited to.
