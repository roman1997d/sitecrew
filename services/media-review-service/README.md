# Content Media Review Service

Microserviciu SiteCrew pentru moderarea imaginilor încărcate.

## Flow

```
User uploads image
        │
        ▼
Image stored + visible immediately
        │
        ▼
Added to moderation queue (pending)
        │
        ▼
Moderator reviews
   ┌────┴────┐
APPROVE   REJECT
   │         │
reviewed   deleted from storage + DB references
```

## Run

```bash
cd services/media-review-service
cp .env.example .env
npm install
npm run dev
```

Service: `http://localhost:4002`

Standalone moderator UI: `http://localhost:4002/review/`

Admin dashboard section: **Media Review**

## API

- `GET /api/health`
- `GET /api/queue/stats` → `{ pending: 987 }`
- `GET /api/queue/next` → `{ item: { id, imageUrl, position, total }, total }`
- `POST /api/queue/:id/approve`
- `POST /api/queue/:id/reject`

Optional header when `MEDIA_REVIEW_API_KEY` is set:

```http
X-Media-Review-Key: your-key
```

## Reject behavior

On reject, the service:

1. Deletes the image file from storage
2. Deletes thumbnail if present (`thumbnail_path` or `*-thumb.ext`)
3. Removes the path from `feed_posts.media_urls`
4. Deletes matching `stories`
5. Clears matching worker profile photos and company logos
6. Marks queue item as `rejected`

## Backend integration

Upload routes enqueue images via `backend/src/utils/mediaReviewQueue.js`.

Admin routes proxy to this service through `backend/src/services/mediaReviewClient.js`.

```env
MEDIA_REVIEW_SERVICE_URL=http://localhost:4002
MEDIA_REVIEW_API_KEY=
```
