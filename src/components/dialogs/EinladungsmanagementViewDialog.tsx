import type { Einladungsmanagement, Eventverwaltung, Gaesteverwaltung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface EinladungsmanagementViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Einladungsmanagement | null;
  onEdit: (record: Einladungsmanagement) => void;
  eventverwaltungList: Eventverwaltung[];
  gaesteverwaltungList: Gaesteverwaltung[];
}

export function EinladungsmanagementViewDialog({ open, onClose, record, onEdit, eventverwaltungList, gaesteverwaltungList }: EinladungsmanagementViewDialogProps) {
  function getEventverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return eventverwaltungList.find(r => r.record_id === id)?.fields.event_name ?? '—';
  }

  function getGaesteverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return gaesteverwaltungList.find(r => r.record_id === id)?.fields.vorname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Einladungsmanagement anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Event</Label>
            <p className="text-sm">{getEventverwaltungDisplayName(record.fields.einladung_event)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gast</Label>
            <p className="text-sm">{getGaesteverwaltungDisplayName(record.fields.einladung_gast)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Einladungsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.einladungsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Badge variant="secondary">{record.fields.einladungsstatus?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.einladung_notizen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}