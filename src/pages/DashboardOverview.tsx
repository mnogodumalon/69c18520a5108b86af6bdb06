import { useState, useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichSchnelleinladung, enrichDienstleisterbuchung, enrichEinladungsmanagement } from '@/lib/enrich';
import type { EnrichedDienstleisterbuchung, EnrichedEinladungsmanagement } from '@/types/enriched';
import type { Eventverwaltung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EventverwaltungDialog } from '@/components/dialogs/EventverwaltungDialog';
import { EinladungsmanagementDialog } from '@/components/dialogs/EinladungsmanagementDialog';
import { DienstleisterbuchungDialog } from '@/components/dialogs/DienstleisterbuchungDialog';
import {
  IconAlertCircle, IconCalendar, IconUsers, IconBriefcase, IconPlus,
  IconPencil, IconTrash, IconMapPin, IconCurrencyEuro, IconCheck,
  IconX, IconClock, IconChevronRight, IconBuilding, IconRocket,
  IconClipboardList, IconCircleCheck,
} from '@tabler/icons-react';

// ── Status helpers ─────────────────────────────────────────────────────────

function eventStatusColor(key: string | undefined) {
  switch (key) {
    case 'in_planung': return 'bg-amber-100 text-amber-700';
    case 'bestaetigt': return 'bg-blue-100 text-blue-700';
    case 'abgeschlossen': return 'bg-emerald-100 text-emerald-700';
    case 'abgesagt': return 'bg-red-100 text-red-700';
    default: return 'bg-muted text-muted-foreground';
  }
}

function inviteStatusColor(key: string | undefined) {
  switch (key) {
    case 'zugesagt': return 'bg-emerald-100 text-emerald-700';
    case 'abgesagt': return 'bg-red-100 text-red-700';
    case 'eingeladen': return 'bg-blue-100 text-blue-700';
    case 'keine_antwort': return 'bg-amber-100 text-amber-700';
    default: return 'bg-muted text-muted-foreground';
  }
}

function buchungsStatusColor(key: string | undefined) {
  switch (key) {
    case 'bestaetigt': return 'bg-emerald-100 text-emerald-700';
    case 'angefragt': return 'bg-blue-100 text-blue-700';
    case 'abgesagt': return 'bg-red-100 text-red-700';
    case 'abgeschlossen': return 'bg-purple-100 text-purple-700';
    default: return 'bg-muted text-muted-foreground';
  }
}

// ── Main component ────────────────────────────────────────────────────────

export default function DashboardOverview() {
  const {
    schnelleinladung, dienstleisterbuchung, einladungsmanagement, eventverwaltung, dienstleisterverwaltung, gaesteverwaltung,
    eventverwaltungMap, dienstleisterverwaltungMap, gaesteverwaltungMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedSchnelleinladung = enrichSchnelleinladung(schnelleinladung, { eventverwaltungMap, gaesteverwaltungMap });
  const enrichedDienstleisterbuchung = enrichDienstleisterbuchung(dienstleisterbuchung, { eventverwaltungMap, dienstleisterverwaltungMap });
  const enrichedEinladungsmanagement = enrichEinladungsmanagement(einladungsmanagement, { eventverwaltungMap, gaesteverwaltungMap });

  // Selected event for detail panel
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Event CRUD
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<Eventverwaltung | null>(null);
  const [deleteEventTarget, setDeleteEventTarget] = useState<Eventverwaltung | null>(null);

  // Einladungsmanagement CRUD (per event)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editInvite, setEditInvite] = useState<EnrichedEinladungsmanagement | null>(null);
  const [deleteInviteTarget, setDeleteInviteTarget] = useState<EnrichedEinladungsmanagement | null>(null);

  // Dienstleisterbuchung CRUD (per event)
  const [buchungDialogOpen, setBuchungDialogOpen] = useState(false);
  const [editBuchung, setEditBuchung] = useState<EnrichedDienstleisterbuchung | null>(null);
  const [deleteBuchungTarget, setDeleteBuchungTarget] = useState<EnrichedDienstleisterbuchung | null>(null);

  // Derived data
  const sortedEvents = useMemo(() => {
    return [...eventverwaltung].sort((a, b) => {
      const da = a.fields.event_datum ?? '';
      const db = b.fields.event_datum ?? '';
      return da.localeCompare(db);
    });
  }, [eventverwaltung]);

  const selectedEvent = useMemo(
    () => sortedEvents.find(e => e.record_id === selectedEventId) ?? sortedEvents[0] ?? null,
    [sortedEvents, selectedEventId]
  );

  const activeEventId = selectedEvent?.record_id ?? null;

  const eventInvites = useMemo(
    () => enrichedEinladungsmanagement.filter(i => {
      if (!activeEventId) return false;
      return i.einladung_eventName === (selectedEvent?.fields.event_name ?? '') ||
        i.fields.einladung_event?.endsWith(activeEventId);
    }),
    [enrichedEinladungsmanagement, activeEventId, selectedEvent]
  );

  const eventBuchungen = useMemo(
    () => enrichedDienstleisterbuchung.filter(b => {
      if (!activeEventId) return false;
      return b.fields.buchung_event?.endsWith(activeEventId);
    }),
    [enrichedDienstleisterbuchung, activeEventId]
  );

  // KPIs
  const totalEvents = eventverwaltung.length;
  const upcomingEvents = eventverwaltung.filter(e => {
    const d = e.fields.event_datum;
    return d && d >= new Date().toISOString().slice(0, 16);
  }).length;
  const totalGuests = gaesteverwaltung.length;
  const totalBudget = eventverwaltung.reduce((s, e) => s + (e.fields.geplantes_budget ?? 0), 0);

  // Handlers
  async function handleDeleteEvent() {
    if (!deleteEventTarget) return;
    await LivingAppsService.deleteEventverwaltungEntry(deleteEventTarget.record_id);
    if (selectedEventId === deleteEventTarget.record_id) setSelectedEventId(null);
    setDeleteEventTarget(null);
    fetchAll();
  }

  async function handleDeleteInvite() {
    if (!deleteInviteTarget) return;
    await LivingAppsService.deleteEinladungsmanagementEntry(deleteInviteTarget.record_id);
    setDeleteInviteTarget(null);
    fetchAll();
  }

  async function handleDeleteBuchung() {
    if (!deleteBuchungTarget) return;
    await LivingAppsService.deleteDienstleisterbuchungEntry(deleteBuchungTarget.record_id);
    setDeleteBuchungTarget(null);
    fetchAll();
  }

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Workflow navigation */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <IconRocket size={18} className="text-primary" />
          <h2 className="font-semibold text-foreground">Workflows</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="#/intents/event-vorbereiten"
            className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow min-w-0 overflow-hidden"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <IconClipboardList size={20} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground truncate">Event vorbereiten</p>
              <p className="text-xs text-muted-foreground line-clamp-2">Gäste einladen und Dienstleister buchen</p>
            </div>
            <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
          </a>
          <a
            href="#/intents/event-abschliessen"
            className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow min-w-0 overflow-hidden"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <IconCircleCheck size={20} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground truncate">Event abschliessen</p>
              <p className="text-xs text-muted-foreground line-clamp-2">RSVPs und Buchungen finalisieren, Event abschliessen</p>
            </div>
            <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
          </a>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Events gesamt"
          value={String(totalEvents)}
          description="in der Verwaltung"
          icon={<IconCalendar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Bevorstehend"
          value={String(upcomingEvents)}
          description="Events in der Zukunft"
          icon={<IconClock size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Gäste"
          value={String(totalGuests)}
          description="Kontakte im System"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Geplantes Budget"
          value={formatCurrency(totalBudget)}
          description="über alle Events"
          icon={<IconCurrencyEuro size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">

        {/* ── Event list (master) ── */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm text-foreground">Events</h2>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 gap-1 text-xs"
              onClick={() => { setEditEvent(null); setEventDialogOpen(true); }}
            >
              <IconPlus size={13} className="shrink-0" />
              <span className="hidden sm:inline">Neu</span>
            </Button>
          </div>

          {sortedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
              <IconCalendar size={36} stroke={1.5} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Noch keine Events</p>
              <Button size="sm" variant="outline" onClick={() => { setEditEvent(null); setEventDialogOpen(true); }}>
                <IconPlus size={14} className="mr-1" /> Event erstellen
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border max-h-[calc(100vh-280px)] overflow-y-auto">
              {sortedEvents.map(event => {
                const isActive = event.record_id === (selectedEvent?.record_id);
                const statusKey = event.fields.event_status?.key;
                return (
                  <li
                    key={event.record_id}
                    onClick={() => setSelectedEventId(event.record_id)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      isActive ? 'bg-primary/8' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-foreground truncate">
                          {event.fields.event_name ?? '(Kein Name)'}
                        </span>
                        {statusKey && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${eventStatusColor(statusKey)}`}>
                            {event.fields.event_status?.label}
                          </span>
                        )}
                      </div>
                      {event.fields.event_datum && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(event.fields.event_datum)}
                          {event.fields.event_ort && ` · ${event.fields.event_ort}`}
                        </p>
                      )}
                    </div>
                    <IconChevronRight size={14} className={`shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Event detail (detail) ── */}
        {selectedEvent ? (
          <div className="space-y-4">
            {/* Event header card */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-bold text-foreground truncate">
                        {selectedEvent.fields.event_name ?? '(Kein Name)'}
                      </h1>
                      {selectedEvent.fields.event_status?.key && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${eventStatusColor(selectedEvent.fields.event_status.key)}`}>
                          {selectedEvent.fields.event_status.label}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {selectedEvent.fields.event_datum && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <IconCalendar size={14} className="shrink-0" />
                          {formatDate(selectedEvent.fields.event_datum)}
                        </span>
                      )}
                      {(selectedEvent.fields.event_strasse || selectedEvent.fields.event_ort) && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground truncate">
                          <IconMapPin size={14} className="shrink-0" />
                          {[
                            selectedEvent.fields.event_strasse,
                            selectedEvent.fields.event_hausnummer,
                            selectedEvent.fields.event_plz,
                            selectedEvent.fields.event_ort,
                          ].filter(Boolean).join(' ')}
                        </span>
                      )}
                      {selectedEvent.fields.geplantes_budget != null && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <IconCurrencyEuro size={14} className="shrink-0" />
                          Budget: {formatCurrency(selectedEvent.fields.geplantes_budget)}
                        </span>
                      )}
                    </div>
                    {selectedEvent.fields.event_beschreibung && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {selectedEvent.fields.event_beschreibung}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 gap-1.5"
                      onClick={() => { setEditEvent(selectedEvent); setEventDialogOpen(true); }}
                    >
                      <IconPencil size={13} className="shrink-0" />
                      <span className="hidden sm:inline text-xs">Bearbeiten</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                      onClick={() => setDeleteEventTarget(selectedEvent)}
                    >
                      <IconTrash size={13} className="shrink-0" />
                      <span className="hidden sm:inline text-xs">Löschen</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quick stats inside event */}
              <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
                <div className="px-4 py-3 text-center">
                  <p className="text-lg font-bold text-foreground">{eventInvites.length}</p>
                  <p className="text-xs text-muted-foreground">Einladungen</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-lg font-bold text-foreground">
                    {eventInvites.filter(i => i.fields.einladungsstatus?.key === 'zugesagt').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Zugesagt</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-lg font-bold text-foreground">{eventBuchungen.length}</p>
                  <p className="text-xs text-muted-foreground">Dienstleister</p>
                </div>
              </div>
            </div>

            {/* Gästeliste */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <IconUsers size={15} className="text-muted-foreground shrink-0" />
                  <h3 className="font-semibold text-sm">Gästeliste</h3>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">{eventInvites.length}</Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 gap-1 text-xs"
                  onClick={() => { setEditInvite(null); setInviteDialogOpen(true); }}
                >
                  <IconPlus size={13} className="shrink-0" />
                  <span className="hidden sm:inline">Einladen</span>
                </Button>
              </div>

              {eventInvites.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <IconUsers size={32} stroke={1.5} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Noch keine Einladungen</p>
                  <Button size="sm" variant="outline" onClick={() => { setEditInvite(null); setInviteDialogOpen(true); }}>
                    <IconPlus size={13} className="mr-1" /> Gast einladen
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {eventInvites.map(invite => {
                    const statusKey = invite.fields.einladungsstatus?.key;
                    return (
                      <li key={invite.record_id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <IconUsers size={13} className="text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {invite.einladung_gastName || '(Gast)'}
                          </p>
                          {invite.fields.einladungsdatum && (
                            <p className="text-xs text-muted-foreground">
                              Eingeladen: {formatDate(invite.fields.einladungsdatum)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {statusKey && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inviteStatusColor(statusKey)}`}>
                              {invite.fields.einladungsstatus?.label}
                            </span>
                          )}
                          <button
                            onClick={() => { setEditInvite(invite); setInviteDialogOpen(true); }}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                            title="Bearbeiten"
                          >
                            <IconPencil size={13} className="text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => setDeleteInviteTarget(invite)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                            title="Löschen"
                          >
                            <IconTrash size={13} className="text-destructive" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* RSVP summary row */}
              {eventInvites.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-border bg-muted/30">
                  {[
                    { key: 'zugesagt', label: 'Zugesagt', icon: IconCheck, color: 'text-emerald-600' },
                    { key: 'abgesagt', label: 'Abgesagt', icon: IconX, color: 'text-red-500' },
                    { key: 'eingeladen', label: 'Eingeladen', icon: IconClock, color: 'text-blue-500' },
                    { key: 'keine_antwort', label: 'Offen', icon: IconClock, color: 'text-amber-500' },
                  ].map(({ key, label, icon: Icon, color }) => {
                    const count = eventInvites.filter(i => i.fields.einladungsstatus?.key === key).length;
                    if (count === 0) return null;
                    return (
                      <span key={key} className={`flex items-center gap-1 text-xs ${color}`}>
                        <Icon size={12} className="shrink-0" />
                        {count} {label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dienstleister */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <IconBriefcase size={15} className="text-muted-foreground shrink-0" />
                  <h3 className="font-semibold text-sm">Dienstleister</h3>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">{eventBuchungen.length}</Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 gap-1 text-xs"
                  onClick={() => { setEditBuchung(null); setBuchungDialogOpen(true); }}
                >
                  <IconPlus size={13} className="shrink-0" />
                  <span className="hidden sm:inline">Buchen</span>
                </Button>
              </div>

              {eventBuchungen.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <IconBuilding size={32} stroke={1.5} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Noch keine Dienstleister gebucht</p>
                  <Button size="sm" variant="outline" onClick={() => { setEditBuchung(null); setBuchungDialogOpen(true); }}>
                    <IconPlus size={13} className="mr-1" /> Dienstleister buchen
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {eventBuchungen.map(buchung => {
                    const statusKey = buchung.fields.buchungsstatus?.key;
                    return (
                      <li key={buchung.record_id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <IconBuilding size={13} className="text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {buchung.buchung_dienstleisterName || '(Dienstleister)'}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-0.5">
                            {buchung.fields.gebuchte_leistung && (
                              <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                                {buchung.fields.gebuchte_leistung}
                              </span>
                            )}
                            {buchung.fields.vereinbarter_preis != null && (
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(buchung.fields.vereinbarter_preis)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {statusKey && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${buchungsStatusColor(statusKey)}`}>
                              {buchung.fields.buchungsstatus?.label}
                            </span>
                          )}
                          <button
                            onClick={() => { setEditBuchung(buchung); setBuchungDialogOpen(true); }}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                            title="Bearbeiten"
                          >
                            <IconPencil size={13} className="text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => setDeleteBuchungTarget(buchung)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                            title="Löschen"
                          >
                            <IconTrash size={13} className="text-destructive" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Cost summary */}
              {eventBuchungen.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
                  <span className="text-xs text-muted-foreground">Gesamtkosten Dienstleister</span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(eventBuchungen.reduce((s, b) => s + (b.fields.vereinbarter_preis ?? 0), 0))}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card flex flex-col items-center justify-center py-20 gap-3">
            <IconCalendar size={48} stroke={1.5} className="text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Event auswählen oder neu erstellen</p>
            <Button variant="outline" size="sm" onClick={() => { setEditEvent(null); setEventDialogOpen(true); }}>
              <IconPlus size={14} className="mr-1" /> Event erstellen
            </Button>
          </div>
        )}
      </div>

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}

      <EventverwaltungDialog
        open={eventDialogOpen}
        onClose={() => { setEventDialogOpen(false); setEditEvent(null); }}
        onSubmit={async (fields) => {
          if (editEvent) {
            await LivingAppsService.updateEventverwaltungEntry(editEvent.record_id, fields);
          } else {
            await LivingAppsService.createEventverwaltungEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editEvent?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Eventverwaltung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Eventverwaltung']}
      />

      <EinladungsmanagementDialog
        open={inviteDialogOpen}
        onClose={() => { setInviteDialogOpen(false); setEditInvite(null); }}
        onSubmit={async (fields) => {
          if (editInvite) {
            await LivingAppsService.updateEinladungsmanagementEntry(editInvite.record_id, fields);
          } else {
            const withEvent = selectedEvent
              ? { ...fields, einladung_event: createRecordUrl(APP_IDS.EVENTVERWALTUNG, selectedEvent.record_id) }
              : fields;
            await LivingAppsService.createEinladungsmanagementEntry(withEvent);
          }
          fetchAll();
        }}
        defaultValues={editInvite
          ? editInvite.fields
          : selectedEvent
            ? { einladung_event: createRecordUrl(APP_IDS.EVENTVERWALTUNG, selectedEvent.record_id) }
            : undefined
        }
        eventverwaltungList={eventverwaltung}
        gaesteverwaltungList={gaesteverwaltung}
        enablePhotoScan={AI_PHOTO_SCAN['Einladungsmanagement']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Einladungsmanagement']}
      />

      <DienstleisterbuchungDialog
        open={buchungDialogOpen}
        onClose={() => { setBuchungDialogOpen(false); setEditBuchung(null); }}
        onSubmit={async (fields) => {
          if (editBuchung) {
            await LivingAppsService.updateDienstleisterbuchungEntry(editBuchung.record_id, fields);
          } else {
            const withEvent = selectedEvent
              ? { ...fields, buchung_event: createRecordUrl(APP_IDS.EVENTVERWALTUNG, selectedEvent.record_id) }
              : fields;
            await LivingAppsService.createDienstleisterbuchungEntry(withEvent);
          }
          fetchAll();
        }}
        defaultValues={editBuchung
          ? editBuchung.fields
          : selectedEvent
            ? { buchung_event: createRecordUrl(APP_IDS.EVENTVERWALTUNG, selectedEvent.record_id) }
            : undefined
        }
        eventverwaltungList={eventverwaltung}
        dienstleisterverwaltungList={dienstleisterverwaltung}
        enablePhotoScan={AI_PHOTO_SCAN['Dienstleisterbuchung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Dienstleisterbuchung']}
      />

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={!!deleteEventTarget}
        title="Event löschen"
        description={`"${deleteEventTarget?.fields.event_name ?? 'Event'}" wirklich löschen? Alle verknüpften Einladungen und Buchungen bleiben erhalten.`}
        onConfirm={handleDeleteEvent}
        onClose={() => setDeleteEventTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteInviteTarget}
        title="Einladung löschen"
        description={`Einladung von "${deleteInviteTarget?.einladung_gastName ?? 'Gast'}" wirklich löschen?`}
        onConfirm={handleDeleteInvite}
        onClose={() => setDeleteInviteTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteBuchungTarget}
        title="Buchung löschen"
        description={`Buchung von "${deleteBuchungTarget?.buchung_dienstleisterName ?? 'Dienstleister'}" wirklich löschen?`}
        onConfirm={handleDeleteBuchung}
        onClose={() => setDeleteBuchungTarget(null)}
      />

      {/* Unused enriched var to satisfy TS */}
      {enrichedSchnelleinladung.length === -1 && null}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}
