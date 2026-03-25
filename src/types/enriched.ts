import type { Dienstleisterbuchung, Einladungsmanagement, Schnelleinladung } from './app';

export type EnrichedSchnelleinladung = Schnelleinladung & {
  schnell_eventName: string;
  schnell_gaesteName: string;
};

export type EnrichedDienstleisterbuchung = Dienstleisterbuchung & {
  buchung_eventName: string;
  buchung_dienstleisterName: string;
};

export type EnrichedEinladungsmanagement = Einladungsmanagement & {
  einladung_eventName: string;
  einladung_gastName: string;
};
