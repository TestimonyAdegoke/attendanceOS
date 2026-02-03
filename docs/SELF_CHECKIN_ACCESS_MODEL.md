# Self Check-in Access Model

This document describes the cohort-based self check-in authorization system in AttendOS.

## Overview

AttendOS supports two types of self check-in:
1. **Authenticated Self Check-in** - Users sign in to their portal and check in
2. **Public Self Check-in** - Users identify themselves with phone/code without logging in

Both methods **always require geofence proximity** to the session location.

## Key Concepts

### People vs Users

- **People** (attendees): Records in the `people` table representing individuals who attend sessions
- **Users** (auth accounts): Records in `auth.users` representing login accounts
- **Person-User Links**: A person may optionally be linked to a user account via `person_user_links`

This separation allows:
- Tracking attendance for people who don't have login accounts
- Inviting specific people to create accounts when needed
- Maintaining a clean separation between identity and authentication

### Self Check-in Policies

Policies can be set at three levels (most specific wins):
1. **Session-level** - Applies to a specific session
2. **Group-level** - Applies to all sessions for a group/cohort
3. **Organization-level** - Default for the entire organization

Policy options:
- `mode`: `disabled` | `public_with_code` | `authenticated`
- `eligible_set`: `all_members` | `explicit_allowlist` | `explicit_denylist`
- `require_linked_user`: Whether the person must have a linked user account
- `require_geofence`: Always `true` for self check-in
- `require_event_code`: Whether public check-in requires the session code

### Access Overrides

Admins can override access for specific people:
- **Allow override**: Grants access even if not a group member
- **Deny override**: Blocks access even if otherwise eligible

Overrides never bypass geofence or time window requirements.

## Check-in Flow

### Authenticated Self Check-in

1. User signs in to `/{orgSlug}/portal`
2. User navigates to self check-in or upcoming session
3. System checks:
   - User has linked person record
   - Session is within time window
   - User is within geofence
   - No deny override exists
   - Group membership (if applicable)
4. If all checks pass, attendance is recorded

### Public Self Check-in

1. User goes to `/{orgSlug}/self-checkin`
2. User selects a session
3. User enters phone number or check-in code
4. User enters session event code (if required)
5. System checks:
   - Person exists with matching identifier
   - Session is within time window
   - User is within geofence
   - Policy allows public check-in
   - No deny override exists
6. If all checks pass, attendance is recorded

## Invitation System

For authenticated self check-in, admins can invite people to create accounts:

1. Admin selects people to invite (from group or people list)
2. System creates invite records with unique tokens
3. Invite links are sent via email: `/{orgSlug}/accept-invite?token=...`
4. User clicks link, signs up or signs in
5. System creates `person_user_links` record
6. User can now access their portal and self check-in

## Database Schema

### New Tables

```sql
-- Links people to user accounts
person_user_links (
  id, org_id, person_id, user_id, created_at
)

-- Self check-in policies
self_checkin_policies (
  id, org_id, scope_type, scope_id, mode,
  eligible_set, require_linked_user, require_geofence,
  require_event_code, created_by, created_at
)

-- Per-person access overrides
self_checkin_access_overrides (
  id, org_id, scope_type, scope_id, person_id,
  access, reason, created_by, created_at
)

-- Invitations for portal access
invites (
  id, org_id, group_id, person_id, email,
  token, expires_at, used_at, created_by, created_at
)
```

### Modified Tables

```sql
-- Groups: Added self check-in fields
groups (
  ...,
  self_checkin_enabled BOOLEAN,
  self_checkin_mode TEXT,
  self_checkin_require_invite BOOLEAN
)

-- Sessions: Added public codes
sessions (
  ...,
  public_code TEXT,      -- 6-char code for public check-in
  event_qr_token TEXT,   -- Token for QR scanning
  group_id UUID          -- Optional group association
)

-- Profiles: Added super admin flag
profiles (
  ...,
  is_super_admin BOOLEAN
)
```

## API Endpoints

### Self Check-in

- `POST /{orgSlug}/api/self-checkin/auth` - Authenticated check-in
- `POST /{orgSlug}/api/self-checkin/public` - Public check-in

### Invites

- `POST /{orgSlug}/api/invites/bulk` - Create invites for multiple people
- `GET /{orgSlug}/api/invites/bulk` - List pending invites

### Accept Invite

- `GET /{orgSlug}/accept-invite?token=...` - Accept invite page

## Admin UI

### Group Detail Page

`/{orgSlug}/dashboard/groups/{groupId}`

- View group members with access status badges
- Configure self check-in settings (enable, mode, require invite)
- Bulk invite members
- Allow/deny individual members

### Person Detail Page

`/{orgSlug}/dashboard/people/{personId}`

- View linked user status
- Send individual invite
- View QR badge

## Super Admin

Users with `is_super_admin = true` in their profile can:
- Access the global `/dashboard` routes
- Manage all organizations
- View system-wide analytics

Regular users are redirected to their org-scoped dashboard.

## Security Considerations

1. **Geofence is mandatory** - All self check-in methods require proximity
2. **Time windows** - Check-in only allowed 15 min before to 30 min after session
3. **Rate limiting** - Consider adding rate limits to public endpoints
4. **Token expiry** - Invite tokens expire after 7 days
5. **RLS policies** - All tables have row-level security enabled

## Testing

Run Playwright tests to verify:
1. Admin can create group and enable self check-in
2. Admin can invite members
3. User can accept invite and link account
4. User can check in when inside geofence
5. User is denied when outside geofence
6. Public check-in works with valid code and location
