# Attend - Attendance OS

A multi-tenant attendance platform with QR/Barcode check-in, Geo-location self check-in, Kiosk check-in, and Recurring Events.

## Features

- **Multi-tenant Organizations** - Complete data isolation with row-level security
- **Multiple Check-in Methods**
  - QR/Barcode scanning (personal badges + session codes)
  - Geo-location self check-in with geofence validation
  - Kiosk mode for high-volume venues
  - Manual check-in with audit trail
- **Recurring Events** - RRULE-based scheduling with instance overrides
- **Comprehensive Audit Logs** - Every action tracked with before/after state
- **Role-Based Access Control** - From Owner to Viewer with location scoping

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Supabase (Postgres + Auth + RLS)
- **UI Components:** Radix UI primitives + Lucide icons
- **Animations:** Framer Motion
- **State Management:** TanStack Query (React Query)
- **Validation:** Zod
- **Maps:** Leaflet (for geofence selection)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase CLI (for local development)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd attendos
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Set up Supabase (local development):
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Start local Supabase
supabase start

# Run migrations
supabase db push
```

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the landing page.

## Project Structure

```
attendos/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Landing page
│   │   ├── pricing/           # Pricing page
│   │   ├── security/          # Security page
│   │   ├── demo/              # Demo request page
│   │   └── app/               # Application placeholder
│   ├── components/
│   │   ├── ui/                # Reusable UI components
│   │   ├── landing/           # Landing page components
│   │   └── theme-provider.tsx # Theme context
│   ├── lib/
│   │   ├── utils.ts           # Utility functions
│   │   └── supabase/          # Supabase clients
│   └── types/
│       └── database.ts        # TypeScript types for Supabase
├── supabase/
│   └── migrations/            # Database migrations
├── public/                    # Static assets
└── package.json
```

## Database Schema

### Core Tables

- **organizations** - Multi-tenant organizations
- **org_memberships** - User-organization relationships with roles
- **profiles** - User profiles (extends Supabase auth)
- **people** - Attendees/members directory
- **groups** - Grouping for people
- **locations** - Physical venues
- **geofences** - Radius or polygon geofences for locations
- **event_series** - Recurring event definitions (RRULE)
- **sessions** - Individual session instances
- **attendance_records** - Check-in records
- **devices** - Kiosk devices
- **audit_logs** - Immutable audit trail
- **org_plans** - Billing tier information

### Row-Level Security

All tables are protected with RLS policies that:
- Ensure users can only access data from organizations they belong to
- Enforce role-based permissions at the database level
- Prevent cross-tenant data access

## Roles & Permissions

| Role | Capabilities |
|------|-------------|
| **ORG_OWNER** | All privileges including billing/settings |
| **ADMIN** | Manage people, sessions, locations, kiosks, reports |
| **LOCATION_MANAGER** | Manage sessions + kiosks for assigned locations |
| **OPERATOR** | Assisted check-ins only (scan/search) |
| **VIEWER** | Read-only dashboards/reports |
| **USER** | Self check-in, view own history |

## Check-in Methods

### QR/Barcode Check-in
- Each person has a unique `checkin_code`
- QR format: `attend://person/<org_slug>/<checkin_code>`
- Sessions can generate rotating token QRs

### Geo Self Check-in
- Validates user location against geofence
- Supports radius and polygon geofences
- Records lat/lng/accuracy for audit

### Kiosk Mode
- Dedicated tablet interface at `/kiosk/[device_id]`
- Camera-based QR scanning
- Search by name/phone/ID
- API key authentication

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm run test     # Run Playwright tests
```

## Testing

```bash
# Run all tests
npm run test

# Run tests with UI
npm run test:ui
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

Build the production bundle:
```bash
npm run build
```

The output will be in `.next/` directory.

## License

MIT
