# Remove Supabase and use only backend Postgres auth

1. Delete `client/src/services/supabaseClient.ts`.
2. Remove all Supabase imports and usage from `client/src/pages/Auth.tsx`.
3. Restore or update `Auth.tsx` and `Login.tsx` to use only your backend API for registration and login (via `api.ts`).
4. Remove all Supabase-related environment variables from `.env.local`.
5. Remove any Supabase-specific images or assets if not needed.
6. Use Adminer or your backend API to view/manage users.

---

**Next steps:**
- I will now delete `supabaseClient.ts` and remove all Supabase code from `Auth.tsx`.
- Then I will update `Auth.tsx` to use your backend API for all auth flows.
- I will also clean up `.env.local` and any other unnecessary Supabase code.
