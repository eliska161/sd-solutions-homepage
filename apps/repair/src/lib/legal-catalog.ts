export const LEGAL_VERSION = "2026-09-17";

export const LEGAL_PARTY = {
  brandName: "SD Solutions",
  legalName: "Skaug-Danielsen Solutions",
  address: "Slåttmyrvegen 49, 2406 Elverum",
  email: "kontakt@sd-solutions.org",
  hours: "Mandag-lørdag 12:00-18:00",
  web: "https://sd-solutions.org",
  repair: "https://repair.sd-solutions.org",
} as const;

/** Faste beløp som står i vilkår og på ordrebekreftelse. Alle priser inkl. mva. */
export const WORKSHOP_FEES = {
  diagnosisKr: 399,
  noFaultKr: 399,
  declinedAfterDiagnosisKr: 399,
  returnPostageKr: 69,
  inboundPostageKr: 0,
  warrantyDays: 90,
  uncollectedDays: 90,
} as const;

/** Kort tabell til ordrebekreftelse og signeringssteg. Beløp inkl. mva. */
export function workshopFeeLines(): { label: string; value: string }[] {
  const f = WORKSHOP_FEES;
  return [
    { label: "Diagnose", value: `${f.diagnosisKr} kr` },
    { label: "Ingen feil funnet", value: `${f.noFaultKr} kr` },
    {
      label: "Takker nei etter diagnose",
      value: `${f.declinedAfterDiagnosisKr} kr`,
    },
    {
      label: "Reparasjon utført etter diagnose",
      value: "Diagnose inngår, ikke separat",
    },
    {
      label: "Send selv inn (porto fra oss)",
      value: `${f.inboundPostageKr} kr`,
    },
    { label: "Returporto", value: `${f.returnPostageKr} kr` },
  ];
}

/** Forklart uten fagspråk. Brukes i vilkår, ordrebekreftelse og signeringssteg. */
export const PART_GRADE_CUSTOMER_TEXT =
  "Du velger selv hvilken del vi skal sette i, og prisen avhenger av det. For skjerm er kopi Soft OLED, for batteri kopi premium. Du kan også velge original del tatt ut av en annen telefon, eller helt ny original del. Ikke alle typer finnes til alle modeller. Hva som monteres, står på saken.";

export type LegalSection = {
  title: string;
  paragraphs: string[];
};

export type LegalDocument = {
  slug: string;
  title: string;
  filename: string;
  version: string;
  intro: string;
  sections: LegalSection[];
};

function partyLine() {
  return `${LEGAL_PARTY.legalName} (merkenavn ${LEGAL_PARTY.brandName}), ${LEGAL_PARTY.address}. E-post: ${LEGAL_PARTY.email}.`;
}

export const personvernNettsted: LegalDocument = {
  slug: "personvern-nettsted",
  title: "Personvernerklæring",
  filename: "sd-solutions-personvern.pdf",
  version: LEGAL_VERSION,
  intro:
    "Denne erklæringen gjelder nettstedet sd-solutions.org, inkludert kontaktskjema og sider om reparasjon og programvare.",
  sections: [
    {
      title: "1. Behandlingsansvarlig",
      paragraphs: [partyLine()],
    },
    {
      title: "2. Hva vi samler inn",
      paragraphs: [
        "Når du bruker nettstedet, behandler vi tekniske data som er nødvendige for at sidene skal virke (for eksempel økt i nettleseren).",
        "Når du sender kontaktskjema, lagrer vi navn, e-post, telefon hvis du oppgir det, organisasjon, melding og type henvendelse. Vi bruker dette for å svare deg.",
      ],
    },
    {
      title: "3. Hvem vi deler med",
      paragraphs: [
        "E-post fra skjemaet sendes via vår e-postleverandør (Resend) for å levere meldingen. Vi selger ikke opplysninger.",
        "Hvis du går videre til serviceordre, gjelder personvernerklæringen på repair.sd-solutions.org for saken der.",
      ],
    },
    {
      title: "4. Lagring",
      paragraphs: [
        "Kontakthenvendelser lagres så lenge det er nødvendig for å følge opp saken og eventuelle bokføringskrav, og slettes eller anonymiseres når de ikke lenger trengs.",
      ],
    },
    {
      title: "5. Dine rettigheter",
      paragraphs: [
        "Du kan be om innsyn, retting eller sletting, og klage til Datatilsynet. Skriv til oss på e-postadressen over.",
      ],
    },
  ],
};

export const personvernRepair: LegalDocument = {
  slug: "personvern-repair",
  title: "Personvernerklæring",
  filename: "sd-solutions-personvern-repair.pdf",
  version: LEGAL_VERSION,
  intro:
    "Denne erklæringen gjelder kundeportalen på repair.sd-solutions.org: serviceordre, status, SMS, e-post og innlevering.",
  sections: [
    {
      title: "1. Behandlingsansvarlig",
      paragraphs: [partyLine()],
    },
    {
      title: "2. Hva vi samler inn",
      paragraphs: [
        "For å utføre en reparasjon lagrer vi navn, telefon, e-post, adresse, saksnummer, enhetsopplysninger (modell, farge, lagring, IMEI eller serienummer), feilbeskrivelse, status, meldinger, bilder du eller vi legger inn, signatur på betingelser, og innleveringsvalg.",
        "Statuslenken er en hemmelig kode. Den som har lenken kan se saken. Del den bare med den som skal følge saken.",
      ],
    },
    {
      title: "3. Hvorfor",
      paragraphs: [
        "Vi behandler opplysningene for å ta imot saken, kommunisere, utføre jobben, ta betalt, sende kvittering og oppfylle bokføring og reklamasjon.",
      ],
    },
    {
      title: "4. Hvem vi deler med",
      paragraphs: [
        "SMS sendes via 46elks. E-post sendes via Resend. Post og sporing kan innebære at transportør får navn, adresse og saksreferanse.",
        "Vi selger ikke kundeopplysninger.",
      ],
    },
    {
      title: "5. Lagring",
      paragraphs: [
        "Saksdata lagres så lenge det er nødvendig for jobben, garanti og bokføring. Deretter slettes eller anonymiseres de så langt det er praktisk.",
      ],
    },
    {
      title: "6. Dine rettigheter",
      paragraphs: [
        "Du kan be om innsyn, retting eller sletting der loven gir deg det, og klage til Datatilsynet. Skriv til oss på e-postadressen over.",
      ],
    },
  ],
};

export const cookies: LegalDocument = {
  slug: "cookies",
  title: "Informasjonskapsler",
  filename: "sd-solutions-cookies.pdf",
  version: LEGAL_VERSION,
  intro:
    "Kort oversikt over informasjonskapsler på sd-solutions.org.",
  sections: [
    {
      title: "1. Hva vi bruker",
      paragraphs: [
        "Nettstedet bruker det som trengs for at sidene skal vises og skjema skal virke. Vi setter ikke markedsførings- eller analyse-cookies på sd-solutions.org per i dag.",
      ],
    },
    {
      title: "2. Repair-portalen",
      paragraphs: [
        "På repair.sd-solutions.org brukes innloggingscookie for ansatte. Kunder som bare bruker statuslenke, trenger ikke å logge inn.",
      ],
    },
    {
      title: "3. Endringer",
      paragraphs: [
        "Hvis vi tar i bruk analyse senere, oppdateres denne siden og versjonsdatoen.",
      ],
    },
  ],
};

export const bruksvilkar: LegalDocument = {
  slug: "bruksvilkar",
  title: "Bruksvilkår",
  filename: "sd-solutions-bruksvilkar.pdf",
  version: LEGAL_VERSION,
  intro:
    "Vilkår for å bruke nettstedet sd-solutions.org. Reparasjonstjenesten har egne vilkår på repair.sd-solutions.org.",
  sections: [
    {
      title: "1. Nettstedet",
      paragraphs: [
        `Sidene drives av ${LEGAL_PARTY.legalName}. Innholdet er informasjon om iPhone-reparasjon og programvare. Priser og beskrivelser på nettsiden kan endres.`,
      ],
    },
    {
      title: "2. Ingen avtale før serviceordre",
      paragraphs: [
        "Å lese nettsiden eller sende kontaktskjema er ikke en reparasjonsavtale. Avtale om diagnose og reparasjon inngås når du oppretter og signerer serviceordre, eller når vi tar imot enheten etter avtale.",
      ],
    },
    {
      title: "3. Innhold",
      paragraphs: [
        "Tekst, merke og bilder tilhører oss eller lisensgivere. Du kan ikke kopiere nettsiden for kommersielt bruk uten samtykke.",
      ],
    },
    {
      title: "4. Ansvar",
      paragraphs: [
        "Vi prøver å holde informasjonen riktig, men tar ikke ansvar for tap som følger av bruk av nettsiden alene. Ufravikelig forbrukerrett gjelder.",
      ],
    },
  ],
};

export const virksomhet: LegalDocument = {
  slug: "virksomhet",
  title: "Kontakt og virksomhetsinformasjon",
  filename: "sd-solutions-virksomhet.pdf",
  version: LEGAL_VERSION,
  intro: "Hvem vi er, og hvordan du når oss.",
  sections: [
    {
      title: "1. Firma",
      paragraphs: [
        `Juridisk navn: ${LEGAL_PARTY.legalName}.`,
        `Merkevare: ${LEGAL_PARTY.brandName} og ${LEGAL_PARTY.brandName} Repair.`,
        `Adresse: ${LEGAL_PARTY.address}, Norge.`,
      ],
    },
    {
      title: "2. Kontakt",
      paragraphs: [
        `E-post: ${LEGAL_PARTY.email}.`,
        `Åpent: ${LEGAL_PARTY.hours}.`,
        `Nettside: ${LEGAL_PARTY.web}. Kundeportal: ${LEGAL_PARTY.repair}.`,
      ],
    },
    {
      title: "3. Hva vi gjør",
      paragraphs: [
        "Vi reparerer og refurbisher i hovedsak iPhone: skjerm, batteri, ladeport, kamera, lyd og diagnostikk. Programvare (Kartarkiv, SD Kiosk og liknende) er beskrevet under Programvare på nettsiden.",
      ],
    },
  ],
};

export const vilkarReparasjon: LegalDocument = {
  slug: "vilkar-reparasjon",
  title: "Vilkår for reparasjon",
  filename: "sd-solutions-vilkar-reparasjon.pdf",
  version: LEGAL_VERSION,
  intro:
    "Gjelder når du oppretter serviceordre, leverer eller sender inn en enhet, og for arbeid vi utfører på den.",
  sections: [
    {
      title: "1. Avtaleparter",
      paragraphs: [
        `Avtalen er mellom deg som kunde og ${partyLine()}`,
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
        `Diagnose koster ${WORKSHOP_FEES.diagnosisKr} kr. Finner vi ingen feil, belastes ${WORKSHOP_FEES.noFaultKr} kr for undersøkelsen.`,
        `Takker du nei til reparasjon etter diagnose, belastes ${WORKSHOP_FEES.declinedAfterDiagnosisKr} kr. Godkjenner du og vi utfører jobben, inngår diagnosen i reparasjonsprisen og belastes ikke separat.`,
        "Diagnose kan avdekke flere feil enn du beskrev. Vi opplyser om det vi finner, og venter på svar før vi går videre hvis omfang eller pris endrer seg.",
      ],
    },
    {
      title: "4. Pris, deler og betaling",
      paragraphs: [
        "Prisen du ser på statussiden er for tjenestene vi har lagt på saken, minus eventuell rabatt. Deler vi bruker i jobben er inkludert i tjenesteprisen med mindre vi sier noe annet.",
        PART_GRADE_CUSTOMER_TEXT,
        "Betaling skjer før utlevering eller før vi sender enheten, med mindre vi har avtalt noe annet. Kvittering sendes på e-post når jobben er ferdig.",
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
        "Demontering kan avdekke skade som ikke synes utenfra.",
      ],
    },
    {
      title: "7. Ansvar",
      paragraphs: [
        "Vi utfører arbeidet med vanlig faglig omsorg. Vårt ansvar er begrenset til prisen for jobben, så langt loven tillater det. Forbrukerkjøpsloven og annen ufravikelig rett gjelder foran disse punktene der de treffer.",
      ],
    },
  ],
};

export const garanti: LegalDocument = {
  slug: "garanti",
  title: "Reparasjonsgaranti",
  filename: "sd-solutions-garanti.pdf",
  version: LEGAL_VERSION,
  intro: "Hva garantien dekker etter at jobben er levert.",
  sections: [
    {
      title: "1. Periode",
      paragraphs: [
        `Utført arbeid og deler vi har satt i har ${WORKSHOP_FEES.warrantyDays} dagers garanti fra utlevering, med mindre vi har skrevet en annen periode på saken.`,
      ],
    },
    {
      title: "2. Hva som dekkes",
      paragraphs: [
        "Garantien dekker den jobben som ble gjort: feil i utførelsen eller i delen vi monterte, som viser seg innen perioden.",
      ],
    },
    {
      title: "3. Hva som ikke dekkes",
      paragraphs: [
        "Nye feil, slitasje, fall, væske, feil bruk, eller skade som kommer av forhold vi varslet om og du likevel valgte å gå videre.",
        "Garanti gjelder ikke hvis enheten er åpnet eller reparert av andre etter at den forlot oss.",
      ],
    },
    {
      title: "4. Reklamasjon",
      paragraphs: [
        `Ta kontakt på ${LEGAL_PARTY.email} eller i butikk, og oppgi saksnummer. Lovbestemt reklamasjonsrett kommer i tillegg der den gjelder.`,
      ],
    },
  ],
};

export const innUtlevering: LegalDocument = {
  slug: "inn-utlevering",
  title: "Inn- og utleveringsvilkår",
  filename: "sd-solutions-inn-utlevering.pdf",
  version: LEGAL_VERSION,
  intro: "Hvordan enheten kommer inn og ut: butikk, send selv og returpost.",
  sections: [
    {
      title: "1. Levering i butikk",
      paragraphs: [
        `Adresse: ${LEGAL_PARTY.address}. Åpent ${LEGAL_PARTY.hours}.`,
        "Du velger dato og timeslot på innleveringssiden. Vi tar ikke saken inn i verkstedet før enheten er fysisk levert.",
      ],
    },
    {
      title: "2. Send selv",
      paragraphs: [
        "Send selv inn til oss er uten porto fra vår side. Du merker pakken med saksnummer og sender den på egen risiko til vi har registrert mottak.",
      ],
    },
    {
      title: "3. Henting",
      paragraphs: [
        "Henting i butikk krever legitimasjon og saksnummer. Enheten kan hentes av den som står som kunde, eller av den kunden har gitt beskjed om.",
      ],
    },
    {
      title: "4. Retur med post",
      paragraphs: [
        `Velger du retur med post, kommer returporto på ${WORKSHOP_FEES.returnPostageKr} kr i tillegg. Sporingsnummer legges på statussiden når vi har det. Send selv inn til oss koster ${WORKSHOP_FEES.inboundPostageKr} kr i porto fra vår side.`,
      ],
    },
    {
      title: "5. Uavhentet enhet",
      paragraphs: [
        `Hvis enheten ikke hentes eller adressen for retur ikke stemmer, varsler vi på e-post eller SMS. Etter ${WORKSHOP_FEES.uncollectedDays} dager fra varsel kan vi behandle enheten som forlatt og selge eller destruere den for å dekke utlegg, i tråd med lov om rett for handverkarar o.a. til å selje ting som ikkje vert henta. Eventuelt overskudd tilhører deg etter fradrag for kostnader.`,
      ],
    },
  ],
};

export const mottak: LegalDocument = {
  slug: "mottak",
  title: "Dokumentasjon ved mottak",
  filename: "sd-solutions-mottak.pdf",
  version: LEGAL_VERSION,
  intro:
    "Dette er det verkstedet dokumenterer når enheten tas inn. Kunden signerer ikke dette på forhånd. Det fylles ut ved mottak og kan vises på statussiden der det er kundevendt.",
  sections: [
    {
      title: "1. Hva vi noterer",
      paragraphs: [
        "Saksnummer, kundenavn, modell, IMEI eller serienummer, og feil kunden har beskrevet.",
        "Synlig tilstand: forside, bakside, sider, topp, bunn, skjerm, ramme, bakglass og kamera, så langt det er praktisk. Skadenotater i fritekst.",
        "Bilder av enheten ved mottak, når vi tar dem.",
      ],
    },
    {
      title: "2. Funksjonssjekk",
      paragraphs: [
        "Ved mottak kan vi krysse av for ting som skjerm, berøring, kamera, lyd, lading og annet som er relevant. Resultat: OK, feil, ikke testet eller ikke aktuelt.",
      ],
    },
    {
      title: "3. Hvorfor",
      paragraphs: [
        "Dokumentasjonen skiller mellom skade som var der da vi fikk telefonen, og det vi gjør i jobben. Den er grunnlag hvis det blir uenighet om tilstand.",
      ],
    },
  ],
};

/** Nummererte vilkår på ordrebekreftelse (side 2) og i signeringsflyten. */
export function signedWorkshopClauses(): string[] {
  const f = WORKSHOP_FEES;
  return [
    `Dersom det ikke blir funnet feil på enheten, belastes ${f.noFaultKr} kr for undersøkelsen.`,
    `Takker du nei til reparasjon etter diagnose, belastes ${f.declinedAfterDiagnosisKr} kr for undersøkelsen. Godkjenner du og vi utfører jobben, inngår diagnosen i reparasjonsprisen og belastes ikke separat. Diagnose koster ellers ${f.diagnosisKr} kr.`,
    "Endelig pris og omfang avtales etter diagnose, med mindre vi har gitt en fast pris på forhånd. Du godkjenner arbeidet på statussiden eller skriftlig før vi går videre med betalt reparasjon utover diagnose.",
    PART_GRADE_CUSTOMER_TEXT,
    "Uautoriserte inngrep eller modifikasjoner på enheten kan gi ekstra kostnad, med mindre det er avtalt skriftlig på forhånd. Vi står ikke ansvarlig for programvarefeil som skyldes overoppheting, væske, feilkonfigurasjon eller annet som ikke relaterer til vårt inngrep.",
    "Vi står ikke ansvarlig for skader som oppstår under demontering eller reparasjon dersom skaden relaterer til eksisterende skade (væske, bøyd ramme, tidligere reparasjon, skjult brudd).",
    "Personalisering som gravering, klistremerker og skins på deler som byttes, erstattes ikke.",
    "Utskiftede deler tilhører verkstedet, med mindre du ber om å få dem med ved innlevering. Kostnad kan påløpe hvis det krever ekstra arbeid.",
    `Garanti på utført arbeid og deler vi har satt i er ${f.warrantyDays} dager fra utlevering. For forbrukere gjelder i tillegg håndverkertjenesteloven. Garantien dekker ikke nye feil, slitasje, fall, væske eller feil bruk, og faller bort hvis andre åpner enheten etter utlevering.`,
    `Uavhentede enheter kan selges eller kasseres etter ${f.uncollectedDays} dager fra varsel, jf. lov om rett for handverkarar o.a. til å selje ting som ikkje vert henta (29. mai 1953). Vi varsler på e-post eller SMS først.`,
    `Send selv inn til oss koster ${f.inboundPostageKr} kr i porto fra vår side. Du merker pakken med saksnummer og sender på egen risiko til vi har registrert mottak. Retur med post koster ${f.returnPostageKr} kr. Henting i butikk krever legitimasjon og saksnummer.`,
    "Du er selv ansvarlig for sikkerhetskopi. Reparasjon og testing kan medføre tap av data. Skjermlås og Apple-ID må kunne åpnes når jobben krever det.",
    "Betaling skjer før utlevering eller før vi sender enheten, med mindre noe annet er avtalt. Kvittering sendes på e-post når jobben er ferdig.",
    `Kontaktinformasjon brukes for å utføre saken, sende status (e-post/SMS) og bokføring. Personvernerklæring: ${LEGAL_PARTY.repair}/s/personvern`,
    "Ved å signere bekrefter du at du har lest vilkårene, at du eier enheten eller har rett til å levere den inn, og at opplysningene i serviceordren er riktige.",
  ];
}

export const fysiskReparasjonsvilkar: LegalDocument = {
  slug: "fysisk-reparasjonsvilkar",
  title: "Reparasjonsvilkår",
  filename: "sd-solutions-reparasjonsvilkar.pdf",
  version: LEGAL_VERSION,
  intro:
    "Disse vilkårene signeres på ordrebekreftelsen når du oppretter serviceordre.",
  sections: signedWorkshopClauses().map((text, index) => ({
    title: `${index + 1}.`,
    paragraphs: [text],
  })),
};

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  personvernNettsted,
  cookies,
  bruksvilkar,
  virksomhet,
  personvernRepair,
  vilkarReparasjon,
  garanti,
  innUtlevering,
  fysiskReparasjonsvilkar,
  mottak,
];

export function getLegalDocument(slug: string): LegalDocument | null {
  return LEGAL_DOCUMENTS.find((d) => d.slug === slug) ?? null;
}

export function legalPlainText(doc: LegalDocument): string {
  const lines = [
    doc.title,
    `Versjon ${doc.version}`,
    "",
    doc.intro,
    "",
  ];
  for (const section of doc.sections) {
    lines.push(section.title);
    for (const p of section.paragraphs) {
      lines.push(p);
      lines.push("");
    }
  }
  lines.push(`${LEGAL_PARTY.brandName} · ${LEGAL_PARTY.legalName} · ${LEGAL_PARTY.address}`);
  return lines.join("\n");
}
