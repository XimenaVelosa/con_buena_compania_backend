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
      fullName: data.fullName,
      age: data.age,
      phone: data.phone,
      address: data.address,
      zone: data.zone,
      requesterName: data.requesterName,
      payerName: data.payerName,
      acceptsService: data.acceptsService ?? false,
    });
  }
}