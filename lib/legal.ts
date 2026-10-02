export type LegalInfo = {
  legalEntityName: string;
  legalForm: string;
  streetAddress: string;
  postalCity: string;
  country: string;
  representative: string;
  email: string;
  phone: string;
  registerCourt: string;
  registerNumber: string;
  vatId: string;
  editorialResponsible: string;
  euRepresentative: string;
  dpo: string;
  supervisoryAuthority: string;
  applicationRetention: string;
  serverLogRetention: string;
  logLegalBasis: string;
  applicationLegalBasis: string;
  dataTransfers: string;
  consumerDispute: string;
};

export const getLegalInfo = (locale: string = "en"): LegalInfo => {
  const de = locale === "de";
  return {
    legalEntityName: "Afropean Business & Culture Network (ABCN)",
    legalForm: de ? "[Rechtsform nach Bestätigung ergänzen]" : "[Legal form to be confirmed]",
    streetAddress: de ? "[Straße und Hausnummer]" : "[Street address and number]",
    postalCity: "Frankfurt am Main",
    country: de ? "Deutschland" : "Germany",
    representative: "Harmonie Essome",
    // Was contact@abcn.network - a domain that does not resolve and has no MX
    // record, so every privacy request and legal notice sent to it bounced.
    // An Impressum must carry a contact that actually receives mail (§5 DDG),
    // so this stays a visible placeholder until the real address is supplied
    // rather than publishing a second dead one.
    email: de ? "[E-Mail-Adresse ergänzen]" : "[Contact email to be confirmed]",
    phone: de ? "[Telefonnummer]" : "[Telephone number]",
    registerCourt: de ? "[Registergericht, falls eingetragen]" : "[Register court, if registered]",
    registerNumber: de ? "[Registernummer, falls eingetragen]" : "[Registration number, if registered]",
    vatId: de ? "[USt-IdNr., falls vorhanden]" : "[VAT ID, if applicable]",
    editorialResponsible: "Harmonie Essome",
    euRepresentative: de
      ? "Nicht erforderlich (Verantwortliche und Initiative haben ihren Sitz in Deutschland / innerhalb der EU)."
      : "Not applicable (controller and initiative are established within Germany / the European Union).",
    dpo: de
      ? "Ein betrieblicher Datenschutzbeauftragter ist gesetzlich nicht erforderlich und nicht bestellt (Art. 37 DSGVO, § 38 BDSG)."
      : "A Data Protection Officer is not legally required and has not been appointed (Art. 37 GDPR, § 38 BDSG).",
    supervisoryAuthority:
      "Der Hessische Beauftragte für Datenschutz und Informationsfreiheit (HBDI), Gustav-Stresemann-Ring 1, 65189 Wiesbaden, Deutschland (Web: https://datenschutz.hessen.de)",
    applicationRetention: de
      ? "Für die Dauer des Auswahlverfahrens und der Programmdurchführung zzgl. maximal 6 Monate nach Abschluss der Kohorte (vorbehaltlich gesetzlicher Aufbewahrungsfristen)."
      : "For the duration of the application selection procedure and programme execution, plus maximum 6 months following cohort conclusion (subject to statutory retention obligations).",
    serverLogRetention: de
      ? "14 Tage (technische Sicherheits- und Zugriffsprotokolle des Hosters zur Missbrauchs- und Fehlererkennung)."
      : "14 days (technical edge security and access logs for incident response and error diagnostics).",
    logLegalBasis: de
      ? "Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der technischen Bereitstellung, Betriebsstabilität und Cyber-Sicherheit der Website)."
      : "Art. 6(1)(f) GDPR (legitimate interest in technical delivery, operational resilience, and cybersecurity of the web service).",
    applicationLegalBasis: de
      ? "Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen auf Anfrage der betroffenen Person im Rahmen der Programmbewerbung) sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der fairen Auswahl, Begleitung und Vernetzung der Teilnehmerinnen)."
      : "Art. 6(1)(b) GDPR (steps taken prior to entering into a programme agreement at the request of the applicant) and Art. 6(1)(f) GDPR (legitimate interest in fair evaluation, cohort coordination, and ecosystem matchmaking).",
    dataTransfers: de
      ? "Mit Vercel Inc. und Neon, Inc. bestehen Auftragsverarbeitungsverträge (DPA) auf Basis der EU-Standardvertragsklauseln (SCC) nach Art. 46 Abs. 2 lit. c DSGVO sowie Zertifizierungen unter dem EU-U.S. Data Privacy Framework (DPF). Die primäre Datenbank wird in der AWS-Region Frankfurt am Main (eu-central-1) betrieben."
      : "Data Processing Addenda (DPAs) based on EU Standard Contractual Clauses (SCCs) pursuant to Art. 46(2)(c) GDPR and certifications under the EU-U.S. Data Privacy Framework (DPF) are concluded with Vercel Inc. and Neon, Inc. The primary database cluster is hosted in AWS Frankfurt (eu-central-1).",
    consumerDispute: de
      ? "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG)."
      : "The European Commission provides a platform for online dispute resolution (ODR). We are neither willing nor obliged to participate in dispute resolution proceedings before a consumer arbitration board.",
  };
};

export const legalPlaceholders = getLegalInfo("en");

export const privacyInfrastructure = {
  hosting: "Vercel",
  database: "Neon",
};

/**
 * The live domain, used when NEXT_PUBLIC_SITE_URL is not set.
 *
 * This fallback is not cosmetic. Canonical tags, hreflang annotations, og:url,
 * the sitemap, robots.txt and all JSON-LD are built from siteUrl, so whatever
 * is here is what the site tells search engines about itself.
 *
 * It previously read "https://abcn.network", a domain that does not resolve.
 * With NEXT_PUBLIC_SITE_URL unset in production, every page on the live site
 * was publishing a canonical URL on a dead host - which tells Google the real
 * pages are duplicates of something that does not exist.
 *
 * Keep this equal to the host the middleware redirects to; middleware.ts
 * imports it for exactly that reason.
 */
export const DEFAULT_SITE_URL = "https://www.afropeanbusiness.com";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
