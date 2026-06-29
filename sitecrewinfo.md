# SiteCrew — Documentație platformă

> Ghid complet despre ce este SiteCrew, cum funcționează dashboard-urile pentru **worker** și **company**, cum interacționează între ele, și toate funcționalitățile platformei — **fără panoul de administrare**.

---

## 1. Ce este SiteCrew

**SiteCrew** este o platformă de recrutare pentru industria construcțiilor din UK. Conectează **muncitori calificați** (tradespeople: tamplari, electricieni, drylineri etc.) cu **companii** (angajatori, subcontractori) care au nevoie de personal pe șantier.

**Ideea centrală:** angajare directă, fără agenții — profiluri, joburi, aplicații, mesaje și conținut social (feed, stories) într-un singur loc.

**Pentru muncitori:** experiență de tip rețea socială — feed personalizat, stories de la companii urmărite, căutare joburi, aplicări, mesagerie, profil de portofoliu.

**Pentru companii:** instrumente de HR pe șantier — postare joburi, gestionare candidați, echipă angajată, căutare muncitori, feed companie, contacte salvate.

---

## 2. Arhitectură tehnică

Platforma este împărțită în două servicii:

| Componentă | Tehnologie | Port implicit | Rol |
|------------|------------|---------------|-----|
| **Frontend** | Node.js, Express 5, EJS, JavaScript vanilla | `3000` | Pagini HTML randate server-side, fișiere statice (`public/`), proxy pentru `/uploads` |
| **Backend API** | Node.js, Express 5, PostgreSQL, JWT | `4000` | Autentificare, date, upload, logică de business |

**Flux tipic:**
1. Browserul cere o pagină de la frontend (`server.js`).
2. Frontend-ul citește cookie-ul `sitecrewToken` și apelează API-ul pentru date (`GET /api/auth/me`, feed, joburi etc.).
3. Datele sunt injectate în template-uri EJS.
4. După încărcare, JavaScript-ul client (`dashboard.js`, `company-dashboard.js`) face apeluri AJAX la același API.

**Autentificare:** JWT stocat în cookie `sitecrewToken` (7 zile) + `localStorage`. Fiecare request API trimite `Authorization: Bearer <token>`.

**Fișiere media:** salvate local în `backend/uploads/`, servite la URL relativ `/uploads/<nume-fisier>`.

**Servicii auxiliare (opționale):**
- `services/ai-scan-service` — scanare text pentru moderare (cuvinte interzise, spam, contact extern).
- `services/media-review-service` — coadă de revizuire imagini/video încărcate.

---

## 3. Roluri utilizatori

| Rol | Descriere | Dashboard | Profil în DB |
|-----|-----------|-----------|--------------|
| **worker** | Muncitor / meseriaș | `/worker/dashboard` | `worker_profiles` |
| **company** | Companie / angajator | `/company/dashboard` | `company_profiles` |

> Rolurile `admin` și `superadmin` există pentru administrarea platformei și nu fac parte din acest document.

### Profil worker (`worker_profiles`)

Câmpuri principale:
- Nume, telefon, poză profil
- Meserii (`trades`), interese meserii (`trade_interests`)
- Experiență, certificate, calificări
- Oraș, cod poștal, rază de deplasare, locații de lucru
- Status disponibilitate: **Available Now** / **Available Soon** / **Busy**
- Tarif așteptat, bio
- Permis de muncă UK, nivel engleză, mașină, informații medicale
- Status verificare: `pending` / `approved` / `rejected`
- Preferință limbă (`language_preference`)
- Culoare badge calificare

### Profil company (`company_profiles`)

Câmpuri principale:
- Nume companie, logo, descriere, website
- Sediu, tip business, meserii acoperite
- Oraș, cod poștal
- Status verificare companie
- Plan cont (`free` / `pro`)

---

## 4. Autentificare și înregistrare

### Pagini

| Rută | Descriere |
|------|-----------|
| `/` | Pagină marketing (landing) — hero, cum funcționează, joburi recente |
| `/login` | Login + înregistrare (tab-uri Worker / Company) |

Utilizatorii care au vizitat platforma înainte pot fi redirecționați automat de la `/` la `/login` (cookie `sitecrewReturningUser`).

### Login

- Endpoint: `POST /api/auth/login`
- Email + parolă (minim 8 caractere)
- La succes: token JWT + obiect user
- Redirect automat:
  - worker → `/worker/dashboard`
  - company → `/company/dashboard`
- Conturile admin sunt respinse la login-ul platformei obișnuite

### Înregistrare worker

- Endpoint: `POST /api/auth/register-worker`
- Câmpuri: email, parolă, nume complet, meserii (listă), oraș
- Autocomplete meserii: `GET /api/jobs/trades/search?q=`
- După înregistrare: login automat

### Înregistrare company

- Endpoint: `POST /api/auth/register-company`
- Câmpuri: email, parolă, nume companie, oraș
- După înregistrare: login automat

### Parametri URL utile

- `/login?mode=register` — deschide direct tab-ul de înregistrare
- `/login?mode=register&role=worker` — înregistrare worker
- `/login?mode=register&role=company` — înregistrare company

### Validare sesiune

- Server-side (SSR): cookie → `GET /api/auth/me`
- Client-side: token din `localStorage` / cookie la fiecare apel API

---

## 5. Worker Dashboard

**Rută:** `GET /worker/dashboard`  
**View:** `views/worker/dashboard.ejs`  
**JavaScript:** `public/js/dashboard.js`  
**i18n:** `public/js/worker-i18n.js`

### Layout (3 coloane, stil rețea socială)

```
┌─────────────────────────────────────────────────────────────┐
│  TOPBAR: logo, căutare, limbă, notificări, mesaje, profil  │
├──────────────┬──────────────────────────┬───────────────────┤
│  LEFT PANEL  │      FEED PRINCIPAL      │   RIGHT PANEL     │
│  card worker │  banner Find Job         │   Quick Jobs      │
│  disponib.   │  stories bar             │   (4 joburi)      │
│  companii    │  filtre feed             │                   │
│  urmărite    │  postări + joburi        │                   │
└──────────────┴──────────────────────────┴───────────────────┘
                                        [FAB: Create Post]
```

### Topbar (`components/dashboard/topbar.ejs`)

| Element | Funcție |
|---------|---------|
| Căutare platformă | Caută companii (`GET /api/companies`) și muncitori (`GET /api/workers/directory/search`) |
| Selector limbă | 6 limbi — salvează preferința în profil |
| Notificări (iconiță inimă) | Panou cu ultimele notificări; marchează ca citite |
| Mesaje (iconiță chat) | Panou messenger: listă conversații + fir mesaje |
| Avatar profil | Link la `/worker/profile` |
| Logout | Șterge token și redirecționează la login |

### Panou stânga (`left-panel.ejs`)

- **Card worker:** poză, badge verificat (dacă e cazul), nume, meserie, experiență, certificări
- **Status disponibilitate:** pill colorat (verde/galben/roșu)
- **„Working at” / „Self employed”:** afișează compania la care worker-ul are aplicație acceptată
- **Buton Change status:** modal cu 3 opțiuni → `PATCH /api/workers/me/availability`
- **Companii urmărite (pinned):** lista companiilor follow

### Feed principal (`feed.ejs` + `feed-item.ejs`)

**Tipuri de conținut în feed (în ordine cronologică):**

1. **Daily Rate Insight** — card cu tarife medii de piață pentru meseriile din `trade_interests` (feedback up/down de la workeri)
2. **Job posts** — joburi deschise filtrate după interesele de meserie
3. **Postări sociale** — de la companii urmărite, workeri urmăriți, sau toate postările companiilor

**Filtre feed:**
- Show all — tot conținutul
- Show only job posts — doar joburi

**Banner „Find Job”:** deschide modalul de căutare joburi.

**Stories bar:** grupate pe autor; doar de la companii urmărite; click deschide viewer fullscreen cu auto-avansare.

**Acțiuni pe fiecare postare din feed:**

| Acțiune | Endpoint |
|---------|----------|
| Like | `POST /api/feed/posts/:id/like` |
| Comentariu | `POST /api/feed/posts/:id/comment` |
| Save (bookmark) | `POST /api/feed/posts/:id/save` |
| Share | copiază linkul postării în clipboard |
| Apply (pe joburi) | `POST /api/jobs/:id/apply` |

### Panou dreapta (`right-panel.ejs`)

- **Quick Jobs:** primele 4 joburi deschise relevante pentru profil

### FAB (Floating Action Button)

- Buton **Create Post** — deschide modalul de creare postare

### Modale și overlay-uri

| Modal | Funcție |
|-------|---------|
| **Find Job** | Căutare companii și joburi (vezi secțiunea 11) |
| **Create Post** | Postare cu titlu, locație, caption, media (1 video SAU max 5 imagini) |
| **Story Viewer** | Vizualizare story 24h |
| **Change Status** | Schimbare disponibilitate |

### Creare postare (worker)

- Postare ca **profil propriu** sau **în numele unei companii** (dacă are permisiunea `can_post_company_posts`)
- Upload media: `POST /api/feed/posts/upload` → apoi `POST /api/feed/posts`
- Tipuri postare: `work_completed`, `progress`, `skills`, `certification`, `company_update`

### Creare story (worker)

- Doar dacă are permisiune de la o companie
- Upload: `POST /api/stories/upload` → `POST /api/stories`
- Expiră după 24 ore
- Video: max ~15 secunde (validare client)

### Postare job în numele companiei

- Dacă are permisiunea `can_post_jobs` de la o companie unde e angajat
- Folosește același flux ca compania pentru `POST /api/jobs`

### Date încărcate la deschiderea dashboard-ului

Frontend-ul SSR apelează în paralel:
- `GET /api/feed`
- `GET /api/stories/companies`
- `GET /api/jobs`
- `GET /api/applications/me`
- `GET /api/notifications`
- `GET /api/follows/me`
- `GET /api/conversations`

---

## 6. Worker Profile

**Rute:**

| Rută | Mod | Descriere |
|------|-----|-----------|
| `/worker/profile` | Privat (propriul profil) | Editare, postări, postări salvate |
| `/workers/:id/profile` | Vizualizare alt worker | Follow, mesaj, portofoliu (autentificare worker necesară) |

### Secțiuni profil propriu

| Secțiune | Conținut |
|----------|----------|
| **Header** | Poză, nume, meserii, disponibilitate, badge verificare, statistici |
| **Actions** | Edit Profile, Find Job, My Trade Interest, Request Verification |
| **Posts** | Portofoliu de postări (poze/video lucrări) |
| **Saved Posts** | Postări bookmark-uite din feed |
| **Companies you follow** | Lista companiilor/persoanelor urmărite |
| **Companies following you** | Companii interesate de profilul tău |

### Edit Profile (modal)

Câmpuri editabile:
- Poză profil (upload)
- Nume, meserii, locații de lucru, oraș, cod poștal
- Rază de deplasare, ani experiență
- Certificate, calificări, bio
- Tarif așteptat, permis UK, engleză, mașină
- Preferință limbă

Salvare: `PATCH /api/workers/me`  
Upload poză: `POST /api/workers/me/photo`

### My Trade Interest

- Worker-ul selectează meseriile care îl interesează
- Acestea alimentează: feed joburi, Daily Rate Insight, căutarea Find Job
- Salvare: `PATCH /api/workers/me` (câmp `trade_interests`)

### Request Verification

- Worker solicită verificarea profilului
- `POST /api/workers/me/verification-request`
- După aprobare (proces intern): badge „Profile Verified” pe avatar

### Profil public (alt worker)

- Vizualizare portofoliu și informații
- Butoane: **Follow/Unfollow**, **Message**
- Follow: `POST /api/follows/:id` / `DELETE /api/follows/:id`
- Mesaj: `POST /api/conversations/workers`

---

## 7. Company Dashboard

**Rută:** `GET /company/dashboard`  
**View:** `views/company/dashboard.ejs`  
**JavaScript:** `public/js/company-dashboard.js`  
**Limbă:** doar engleză (fără i18n)

Dashboard-ul companiei este o **pagină unică** cu navigare prin ancore în sidebar (scroll la secțiune).

### Layout

```
┌────────────┬──────────────────────────────────────┬─────────────┐
│  SIDEBAR   │           MAIN CONTENT               │ RIGHT PANEL │
│  nav links │  Quick Actions                       │ profil sumar│
│            │  Active Jobs                         │ notificări  │
│            │  Applicants                          │ insights    │
│            │  My Team                             │ recenzii    │
│            │  Find Workers                        │ mesaje prev.│
│            │  Company Feed                        │             │
│            │  Settings                            │             │
└────────────┴──────────────────────────────────────┴─────────────┘
```

### Sidebar — secțiuni

| Anchor | Secțiune | Funcție |
|--------|----------|---------|
| `#post-job` | Quick Actions | Butoane rapide: Post Job, Find Workers, Post Project Update |
| `#active-jobs` | Active Jobs | Lista joburilor companiei |
| `#applicants` | Applicants | Candidați la joburi |
| `#my-team` | My Team | Muncitori angajați (acceptați) |
| `#recommended-workers` | Find Workers | Căutare și invitare muncitori |
| `#company-feed` | Company Feed | Postări și stories companie |
| `#settings` | Settings | Editare profil companie |

### Quick Actions

| Buton | Acțiune |
|-------|---------|
| **Post Job** | Deschide modal creare job |
| **Find Workers** | Scroll la secțiunea Find Workers |
| **Post Project Update** | Deschide modal postare în feed |

### Active Jobs

Pentru fiecare job afișat:
- Titlu, meserie, locație, tarif, status (Open/Closed)
- Număr candidați
- Acțiuni: **Edit**, **Open/Close**, **Delete**

API:
- Creare: `POST /api/jobs`
- Editare: `PATCH /api/jobs/:id`
- Ștergere: `DELETE /api/jobs/:id`

### Applicants

- Filtrare după job
- Pentru fiecare candidat: nume, meserie, dată aplicare, notă cover
- Acțiuni:
  - **Invite** (acceptă) → `PATCH /api/applications/:id/status` cu `accepted`
  - **Reject** → status `rejected`
  - **Save to contacts** → `POST /api/companies/contacts`
  - **View profile** → modal rapid cu detalii worker

### My Team

Muncitori cu aplicație **accepted**, împărțiți în:

| Grup | Descriere |
|------|-----------|
| **Leaders** | Muncitori cu permisiuni speciale |
| **Operatives** | Muncitori fără permisiuni de postare |

**Permisiuni acordate unui angajat** (`PATCH /api/applications/:id/permissions`):

| Permisiune | Efect |
|------------|-------|
| `can_post_jobs` | Poate posta joburi în numele companiei |
| `can_post_company_posts` | Poate crea postări feed și stories ca companie |

### Find Workers

Două moduri de căutare:

1. **Quick search** — după meserie și locație
2. **Advanced search** — filtre suplimentare (disponibilitate, experiență, certificări etc.)

API: `GET /api/workers/search`

Pentru fiecare rezultat:
- **Invite to job** — trimite ofertă de job (`POST /api/jobs/:id/invite`)
- **Message** — deschide conversație
- **View profile** — modal profil worker

### Company Feed

- Postări existente ale companiei (edit/delete)
- Stories active
- Butoane: **Add Post**, **Add Story**

### Settings

- Formular profil companie: nume, descriere, website, sediu, oraș, meserii
- Upload logo: `POST /api/companies/me/logo`
- Salvare: `PATCH /api/companies/me`

### Panou dreapta (company)

- Rezumat profil companie (logo, nume, verificare)
- Notificări recente
- Insights (statistici rapide)
- Recenzii primite de la workeri
- Preview conversații mesagerie

### Modale company

| Modal | Funcție |
|-------|---------|
| Post Job | Formular complet job nou |
| Worker Profile | Vizualizare rapidă profil candidat/recomandat |
| Invite Worker | Invitare la un job specific |
| Company Post | Adăugare/editare postare feed |
| Company Story | Adăugare story 24h |
| Contacts Journal | Agendă contacte salvați din candidați |
| Notifications | Lista completă notificări |
| Messages | Messenger complet (conversații + fire) |
| Contact Message | Mesaj direct către un contact salvat |

### Contacts Journal

- Compania salvează candidați importanți ca **contacte**
- `GET /api/companies/contacts` — listă
- `POST /api/companies/contacts` — salvare din applicants
- `DELETE /api/companies/contacts/:workerId` — ștergere
- Filtrare după job sursă, meserie, dată
- Acțiuni: mesaj direct, vizualizare profil

---

## 8. Company Public Profile (vizualizat de worker)

**Rută:** `GET /companies/:id`  
**View:** `views/company/public-profile.ejs`  
**JavaScript:** `public/js/company-profile.js`  
**Autentificare:** necesar cont worker

### Conținut

| Secțiune | Funcție |
|----------|---------|
| Hero | Logo, nume, badge verificat, rating stele, oraș |
| About | Descriere, website, tip business, meserii |
| Open Jobs | Joburi deschise cu buton **Apply** |
| Reviews | Recenzii de la workeri + formular adăugare recenzie |
| Stories | Stories active ale companiei |

### Acțiuni worker pe pagina companiei

| Acțiune | API |
|---------|-----|
| Follow / Unfollow | `POST /api/companies/:id/follow` |
| Apply la job | `POST /api/jobs/:id/apply` (cu notă cover opțională) |
| Lasă recenzie | `POST /api/companies/:id/reviews` (stele 1–5 + text) |
| Înapoi la feed | link către `/worker/dashboard` |

---

## 9. Cum interacționează worker-ul cu compania

```
Worker                          Companie
  │                                │
  ├── follow companie ────────────►│
  │                                │
  ├── aplică la job ──────────────►│ notificare: aplicație nouă
  │                                │
  │◄── accept / reject ────────────┤ notificare: status aplicație
  │                                │
  │◄── invite la job ──────────────┤ notificare: ofertă job
  │                                │
  ├── mesaje ◄──────────────────►  ├── conversație (opțional legată de job)
  │                                │
  ├── recenzie companie ──────────►│ (company_reviews)
  │◄── recenzie worker ────────────┤ (worker_reviews)
  │                                │
  ├── postare ca companie ────────►│ (dacă are can_post_company_posts)
  ├── postare job ca companie ────►│ (dacă are can_post_jobs)
  │                                │
  │◄── salvat în contacts ─────────┤ (company_contacts)
```

### Flux aplicație job

| Status | Semnificație | Cine îl setează |
|--------|--------------|-----------------|
| `pending` | Aplicație trimisă, în așteptare | automat la apply |
| `accepted` | Angajat / în echipă | compania |
| `rejected` | Respins | compania |
| `withdrawn` | Retras de worker | worker |
| `unhired` | Demis / scoas din echipă | compania |

### Following (urmărire)

- Worker urmărește companii: `POST /api/follows/:id`
- Worker poate urmări și alți workeri
- Companiile urmărite apar în panoul stânga și alimentează stories + personalizarea feed-ului
- `GET /api/follows/me` — lista urmăririlor

### Delegare postări (angajat cu permisiuni)

Un worker **acceptat** la o companie poate primi permisiuni:
- să posteze **joburi** ca și compania
- să posteze **update-uri** (feed + stories) ca și compania

Verificare permisiuni: `GET /api/workers/me/company-permissions`

---

## 10. Căutarea joburilor (Find Job)

### Puncte de intrare

1. Banner **„Ready for your next site?”** din feed
2. Buton **Find Job** din profil
3. Carduri job din feed (buton Apply direct)
4. Pagina publică a companiei (Apply pe joburi deschise)

### Modal Find Job — pași

**1. Worker deschide modalul** (`components/dashboard/find-job-modal.ejs`)

**2. Completează filtrele:**

| Filtru | Descriere |
|--------|-----------|
| Trade (meserie) | Autocomplete după 3 litere — `GET /api/jobs/trades/search?q=` |
| Location | Oraș sau cod poștal |
| Company name | Nume companie |
| Vacancies only | Bifă: doar companii cu posturi deschise |

**3. Caută** → `GET /api/companies` cu parametri:
- `companyName`, `location`, `trade`, `vacancies=open|all`, `tradeInterests`

**4. Rezultate:** carduri companie cu:
- Logo, nume, rating, badge verificat
- Joburi deschise embedded (titlu, locație, tarif)
- Hint potrivire cu meseriile worker-ului

**5. Acțiuni per rezultat:**

| Buton | Acțiune |
|-------|---------|
| View company | Navighează la `/companies/:id` |
| Apply | `POST /api/jobs/:id/apply` |
| Send message | Creează conversație + primul mesaj |

**6. Trade interests** din profil pre-populează automat căutarea.

### Potrivire joburi în feed

- Joburile din feed sunt filtrate după `trade_interests` din profilul worker-ului
- Dacă nu are interese setate, vede toate joburile deschise
- Joburile la care a aplicat deja afișează „You already applied”

### Daily Rate Insight

- Card special în feed cu tarife medii (oră/zi/mp) pentru meseriile din `trade_interests`
- Sursă: `GET /api/jobs/trades/rates`
- Worker poate da feedback (up/down): `POST /api/jobs/trades/rates/feedback`

---

## 11. Feed, Stories și postări salvate

### Feed (`feed_posts`)

**Tipuri de postare:**

| Tip | Descriere |
|-----|-----------|
| `work_completed` | Lucrare finalizată |
| `progress` | Progres pe șantier |
| `skills` | Demonstrație competențe |
| `certification` | Certificare/obținere calificare |
| `company_update` | Update de la companie |

**Engagement:**

| Acțiune | Tabel DB |
|---------|----------|
| Like | `feed_likes` |
| Comentariu | `feed_comments` |
| Save | `feed_saved_posts` |

**Personalizare feed worker:**
- Postări de la companii (toate)
- Postări de la autori pe care îi urmărește
- Joburi filtrate după meserie
- Card Daily Rate Insight

### Stories

- Conținut efemer, **expiră după 24 ore**
- Autor: companie sau worker (cu permisiune)
- Worker vede stories doar de la companii urmărite
- Viewer fullscreen cu auto-avansare între story-uri
- Upload imagine sau video scurt

### Postări salvate

- Toggle save din feed: `POST /api/feed/posts/:id/save`
- Listate pe `/worker/profile` în secțiunea **Saved Posts**
- `GET /api/feed/saved`
- Pot fi „unsaved” din profil

---

## 12. Mesagerie

### Tipuri conversație

| Tip | Participanți | Creare |
|-----|--------------|--------|
| Worker ↔ Company | muncitor + companie | `POST /api/conversations` (opțional `jobId`) |
| Worker ↔ Worker | doi muncitori | `POST /api/conversations/workers` |

### Endpoints

| Endpoint | Funcție |
|----------|---------|
| `GET /api/conversations` | Lista conversații cu unread count |
| `GET /api/conversations/:id/messages` | Istoric mesaje |
| `POST /api/conversations/:id/messages` | Trimite mesaj |
| `DELETE /api/conversations/:id` | Șterge conversația |

### UI mesagerie

- **Worker:** panou în topbar (dashboard + profil)
- **Company:** preview în panoul dreapta + modal messenger complet
- Mesaje din: applicants, recommended workers, contacts journal, profil public

### Moderare mesaje

- Textul mesajelor este scanat (aceeași logică ca postările/comentariile)
- Mesaje cu conținut suspect pot fi blocate sau marcate pentru revizuire

---

## 13. Notificări

### Endpoints

| Endpoint | Funcție |
|----------|---------|
| `GET /api/notifications` | Ultimele 100 notificări |
| `PATCH /api/notifications/:id/read` | Marchează ca citită |

### Tipuri notificări observate

| Tip | Declanșator | Destinatar |
|-----|-------------|------------|
| `application` | Aplicație nouă / schimbare status | companie / worker |
| `job_offer` | Companie invită worker la job | worker |
| General | Alte evenimente platformă | ambele roluri |

### UI

- **Worker:** iconiță inimă în topbar cu badge număr necitite
- **Company:** panou lateral + modal notificări
- Click pe notificare → marchează citită + acțiune contextuală (deschide applicants, mesaje etc.)

---

## 14. Verificare profil și recenzii

### Verificare worker

| Status | Afișare |
|--------|---------|
| `pending` | Fără badge special |
| `approved` | Badge „Profile Verified” pe avatar |
| `rejected` | Fără badge; poate re-solicita |

Solicitare: `POST /api/workers/me/verification-request`

### Verificare companie

- Badge „Verified company” pe dashboard și profil public
- Status în `company_profiles.verification_status`

### Recenzii

| Direcție | Cine lasă | Unde apare |
|----------|-----------|------------|
| Worker → Company | worker pe `/companies/:id` | profil public companie, panou dreapta company dashboard |
| Company → Worker | companie din team/applicants | card echipă, profil worker |

API:
- `POST /api/companies/:id/reviews`
- `POST /api/workers/:id/reviews`

---

## 15. Multilanguage (i18n)

### Unde funcționează

| Zonă | i18n |
|------|------|
| Worker dashboard | ✅ Da |
| Worker profile | ✅ Da |
| Company public profile (pentru worker) | ✅ Da |
| Company dashboard | ❌ Nu (doar engleză) |
| Landing / login | ❌ Nu (doar engleză) |

### Limbi suportate (6)

| Cod | Limbă |
|-----|-------|
| `en` | English |
| `ro` | Romanian |
| `ru` | Russian |
| `pl` | Polish |
| `bg` | Bulgarian |
| `uk` | Ukrainian |

### Cum funcționează

**Fișier:** `public/js/worker-i18n.js`

1. Dicționare inline per limbă, chei de tip `feed.readyTitle`, `buttons.apply`
2. Elemente HTML marcate cu `data-i18n="cheie"` sau `data-i18n-attr="placeholder:search.placeholder"`
3. Funcție globală: `window.SiteCrewI18n.t('cheie')` — folosită în `dashboard.js` pentru texte dinamice
4. La schimbare limbă: `document.documentElement.lang` se actualizează

### Ordinea de rezolvare a limbii

1. `worker_profiles.language_preference` (din server, atribut `data-worker-language` pe `<body>`)
2. `localStorage.sitecrewWorkerLanguage`
3. Limba browserului (`navigator.language`)

### Unde se schimbă limba

- Picker cu steaguri în topbar (worker dashboard)
- Câmp „Language” în formularul Edit Profile
- Salvare: `PATCH /api/workers/me` cu `languagePreference`

---

## 16. Upload fișiere și media

### Stocare

- Disc local: `backend/uploads/`
- Middleware: Multer (`backend/src/middleware/upload.js`)
- Limită: **5 MB** per fișier
- URL în DB: `/uploads/<filename>` (cale relativă)

### Endpoint-uri upload

| Endpoint | Câmp form | Utilizare |
|----------|-----------|-----------|
| `POST /api/workers/me/photo` | `photo` | Poză profil worker |
| `POST /api/companies/me/logo` | `logo` | Logo companie |
| `POST /api/feed/posts/upload` | `media` (max 5) | Imagini/video postare feed |
| `POST /api/stories/upload` | `media` (1) | Media story |

### Reguli client

| Context | Reguli |
|---------|--------|
| Postare feed | 1 video **SAU** până la 5 imagini |
| Story | 1 imagine sau 1 video (max ~15 secunde) |
| Formate | JPG, PNG, GIF, WebP, HEIC (convertit server-side la JPEG), formate video comune |

### Pipeline procesare

1. Multer salvează fișierul cu nume timestamp-uit
2. `enqueueUploadedFile()` — conversie HEIC→JPEG, opțional coadă media review
3. URL relativ stocat în DB
4. Frontend afișează prin `/uploads/...` (servit de frontend sau API)

---

## 17. Moderare conținut

### Text

- Scanare la: postări feed, comentarii, mesaje, joburi
- Motor: `backend/src/utils/contentModeration.js` + opțional `ai-scan-service`
- Status postare: `moderation_status` (`visible`, `pending`, `hidden` etc.)
- Comentarii blocate afișează mesaj: „AI Content will review the text shortly”

### Media

- Imagini/video intră în coada `media-review-service`
- Postările pot fi ascunse până la aprobare

---

## 18. Rute frontend (rezumat)

| Rută | Acces | Descriere |
|------|-------|-----------|
| `/` | Public | Landing page marketing |
| `/login` | Public | Login + înregistrare |
| `/worker/dashboard` | Worker | Dashboard principal |
| `/worker/profile` | Worker | Profil propriu |
| `/workers/:id/profile` | Worker | Profil alt muncitor |
| `/company/dashboard` | Company | Dashboard companie |
| `/companies/:id` | Worker | Profil public companie |

---

## 19. API endpoints principale (după domeniu)

> Baza URL: configurată în `.env` ca `API_BASE_URL` (ex: `http://localhost:4000`)

### Auth
- `POST /api/auth/login`
- `POST /api/auth/register-worker`
- `POST /api/auth/register-company`
- `GET /api/auth/me`

### Workers
- `GET /api/workers/me` — profil curent
- `PATCH /api/workers/me` — actualizare profil
- `PATCH /api/workers/me/availability` — status disponibilitate
- `POST /api/workers/me/photo` — upload poză
- `POST /api/workers/me/verification-request` — solicitare verificare
- `GET /api/workers/me/company-permissions` — permisiuni postare ca companie
- `GET /api/workers/:id/profile` — profil worker
- `GET /api/workers/directory/search` — căutare din topbar
- `GET /api/workers/search` — căutare avansată (company dashboard)
- `POST /api/workers/:id/reviews` — recenzie de la companie
- `POST /api/workers/:id/message` — mesaj direct

### Companies
- `GET /api/companies` — căutare companii (Find Job)
- `GET /api/companies/:id` — detalii companie
- `PATCH /api/companies/me` — actualizare profil
- `POST /api/companies/me/logo` — upload logo
- `POST /api/companies/:id/follow` — follow
- `POST /api/companies/:id/reviews` — recenzie de la worker
- `GET /api/companies/contacts` — jurnal contacte
- `POST /api/companies/contacts` — salvare contact
- `DELETE /api/companies/contacts/:workerId` — ștergere contact

### Jobs
- `GET /api/jobs` — lista joburi
- `GET /api/jobs/:id` — detalii job
- `POST /api/jobs` — creare job
- `PATCH /api/jobs/:id` — editare
- `DELETE /api/jobs/:id` — ștergere
- `POST /api/jobs/:id/apply` — aplicare worker
- `POST /api/jobs/:id/invite` — invitare worker
- `GET /api/jobs/:id/applications` — candidați
- `GET /api/jobs/:id/matches` — muncitori recomandați
- `GET /api/jobs/trades/search` — autocomplete meserii
- `GET /api/jobs/trades/rates` — tarife medii
- `POST /api/jobs/trades/rates/feedback` — feedback tarife

### Applications
- `GET /api/applications/me` — aplicațiile worker-ului
- `PATCH /api/applications/:id/status` — accept/reject/withdraw/unhire
- `PATCH /api/applications/:id/permissions` — permisiuni postare
- `DELETE /api/applications/:id` — ștergere aplicație

### Feed
- `GET /api/feed` — postări feed
- `GET /api/feed/saved` — postări salvate
- `POST /api/feed/posts` — creare postare
- `POST /api/feed/posts/upload` — upload media
- `PATCH /api/feed/posts/:id` — editare
- `DELETE /api/feed/posts/:id` — ștergere
- `POST /api/feed/posts/:id/like` — like/unlike
- `POST /api/feed/posts/:id/save` — save/unsave
- `POST /api/feed/posts/:id/comment` — comentariu
- `GET /api/feed/posts/:id/comments` — listă comentarii

### Stories
- `GET /api/stories/companies` — stories companii
- `POST /api/stories` — creare story
- `POST /api/stories/upload` — upload media story

### Social
- `GET /api/follows/me` — urmăriri
- `POST /api/follows/:id` — follow
- `DELETE /api/follows/:id` — unfollow

### Mesagerie
- `GET /api/conversations`
- `POST /api/conversations`
- `POST /api/conversations/workers`
- `GET /api/conversations/:id/messages`
- `POST /api/conversations/:id/messages`
- `DELETE /api/conversations/:id`

### Notificări
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`

---

## 20. Structura fișierelor relevante

```
sitecrew/
├── server.js                    # Frontend Express + rute SSR + build dashboard data
├── views/
│   ├── index.ejs                # Landing page
│   ├── auth/login.ejs           # Login/register
│   ├── worker/
│   │   ├── dashboard.ejs        # Worker dashboard
│   │   └── profile.ejs          # Worker profile
│   ├── company/
│   │   ├── dashboard.ejs        # Company dashboard
│   │   └── public-profile.ejs   # Company public page
│   └── components/
│       ├── dashboard/           # Componente worker dashboard
│       ├── company/             # Componente company dashboard
│       └── profile/             # Componente profil worker
├── public/
│   ├── js/
│   │   ├── auth.js              # Login/register client
│   │   ├── dashboard.js         # Worker dashboard logic
│   │   ├── company-dashboard.js # Company dashboard logic
│   │   ├── company-profile.js   # Company public page logic
│   │   └── worker-i18n.js       # Traduceri worker UI
│   └── css/
│       ├── style.css            # Landing styles
│       ├── login.css            # Auth page styles
│       └── dashboard.css        # Dashboard styles
└── backend/
    ├── src/
    │   ├── server.js            # API server
    │   ├── db/schema.sql        # Schema PostgreSQL
    │   └── modules/
    │       ├── auth/            # Autentificare
    │       ├── workers/         # Profiluri worker
    │       ├── companies/       # Profiluri companie
    │       ├── jobs/            # Joburi
    │       ├── applications/    # Aplicații
    │       ├── feed/            # Feed social
    │       ├── stories/         # Stories 24h
    │       ├── follows/         # Urmăriri
    │       ├── messages/        # Mesagerie
    │       └── notifications/   # Notificări
    └── uploads/                 # Fișiere media încărcate
```

---

## 21. Conturi demo (după `npm run db:seed`)

| Rol | Email | Parolă |
|-----|-------|--------|
| Worker | `alex.worker@sitecrew.test` | `password123` |
| Worker | `maria.worker@sitecrew.test` | `password123` |
| Company | `hiring@apexbuild.test` | `password123` |
| Company | `jobs@northbuild.test` | `password123` |
| Company | `crew@skyline.test` | `password123` |

---

*Document generat pentru SiteCrew. Ultima actualizare: iunie 2026.*
