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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function wrap(title: string, body: string, cta?: { label: string; url: string }) {
  const buttonHtml = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px">
        <tr>
          <td style="border-radius:11px;background:#100D08">
            <a href="${cta.url}" style="display:inline-block;padding:13px 26px;border-radius:11px;font-family:-apple-system,'Segoe UI',sans-serif;font-size:15px;font-weight:600;color:#fbf7f6;text-decoration:none">${cta.label}</a>
          </td>
        </tr>
      </table>`
    : "";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f1ebe7">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1ebe7;padding:32px 16px">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
            <tr>
              <td style="border-radius:11px 11px 0 0;background:#0c0907;padding:30px 40px 26px" align="center">
                <img src="${APP_URL}/logo-email.png" width="59" height="80" alt="Busyflix" style="display:block;border:0;margin:0 auto 12px" />
                <span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;letter-spacing:0.5px;color:#fbf7f6">busyflix</span>
              </td>
            </tr>
            <tr>
              <td style="background:#fbf7f6;padding:36px 40px 32px;border:1px solid #e6dccc;border-top:0;border-radius:0 0 11px 11px">
                <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:600;line-height:1.25;color:#100D08">${title}</h1>
                <div style="font-family:-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#100D08">${body}</div>
                ${buttonHtml}
                <hr style="margin:28px 0 0;border:0;border-top:1px solid #e6dccc" />
                <p style="margin:16px 0 0;font-family:-apple-system,'Segoe UI',sans-serif;font-size:12px;line-height:1.6;color:#5b534a">Busyflix — Cinema-grade productions for the business world.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px 8px 0">
                <p style="margin:0;font-family:-apple-system,'Segoe UI',sans-serif;font-size:11px;color:#5b534a">&copy; ${new Date().getFullYear()} Busyflix &middot; Wgroup GmbH</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendVerificationEmail(to: string, url: string) {
  return send({
    to,
    subject: "Busyflix — Verify your email",
    html: wrap(
      "Verify your email",
      "<p>Click the button below to activate your account.</p>",
      { label: "Verify email", url },
    ),
  });
}

export async function sendPasswordResetEmail(to: string, url: string) {
  return send({
    to,
    subject: "Busyflix — Reset your password",
    html: wrap(
      "Reset your password",
      "<p>Click the button below to reset your password. If you didn't request this, you can safely ignore this email.</p>",
      { label: "Reset password", url },
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
    subject: `${org} invited you to Busyflix`,
    html: wrap(
      `Join ${org} on Busyflix`,
      `<p><strong>${inviter}</strong> has invited you to Busyflix on behalf of <strong>${org}</strong>.</p>`,
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
    subject: `New corporate inquiry: ${company}`,
    html: wrap(
      "New corporate inquiry",
      `<ul style="padding-left:18px;margin:0">
        <li><strong>Company:</strong> ${company}</li>
        <li><strong>Contact:</strong> ${contact} &lt;${email}&gt;</li>
        <li><strong>Seat target:</strong> ${args.seatTarget ?? "-"}</li>
      </ul>
      <p style="margin-top:12px">${message}</p>`,
    ),
  });
}
