import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { getPrivacyNotice } from './privacy-notice.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { ClientsService } from './clients.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';

@Controller('clients')
@UseGuards(AdminGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll() {
    return this.clientsService.findAll();
  }

  @Get('privacy-notice')
  privacyNotice() {
    return getPrivacyNotice();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.findOne(id);
  }

  @Post()
  create(@Body() data: CreateClientDto, @Req() request: Request & { adminUser: { id: string } }) {
    return this.clientsService.create(data, request.adminUser.id);
  }
}
