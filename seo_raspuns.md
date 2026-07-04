# SiteCrew — Răspunsuri tehnice SEO (Code Review)

**Platformă:** Express 5 + EJS (SSR) + API intern (port 4000)  
**Domeniu:** https://sitecrew.uk  
**Data:** 4 iulie 2026  
**Fișiere cheie:** `server.js`, `utils/seo.js`, `utils/seoLandings.js`, `utils/publicJobs.js`, `utils/publicCompanies.js`, `views/partials/seo-head.ejs`

---

## Modulul 1: Infrastructură, Routing & Sitemap

### 1. Logica Sitemap-ului (`/sitemap.xml`)

**Răspuns scurt:** Nu folosim librărie (`sitemap`, `fast-xml-parser` etc.). XML-ul este construit **manual ca string** în `utils/seo.js` → `renderSitemapXml()`, apoi servit din `server.js`.

**Flow:**

```javascript
// server.js
app.get('/sitemap.xml', async (req, res) => {
  let extraUrls = [];
  try {
    const [jobs, companies] = await Promise.all([
      fetchAllPublicOpenJobs(),
      fetchPublicCompanyIndex(),
    ]);

    extraUrls = [
      ...getAllLandingPaths().map((path) => ({ path, changefreq: 'weekly', priority: '0.75' })),
      ...getBlogSitemapEntries(),
      ...jobs.map((job) => ({
        path: job.url,
        changefreq: 'weekly',
        priority: '0.7',
        lastmod: job.closesAt || job.createdAt,
      })),
      ...companies.map((company) => ({
        path: `/companies/${company.slug}`,
        changefreq: 'weekly',
        priority: company.open_job_count > 0 ? '0.65' : '0.5',
        lastmod: company.updated_at,
      })),
    ];
  } catch (error) {
    // Păstrează doar paginile statice dacă API-ul e down
  }

  res.type('application/xml');
  res.send(renderSitemapXml(extraUrls));
});
```

**Generare XML + escape entități:**

```javascript
// utils/seo.js
function escapeXml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function renderSitemapXml(extraUrls = []) {
  const entries = [...SITEMAP_PAGES, ...extraUrls];
  const urls = entries.map((entry) => {
    const loc = escapeXml(absoluteUrl(entry.path));
    const lastmod = formatSitemapLastmod(entry.lastmod || defaultLastmod);
    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${entry.changefreq}</changefreq>`,
      `    <priority>${entry.priority}</priority>`,
      '  </url>',
    ].join('\n');
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="...">\n${urls}\n</urlset>`;
}
```

**Note code review:**
- `&` din query strings (ex. `/login?mode=register&role=worker`) este escapat corect la `&amp;` în `<loc>`.
- Nu folosim stream — pentru ~150–200 URL-uri, string concatenation e suficient.
- `lastmod` per entry: joburi (`created_at` / `closes_at`), companii (`updated_at`), restul = data curentă.

---

### 2. Generarea URL-urilor de Landing (trade / oraș / combo)

**Răspuns scurt:** **Array fix în cod** (`utils/seoLandings.js`), **nu** interogare DB la fiecare request. Combo-urile trade×oraș sunt **generate programatic** la startup din `TRADE_LANDINGS` × `CITY_LANDINGS`.

```javascript
// utils/seoLandings.js
const TRADE_LANDINGS = { electrician: { label: 'Electrician', filter: 'Electrician', intro: '...' }, /* 8 trades */ };
const CITY_LANDINGS = { london: { label: 'London', filter: 'London', intro: '...' }, /* 14 orașe */ };

function buildComboLandings() {
  const combos = {};
  Object.entries(TRADE_LANDINGS).forEach(([tradeSlug, trade]) => {
    Object.entries(CITY_LANDINGS).forEach(([citySlug, city]) => {
      combos[`${tradeSlug}-jobs-in-${citySlug}`] = {
        label: `${trade.label} jobs in ${city.label}`,
        tradeFilter: trade.filter,
        cityFilter: city.filter,
        intro: buildComboIntro(trade, city),
      };
    });
  });
  return combos;
}
```

**La request** (`GET /jobs/:segment`):

```javascript
// server.js
const landing = resolveJobLandingSlug(segment);
if (!landing) {
  return renderLandingNotFound(res, segment);  // 404 util, noindex
}
return renderPublicJobsPage(req, res, {
  landing: { ...landing, slug: segment },
  filters: getLandingFilters(landing),
});
```

**Datele joburilor** de pe landing sunt filtrate live din API:

```javascript
// server.js → fetchFilteredPublicJobs()
const params = new URLSearchParams({ status: 'open' });
if (trade) params.set('trade', trade);  // ILIKE %trade% în backend
if (city) params.set('city', city);
const response = await fetch(`${API_INTERNAL_URL}/api/jobs?${params}`);
```

| Scenariu | HTTP | Comportament |
|----------|------|--------------|
| `/jobs/electrician-jobs-in-london` (slug valid) | **200** | Landing + joburi filtrate din API |
| `/jobs/plumber-inexistent-oras` (slug invalid) | **404** | Pagină utilă `landing-not-found`, `noindex` |
| `/jobs/99999` (job inexistent) | **404** | Pagină custom `errors/job-not-found.ejs` |

**Gap identificat:** landing-uri invalide ar putea returna **404** în loc de redirect, pentru a evita indexarea unui redirect soft către `/jobs`.

---

### 3. Redirect WWW (Express Middleware)

```javascript
// server.js — primul middleware după app setup
function getRequestHost(req) {
  const forwarded = req.headers['x-forwarded-host'] || req.headers.host || '';
  return String(forwarded).split(',')[0].trim().split(':')[0].toLowerCase();
}

app.use((req, res, next) => {
  if (getRequestHost(req) === 'www.sitecrew.uk') {
    return res.redirect(301, `https://sitecrew.uk${req.originalUrl}`);
  }
  return next();
});
```

**Note:**
- `trust proxy` este activ (`app.set('trust proxy', 1)`) — citește `X-Forwarded-Host` de la nginx.
- Nginx din repo (`deploy/nginx/sitecrew.uk.conf`) are și el `return 301` pentru `www` — dublă protecție.
- `req.originalUrl` păstrează query string-ul la redirect.

---

### 4. Tratarea joburilor expirate / închise / șterse

**Lanțul de decizie:**

```javascript
// backend/src/utils/jobVisibility.js
function isWorkerApplyableJob(job) {
  if (!job || job.status !== 'open') return false;
  return ['visible', 'flagged'].includes(job.moderation_status || 'visible');
}
```

```javascript
// server.js
async function fetchPublicJobById(jobId) {
  const response = await fetch(`${API_INTERNAL_URL}/api/jobs/${jobId}`);
  const job = (await response.json()).job;
  if (!job || !isWorkerApplyableJob(job)) return null;  // closed / hidden → null
  return mapPublicJobDetail(job);
}

function renderJobNotFound(res, jobId) {
  return res.status(404).render('errors/job-not-found', {
    seo: buildSeo({
      path: `/jobs/${jobId}`,
      robots: 'noindex, follow',  // nu indexăm joburi moarte
    }),
    popularLandings: getPopularLandingLinks(),
    // ... linkuri către landings
  });
}
```

| Stare job | `/jobs/:slug` | HTTP |
|-----------|---------------|------|
| Open + visible | Pagină detaliu | **200** |
| Closed (`status=closed`) | `fetchPublicJobById` → null | **404** + pagină utilă |
| Șters / ID invalid | null | **404** |
| Slug numeric vechi `/jobs/5` | Redirect 301 → `/jobs/electrician-london-5` | **301** |

**Nu există** pagină „Acest job a expirat” cu status 200 — jobul închis este tratat identic cu unul inexistent (404).

**`closes_at`:** la `PATCH` job cu `status=closed`, DB setează `closes_at = CURRENT_TIMESTAMP`. Folosit în `JobPosting.validThrough`.

---

## Modulul 2: Frontend & Meta Tags (`seo-head.ejs`)

### 5. Structura `<head>` — canonical, lang, robots

**Randare dinamică** via partial `views/partials/seo-head.ejs`, inclus din `header.ejs`:

```ejs
<% const seoConfig = typeof seo !== 'undefined' && seo ? seo : null; %>
<% const canonicalUrl = seoConfig?.canonical || ''; %>
<% const robots = seoConfig?.robots || 'index, follow'; %>

<title><%= seoConfig?.title || ... %></title>
<meta name="description" content="<%= pageDescription %>">
<meta name="robots" content="<%= robots %>">
<% if (canonicalUrl) { %>
<link rel="canonical" href="<%= canonicalUrl %>">
<% } %>
```

**Canonical — fără parametri UTM:**

Canonical-ul **nu** vine din `req.url`. Este construit explicit în `buildSeo()`:

```javascript
// utils/seo.js
function buildSeo(overrides = {}) {
  const path = overrides.path || '/';
  return {
    canonical: overrides.canonical || absoluteUrl(path),
    // ...
  };
}
```

Pentru `/jobs` cu filtre, path-ul e construit controlat:

```javascript
// server.js
function buildJobsListPath(filters = {}) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.trade) params.set('trade', filters.trade);
  if (filters.city) params.set('city', filters.city);
  return query ? `/jobs?${query}` : '/jobs';
}
```

| Vizită | Canonical |
|--------|-----------|
| `/jobs?utm_source=facebook` | `https://sitecrew.uk/jobs` ✅ |
| `/jobs?trade=Electrician&utm_campaign=x` | `https://sitecrew.uk/jobs?trade=Electrician` ✅ |
| `/jobs/electrician` (landing) | `https://sitecrew.uk/jobs/electrician` ✅ |

**`lang` pe `<html>`:**

```html
<!-- views/partials/header.ejs -->
<html lang="en-GB">
```

- Aliniat cu `inLanguage: 'en-GB'` din JSON-LD.

---

### 6. Logica `noindex`

**Mecanism:** proprietatea `robots` din obiectul `seo` transmis la `buildSeo()`:

```javascript
// Exemple din server.js
buildSeo({ path: '/login', robots: 'noindex, follow' });           // sign-in
buildSeo({ path: '/forgot-password', robots: 'noindex, nofollow' });
buildSeo({ path: '/jobs/999', robots: 'noindex, follow' });          // 404 job
buildSeo({ path: companyPath, robots: company.verified ? 'index, follow' : 'noindex, follow' });
```

**Rute sensibile:**

| Rută | Mecanism | robots |
|------|----------|--------|
| `/login` (sign-in) | `seo-head.ejs` via `buildLoginSeo()` | `noindex, follow` |
| `/forgot-password` | `seo-head.ejs` | `noindex, nofollow` |
| `/reset-password` | `seo-head.ejs` | `noindex, nofollow` |
| `/auth/restore` | **Hardcodat** în `restore.ejs` (nu trece prin `seo-head`) | `noindex, nofollow` |
| `/admin/*` | Nu e în sitemap; dashboard fără SEO head public | — |

```html
<!-- views/auth/restore.ejs — bypass seo-head -->
<meta name="robots" content="noindex, nofollow">
```

---

## Modulul 3: Structura de Date & Schema.org

### 7. Schema `JobPosting` (`utils/publicJobs.js`)

```javascript
function getJobPostingSchema(job, canonicalUrl) {
  const rateValue = parseRateNumericValue(job.rate);  // "£200/day" → 200

  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.created_at,
    validThrough: getJobValidThrough(job),  // closes_at SAU created_at + 30 zile
    identifier: {
      '@type': 'PropertyValue',
      name: 'SiteCrew',
      value: `sitecrew-job-${job.id}`,
    },
    industry: 'Construction',
    occupationalCategory: job.trade || job.trade_required,
    employmentType: 'CONTRACTOR',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company_name || 'SiteCrew company',
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.city || 'United Kingdom',
        addressCountry: 'GB',
      },
    },
    baseSalary: rateValue ? {
      '@type': 'MonetaryAmount',
      currency: 'GBP',
      value: {
        '@type': 'QuantitativeValue',
        value: rateValue,      // NUMĂR, ex. 200
        unitText: 'DAY',
      },
    } : undefined,
    directApply: true,
    url: canonicalUrl,
  };
}
```

**`hiringOrganization` dacă compania își ascunde numele:**

**Nu există** în codebase opțiunea „hide company name”. `company_name` vine mereu din JOIN la postare. Fallback: `'SiteCrew company'`.

**`baseSalary.value`:** primul număr parsat din string-ul ratei:

```javascript
function parseRateNumericValue(rate) {
  const match = String(rate || '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : undefined;
}
// "£200/day" → 200 | "Rate negotiable" → undefined (baseSalary omis)
```

---

### 8. Schema `Organization` pe profil companie

```javascript
// utils/publicCompanies.js
function getCompanyOrganizationSchema(company, canonicalUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.name,
    url: canonicalUrl,
    description: company.description,
    logo: company.logo || undefined,
    address: company.city ? {
      '@type': 'PostalAddress',
      addressLocality: company.city,
      addressCountry: 'GB',
    } : undefined,
    aggregateRating: company.ratingCount ? {
      '@type': 'AggregateRating',
      ratingValue: company.ratingAverage,
      reviewCount: company.ratingCount,
    } : undefined,  // OMIS dacă ratingCount === 0
  };
}
```

**`AggregateRating`:** inclus **doar** dacă `ratingCount > 0`. Fără recenzii → proprietatea lipsește complet (nu trimitem `0` sau rating fals).

**Review individual** (max 10):

```javascript
function getCompanyReviewSchemas(reviews, companyName) {
  return reviews
    .filter((review) => review.rating && (review.feedback || review.workerName))
    .slice(0, 10)
    .map((review) => ({
      '@type': 'Review',
      itemReviewed: { '@type': 'Organization', name: companyName },
      author: { '@type': 'Person', name: review.workerName },
      reviewRating: { '@type': 'Rating', ratingValue: review.rating, bestRating: 5, worstRating: 1 },
      reviewBody: review.feedback || undefined,
    }));
}
```

---

### 9. Breadcrumbs (`BreadcrumbList`)

```javascript
// utils/seo.js
function getBreadcrumbSchema(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,           // 1-based, secvențial
      name: item.name,
      item: absoluteUrl(item.path),  // URL absolut
    })),
  };
}
```

**Exemplu pe pagină job:**

```javascript
getBreadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'Jobs', path: '/jobs' },
  { name: job.title, path: job.url },  // poziția 3
])
```

Da — poziții absolute 1, 2, 3. Nu sar peste niveluri.

---

## Modulul 4: Performanță & Asset Loading

### 10. CSS / JS / Fonts

```html
<!-- views/partials/header.ejs -->
<link rel="preload" href="/css/style.css" as="style">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.6/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.css" rel="stylesheet">
<link href="/css/style.css" rel="stylesheet">
```

```html
<!-- views/partials/footer.ejs -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.6/dist/js/bootstrap.bundle.min.js" defer></script>
<script src="/js/company-carousel.js" defer></script>
```

| Resursă | Strategie |
|---------|-----------|
| `/css/style.css` | `rel="preload"` + `<link rel="stylesheet">` |
| `/vendor/bootstrap.min.css` | `rel="preload"` + `<link rel="stylesheet">` (self-hosted) |
| Google Fonts | `preconnect` + `display=swap` în URL |
| Bootstrap JS | `defer` la final de `<body>` (CDN) |
| GA / cookie script | În `<head>` (async via gtag) |

**Status:** Bootstrap CSS este self-hosted în `public/vendor/` — elimină dependența de cache CDN cross-site și permite preload local.

---

### 11. Imagini — lazy loading

```html
<!-- views/companies/profile.ejs -->
<img src="<%= company.logo %>" loading="lazy" decoding="async" width="84" height="84">

<!-- views/index.ejs — carousel companii -->
<img src="<%= company.logo %>" loading="lazy" decoding="async" width="48" height="48">

<!-- views/companies/index.ejs — listă -->
<img src="<%= company.logo %>" loading="lazy" decoding="async" width="64" height="64">
```

- **Da**, folosim `loading="lazy"` nativ pe logo-uri companii.
- Cardurile job de pe homepage/listă **nu au imagini** — doar CSS themes.
- Hero homepage = CSS gradients, fără `<img>` LCP greu.

---

## Modulul 5: Edge Cases, Securitate & Randare

### 12. SSR vs. hidratare client-side

**Pagini publice SEO = 100% SSR.**

```javascript
// server.js — exemplu /jobs
const jobs = await fetchFilteredPublicJobs(filters);
return res.render('jobs/list', { seo, jobs, page, filters });
```

| Pagină | Randare | Conținut la primul byte |
|--------|---------|-------------------------|
| `/`, `/jobs`, `/jobs/:slug`, landings | SSR EJS | HTML complet cu joburi |
| `/companies/:slug` (anonim) | SSR EJS | Profil + joburi + recenzii |
| `/blog/:slug` | SSR EJS | Articol complet din JSON |
| `/worker/dashboard`, `/company/dashboard` | SSR shell + **client JS** | Dashboard interactiv (noindex de facto) |

**Bots pe pagini publice** văd HTML complet — **fără** skeleton/loader. Nu depindem de `fetch()` post-load pentru conținutul principal SEO.

---

### 13. Securitate date vs. leak-uri în JSON-LD

**HTML vizibil (profil public anonim):** `views/companies/profile.ejs` — **nu** afișează email/telefon.

**API:**

```javascript
// backend/src/modules/companies/routes.js
function sanitizeCompanyProfileForRequest(profile, req) {
  if (req.headers.authorization) return profile;
  const { email, phone, ...publicProfile } = profile;
  return publicProfile;
}
```

**JSON-LD** pe `/companies/:slug` (anonim):

```javascript
getCompanyOrganizationSchema(company, canonicalUrl)
// Conține DOAR: name, url, description, logo, address (city), aggregateRating
// NU conține: email, telephone, phone
```

**Verificat:** `getCompanyOrganizationSchema` și `getCompanyReviewSchemas` **nu injectează** email/telefon. Scrapers care citesc `<script type="application/ld+json">` nu obțin PII din schema companie.

**Atenție:** `hiringOrganization.name` pe `JobPosting` expune **numele companiei** — comportament intenționat pentru Google Jobs.

---

### 14. Trailing slashes (`/jobs` vs `/jobs/`)

**Implementat** în `server.js` (imediat după redirect-ul www):

```javascript
app.use((req, res, next) => {
  if (req.path.length > 1 && req.path.endsWith('/')) {
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    return res.redirect(301, `${req.path.slice(0, -1)}${query}`);
  }
  return next();
});
```

---

### 15. Atribute `rel` pe linkuri externe

**Situație actuală:**

```html
<!-- views/companies/profile.ejs — website companie -->
<a href="<%= company.website %>" rel="noopener noreferrer nofollow ugc" target="_blank"><%= company.website %></a>
```

| Tip link | rel actual | Recomandat SEO |
|----------|------------|----------------|
| Website companie (UGC) | `noopener noreferrer nofollow ugc` | ✅ |
| reCAPTCHA / Google policies | `noopener noreferrer` | OK |
| Descrieri job (text liber) | Nu sunt randate ca `<a>` auto-link | N/A |

**Fix aplicat** pe linkurile website din profiluri companii (`nofollow` + `ugc`).

---

### 16. Headere `Cache-Control`

**Implementat** în `server.js` via `setPublicHtmlCache()`:

```javascript
// Landing pages + job detail + listă joburi
res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');

// Sitemap
res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
```

**Excepție existentă (admin API):**

```javascript
// backend/src/modules/admin/routes.js (doar admin API)
res.set('Cache-Control', 'private, max-age=60');
```

**Sitemap** (în ruta `/sitemap.xml`):

```javascript
res.type('application/xml');
res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
res.send(renderSitemapXml(extraUrls));
```

**Notă termen lung (sitemap >1000 URL-uri):** generarea sincronă la fiecare request va bloca Event Loop-ul — mută generarea într-un worker care scrie un fișier `.xml` static la 12–24h.

---

## Rezumat gaps & recomandări

| # | Subiect | Status | Acțiune recomandată |
|---|---------|--------|---------------------|
| 1 | Sitemap manual + escape XML | ✅ OK | — |
| 2 | Landing invalid → 404 util | ✅ OK | — |
| 3 | WWW redirect | ✅ OK | — |
| 4 | Job expirat → 404 custom | ✅ OK | — |
| 5 | Canonical fără UTM | ✅ OK | — |
| 6 | `lang="en-GB"` aliniat JSON-LD | ✅ OK | — |
| 7 | noindex rute sensibile | ✅ OK | — |
| 8 | JobPosting schema | ✅ OK | Hide company name = N/A încă |
| 9 | AggregateRating condiționat | ✅ OK | — |
| 10 | Breadcrumbs 1-based | ✅ OK | — |
| 11 | preload + self-host Bootstrap CSS | ✅ OK | — |
| 12 | lazy-load logo-uri | ✅ OK | — |
| 13 | SSR pagini publice | ✅ OK | — |
| 14 | JSON-LD fără PII | ✅ OK | — |
| 15 | Trailing slash 301 | ✅ OK | — |
| 16 | rel nofollow/ugc pe UGC | ✅ OK | — |
| 17 | Cache-Control explicit | ✅ OK | Sitemap static worker la scale |

---

*Document generat din codebase SiteCrew (commit `666df97`). Pentru verificări live: https://sitecrew.uk*
