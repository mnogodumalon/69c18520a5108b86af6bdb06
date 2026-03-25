import type { EnrichedDienstleisterbuchung, EnrichedEinladungsmanagement, EnrichedSchnelleinladung } from '@/types/enriched';
import type { Dienstleisterbuchung, Dienstleisterverwaltung, Einladungsmanagement, Eventverwaltung, Gaesteverwaltung, Schnelleinladung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface SchnelleinladungMaps {
  eventverwaltungMap: Map<string, Eventverwaltung>;
  gaesteverwaltungMap: Map<string, Gaesteverwaltung>;
}

export function enrichSchnelleinladung(
  schnelleinladung: Schnelleinladung[],
  maps: SchnelleinladungMaps
): EnrichedSchnelleinladung[] {
  return schnelleinladung.map(r => ({
    ...r,
    schnell_eventName: resolveDisplay(r.fields.schnell_event, maps.eventverwaltungMap, 'event_name'),
    schnell_gaesteName: resolveDisplay(r.fields.schnell_gaeste, maps.gaesteverwaltungMap, 'vorname', 'nachname'),
  }));
}

interface DienstleisterbuchungMaps {
  eventverwaltungMap: Map<string, Eventverwaltung>;
  dienstleisterverwaltungMap: Map<string, Dienstleisterverwaltung>;
}

export function enrichDienstleisterbuchung(
  dienstleisterbuchung: Dienstleisterbuchung[],
  maps: DienstleisterbuchungMaps
): EnrichedDienstleisterbuchung[] {
  return dienstleisterbuchung.map(r => ({
    ...r,
    buchung_eventName: resolveDisplay(r.fields.buchung_event, maps.eventverwaltungMap, 'event_name'),
    buchung_dienstleisterName: resolveDisplay(r.fields.buchung_dienstleister, maps.dienstleisterverwaltungMap, 'firmenname'),
  }));
}

interface EinladungsmanagementMaps {
  eventverwaltungMap: Map<string, Eventverwaltung>;
  gaesteverwaltungMap: Map<string, Gaesteverwaltung>;
}

export function enrichEinladungsmanagement(
  einladungsmanagement: Einladungsmanagement[],
  maps: EinladungsmanagementMaps
): EnrichedEinladungsmanagement[] {
  return einladungsmanagement.map(r => ({
    ...r,
    einladung_eventName: resolveDisplay(r.fields.einladung_event, maps.eventverwaltungMap, 'event_name'),
    einladung_gastName: resolveDisplay(r.fields.einladung_gast, maps.gaesteverwaltungMap, 'vorname', 'nachname'),
  }));
}
