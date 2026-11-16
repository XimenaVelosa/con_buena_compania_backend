import { BadRequestException, ForbiddenException, HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { Request } from 'express';
import { db } from '../prisma/db.js';
import { hashPassword, verifyPassword } from './password.js';

export const SESSION_COOKIE = 'cbc_admin_session';
export const SESSION_SECONDS = 8 * 60 * 60;

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionToken(request: Request) {
  const cookie = request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  const token = cookie?.slice(SESSION_COOKIE.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

function publicUser(user: { id: string; username: string; displayName: string; role: string; mustChangePassword: boolean }) {
  return { id: user.id, username: user.username, displayName: user.displayName, role: user.role, mustChangePassword: user.mustChangePassword };
}

@Injectable()
export class AuthService {
  private readonly attempts = new Map<string, { count: number; until: number }>();
  private readonly dummyHash = hashPassword(randomBytes(32).toString('hex'));

  private checkRateLimit(ip: string) {
    const now = Date.now();
    for (const [key, entry] of this.attempts) if (entry.until <= now) this.attempts.delete(key);
    const entry = this.attempts.get(ip) || { count: 0, until: now + 15 * 60 * 1000 };
    if (entry.count >= 20 || this.attempts.size >= 10000) throw new HttpException('Demasiados intentos. Espera 15 minutos y vuelve a intentar.', 429);
    entry.count++;
    this.attempts.set(ip, entry);
  }

  private async createSession(userId: string) {
    const token = randomBytes(32).toString('hex');
    await db.orm.public.AdminSession.create({
      tokenHash: tokenHash(token), userId,
      expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000).toISOString(),
    });
    return token;
  }

  async login(username: string, password: string, ip: string) {
    this.checkRateLimit(ip);
    const user = await db.orm.public.AdminUser.where({ username: username.toLowerCase() }).first();
    const valid = await verifyPassword(password, user?.passwordHash || await this.dummyHash);
    if (!user || !valid || user.role !== 'admin' || (user.lockedUntil && Date.parse(user.lockedUntil) > Date.now())) {
      if (user && (!user.lockedUntil || Date.parse(user.lockedUntil) <= Date.now())) {
        const attempts = user.lockedUntil ? 1 : user.failedLoginAttempts + 1;
        await db.orm.public.AdminUser.where({ id: user.id }).update({
          failedLoginAttempts: attempts,
          lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
        });
      }
      throw new UnauthorizedException('Usuario o contraseña incorrectos, o acceso temporalmente bloqueado.');
    }
    await db.orm.public.AdminUser.where({ id: user.id }).update({ failedLoginAttempts: 0, lockedUntil: null });
    await db.orm.public.AdminSession.where((session) => session.expiresAt.lt(new Date().toISOString())).delete();
    const token = await this.createSession(user.id);
    return { user: publicUser(user), token };
  }

  async requireUser(request: Request, allowInitialPassword = false) {
    const token = sessionToken(request);
    if (!token) throw new UnauthorizedException('Ingresa para continuar.');
    const session = await db.orm.public.AdminSession.where({ tokenHash: tokenHash(token) }).first();
    if (!session || Date.parse(session.expiresAt) <= Date.now()) throw new UnauthorizedException('Tu sesión venció. Ingresa nuevamente.');
    const user = await db.orm.public.AdminUser.first({ id: session.userId });
    if (!user || user.role !== 'admin') throw new ForbiddenException('Acceso reservado al administrador.');
    if (user.mustChangePassword && !allowInitialPassword) throw new ForbiddenException('Cambia tu contraseña inicial para acceder al CRM.');
    return publicUser(user);
  }

  async logout(request: Request) {
    const token = sessionToken(request);
    if (token) await db.orm.public.AdminSession.where({ tokenHash: tokenHash(token) }).delete();
  }

  async changePassword(request: Request, currentPassword: string, newPassword: string) {
    this.checkRateLimit(request.ip || 'unknown');
    const user = await this.requireUser(request, true);
    const stored = await db.orm.public.AdminUser.first({ id: user.id });
    if (!stored || !await verifyPassword(currentPassword, stored.passwordHash)) throw new UnauthorizedException('La contraseña actual no es correcta.');
    if (newPassword === currentPassword) throw new BadRequestException('Elige una contraseña diferente a la inicial.');
    const passwordHash = await hashPassword(newPassword);
    await db.transaction(async (tx) => {
      await tx.orm.public.AdminUser.where({ id: user.id }).update({ passwordHash, mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null });
      await tx.orm.public.AdminSession.where({ userId: user.id }).delete();
    });
    const token = await this.createSession(user.id);
    return { user: { ...user, mustChangePassword: false }, token };
  }
}
