# Raport evaluare SEO — SiteCrew

**Domeniu:** [https://sitecrew.uk](https://sitecrew.uk)  
**Data evaluării:** 4 iulie 2026  
**Tip platformă:** Marketplace B2B/B2C — recrutare construcții UK (workers + companies)

---

## Rezumat executiv

SiteCrew are o **bază tehnică SEO solidă** pentru o platformă early-stage: meta tags dinamice, `robots.txt`, `sitemap.xml`, canonical URLs, Open Graph, Google Analytics și schema.org pe homepage și joburi publice. Infrastructura din `utils/seo.js` și `views/partials/seo-head.ejs` este bine structurată și ușor de extins.

**Punctul slab principal** nu este tehnic, ci **strategic**: majoritatea valorii platformei (feed, profiluri companii, aplicări, mesaje) este în spatele autentificării. Google poate indexa doar ~8 URL-uri publice (homepage, jobs, login, legal, 2 joburi active). Pentru cuvinte cheie competitive („construction jobs UK”, „hire electrician London”) volumul de conținut indexabil este insuficient.

| Categorie | Scor estimat | Comentariu |
|-----------|:------------:|------------|
| SEO tehnic (crawl, indexare, meta) | **78/100** | Bine implementat; mici lacune |
| Conținut & structură on-page | **55/100** | Homepage bună; puține pagini utile |
| Schema.org / rich results | **72/100** | FAQ + JobPosting; lipsesc breadcrumbs |
| Performanță & UX (neauditat CWV) | **~60/100** | CDN externe; fără măsurători formale |
| Autoritate & conținut long-tail | **25/100** | Fără blog, landing pages trade/oraș |
| **Scor general SEO** | **~58/100** | Fundație bună, creștere organică limitată |

---

## Metodologie

Evaluarea combină:

1. **Revizuire cod** — `server.js`, `utils/seo.js`, `utils/publicJobs.js`, template-uri EJS
2. **Verificări live** — homepage, `/jobs`, `/jobs/:id`, `robots.txt`, `sitemap.xml`, meta tags
3. **Comparație cu planul anterior** — `SEOplan.md` (parțial depășit; multe iteme din plan sunt acum implementate)

---

## Ce funcționează bine

### 1. Infrastructură tehnică de bază

| Element | Status | Detalii |
|---------|--------|---------|
| HTTPS | ✅ | Certificat Let's Encrypt (config nginx în `deploy/nginx/sitecrew.uk.conf`) |
| `robots.txt` dinamic | ✅ | `Allow: /` + `Disallow` pentru `/admin/`, dashboard-uri, `/api/` |
| `sitemap.xml` dinamic | ✅ | Pagini statice + joburi deschise din API |
| Canonical URLs | ✅ | Pe toate paginile publice verificate |
| `lang="en"` | ✅ | În `views/partials/header.ejs` |
| Google Analytics | ✅ | `G-RQRV1DW5GG` via `views/partials/google-analytics.ejs` |

### 2. Meta tags și social sharing

Partialul `seo-head.ejs` generează consistent:

- `<title>` și `<meta name="description">`
- `<link rel="canonical">`
- Open Graph (`og:title`, `og:description`, `og:url`, `og:image`)
- Twitter Card (`summary_large_image`)

**Exemple live (4 iulie 2026):**

| Pagină | Title |
|--------|-------|
| `/` | SiteCrew — Find Construction Jobs & Hire Tradespeople in the UK |
| `/jobs` | Construction Jobs in the UK \| SiteCrew |
| `/jobs/5` | Dryliners, Fixers in [locație] \| SiteCrew |

### 3. Date structurate (Schema.org)

**Homepage** — 3 blocuri JSON-LD (`getHomePageJsonLd()`):

- `Organization` — nume, URL, logo, `areaServed: UK`
- `WebSite` — `inLanguage: en-GB`
- `FAQPage` — 5 întrebări frecvente (pot genera rich results în Google)

**Pagini job** — `JobPosting` cu:

- `title`, `description`, `datePosted`
- `hiringOrganization`, `jobLocation` (GB)
- `baseSalary` (GBP, unitText DAY) când există rată
- `directApply: true`, `url` canonical

### 4. Pagini publice indexabile

| URL | În sitemap | SEO notes |
|-----|:-----------:|-----------|
| `/` | ✅ | H1 keyword-rich, joburi featured, FAQ vizibil + schema |
| `/jobs` | ✅ | Listă joburi cu `<h1>`, carduri cu `<h2>` per job |
| `/jobs/:id` | ✅ (dinamic) | H1 = titlu job, descriere completă, CTA apply |
| `/login` | ✅ | Title variabil register/sign in |
| `/terms`, `/privacy`, `/contact` | ✅ | Pagini legale cu meta dedicate |

### 5. Protecție zone private

- `robots.txt` blochează crawl pe dashboard-uri și admin
- `/admin/login` și `/auth/restore` au `noindex, nofollow` hardcodat
- Rutele `/worker/dashboard`, `/company/dashboard`, `/companies/:id` necesită autentificare

### 6. Conținut on-page homepage

- **H1:** „Find construction jobs & hire tradespeople across the UK” — relevant, cu keywords naturale
- Secțiuni: How it works, Featured jobs (din API), FAQ
- Footer cu linkuri interne către `/jobs`, `/contact`, înregistrare
- Statistici dinamice (workers, companies) — social proof pentru utilizatori și crawleri

---

## Probleme identificate

### Critice / înaltă prioritate

#### 1. Conținut indexabil foarte limitat

**Sitemap actual:** 8 URL-uri (6 statice + 2 joburi).

Platforma este în esență o aplicație logată. Profilurile companiilor (`/companies/:id`), feed-ul workerilor și majoritatea joburilor istorice nu sunt accesibile fără cont. Google nu poate construi autoritate pe „hire bricklayers Manchester” sau „electrician jobs Leeds” fără pagini dedicate.

**Impact:** Plafon sever pe trafic organic non-brand.

#### 2. Posibilă duplicare www vs non-www pe producție

Configurația din repo (`deploy/nginx/sitecrew.uk.conf`) definește redirect 301 de la `www.sitecrew.uk` → `sitecrew.uk`. La verificarea din 4 iulie 2026, `https://www.sitecrew.uk/` a returnat **HTTP 200** (nu 301), deși canonical-ul din HTML pointează corect la `https://sitecrew.uk/`.

Canonical mitigă riscul, dar **redirectul 301 lipsește sau nginx de pe server nu e aliniat cu repo-ul**. Recomandat: verificare și aplicare config pe VPS.

#### 3. Imagine Open Graph neoptimizată

`og:image` default = `/android-chrome-512x512.png` (512×512 px, icon).

- Facebook/LinkedIn preferă **1200×630 px**
- Twitter `summary_large_image` cu icon pătrat arată slab în share-uri
- Lipsă `og:image:width`, `og:image:height`, `og:image:alt`

**Impact:** CTR scăzut când linkurile sunt distribuite pe social media.

---

### Medie prioritate

#### 4. `/login` indexat în sitemap (priority 0.8)

Pagina de autentificare are valoare SEO redusă și poate „dilua” crawl budget-ul. Multe site-uri folosesc `noindex` pe login/register și îl exclud din sitemap.

**Alternativă:** Păstrare indexare doar pentru variantele `?mode=register` dacă vrei landing pentru „register construction worker UK”.

#### 5. Linkuri interne problematice

| Locație | Problemă |
|---------|----------|
| Navbar | Link `/worker/dashboard#feed` — necesită login; experiență slabă pentru vizitatori noi și bots |
| Homepage carousel „Companies” | Linkuri `href="#"` pe „Follow company” — dead ends, conținut static fictiv (Apex Construction etc.) |
| `/jobs/:id` inexistent | Redirect 302 → `/jobs` (corect UX, dar fără pagină 404 SEO-friendly) |

#### 6. Schema JobPosting — îmbunătățiri posibile

În `utils/publicJobs.js`:

- `validThrough` folosește `start_date` — semantic incorect (ar trebui data expirării jobului)
- `baseSalary.value` este string brut (ex. „£200/day”) — Google preferă valoare numerică
- Lipsă `identifier`, `occupationalCategory`, `industry`
- Lipsă `BreadcrumbList` (Home → Jobs → Job title)

#### 7. Lipsă `SearchAction` în WebSite schema

Schema `WebSite` nu include:

```json
"potentialAction": {
  "@type": "SearchAction",
  "target": "https://sitecrew.uk/jobs?q={search_term_string}",
  "query-input": "required name=search_term_string"
}
```

Funcționează doar dacă există căutare publică pe `/jobs` (în prezent nu există).

#### 8. Redirect homepage pentru utilizatori recurenți

Cookie `sitecrewReturningUser=1` → redirect la `/login`. **Nu afectează Googlebot** (fără cookie), dar utilizatorii care revin nu văd homepage-ul SEO-optimizat.

#### 9. `robots.txt` incomplet pentru rute auth

Nu sunt excluse explicit: `/forgot-password`, `/reset-password`, `/auth/restore` (restore are noindex în HTML — suficient pentru restore).

---

### Prioritate scăzută / pe termen lung

#### 10. Fără strategie de conținut

- Nu există blog, ghiduri („How to become a CSCS card holder”), sau landing pages pe trade/oraș
- Competitorii (Indeed, Checkatrade, MyJobQuote) au mii de pagini indexabile

#### 11. Performanță (neauditat formal)

Resurse externe pe fiecare pagină:

- Google Fonts (Inter)
- Bootstrap 5.3.6 CSS + JS de pe jsDelivr
- Bootstrap Icons

`preconnect` pentru fonts există, dar lipsesc:

- Audit Lighthouse / Core Web Vitals
- Lazy-load imagini
- Self-hosting fonturi (opțional)
- Compresie imagini hero/carousel

#### 12. Alte elemente lipsă

| Element | Status |
|---------|--------|
| `hreflang` | N/A — doar UK/en-GB |
| Pagină `/about` | ❌ |
| Google Search Console verificare | Neconfirmat în cod |
| `security.txt` / trust signals | ❌ |
| Review/rating schema | ❌ (normal pentru platformă nouă) |

---

## Inventar tehnic detaliat

### robots.txt (live)

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /worker/dashboard
Disallow: /company/dashboard
Disallow: /api/

Sitemap: https://sitecrew.uk/sitemap.xml
```

### Sitemap (live, 4 iulie 2026)

```
https://sitecrew.uk/
https://sitecrew.uk/jobs
https://sitecrew.uk/login
https://sitecrew.uk/terms
https://sitecrew.uk/privacy
https://sitecrew.uk/contact
https://sitecrew.uk/jobs/5
https://sitecrew.uk/jobs/3
```

### Fișiere cheie în codebase

| Fișier | Rol SEO |
|--------|---------|
| `utils/seo.js` | `buildSeo`, schema homepage, sitemap, robots |
| `views/partials/seo-head.ejs` | Meta tags, OG, Twitter, JSON-LD |
| `utils/publicJobs.js` | Mapare joburi publice + `JobPosting` schema |
| `server.js` | Rute `/robots.txt`, `/sitemap.xml`, pagini publice |
| `views/index.ejs` | Homepage on-page |
| `views/jobs/list.ejs`, `detail.ejs` | Pagini job indexabile |

---

## Comparație cu SEOplan.md

Documentul `SEOplan.md` din repo descria un plan inițial. **Multe iteme sunt acum implementate:**

| Item plan vechi | Status actual |
|-----------------|---------------|
| Meta title/description per pagină | ✅ Implementat |
| Canonical URLs | ✅ |
| robots.txt + sitemap.xml | ✅ Dinamic |
| Schema Organization / WebSite / FAQ | ✅ Homepage |
| Schema JobPosting | ✅ `/jobs/:id` |
| Pagini `/terms`, `/privacy` | ✅ + `/contact` |
| Pagini publice `/jobs` | ✅ |
| OG tags | ✅ (imagine slabă) |
| Blog / landing pages trade | ❌ Încă lipsesc |
| Profiluri companii publice | ❌ În spatele auth |
| Core Web Vitals audit | ❌ Neefectuat |

---

## Recomandări prioritizate

### Faza 1 — Quick wins (1–2 săptămâni)

1. **Fix redirect www → non-www** pe serverul de producție (verificare `nginx -t` + reload)
2. **Creare `public/images/og-default.jpg`** (1200×630) și setare în `buildSeo()` ca `ogImage` default
3. **`noindex` pe `/login`** (opțional: păstrare index doar pe query `register`) + scoatere din sitemap sau priority 0.3
4. **Înlocuire linkuri `href="#"`** din carousel cu linkuri reale sau eliminare secțiune statică
5. **Navbar:** schimbare „Feed” → `/jobs` sau ascundere pentru utilizatori neautentificați
6. **Înregistrare Google Search Console** + trimitere sitemap
7. **Corectare `validThrough`** în JobPosting (folosește `closes_at` sau +30 zile de la `created_at`)

### Faza 2 — Creștere conținut (1–3 luni)

1. **Profiluri companii publice** (minim: nume, oraș, joburi deschise, fără date sensibile) — `/companies/:slug`
2. **Landing pages programatice:** `/jobs/electrician`, `/jobs/london`, `/jobs/manchester` (filtru pe trade/locație, conținut unic intro)
3. **Pagină About** + eventual `/how-it-works` dedicată (nu doar anchor pe homepage)
4. **Căutare publică pe `/jobs`** + `SearchAction` schema
5. **BreadcrumbList** pe pagini job și listă

### Faza 3 — Autoritate & performanță (3–6 luni)

1. Blog/ghiduri SEO („CSCS card guide”, „Day rate guide UK trades 2026”)
2. Audit Lighthouse; optimizare LCP (hero), CLS (carousel)
3. Link building: directoare construcții UK, parteneriate CSCS/trade bodies
4. Monitorizare poziții pentru 20–30 keywords țintă
5. A/B test meta titles pe `/jobs` listing

---

## Keywords țintă sugerate

### Brand (probabil deja ok)

- sitecrew, sitecrew uk, site crew

### Head terms (competitiv, necesită conținut)

- construction jobs uk
- construction jobs near me
- hire tradespeople uk
- find construction workers

### Long-tail (oportunitate cu landing pages)

- electrician jobs london
- dryliner jobs manchester
- bricklayer day rate uk
- construction labourer jobs birmingham
- hire carpenter for site work

---

## Checklist monitorizare lunară

- [ ] Google Search Console — erori indexare, coverage
- [ ] Număr URL-uri în sitemap vs joburi deschise reale
- [ ] Poziții pentru 10 keywords țintă
- [ ] Core Web Vitals (LCP, INP, CLS) pe homepage și `/jobs`
- [ ] Verificare rich results (FAQ, JobPosting) în [Google Rich Results Test](https://search.google.com/test/rich-results)
- [ ] Backlinks noi (Ahrefs / GSC Links)
- [ ] Canonical și redirect www încă funcționale

---

## Concluzie

SiteCrew este **bine pregătit din punct de vedere tehnic** pentru o platformă la început de drum. Implementarea centralizată în `utils/seo.js` permite extinderi rapide. **Limitarea principală** este lipsa unei „arii publice” suficient de mari: fără pagini pe trade, oraș sau companii, competiția cu job board-uri mature va fi dificilă pe termen scurt.

**Prioritatea #1 pentru creștere organică:** extinderea suprafeței indexabile (joburi + landing pages + profiluri companii publice), nu refinări minore de meta tags.

**Prioritatea #1 pentru încredere și share-uri:** imagine OG dedicată și fix redirect www.

---

*Raport generat pe baza codebase-ului SiteCrew și verificărilor live pe https://sitecrew.uk (4 iulie 2026).*
