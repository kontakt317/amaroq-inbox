# Amaroq Inbox – Opsætningsvejledning

En webapp der henter og triagerer emails fra dine Amaroq Gmail-konti automatisk med AI.

---

## Hvad du skal bruge

- En GitHub-konto (gratis)
- En Vercel-konto (gratis) → vercel.com
- En Anthropic API-nøgle → console.anthropic.com
- Adgang til Google Cloud Console (du har Google Workspace)

Tid: ca. 45-60 minutter første gang.

---

## Trin 1 – Google OAuth opsætning

1. Gå til https://console.cloud.google.com
2. Opret et nyt projekt → kald det "amaroq-inbox"
3. Gå til **APIs & Services → Library**
4. Søg efter og aktiver: **Gmail API**
5. Gå til **APIs & Services → OAuth consent screen**
   - Vælg **Internal** (du har Google Workspace – dette er vigtigt)
   - Udfyld app-navn: "Amaroq Inbox"
   - Tilføj scopes: `gmail.readonly` og `gmail.compose`
   - Gem
6. Gå til **APIs & Services → Credentials**
   - Klik **Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Navn: "amaroq-inbox"
   - Under **Authorized redirect URIs** tilføj:
     - `http://localhost:3000/api/auth/callback/google` (til lokal test)
     - `https://DIN-VERCEL-URL.vercel.app/api/auth/callback/google` (tilføj senere)
   - Klik Create og **kopiér Client ID og Client Secret**

---

## Trin 2 – Anthropic API-nøgle

1. Gå til https://console.anthropic.com
2. Gå til **API Keys → Create Key**
3. Kopiér nøglen (den vises kun én gang)

---

## Trin 3 – Upload kode til GitHub

1. Gå til https://github.com → opret et nyt privat repository kaldet `amaroq-inbox`
2. Upload alle filerne fra denne mappe til repositoriet
   (eller brug GitHub Desktop / git kommandolinje)

---

## Trin 4 – Deploy på Vercel

1. Gå til https://vercel.com → log ind med GitHub
2. Klik **Add New Project** → vælg dit `amaroq-inbox` repository
3. Klik **Deploy** (Vercel registrerer automatisk at det er Next.js)
4. Når deploy er færdigt, notér din URL (f.eks. `amaroq-inbox.vercel.app`)

---

## Trin 5 – Miljøvariabler på Vercel

1. Gå til dit Vercel-projekt → **Settings → Environment Variables**
2. Tilføj følgende:

| Navn | Værdi |
|------|-------|
| `GOOGLE_CLIENT_ID` | Fra trin 1 |
| `GOOGLE_CLIENT_SECRET` | Fra trin 1 |
| `NEXTAUTH_URL` | `https://din-url.vercel.app` |
| `NEXTAUTH_SECRET` | Kør `openssl rand -base64 32` i terminalen |
| `ANTHROPIC_API_KEY` | Fra trin 2 |

3. Klik **Redeploy** så de nye variabler træder i kraft

---

## Trin 6 – Opdater Google OAuth redirect URI

1. Gå tilbage til Google Cloud Console → Credentials
2. Redigér dit OAuth client ID
3. Tilføj din Vercel-URL under Authorized redirect URIs:
   `https://din-url.vercel.app/api/auth/callback/google`
4. Gem

---

## Trin 7 – Test lokalt (valgfrit)

```bash
# Kopiér miljøvariabler
cp .env.local.example .env.local
# Udfyld værdierne i .env.local

# Installer dependencies
npm install

# Start udviklingsserver
npm run dev
```

Åbn http://localhost:3000

---

## Brug

1. Åbn din Vercel-URL
2. Log ind med din Google Workspace-konto
3. Klik **Opdater** for at hente og analysere emails
4. Klik på en email for at se AI-sammenfatningen
5. Klik **Opret draft-svar** for at generere og gemme et svar direkte i Gmail

---

## Tilføj en ekstra Gmail-konto (.de)

Hvis dine to konti (amaroq-glamping.dk og .de) er i samme Google Workspace, logger du bare ind med den primære konto – appen henter automatisk emails sendt til begge adresser.

Hvis de er i separate Google-konti, skal du tilføje den anden konto som en ekstra OAuth-bruger i Google Cloud Console.


