import type { Dienstleisterbuchung, Eventverwaltung, Dienstleisterverwaltung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';

interface DienstleisterbuchungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Dienstleisterbuchung | null;
  onEdit: (record: Dienstleisterbuchung) => void;
  eventverwaltungList: Eventverwaltung[];
  dienstleisterverwaltungList: Dienstleisterverwaltung[];
}

export function DienstleisterbuchungViewDialog({ open, onClose, record, onEdit, eventverwaltungList, dienstleisterverwaltungList }: DienstleisterbuchungViewDialogProps) {
  function getEventverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return eventverwaltungList.find(r => r.record_id === id)?.fields.event_name ?? '—';
  }

  function getDienstleisterverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return dienstleisterverwaltungList.find(r => r.record_id === id)?.fields.firmenname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dienstleisterbuchung anzeigen</DialogTitle>
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
            <p className="text-sm">{getEventverwaltungDisplayName(record.fields.buchung_event)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Dienstleister</Label>
            <p className="text-sm">{getDienstleisterverwaltungDisplayName(record.fields.buchung_dienstleister)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gebuchte Leistung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.gebuchte_leistung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vereinbarter Preis (€)</Label>
            <p className="text-sm">{record.fields.vereinbarter_preis ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Buchungsstatus</Label>
            <Badge variant="secondary">{record.fields.buchungsstatus?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.buchung_notizen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}