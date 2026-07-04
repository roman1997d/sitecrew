# Raport evaluare SEO — SiteCrew

**Domeniu:** [https://sitecrew.uk](https://sitecrew.uk)  
**Evaluare inițială:** 4 iulie 2026  
**Ultima actualizare:** 4 iulie 2026 (post Faza 1 + Faza 2)  
**Tip platformă:** Marketplace B2B/B2C — recrutare construcții UK (workers + companies)

---

## Rezumat executiv

SiteCrew a trecut de la o **fundație tehnică solidă** la o **suprafață indexabilă extinsă**. După implementarea Fazei 1 (remedieri tehnice) și Fazei 2 (conținut public programatic), platforma poate fi crawl-ată pe zeci de URL-uri relevante: joburi, landing pages trade/oraș, profiluri companii verificate, About, How it works.

**Stare actuală:** SEO tehnic matur pentru early-stage; conținut long-tail parțial acoperit; autoritate și performanță rămân zone de creștere.

| Categorie | Scor inițial | Scor actual | Evoluție |
|-----------|:------------:|:-----------:|:--------:|
| SEO tehnic (crawl, indexare, meta) | 78/100 | **88/100** | +10 |
| Conținut & structură on-page | 55/100 | **78/100** | +23 |
| Schema.org / rich results | 72/100 | **85/100** | +13 |
| Performanță & UX (neauditat CWV) | ~60/100 | **~60/100** | — |
| Autoritate & conținut long-tail | 25/100 | **45/100** | +20 |
| **Scor general SEO** | **~58/100** | **~72/100** | **+14** |

---

## Istoric implementări

### Faza 1 — Remedieri tehnice ✅ (commit `0d509bc`)

| Item | Status |
|------|--------|
| Imagine OG 1200×630 (`/images/og-default.png`) + `og:image:width/height/alt` | ✅ |
| Redirect 301 `www` → non-www în Express (fallback nginx) | ✅ |
| `noindex` pe `/login` (sign-in); register rămâne indexabil | ✅ |
| `robots.txt` extins (`/auth/`, forgot/reset password) | ✅ |
| `JobPosting.validThrough` (+30 zile de la postare) | ✅ |
| `baseSalary` cu valoare numerică parsată | ✅ |
| `BreadcrumbList` pe `/jobs` și `/jobs/:id` | ✅ |
| Navbar: eliminat link Feed către dashboard | ✅ |
| Carousel homepage: linkuri `href="#"` → register worker | ✅ |

### Faza 2 — Creștere conținut indexabil ✅ (commit `0167009`)

| Item | Status |
|------|--------|
| Profiluri companii publice `/companies/{slug}-{id}` | ✅ |
| Landing pages trade (8): electrician, builder, plumber… | ✅ |
| Landing pages oraș (8): london, manchester, birmingham… | ✅ |
| Landing pages combo (3): ex. `electrician-jobs-in-london` | ✅ |
| Căutare publică `/jobs?q=&trade=&city=` | ✅ |
| `SearchAction` în schema `WebSite` | ✅ |
| Pagini `/about` și `/how-it-works` | ✅ |
| Sitemap dinamic extins (landings + companii + joburi) | ✅ |
| `Organization` + `AggregateRating` pe profiluri companii | ✅ |
| `noindex` pe companii neverificate | ✅ |

---

## Ce funcționează bine

### 1. Infrastructură tehnică

| Element | Status | Detalii |
|---------|--------|---------|
| HTTPS | ✅ | Let's Encrypt via nginx |
| `robots.txt` dinamic | ✅ | Blochează admin, dashboard-uri, API, rute auth |
| `sitemap.xml` dinamic | ✅ | Static + landings + joburi + companii verificate |
| Canonical URLs | ✅ | Toate paginile publice |
| Redirect www | ✅ | Express 301 + config nginx în repo |
| Google Analytics | ✅ | `G-RQRV1DW5GG` |
| OG image social | ✅ | 1200×630, meta dimensions + alt |

### 2. Pagini publice indexabile

| URL | Sitemap | Notes |
|-----|:-------:|-------|
| `/` | ✅ | H1, FAQ schema, featured jobs |
| `/jobs` | ✅ | Listă + formular căutare + browse links |
| `/jobs?q=&trade=&city=` | ✅ (canonical dinamic) | Filtrare server-side |
| `/jobs/{trade\|city\|combo}` | ✅ | 19 landing pages programatice |
| `/jobs/{id}` | ✅ | JobPosting + breadcrumbs |
| `/companies/{slug}-{id}` | ✅ | Organization schema; `noindex` dacă neverificat |
| `/about` | ✅ | Pagină despre platformă |
| `/how-it-works` | ✅ | Ghid workers + companies |
| `/login?mode=register&role=*` | ✅ | Landing înregistrare |
| `/terms`, `/privacy`, `/contact` | ✅ | Legal + contact |

**Pagini cu `noindex` intenționat:** `/login` (sign-in), `/forgot-password`, `/reset-password`, `/auth/restore`, companii neverificate.

### 3. Date structurate (Schema.org)

| Pagină | Schema |
|--------|--------|
| Homepage | `Organization`, `WebSite` (+ `SearchAction`), `FAQPage` |
| `/jobs`, landings | `BreadcrumbList` |
| `/jobs/:id` | `BreadcrumbList`, `JobPosting` |
| `/companies/:slug` | `BreadcrumbList`, `Organization` (+ `AggregateRating` dacă există recenzii) |

### 4. Profiluri companii — comportament dual

- **Vizitatori anonimi** → `views/companies/profile.ejs` (SEO, fără PII email/phone)
- **Workers autentificați** → `views/company/public-profile.ejs` (follow, mesaje, recenzii)
- Slug canonic: `slugify(company_name)-{user_id}` cu redirect 301 dacă URL-ul e numeric/incorect

### 5. Linkuri interne

- Navbar: Home, Jobs, How it works, About, Login
- Footer: How it works, About, Contact, Jobs, Register
- Job cards: link către profil companie când e disponibil
- Browse chips pe `/jobs`: trade + oraș

---

## Probleme rămase

### Înaltă prioritate

#### 1. Google Search Console — neconfirmat

Sitemap-ul e gata, dar indexarea reală depinde de verificarea domeniului și retrimiterea `sitemap.xml` în GSC. **Acțiune manuală necesară.**

#### 2. Redirect www pe producție — de verificat post-deploy

Codul include redirect în Express; nginx din repo are și el 301. După `git pull` + restart, verifică:

```bash
curl -sI https://www.sitecrew.uk/ | grep -i location
```

Așteptat: `301` → `https://sitecrew.uk/`

#### 3. Conținut încă în spatele login-ului

Feed worker, profiluri worker, mesagerie, aplicări — neindexabile (corect din punct de vedere UX/privacy). Competitorii au volume mult mai mari de pagini.

### Medie prioritate

#### 4. Landing pages limitate la set fix

19 landings predefinite în `utils/seoLandings.js`. Nu există generare automată pentru toate combinațiile trade × oraș (ex. `plumber-jobs-in-leeds`).

#### 5. JobPosting — câmpuri opționale lipsă

Încă lipsesc: `identifier`, `occupationalCategory`, `industry`. `validThrough` e estimat (+30 zile), nu din câmp DB dedicat.

#### 6. Homepage carousel „Companies”

Conținut static fictiv (Apex Construction etc.) — linkurile merg la register, nu la profiluri reale. Oportunitate: înlocuire cu companii verificate din API.

#### 7. `/jobs/:id` inexistent

Redirect 302 → `/jobs` (fără pagină 404 SEO-friendly).

### Prioritate scăzută / Faza 3

| Item | Status |
|------|--------|
| Blog / ghiduri CSCS, day rates | ❌ |
| Audit Lighthouse / Core Web Vitals | ❌ |
| Link building & directoare UK | ❌ |
| `hreflang` | N/A (doar UK) |
| `security.txt` | ❌ |
| Self-host fonts / lazy-load imagini | ❌ |
| Slug-uri job (`/jobs/title-id`) | ❌ (încă numeric) |
| Câmp `slug` în DB pentru companii | ❌ (generat la runtime) |

---

## Inventar tehnic

### robots.txt (actual)

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

### Sitemap — structură dinamică

**Pagini statice** (`utils/seo.js`):

- `/`, `/jobs`, `/about`, `/how-it-works`
- `/login?mode=register&role=worker`, `/login?mode=register&role=company`
- `/terms`, `/privacy`, `/contact`

**Dinamic** (`server.js`):

- 19 landing pages (`getAllLandingPaths()`)
- Toate joburile deschise (`/jobs/{id}`)
- Companii verificate (`/companies/{slug}-{id}`) via `GET /api/companies/public/index`

*Numărul total variază cu joburile și companiile active — verifică live după deploy.*

### Landing pages configurate

**Trade (8):** electrician, builder, plumber, carpenter, dryliner, plasterer, bricklayer, labourer

**Oraș (8):** london, manchester, birmingham, leeds, liverpool, bristol, glasgow, brighton

**Combo (3):** electrician-jobs-in-london, builder-jobs-in-manchester, dryliner-jobs-in-london

### Fișiere cheie

| Fișier | Rol |
|--------|-----|
| `utils/seo.js` | Meta, schema, sitemap, robots, breadcrumbs |
| `utils/seoLandings.js` | Config landing pages trade/oraș/combo |
| `utils/publicJobs.js` | Mapare joburi, JobPosting schema |
| `utils/publicCompanies.js` | Slug companii, Organization schema |
| `views/partials/seo-head.ejs` | Meta tags, OG, Twitter, JSON-LD |
| `views/jobs/list.ejs` | Listă + search + browse |
| `views/companies/profile.ejs` | Profil companie public SEO |
| `views/legal/about.ejs`, `how-it-works.ejs` | Pagini conținut |
| `public/images/og-default.png` | Imagine social 1200×630 |
| `backend/.../companies/routes.js` | `GET /api/companies/public/index` |

---

## Comparație cu SEOplan.md

| Item plan | Status |
|-----------|--------|
| Meta title/description per pagină | ✅ |
| Canonical URLs | ✅ |
| robots.txt + sitemap.xml dinamic | ✅ |
| Schema Organization / WebSite / FAQ | ✅ + SearchAction |
| Schema JobPosting | ✅ îmbunătățit |
| BreadcrumbList | ✅ |
| Pagini `/terms`, `/privacy`, `/contact` | ✅ |
| Pagini publice `/jobs` + search | ✅ |
| OG image optimizată | ✅ |
| Landing pages trade/oraș | ✅ (set fix) |
| Profiluri companii publice | ✅ |
| `/about`, `/how-it-works` | ✅ |
| Blog / ghiduri | ❌ Faza 3 |
| Core Web Vitals audit | ❌ Faza 3 |
| Slug-uri în DB | ❌ opțional |

---

## Recomandări — Faza 3 (următorii pași)

### Imediat (manual, post-deploy)

1. **Deploy** pe VPS: `git pull && pm2 restart sitecrew-api sitecrew-web`
2. **Google Search Console** — verificare domeniu + submit `https://sitecrew.uk/sitemap.xml`
3. **Verificare live** — 5 URL-uri: `/jobs/electrician`, `/about`, `/companies/{slug}`, `/jobs?q=builder`, `sitemap.xml`
4. **Rich Results Test** — homepage (FAQ), job detail (JobPosting), company (Organization)

### 1–3 luni

1. **Extindere landings** — mai multe combo trade × oraș (programatic sau config)
2. **Carousel homepage** — companii reale din API în loc de conținut static
3. **Blog / ghiduri** — „CSCS card guide”, „UK construction day rates 2026”
4. **Lighthouse audit** — LCP hero, CLS carousel, font loading
5. **Monitorizare GSC** — coverage, queries, click-through pe landings

### 3–6 luni

1. Link building (directoare construcții UK, parteneriate trade bodies)
2. A/B test meta titles pe landing pages cu trafic
3. Slug-uri job în URL (`/jobs/dryliner-manchester-5`)
4. Pagină 404 custom cu linkuri către `/jobs` și landings populare

---

## Keywords țintă — acoperire actuală

| Keyword cluster | Pagină dedicată | Status |
|-----------------|-----------------|--------|
| construction jobs uk | `/jobs` | ✅ |
| electrician jobs uk | `/jobs/electrician` | ✅ |
| construction jobs london | `/jobs/london` | ✅ |
| electrician jobs london | `/jobs/electrician-jobs-in-london` | ✅ |
| dryliner jobs manchester | `/jobs/dryliner` + filtru manual | Parțial |
| hire tradespeople uk | `/`, `/about` | Parțial |
| {company name} jobs | `/companies/{slug}` | ✅ (per companie) |
| CSCS card guide | — | ❌ Faza 3 |

---

## Checklist monitorizare lunară

- [ ] Google Search Console — erori indexare, coverage, queries noi
- [ ] Număr URL-uri în sitemap vs joburi + companii reale
- [ ] Poziții pentru 10–20 keywords țintă (inclusiv landings)
- [ ] Core Web Vitals pe homepage, `/jobs`, `/jobs/electrician`
- [ ] Rich results: FAQ, JobPosting, Organization
- [ ] Redirect www → non-www funcțional
- [ ] OG preview pe LinkedIn/Facebook (Sharing Debugger)
- [ ] Companii noi verificate apar în sitemap

---

## Concluzie

Între evaluarea inițială și actualizarea din 4 iulie 2026, SiteCrew a crescut de la **~58/100 la ~72/100** în pregătirea SEO. Platforma are acum:

- **Suprafață indexabilă reală** — nu doar homepage + câteva joburi
- **Long-tail programatic** — trade, oraș, combo
- **Entități companie** indexabile pentru brand + hiring queries
- **Schema completă** — breadcrumbs, search, ratings unde e cazul

**Limitarea principală rămasă** nu mai e tehnică, ci de **volum și autoritate**: blog, backlinks, performanță, și indexare efectivă în Google (necesită timp + GSC).

**Prioritatea #1 acum:** deploy + Google Search Console + monitorizare indexării landings și profiluri companii.

**Prioritatea #2:** Faza 3 — conținut editorial (ghiduri) și audit performanță.

---

*Raport actualizat pe baza codebase-ului SiteCrew (commits `0d509bc`, `0167009`). Verificări live recomandate după deploy pe https://sitecrew.uk.*
