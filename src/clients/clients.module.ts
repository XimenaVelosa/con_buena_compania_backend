import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';

@Module({
  providers: [ClientsService],
  controllers: [ClientsController]
})
export class ClientsModule {}
