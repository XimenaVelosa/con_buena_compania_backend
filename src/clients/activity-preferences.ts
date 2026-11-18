import { BadRequestException } from '@nestjs/common';
import { getActivityCatalog } from './activities-catalog.js';
import type { ActivitySelectionDto } from './dto/activity-selection.dto.js';

export function createActivityPreferences(selection: ActivitySelectionDto, recordedBy: string) {
  const catalog = getActivityCatalog();
  if (selection.catalogVersion !== catalog.version || selection.catalogHash !== catalog.hash) throw new BadRequestException('Las actividades o sus condiciones cambiaron. Actualiza y revisa esta sección antes de guardar.');
  if (selection.selectedIds.length && selection.transportMode === 'pending') throw new BadRequestException('Indica cómo se resolverán los traslados de las actividades de interés.');
  if (selection.transportMode === 'trusted-taxi') {
    if (!selection.taxiContacts.length) throw new BadRequestException('Registra al menos un contacto de taxi de confianza.');
    for (const contact of selection.taxiContacts) {
      const digits = contact.phone.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) throw new BadRequestException('Revisa el teléfono del contacto de taxi.');
    }
  } else if (selection.taxiContacts.length) throw new BadRequestException('Solo se pueden enviar contactos de taxi cuando se ha seleccionado esa opción.');
  if (selection.transportMode === 'authorize-taxi' && (!selection.taxiCoordinationAuthorized || !selection.taxiAuthorizationName?.trim())) throw new BadRequestException('Registra quién autoriza y marca la autorización para coordinar un taxi de confianza.');
  if (selection.transportMode !== 'authorize-taxi' && selection.taxiCoordinationAuthorized) throw new BadRequestException('La autorización de taxi no corresponde a la opción de traslado seleccionada.');
  const selected = catalog.activities.filter((activity) => selection.selectedIds.includes(activity.id));
  const recordedAt = new Date().toISOString();
  return {
    catalogVersion: catalog.version, catalogHash: catalog.hash,
    selectedActivities: selected,
    introduction: catalog.introduction, scopeNotice: catalog.scopeNotice, commonExclusion: catalog.commonExclusion,
    transportMode: selection.transportMode,
    taxiContacts: selection.transportMode === 'trusted-taxi' ? selection.taxiContacts.map((contact) => ({ name: contact.name.trim(), phone: contact.phone.trim(), company: contact.company?.trim() || '', plate: contact.plate?.trim().toUpperCase() || '' })) : [],
    taxiAuthorization: {
      accepted: selection.taxiCoordinationAuthorized,
      text: catalog.taxiAuthorizationText,
      ...(selection.taxiCoordinationAuthorized ? { authorizedBy: selection.taxiAuthorizationName!.trim(), recordedAt, recordedBy } : {}),
    },
    recordedAt, recordedBy,
  };
}
