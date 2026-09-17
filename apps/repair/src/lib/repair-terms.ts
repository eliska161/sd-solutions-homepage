import { workshopAddressOneLine, WORKSHOP } from "@/lib/workshop";

/** Bump when the legal text changes. Signed tickets keep the version they accepted. */
export const REPAIR_TERMS_VERSION = "2026-09-17";

export type RepairTermsSection = {
  title: string;
  paragraphs: string[];
};

export function repairTermsMeta() {
  return {
    version: REPAIR_TERMS_VERSION,
    legalName: "Skaug-Danielsen Solutions",
    brandName: WORKSHOP.name,
    address: workshopAddressOneLine(),
  };
}

/** Forslag til reparasjonsbetingelser. Eier går gjennom teksten før den brukes i drift. */
export function repairTermsSections(): RepairTermsSection[] {
  const { legalName, brandName, address } = repairTermsMeta();
  return [
    {
      title: "1. Avtaleparter",
      paragraphs: [
        `Disse betingelsene gjelder mellom deg som kunde og ${legalName} (merkenavn ${brandName}), ${address}. De gjelder når du oppretter en serviceordre, leverer eller sender inn en enhet, og for arbeid vi utfører på den.`,
      ],
    },
    {
      title: "2. Hva du bestiller",
      paragraphs: [
        "Serviceordren er en bestilling av diagnose og eventuelt reparasjon. Vi tar ikke enheten inn i verkstedet før den er fysisk levert hos oss eller kommet fram i posten.",
        "Endelig pris og omfang avtales etter diagnose, med mindre vi har gitt en fast pris på forhånd. Du godkjenner arbeidet på statussiden eller skriftlig før vi går videre med betalt reparasjon utover avtalt diagnose.",
      ],
    },
    {
      title: "3. Diagnose og funn",
      paragraphs: [
        "Diagnose kan avdekke flere feil enn du beskrev. Vi opplyser om det vi finner, og venter på svar fra deg hvis jobben endrer seg eller prisen øker.",
        "Hvis du takker nei etter diagnose, kan vi ta betalt for diagnose og tid som allerede er brukt. Enheten kan da leveres tilbake uten reparasjon.",
      ],
    },
    {
      title: "4. Pris, deler og betaling",
      paragraphs: [
        "Prisen du ser på statussiden er for tjenestene vi har lagt på saken, minus eventuell rabatt. Deler vi bruker i jobben er inkludert i tjenesteprisen med mindre vi sier noe annet.",
        "Returporto kommer i tillegg hvis du har valgt å få enheten sendt tilbake.",
        "Betaling skjer før utlevering eller før vi sender enheten, med mindre vi har avtalt noe annet. Vi sender kvittering på e-post når jobben er ferdig.",
      ],
    },
    {
      title: "5. Data, passord og innhold",
      paragraphs: [
        "Du er selv ansvarlig for sikkerhetskopi. Reparasjon, diagnostikk og testing kan medføre tap av data. Vi tar ikke ansvar for bilder, kontoer, apper eller annet innhold som går tapt.",
        "Skjermlås, Apple-ID og eventuelle koder må kunne åpnes når jobben krever det. Får vi ikke tilgang, kan vi stoppe arbeidet.",
      ],
    },
    {
      title: "6. Tilstand og risiko",
      paragraphs: [
        "Enheter med vannskade, tidligere reparasjon, bøyd ramme eller skjult skade har høyere risiko. Vi kan nekte å fortsette, eller fortsette på ditt ansvar, etter at vi har sagt ifra.",
        "Demontering kan avdekke skade som ikke synes utenfra. Vi dokumenterer det vi ser ved innlevering, så langt det er praktisk.",
      ],
    },
    {
      title: "7. Garanti",
      paragraphs: [
        "Utført arbeid og deler vi har satt i har 90 dagers garanti fra utlevering, med mindre vi har skrevet en annen periode på saken. Garantien dekker den jobben som ble gjort, ikke nye feil, slitasje, fall, væske eller feil bruk.",
        "Garanti gjelder ikke hvis enheten er åpnet eller reparert av andre etter at den forlot oss, eller hvis skaden kommer av forhold vi varslet om og du likevel valgte å gå videre.",
      ],
    },
    {
      title: "8. Innlevering, post og henting",
      paragraphs: [
        "Send selv inn til oss er uten porto fra vår side. Du merker pakken med saksnummer og sender den på egen risiko til vi har registrert mottak.",
        "Velger du retur med post, kommer avtalt returporto i tillegg. Sporingsnummer legges på statussiden når vi har det.",
        "Henting i butikk krever legitimasjon og saksnummer. Enheten kan hentes av den som står som kunde, eller av den kunden har gitt beskjed om.",
      ],
    },
    {
      title: "9. Uavhentet enhet",
      paragraphs: [
        "Hvis enheten ikke hentes eller adressen for retur ikke stemmer, varsler vi på e-post eller SMS. Etter 90 dager fra varsel kan vi behandle enheten som forlatt og selge eller destruere den for å dekke utlegg. Eventuelt overskudd tilhører deg etter fradrag for kostnader.",
      ],
    },
    {
      title: "10. Personvern",
      paragraphs: [
        "Vi lagrer navn, kontaktinfo, enhetsidentifikatorer og saksopplysninger for å utføre jobben, sende status og oppfylle bokføring. Statuslenken er hemmelig; del den bare med den som skal se saken.",
      ],
    },
    {
      title: "11. Ansvar",
      paragraphs: [
        "Vi utfører arbeidet med vanlig faglig omsorg. Vårt ansvar er begrenset til prisen for jobben, så langt loven tillater det. Forbrukerkjøpsloven og annen ufravikelig rett gjelder foran disse punktene der de treffer.",
      ],
    },
    {
      title: "12. Signatur",
      paragraphs: [
        "Ved å signere bekrefter du at du har lest betingelsene, at du eier enheten eller har rett til å levere den inn, og at opplysningene i serviceordren er riktige.",
      ],
    },
  ];
}
