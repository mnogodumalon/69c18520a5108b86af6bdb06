import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Eventverwaltung, Gaesteverwaltung, Dienstleisterverwaltung } from '@/types/app';
import type { EnrichedEinladungsmanagement, EnrichedDienstleisterbuchung } from '@/types/enriched';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { enrichEinladungsmanagement, enrichDienstleisterbuchung } from '@/lib/enrich';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { BudgetTracker } from '@/components/BudgetTracker';
import { StatusBadge } from '@/components/StatusBadge';
import { EventverwaltungDialog } from '@/components/dialogs/EventverwaltungDialog';
import { EinladungsmanagementDialog } from '@/components/dialogs/EinladungsmanagementDialog';
import { DienstleisterbuchungDialog } from '@/components/dialogs/DienstleisterbuchungDialog';
import { Button } from '@/components/ui/button';
import {
  IconCalendar,
  IconCheck,
  IconMapPin,
  IconUsers,
  IconBuildingStore,
  IconArrowLeft,
  IconArrowRight,
  IconCircleCheck,
  IconHome,
  IconLoader2,
  IconUserCheck,
  IconUserX,
  IconUserQuestion,
  IconCurrencyEuro,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Event' },
  { label: 'RSVPs' },
  { label: 'Buchungen' },
  { label: 'Abschluss' },
];

export default function EventAbschliessenPage() {
  const [searchParams] = useSearchParams();
  const {
    eventverwaltung,
    einladungsmanagement,
    dienstleisterbuchung,
    gaesteverwaltung,
    dienstleisterverwaltung,
    eventverwaltungMap,
    gaesteverwaltungMap,
    dienstleisterverwaltungMap,
    loading,
    error,
    fetchAll,
  } = useDashboardData();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [savingRsvp, setSavingRsvp] = useState<string | null>(null);
  const [savingBuchung, setSavingBuchung] = useState<string | null>(null);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [einladungDialogOpen, setEinladungDialogOpen] = useState(false);
  const [buchungDialogOpen, setBuchungDialogOpen] = useState(false);

  // Deep-link: read eventId and step from URL on mount
  useEffect(() => {
    const urlEventId = searchParams.get('eventId');
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    if (urlEventId) {
      setSelectedEventId(urlEventId);
      if (urlStep >= 2 && urlStep <= 4) {
        setCurrentStep(urlStep);
      } else {
        setCurrentStep(2);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedEvent = useMemo(
    () => eventverwaltung.find(e => e.record_id === selectedEventId) ?? null,
    [eventverwaltung, selectedEventId]
  );

  const eventInvites = useMemo((): EnrichedEinladungsmanagement[] => {
    if (!selectedEventId) return [];
    const filtered = einladungsmanagement.filter(inv => {
      const eventId = extractRecordId(inv.fields.einladung_event);
      return eventId === selectedEventId;
    });
    return enrichEinladungsmanagement(filtered, { eventverwaltungMap, gaesteverwaltungMap });
  }, [einladungsmanagement, selectedEventId, eventverwaltungMap, gaesteverwaltungMap]);

  const eventBuchungen = useMemo((): EnrichedDienstleisterbuchung[] => {
    if (!selectedEventId) return [];
    const filtered = dienstleisterbuchung.filter(b => {
      const eventId = extractRecordId(b.fields.buchung_event);
      return eventId === selectedEventId;
    });
    return enrichDienstleisterbuchung(filtered, { eventverwaltungMap, dienstleisterverwaltungMap });
  }, [dienstleisterbuchung, selectedEventId, eventverwaltungMap, dienstleisterverwaltungMap]);

  // RSVP counts
  const rsvpCounts = useMemo(() => {
    const zugesagt = eventInvites.filter(i => i.fields.einladungsstatus?.key === 'zugesagt').length;
    const abgesagt = eventInvites.filter(i => i.fields.einladungsstatus?.key === 'abgesagt').length;
    const keine_antwort = eventInvites.filter(
      i => !i.fields.einladungsstatus || i.fields.einladungsstatus.key === 'keine_antwort' || i.fields.einladungsstatus.key === 'eingeladen'
    ).length;
    return { total: eventInvites.length, zugesagt, abgesagt, keine_antwort };
  }, [eventInvites]);

  // Booking totals
  const buchungTotals = useMemo(() => {
    const confirmed = eventBuchungen.filter(
      b => b.fields.buchungsstatus?.key === 'bestaetigt' || b.fields.buchungsstatus?.key === 'abgeschlossen'
    );
    const totalCost = eventBuchungen.reduce((sum, b) => sum + (b.fields.vereinbarter_preis ?? 0), 0);
    const confirmedCost = confirmed.reduce((sum, b) => sum + (b.fields.vereinbarter_preis ?? 0), 0);
    return { total: eventBuchungen.length, totalCost, confirmedCost };
  }, [eventBuchungen]);

  const handleSelectEvent = (id: string) => {
    setSelectedEventId(id);
    setCurrentStep(2);
  };

  const handleUpdateRsvp = async (recordId: string, status: string) => {
    setSavingRsvp(recordId);
    try {
      await LivingAppsService.updateEinladungsmanagementEntry(recordId, { einladungsstatus: status });
      await fetchAll();
    } finally {
      setSavingRsvp(null);
    }
  };

  const handleUpdateBuchung = async (recordId: string, status: string) => {
    setSavingBuchung(recordId);
    try {
      await LivingAppsService.updateDienstleisterbuchungEntry(recordId, { buchungsstatus: status });
      await fetchAll();
    } finally {
      setSavingBuchung(null);
    }
  };

  const handleMarkComplete = async () => {
    if (!selectedEventId) return;
    setMarkingComplete(true);
    try {
      await LivingAppsService.updateEventverwaltungEntry(selectedEventId, { event_status: 'abgeschlossen' });
      await fetchAll();
      setCompleted(true);
    } finally {
      setMarkingComplete(false);
    }
  };

  const eventSubtitle = (event: Eventverwaltung) => {
    const parts: string[] = [];
    if (event.fields.event_datum) parts.push(formatDate(event.fields.event_datum));
    if (event.fields.event_ort) parts.push(event.fields.event_ort);
    return parts.join(' · ');
  };

  const inviteCountForEvent = (eventId: string) =>
    einladungsmanagement.filter(i => extractRecordId(i.fields.einladung_event) === eventId).length;

  const buchungCountForEvent = (eventId: string) =>
    dienstleisterbuchung.filter(b => extractRecordId(b.fields.buchung_event) === eventId).length;

  // Render step content
  const renderStep = () => {
    if (currentStep === 1) {
      return (
        <div className="space-y-4">
          <EntitySelectStep
            items={eventverwaltung.map(e => ({
              id: e.record_id,
              title: e.fields.event_name ?? '(Kein Name)',
              subtitle: eventSubtitle(e),
              status: e.fields.event_status
                ? { key: e.fields.event_status.key, label: e.fields.event_status.label }
                : undefined,
              stats: [
                { label: 'Einladungen', value: inviteCountForEvent(e.record_id) },
                { label: 'Buchungen', value: buchungCountForEvent(e.record_id) },
              ],
              icon: <IconCalendar size={18} className="text-primary" />,
            }))}
            onSelect={handleSelectEvent}
            searchPlaceholder="Event suchen..."
            emptyText="Keine Events gefunden."
            emptyIcon={<IconCalendar size={32} />}
            createLabel="Neues Event anlegen"
            onCreateNew={() => setEventDialogOpen(true)}
            createDialog={
              <EventverwaltungDialog
                open={eventDialogOpen}
                onClose={() => setEventDialogOpen(false)}
                onSubmit={async (fields) => {
                  const result = await LivingAppsService.createEventverwaltungEntry(fields);
                  await fetchAll();
                  const newId = Object.keys(result)[0];
                  if (newId) {
                    setSelectedEventId(newId);
                    setCurrentStep(2);
                  }
                  setEventDialogOpen(false);
                }}
                enablePhotoScan={AI_PHOTO_SCAN['Eventverwaltung']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Eventverwaltung']}
              />
            }
          />
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border bg-card p-3 flex flex-col items-center gap-1 overflow-hidden">
              <IconUsers size={18} className="text-muted-foreground" />
              <span className="text-2xl font-bold">{rsvpCounts.total}</span>
              <span className="text-xs text-muted-foreground">Eingeladen</span>
            </div>
            <div className="rounded-xl border bg-card p-3 flex flex-col items-center gap-1 overflow-hidden">
              <IconUserCheck size={18} className="text-green-600" />
              <span className="text-2xl font-bold text-green-600">{rsvpCounts.zugesagt}</span>
              <span className="text-xs text-muted-foreground">Zugesagt</span>
            </div>
            <div className="rounded-xl border bg-card p-3 flex flex-col items-center gap-1 overflow-hidden">
              <IconUserX size={18} className="text-red-500" />
              <span className="text-2xl font-bold text-red-500">{rsvpCounts.abgesagt}</span>
              <span className="text-xs text-muted-foreground">Abgesagt</span>
            </div>
            <div className="rounded-xl border bg-card p-3 flex flex-col items-center gap-1 overflow-hidden">
              <IconUserQuestion size={18} className="text-amber-500" />
              <span className="text-2xl font-bold text-amber-500">{rsvpCounts.keine_antwort}</span>
              <span className="text-xs text-muted-foreground">Keine Antwort</span>
            </div>
          </div>

          {/* Invite list */}
          <div className="space-y-2">
            {eventInvites.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <IconUsers size={32} className="mx-auto mb-2 opacity-30" />
                Noch keine Einladungen für dieses Event.
              </div>
            ) : (
              <div className="space-y-2">
                {eventInvites.map(invite => {
                  const isSaving = savingRsvp === invite.record_id;
                  const statusKey = invite.fields.einladungsstatus?.key;
                  return (
                    <div
                      key={invite.record_id}
                      className="flex items-center gap-3 p-3 rounded-xl border bg-card overflow-hidden"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <IconUsers size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {invite.einladung_gastName || '(Unbekannter Gast)'}
                        </p>
                        {invite.fields.einladungsstatus && (
                          <StatusBadge
                            statusKey={invite.fields.einladungsstatus.key}
                            label={invite.fields.einladungsstatus.label}
                          />
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant={statusKey === 'zugesagt' ? 'default' : 'outline'}
                          disabled={isSaving || statusKey === 'zugesagt'}
                          onClick={() => handleUpdateRsvp(invite.record_id, 'zugesagt')}
                          className="gap-1.5"
                        >
                          {isSaving ? (
                            <IconLoader2 size={14} className="animate-spin" />
                          ) : (
                            <IconCheck size={14} />
                          )}
                          <span className="hidden sm:inline">Zugesagt</span>
                        </Button>
                        <Button
                          size="sm"
                          variant={statusKey === 'abgesagt' ? 'destructive' : 'outline'}
                          disabled={isSaving || statusKey === 'abgesagt'}
                          onClick={() => handleUpdateRsvp(invite.record_id, 'abgesagt')}
                          className="gap-1.5"
                        >
                          {isSaving ? (
                            <IconLoader2 size={14} className="animate-spin" />
                          ) : (
                            <IconUserX size={14} />
                          )}
                          <span className="hidden sm:inline">Abgesagt</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Neu einladen button */}
          <Button
            variant="outline"
            onClick={() => setEinladungDialogOpen(true)}
            className="w-full gap-2"
          >
            <IconUsers size={16} />
            Neu einladen
          </Button>
          <EinladungsmanagementDialog
            open={einladungDialogOpen}
            onClose={() => setEinladungDialogOpen(false)}
            onSubmit={async (fields) => {
              await LivingAppsService.createEinladungsmanagementEntry(fields);
              await fetchAll();
              setEinladungDialogOpen(false);
            }}
            defaultValues={
              selectedEventId
                ? { einladung_event: createRecordUrl(APP_IDS.EVENTVERWALTUNG, selectedEventId) }
                : undefined
            }
            eventverwaltungList={eventverwaltung}
            gaesteverwaltungList={gaesteverwaltung as Gaesteverwaltung[]}
            enablePhotoScan={AI_PHOTO_SCAN['Einladungsmanagement']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Einladungsmanagement']}
          />

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(1)} className="gap-2">
              <IconArrowLeft size={16} />
              Zurück
            </Button>
            <Button onClick={() => setCurrentStep(3)} className="gap-2">
              Weiter
              <IconArrowRight size={16} />
            </Button>
          </div>
        </div>
      );
    }

    if (currentStep === 3) {
      const budget = selectedEvent?.fields.geplantes_budget ?? 0;
      return (
        <div className="space-y-4">
          <BudgetTracker
            budget={budget}
            booked={buchungTotals.confirmedCost}
            label="Budget"
          />

          {/* Booking list */}
          <div className="space-y-2">
            {eventBuchungen.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <IconBuildingStore size={32} className="mx-auto mb-2 opacity-30" />
                Noch keine Buchungen für dieses Event.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="space-y-2 min-w-0">
                  {eventBuchungen.map(buchung => {
                    const isSaving = savingBuchung === buchung.record_id;
                    const statusKey = buchung.fields.buchungsstatus?.key;
                    return (
                      <div
                        key={buchung.record_id}
                        className="flex items-start gap-3 p-3 rounded-xl border bg-card overflow-hidden"
                      >
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <IconBuildingStore size={16} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {buchung.buchung_dienstleisterName || '(Unbekannt)'}
                          </p>
                          {buchung.fields.gebuchte_leistung && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {buchung.fields.gebuchte_leistung}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {buchung.fields.buchungsstatus && (
                              <StatusBadge
                                statusKey={buchung.fields.buchungsstatus.key}
                                label={buchung.fields.buchungsstatus.label}
                              />
                            )}
                            {buchung.fields.vereinbarter_preis != null && (
                              <span className="text-xs font-semibold text-foreground flex items-center gap-0.5">
                                <IconCurrencyEuro size={12} />
                                {formatCurrency(buchung.fields.vereinbarter_preis)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant={statusKey === 'bestaetigt' ? 'default' : 'outline'}
                            disabled={isSaving || statusKey === 'bestaetigt'}
                            onClick={() => handleUpdateBuchung(buchung.record_id, 'bestaetigt')}
                            className="gap-1.5 text-xs"
                          >
                            {isSaving ? (
                              <IconLoader2 size={12} className="animate-spin" />
                            ) : (
                              <IconCheck size={12} />
                            )}
                            Bestätigen
                          </Button>
                          <Button
                            size="sm"
                            variant={statusKey === 'abgesagt' ? 'destructive' : 'outline'}
                            disabled={isSaving || statusKey === 'abgesagt'}
                            onClick={() => handleUpdateBuchung(buchung.record_id, 'abgesagt')}
                            className="gap-1.5 text-xs"
                          >
                            {isSaving ? (
                              <IconLoader2 size={12} className="animate-spin" />
                            ) : (
                              <IconUserX size={12} />
                            )}
                            Stornieren
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Neu buchen button */}
          <Button
            variant="outline"
            onClick={() => setBuchungDialogOpen(true)}
            className="w-full gap-2"
          >
            <IconBuildingStore size={16} />
            Neu buchen
          </Button>
          <DienstleisterbuchungDialog
            open={buchungDialogOpen}
            onClose={() => setBuchungDialogOpen(false)}
            onSubmit={async (fields) => {
              await LivingAppsService.createDienstleisterbuchungEntry(fields);
              await fetchAll();
              setBuchungDialogOpen(false);
            }}
            defaultValues={
              selectedEventId
                ? { buchung_event: createRecordUrl(APP_IDS.EVENTVERWALTUNG, selectedEventId) }
                : undefined
            }
            eventverwaltungList={eventverwaltung}
            dienstleisterverwaltungList={dienstleisterverwaltung as Dienstleisterverwaltung[]}
            enablePhotoScan={AI_PHOTO_SCAN['Dienstleisterbuchung']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Dienstleisterbuchung']}
          />

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(2)} className="gap-2">
              <IconArrowLeft size={16} />
              Zurück
            </Button>
            <Button onClick={() => setCurrentStep(4)} className="gap-2">
              Weiter
              <IconArrowRight size={16} />
            </Button>
          </div>
        </div>
      );
    }

    if (currentStep === 4) {
      if (completed) {
        return (
          <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <IconCircleCheck size={36} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Event abgeschlossen!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedEvent?.fields.event_name ?? 'Das Event'} wurde erfolgreich als abgeschlossen markiert.
              </p>
            </div>
            <a href="#/">
              <Button className="gap-2">
                <IconHome size={16} />
                Zurück zur Übersicht
              </Button>
            </a>
          </div>
        );
      }

      const budget = selectedEvent?.fields.geplantes_budget ?? 0;
      const totalCost = buchungTotals.totalCost;
      const budgetRemaining = budget - totalCost;
      const isAlreadyAbgeschlossen = selectedEvent?.fields.event_status?.key === 'abgeschlossen';

      return (
        <div className="space-y-4">
          {/* Event summary card */}
          <div className="rounded-xl border bg-card p-4 space-y-3 overflow-hidden">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <IconCalendar size={18} className="text-primary shrink-0" />
              <span className="truncate">{selectedEvent?.fields.event_name ?? '—'}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {selectedEvent?.fields.event_datum && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <IconCalendar size={14} className="shrink-0" />
                  <span>{formatDate(selectedEvent.fields.event_datum)}</span>
                </div>
              )}
              {selectedEvent?.fields.event_ort && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <IconMapPin size={14} className="shrink-0" />
                  <span className="truncate">{selectedEvent.fields.event_ort}</span>
                </div>
              )}
            </div>
            {selectedEvent?.fields.event_status && (
              <StatusBadge
                statusKey={selectedEvent.fields.event_status.key}
                label={selectedEvent.fields.event_status.label}
              />
            )}
          </div>

          {/* Guest attendance summary */}
          <div className="rounded-xl border bg-card p-4 space-y-3 overflow-hidden">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <IconUsers size={16} className="text-primary shrink-0" />
              Gästeliste
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-green-50 p-2">
                <p className="text-xl font-bold text-green-700">{rsvpCounts.zugesagt}</p>
                <p className="text-xs text-green-600">Zugesagt</p>
              </div>
              <div className="rounded-lg bg-red-50 p-2">
                <p className="text-xl font-bold text-red-600">{rsvpCounts.abgesagt}</p>
                <p className="text-xs text-red-500">Abgesagt</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-2">
                <p className="text-xl font-bold text-amber-600">{rsvpCounts.keine_antwort}</p>
                <p className="text-xs text-amber-500">Keine Antwort</p>
              </div>
            </div>
          </div>

          {/* Bookings summary */}
          <div className="rounded-xl border bg-card p-4 space-y-3 overflow-hidden">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <IconBuildingStore size={16} className="text-primary shrink-0" />
              Dienstleister
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Buchungen gesamt</p>
                <p className="font-semibold">{buchungTotals.total}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Gesamtkosten</p>
                <p className="font-semibold">{formatCurrency(totalCost)}</p>
              </div>
            </div>
            {budget > 0 && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <IconCurrencyEuro size={14} />
                    Budget verbleibend
                  </span>
                  <span className={`font-semibold ${budgetRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(budgetRemaining)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Mark complete button */}
          {isAlreadyAbgeschlossen ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3">
              <IconCircleCheck size={20} className="text-slate-500 shrink-0" />
              <p className="text-sm text-slate-600">Dieses Event ist bereits als abgeschlossen markiert.</p>
            </div>
          ) : (
            <Button
              className="w-full gap-2 h-12 text-base"
              onClick={handleMarkComplete}
              disabled={markingComplete}
            >
              {markingComplete ? (
                <IconLoader2 size={18} className="animate-spin" />
              ) : (
                <IconCircleCheck size={18} />
              )}
              Event als abgeschlossen markieren
            </Button>
          )}

          {/* Navigation */}
          <div className="flex justify-start pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(3)} className="gap-2">
              <IconArrowLeft size={16} />
              Zurück
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <IntentWizardShell
      title="Event abschliessen"
      subtitle={
        selectedEvent
          ? `${selectedEvent.fields.event_name ?? 'Event'} finalisieren`
          : 'Event auswählen und abschliessen'
      }
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {renderStep()}
    </IntentWizardShell>
  );
}
