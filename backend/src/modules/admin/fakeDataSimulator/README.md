# Fake Data Simulator (admin only)

Staging tool for generating realistic workers and companies. **Disable before live traffic.**

## Enable

Available to **admin / superadmin** from the dashboard — click **Demo data** (top bar or sidebar). No environment variable required.

Optional legacy flag (unused for UI): `ENABLE_FAKE_DATA_SIMULATOR=true`

## How fake accounts are marked

All simulator emails end with **`.fpd`**:

- Workers: `james.smith@gmail.fpd`, `m.carter@outlook.fpd`
- Companies: `hiring@metrobuild.fpd`, `jobs@cedarconstruction.fpd`

Default password: `SimFpd2026!` (override with `FAKE_SIMULATOR_PASSWORD`).

Search Users in admin for `.fpd` to find them.

## Remove completely

1. Set `ENABLE_FAKE_DATA_SIMULATOR=false` or remove from `.env`
2. Delete this folder: `backend/src/modules/admin/fakeDataSimulator/`
3. Remove mount block in `backend/src/modules/admin/routes.js`
4. Remove Simulator UI from `views/admin/dashboard.ejs`
5. Delete `public/js/admin-fake-simulator.js` and related CSS in `admin.css`
6. Purge data: admin Simulator → **Purge all .fpd accounts**
