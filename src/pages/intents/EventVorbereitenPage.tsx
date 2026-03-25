import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { Eventverwaltung, Gaesteverwaltung, Dienstleisterverwaltung, Einladungsmanagement, Dienstleisterbuchung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { BudgetTracker } from '@/components/BudgetTracker';
import { StatusBadge } from '@/components/StatusBadge';
import { EventverwaltungDialog } from '@/components/dialogs/EventverwaltungDialog';
import { GaesteverwaltungDialog } from '@/components/dialogs/GaesteverwaltungDialog';
import { DienstleisterbuchungDialog } from '@/components/dialogs/DienstleisterbuchungDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  IconCalendarEvent,
  IconUsers,
  IconBuildingStore,
  IconCheck,
  IconSearch,
  IconPlus,
  IconLoader2,
  IconArrowLeft,
  IconArrowRight,
  IconHome,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Event' },
  { label: 'Gäste' },
  { label: 'Dienstleister' },
  { label: 'Zusammenfassung' },
];

export default function EventVorbereitenPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // --- Data state ---
  const [events, setEvents] = useState<Eventverwaltung[]>([]);
  const [guests, setGuests] = useState<Gaesteverwaltung[]>([]);
  const [providers, setProviders] = useState<Dienstleisterverwaltung[]>([]);
  const [invitations, setInvitations] = useState<Einladungsmanagement[]>([]);
  const [bookings, setBookings] = useState<Dienstleisterbuchung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // --- Wizard state ---
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<Eventverwaltung | null>(null);

  // --- Step 2 state ---
  const [guestSearch, setGuestSearch] = useState('');
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  // --- Dialog state ---
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

  // --- Fetch all data ---
  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [eventsData, guestsData, providersData, invitationsData, bookingsData] = await Promise.all([
        LivingAppsService.getEventverwaltung(),
        LivingAppsService.getGaesteverwaltung(),
        LivingAppsService.getDienstleisterverwaltung(),
        LivingAppsService.getEinladungsmanagement(),
        LivingAppsService.getDienstleisterbuchung(),
      ]);
      setEvents(eventsData);
      setGuests(guestsData);
      setProviders(providersData);
      setInvitations(invitationsData);
      setBookings(bookingsData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // --- Deep-link: read ?eventId and ?step from URL on mount ---
  useEffect(() => {
    const urlEventId = searchParams.get('eventId');
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);

    if (urlEventId && !loading && events.length > 0) {
      const found = events.find(e => e.record_id === urlEventId);
      if (found) {
        setSelectedEvent(found);
        if (urlStep >= 2 && urlStep <= 4) {
          setCurrentStep(urlStep);
        } else {
          setCurrentStep(2);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, events]);

  // --- Derived: invitations for selected event ---
  const eventInvitations = useMemo(() => {
    if (!selectedEvent) return [];
    const eventUrl = createRecordUrl(APP_IDS.EVENTVERWALTUNG, selectedEvent.record_id);
    return invitations.filter(inv => inv.fields.einladung_event === eventUrl);
  }, [invitations, selectedEvent]);

  // --- Derived: already-invited guest IDs for selected event ---
  const invitedGuestIds = useMemo(() => {
    const ids = new Set<string>();
    eventInvitations.forEach(inv => {
      const guestId = extractRecordId(inv.fields.einladung_gast);
      if (guestId) ids.add(guestId);
    });
    return ids;
  }, [eventInvitations]);

  // --- Derived: invitation status map by guest ID ---
  const invitationStatusByGuestId = useMemo(() => {
    const map = new Map<string, Einladungsmanagement>();
    eventInvitations.forEach(inv => {
      const guestId = extractRecordId(inv.fields.einladung_gast);
      if (guestId) map.set(guestId, inv);
    });
    return map;
  }, [eventInvitations]);

  // --- Derived: bookings for selected event ---
  const eventBookings = useMemo(() => {
    if (!selectedEvent) return [];
    const eventUrl = createRecordUrl(APP_IDS.EVENTVERWALTUNG, selectedEvent.record_id);
    return bookings.filter(b => b.fields.buchung_event === eventUrl);
  }, [bookings, selectedEvent]);

  // --- Derived: total booked cost ---
  const totalBooked = useMemo(() => {
    return eventBookings.reduce((sum, b) => sum + (b.fields.vereinbarter_preis ?? 0), 0);
  }, [eventBookings]);

  // --- Derived: filtered guests for step 2 ---
  const filteredGuests = useMemo(() => {
    if (!guestSearch) return guests;
    const q = guestSearch.toLowerCase();
    return guests.filter(g => {
      const f = g.fields;
      return (
        (f.vorname ?? '').toLowerCase().includes(q) ||
        (f.nachname ?? '').toLowerCase().includes(q) ||
        (f.email ?? '').toLowerCase().includes(q) ||
        (f.unternehmen ?? '').toLowerCase().includes(q)
      );
    });
  }, [guests, guestSearch]);

  // --- Initialize selected guests when entering step 2 ---
  useEffect(() => {
    if (currentStep === 2 && invitedGuestIds.size > 0) {
      setSelectedGuestIds(new Set(invitedGuestIds));
    }
  }, [currentStep, invitedGuestIds]);

  // --- Handlers ---
  function handleSelectEvent(id: string) {
    const event = events.find(e => e.record_id === id);
    if (event) {
      setSelectedEvent(event);
      setInviteResult(null);
      setCurrentStep(2);
    }
  }

  function toggleGuest(guestId: string) {
    setSelectedGuestIds(prev => {
      const next = new Set(prev);
      if (next.has(guestId)) {
        next.delete(guestId);
      } else {
        next.add(guestId);
      }
      return next;
    });
  }

  async function handleInviteAll() {
    if (!selectedEvent) return;
    setInviting(true);
    setInviteResult(null);

    const eventUrl = createRecordUrl(APP_IDS.EVENTVERWALTUNG, selectedEvent.record_id);
    const today = new Date().toISOString().slice(0, 10);
    const toInvite = Array.from(selectedGuestIds).filter(id => !invitedGuestIds.has(id));

    try {
      await Promise.all(
        toInvite.map(guestId =>
          LivingAppsService.createEinladungsmanagementEntry({
            einladung_event: eventUrl,
            einladung_gast: createRecordUrl(APP_IDS.GAESTEVERWALTUNG, guestId),
            einladungsdatum: today,
            einladungsstatus: 'eingeladen',
          })
        )
      );
      await fetchAll();
      setInviteResult(`${toInvite.length} Einladung${toInvite.length !== 1 ? 'en' : ''} erstellt`);
    } catch (err) {
      setInviteResult(`Fehler: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setInviting(false);
    }
  }

  // --- Invitation status breakdown for summary ---
  const invitationBreakdown = useMemo(() => {
    const counts: Record<string, number> = {
      zugesagt: 0,
      abgesagt: 0,
      eingeladen: 0,
      keine_antwort: 0,
    };
    eventInvitations.forEach(inv => {
      const key = typeof inv.fields.einladungsstatus === 'object' && inv.fields.einladungsstatus !== null
        ? (inv.fields.einladungsstatus as { key: string }).key
        : (inv.fields.einladungsstatus as string | undefined) ?? 'keine_antwort';
      if (key in counts) counts[key]++;
      else counts['keine_antwort']++;
    });
    return counts;
  }, [eventInvitations]);

  // --- Render steps ---
  function renderStep1() {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4 overflow-hidden">
          <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
            <IconCalendarEvent size={18} className="text-primary" stroke={2} />
            Event auswählen
          </h2>
          <EntitySelectStep
            items={events.map(e => ({
              id: e.record_id,
              title: e.fields.event_name ?? '(Kein Name)',
              subtitle: [
                e.fields.event_datum ? formatDate(e.fields.event_datum) : null,
                e.fields.event_ort ?? null,
              ].filter(Boolean).join(' · '),
              status: e.fields.event_status
                ? { key: (e.fields.event_status as { key: string; label: string }).key, label: (e.fields.event_status as { key: string; label: string }).label }
                : undefined,
              stats: [
                {
                  label: 'Gäste',
                  value: invitations.filter(inv => inv.fields.einladung_event === createRecordUrl(APP_IDS.EVENTVERWALTUNG, e.record_id)).length,
                },
                {
                  label: 'Budget',
                  value: e.fields.geplantes_budget != null ? formatCurrency(e.fields.geplantes_budget) : '—',
                },
              ],
              icon: <IconCalendarEvent size={18} className="text-primary" stroke={2} />,
            }))}
            onSelect={handleSelectEvent}
            searchPlaceholder="Event suchen..."
            emptyIcon={<IconCalendarEvent size={32} />}
            emptyText="Noch keine Events vorhanden."
            createLabel="Neu erstellen"
            onCreateNew={() => setEventDialogOpen(true)}
            createDialog={
              <EventverwaltungDialog
                open={eventDialogOpen}
                onClose={() => setEventDialogOpen(false)}
                onSubmit={async (fields) => {
                  await LivingAppsService.createEventverwaltungEntry(fields);
                  await fetchAll();
                }}
                enablePhotoScan={AI_PHOTO_SCAN['Eventverwaltung']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Eventverwaltung']}
              />
            }
          />
        </div>
      </div>
    );
  }

  function renderStep2() {
    if (!selectedEvent) return null;
    const toInviteCount = Array.from(selectedGuestIds).filter(id => !invitedGuestIds.has(id)).length;

    return (
      <div className="space-y-4">
        {/* Event context */}
        <div className="rounded-xl border bg-primary/5 border-primary/20 p-3 flex items-center gap-2 overflow-hidden">
          <IconCalendarEvent size={16} className="text-primary shrink-0" stroke={2} />
          <span className="text-sm font-medium truncate min-w-0">{selectedEvent.fields.event_name ?? '—'}</span>
          {selectedEvent.fields.event_datum && (
            <span className="text-xs text-muted-foreground shrink-0">{formatDate(selectedEvent.fields.event_datum)}</span>
          )}
        </div>

        {/* Guest list */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-base flex items-center gap-2 mb-3">
              <IconUsers size={18} className="text-primary" stroke={2} />
              Gäste einladen
            </h2>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Gast suchen (Name, E-Mail, Firma)..."
                  value={guestSearch}
                  onChange={e => setGuestSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" className="shrink-0 gap-1.5" onClick={() => setGuestDialogOpen(true)}>
                <IconPlus size={15} />
                Neu erstellen
              </Button>
            </div>
          </div>

          <GaesteverwaltungDialog
            open={guestDialogOpen}
            onClose={() => setGuestDialogOpen(false)}
            onSubmit={async (fields) => {
              await LivingAppsService.createGaesteverwaltungEntry(fields);
              await fetchAll();
            }}
            enablePhotoScan={AI_PHOTO_SCAN['Gaesteverwaltung']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Gaesteverwaltung']}
          />

          {filteredGuests.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Keine Gäste gefunden.
            </div>
          ) : (
            <div className="divide-y max-h-80 overflow-y-auto">
              {filteredGuests.map(guest => {
                const isChecked = selectedGuestIds.has(guest.record_id);
                const existingInv = invitationStatusByGuestId.get(guest.record_id);
                const statusObj = existingInv?.fields.einladungsstatus;
                const statusKey = statusObj && typeof statusObj === 'object' && 'key' in statusObj
                  ? (statusObj as { key: string; label: string }).key
                  : typeof statusObj === 'string' ? statusObj : undefined;
                const statusLabel = statusObj && typeof statusObj === 'object' && 'label' in statusObj
                  ? (statusObj as { key: string; label: string }).label
                  : statusKey;

                return (
                  <button
                    key={guest.record_id}
                    onClick={() => toggleGuest(guest.record_id)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isChecked ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                    }`}>
                      {isChecked && <IconCheck size={12} stroke={3} className="text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">
                          {[guest.fields.vorname, guest.fields.nachname].filter(Boolean).join(' ') || '(Kein Name)'}
                        </span>
                        {existingInv && statusKey && (
                          <StatusBadge statusKey={statusKey} label={statusLabel} />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {[guest.fields.email, guest.fields.unternehmen].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Running count + actions */}
        <div className="rounded-xl border bg-card p-4 space-y-3 overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{selectedGuestIds.size}</span> Gäste ausgewählt
              {toInviteCount > 0 && (
                <span className="ml-1">({toInviteCount} neu einzuladen)</span>
              )}
            </span>
            {inviteResult && (
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                inviteResult.startsWith('Fehler') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}>
                {inviteResult}
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => setCurrentStep(1)}
            >
              <IconArrowLeft size={15} />
              Zurück
            </Button>
            <Button
              className="flex-1 gap-1.5"
              disabled={inviting || toInviteCount === 0}
              onClick={handleInviteAll}
            >
              {inviting ? (
                <IconLoader2 size={15} className="animate-spin" />
              ) : (
                <IconUsers size={15} />
              )}
              {inviting ? 'Einladungen werden erstellt...' : `Alle einladen (${toInviteCount})`}
            </Button>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => setCurrentStep(3)}
            >
              Weiter
              <IconArrowRight size={15} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  function renderStep3() {
    if (!selectedEvent) return null;
    const budget = selectedEvent.fields.geplantes_budget ?? 0;

    return (
      <div className="space-y-4">
        {/* Event context */}
        <div className="rounded-xl border bg-primary/5 border-primary/20 p-3 flex items-center gap-2 overflow-hidden">
          <IconCalendarEvent size={16} className="text-primary shrink-0" stroke={2} />
          <span className="text-sm font-medium truncate min-w-0">{selectedEvent.fields.event_name ?? '—'}</span>
          {selectedEvent.fields.event_datum && (
            <span className="text-xs text-muted-foreground shrink-0">{formatDate(selectedEvent.fields.event_datum)}</span>
          )}
        </div>

        {/* Budget tracker */}
        <BudgetTracker budget={budget} booked={totalBooked} label="Gesamtbudget" />

        {/* Existing bookings */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between gap-2">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <IconBuildingStore size={18} className="text-primary" stroke={2} />
              Dienstleister
              {eventBookings.length > 0 && (
                <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {eventBookings.length}
                </span>
              )}
            </h2>
            <Button
              variant="outline"
              className="gap-1.5 shrink-0"
              onClick={() => setBookingDialogOpen(true)}
            >
              <IconPlus size={15} />
              Neu buchen
            </Button>
          </div>

          <DienstleisterbuchungDialog
            open={bookingDialogOpen}
            onClose={() => setBookingDialogOpen(false)}
            onSubmit={async (fields) => {
              await LivingAppsService.createDienstleisterbuchungEntry(fields);
              await fetchAll();
            }}
            defaultValues={{
              buchung_event: createRecordUrl(APP_IDS.EVENTVERWALTUNG, selectedEvent.record_id),
            }}
            eventverwaltungList={events}
            dienstleisterverwaltungList={providers}
            enablePhotoScan={AI_PHOTO_SCAN['Dienstleisterbuchung']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Dienstleisterbuchung']}
          />

          {eventBookings.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Noch keine Buchungen für dieses Event.
            </div>
          ) : (
            <div className="divide-y overflow-x-auto">
              {eventBookings.map(booking => {
                const statusObj = booking.fields.buchungsstatus;
                const statusKey = statusObj && typeof statusObj === 'object' && 'key' in statusObj
                  ? (statusObj as { key: string; label: string }).key
                  : typeof statusObj === 'string' ? statusObj : undefined;
                const statusLabel = statusObj && typeof statusObj === 'object' && 'label' in statusObj
                  ? (statusObj as { key: string; label: string }).label
                  : statusKey;
                const provider = providers.find(p =>
                  p.record_id === extractRecordId(booking.fields.buchung_dienstleister)
                );

                return (
                  <div key={booking.record_id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">
                          {provider?.fields.firmenname ?? '(Unbekannt)'}
                        </span>
                        {statusKey && (
                          <StatusBadge statusKey={statusKey} label={statusLabel} />
                        )}
                      </div>
                      {booking.fields.gebuchte_leistung && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {booking.fields.gebuchte_leistung}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-semibold shrink-0">
                      {booking.fields.vereinbarter_preis != null
                        ? formatCurrency(booking.fields.vereinbarter_preis)
                        : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => setCurrentStep(2)}>
            <IconArrowLeft size={15} />
            Zurück
          </Button>
          <Button className="flex-1 gap-1.5" onClick={() => setCurrentStep(4)}>
            Weiter zur Zusammenfassung
            <IconArrowRight size={15} />
          </Button>
        </div>
      </div>
    );
  }

  function renderStep4() {
    if (!selectedEvent) return null;
    const budget = selectedEvent.fields.geplantes_budget ?? 0;
    const remaining = budget - totalBooked;

    return (
      <div className="space-y-4">
        {/* Header summary card */}
        <div className="rounded-xl border bg-card p-5 overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconCalendarEvent size={20} className="text-primary" stroke={2} />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-base truncate">{selectedEvent.fields.event_name ?? '—'}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[
                  selectedEvent.fields.event_datum ? formatDate(selectedEvent.fields.event_datum) : null,
                  selectedEvent.fields.event_ort ?? null,
                ].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Invitations */}
          <div className="rounded-xl border bg-card p-4 overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <IconUsers size={16} className="text-primary" stroke={2} />
              <span className="font-semibold text-sm">Einladungen</span>
            </div>
            <p className="text-2xl font-bold mb-2">{eventInvitations.length}</p>
            <div className="space-y-1.5">
              {[
                { key: 'zugesagt', label: 'Zugesagt', color: 'text-green-600' },
                { key: 'abgesagt', label: 'Abgesagt', color: 'text-red-600' },
                { key: 'eingeladen', label: 'Eingeladen', color: 'text-blue-600' },
                { key: 'keine_antwort', label: 'Keine Antwort', color: 'text-muted-foreground' },
              ].map(({ key, label, color }) => (
                invitationBreakdown[key] > 0 && (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`font-semibold ${color}`}>{invitationBreakdown[key]}</span>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Bookings */}
          <div className="rounded-xl border bg-card p-4 overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <IconBuildingStore size={16} className="text-primary" stroke={2} />
              <span className="font-semibold text-sm">Buchungen</span>
            </div>
            <p className="text-2xl font-bold mb-2">{eventBookings.length}</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Gesamtkosten</span>
                <span className="font-semibold">{formatCurrency(totalBooked)}</span>
              </div>
              {budget > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Verbleibend</span>
                  <span className={`font-semibold ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(remaining)}
                  </span>
                </div>
              )}
              {budget > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-semibold">{formatCurrency(budget)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Budget tracker */}
        {budget > 0 && (
          <BudgetTracker budget={budget} booked={totalBooked} label="Budgetübersicht" />
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => setCurrentStep(3)}>
            <IconArrowLeft size={15} />
            Zurück
          </Button>
          <Button className="flex-1 gap-1.5" onClick={() => navigate('/')}>
            <IconHome size={15} />
            Fertig
          </Button>
        </div>
      </div>
    );
  }

  return (
    <IntentWizardShell
      title="Event vorbereiten"
      subtitle="Schritt für Schritt zum perfekten Event"
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}
    </IntentWizardShell>
  );
}
