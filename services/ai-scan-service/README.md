# AI Scan Service

Microserviciu SiteCrew care **evaluează** conținutul text (feed, job posts, comentarii, profile). Nu aprobă, nu respinge și nu publică nimic — returnează doar scoruri, flag-uri și o recomandare informativă pentru platforma principală.

## Rulează serviciul

```bash
cd services/ai-scan-service
cp .env.example .env
npm install
npm run dev
```

Serviciul pornește pe `http://localhost:4001`.

## Endpoint

### `GET /api/health`

Verifică starea serviciului.

### `POST /api/scan`

**Body:**

```json
{
  "contentType": "job_post",
  "title": "Dryliners Needed",
  "text": "Need 20 dryliners urgently. Contact me on Telegram.",
  "recentTexts": ["Need dryliners urgently"]
}
```

`contentType` acceptat:

- `feed_post`
- `job_post`
- `comment`
- `worker_profile`
- `company_profile`

`recentTexts` este opțional — platforma principală trimite ultimele texte ale aceleiași entități pentru detectarea duplicatelor.

**Răspuns:**

```json
{
  "safe": false,
  "overallRisk": 78,
  "recommendation": "require_admin_review",
  "message": "Acest conținut pare suspect",
  "scores": {
    "spam": 20,
    "scam": 90,
    "abuse": 0,
    "quality": 60
  },
  "flags": ["external_contact", "possible_scam"],
  "analysis": {
    "rulesApplied": true,
    "aiApplied": false,
    "aiError": null,
    "matches": {}
  }
}
```

## Arhitectură V1

```
POST /api/scan
      │
      ├── Rule Engine (liste + regex)
      ├── AI Analysis (opțional, OpenAI)
      └── Risk Calculator
```

### Layer 1 — Rules

- Spam detection
- Scam detection
- External contact (WhatsApp, Telegram, Discord, email, telefon, URL)
- Abuse detection
- Job quality (pentru job posts / profile)
- Duplicate content (cu `recentTexts`)

### Layer 2 — AI (opțional)

Setează în `.env`:

```env
AI_ANALYSIS_ENABLED=true
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

AI-ul returnează scoruri JSON; serviciul le combină cu regulile (ia maximul pentru spam/scam/abuse).

## Recomandări pentru platformă

Serviciul **nu decide** — doar sugerează:

| overallRisk | recommendation        |
|-------------|-----------------------|
| 0–30        | `publish`             |
| 31–70       | `moderation_queue`    |
| 71–100      | `require_admin_review`|

Platforma principală decide acțiunea finală.

## Securitate internă

Dacă setezi `AI_SCAN_API_KEY`, request-urile trebuie să trimită header:

```http
X-AI-Scan-Key: your-key
```

## Integrare din backend

Client disponibil în `backend/src/services/aiScanClient.js`.

```env
AI_SCAN_SERVICE_URL=http://localhost:4001
AI_SCAN_API_KEY=
```
