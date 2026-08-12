# Admin Email Control

Fully wired admin module for manual + automatic platform emails.

## API (admin auth required)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/admin/email-control/overview` | Modes + auto settings + SMTP flag |
| `GET` | `/api/admin/email-control/modes/:mode/recipients` | Recipient count for confirm modal |
| `PUT` | `/api/admin/email-control/modes/:mode/auto` | `{ "enabled": true }` |
| `PUT` | `/api/admin/email-control/auto-modes` | Bulk `{ "autoModes": { ... } }` |
| `POST` | `/api/admin/email-control/modes/:mode/send` | `{ "confirm": true, "dryRun"?: false }` |

## How it works

- **Manual Trimite**: resolves recipients and sends via SMTP (`sendNotificationEmail` / job alert template).
- **Automat toggle**: stored in `email_control_settings`.
- **Event hooks**: job create, message, apply, invite, application status, verification, reviews.
- **Hourly schedule** (`backend/src/server.js`): unread 12h, digests, profile nudges, plan expiry when Automat is on.

## Requirements

SMTP env vars must be set (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`).
