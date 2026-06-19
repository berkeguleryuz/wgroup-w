import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "Busyflix <noreply@businessflix.app>";

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

/** Escape user-supplied text before interpolating into email HTML. */
export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Returns true when the email was sent (or dev-logged); false on a real failure. */
async function send({ to, subject, html }: SendArgs): Promise<boolean> {
  const resend = getClient();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY missing — logging instead of sending");
    console.info({ to, subject, html });
    return true; // dev no-op is not a user-facing failure
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error(`[email] Resend error: ${error.message}`);
      console.info({ to, subject, html });
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send failed:", err);
    console.info({ to, subject, html });
    return false;
  }
}

function wrap(title: string, body: string, cta?: { label: string; url: string }) {
  const buttonHtml = cta
    ? `<p style="margin:24px 0"><a href="${cta.url}" style="display:inline-block;padding:12px 20px;border-radius:11px;background:#100D08;color:#fbf7f6;text-decoration:none;font-weight:600">${cta.label}</a></p>`
    : "";
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#fbf7f6;color:#100D08;border-radius:11px">
    <h1 style="font-size:22px;margin:0 0 16px;font-weight:600">${title}</h1>
    <div style="font-size:15px;line-height:1.55">${body}</div>
    ${buttonHtml}
    <p style="margin-top:32px;color:#5b534a;font-size:13px">Busyflix</p>
  </div>`;
}

export async function sendVerificationEmail(to: string, url: string) {
  return send({
    to,
    subject: "Busyflix — E-posta doğrulama",
    html: wrap(
      "E-postanı doğrula",
      "<p>Hesabını aktif etmek için aşağıdaki butona tıkla.</p>",
      { label: "E-postayı doğrula", url },
    ),
  });
}

export async function sendPasswordResetEmail(to: string, url: string) {
  return send({
    to,
    subject: "Busyflix — Şifre sıfırlama",
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
  const org = escapeHtml(args.organizationName);
  const inviter = escapeHtml(args.inviterName);
  return send({
    to: args.to,
    subject: `${org} seni Busyflix'e davet etti`,
    html: wrap(
      `${org} ekibine katıl`,
      `<p><strong>${inviter}</strong> seni <strong>${org}</strong> adına Busyflix'e davet etti.</p>`,
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
  if (!to) return true;
  const company = escapeHtml(args.companyName);
  const contact = escapeHtml(args.contactName);
  const email = escapeHtml(args.email);
  const message = escapeHtml(args.message ?? "");
  return send({
    to,
    subject: `Yeni kurumsal talep: ${company}`,
    html: wrap(
      "Yeni kurumsal talep",
      `<ul style="padding-left:18px;margin:0">
        <li><strong>Şirket:</strong> ${company}</li>
        <li><strong>İletişim:</strong> ${contact} &lt;${email}&gt;</li>
        <li><strong>Koltuk hedefi:</strong> ${args.seatTarget ?? "-"}</li>
      </ul>
      <p style="margin-top:12px">${message}</p>`,
    ),
  });
}
