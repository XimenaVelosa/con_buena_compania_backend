import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ClientsModule } from './clients/clients.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ServiceRequestsController } from './requests/service-requests.controller.js';

@Module({
  imports: [AuthModule, ClientsModule],
  controllers: [AppController, ServiceRequestsController],
  providers: [AppService],
})
export class AppModule {}
