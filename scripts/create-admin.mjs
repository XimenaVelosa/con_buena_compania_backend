import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { db } from '../dist/prisma/db.js';
import { hashPassword } from '../dist/auth/password.js';

const username = (process.env.CRM_ADMIN_USERNAME || 'admin').trim().toLowerCase();
if (!/^[a-z0-9._-]{3,80}$/.test(username)) throw new Error('El usuario debe tener entre 3 y 80 letras, números, puntos, guiones o guiones bajos.');
try {
  const existing = await db.orm.public.AdminUser.where({ username }).first();
  if (existing) {
    console.log(`El usuario ${username} ya existe. No se modificó su contraseña.`);
  } else {
    const password = process.env.CRM_ADMIN_PASSWORD || randomBytes(18).toString('base64url');
    if (password.length < 12 || password.length > 128) throw new Error('La contraseña inicial debe tener entre 12 y 128 caracteres.');
    const credentialsPath = resolve('.local/admin-initial-access.txt');
    await mkdir(resolve('.local'), { recursive: true });
    // Exclusive creation avoids overwriting an existing delivery file or leaving an inaccessible account.
    await writeFile(credentialsPath, `Con Buena Compañía · CRM\nUsuario: ${username}\nContraseña: ${password}\n\nLa contraseña se administra únicamente desde el backend. No subas este archivo a GitHub.\n`, { flag: 'wx', mode: 0o600 });
    try {
      await db.orm.public.AdminUser.create({ username, displayName: 'Administración', passwordHash: await hashPassword(password), role: 'admin', mustChangePassword: false });
    } catch (error) {
      await unlink(credentialsPath);
      throw error;
    }
    console.log(`Usuario ${username} creado. Acceso inicial en ${credentialsPath}`);
  }
} finally {
  await db.close();
}
