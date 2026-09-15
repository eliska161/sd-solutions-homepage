# 46elks SMS

Utsending skjer som `SDSolutions` (3–11 tegn, A–Z/a–z/0–9). Alphanumeric sender er enveis: kunden kan ikke svare.

Pris er per SMS-del, forskuddsbetalt saldo. Kontoen er i euro. `estimated_cost` 640 = €0,064 per del.

## Fly secrets

```bash
fly secrets set \
  ELKS_API_USERNAME="API_USERNAME" \
  ELKS_API_PASSWORD="API_PASSWORD" \
  ELKS_FROM="SDSolutions" \
  ELKS_WEBHOOK_SECRET="en-lang-tilfeldig-streng" \
  -a sd-solutions-repair
```

API-brukernavn og passord ligger i 46elks-dashboardet. `ELKS_WEBHOOK_SECRET` er valgfritt; hvis satt, krever leverings-webhook `?key=…`.

## Webhook

Leveringsstatus (`sent` / `delivered` / `failed`) postes til:

`https://repair.sd-solutions.org/api/webhooks/elks`

Appen setter `whendelivered` automatisk ved utsending. Du trenger ikke lime inn noe i 46elks-portalen.

Kundemeldinger (ny ordre, mottatt, venter, klar, ferdig, personalmelding) går på e-post og SMS.
