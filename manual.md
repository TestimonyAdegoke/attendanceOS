# AttendOS QA Manual

Comprehensive testing guide covering every major workflow in AttendOS, based strictly on the current codebase (Next.js 14 + Supabase). Follow this document end-to-end when verifying new builds or preparing releases.

---

## 1. Environment & Accounts

| Item | Details |
| --- | --- |
| **Runtime** | Node.js 18+, Next.js 14 (App Router) |
| **Database/Auth** | Supabase (Postgres) with RLS, magic link + password auth |
| **Local env** | Copy `.env.local.example` to `.env.local`, fill Supabase keys/URLs, run `npm install`, `npm run dev` |
| **Test data** | Seed by running the Supabase migrations (see `/supabase/migrations`). |
| **Browsers** | Latest Chrome + Safari (desktop & mobile). Use device emulation for kiosk/self-check-in.
| **User Roles** | `org_owner`, `admin`, `operator`, `viewer`. Dashboard pages generally require `org_owner` or `admin` (see RLS policies).

Before testing, create two Supabase users:
1. **Org Owner** – completes onboarding and manages everything.
2. **Member** – invited via Team page to validate invites, portal, and self check-in.

---

## 2. Authentication Flows

### 2.1 Email + Password (`/login`)
1. Visit `/login`.
2. Enter valid credentials for an existing user.
3. Expect redirect to `/dashboard` or `?redirect=` target.
4. Failure cases:
   - Wrong email/password → inline error: “The email or password you entered is incorrect.”
   - Email unverified → inline error prompting verification.

### 2.2 Magic Link
1. On `/login`, enter email, click **“Sign in with magic link.”**
2. Ensure Supabase sends OTP link (check email logs).
3. Visit link; expect auto-login and redirect to `/dashboard`.
4. Return to `/login` and confirm UI switches to “Check your email” state.

### 2.3 Signup (`/signup`)
1. Submit full form (name, email, password, org name).
2. Verify a profile row is created, organization inserted, slug updated to `<orgId>-<slugified-org-name>` (see `src/app/(auth)/signup/page.tsx`).
3. Check localStorage: `onboarding_org_id`, `onboarding_started` set.
4. If email confirmation disabled, expect redirect to `/onboarding`; otherwise confirm “Check your email” state.

### 2.4 Logout
Currently handled via dashboard header (see `DashboardHeader` component). Ensure clicking **Sign out** removes session and returns to `/login`.

---

## 3. Onboarding Wizard (`/onboarding`)
Refer to `src/app/onboarding/page.tsx` for exact steps.

1. After signup/login, user should land here until `profiles.onboarding_completed = true`.
2. Steps to verify:
   - **Step 1:** Welcome screen with CTA.
   - **Step 2:** Org type selection (Church, School, etc.). Selecting one pre-fills recommended check-in methods.
   - **Step 3:** Timezone + location naming (optional). Ensure timezone default matches browser timezone.
   - **Step 4:** Method selection summary and completion.
3. On finish, confirm:
   - Organization updated with `org_type` + timezone.
   - Optional location inserted if provided.
   - Profile `onboarding_completed` updated.
   - LocalStorage `onboarding_complete` set, `onboarding_started` removed.
   - Redirect to `/dashboard`.
4. Test skip button (top-right) → should jump to `/dashboard` without updating fields.
5. Regression: If user lacks org membership, wizard auto-creates org and membership (see fallback logic). Validate slug update to `<id>-<name>`, membership role `org_owner`.

---

## 4. Organization Slug & Routing

- Any authenticated dashboard route must be prefixed with `/{orgSlug}/dashboard/...` where `orgSlug = <orgId>-<slugified-name>`.
- Validate `src/app/[orgSlug]/layout.tsx`:
  1. Fetches organization by slug; `notFound()` if missing.
  2. Checks `org_memberships` for the logged-in user with matching `org_id`; redirects to `/{orgSlug}` if unauthorized.
  3. If unauthenticated, redirects to `/{orgSlug}/login`.
- Confirm the legacy `/dashboard/...` routes still redirect to the org-scoped versions (see `src/app/dashboard/layout.tsx`).

---

## 5. Dashboard Structure

All dashboard pages share `DashboardHeader` + `DashboardNav`. Confirm navigation links match the sections below and highlight active routes.

### Quick Checklist per Page
| Page | Path | Primary Tests |
| --- | --- | --- |
| Dashboard Home | `/{orgSlug}/dashboard` | Stats (people/sessions/locations), quick actions, reports CTA. Validate counts update after CRUD tests. |
| People | `/{orgSlug}/dashboard/people` | CRUD (PersonDialog), CSV import link, search filters, QR dialog, status badges. |
| Groups | `/{orgSlug}/dashboard/groups` | Create/edit/delete groups, manage members, ensure `description` field absent (only `name`). |
| Locations | `/{orgSlug}/dashboard/locations` | CRUD with geofence display, search, editing existing entries. |
| Sessions | `/{orgSlug}/dashboard/sessions` | Filtering (Upcoming/Past/All), search, creating new session via SessionDialog. |
| Calendar | `/{orgSlug}/dashboard/calendar` (if enabled) | Confirm renders events (depends on data). |
| Attendance Records | `/{orgSlug}/dashboard/attendance` | Date filter, search, CSV export, record table. |
| Reports | `/{orgSlug}/dashboard/reports` | Aggregated counts, report cards, export button. |
| Devices (Kiosks) | `/{orgSlug}/dashboard/devices` | Add/edit device, copy kiosk URL, state badges. |
| Team (Users) | `/{orgSlug}/dashboard/users` | Role filters, invite dialog (no backend sending yet), role change dropdown, removal protection for owners. |
| Settings | `/{orgSlug}/dashboard/settings` | Update org name/timezone, ensure slug is readonly, verify toast messages. |

#### 5.1 People Management
- Add Person: open dialog → fill mandatory name + optional email/phone. Confirm Supabase `people` insert fires (cast to `any` for typing).
- Edit Person: ensure updates persist and list reflects new values.
- QR Dialog: opens `QRCodeDialog` with generated badge; confirm `checkin_code` displays.
- Import CSV: button links to `/people/import`. Navigate to ensure page loads (server/client as implemented).
- Search: supports name/email/phone/external ID.
- Retry button: set to `animate-spin` when loading.

#### 5.2 Groups
- Create group: ensure only `name` is required (after description removal). On submit, new row shows in grid with computed member count (counts come from `group_members`).
- Edit group: toggling members updates `group_members` table; verify adds/removals happen via `toAdd` / `toRemove` logic.
- Delete group: removes associated `group_members` before deleting row.

#### 5.3 Locations & Geofences
- Add location with/without lat/lng. When geofences exist, card shows radius badge (first geofence only).
- Refresh button re-runs query; ensure disabled state works.
- No results states: verify messages match search term.

#### 5.4 Sessions & Calendar
- Filter toggles (Upcoming/Past/All) change query conditions (`>=` / `<` on `session_date`).
- Create session: open SessionDialog, choose location, times, status. After creation, list refreshes.
- Today sessions highlight with ring & “Today” badge.
- Action buttons (Edit, People, More) show on hover; ensure click handlers open dialogs.

#### 5.5 Attendance Records
- Date picker defaults to today, reruns query on change.
- Search filters by person name/email & session name.
- Export button downloads CSV using `Blob`/`URL.createObjectURL`.
- Table shows method/status pills styled via `cn` combos.
- Empty state: shows guidance for search vs. no data.

#### 5.6 Reports
- On load, queries counts for people/sessions/attendance records (org scoped via slug). Validate values change after CRUD tests.
- Report cards feature `View` and `Export` buttons (currently placeholders). Ensure UI responds.

#### 5.7 Devices / Kiosks
- Add Device: use DeviceDialog (name, status, location). On create, confirm new device card renders.
- Copy URL button should write `${window.location.origin}/kiosk/${deviceId}` and show “Copied!” for 2s.
- Edit button opens dialog. Status pill indicates `active` vs. others.

#### 5.8 Team Management
- Stats cards compute counts per role.
- Search filters by name/email.
- Invite dialog currently mocks sending invites (toast only). Ensure required email validation.
- Role dropdown updates `org_memberships.role`. Confirm permission restrictions (owners cannot be removed; non owners only).
- Remove user: prompts `confirm`. Verify DB row deleted and list refreshes.

#### 5.9 Org Settings
- Editing name/timezone updates organization row. Ensure slug input is disabled.
- Save button shows spinner when `saving` state true.
- Danger zone delete button is disabled (future feature). Ensure it appears but cannot be clicked.

---

## 6. Self Check-in & Member Portal

### 6.1 Public Check-in (`/checkin`)
- Requires authenticated user belonging to an org.
- On load:
  - Fetch profile + membership.
  - Load person row (matching email) and any active session (status `active`, `start_at <= now <= end_at`).
  - If session has location, fetch geofence to enforce radius.
- Test cases:
  1. **Valid geofence** – simulate location inside/outside by overriding browser geolocation (DevTools). `handleCheckin` should insert into `attendance_records` with method `geo`.
  2. **No active session** – UI should show friendly message (no session card, check-in button disabled?).
  3. **Toggle QR badge** – button should render personal QR code using `QRCode` library (data `attend://person/<checkin_code>`).
  4. **Offline cases** – ensure location errors display (e.g., “Geolocation is not supported”).

### 6.2 Member Portal (`/{orgSlug}/portal`)
- Must be logged in + part of org.
- Load order: profile → organization by slug → person record → upcoming sessions → attendance history.
- Tabs to verify:
  1. **Badge** – Shows same QR code as above plus CTA to self-check-in.
  2. **Events** – Lists future sessions with date/time/location.
  3. **History** – Displays last 10 attendance records with session metadata.
  4. **Profile** – Shows contact info and join date (check file for fields).
- Header includes link back to self-check-in and displays organization name.
- Ensure loading + unauthenticated states show card prompting login.

---

## 7. Accepting Invites (`/{orgSlug}/accept-invite?token=...`)
- File: `src/app/[orgSlug]/accept-invite/page.tsx`.
- Flow:
  1. Page reads `token` from search params.
  2. Calls Supabase RPC `accept_invite` (client cast to `any` to bypass typing).
  3. On success, auto-joins user to org and redirects appropriately.
- Tests:
  - Valid token while logged out: user should be prompted to sign in, then token reused.
  - Expired/invalid token: proper error message displayed.

---

## 8. Kiosk Mode (`/kiosk/[deviceId]`)
- File: `src/app/kiosk/[deviceId]/page.tsx`.
- Behavior summary:
  1. Loads device info and associated organization.
  2. Allows searching people, scanning QR codes, or manual entry depending on device settings.
  3. On check-in, inserts into `attendance_records` with method `kiosk`.
- Tests:
  - Access page with active device; ensure instructions and UI render.
  - Attempt check-in with valid person (via QR or manual selection) → record created.
  - Offline handling (if implemented) – check `navigator.onLine` indicators.
  - Ensure kiosk respects organization restrictions.

---

## 9. Error Handling & Edge Cases

| Scenario | Expected Behavior |
| --- | --- |
| Missing organization slug | `notFound()` triggers Next.js 404 page (via layout). |
| Unauthorized access | Redirected to `/{orgSlug}` or login depending on auth state. |
| Supabase failures | Middleware wraps errors (see `src/middleware.ts`) to avoid 500s; login pages show inline errors. |
| Group creation missing columns | Confirmed fix: only `name` sent, so no `PGRST204` errors. |
| Geolocation denied | Self check-in shows `locationError` and disables geofence validation. |
| Duplicate slug creation | Handled by `id+name` slug strategy; ensure DB unique constraint satisfied. |

---

## 10. Regression Suite (Suggested Order)

1. **Auth & Onboarding**
   - Signup → onboard → dashboard.
   - Logout/login via password + magic link.
2. **Org Navigation**
   - Visit `/{orgSlug}` portal (unauthenticated) → login redirect.
   - Access dashboard routes for both owner and non-member (should redirect).
3. **CRUD Surfaces**
   - People, Groups, Locations, Sessions, Devices all support create/edit/delete. After each operation, verify counts/stats.
4. **Attendance Lifecycle**
   - Create session → check-in via self-check-in and kiosk → confirm record displays in Attendance, Reports, and Member portal history.
5. **Analytics**
   - Validate Reports page updates totals after modifications.
6. **Team & Invites**
   - Invite new user, change role, remove user (non-owner).
7. **Settings**
   - Update org name/timezone, refresh to confirm persistence.
8. **Self Check-in**
   - Geo-based check-in success/failure, QR badge toggle.
9. **Portal**
   - Member views badge, events, history. Download QR.
10. **Accept Invite**
    - Use token to join existing org as new user.
11. **Kiosk**
    - Run full flow including QR scan, manual search, offline indicator.

---

## 11. Reporting Results

For each test case, capture:
- **Route & Feature**
- **User role used**
- **Browser/device**
- **Steps performed**
- **Observed vs. expected behavior**
- **Screenshots/logs** if failures occur
- **Relevant console/network errors**

Log issues in your tracker with references to file paths (e.g., `src/app/[orgSlug]/dashboard/people/page.tsx`) to speed up fixes.

---

## 12. Appendix: Useful Paths & Components

| Feature | File(s) |
| --- | --- |
| Dashboard navigation | `src/components/dashboard/nav.tsx` |
| Dashboard header | `src/components/dashboard/header.tsx` |
| Dialogs | `src/components/dashboard/*-dialog.tsx` |
| Self check-in | `src/app/checkin/page.tsx` |
| Member portal | `src/app/[orgSlug]/portal/page.tsx` |
| Kiosk mode | `src/app/kiosk/[deviceId]/page.tsx` |
| Accept invite | `src/app/[orgSlug]/accept-invite/page.tsx` |
| Middleware auth | `src/middleware.ts` |

Use this appendix when cross-referencing UI behavior with implementation during testing.

---

**End of Manual**
