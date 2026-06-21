# SiteCrew — Domeniu `sitecrew.uk` pe VPS (Nginx + SSL)

Ghid pas cu pas pentru a expune platforma la **https://sitecrew.uk** și panoul admin la **https://admin.sitecrew.uk**.

## Arhitectură

```
Browser  →  Nginx (80/443)  →  sitecrew-web :3000  (frontend EJS)
                            →  sitecrew-api  :4000  (doar /api/*)
```

| URL | Rol |
|-----|-----|
| `https://sitecrew.uk/` | Site public + worker + company |
| `https://sitecrew.uk/api/...` | API backend |
| `https://admin.sitecrew.uk/` | Admin login (redirect la `/admin/login`) |
| `https://admin.sitecrew.uk/admin/dashboard` | Panou administrare |
| `https://admin.sitecrew.uk/api/...` | API (același backend, same-origin pentru admin) |

Accesul la `/admin/*` pe domeniul principal este redirecționat automat către `admin.sitecrew.uk`.

---

## Pasul 1 — DNS la registrar (unde ai cumpărat domeniul)

Adaugă aceste înregistrări (IP-ul VPS-ului tău: `217.174.245.112`):

| Tip | Nume / Host | Valoare | TTL |
|-----|-------------|---------|-----|
| **A** | `@` | `217.174.245.112` | 300–3600 |
| **A** | `www` | `217.174.245.112` | 300–3600 |
| **A** | `admin` | `217.174.245.112` | 300–3600 |

Verifică propagarea (poate dura 5–60 minute):

```bash
dig +short sitecrew.uk A
dig +short www.sitecrew.uk A
dig +short admin.sitecrew.uk A
```

Toate trebuie să returneze `217.174.245.112`.

---

## Pasul 2 — Instalează Nginx și Certbot pe VPS

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
sudo mkdir -p /var/www/certbot
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## Pasul 3 — Actualizează codul și `.env`

```bash
cd /var/www/sitecrew
git pull origin main
```

### `/var/www/sitecrew/.env` (frontend)

```env
PORT=3000
PUBLIC_URL=https://sitecrew.uk
ADMIN_PUBLIC_URL=https://admin.sitecrew.uk
ADMIN_HOST=admin.sitecrew.uk
API_BASE_URL=https://sitecrew.uk
API_INTERNAL_URL=http://127.0.0.1:4000
```

### `/var/www/sitecrew/backend/.env` (backend)

Actualizează cel puțin:

```env
FRONTEND_ORIGIN=https://sitecrew.uk,https://admin.sitecrew.uk
```

(`DATABASE_URL`, `JWT_SECRET` etc. rămân neschimbate.)

Repornește aplicațiile:

```bash
pm2 restart sitecrew-web sitecrew-api
pm2 save
```

Test local (trebuie să funcționeze înainte de Nginx):

```bash
curl -s http://127.0.0.1:3000/ | head -5
curl -s http://127.0.0.1:4000/api/health
```

---

## Pasul 4 — Activează config Nginx (HTTP mai întâi)

```bash
sudo cp /var/www/sitecrew/deploy/nginx/sitecrew.uk.http-only.conf \
  /etc/nginx/sites-available/sitecrew.uk

sudo ln -sf /etc/nginx/sites-available/sitecrew.uk /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl reload nginx
```

Test în browser: **http://sitecrew.uk** (fără port, fără HTTPS încă).

---

## Pasul 5 — Certificat SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d sitecrew.uk -d www.sitecrew.uk -d admin.sitecrew.uk
```

- Alege redirect HTTP → HTTPS când întreabă.
- Email pentru reînnoire automată.
- Certbot modifică automat config-ul Nginx.

După succes, înlocuiește cu config-ul final (opțional, dar recomandat):

```bash
sudo cp /var/www/sitecrew/deploy/nginx/sitecrew.uk.conf \
  /etc/nginx/sites-available/sitecrew.uk

sudo nginx -t
sudo systemctl reload nginx
```

Dacă certbot a scris deja SSL în config, poți sări peste copiere — important e ca HTTPS să meargă.

Verifică reînnoirea automată:

```bash
sudo certbot renew --dry-run
```

---

## Pasul 6 — Închide porturile 3000 și 4000 public

După ce Nginx merge, nu mai expune direct aplicațiile:

```bash
sudo ufw delete allow 3000
sudo ufw delete allow 4000
sudo ufw status
```

Ar trebui să rămână deschise doar: **22**, **80**, **443**.

PM2 continuă să asculte pe `127.0.0.1:3000` și `:4000` — doar localhost + Nginx.

---

## Verificare finală

```bash
curl -I https://sitecrew.uk
curl -s https://sitecrew.uk/api/health
curl -s https://sitecrew.uk/__sitecrew/deploy-check
```

În browser:
- https://sitecrew.uk — landing
- https://sitecrew.uk/login — login worker/company
- https://admin.sitecrew.uk — admin login
- https://admin.sitecrew.uk/admin/dashboard — panou admin

---

## Rezolvare probleme

### `502 Bad Gateway`
```bash
pm2 status
pm2 logs sitecrew-web --lines 30
pm2 logs sitecrew-api --lines 30
```

### Login / API „Failed to fetch”
Verifică `.env`:
```bash
grep -E 'PUBLIC_URL|ADMIN_|API_' /var/www/sitecrew/.env
grep FRONTEND_ORIGIN /var/www/sitecrew/backend/.env
```
Trebuie `https://sitecrew.uk` și `https://admin.sitecrew.uk`, nu `localhost` și nu IP cu port.

### Certbot eșuează
- DNS-ul trebuie să pointeze la VPS **înainte** de certbot.
- Portul 80 trebuie deschis: `sudo ufw allow 80`.

### Imagini negre
```bash
cd /var/www/sitecrew/backend && npm run db:fix-media-urls
pm2 restart sitecrew-web
```

---

## Rezumat comenzi (copy-paste rapid)

```bash
# Pe VPS, după ce DNS-ul e propagat:
cd /var/www/sitecrew && git pull origin main

# .env frontend
cat > /var/www/sitecrew/.env <<'EOF'
PORT=3000
PUBLIC_URL=https://sitecrew.uk
ADMIN_PUBLIC_URL=https://admin.sitecrew.uk
ADMIN_HOST=admin.sitecrew.uk
API_BASE_URL=https://sitecrew.uk
API_INTERNAL_URL=http://127.0.0.1:4000
EOF

# .env backend — editează manual dacă nu există:
# FRONTEND_ORIGIN=https://sitecrew.uk,https://admin.sitecrew.uk

pm2 restart sitecrew-web sitecrew-api

sudo apt install -y nginx certbot python3-certbot-nginx
sudo mkdir -p /var/www/certbot
sudo cp /var/www/sitecrew/deploy/nginx/sitecrew.uk.http-only.conf /etc/nginx/sites-available/sitecrew.uk
sudo ln -sf /etc/nginx/sites-available/sitecrew.uk /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d sitecrew.uk -d www.sitecrew.uk
```

---

*IP VPS referință: 217.174.245.112 — actualizează dacă se schimbă.*
