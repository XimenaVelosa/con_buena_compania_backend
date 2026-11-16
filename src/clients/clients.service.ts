import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
import type { CreateClientDto } from './dto/create-client.dto.js';

@Injectable()
export class ClientsService {
  async findAll() {
    return await db.orm.public.Client.all();
  }

  async create(data: CreateClientDto) {
    return await db.orm.public.Client.create({
      visitDate: data.visitDate,
      visitTime: data.visitTime,
      visitLocation: data.visitLocation,
      visitAgentName: data.visitAgentName,
      fullName: data.fullName,
      approximateAge: data.approximateAge,
      phone: data.phone,
      address: data.address,
      requesterName: data.requesterName,
      requesterRelationship: data.requesterRelationship,
      payerName: data.payerName,
      knowsVisit: data.knowsVisit ?? false,
    });
  }
}
