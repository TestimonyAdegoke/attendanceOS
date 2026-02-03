PRODUCT DESCRIPTION
Attendance OS – A Unified Attendance Management SaaS
One platform. Multiple check-in methods. Absolute attendance truth.

Attendance OS is a multi-tenant SaaS platform designed to handle all attendance needs across industries—schools, churches, workplaces, events, training centers, NGOs, and communities—using multiple check-in methods while maintaining a single source of truth.

It eliminates fragmented attendance tools by combining barcode/QR check-in, geo-location self check-in, kiosk check-in, and recurring event automation into one secure, auditable system.

CORE PROBLEM IT SOLVES

Most organizations struggle with:

Manual attendance (error-prone, slow)

Multiple tools for different attendance scenarios

No proof of attendance authenticity

Poor handling of recurring events (weekly services, classes, shifts)

No real-time visibility

Weak audit trails and fraud prevention

Attendance OS solves this by standardizing attendance across all contexts while remaining flexible in how users check in.

CORE CONCEPTS (MENTAL MODEL)
1. Organization (Multi-Tenant)

Each customer operates in complete isolation:

Organization

Locations

Users

Data

Billing

2. Sessions (What people check into)

Everything is modeled as a Session:

A one-time event

Or a recurring event instance (auto-generated)

3. Check-in Methods (How people check in)

Barcode / QR

Geo-location self check-in

Kiosk
(All methods feed the same attendance record format)

4. Attendance Record (The truth)

Each check-in produces a verifiable attendance record with metadata, proof, and auditability.

RECURRING EVENTS (DETAILED)
Why recurring events matter

Most attendance use-cases are not one-off:

Weekly church services

Daily school classes

Work shifts

Training programs

Office standups

Attendance OS treats recurrence as a first-class feature, not an afterthought.

Recurring Event Definition

A Recurring Event Template defines:

Event name (e.g. “Sunday Service”)

Recurrence pattern:

Daily

Weekly (specific days)

Monthly

Custom intervals

Time window:

Start time

End time

Start date & optional end date

Location(s)

Allowed check-in methods

Rules (late thresholds, grace period, capacity)

From this template, individual Session Instances are auto-generated.

Session Instance Behavior

Each generated session:

Has its own attendance list

Tracks lateness and absentees independently

Can be edited without affecting the entire series (optional)

Can be cancelled or rescheduled individually

Admins can:

Edit a single instance

Edit all future instances

Override rules for a specific date (e.g. special service)

Attendance Intelligence on Recurring Events

The system automatically computes:

Attendance trends per person

Streaks (e.g. “attended 6 weeks in a row”)

Drop-off detection

Habit analysis (e.g. always late on Mondays)

CHECK-IN METHODS (DEEP DIVE)
1. Barcode / QR Code Check-in
Supported Patterns

Personal QR Code

Each user has a permanent QR

Can be printed or stored in-app

Session QR Code

Generated per session or instance

Can be time-bound or rotating

Security Controls

Token expiration

One-check-in-per-session rule

Geo validation (optional)

Time window enforcement

Ideal For

Events

Churches

Conferences

Schools

Fast entry environments

2. Geo-location Based Self Check-in
Flow

User opens app/web

Clicks “Check In”

System verifies:

Active session

Time window

Proximity to allowed location

Attendance recorded

Geo Options

Radius-based (e.g. within 100 meters)

Polygon-based (drawn on map)

Multiple allowed zones

Wi-Fi SSID verification (optional)

Anti-Abuse Measures

Device fingerprinting

Repeated pattern detection

Location integrity checks

Optional selfie/photo proof

Ideal For

Staff attendance

Classes

Volunteer programs

Distributed teams

3. Kiosk Check-in Mode
Kiosk Characteristics

Runs on tablet or dedicated device

Locked to specific organization/location

Can be attended or unattended

Kiosk Check-in Options

Scan QR

Search by name/ID

Enter PIN

Hybrid mode

Kiosk Controls

Duplicate prevention

Offline mode with auto-sync

Visual confirmation

Operator override (with audit)

Ideal For

High-volume entrances

Schools

Offices

Churches

Training centers

ATTENDANCE RECORD (THE HEART OF THE SYSTEM)

Each attendance entry includes:

Person

Session instance

Date & time

Check-in method

Status (present, late, excused, absent)

Location ID

Geo coordinates (if applicable)

Device ID / kiosk ID

Operator ID (if assisted)

Proof metadata

Audit trail

No attendance record exists without context and proof.

ADMIN EXPERIENCE (POWER USER DESIGN)
Dashboard

Live attendance counters

Session progress indicators

Late/absent alerts

Location-wise summary

Session Management

Create one-time or recurring events

Bulk editing

Override individual instances

Cancel or postpone sessions

Attendance Management

Manual adjustments (permission-based)

Reason-required edits

Bulk marking (e.g. excused absence)

Reporting

Daily / weekly / monthly attendance

Individual history

Group performance

Export (CSV, Excel)

API/Webhooks

ROLES & PERMISSIONS

Organization Owner

Billing, global settings

Admin

Full operational control

Location Manager

Manage sessions and kiosks

Operator

Assisted check-ins only

Viewer

Reports only

User

Self check-in only

Every action is permissioned and logged.

AUDIT & COMPLIANCE

Immutable audit logs

Attendance edit history

Device activity tracking

Operator accountability

Compliance-ready exports

This makes the platform suitable for:

Payroll validation

Academic compliance

Attendance disputes

Legal audits

OFFLINE & RELIABILITY

Kiosks can operate offline

Check-ins queued locally

Automatic sync when online

Conflict resolution rules

INTEGRATIONS & EXTENSIBILITY

REST API

Webhooks

Google Sheets

HR systems

School management systems

Church management systems

TARGET MARKETS

Churches & ministries

Schools & universities

Offices & factories

Events & conferences

NGOs & volunteer groups

Training institutes

PRICING STRUCTURE (SUGGESTED)

Starter: single location, basic methods

Growth: recurring events, geo check-in, kiosk

Enterprise: multi-location, offline, integrations, advanced audit

KEY DIFFERENTIATOR (POSITIONING)

“Not just attendance—but verified presence.”

Attendance OS doesn’t just record that someone checked in.
It records how, where, when, and under what rules they did.