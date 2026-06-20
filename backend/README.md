# SiteCrew Backend API

Backend API separat pentru MVP-ul SiteCrew. Frontend-ul EJS existent rămâne separat și poate consuma ulterior aceste endpoint-uri.

## Stack

- Node.js + Express
- PostgreSQL cu `pg`
- JWT auth
- `bcryptjs` pentru parole
- `zod` pentru validare
- `multer` pentru upload local demo

## Setup

```bash
cd backend
cp .env.example .env
npm install
npm run db:init
npm run db:seed
npm run dev
```

API-ul rulează implicit pe `http://localhost:4000`.

Conturi demo după seed:

- Worker: `alex.worker@sitecrew.test` / `password123`
- Company: `hiring@apexbuild.test` / `password123`
- Admin: `admin@sitecrew.test` / `admin123`

## Scripts

```bash
npm run db:init
npm run db:seed
npm run dev
npm run smoke
```

`npm run smoke` presupune că serverul API rulează deja.

## Main Endpoints

Auth:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alex.worker@sitecrew.test","password":"password123"}'
```

Worker:

```bash
curl http://localhost:4000/api/workers/me \
  -H "Authorization: Bearer <TOKEN>"
```

Company:

```bash
curl -X PATCH http://localhost:4000/api/companies/me \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"description":"Commercial construction teams across the North West."}'
```

Jobs:

```bash
curl http://localhost:4000/api/jobs

curl -X POST http://localhost:4000/api/jobs/1/apply \
  -H "Authorization: Bearer <WORKER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"coverNote":"Available for the full project."}'
```

Feed and stories:

```bash
curl http://localhost:4000/api/feed
curl http://localhost:4000/api/stories/companies
```

Messages:

```bash
curl http://localhost:4000/api/conversations \
  -H "Authorization: Bearer <TOKEN>"
```

Notifications:

```bash
curl http://localhost:4000/api/notifications \
  -H "Authorization: Bearer <TOKEN>"
```

Admin:

```bash
curl http://localhost:4000/api/admin/users \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

## Frontend Integration Later

- Dashboard feed: `GET /api/feed`
- Story bar: `GET /api/stories/companies`
- Job filters: `GET /api/jobs?trade=Carpentry&city=Manchester`
- Worker profile: `GET /api/workers/me`
- Login page: `POST /api/auth/login`
