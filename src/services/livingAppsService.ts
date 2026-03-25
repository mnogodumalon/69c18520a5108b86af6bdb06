// AUTOMATICALLY GENERATED SERVICE
import { APP_IDS, LOOKUP_OPTIONS, FIELD_TYPES } from '@/types/app';
import type { Schnelleinladung, Dienstleisterbuchung, Einladungsmanagement, Eventverwaltung, Dienstleisterverwaltung, Gaesteverwaltung, CreateSchnelleinladung, CreateDienstleisterbuchung, CreateEinladungsmanagement, CreateEventverwaltung, CreateDienstleisterverwaltung, CreateGaesteverwaltung } from '@/types/app';

// Base Configuration
const API_BASE_URL = 'https://my.living-apps.de/rest';

// --- HELPER FUNCTIONS ---
export function extractRecordId(url: unknown): string | null {
  if (!url) return null;
  if (typeof url !== 'string') return null;
  const match = url.match(/([a-f0-9]{24})$/i);
  return match ? match[1] : null;
}

export function createRecordUrl(appId: string, recordId: string): string {
  return `https://my.living-apps.de/rest/apps/${appId}/records/${recordId}`;
}

async function callApi(method: string, endpoint: string, data?: any) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',  // Nutze Session Cookies für Auth
    body: data ? JSON.stringify(data) : undefined
  });
  if (!response.ok) throw new Error(await response.text());
  // DELETE returns often empty body or simple status
  if (method === 'DELETE') return true;
  return response.json();
}

/** Upload a file to LivingApps. Returns the file URL for use in record fields. */
export async function uploadFile(file: File | Blob, filename?: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file, filename ?? (file instanceof File ? file.name : 'upload'));
  const res = await fetch(`${API_BASE_URL}/files`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) throw new Error(`File upload failed: ${res.status}`);
  const data = await res.json();
  return data.url;
}

function enrichLookupFields<T extends { fields: Record<string, unknown> }>(
  records: T[], entityKey: string
): T[] {
  const opts = LOOKUP_OPTIONS[entityKey];
  if (!opts) return records;
  return records.map(r => {
    const fields = { ...r.fields };
    for (const [fieldKey, options] of Object.entries(opts)) {
      const val = fields[fieldKey];
      if (typeof val === 'string') {
        const m = options.find(o => o.key === val);
        fields[fieldKey] = m ?? { key: val, label: val };
      } else if (Array.isArray(val)) {
        fields[fieldKey] = val.map(v => {
          if (typeof v === 'string') {
            const m = options.find(o => o.key === v);
            return m ?? { key: v, label: v };
          }
          return v;
        });
      }
    }
    return { ...r, fields } as T;
  });
}

/** Normalize fields for API writes: strip lookup objects to keys, fix date formats. */
export function cleanFieldsForApi(
  fields: Record<string, unknown>,
  entityKey: string
): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...fields };
  for (const [k, v] of Object.entries(clean)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && 'key' in v) clean[k] = (v as any).key;
    if (Array.isArray(v)) clean[k] = v.map((item: any) => item && typeof item === 'object' && 'key' in item ? item.key : item);
  }
  const types = FIELD_TYPES[entityKey];
  if (types) {
    for (const [k, ft] of Object.entries(types)) {
      if (!(k in clean)) continue;
      const val = clean[k];
      // applookup fields: undefined → null (clear single reference)
      if ((ft === 'applookup/select' || ft === 'applookup/choice') && val === undefined) { clean[k] = null; continue; }
      // multipleapplookup fields: undefined/null → [] (clear multi reference)
      if ((ft === 'multipleapplookup/select' || ft === 'multipleapplookup/choice') && (val === undefined || val === null)) { clean[k] = []; continue; }
      // lookup fields: undefined → null (clear single lookup)
      if ((ft.startsWith('lookup/')) && val === undefined) { clean[k] = null; continue; }
      // multiplelookup fields: undefined/null → [] (clear multi lookup)
      if ((ft.startsWith('multiplelookup/')) && (val === undefined || val === null)) { clean[k] = []; continue; }
      if (typeof val !== 'string' || !val) continue;
      if (ft === 'date/datetimeminute') clean[k] = val.slice(0, 16);
      else if (ft === 'date/date') clean[k] = val.slice(0, 10);
    }
  }
  return clean;
}

let _cachedUserProfile: Record<string, unknown> | null = null;

export async function getUserProfile(): Promise<Record<string, unknown>> {
  if (_cachedUserProfile) return _cachedUserProfile;
  const raw = await callApi('GET', '/user');
  const skip = new Set(['id', 'image', 'lang', 'gender', 'title', 'fax', 'menus', 'initials']);
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && !skip.has(k)) data[k] = v;
  }
  _cachedUserProfile = data;
  return data;
}

export interface HeaderProfile {
  firstname: string;
  surname: string;
  email: string;
  image: string | null;
  company: string | null;
}

let _cachedHeaderProfile: HeaderProfile | null = null;

export async function getHeaderProfile(): Promise<HeaderProfile> {
  if (_cachedHeaderProfile) return _cachedHeaderProfile;
  const raw = await callApi('GET', '/user');
  _cachedHeaderProfile = {
    firstname: raw.firstname ?? '',
    surname: raw.surname ?? '',
    email: raw.email ?? '',
    image: raw.image ?? null,
    company: raw.company ?? null,
  };
  return _cachedHeaderProfile;
}

export interface AppGroupInfo {
  id: string;
  name: string;
  image: string | null;
  createdat: string;
  /** Resolved link: /objects/{id}/ if the dashboard exists, otherwise /gateway/apps/{firstAppId}?template=list_page */
  href: string;
}

let _cachedAppGroups: AppGroupInfo[] | null = null;

export async function getAppGroups(): Promise<AppGroupInfo[]> {
  if (_cachedAppGroups) return _cachedAppGroups;
  const raw = await callApi('GET', '/appgroups?with=apps');
  const groups: AppGroupInfo[] = Object.values(raw)
    .map((g: any) => {
      const firstAppId = Object.keys(g.apps ?? {})[0] ?? g.id;
      return {
        id: g.id,
        name: g.name,
        image: g.image ?? null,
        createdat: g.createdat ?? '',
        href: `/gateway/apps/${firstAppId}?template=list_page`,
        _firstAppId: firstAppId,
      };
    })
    .sort((a, b) => b.createdat.localeCompare(a.createdat));

  // Check which appgroups have a working dashboard at /objects/{id}/
  const checks = await Promise.allSettled(
    groups.map(g => fetch(`/objects/${g.id}/`, { method: 'HEAD', credentials: 'include' }))
  );
  checks.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.ok) {
      groups[i].href = `/objects/${groups[i].id}/`;
    }
  });

  // Clean up internal helper property
  groups.forEach(g => delete (g as any)._firstAppId);

  _cachedAppGroups = groups;
  return _cachedAppGroups;
}

export class LivingAppsService {
  // --- SCHNELLEINLADUNG ---
  static async getSchnelleinladung(): Promise<Schnelleinladung[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.SCHNELLEINLADUNG}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Schnelleinladung[];
    return enrichLookupFields(records, 'schnelleinladung');
  }
  static async getSchnelleinladungEntry(id: string): Promise<Schnelleinladung | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.SCHNELLEINLADUNG}/records/${id}`);
    const record = { record_id: data.id, ...data } as Schnelleinladung;
    return enrichLookupFields([record], 'schnelleinladung')[0];
  }
  static async createSchnelleinladungEntry(fields: CreateSchnelleinladung) {
    return callApi('POST', `/apps/${APP_IDS.SCHNELLEINLADUNG}/records`, { fields: cleanFieldsForApi(fields as any, 'schnelleinladung') });
  }
  static async updateSchnelleinladungEntry(id: string, fields: Partial<CreateSchnelleinladung>) {
    return callApi('PATCH', `/apps/${APP_IDS.SCHNELLEINLADUNG}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'schnelleinladung') });
  }
  static async deleteSchnelleinladungEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.SCHNELLEINLADUNG}/records/${id}`);
  }

  // --- DIENSTLEISTERBUCHUNG ---
  static async getDienstleisterbuchung(): Promise<Dienstleisterbuchung[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.DIENSTLEISTERBUCHUNG}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Dienstleisterbuchung[];
    return enrichLookupFields(records, 'dienstleisterbuchung');
  }
  static async getDienstleisterbuchungEntry(id: string): Promise<Dienstleisterbuchung | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.DIENSTLEISTERBUCHUNG}/records/${id}`);
    const record = { record_id: data.id, ...data } as Dienstleisterbuchung;
    return enrichLookupFields([record], 'dienstleisterbuchung')[0];
  }
  static async createDienstleisterbuchungEntry(fields: CreateDienstleisterbuchung) {
    return callApi('POST', `/apps/${APP_IDS.DIENSTLEISTERBUCHUNG}/records`, { fields: cleanFieldsForApi(fields as any, 'dienstleisterbuchung') });
  }
  static async updateDienstleisterbuchungEntry(id: string, fields: Partial<CreateDienstleisterbuchung>) {
    return callApi('PATCH', `/apps/${APP_IDS.DIENSTLEISTERBUCHUNG}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'dienstleisterbuchung') });
  }
  static async deleteDienstleisterbuchungEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.DIENSTLEISTERBUCHUNG}/records/${id}`);
  }

  // --- EINLADUNGSMANAGEMENT ---
  static async getEinladungsmanagement(): Promise<Einladungsmanagement[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.EINLADUNGSMANAGEMENT}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Einladungsmanagement[];
    return enrichLookupFields(records, 'einladungsmanagement');
  }
  static async getEinladungsmanagementEntry(id: string): Promise<Einladungsmanagement | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.EINLADUNGSMANAGEMENT}/records/${id}`);
    const record = { record_id: data.id, ...data } as Einladungsmanagement;
    return enrichLookupFields([record], 'einladungsmanagement')[0];
  }
  static async createEinladungsmanagementEntry(fields: CreateEinladungsmanagement) {
    return callApi('POST', `/apps/${APP_IDS.EINLADUNGSMANAGEMENT}/records`, { fields: cleanFieldsForApi(fields as any, 'einladungsmanagement') });
  }
  static async updateEinladungsmanagementEntry(id: string, fields: Partial<CreateEinladungsmanagement>) {
    return callApi('PATCH', `/apps/${APP_IDS.EINLADUNGSMANAGEMENT}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'einladungsmanagement') });
  }
  static async deleteEinladungsmanagementEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.EINLADUNGSMANAGEMENT}/records/${id}`);
  }

  // --- EVENTVERWALTUNG ---
  static async getEventverwaltung(): Promise<Eventverwaltung[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.EVENTVERWALTUNG}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Eventverwaltung[];
    return enrichLookupFields(records, 'eventverwaltung');
  }
  static async getEventverwaltungEntry(id: string): Promise<Eventverwaltung | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.EVENTVERWALTUNG}/records/${id}`);
    const record = { record_id: data.id, ...data } as Eventverwaltung;
    return enrichLookupFields([record], 'eventverwaltung')[0];
  }
  static async createEventverwaltungEntry(fields: CreateEventverwaltung) {
    return callApi('POST', `/apps/${APP_IDS.EVENTVERWALTUNG}/records`, { fields: cleanFieldsForApi(fields as any, 'eventverwaltung') });
  }
  static async updateEventverwaltungEntry(id: string, fields: Partial<CreateEventverwaltung>) {
    return callApi('PATCH', `/apps/${APP_IDS.EVENTVERWALTUNG}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'eventverwaltung') });
  }
  static async deleteEventverwaltungEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.EVENTVERWALTUNG}/records/${id}`);
  }

  // --- DIENSTLEISTERVERWALTUNG ---
  static async getDienstleisterverwaltung(): Promise<Dienstleisterverwaltung[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.DIENSTLEISTERVERWALTUNG}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Dienstleisterverwaltung[];
    return enrichLookupFields(records, 'dienstleisterverwaltung');
  }
  static async getDienstleisterverwaltungEntry(id: string): Promise<Dienstleisterverwaltung | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.DIENSTLEISTERVERWALTUNG}/records/${id}`);
    const record = { record_id: data.id, ...data } as Dienstleisterverwaltung;
    return enrichLookupFields([record], 'dienstleisterverwaltung')[0];
  }
  static async createDienstleisterverwaltungEntry(fields: CreateDienstleisterverwaltung) {
    return callApi('POST', `/apps/${APP_IDS.DIENSTLEISTERVERWALTUNG}/records`, { fields: cleanFieldsForApi(fields as any, 'dienstleisterverwaltung') });
  }
  static async updateDienstleisterverwaltungEntry(id: string, fields: Partial<CreateDienstleisterverwaltung>) {
    return callApi('PATCH', `/apps/${APP_IDS.DIENSTLEISTERVERWALTUNG}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'dienstleisterverwaltung') });
  }
  static async deleteDienstleisterverwaltungEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.DIENSTLEISTERVERWALTUNG}/records/${id}`);
  }

  // --- GAESTEVERWALTUNG ---
  static async getGaesteverwaltung(): Promise<Gaesteverwaltung[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.GAESTEVERWALTUNG}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Gaesteverwaltung[];
    return enrichLookupFields(records, 'gaesteverwaltung');
  }
  static async getGaesteverwaltungEntry(id: string): Promise<Gaesteverwaltung | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.GAESTEVERWALTUNG}/records/${id}`);
    const record = { record_id: data.id, ...data } as Gaesteverwaltung;
    return enrichLookupFields([record], 'gaesteverwaltung')[0];
  }
  static async createGaesteverwaltungEntry(fields: CreateGaesteverwaltung) {
    return callApi('POST', `/apps/${APP_IDS.GAESTEVERWALTUNG}/records`, { fields: cleanFieldsForApi(fields as any, 'gaesteverwaltung') });
  }
  static async updateGaesteverwaltungEntry(id: string, fields: Partial<CreateGaesteverwaltung>) {
    return callApi('PATCH', `/apps/${APP_IDS.GAESTEVERWALTUNG}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'gaesteverwaltung') });
  }
  static async deleteGaesteverwaltungEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.GAESTEVERWALTUNG}/records/${id}`);
  }

}