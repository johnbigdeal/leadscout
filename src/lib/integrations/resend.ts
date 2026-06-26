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
