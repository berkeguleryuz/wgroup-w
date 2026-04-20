import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "Businessflix <noreply@businessflix.app>";

let client: Resend | null = null;
function getClient() {
  if (!client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) return null;
    client = new Resend(key);
  }
  return client;
}

type SendArgs = {
  to: string;
  subject: string;
  html: string;
};

async function send({ to, subject, html }: SendArgs) {
  const resend = getClient();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY missing — logging instead of sending");
    console.info({ to, subject, html });
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

function wrap(title: string, body: string, cta?: { label: string; url: string }) {
  const buttonHtml = cta
    ? `<p style="margin:24px 0"><a href="${cta.url}" style="display:inline-block;padding:12px 20px;border-radius:11px;background:#100D08;color:#fbf7f6;text-decoration:none;font-weight:600">${cta.label}</a></p>`
    : "";
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#fbf7f6;color:#100D08;border-radius:11px">
    <h1 style="font-size:22px;margin:0 0 16px;font-weight:600">${title}</h1>
    <div style="font-size:15px;line-height:1.55">${body}</div>
    ${buttonHtml}
    <p style="margin-top:32px;color:#5b534a;font-size:13px">Businessflix</p>
  </div>`;
}

export async function sendVerificationEmail(to: string, url: string) {
  await send({
    to,
    subject: "Businessflix — E-posta doğrulama",
    html: wrap(
      "E-postanı doğrula",
      "<p>Hesabını aktif etmek için aşağıdaki butona tıkla.</p>",
      { label: "E-postayı doğrula", url },
    ),
  });
}

export async function sendPasswordResetEmail(to: string, url: string) {
  await send({
    to,
    subject: "Businessflix — Şifre sıfırlama",
    html: wrap(
      "Şifreni sıfırla",
      "<p>Şifreni sıfırlamak için aşağıdaki butona tıkla. Bu linki sen talep etmediysen bu e-postayı yok say.</p>",
      { label: "Şifreyi sıfırla", url },
    ),
  });
}

export async function sendOrganizationInviteEmail(args: {
  to: string;
  organizationName: string;
  inviterName: string;
  inviteUrl: string;
}) {
  await send({
    to: args.to,
    subject: `${args.organizationName} seni Businessflix'e davet etti`,
    html: wrap(
      `${args.organizationName} ekibine katıl`,
      `<p><strong>${args.inviterName}</strong> seni <strong>${args.organizationName}</strong> adına Businessflix'e davet etti.</p>`,
      { label: "Accept invitation", url: args.inviteUrl },
    ),
  });
}

export async function sendCorporateLeadNotification(args: {
  companyName: string;
  contactName: string;
  email: string;
  seatTarget?: number | null;
  message?: string | null;
}) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to) return;
  await send({
    to,
    subject: `Yeni kurumsal talep: ${args.companyName}`,
    html: wrap(
      "Yeni kurumsal talep",
      `<ul style="padding-left:18px;margin:0">
        <li><strong>Şirket:</strong> ${args.companyName}</li>
        <li><strong>İletişim:</strong> ${args.contactName} &lt;${args.email}&gt;</li>
        <li><strong>Koltuk hedefi:</strong> ${args.seatTarget ?? "-"}</li>
      </ul>
      <p style="margin-top:12px">${args.message ?? ""}</p>`,
    ),
  });
}
