# SiteCrew — Plan SEO & vizibilitate în motoarele de căutare

> Document de planificare (nu implementare).  
> Domeniu principal: **https://sitecrew.uk**  
> Piață țintă: **UK construction recruitment** (workers + companies)

---

## 1. Situația actuală (audit rapid)

### Ce funcționează deja
- Pagină publică **homepage** (`/`) cu structură clară: hero, „How it works”, joburi, companii, trust, CTA register.
- Titluri H1/H2/H3 prezente pe index.
- Domeniu dedicat + HTTPS (Nginx + Let's Encrypt).
- Conținut orientat spre nișă (construction, trades, UK).
- `admin.sitecrew.uk` / admin login au `noindex` — corect.

### Lacune critice SEO (tehnic)
| Element | Status actual | Impact |
|--------|---------------|--------|
| `meta description` | Lipsește pe homepage și pagini publice | Snippet slab în Google |
| `canonical` | Lipsește | Risc duplicate URL (www vs non-www) |
| Open Graph / Twitter Cards | Lipsesc | Share slab pe social |
| `robots.txt` | Lipsește | Crawl neghidat |
| `sitemap.xml` | Lipsește | Indexare lentă |
| Schema.org (JSON-LD) | Lipsește | Fără rich results |
| `hreflang` | Lipsă (limbi worker în app, nu pe marketing) | OK pentru faza 1 (UK EN) |
| Pagini legale (Terms, Privacy) | Link-uri `#` în footer | Trust + SEO local slab |
| Performanță / Core Web Vitals | Neanalizat formal | Posibil impact ranking |

### Lacune critice SEO (conținut & indexare)
| Problemă | Detaliu |
|----------|---------|
| **Majoritatea paginilor valoroase sunt în spatele login-ului** | `/worker/dashboard`, `/company/dashboard`, profiluri — Google nu le vede |
| **Profil companie** (`/companies/:id`) necesită autentificare worker | Pagini potențial „programmatic SEO” blocate |
| **Joburi pe homepage sunt statice/mock** | Carduri cu `href="#"` — fără pagini reale indexabile |
| **Redirect agresiv de pe `/`** | Utilizatori logați + `sitecrewReturningUser` cookie → redirect la dashboard/login; homepage nu e mereu „landing” pentru toți |
| **Titlu generic** | `Home \| SiteCrew` — nu conține keywords |
| **Statistici hero** (1,200+ workers etc.) | Dacă nu sunt reale, risc E-E-A-T / încredere |

### Concluzie audit
SiteCrew are o **bază vizuală bună** pentru marketing, dar **aproape zero infrastructură SEO** și **foarte puțin conținut public indexabil**. Prioritatea nu e „optimizare fină”, ci **deschiderea unui strat public** + **tehnic SEO de bază**.

---

## 2. Obiective SEO (6–12 luni)

### Obiective principale
1. **Indexarea homepage-ului** pentru queries de tip:
   - `construction jobs UK`
   - `find construction workers UK`
   - `hire tradespeople UK`
   - `electrician jobs Manchester` (long-tail, faza 2)
2. **Trafic organic calificat** → register worker / register company.
3. **Autoritate de brand** pentru „SiteCrew” + nișa construction hiring.

### KPI-uri de urmărit
| KPI | Tool | Țintă inițială (3 luni) |
|-----|------|-------------------------|
| Pagini indexate | Google Search Console | 10–30 pagini publice |
| Impresii organice | GSC | +50% față de baseline |
| Click-uri organice | GSC | +30% |
| CTR mediu homepage | GSC | > 3% |
| Conversii register din organic | GA4 / evenimente | măsurabil, nu neapărat mare la început |
| Core Web Vitals | PageSpeed / GSC | toate „Good” pe homepage |

---

## 3. Strategie pe piloni

```
┌─────────────────────────────────────────────────────────────┐
│  PILON 1: Tehnic SEO (fundament)                            │
│  robots, sitemap, meta, canonical, schema, viteză            │
├─────────────────────────────────────────────────────────────┤
│  PILON 2: Pagini publice indexabile (conținut)               │
│  homepage, jobs, trades, cities, company pages, blog           │
├─────────────────────────────────────────────────────────────┤
│  PILON 3: On-page & keywords (UK construction)               │
│  titluri, H1, copy, internal linking                         │
├─────────────────────────────────────────────────────────────┤
│  PILON 4: Off-page & trust                                   │
│  Google Business, directoare, PR, backlinks                    │
├─────────────────────────────────────────────────────────────┤
│  PILON 5: Măsurare & iterare                                 │
│  GSC, GA4, Search Intent, A/B pe CTA                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Plan de implementare pe faze

### Faza 1 — Fundament tehnic (1–2 săptămâni) · efort mic–mediu

**Scop:** Google poate crawla corect site-ul; homepage arată bine în SERP.

#### 4.1 Meta & social (homepage + login public)
- [ ] `title`: ex. `SiteCrew — Find Construction Jobs & Hire Tradespeople in the UK`
- [ ] `meta description` (150–160 car.): propunere:
  > Connect with verified construction workers and companies across the UK. Post jobs, apply in minutes, and hire tradespeople directly — no agencies.
- [ ] `link rel="canonical"` → `https://sitecrew.uk/`
- [ ] Open Graph: `og:title`, `og:description`, `og:image`, `og:url`, `og:type=website`
- [ ] Twitter Card: `summary_large_image`
- [ ] Imagine OG dedicată (1200×630): logo + mesaj „UK Construction Jobs”

#### 4.2 Fișiere crawl
- [ ] `public/robots.txt`:
  ```
  User-agent: *
  Allow: /
  Disallow: /admin/
  Disallow: /worker/dashboard
  Disallow: /company/dashboard
  Disallow: /api/
  Sitemap: https://sitecrew.uk/sitemap.xml
  ```
- [ ] `sitemap.xml` generat dinamic sau static cu:
  - `/`
  - `/login`
  - (viitoare) `/jobs`, `/about`, `/terms`, `/privacy`

#### 4.3 Schema.org (homepage)
- [ ] `Organization` + `WebSite` + `SearchAction` (dacă există căutare publică)
- [ ] Opțional: `FAQPage` pentru secțiune „How it works”

#### 4.4 Pagini legale (trust)
- [ ] `/terms` — Terms of Service (conținut real, indexabil)
- [ ] `/privacy` — Privacy Policy (GDPR/UK GDPR)
- [ ] `/contact` — formular sau email
- [ ] Actualizare footer: link-uri reale, nu `#`

#### 4.5 Performanță
- [ ] Audit Lighthouse pe `/`
- [ ] Optimizare imagini (WebP, lazy load)
- [ ] `font-display: swap` deja parțial via Google Fonts
- [ ] Verificare LCP pe hero (text + CSS, fără blocaje JS)

**Livrabile Faza 1:** homepage indexabil „by the book”, GSC configurat, sitemap trimis.

---

### Faza 2 — Homepage ca pagină de conversie SEO (2–4 săptămâni)

**Scop:** Indexul nu mai e doar „prezentare”, ci rank-uiește pe keywords head + convertește.

#### 4.6 Rescriere on-page (păstrând designul)
| Zonă | Acțiune |
|------|---------|
| H1 | Păstrează mesajul, adaugă variantă keyword: „Find construction jobs & hire tradespeople in the UK” |
| Hero subtitle | Menționează trades: electrician, builder, dryliner, plumber |
| Secțiune joburi | **Înlocuire mock** cu joburi reale din API (open jobs, limit 6–12) |
| Link „View job” | URL real: `/jobs/{id}` sau `/jobs/{slug}` (pagină publică) |
| Statistici hero | Doar cifre reale din DB sau formulare prudente („Growing UK network”) |
| Secțiune nouă FAQ | 5–8 întrebări: „Is SiteCrew free?”, „What trades?”, „How to apply?” |

#### 4.7 Pagină login/register
- [ ] `title`: `Register — Join SiteCrew as a Worker or Company`
- [ ] `meta description` separată
- [ ] `noindex`? **Nu** — register e funnel important; poate rank-ui pe „construction worker sign up UK”

#### 4.8 Internal linking
- [ ] Header/footer: Jobs → `/jobs` (listă publică, nu `#jobs` anchor)
- [ ] Breadcrumbs pe pagini viitoare
- [ ] CTA-uri consistente: `Join as Worker` / `Join as Company`

**Livrabile Faza 2:** homepage cu conținut dinamic + funnel clar spre register.

---

### Faza 3 — Pagini publice programatice (4–8 săptămâni) · impact mare

**Scop:** Sute/mii de pagini long-tail indexabile fără spam.

#### 4.9 Arhitectură URL propusă
```
/jobs                          → listă joburi deschise (public)
/jobs/{slug}-{id}              → detaliu job (public, read-only)
/companies/{slug}-{id}         → profil companie PUBLIC (fără login)
/trades/{trade-slug}           → „Electrician jobs in the UK”
/trades/{trade-slug}/{city}    → „Electrician jobs in Manchester”
/blog/{slug}                   → articole SEO (opțional faza 4)
```

#### 4.10 Reguli pentru pagini publice
- Job închis → `noindex` sau 301 către listă
- Companie neverificată → `noindex` sau pagină limitată
- Conținut unic per pagină (titlu job, descriere, trade, oraș, rată)
- Canonical pe fiecare pagină

#### 4.11 Modificări backend necesare
- [ ] Endpoint public: `GET /api/jobs/public` (open jobs, fără auth)
- [ ] Rute SSR în `server.js` fără `requireWorkerAuth` pentru `/jobs` și `/companies/:id`
- [ ] Slug generator din titlu + trade + city

#### 4.12 Template SEO per tip pagină
**Job detail — exemplu title:**
`Dryliners Needed in Liverpool — £220/day | SiteCrew`

**Trade + city — exemplu title:**
`Electrician Jobs in Manchester | SiteCrew`

**Meta description job:** primele 155 caractere din descriere + CTA „Apply on SiteCrew”.

#### 4.13 Sitemap extins
- Auto-regenerare la publish job / update companie
- `lastmod` corect
- Prioritate: homepage 1.0, `/jobs` 0.9, job detail 0.8

**Livrabile Faza 3:** motor de pagini long-tail; început de trafic pe „{trade} jobs {city}”.

---

### Faza 4 — Conținut & autoritate (continuu)

#### 4.14 Blog / resurse (opțional dar recomandat)
Subfoldere `/blog` sau `/guides`:
- „How much do electricians earn in the UK? (2026 rates)”
- „CSCS card guide for construction workers”
- „How to hire dryliners for commercial fit-out”

Fiecare articol:
- 800–1500 cuvinte
- Link intern spre `/jobs`, `/trades/...`, register
- Schema `Article`

#### 4.15 Off-page
- [ ] Google Business Profile (dacă există entitate UK)
- [ ] Listări: construction directories, startup directories UK
- [ ] Parteneriate: suppliers (ex. Screwfix-style — aliniat cu marketplace ads)
- [ ] PR local: „platform connects trades with sites in {city}”

#### 4.16 Local SEO (dacă aveți prezență fizică)
- NAP consistent (Name, Address, Phone)
- Pagină `/about` cu adresă UK

---

## 5. Ce NU indexăm (deliberat)

| Rută | Motiv |
|------|-------|
| `/admin/*` | Panou intern |
| `/worker/dashboard`, `/company/dashboard` | SPA-like, personalizat, login |
| `/api/*` | API, nu HTML |
| Mesaje, notificări, setări | Conținut privat |
| Profil worker individual | GDPR + calitate slabă fără consimțământ |

**Notă:** Profil **companie** și **job** pot fi publice cu date limitate (fără date personale worker).

---

## 6. Propuneri concrete pentru pagina index (prioritate imediată)

### 6.1 Head (`views/partials/header.ejs` sau partial SEO dedicat)
```html
<title>SiteCrew — Construction Jobs & Tradespeople Hiring in the UK</title>
<meta name="description" content="Find construction jobs or hire verified tradespeople across the UK. Electricians, builders, dryliners and more. Register free on SiteCrew.">
<link rel="canonical" href="https://sitecrew.uk/">
<meta property="og:title" content="SiteCrew — UK Construction Jobs Platform">
<meta property="og:description" content="Hire tradespeople or find your next site job. Direct. No agencies.">
<meta property="og:url" content="https://sitecrew.uk/">
<meta property="og:image" content="https://sitecrew.uk/images/og-sitecrew.jpg">
<meta name="twitter:card" content="summary_large_image">
```

### 6.2 JSON-LD minimal (homepage)
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "SiteCrew",
  "url": "https://sitecrew.uk/",
  "description": "UK construction recruitment platform connecting workers and companies.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://sitecrew.uk/jobs?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

### 6.3 Conținut — bloc nou sub hero (SEO + conversie)
**H2:** Popular construction trades on SiteCrew  
Listă link-uri: Electrician · Builder · Dryliner · Plumber · Carpenter · Labourer → `/trades/{slug}`

**H2:** Construction jobs by city  
Manchester · Liverpool · Leeds · Birmingham · London → `/trades/all/{city}` sau `/jobs?city=`

### 6.4 Fix-uri rapide pe index actual
- [ ] Înlocuire `href="#"` la job cards cu URL-uri reale
- [ ] `View all jobs` → `/jobs`
- [ ] Footer Terms/Privacy/Contact → pagini reale
- [ ] Adăugare secțiune „About SiteCrew” (2–3 paragrafe text indexabil)

---

## 7. Keywords — hartă inițială (UK)

### Head terms (homepage)
| Keyword | Intenție | Pagină țintă |
|---------|----------|--------------|
| construction jobs uk | Worker | `/` + `/jobs` |
| construction recruitment platform | Mixed | `/` |
| hire construction workers | Company | `/` |
| tradespeople jobs uk | Worker | `/` |

### Mid-tail (pagini dedicate)
| Keyword | Pagină țintă |
|---------|--------------|
| electrician jobs uk | `/trades/electrician` |
| dryliner jobs manchester | `/trades/dryliner/manchester` |
| hire electricians uk | `/trades/electrician` + CTA company |
| construction labourer jobs | `/trades/labourer` |

### Brand
| Keyword | Pagină |
|---------|--------|
| sitecrew | `/` |
| sitecrew uk | `/` |
| sitecrew jobs | `/jobs` |

---

## 8. Tooling & setup obligatoriu

| Tool | Acțiune |
|------|---------|
| **Google Search Console** | Verificare domeniu `sitecrew.uk`, submit sitemap |
| **Google Analytics 4** | Evenimente: `register_worker_click`, `register_company_click`, `job_view_public` |
| **Bing Webmaster Tools** | Sitemap + verificare |
| **PageSpeed Insights** | Baseline homepage |
| **Optional: Ahrefs / Semrush** | Urmărire keywords competiție |

---

## 9. Riscuri & atenționări

1. **Thin content** — pagini trade/city generate fără joburi reale = penalizare. Minim 3–5 joburi sau text util per pagină.
2. **Duplicate content** — același job pe mai multe URL-uri; folosiți canonical.
3. **Statistici false** pe homepage — evitați cifre inventate; folosiți date reale sau wording vag.
4. **Redirect returning user** de pe `/` — utilizatorii umani nu văd homepage; Google da. OK pentru SEO, dar testați cu Googlebot Smartphone.
5. **Multi-language (RO/RU/PL în app)** — SEO marketing rămâne **EN UK** pe site public; `hreflang` doar dacă lansați versiuni locale de marketing.

---

## 10. Roadmap rezumat (timeline)

| Săptămâna | Activitate | Rezultat așteptat |
|-----------|------------|-------------------|
| 1 | Meta, canonical, OG, robots, sitemap, GSC | Homepage „crawlable” corect |
| 2 | Terms, Privacy, Contact, footer real | Trust + pagini indexate suplimentare |
| 3–4 | Homepage: joburi reale, FAQ, schema | CTR mai bun, conținut fresh |
| 5–8 | `/jobs`, `/jobs/{id}`, companii publice | Long-tail indexing începe |
| 9–12 | Pagini `/trades/{trade}/{city}` | Trafic organic pe nișă |
| 12+ | Blog + off-page | Autoritate domeniu |

---

## 11. Prioritate recomandată (dacă resurse limitate)

**Top 5 acțiuni cu cel mai mare ROI:**

1. **Meta title + description + canonical** pe homepage  
2. **`robots.txt` + `sitemap.xml` + Google Search Console**  
3. **Pagină publică `/jobs`** cu joburi reale din DB  
4. **Profil companie public** (fără login obligatoriu)  
5. **Pagini Terms + Privacy** + footer funcțional  

---

## 12. Fișiere codebase de modificat (când trecem la implementare)

| Fișier / zonă | Schimbare SEO |
|---------------|---------------|
| `views/partials/header.ejs` | Meta, OG, canonical, JSON-LD |
| `views/index.ejs` | Copy, joburi dinamice, FAQ, internal links |
| `views/partials/footer.ejs` | Link-uri legale reale |
| `public/robots.txt` | Nou |
| `server.js` | Rute `/jobs`, `/sitemap.xml`, pagini legale |
| `backend/.../jobs/routes.js` | API public jobs (fără auth) |
| `views/company/public-profile.ejs` | Acces public + meta per companie |
| `deploy/nginx/sitecrew.uk.conf` | Verificare www → non-www 301 (deja parțial) |

---

## 13. Următorul pas

După aprobarea acestui plan:
1. Alegem **Faza 1** sau **pachetul Top 5** pentru implementare în cod.
2. Definim **cine scrie** Terms/Privacy (legal).
3. Stabilim dacă **profilul companie** e public complet sau parțial (jobs only).

---

*Document generat pentru SiteCrew — plan SEO strategic, aliniat la structura actuală a proiectului (iunie 2026).*
