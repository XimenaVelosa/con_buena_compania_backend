import {
  BadRequestException, Controller, Get, Post, Body, Query, UseGuards,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { getActivityCatalog, GROCERIES_DOMESTIC_EXCLUSION } from '../clients/activities-catalog.js';
import { getPrivacyNotice } from '../clients/privacy-notice.js';
import { db } from '../prisma/db.js';
import { CreateServiceRequestDto, REQUEST_DAYS, REQUEST_NOTICE_VERSION } from './create-service-request.dto.js';
import divipola from './divipola.json' with { type: 'json' };

const departments: Record<string, { name: string; municipalities: Record<string, string> }> = divipola.departments;
const catalog = getActivityCatalog();
const groups = [
  { title: 'Salud y farmacia', ids: ['medical-appointments', 'pharmacy-pickup'] },
  { title: 'Compras y diligencias', ids: ['groceries', 'personal-shopping', 'personal-errands', 'institutional-procedures'] },
  { title: 'Tecnología, compañía y bienestar', ids: ['digital-support', 'wellbeing-company'] },
].map(({ title, ids }) => ({
  title,
  activities: catalog.activities.filter((activity) => ids.includes(activity.id)).map((activity) =>
    activity.id === 'groceries'
      ? { ...activity, exclusions: activity.exclusions.filter((exclusion) => exclusion !== GROCERIES_DOMESTIC_EXCLUSION) }
      : activity,
  ),
}));

function requestNotice() {
  const privacy = getPrivacyNotice();
  const email = privacy.email || 'gerencia@conbuenacompania.com';
  return {
    version: REQUEST_NOTICE_VERSION,
    text: `Autorizo a ${privacy.controller} a usar los datos que suministre para responder mi solicitud, preparar una cotización y contactarme sobre el acompañamiento. Si indico un número alternativo de otra persona, cuento con su autorización para compartirlo. Puedo consultar, actualizar o rectificar mis datos, o solicitar su supresión, en ${email}.`,
    policyUrl: privacy.policyUrl,
  };
}

@Controller('service-requests')
export class ServiceRequestsController {
  @Get('options')
  options() {
    return { groups, days: REQUEST_DAYS, departments, notice: requestNotice(), scope: catalog.scopeNotice };
  }

  @Post()
  async create(@Body() input: CreateServiceRequestDto) {
    const department = departments[input.departmentCode];
    const municipality = department?.municipalities[input.municipalityCode];
    if (!municipality) throw new BadRequestException('Selecciona una ciudad o municipio del departamento indicado.');

    const data = {
      id: input.id,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      alternatePhone: input.alternatePhone,
      department: department.name,
      municipality,
      hoursPerDay: input.hoursPerDay,
      days: input.days,
      activities: catalog.activities.filter((activity) => input.activities.includes(activity.id)).map((activity) => activity.title),
      authorization: JSON.stringify(requestNotice()),
    };
    const requests = db.orm.public.ServiceRequest;
    try {
      await requests.select('id').create(data);
    } catch (error) {
      // A retry with the same client-generated ID must not create a second request.
      if (!await requests.select('id').first({ id: input.id })) throw error;
    }
    return { received: true };
  }

  @Get()
  @UseGuards(AdminGuard)
  async list(@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number) {
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000) {
      throw new BadRequestException('Página inválida.');
    }
    const pageSize = 30;
    const items = await db.orm.public.ServiceRequest
      .select('id', 'fullName', 'email', 'phone', 'alternatePhone', 'department', 'municipality',
        'hoursPerDay', 'days', 'activities', 'createdAt')
      .orderBy([(request) => request.createdAt.desc(), (request) => request.id.desc()])
      .offset((page - 1) * pageSize)
      .limit(pageSize + 1)
      .all();
    return { items: items.slice(0, pageSize), hasNext: items.length > pageSize };
  }
}
