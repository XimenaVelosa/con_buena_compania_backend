import { createHash } from 'node:crypto';

export const PRIVACY_VERSION = 'CBC-DATOS-2026-11-18-v2';
export const SENSITIVE_FIELDS = ['mobilityNeeds', 'mobilityNotes', 'medicationSupport', 'personalCareSupport'] as const;

export function getPrivacyNotice() {
  const controllerIdentityProvided = Boolean(process.env.CRM_PRIVACY_CONTROLLER?.trim());
  const controller = process.env.CRM_PRIVACY_CONTROLLER?.trim() || 'Con Buena Compañía';
  const email = process.env.CRM_PRIVACY_EMAIL?.trim() || '';
  const phone = process.env.CRM_PRIVACY_PHONE?.trim() || '';
  const policyValue = process.env.CRM_PRIVACY_POLICY_URL?.trim() || '';
  let policyUrl = '';
  try {
    const url = new URL(policyValue);
    if (url.protocol === 'https:' && url.hostname && !url.username && !url.password) policyUrl = url.href;
  } catch { /* Only published HTTPS policies are linked. */ }
  const configured = Boolean(controllerIdentityProvided && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && phone && (!policyValue || policyUrl));
  const contactChannels = [email, phone ? `teléfono ${phone}` : ''].filter(Boolean);
  const contactText = contactChannels.length
    ? `Puedo ejercer estos derechos mediante ${contactChannels.join(', ')}.`
    : 'Para ejercer estos derechos, puedo dirigirme al equipo de Con Buena Compañía por el mismo canal utilizado para solicitar el servicio o durante la visita, y solicitar la identificación y los canales de atención del responsable del tratamiento.';
  const policyText = policyUrl
    ? 'Puedo consultar la política de tratamiento en el enlace disponible en este formulario.'
    : 'La política de tratamiento de datos aún no está publicada. Este aviso explica el uso de los datos y recoge las decisiones de la persona; no sustituye la política completa.';
  const paragraphs = [
    { title: 'Autorización para el acompañamiento', text: `Autorizo de manera previa, expresa e informada a ${controller}, como responsable, a recolectar, consultar, almacenar, actualizar y utilizar los datos personales que suministre exclusivamente para evaluar, organizar, asignar, prestar y hacer seguimiento a los servicios de acompañamiento a personas; gestionar el contacto y las emergencias; y atender solicitudes y obligaciones legales relacionadas con estos servicios. Esta autorización no comprende la venta de información ni su uso para publicidad u otros fines ajenos al acompañamiento.` },
    { title: 'Reserva y derechos', text: `La información tendrá acceso restringido al equipo autorizado, al acompañante asignado y a proveedores tecnológicos que actúen por cuenta del responsable, bajo deber de confidencialidad y solo en lo necesario para estas finalidades, sin perjuicio de los requerimientos legales de autoridades competentes. Puedo conocer, consultar gratuitamente, actualizar y rectificar mis datos, solicitar prueba de esta autorización, ser informado sobre su uso y solicitar su supresión o revocar la autorización cuando proceda, respetando los deberes legales o contractuales de conservación. ${contactText} También puedo presentar quejas ante la Superintendencia de Industria y Comercio. ${policyText}` },
    { title: 'Datos sensibles: decisión separada y voluntaria', text: 'La información sobre salud, discapacidad, movilidad y necesidades de cuidado es sensible. No estoy obligado a responder estas preguntas ni a autorizar su tratamiento; puedo continuar sin suministrarla. Si lo autorizo expresamente, se utilizará solo para adecuar el acompañamiento y sus medidas de seguridad. No debo incluir datos sensibles en otros campos si no he dado esa autorización.' },
    { title: 'Declaración de veracidad y colaboración', text: 'Declaro que la información que suministro es, según mi conocimiento, veraz, completa y actualizada. Me comprometo a no ocultar deliberadamente información relevante que conozca cuya omisión pueda comprometer la seguridad de las personas, la evaluación del servicio o la correcta asignación de un acompañante, y a comunicar cambios oportunamente. Esta declaración respeta mi derecho a no suministrar datos sensibles y no exonera a la empresa ni al acompañante de sus propias obligaciones o responsabilidades.' },
    { title: 'Quién puede autorizar', text: 'La autorización debe manifestarla el titular o una persona legalmente legitimada para representarlo. Ser familiar, acudiente o solicitante no acredita por sí solo esa representación. Si suministro datos de otros contactos, debo informarles la finalidad y contar con su autorización o una base legal aplicable.' },
  ];
  const text = paragraphs.map((paragraph) => `${paragraph.title}\n${paragraph.text}`).join('\n\n');
  const hash = createHash('sha256').update(JSON.stringify({ version: PRIVACY_VERSION, controller, controllerIdentityProvided, configured, email, phone, policyUrl, text })).digest('hex');
  return { version: PRIVACY_VERSION, hash, configured, controller, email, phone, policyUrl, paragraphs, text, sensitiveFields: SENSITIVE_FIELDS };
}
