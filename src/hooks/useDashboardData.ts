import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Schnelleinladung, Dienstleisterbuchung, Einladungsmanagement, Eventverwaltung, Dienstleisterverwaltung, Gaesteverwaltung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [schnelleinladung, setSchnelleinladung] = useState<Schnelleinladung[]>([]);
  const [dienstleisterbuchung, setDienstleisterbuchung] = useState<Dienstleisterbuchung[]>([]);
  const [einladungsmanagement, setEinladungsmanagement] = useState<Einladungsmanagement[]>([]);
  const [eventverwaltung, setEventverwaltung] = useState<Eventverwaltung[]>([]);
  const [dienstleisterverwaltung, setDienstleisterverwaltung] = useState<Dienstleisterverwaltung[]>([]);
  const [gaesteverwaltung, setGaesteverwaltung] = useState<Gaesteverwaltung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [schnelleinladungData, dienstleisterbuchungData, einladungsmanagementData, eventverwaltungData, dienstleisterverwaltungData, gaesteverwaltungData] = await Promise.all([
        LivingAppsService.getSchnelleinladung(),
        LivingAppsService.getDienstleisterbuchung(),
        LivingAppsService.getEinladungsmanagement(),
        LivingAppsService.getEventverwaltung(),
        LivingAppsService.getDienstleisterverwaltung(),
        LivingAppsService.getGaesteverwaltung(),
      ]);
      setSchnelleinladung(schnelleinladungData);
      setDienstleisterbuchung(dienstleisterbuchungData);
      setEinladungsmanagement(einladungsmanagementData);
      setEventverwaltung(eventverwaltungData);
      setDienstleisterverwaltung(dienstleisterverwaltungData);
      setGaesteverwaltung(gaesteverwaltungData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const eventverwaltungMap = useMemo(() => {
    const m = new Map<string, Eventverwaltung>();
    eventverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [eventverwaltung]);

  const dienstleisterverwaltungMap = useMemo(() => {
    const m = new Map<string, Dienstleisterverwaltung>();
    dienstleisterverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [dienstleisterverwaltung]);

  const gaesteverwaltungMap = useMemo(() => {
    const m = new Map<string, Gaesteverwaltung>();
    gaesteverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [gaesteverwaltung]);

  return { schnelleinladung, setSchnelleinladung, dienstleisterbuchung, setDienstleisterbuchung, einladungsmanagement, setEinladungsmanagement, eventverwaltung, setEventverwaltung, dienstleisterverwaltung, setDienstleisterverwaltung, gaesteverwaltung, setGaesteverwaltung, loading, error, fetchAll, eventverwaltungMap, dienstleisterverwaltungMap, gaesteverwaltungMap };
}