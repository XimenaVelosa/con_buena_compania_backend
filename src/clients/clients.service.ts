import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { getPrivacyNotice, SENSITIVE_FIELDS } from './privacy-notice.js';
import { db } from '../prisma/db.js';
import type { CreateClientDto } from './dto/create-client.dto.js';

@Injectable()
export class ClientsService {
  async findAll() {
    return await db.orm.public.Client.select('id', 'fullName', 'phone', 'address', 'visitDate', 'visitTime', 'visitLocation', 'visitAgentName', 'createdAt')
      .orderBy((client) => client.createdAt.desc()).all();
  }

  async findOne(id: string) {
    const client = await db.orm.public.Client.first({ id });
    if (!client) throw new NotFoundException('No se encontró el registro.');
    return client;
  }

  async create(data: CreateClientDto, recordedBy: string) {
    const notice = getPrivacyNotice();
    if (!data.authorization || data.authorization.personalData !== true || data.authorization.truthfulness !== true) throw new BadRequestException('Se requiere la autorización de datos personales y la declaración de veracidad.');
    if (data.authorization.version !== notice.version || data.authorization.noticeHash !== notice.hash) throw new BadRequestException('El aviso cambió. Revisa nuevamente la autorización antes de guardar.');
    if (!data.authorization.signerName.trim()) throw new BadRequestException('Indica quién manifestó la autorización.');
    if (data.authorization.signerRole === 'representante' && !data.authorization.representativeBasis?.trim()) throw new BadRequestException('Indica el fundamento de la representación.');
    if (!data.authorization.sensitiveData && SENSITIVE_FIELDS.some((field) => data[field]?.trim() && data[field]?.trim() !== '[]')) throw new BadRequestException('No incluyas datos de salud o cuidado sin autorización explícita para datos sensibles.');
    const dataAuthorization = JSON.stringify({
      ...data.authorization,
      signerName: data.authorization.signerName.trim(),
      representativeBasis: data.authorization.signerRole === 'representante' ? data.authorization.representativeBasis?.trim() : undefined,
      recordedAt: new Date().toISOString(), recordedBy,
      noticeText: notice.text, controller: notice.controller, email: notice.email, phone: notice.phone, policyUrl: notice.policyUrl,
      contactDetailsComplete: notice.configured,
      captureMethod: 'declaracion-electronica-en-visita',
    });
    return await db.orm.public.Client.create({
      dataAuthorization,
      visitDate: data.visitDate,
      visitTime: data.visitTime,
      visitLocation: data.visitLocation,
      visitLatitude: data.visitLatitude,
      visitLongitude: data.visitLongitude,
      visitAgentName: data.visitAgentName,
      fullName: data.fullName,
      approximateAge: data.approximateAge,
      phone: data.phone,
      address: data.address,
      requesterName: data.requesterName,
      requesterRelationship: data.requesterRelationship,
      payerName: data.payerName,
      guardianIdNumber: data.guardianIdNumber,
      guardianAddress: data.guardianAddress,
      guardianPhone: data.guardianPhone,
      knowsVisit: data.knowsVisit ?? false,
      mobilityNeeds: data.mobilityNeeds,
      mobilityNotes: data.mobilityNotes,
      independentActivities: data.independentActivities,
      independenceNotes: data.independenceNotes,
      homeAccessConditions: data.homeAccessConditions,
      homeSafetyNotes: data.homeSafetyNotes,
      medicationSupport: data.medicationSupport,
      personalCareSupport: data.personalCareSupport,
      outingConditions: data.outingConditions,
      transportPlan: data.transportPlan,
      homeSafetyConditions: data.homeSafetyConditions,
      emergencyContacts: data.emergencyContacts,
      preferences: data.preferences,
      visitConclusion: data.visitConclusion,
      recommendedServices: data.recommendedServices,
      nextContact: data.nextContact,
      finalNotes: data.finalNotes,
    });
  }
}
