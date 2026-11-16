# Con Buena Compañía · Backend CRM

## Administrador y acceso

La API protege todas las rutas de clientes con una sesión de administrador. La autenticación se almacena en las tablas `adminUser` y `adminSession` de Neon; las variables opcionales de Neon Auth del ejemplo anterior no intervienen en este acceso.

1. Configura `DATABASE_URL` en `.env` (nunca en Git).
2. Ejecuta `npm run contract:emit` y `npm exec -- prisma db migrate` antes de iniciar la versión nueva.
3. Ejecuta `npm run admin:create` una sola vez. Crea el usuario `admin` con una contraseña aleatoria y obliga a cambiarla al primer ingreso. Guarda el acceso inicial en `.local/admin-initial-access.txt`, excluido de Git. Si el usuario ya existe, no lo modifica.
4. Inicia con `npm run start:prod` después de `npm run build`.

Opcionalmente puedes configurar `CRM_ADMIN_USERNAME` y `CRM_ADMIN_PASSWORD` solo al ejecutar el script de creación. No hay endpoint público para crear administradores. El script no restablece contraseñas existentes.

Las contraseñas se derivan con scrypt y sal individual. La base de datos solo almacena el hash del token de sesión, con caducidad de ocho horas. Las cookies son HttpOnly, SameSite=Lax y Secure en producción. Cambiar la contraseña o cerrar sesión revoca las sesiones correspondientes. El usuario se bloquea temporalmente tras cinco intentos fallidos; hay además un límite por IP en cada proceso. Para despliegues con muchas réplicas, complementa el límite por IP con un limitador compartido en la infraestructura.

## Frontend y despliegue

Configura `CRM_ALLOWED_ORIGINS` con los dominios permitidos separados por coma y usa `NODE_ENV=production` al desplegar. El frontend de Vercel debe configurar `BACKEND_URL` y usar su proxy `/api` para conservar cookies del mismo sitio. Todas las escrituras requieren el encabezado `X-CRM-Request: 1`. La API devuelve `Cache-Control: no-store`.

Rutas: `POST /auth/login`, `GET /auth/session`, `POST /auth/change-password`, `POST /auth/logout`, `GET /clients`, `GET /clients/:id` y `POST /clients`. El listado devuelve datos de resumen; la ficha individual devuelve el informe completo. Al cambiar la contraseña inicial, la API habilita el acceso a clientes.

La migración `baseline_existing_clients` reconstruye en disco la historia del esquema anterior, que ya se había aplicado por actualización directa. El marcador de la base actual está después de ese cambio: la migración nueva de administrador solo añade dos tablas, sus claves e índice; no elimina ni modifica registros de clientes.

## Pruebas del CRM

`npm run test:crm` compila y prueba el hash de contraseñas. Para ejecutar también la integración real, establece `CRM_RUN_DB_TESTS=1` y ejecuta el mismo comando. Esa prueba crea un usuario y una visita QA con identificadores únicos, valida acceso no autorizado, cambio obligatorio de contraseña, cookies, guardado, consulta, revocación, caducidad y bloqueo. Al terminar elimina exclusivamente los registros QA creados por la prueba.

---

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
