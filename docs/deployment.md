# Veröffentlichen

Die Website ist statisch (HTML, CSS, JS) und läuft auf jedem Webspace.

## GitHub Pages (eingerichtet)

`.github/workflows/deploy.yml` baut bei jedem Push auf `main` und jede Nacht neu.

Einmalig: *Settings → Pages → Build and deployment → Source: **GitHub Actions***.

Danach ist die Seite unter `https://<user>.github.io/<repo>/` erreichbar. Unterpfad und Adresse erkennt der
Workflow selbst.

**Eigene Domain:** In *Settings → Pages → Custom domain* `tanznetzdresden.de` eintragen und beim Domain-Anbieter die
DNS-Einträge setzen (siehe GitHub-Hilfe). Dann die Actions-Variablen `SITE_URL=https://tanznetzdresden.de` und
`BASE_PATH=/` anlegen.

## Datenschutz-Hinweis zum Hosting

GitHub Pages wird von GitHub Inc. (USA) betrieben. Das ist über das EU-US Data Privacy Framework zulässig, muss aber
in der Datenschutzerklärung stehen. Wer auf Nummer sicher gehen will, hostet in der EU. Das geht ohne Codeänderung:

- **Webspace in Deutschland** (z. B. Uberspace, All-Inkl, Hetzner Webhosting): `npm run build` und den Ordner `dist/`
  hochladen, oder per GitHub Action mit `rsync`/FTP automatisieren.
- **Netlify / Cloudflare Pages / Vercel**: Repository verbinden, Build-Befehl `npm run build`, Ausgabe `dist`.

Den Anbieter dann in `src/content/seiten/datenschutz.md` unter „Hosting“ eintragen.

## Empfohlene Server-Header

Wenn der Hoster es erlaubt (z. B. `_headers` bei Netlify/Cloudflare, `.htaccess` bei Apache):

```
Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co; frame-src https://www.openstreetmap.org https://www.youtube-nocookie.com; font-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

(`/admin/` braucht zusätzlich `https://unpkg.com` und `https://api.github.com`.)
