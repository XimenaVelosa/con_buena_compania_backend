import type { INestApplication } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

const siteOrigins = ['https://conbuenacompania.com', 'https://www.conbuenacompania.com'];

export function configureSecurity(app: INestApplication) {
  const configuredOrigins = (process.env.CRM_ALLOWED_ORIGINS || 'http://localhost:4173,http://127.0.0.1:4173,http://localhost:5500,http://127.0.0.1:5500,https://con-buena-compania.vercel.app')
    .split(',').map((origin) => origin.trim()).filter(Boolean);
  const origins = [...new Set([...siteOrigins, ...configuredOrigins])];
  app.enableCors({ origin: origins, credentials: true, allowedHeaders: ['Content-Type', 'X-CRM-Request'], methods: ['GET', 'POST', 'OPTIONS'] });
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (req.headers['x-crm-request'] !== '1' || (req.headers.origin && !origins.includes(req.headers.origin))) {
        res.status(403).json({ message: 'Solicitud no autorizada.' });
        return;
      }
    }
    next();
  });
}
