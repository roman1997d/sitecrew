# Restart API after Email Control deploy

Frontend (`sitecrew-web`) can update while the API process (`sitecrew-api` on port 4000) still runs old code. That causes:

`/api/admin/email-control/*` → `404 Route not found`

## On the VPS

```bash
cd /var/www/sitecrew
git pull origin main
pm2 restart sitecrew-api sitecrew-web
pm2 save
```

## Verify

```bash
curl -s http://127.0.0.1:4000/api/health/email-control
curl -s https://admin.sitecrew.uk/api/health/email-control
```

Both must return `"mounted": true`.
