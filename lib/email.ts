import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "Busyflix <noreply@businessflix.app>";

// Logo ships as an inline CID attachment instead of a remote URL: mail
// clients can't fetch localhost in dev, and remote images are often blocked
// by default anyway — embedded, it always renders.
const LOGO_CID = "busyflix-logo";
let logoBuffer: Buffer | null | undefined;
function getLogoBuffer(): Buffer | null {
  if (logoBuffer === undefined) {
    try {
      logoBuffer = readFileSync(join(process.cwd(), "public", "logo-email.png"));
    } catch {
      logoBuffer = null;
    }
  }
  return logoBuffer;
}

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
    const logo = html.includes(`cid:${LOGO_CID}`) ? getLogoBuffer() : null;
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      ...(logo
        ? {
            attachments: [
              {
                filename: "busyflix-logo.png",
                content: logo,
                contentType: "image/png",
                contentId: LOGO_CID,
              },
            ],
          }
        : {}),
    });
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

// ---------------------------------------------------------------------------
// E-mail i18n. Deliberately a small inline dictionary (not next-intl): these
// strings render outside any request/locale context (auth callbacks, jobs).
// Unknown/missing locale falls back to English.
// ---------------------------------------------------------------------------

export type EmailLocale = "en" | "tr" | "de";

export function resolveEmailLocale(l: string | null | undefined): EmailLocale {
  return l === "tr" || l === "de" ? l : "en";
}

const EMAIL_MESSAGES = {
  en: {
    footerTag: "Busyflix · Cinema-grade productions for the business world.",
    linkHome: "Home",
    linkPricing: "Pricing",
    linkBusiness: "For Business",
    linkLogin: "Log in",
    verifySubject: "Busyflix — Verify your email",
    verifyTitle: "Verify your email",
    verifyBody: "<p>Click the button below to activate your account.</p>",
    verifyCta: "Verify email",
    resetSubject: "Busyflix — Reset your password",
    resetTitle: "Reset your password",
    resetBody:
      "<p>Click the button below to reset your password. If you didn't request this, you can safely ignore this email.</p>",
    resetCta: "Reset password",
    inviteSubject: (org: string) => `${org} invited you to Busyflix`,
    inviteTitle: (org: string) => `Join ${org} on Busyflix`,
    inviteBody: (inviter: string, org: string) =>
      `<p><strong>${inviter}</strong> has invited you to Busyflix on behalf of <strong>${org}</strong>.</p>`,
    inviteCta: "Accept invitation",
  },
  tr: {
    footerTag: "Busyflix · İş dünyası için sinema kalitesinde yapımlar.",
    linkHome: "Ana sayfa",
    linkPricing: "Fiyatlandırma",
    linkBusiness: "Kurumsal",
    linkLogin: "Giriş yap",
    verifySubject: "Busyflix — E-postanı doğrula",
    verifyTitle: "E-postanı doğrula",
    verifyBody:
      "<p>Hesabını etkinleştirmek için aşağıdaki butona tıkla.</p>",
    verifyCta: "E-postayı doğrula",
    resetSubject: "Busyflix — Şifreni sıfırla",
    resetTitle: "Şifreni sıfırla",
    resetBody:
      "<p>Şifreni sıfırlamak için aşağıdaki butona tıkla. Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.</p>",
    resetCta: "Şifreyi sıfırla",
    inviteSubject: (org: string) => `${org} seni Busyflix'e davet etti`,
    inviteTitle: (org: string) => `${org} ekibine Busyflix'te katıl`,
    inviteBody: (inviter: string, org: string) =>
      `<p><strong>${inviter}</strong>, seni <strong>${org}</strong> adına Busyflix'e davet etti.</p>`,
    inviteCta: "Daveti kabul et",
  },
  de: {
    footerTag: "Busyflix · Produktionen in Kinoqualität für die Businesswelt.",
    linkHome: "Startseite",
    linkPricing: "Preise",
    linkBusiness: "Für Unternehmen",
    linkLogin: "Anmelden",
    verifySubject: "Busyflix — Bestätige deine E-Mail",
    verifyTitle: "Bestätige deine E-Mail",
    verifyBody:
      "<p>Klicke auf den Button unten, um dein Konto zu aktivieren.</p>",
    verifyCta: "E-Mail bestätigen",
    resetSubject: "Busyflix — Passwort zurücksetzen",
    resetTitle: "Passwort zurücksetzen",
    resetBody:
      "<p>Klicke auf den Button unten, um dein Passwort zurückzusetzen. Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>",
    resetCta: "Passwort zurücksetzen",
    inviteSubject: (org: string) => `${org} hat dich zu Busyflix eingeladen`,
    inviteTitle: (org: string) => `Tritt ${org} auf Busyflix bei`,
    inviteBody: (inviter: string, org: string) =>
      `<p><strong>${inviter}</strong> hat dich im Namen von <strong>${org}</strong> zu Busyflix eingeladen.</p>`,
    inviteCta: "Einladung annehmen",
  },
} as const;

function wrap(
  title: string,
  body: string,
  cta?: { label: string; url: string },
  locale: EmailLocale = "en",
) {
  const m = EMAIL_MESSAGES[locale];
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
                <a href="${APP_URL}" style="text-decoration:none">
                  <img src="cid:${LOGO_CID}" width="59" height="80" alt="Busyflix" style="display:block;border:0;margin:0 auto 12px" />
                  <span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;letter-spacing:0.5px;color:#fbf7f6">busyflix</span>
                </a>
              </td>
            </tr>
            <tr>
              <td style="background:#fbf7f6;padding:36px 40px 32px;border:1px solid #e6dccc;border-top:0;border-radius:0 0 11px 11px">
                <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:600;line-height:1.25;color:#100D08">${title}</h1>
                <div style="font-family:-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#100D08">${body}</div>
                ${buttonHtml}
                <hr style="margin:28px 0 0;border:0;border-top:1px solid #e6dccc" />
                <p style="margin:16px 0 0;font-family:-apple-system,'Segoe UI',sans-serif;font-size:12px;line-height:1.6;color:#5b534a">${m.footerTag}</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px 8px 0">
                <p style="margin:0 0 6px;font-family:-apple-system,'Segoe UI',sans-serif;font-size:12px;color:#5b534a">
                  <a href="${APP_URL}" style="color:#5b534a;text-decoration:underline">${m.linkHome}</a>
                  &nbsp;&middot;&nbsp;
                  <a href="${APP_URL}/pricing" style="color:#5b534a;text-decoration:underline">${m.linkPricing}</a>
                  &nbsp;&middot;&nbsp;
                  <a href="${APP_URL}/business" style="color:#5b534a;text-decoration:underline">${m.linkBusiness}</a>
                  &nbsp;&middot;&nbsp;
                  <a href="${APP_URL}/login" style="color:#5b534a;text-decoration:underline">${m.linkLogin}</a>
                </p>
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

export async function sendVerificationEmail(
  to: string,
  url: string,
  locale?: string | null,
) {
  const l = resolveEmailLocale(locale);
  const m = EMAIL_MESSAGES[l];
  return send({
    to,
    subject: m.verifySubject,
    html: wrap(m.verifyTitle, m.verifyBody, { label: m.verifyCta, url }, l),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  url: string,
  locale?: string | null,
) {
  const l = resolveEmailLocale(locale);
  const m = EMAIL_MESSAGES[l];
  return send({
    to,
    subject: m.resetSubject,
    html: wrap(m.resetTitle, m.resetBody, { label: m.resetCta, url }, l),
  });
}

export async function sendOrganizationInviteEmail(args: {
  to: string;
  organizationName: string;
  inviterName: string;
  inviteUrl: string;
  locale?: string | null;
}) {
  const l = resolveEmailLocale(args.locale);
  const m = EMAIL_MESSAGES[l];
  const org = escapeHtml(args.organizationName);
  const inviter = escapeHtml(args.inviterName);
  return send({
    to: args.to,
    subject: m.inviteSubject(org),
    html: wrap(
      m.inviteTitle(org),
      m.inviteBody(inviter, org),
      { label: m.inviteCta, url: args.inviteUrl },
      l,
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
