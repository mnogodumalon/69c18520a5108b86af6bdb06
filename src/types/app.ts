// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Schnelleinladung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    schnell_event?: string; // applookup -> URL zu 'Eventverwaltung' Record
    schnell_gaeste?: string;
    schnell_einladungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    schnell_notizen?: string;
  };
}

export interface Dienstleisterbuchung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    buchung_event?: string; // applookup -> URL zu 'Eventverwaltung' Record
    buchung_dienstleister?: string; // applookup -> URL zu 'Dienstleisterverwaltung' Record
    gebuchte_leistung?: string;
    vereinbarter_preis?: number;
    buchungsstatus?: LookupValue;
    buchung_notizen?: string;
  };
}

export interface Einladungsmanagement {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    einladung_event?: string; // applookup -> URL zu 'Eventverwaltung' Record
    einladung_gast?: string; // applookup -> URL zu 'Gaesteverwaltung' Record
    einladungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    einladungsstatus?: LookupValue;
    einladung_notizen?: string;
  };
}

export interface Eventverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    event_name?: string;
    event_datum?: string; // Format: YYYY-MM-DD oder ISO String
    event_strasse?: string;
    event_hausnummer?: string;
    event_plz?: string;
    event_ort?: string;
    event_beschreibung?: string;
    geplantes_budget?: number;
    event_status?: LookupValue;
    event_notizen?: string;
  };
}

export interface Dienstleisterverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    firmenname?: string;
    ansprechpartner_vorname?: string;
    ansprechpartner_nachname?: string;
    dl_email?: string;
    dl_telefon?: string;
    kategorie?: LookupValue;
    dl_notizen?: string;
  };
}

export interface Gaesteverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    unternehmen?: string;
    position?: string;
    notizen?: string;
  };
}

export const APP_IDS = {
  SCHNELLEINLADUNG: '69c184f6015010b253236847',
  DIENSTLEISTERBUCHUNG: '69c184f6df4d84221a69b827',
  EINLADUNGSMANAGEMENT: '69c184f5c06e59dd3b6338f5',
  EVENTVERWALTUNG: '69c184f5bfd71417289848b6',
  DIENSTLEISTERVERWALTUNG: '69c184f5969c07591f98b0b7',
  GAESTEVERWALTUNG: '69c184ea0b376d3c797865b1',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'dienstleisterbuchung': {
    buchungsstatus: [{ key: "angefragt", label: "Angefragt" }, { key: "bestaetigt", label: "Bestätigt" }, { key: "abgesagt", label: "Abgesagt" }, { key: "abgeschlossen", label: "Abgeschlossen" }],
  },
  'einladungsmanagement': {
    einladungsstatus: [{ key: "eingeladen", label: "Eingeladen" }, { key: "zugesagt", label: "Zugesagt" }, { key: "abgesagt", label: "Abgesagt" }, { key: "keine_antwort", label: "Keine Antwort" }],
  },
  'eventverwaltung': {
    event_status: [{ key: "in_planung", label: "In Planung" }, { key: "bestaetigt", label: "Bestätigt" }, { key: "abgeschlossen", label: "Abgeschlossen" }, { key: "abgesagt", label: "Abgesagt" }],
  },
  'dienstleisterverwaltung': {
    kategorie: [{ key: "technik_av", label: "Technik / AV" }, { key: "location", label: "Location" }, { key: "musik_entertainment", label: "Musik / Entertainment" }, { key: "fotografie_video", label: "Fotografie / Video" }, { key: "dekoration", label: "Dekoration" }, { key: "transport", label: "Transport" }, { key: "sonstiges", label: "Sonstiges" }, { key: "catering", label: "Catering" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'schnelleinladung': {
    'schnell_event': 'applookup/select',
    'schnell_gaeste': 'multipleapplookup/select',
    'schnell_einladungsdatum': 'date/date',
    'schnell_notizen': 'string/textarea',
  },
  'dienstleisterbuchung': {
    'buchung_event': 'applookup/select',
    'buchung_dienstleister': 'applookup/select',
    'gebuchte_leistung': 'string/textarea',
    'vereinbarter_preis': 'number',
    'buchungsstatus': 'lookup/select',
    'buchung_notizen': 'string/textarea',
  },
  'einladungsmanagement': {
    'einladung_event': 'applookup/select',
    'einladung_gast': 'applookup/select',
    'einladungsdatum': 'date/date',
    'einladungsstatus': 'lookup/select',
    'einladung_notizen': 'string/textarea',
  },
  'eventverwaltung': {
    'event_name': 'string/text',
    'event_datum': 'date/datetimeminute',
    'event_strasse': 'string/text',
    'event_hausnummer': 'string/text',
    'event_plz': 'string/text',
    'event_ort': 'string/text',
    'event_beschreibung': 'string/textarea',
    'geplantes_budget': 'number',
    'event_status': 'lookup/select',
    'event_notizen': 'string/textarea',
  },
  'dienstleisterverwaltung': {
    'firmenname': 'string/text',
    'ansprechpartner_vorname': 'string/text',
    'ansprechpartner_nachname': 'string/text',
    'dl_email': 'string/email',
    'dl_telefon': 'string/tel',
    'kategorie': 'lookup/select',
    'dl_notizen': 'string/textarea',
  },
  'gaesteverwaltung': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'unternehmen': 'string/text',
    'position': 'string/text',
    'notizen': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateSchnelleinladung = StripLookup<Schnelleinladung['fields']>;
export type CreateDienstleisterbuchung = StripLookup<Dienstleisterbuchung['fields']>;
export type CreateEinladungsmanagement = StripLookup<Einladungsmanagement['fields']>;
export type CreateEventverwaltung = StripLookup<Eventverwaltung['fields']>;
export type CreateDienstleisterverwaltung = StripLookup<Dienstleisterverwaltung['fields']>;
export type CreateGaesteverwaltung = StripLookup<Gaesteverwaltung['fields']>;