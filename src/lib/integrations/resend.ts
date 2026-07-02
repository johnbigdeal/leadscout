import { Resend } from "resend";

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const client = getResend();
  if (!client) {
    console.warn("RESEND_API_KEY not set, skipping email to", to);
    return;
  }

  const { data, error } = await client.emails.send({
    from: "LeadScout <noreply@leadscout.lat>",
    to,
    subject,
    html,
  });

  if (error) {
    console.error("Resend email error:", error);
  }

  return data;
}

export function sinpeProofSubmittedHtml(opts: {
  orgName: string;
  email: string;
  amount: string;
  reference?: string | null;
  proofUrl: string;
}): string {
  const { orgName, email, amount, reference, proofUrl } = opts;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; padding: 32px; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 22px; color: #1a1a2e;">Nuevo comprobante SINPE para verificar</h1>
  </div>
  <p style="font-size: 16px; color: #555;">Una organización subió un comprobante de pago SINPE Móvil:</p>
  <table style="width: 100%; font-size: 15px; color: #333; border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 6px 0; color: #888;">Organización</td><td style="padding: 6px 0; font-weight: 600;">${orgName}</td></tr>
    <tr><td style="padding: 6px 0; color: #888;">Usuario</td><td style="padding: 6px 0;">${email}</td></tr>
    <tr><td style="padding: 6px 0; color: #888;">Monto</td><td style="padding: 6px 0;">${amount}</td></tr>
    <tr><td style="padding: 6px 0; color: #888;">Referencia</td><td style="padding: 6px 0;">${reference || "—"}</td></tr>
  </table>
  <div style="text-align: center; margin: 24px 0;">
    <a href="${proofUrl}"
       style="background: #f3f4f6; color: #1a1a2e; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; margin-right: 8px;">
      Ver comprobante
    </a>
    <a href="https://leadscout.lat/dashboard/admin"
       style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
      Revisar y aprobar
    </a>
  </div>
  <p style="font-size: 14px; color: #999;">Panel de Administración → pestaña SINPE</p>
</body>
</html>`;
}

export function inviteCodeRequestHtml(opts: { email: string; orgName: string }): string {
  const { email, orgName } = opts;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; padding: 32px; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 22px; color: #1a1a2e;">Solicitud de más códigos de invitación</h1>
  </div>
  <p style="font-size: 16px; color: #555;">Un usuario agotó sus invitaciones y pide una recarga:</p>
  <table style="width: 100%; font-size: 15px; color: #333; border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 6px 0; color: #888;">Usuario</td><td style="padding: 6px 0; font-weight: 600;">${email}</td></tr>
    <tr><td style="padding: 6px 0; color: #888;">Organización</td><td style="padding: 6px 0;">${orgName}</td></tr>
  </table>
  <div style="text-align: center; margin: 24px 0;">
    <a href="https://leadscout.lat/dashboard/admin"
       style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
      Revisar y aprobar
    </a>
  </div>
  <p style="font-size: 14px; color: #999;">Panel de Administración → pestaña Invitaciones</p>
</body>
</html>`;
}

export function trialReminder3DaysHtml(name: string, daysLeft: number): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; padding: 32px; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 24px; color: #1a1a2e;">Tu prueba gratuita termina pronto</h1>
  </div>
  <p style="font-size: 16px; color: #555;">Hola${name ? ` ${name}` : ""},</p>
  <p style="font-size: 16px; color: #555;">
    Te quedan <strong style="color: #f59e0b;">${daysLeft} días</strong> de prueba gratuita en LeadScout.
    Cuando termine, tu cuenta se pausará y tus datos se conservarán por 30 días.
  </p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="https://leadscout.lat/dashboard/settings/plans"
       style="background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
      Upgrade a Pro
    </a>
  </div>
  <p style="font-size: 14px; color: #999;">El equipo de LeadScout</p>
</body>
</html>`;
}

export function trialExpiredHtml(name: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; padding: 32px; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 24px; color: #dc2626;">Tu prueba ha terminado</h1>
  </div>
  <p style="font-size: 16px; color: #555;">Hola${name ? ` ${name}` : ""},</p>
  <p style="font-size: 16px; color: #555;">
    Tu período de prueba gratuita ha terminado. Tu cuenta está pausada pero tus datos están a salvo.
  </p>
  <p style="font-size: 16px; color: #555;">
    Upgrade a Pro para recuperar el acceso completo. Si no upgradear, tus datos se eliminarán en 30 días.
  </p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="https://leadscout.lat/dashboard/settings/plans"
       style="background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
      Reactivar con Pro
    </a>
  </div>
  <p style="font-size: 14px; color: #999;">El equipo de LeadScout</p>
</body>
</html>`;
}

export function dataDeletionWarningHtml(name: string, daysLeft: number): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; padding: 32px; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 24px; color: #dc2626;">Tus datos se eliminarán en ${daysLeft} días</h1>
  </div>
  <p style="font-size: 16px; color: #555;">Hola${name ? ` ${name}` : ""},</p>
  <p style="font-size: 16px; color: #555;">
    Tu prueba gratuita terminó hace tiempo. Si no upgradear a Pro en los próximos <strong>${daysLeft} días</strong>,
    todos tus datos (búsquedas, leads, websites, pipelines) serán eliminados permanentemente.
  </p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="https://leadscout.lat/dashboard/settings/plans"
       style="background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
      Upgrade a Pro
    </a>
  </div>
  <p style="font-size: 14px; color: #999;">El equipo de LeadScout</p>
</body>
</html>`;
}

export function dataDeletedHtml(name: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; padding: 32px; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 24px; color: #999;">Tus datos han sido eliminados</h1>
  </div>
  <p style="font-size: 16px; color: #555;">Hola${name ? ` ${name}` : ""},</p>
  <p style="font-size: 16px; color: #555;">
    Han pasado 30 días desde que terminó tu período de prueba y tus datos han sido eliminados permanentemente.
  </p>
  <p style="font-size: 16px; color: #555;">
    Si querés volver a usar LeadScout, podés crear una cuenta nueva en cualquier momento.
  </p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="https://leadscout.lat"
       style="background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
      Ir a LeadScout
    </a>
  </div>
  <p style="font-size: 14px; color: #999;">El equipo de LeadScout</p>
</body>
</html>`;
}
