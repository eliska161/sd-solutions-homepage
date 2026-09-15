# Telnyx alphanumeric SMS

Utsending skjer som `SDSolutions` (maks 11 tegn, overstyr med `TELNYX_FROM`). Alphanumeric sender ID er **enveis**: kunden kan ikke svare. Inbound-webhooken er likevel på plass for leveringsstatus, og for svar hvis du senere knytter et norsk SMS-nummer til samme messaging profile.

## URL-er å lime inn i Telnyx

| Felt i Messaging Profile | Verdi |
|---|---|
| Webhook URL | `https://repair.sd-solutions.org/api/webhooks/telnyx` |
| Failover URL | `https://repair.sd-solutions.org/api/webhooks/telnyx/failover` |
| Webhook API version | `2` |

Samme verdier vises under **Innstillinger** i portalen. Telnyx kaller primær URL inntil tre ganger (svar innen 2 sekunder, `2xx`). Feiler den, brukes failover (også inntil tre forsøk).

Alphanumeric failover (annet begrep): hvis et land ikke godtar alfanumerisk avsender, kan Telnyx falle tilbake til et long code på profilen. Det er ikke det samme som webhook failover.

## Mission Control

1. Fullfør **Level 2** account verification.
2. **Messaging → Messaging Profiles → Create**. Navn f.eks. `SD Solutions`.
3. Under profile: **Alphanumeric Sender ID** = `SDSolutions` (eller annen 1–11 tegn med minst én bokstav).
4. **Webhook URL** og **Failover URL** som tabellen over. API v2.
5. Ikke forvent inbound på selve sender-ID-en. Skal kunder kunne svare: kjøp et SMS-nummer, assign det til samme profile.
6. **Account Settings → Keys & Credentials**
   - API v2 key → `TELNYX_API_KEY`
   - Public Key (Ed25519) → `TELNYX_PUBLIC_KEY`
7. Kopier Messaging Profile ID (UUID) → `TELNYX_MESSAGING_PROFILE_ID`

## Fly secrets

```bash
fly secrets set \
  TELNYX_API_KEY="KEY" \
  TELNYX_MESSAGING_PROFILE_ID="PROFILE_UUID" \
  TELNYX_PUBLIC_KEY="PUBLIC_KEY" \
  TELNYX_FROM="SDSolutions" \
  -a sd-solutions-repair
```

Uten API-nøkkel sendes ingen SMS (samme mønster som Resend). Uten public key godtas webhook uten signatursjekk — sett nøkkelen i produksjon.

## Hva appen gjør

- Kundemeldinger (ny ordre, mottatt, venter, klar, ferdig, personalmelding) går på e-post og SMS.
- Hver utgående SMS ber Telnyx poste status til webhook + failover.
- `message.received` matches siste 8 siffer i kundetelefon og skriver meldingen som kundeoppdatering på nyeste sak.
