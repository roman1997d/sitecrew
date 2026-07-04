# Raport evaluare SEO — SiteCrew

**Domeniu:** [https://sitecrew.uk](https://sitecrew.uk)  
**Evaluare inițială:** 4 iulie 2026  
**Ultima actualizare:** 4 iulie 2026 (post Faza 1 + 2 + 3, verificat live pe producție)  
**Tip platformă:** Marketplace B2B/B2C — recrutare construcții UK (workers + companies)

---

## Rezumat executiv

SiteCrew a evoluat de la **~8 URL-uri indexabile** la o **platformă SEO-ready** cu **92 URL-uri** în sitemap live: landing pages programatice (trade, oraș, combo), profiluri companii, joburi, pagini de conținut și gestionare corectă a erorilor 404.

**Stare actuală (4 iulie 2026, producție):** Infrastructură tehnică matură; long-tail acoperit programatic; indexarea efectivă în Google depinde de Google Search Console (acțiune manuală).

| Categorie | Scor inițial | Scor anterior | **Scor actual** |
|-----------|:------------:|:-------------:|:---------------:|
| SEO tehnic (crawl, indexare, meta) | 78/100 | 88/100 | **91/100** |
| Conținut & structură on-page | 55/100 | 78/100 | **82/100** |
| Schema.org / rich results | 72/100 | 85/100 | **90/100** |
| Performanță & UX (neauditat CWV) | ~60/100 | ~60/100 | **~60/100** |
| Autoritate & conținut long-tail | 25/100 | 45/100 | **62/100** |
| **Scor general SEO** | **~58/100** | **~72/100** | **~78/100** |

---

## Verificări live pe producție (4 iulie 2026)

| Test | Rezultat | Status |
|------|----------|--------|
| `curl -sI https://sitecrew.uk/jobs/99999` | `HTTP/1.1 404 Not Found` | ✅ |
| `curl -sI https://sitecrew.uk/jobs/plumber-jobs-in-leeds` | `HTTP/1.1 200 OK` | ✅ |
| `curl -sI https://www.sitecrew.uk/` | `HTTP/1.1 301 Moved Permanently` | ✅ |
| `sitemap.xml` — număr URL-uri | **92** | ✅ |
| JobPosting `identifier` pe `/jobs/5` | `sitecrew-job-5` | ✅ |
| JobPosting `industry` + `occupationalCategory` | prezente | ✅ |

---

## Istoric implementări

### Faza 1 — Remedieri tehnice ✅ (`0d509bc`)

| Item | Status |
|------|--------|
| Imagine OG 1200×630 + meta `og:image:width/height/alt` | ✅ |
| Redirect 301 `www` → non-www (Express + nginx) | ✅ verificat live |
| `noindex` pe `/login` (sign-in) | ✅ |
| `robots.txt` extins | ✅ |
| `JobPosting.validThrough` (+30 zile) | ✅ |
| `baseSalary` numeric | ✅ |
| `BreadcrumbList` pe joburi | ✅ |
| Navbar + carousel homepage | ✅ |

### Faza 2 — Conținut indexabil ✅ (`0167009`)

| Item | Status |
|------|--------|
| Profiluri companii publice `/companies/{slug}-{id}` | ✅ |
| Landing pages trade (8) + oraș (8) | ✅ |
| Căutare `/jobs?q=&trade=&city=` | ✅ |
| `SearchAction` în `WebSite` schema | ✅ |
| `/about`, `/how-it-works` | ✅ |
| Sitemap dinamic extins | ✅ |
| `Organization` + `AggregateRating` pe companii | ✅ |

### Faza 3 — Optimizări indexare ✅ (`9d1f542`)

| Item | Status |
|------|--------|
| `/jobs/:id` inexistent → **404** cu pagină utilă (`errors/job-not-found.ejs`) | ✅ verificat live |
| Landing combo **generate automat** (8×8 = 64) | ✅ verificat live |
| `JobPosting.identifier` (`sitecrew-job-{id}`) | ✅ |
| `JobPosting.industry` = Construction | ✅ |
| `JobPosting.occupationalCategory` = trade | ✅ |
| `noindex` pe pagina 404 job | ✅ |

---

## Ce funcționează bine

### 1. Infrastructură tehnică

| Element | Status | Detalii |
|---------|--------|---------|
| HTTPS | ✅ | Let's Encrypt |
| `robots.txt` | ✅ | Admin, dashboard-uri, API, auth blocate |
| `sitemap.xml` | ✅ | **92 URL-uri** live (dinamic) |
| Canonical URLs | ✅ | Toate paginile publice |
| Redirect www | ✅ | **301** confirmat pe producție |
| Google Analytics | ✅ | `G-RQRV1DW5GG` |
| OG image | ✅ | 1200×630 |

### 2. Pagini publice indexabile

| URL | Sitemap | Notes |
|-----|:-------:|-------|
| `/` | ✅ | FAQ, featured jobs, Organization |
| `/jobs` + search params | ✅ | Filtrare server-side |
| `/jobs/{trade}` | ✅ | 8 trades |
| `/jobs/{city}` | ✅ | 8 orașe |
| `/jobs/{trade}-jobs-in-{city}` | ✅ | **64 combo** (auto-generate) |
| `/jobs/{id}` | ✅ | JobPosting complet |
| `/jobs/{id}` inexistent | — | **404** + landings populare (`noindex`) |
| `/companies/{slug}-{id}` | ✅ | Organization; `noindex` dacă neverificat |
| `/about`, `/how-it-works` | ✅ | Conținut |
| `/login?mode=register&role=*` | ✅ | Register landing |
| Legal + contact | ✅ | terms, privacy, contact |

### 3. Date structurate (Schema.org)

| Pagină | Schema |
|--------|--------|
| Homepage | `Organization`, `WebSite` + `SearchAction`, `FAQPage` |
| `/jobs`, landings | `BreadcrumbList` |
| `/jobs/:id` | `BreadcrumbList`, `JobPosting` (complet) |
| `/companies/:slug` | `BreadcrumbList`, `Organization`, `AggregateRating` |

**JobPosting — câmpuri actuale:**

- `title`, `description`, `datePosted`, `validThrough`
- `identifier` → `sitecrew-job-{id}`
- `industry` → `Construction`
- `occupationalCategory` → trade (ex. Electrician)
- `hiringOrganization`, `jobLocation`, `baseSalary`, `directApply`, `url`

### 4. Gestionare erori SEO

Pagina `views/errors/job-not-found.ejs`:

- Status HTTP **404** (nu soft-404 prin redirect)
- `noindex, follow` — nu indexează joburi moarte
- Linkuri către landings populare, browse trade/oraș, `/jobs`

---

## Probleme rămase

### Înaltă prioritate

#### 1. Google Search Console — acțiune manuală

Sitemap-ul cu 92 URL-uri e live. **Următorul pas:**

1. [search.google.com/search-console](https://search.google.com/search-console) → add property `sitecrew.uk`
2. Verificare DNS (TXT) sau HTML meta tag
3. Sitemaps → submit: `sitemap.xml`
4. După 3–7 zile: verifică Coverage + Performance

### Medie prioritate

#### 2. Conținut în spatele login-ului

Feed, profiluri worker, mesagerie — corect neindexabile. Competitorii au volume editoriale mult mai mari.

#### 3. Homepage carousel „Companies”

Conținut static fictiv — oportunitate: companii verificate reale din API.

#### 4. `validThrough` estimat

+30 zile de la `created_at`, nu câmp DB dedicat (`closes_at`).

#### 5. Extindere geo

8 orașe hardcodate în `utils/seoLandings.js`. Oraș nou = o linie în `CITY_LANDINGS` → combo-urile se regenerează automat.

### Prioritate scăzută

| Item | Status |
|------|--------|
| Blog / ghiduri CSCS, day rates | ❌ |
| Audit Lighthouse / Core Web Vitals | ❌ |
| Link building UK | ❌ |
| Slug-uri job (`/jobs/title-id`) | ❌ |
| `slug` în DB pentru companii | ❌ |
| `security.txt` | ❌ |
| Self-host fonts | ❌ |

---

## Inventar tehnic

### robots.txt

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /worker/dashboard
Disallow: /company/dashboard
Disallow: /auth/
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /api/

Sitemap: https://sitecrew.uk/sitemap.xml
```

### Sitemap live — 92 URL-uri (4 iulie 2026)

| Categorie | Count |
|-----------|------:|
| Pagini statice | 9 |
| Landing trade | 8 |
| Landing oraș | 8 |
| Landing combo (auto) | 64 |
| Joburi deschise | 2 |
| Companii verificate | 1 |
| **Total** | **92** |

*Numărul variază cu joburile și companiile active.*

**Exemple verificate:**

- `https://sitecrew.uk/jobs/plumber-jobs-in-leeds` → 200
- `https://sitecrew.uk/jobs/99999` → 404
- `https://sitecrew.uk/companies/k10-12` → în sitemap

### Landing pages (`utils/seoLandings.js`)

**Trade (8):** electrician, builder, plumber, carpenter, dryliner, plasterer, bricklayer, labourer

**Oraș (8):** london, manchester, birmingham, leeds, liverpool, bristol, glasgow, brighton

**Combo (64):** generate automat via `buildComboLandings()` — format `{trade}-jobs-in-{city}`

### Fișiere cheie

| Fișier | Rol |
|--------|-----|
| `utils/seo.js` | Meta, schema, sitemap, robots |
| `utils/seoLandings.js` | Trade/oraș + combo auto-generate |
| `utils/publicJobs.js` | JobPosting schema complet |
| `utils/publicCompanies.js` | Slug + Organization schema |
| `views/errors/job-not-found.ejs` | 404 SEO-friendly |
| `views/jobs/list.ejs` | Search + browse |
| `views/companies/profile.ejs` | Profil public companie |
| `server.js` | Rute publice, sitemap, 404 handler |

---

## Keywords țintă — acoperire actuală

| Keyword cluster | Pagină dedicată | Status |
|-----------------|-----------------|--------|
| construction jobs uk | `/jobs` | ✅ |
| electrician jobs uk | `/jobs/electrician` | ✅ |
| construction jobs london | `/jobs/london` | ✅ |
| electrician jobs london | `/jobs/electrician-jobs-in-london` | ✅ |
| plumber jobs leeds | `/jobs/plumber-jobs-in-leeds` | ✅ verificat live |
| dryliner jobs manchester | `/jobs/dryliner-jobs-in-manchester` | ✅ |
| bricklayer jobs birmingham | `/jobs/bricklayer-jobs-in-birmingham` | ✅ |
| {company name} jobs | `/companies/{slug}` | ✅ |
| hire tradespeople uk | `/`, `/about` | Parțial |
| CSCS card guide | — | ❌ |

---

## Recomandări — următorii pași

### Imediat (manual)

1. ✅ Deploy — completat pe producție
2. ⏳ **Google Search Console** — verificare + submit `sitemap.xml`
3. ⏳ **Rich Results Test** — `/`, `/jobs/5`, `/companies/k10-12`
4. ⏳ **URL Inspection** — request indexing pe 5 landings cheie

### 1–3 luni

1. Carousel homepage cu companii reale din API
2. Adăugare orașe noi în `CITY_LANDINGS` (combo-urile se generează singure)
3. Blog/ghiduri: CSCS card, UK day rates 2026
4. Lighthouse audit — LCP, CLS, fonts
5. Monitorizare GSC — coverage, queries, CTR pe landings

### 3–6 luni

1. Link building (directoare construcții UK)
2. A/B test meta titles pe landings cu trafic
3. Slug-uri job în URL
4. Câmp `closes_at` pe joburi pentru `validThrough` exact

---

## Checklist monitorizare lunară

- [ ] Google Search Console — coverage, queries, erori
- [ ] Sitemap: ~92 URL-uri vs joburi + companii reale
- [ ] Poziții keywords țintă (10–20 queries)
- [ ] Core Web Vitals: homepage, `/jobs`, `/jobs/electrician`
- [ ] Rich results: FAQ, JobPosting, Organization
- [ ] www → non-www 301 funcțional
- [ ] 404 pe joburi inexistente (nu redirect)
- [ ] OG preview social
- [ ] Companii noi verificate în sitemap

---

## Concluzie

SiteCrew a crescut de la **~58/100 la ~78/100** în pregătirea SEO, cu toate fazele tehnice (1–3) implementate și verificate live.

**Realizări cheie:**
- **92 URL-uri** în sitemap (vs ~8 la evaluarea inițială)
- **80 landing pages** programatice (trade + oraș + combo)
- **404 corect** pentru joburi inexistente
- **JobPosting schema completă** pentru Google Jobs
- **www redirect 301** funcțional pe producție

**Limitarea principală rămasă:** indexarea efectivă în Google (necesită GSC + timp) și conținut editorial (blog, ghiduri) pentru autoritate pe termen lung.

**Prioritatea #1 acum:** Google Search Console — submit `sitemap.xml` și monitorizare coverage.

**Prioritatea #2:** conținut editorial + audit performanță (Lighthouse).

---

*Raport actualizat 4 iulie 2026 — codebase commits `0d509bc`, `0167009`, `9d1f542`, `bcfef7c` + verificări live pe https://sitecrew.uk.*
