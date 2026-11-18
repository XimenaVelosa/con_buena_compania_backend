import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { hashPassword } from '../dist/auth/password.js';

export function validateCredentials(username, password) {
  if (typeof username !== 'string' || !/^[a-z0-9._-]{3,80}$/.test(username)) throw new Error('El usuario debe tener entre 3 y 80 letras, números, puntos, guiones o guiones bajos.');
  if (typeof password !== 'string' || password.length < 12 || password.length > 128 || !password.trim()) throw new Error('La contraseña debe tener entre 12 y 128 caracteres y no puede contener solo espacios.');
}

// Only called from trusted backend code. There is no HTTP route for this operation.
export async function setAdminPassword(database, username, password) {
  validateCredentials(username, password);
  const passwordHash = await hashPassword(password);
  return database.transaction(async (tx) => {
    const user = await tx.orm.public.AdminUser.where({ username }).first();
    if (!user || user.role !== 'admin') throw new Error('No se encontró una cuenta administrativa con ese usuario.');
    await tx.orm.public.AdminUser.where({ id: user.id }).update({ passwordHash, mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null });
    await tx.orm.public.AdminSession.where({ userId: user.id }).delete();
    return { username: user.username };
  });
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Uso: npm run admin:password -- [usuario]\nGenera una contraseña nueva y guarda el acceso en .local/. Opcional: CRM_ADMIN_USERNAME y CRM_ADMIN_PASSWORD, solo en el entorno del backend.');
    return;
  }
  await import('dotenv/config');
  if (process.argv.length > 3) throw new Error('Indica únicamente el usuario. La contraseña no se recibe como argumento.');
  const username = (process.argv[2] || process.env.CRM_ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const password = process.env.CRM_ADMIN_PASSWORD || randomBytes(24).toString('base64url');
  validateCredentials(username, password);
  const { db } = await import('../dist/prisma/db.js');
  const credentialsPath = resolve('.local', `admin-access-${username}-${Date.now()}-${randomBytes(4).toString('hex')}.txt`);
  try {
    await mkdir(resolve('.local'), { recursive: true });
    await writeFile(credentialsPath, `Con Buena Compañía · CRM\nUsuario: ${username}\nContraseña: ${password}\n\nAcceso administrado desde el backend. No subas este archivo a GitHub.\n`, { flag: 'wx', mode: 0o600 });
    try { await setAdminPassword(db, username, password); }
    catch (error) { await unlink(credentialsPath); throw error; }
    console.log(`Contraseña actualizada para ${username}. Sus sesiones anteriores quedaron cerradas.\nAcceso guardado en ${credentialsPath}`);
  } finally {
    await db.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => {
    console.error('No se pudo actualizar la contraseña. Revisa el usuario, la conexión y la configuración del backend. La contraseña no se muestra en la consola.');
    process.exitCode = 1;
  });
}
