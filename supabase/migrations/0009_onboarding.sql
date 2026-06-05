-- ============================================================================
-- Prismora migration 0009 — onboarding flag
-- ----------------------------------------------------------------------------
-- Adds profiles.onboarded so new users are routed through the onboarding wizard
-- exactly once. Existing users are marked onboarded so they are NOT interrupted.
-- Idempotent. Run in the Supabase SQL editor.
-- ============================================================================

alter table public.profiles
  add column if not exists onboarded boolean not null default false;

-- Anyone who already belongs to a workspace has effectively onboarded — don't
-- bounce existing users into the wizard.
update public.profiles p
set onboarded = true
where p.onboarded = false
  and exists (
    select 1 from public.workspace_members m
    where m.user_id = p.id and m.status = 'accepted'
  );

-- Reload PostgREST's schema cache so the new column is visible immediately.
notify pgrst, 'reload schema';
