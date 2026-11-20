import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../dist/app.module.js';
import { db } from '../dist/prisma/db.js';
import { hashPassword, verifyPassword } from '../dist/auth/password.js';
import { configureSecurity } from '../dist/security.js';
import { getPrivacyNotice, SENSITIVE_FIELDS } from '../dist/clients/privacy-notice.js';
import { setAdminPassword } from '../scripts/set-admin-password.mjs';

const execFileAsync = promisify(execFile);

const privacyConfig = { CRM_PRIVACY_CONTROLLER: 'Responsable QA', CRM_PRIVACY_EMAIL: 'privacidad@example.test', CRM_PRIVACY_PHONE: '3000000000', CRM_PRIVACY_POLICY_URL: 'https://example.test/privacidad' };
function configurePrivacy() {
  const previous = Object.fromEntries(Object.keys(privacyConfig).map((key) => [key, process.env[key]]));
  Object.assign(process.env, privacyConfig);
  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

test('Privacy notice binds its exact text and contact details to the hash and can be published without a policy', () => {
  const restore = configurePrivacy();
  try {
    const original = getPrivacyNotice();
    assert.equal(original.configured, true);
    assert.equal(getPrivacyNotice().hash, original.hash);
    assert.ok(original.text.includes(privacyConfig.CRM_PRIVACY_CONTROLLER));
    assert.ok(original.text.includes(privacyConfig.CRM_PRIVACY_EMAIL));
    assert.ok(original.text.includes(privacyConfig.CRM_PRIVACY_PHONE));
    process.env.CRM_PRIVACY_PHONE = '';
    assert.equal(getPrivacyNotice().configured, false);
    assert.notEqual(getPrivacyNotice().hash, original.hash);
    process.env.CRM_PRIVACY_PHONE = privacyConfig.CRM_PRIVACY_PHONE;
    process.env.CRM_PRIVACY_POLICY_URL = 'http://example.test/insecure';
    assert.equal(getPrivacyNotice().configured, false);
    assert.equal(getPrivacyNotice().policyUrl, '');
    for (const key of Object.keys(privacyConfig)) delete process.env[key];
    const published = getPrivacyNotice();
    assert.equal(published.configured, false);
    assert.equal(published.controller, 'Con Buena Compañía');
    assert.equal(published.policyUrl, '');
    assert.ok(published.text.includes('La política de tratamiento de datos aún no está publicada'));
    assert.ok(!published.text.includes('pendiente de informar'));
  } finally { restore(); }
});

test('Password hashing: salted hashes, correct and incorrect passwords', async () => {
  const password = randomBytes(18).toString('base64url');
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword('incorrect', first), false);
  assert.equal(await verifyPassword(password, 'malformed'), false);
});

test('Password changes are unavailable over HTTP, including authenticated requests', async () => {
  const app = await NestFactory.create(AppModule, { logger: false });
  try {
    configureSecurity(app);
    await app.init();
    await request(app.getHttpServer()).post('/auth/change-password').set('X-CRM-Request', '1').send({ currentPassword: 'old', newPassword: 'replacement-password' }).expect(404);
    await request(app.getHttpServer()).post('/auth/change-password').set('X-CRM-Request', '1').set('Cookie', `cbc_admin_session=${randomBytes(32).toString('hex')}`).send({ currentPassword: 'old', newPassword: 'replacement-password' }).expect(404);
  } finally { await app.close(); }
});

test('Administrative password validation rejects invalid input before a database write', async () => {
  const password = randomBytes(18).toString('base64url');
  for (const [username, value] of [['../admin', password], ['admin', 'short'], ['admin', ' '.repeat(16)], ['admin', 'x'.repeat(129)]]) {
    await assert.rejects(setAdminPassword(null, username, value));
  }
});

test('CRM authenticated workflow against configured database (isolated QA records)', { skip: process.env.CRM_RUN_DB_TESTS !== '1' }, async () => {
  const username = `qa_${randomBytes(8).toString('hex')}`;
  const initialPassword = randomBytes(18).toString('base64url');
  const newPassword = randomBytes(18).toString('base64url');
  const emergencyContacts = JSON.stringify([{ type: 'guardian', fullName: 'Acudiente QA', idNumber: '001234567', address: 'Calle de prueba 10', phone: '+57 300 123 4567' }, { type: 'additional', fullName: 'Contacto QA', idNumber: '00098765', address: 'Otra dirección de prueba', phone: '+57 311 222 3344' }]);
  let userId;
  let accessFile;
  const clientIds = [];
  let app;
  const restorePrivacy = configurePrivacy();
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
    await request(server).get('/clients/privacy-notice').expect(401);
    await request(server).get('/clients/activity-options').expect(401);
    await request(server).post('/auth/login').send({ username, password: initialPassword }).expect(403);
    await post('/auth/login', { username, password: 'wrong' }).expect(401);
    const pending = await post('/auth/login', { username, password: initialPassword }).expect(403);
    assert.ok(pending.body.message.includes('administrador debe actualizar'));
    assert.equal(pending.headers['set-cookie'], undefined);
    const legacyToken = randomBytes(32).toString('hex');
    await db.orm.public.AdminSession.create({ userId, tokenHash: createHash('sha256').update(legacyToken).digest('hex'), expiresAt: new Date(Date.now() + 3600000).toISOString() });
    const cookie = `cbc_admin_session=${legacyToken}`;
    await request(server).get('/auth/session').set('Cookie', cookie).expect(403);
    await request(server).get('/clients').set('Cookie', cookie).expect(403);
    await post('/auth/change-password', { currentPassword: initialPassword, newPassword }, cookie).expect(404);
    const result = await execFileAsync(process.execPath, ['scripts/set-admin-password.mjs', username], { cwd: resolve('.'), env: { ...process.env, CRM_ADMIN_PASSWORD: newPassword }, windowsHide: true, timeout: 30000 });
    assert.ok(!result.stdout.includes(newPassword), 'The CLI does not print the password');
    const delivered = /Acceso guardado en (.+)/.exec(result.stdout)?.[1].trim();
    assert.ok(delivered);
    assert.equal(dirname(delivered), resolve('.local'));
    accessFile = delivered;
    assert.ok((await readFile(accessFile, 'utf8')).includes(`Contraseña: ${newPassword}`));
    await request(server).get('/auth/session').set('Cookie', cookie).expect(401);
    await post('/auth/login', { username, password: initialPassword }).expect(401);
    const login = await post('/auth/login', { username, password: newPassword }).expect(200);
    const newCookie = login.headers['set-cookie'][0].split(';')[0];
    assert.match(login.headers['set-cookie'][0], /HttpOnly/i);
    assert.match(login.headers['set-cookie'][0], /SameSite=Lax/i);
    assert.equal(login.body.user.mustChangePassword, false);
    assert.equal(login.body.user.passwordHash, undefined);
    assert.equal(login.body.token, undefined);
    await post('/auth/change-password', { currentPassword: newPassword, newPassword: initialPassword }, newCookie).expect(404);
    const notice = await request(server).get('/clients/privacy-notice').set('Cookie', newCookie).expect(200);
    assert.equal(notice.body.configured, true);
    const authorization = { personalData: true, truthfulness: true, sensitiveData: false, signerName: 'Titular QA', signerRole: 'titular', version: notice.body.version, noticeHash: notice.body.hash };
    const payload = { fullName: `CRM QA ${username}`, visitDate: '2026-11-16', visitLocation: 'QA address', visitLatitude: 4.6, visitLongitude: -74.0, independentActivities: '["Lectura"]', payerName: 'Acudiente QA', guardianIdNumber: '001234567', guardianAddress: 'Calle de prueba 10', guardianPhone: '+57 300 123 4567', emergencyContacts };
    const catalog = (await request(server).get('/clients/activity-options').set('Cookie', newCookie).expect(200)).body;
    assert.equal(catalog.activities.length, 11);
    assert.ok(catalog.activities.some((activity) => activity.id === 'religious-companionship'));
    assert.ok(catalog.activities.some((activity) => activity.id === 'delegated-errands'));
    assert.ok(catalog.activities.some((activity) => activity.id === 'family-album'));
    const activitySelection = { catalogVersion: catalog.version, catalogHash: catalog.hash, selectedIds: [catalog.activities[0].id, catalog.activities[7].id], transportMode: 'authorize-taxi', taxiContacts: [], taxiCoordinationAuthorized: true, taxiAuthorizationName: 'Acudiente QA' };
    async function reject(body) {
      const result = await post('/clients', body, newCookie);
      if (result.status === 201) clientIds.push(result.body.id);
      assert.equal(result.status, 400, JSON.stringify(result.body));
    }
    await reject(payload);
    await reject({ ...payload, authorization: { ...authorization, personalData: false } });
    await reject({ ...payload, authorization: { ...authorization, truthfulness: false } });
    await reject({ ...payload, authorization: { ...authorization, version: 'old-version' } });
    await reject({ ...payload, authorization: { ...authorization, noticeHash: '0'.repeat(64) } });
    await reject({ ...payload, authorization: { ...authorization, recordedAt: '2000-01-01T00:00:00Z' } });
    await reject({ ...payload, authorization: { ...authorization, signerName: '  ' } });
    await reject({ ...payload, authorization: { ...authorization, signerRole: 'representante' } });
    for (const field of SENSITIVE_FIELDS) await reject({ ...payload, authorization, [field]: 'Información de salud QA' });
    const rejectSelection = (selection) => reject({ ...payload, authorization, activitySelection: selection });
    await rejectSelection({ ...activitySelection, catalogHash: '0'.repeat(64) });
    await rejectSelection({ ...activitySelection, selectedIds: ['unknown-activity'] });
    await rejectSelection({ ...activitySelection, selectedIds: [catalog.activities[0].id, catalog.activities[0].id] });
    await rejectSelection({ ...activitySelection, selectedIds: null });
    await rejectSelection({ ...activitySelection, transportMode: 'pending', taxiCoordinationAuthorized: false });
    await rejectSelection({ ...activitySelection, transportMode: 'trusted-taxi', taxiCoordinationAuthorized: false });
    await rejectSelection({ ...activitySelection, transportMode: 'trusted-taxi', taxiCoordinationAuthorized: false, taxiContacts: [{ name: '', phone: 'abc' }] });
    await rejectSelection({ ...activitySelection, transportMode: 'trusted-taxi', taxiCoordinationAuthorized: false, taxiContacts: [{ name: 'Taxi QA', phone: '-------' }] });
    await rejectSelection({ ...activitySelection, taxiCoordinationAuthorized: false });
    await rejectSelection({ ...activitySelection, taxiAuthorizationName: ' ' });
    await rejectSelection({ ...activitySelection, transportMode: 'not-needed' });
    await rejectSelection({ ...activitySelection, transportMode: 'not-needed', taxiCoordinationAuthorized: false, taxiContacts: [{ name: 'Taxi QA', phone: '3001234567' }] });
    await rejectSelection({ ...activitySelection, recordedAt: '2000-01-01T00:00:00Z' });
    await rejectSelection({ ...activitySelection, selectedActivities: [{ title: 'Lavar platos' }] });
    process.env.CRM_PRIVACY_EMAIL = '';
    await reject({ ...payload, authorization });
    process.env.CRM_PRIVACY_EMAIL = privacyConfig.CRM_PRIVACY_EMAIL;
    const beforeSave = Date.now();
    const saved = await post('/clients', { ...payload, authorization }, newCookie).expect(201);
    const clientId = saved.body.id;
    clientIds.push(clientId);
    const list = await request(server).get('/clients').set('Cookie', newCookie).expect(200);
    assert.ok(list.body.some((row) => row.id === clientId));
    assert.equal(list.body.find((row) => row.id === clientId).dataAuthorization, undefined);
    const detail = await request(server).get(`/clients/${clientId}`).set('Cookie', newCookie).expect(200);
    assert.equal(detail.body.visitLatitude, 4.6);
    assert.equal(detail.body.independentActivities, '["Lectura"]');
    assert.equal(detail.body.payerName, 'Acudiente QA');
    assert.equal(detail.body.guardianIdNumber, '001234567');
    assert.equal(detail.body.guardianAddress, 'Calle de prueba 10');
    assert.equal(detail.body.guardianPhone, '+57 300 123 4567');
    assert.deepEqual(JSON.parse(detail.body.emergencyContacts), JSON.parse(emergencyContacts));
    const evidence = JSON.parse(detail.body.dataAuthorization);
    assert.equal(evidence.recordedBy, userId);
    assert.ok(Date.parse(evidence.recordedAt) >= beforeSave && Date.parse(evidence.recordedAt) <= Date.now());
    assert.equal(evidence.noticeHash, notice.body.hash);
    assert.equal(evidence.noticeText, notice.body.text);
    assert.equal(evidence.signerName, 'Titular QA');
    assert.equal(evidence.sensitiveData, false);
    assert.equal(detail.body.mobilityNotes, null);
    assert.equal(detail.body.activityPreferences, null);
    const health = await post('/clients', { ...payload, independentActivities: '["Lavar platos"]', authorization: { ...authorization, signerRole: 'representante', representativeBasis: 'Poder de representación de prueba QA', sensitiveData: true }, mobilityNotes: 'Información voluntaria QA', activitySelection }, newCookie).expect(201);
    clientIds.push(health.body.id);
    assert.equal(health.body.mobilityNotes, 'Información voluntaria QA');
    assert.equal(JSON.parse(health.body.dataAuthorization).sensitiveData, true);
    const savedActivities = JSON.parse(health.body.activityPreferences);
    assert.deepEqual(savedActivities.selectedActivities, [catalog.activities[0], catalog.activities[7]]);
    assert.deepEqual(JSON.parse(health.body.independentActivities), [catalog.activities[0].title, catalog.activities[7].title]);
    assert.equal(savedActivities.scopeNotice, catalog.scopeNotice);
    assert.equal(savedActivities.taxiAuthorization.accepted, true);
    assert.equal(savedActivities.taxiAuthorization.authorizedBy, 'Acudiente QA');
    assert.equal(savedActivities.taxiAuthorization.text, catalog.taxiAuthorizationText);
    assert.equal(savedActivities.taxiAuthorization.recordedBy, userId);
    assert.ok(Date.parse(savedActivities.taxiAuthorization.recordedAt) >= beforeSave);
    const taxiContacts = [{ name: '  Conductor QA  ', phone: '+57 300 123 4567', company: 'Central QA', plate: 'abc123' }, { name: 'Otro contacto QA', phone: '3112223344' }];
    const trusted = await post('/clients', { ...payload, authorization, activitySelection: { ...activitySelection, transportMode: 'trusted-taxi', taxiCoordinationAuthorized: false, taxiContacts } }, newCookie).expect(201);
    clientIds.push(trusted.body.id);
    const trustedDetail = await request(server).get(`/clients/${trusted.body.id}`).set('Cookie', newCookie).expect(200);
    const trustedPreferences = JSON.parse(trustedDetail.body.activityPreferences);
    assert.equal(trustedPreferences.taxiContacts.length, 2);
    assert.equal(trustedPreferences.taxiContacts[0].name, 'Conductor QA');
    assert.equal(trustedPreferences.taxiContacts[0].plate, 'ABC123');
    assert.equal(trustedPreferences.taxiAuthorization.accepted, false);
    assert.equal(trustedPreferences.taxiAuthorization.authorizedBy, undefined);
    for (const key of Object.keys(privacyConfig)) delete process.env[key];
    const publishedNotice = await request(server).get('/clients/privacy-notice').set('Cookie', newCookie).expect(200);
    assert.equal(publishedNotice.body.configured, false);
    assert.equal(publishedNotice.body.policyUrl, '');
    const published = await post('/clients', { ...payload, authorization: { ...authorization, version: publishedNotice.body.version, noticeHash: publishedNotice.body.hash }, activitySelection: { ...activitySelection, selectedIds: [catalog.activities[7].id], transportMode: 'not-needed', taxiCoordinationAuthorized: false } }, newCookie).expect(201);
    clientIds.push(published.body.id);
    const publishedEvidence = JSON.parse(published.body.dataAuthorization);
    assert.equal(publishedEvidence.controller, 'Con Buena Compañía');
    assert.equal(publishedEvidence.contactDetailsComplete, false);
    assert.equal(publishedEvidence.policyUrl, '');
    assert.equal(publishedEvidence.noticeText, publishedNotice.body.text);
    assert.equal(JSON.parse(published.body.activityPreferences).taxiAuthorization.accepted, false);
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
    restorePrivacy();
    if (accessFile) await unlink(accessFile);
    for (const id of clientIds) await db.orm.public.Client.where({ id }).delete();
    if (userId) await db.orm.public.AdminUser.where({ id: userId }).delete();
    if (app) await app.close();
    await db.close();
  }
});
