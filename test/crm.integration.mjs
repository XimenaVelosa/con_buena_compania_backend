import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../dist/app.module.js';
import { db } from '../dist/prisma/db.js';
import { hashPassword, verifyPassword } from '../dist/auth/password.js';
import { configureSecurity } from '../dist/security.js';

test('Password hashing: salted hashes, correct and incorrect passwords', async () => {
  const password = randomBytes(18).toString('base64url');
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword('incorrect', first), false);
  assert.equal(await verifyPassword(password, 'malformed'), false);
});

test('CRM authenticated workflow against configured database (isolated QA records)', { skip: process.env.CRM_RUN_DB_TESTS !== '1' }, async () => {
  const username = `qa_${randomBytes(8).toString('hex')}`;
  const initialPassword = randomBytes(18).toString('base64url');
  const newPassword = randomBytes(18).toString('base64url');
  const emergencyContacts = JSON.stringify([{ type: 'guardian', fullName: 'Acudiente QA', idNumber: '001234567', address: 'Calle de prueba 10', phone: '+57 300 123 4567' }, { type: 'additional', fullName: 'Contacto QA', idNumber: '00098765', address: 'Otra dirección de prueba', phone: '+57 311 222 3344' }]);
  let userId;
  let clientId;
  let app;
  try {
    const user = await db.orm.public.AdminUser.create({ username, displayName: 'CRM QA', passwordHash: await hashPassword(initialPassword), mustChangePassword: true, role: 'admin' });
    userId = user.id;
    app = await NestFactory.create(AppModule, { logger: false });
    configureSecurity(app);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    const server = app.getHttpServer();
    const post = (path, body, cookie) => {
      const call = request(server).post(path).set('X-CRM-Request', '1').send(body);
      return cookie ? call.set('Cookie', cookie) : call;
    };
    await request(server).get('/clients').expect(401);
    await request(server).post('/auth/login').send({ username, password: initialPassword }).expect(403);
    await post('/auth/login', { username, password: 'wrong' }).expect(401);
    const login = await post('/auth/login', { username, password: initialPassword }).expect(200);
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    assert.match(login.headers['set-cookie'][0], /HttpOnly/i);
    assert.match(login.headers['set-cookie'][0], /SameSite=Lax/i);
    assert.equal(login.body.user.mustChangePassword, true);
    assert.equal(login.body.user.passwordHash, undefined);
    assert.equal(login.body.token, undefined);
    await request(server).get('/clients').set('Cookie', cookie).expect(403);
    await post('/auth/change-password', { currentPassword: initialPassword, newPassword: 'short' }, cookie).expect(400);
    const changed = await post('/auth/change-password', { currentPassword: initialPassword, newPassword }, cookie).expect(200);
    const newCookie = changed.headers['set-cookie'][0].split(';')[0];
    assert.equal(changed.body.user.mustChangePassword, false);
    await request(server).get('/clients').set('Cookie', cookie).expect(401);
    await post('/clients', { fullName: `CRM QA ${username}`, visitDate: '2026-11-16', visitLocation: 'QA address', visitLatitude: 4.6, visitLongitude: -74.0, independentActivities: '["Lectura"]', payerName: 'Acudiente QA', guardianIdNumber: '001234567', guardianAddress: 'Calle de prueba 10', guardianPhone: '+57 300 123 4567', emergencyContacts }, newCookie).expect(201).then((result) => { clientId = result.body.id; });
    const list = await request(server).get('/clients').set('Cookie', newCookie).expect(200);
    assert.ok(list.body.some((row) => row.id === clientId));
    const detail = await request(server).get(`/clients/${clientId}`).set('Cookie', newCookie).expect(200);
    assert.equal(detail.body.visitLatitude, 4.6);
    assert.equal(detail.body.independentActivities, '["Lectura"]');
    assert.equal(detail.body.payerName, 'Acudiente QA');
    assert.equal(detail.body.guardianIdNumber, '001234567');
    assert.equal(detail.body.guardianAddress, 'Calle de prueba 10');
    assert.equal(detail.body.guardianPhone, '+57 300 123 4567');
    assert.deepEqual(JSON.parse(detail.body.emergencyContacts), JSON.parse(emergencyContacts));
    await request(server).get('/clients/not-a-uuid').set('Cookie', newCookie).expect(400);
    await post('/auth/logout', {}, newCookie).expect(200);
    await request(server).get('/clients').set('Cookie', newCookie).expect(401);
    const expiredToken = randomBytes(32).toString('hex');
    await db.orm.public.AdminSession.create({ userId, tokenHash: createHash('sha256').update(expiredToken).digest('hex'), expiresAt: '2000-01-01T00:00:00.000Z' });
    await request(server).get('/clients').set('Cookie', `cbc_admin_session=${expiredToken}`).expect(401);
    for (let i = 0; i < 5; i++) await post('/auth/login', { username, password: 'wrong' }).expect(401);
    await post('/auth/login', { username, password: newPassword }).expect(401);
    const locked = await db.orm.public.AdminUser.first({ id: userId });
    assert.ok(Date.parse(locked.lockedUntil) > Date.now());
    assert.equal(await verifyPassword(newPassword, locked.passwordHash), true);
  } finally {
    if (clientId) await db.orm.public.Client.where({ id: clientId }).delete();
    if (userId) await db.orm.public.AdminUser.where({ id: userId }).delete();
    if (app) await app.close();
    await db.close();
  }
});
