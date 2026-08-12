# Admin Email Control

Backend module for the admin **Email Control** UI.

## API (admin auth required)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/admin/email-control/overview` | Modes + auto settings + SMTP flag |
| `GET` | `/api/admin/email-control/modes/:mode/recipients` | Recipient estimate for confirm modal |
| `PUT` | `/api/admin/email-control/modes/:mode/auto` | `{ "enabled": true }` |
| `PUT` | `/api/admin/email-control/auto-modes` | Bulk `{ "autoModes": { ... } }` |
| `POST` | `/api/admin/email-control/modes/:mode/send` | `{ "confirm": true, "dryRun"?: false }` |

## Next implementation steps

1. Set `sendReady: true` per mode in `modes.js` when SMTP templates exist.
2. Implement recipient resolution + send in `service.js` → `sendModeCampaign`.
3. Hook `isAutoModeEnabled(mode)` into job/message/application event paths.
4. Reuse `/backend/src/utils/email.js` for transport.
