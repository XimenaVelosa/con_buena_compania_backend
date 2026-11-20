import { createHash } from 'node:crypto';

export const ACTIVITIES_VERSION = 'CBC-ACTIVIDADES-2026-11-20-v2';
export const GROCERIES_DOMESTIC_EXCLUSION = 'Lavar platos, cocinar, limpiar, lavar o planchar ropa, ni asumir otros oficios domésticos.';
export const TRANSPORT_EXCLUSION = 'Prestar transporte o conducir vehículos para trasladar a la persona o sus artículos.';
const activities = [
  {
    id: 'medical-appointments',
    title: 'Asistir a citas médicas, terapias o exámenes',
    description: 'Recoger a la persona en su domicilio, coordinar el traslado con un tercero, acompañarla durante el desplazamiento y la permanencia en la institución, orientar en trámites básicos y acompañar su regreso a casa.',
    exclusions: ['Realizar valoraciones médicas, terapias o procedimientos de enfermería.', 'Interpretar resultados, formular tratamientos o administrar medicamentos.'],
  },
  {
    id: 'groceries',
    title: 'Hacer mercado o compras para el hogar',
    description: 'Acompañamiento personalizado al supermercado o tienda para ubicar los artículos elegidos por la persona, apoyar la compra y coordinar con un tercero el traslado de la persona y sus productos al domicilio.',
    exclusions: ['Decidir las compras o manejar dinero, tarjetas o claves sin autorización de la persona.', GROCERIES_DOMESTIC_EXCLUSION, 'Cargar objetos que superen las condiciones seguras acordadas para el acompañamiento.'],
  },
  {
    id: 'personal-errands',
    title: 'Realizar diligencias bancarias, notariales o administrativas',
    description: 'Acompañar durante los desplazamientos, apoyar la gestión de turnos y orientar en la organización de documentos, respetando la privacidad, autonomía y decisiones de la persona.',
    exclusions: ['Firmar, representar a la persona o tomar decisiones legales o financieras en su nombre.', 'Hacer transacciones, manejar claves o acceder a cuentas bancarias.', 'Retener documentos o dinero de la persona.'],
  },
  {
    id: 'personal-shopping',
    title: 'Comprar ropa, medicamentos u otros artículos personales',
    description: 'Acompañar a centros comerciales, farmacias y otros establecimientos para apoyar la búsqueda, selección y compra de artículos que la persona elige y autoriza. Se puede acordar el encuentro en el establecimiento o la recogida en el domicilio.',
    exclusions: ['Elegir o comprar productos sin autorización de la persona.', 'Dar recomendaciones médicas, cambiar fórmulas o decidir sustituciones de medicamentos.', TRANSPORT_EXCLUSION],
  },
  {
    id: 'pharmacy-pickup',
    title: 'Recoger medicamentos o fórmulas en la farmacia',
    description: 'Acompañar a la persona en la diligencia o realizar, sin su presencia, la solicitud, recogida y entrega de medicamentos previamente autorizados. La gestión sin la persona requiere su autorización y la documentación correspondiente.',
    exclusions: ['Gestionar una recogida sin la autorización o documentación requerida.', 'Administrar medicamentos, modificar dosis o decidir sustituciones.', 'Brindar orientación clínica o asumir cuidados de enfermería.'],
  },
  {
    id: 'institutional-procedures',
    title: 'Realizar trámites en EPS, bancos, cajas de compensación o entidades públicas',
    description: 'Acompañar en desplazamientos, ubicación de oficinas, gestión de turnos, organización documental y comprensión de los procedimientos administrativos. La persona realiza los actos que requieren su voluntad y consentimiento.',
    exclusions: ['Ejercer representación legal, financiera o sanitaria.', 'Suplantar a la persona, firmar por ella o decidir sin su consentimiento.', 'Realizar transacciones bancarias o acceder a claves y datos financieros.'],
  },
  {
    id: 'digital-support',
    title: 'Usar equipos eléctricos, electrónicos y herramientas digitales',
    description: 'Brindar apoyo en el uso, configuración y ajustes básicos de celulares, televisores, computadores, tabletas y otros dispositivos, incluyendo conectividad, accesibilidad, aplicaciones y funciones generales.',
    exclusions: ['Hacer transacciones bancarias, manejar contraseñas o claves, ni acceder a información financiera o sensible.', 'Realizar reparaciones electrónicas o instalaciones eléctricas.', 'Eliminar archivos o modificar información sin autorización de la persona.'],
  },
  {
    id: 'wellbeing-company',
    title: 'Compañía en casa, bienestar, estimulación y juegos',
    description: 'Acompañar en el domicilio o fuera de él mediante juegos de mesa, lectura, conversación, actividades creativas, ejercicios recreativos de memoria, pasatiempos y actividades sociales. Son actividades recreativas y de bienestar.',
    exclusions: ['Realizar terapias clínicas o cuidados de enfermería.', 'Hacer higiene personal, suministrar medicamentos o prestar vigilancia permanente.', 'Lavar platos, cocinar, limpiar, lavar o planchar ropa, ni realizar otros quehaceres de la casa.'],
  },
  {
    id: 'religious-companionship',
    title: 'Acompañamiento religioso',
    description: 'Acompañamos a la persona a rezar el rosario en casa o en grupo, asistir a misa o visitar la iglesia. Seguimos sus preferencias y su ritmo durante la actividad.',
    exclusions: ['Oficiar ceremonias o asumir funciones de un ministro religioso.', TRANSPORT_EXCLUSION],
  },
] as const;

export const ACTIVITY_IDS = activities.map((activity) => activity.id);

export function getActivityCatalog() {
  const catalog = {
    version: ACTIVITIES_VERSION,
    introduction: 'A continuación encontrarás las actividades que le interesaría contratar. Puedes seleccionar varias. Como la mayoría requiere desplazamientos, es importante saber que Con Buena Compañía no es una empresa de transporte, no presta ese servicio y sus acompañantes no pueden conducir vehículos. Cuando se necesite un taxi, registraremos los contactos de confianza de la persona; si no cuenta con uno, deberá autorizarnos expresamente a buscar y coordinar un taxi de confianza prestado por un tercero, marcando la casilla al final de esta sección.',
    scopeNotice: 'En ninguna de estas actividades se permite que el acompañante conduzca vehículos ni realice oficios domésticos, como lavar platos, cocinar, limpiar, lavar o planchar ropa. Estas tareas están excluidas y no se pueden acordar como parte del acompañamiento ni como tareas adicionales.',
    commonExclusion: 'En esta actividad tampoco se permite que el acompañante conduzca vehículos ni realice oficios domésticos.',
    taxiAuthorizationText: 'Autorizo a Con Buena Compañía a buscar y coordinar un taxi de confianza prestado por un tercero para los traslados que se acuerden. Entiendo que Con Buena Compañía no presta el servicio de transporte y que sus acompañantes no pueden conducir vehículos.',
    activities,
  };
  const hash = createHash('sha256').update(JSON.stringify(catalog)).digest('hex');
  return { ...catalog, hash };
}
