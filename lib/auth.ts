import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "./prisma";
import { resolveAuthBaseUrl, resolvePublicAppUrl } from "./app-url";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendCorporateWelcomeEmail,
  sendOrganizationInviteEmail,
} from "./email";

const AUTH_BASE_URL = resolveAuthBaseUrl();
const PUBLIC_APP_URL = resolvePublicAppUrl();
const DATABASE_RATE_LIMIT_ENABLED =
  process.env.AUTH_DISABLE_DATABASE_RATE_LIMIT !== "true";

/**
 * Request-scoped override for the shared `sendResetPassword` callback. When an
 * admin provisions a corporate owner we still mint the reset token via
 * `requestPasswordReset`, but the recipient should get a "welcome / set your
 * password" e-mail — not the "you requested a reset" one. The activation action
 * runs its `requestPasswordReset` call inside `resetEmailContext.run(...)`; the
 * callback reads the store to pick the right template. AsyncLocalStorage keeps
 * this race-free across concurrent activations.
 */
type ResetEmailContext = { kind: "corporate-welcome"; companyName: string };
export const resetEmailContext =
  new AsyncLocalStorage<ResetEmailContext | undefined>();

export const USER_ROLES = [
  "individual",
  "platform_editor",
  "admin",
  "instructor",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const auth = betterAuth({
  appName: "Busyflix",
  baseURL: AUTH_BASE_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, { provider: "postgresql" }),

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60,
      strategy: "compact",
    },
  },

  rateLimit: {
    enabled:
      process.env.NODE_ENV === "production" && DATABASE_RATE_LIMIT_ENABLED,
    storage: "database",
    window: 60,
    max: 100,
  },

  advanced: {
    ipAddress: {
      ipAddressHeaders: ["x-vercel-forwarded-for"],
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification:
      process.env.AUTH_SKIP_EMAIL_VERIFICATION !== "true",
    autoSignIn: false,
    sendResetPassword: async ({ user, url }) => {
      const ctx = resetEmailContext.getStore();
      const locale = await requestLocale();
      let sent: boolean;
      if (ctx?.kind === "corporate-welcome") {
        sent = await sendCorporateWelcomeEmail(
          user.email,
          url,
          ctx.companyName,
          locale,
        );
      } else {
        sent = await sendPasswordResetEmail(user.email, url, locale);
      }
      if (!sent) throw new Error("email delivery failed");
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const sent = await sendVerificationEmail(
        user.email,
        url,
        await requestLocale(),
      );
      if (!sent) throw new Error("email delivery failed");
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "individual",
        input: false,
      },
    },
  },

  plugins: [
    admin({
      defaultRole: "individual",
      adminRoles: ["admin"],
    }),
    organization({
      allowUserToCreateOrganization: false,
      // The real seat cap is CompanyProfile.seatCount, enforced in our invite
      // action and the beforeAcceptInvitation hook below. Keep the framework
      // limit effectively unlimited so it never blocks a large paid plan.
      membershipLimit: 100000,
      organizationHooks: {
        // Give B2B invitations a 7-day window (default is 48h).
        beforeCreateInvitation: async ({ invitation }) => {
          return {
            data: {
              ...invitation,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          };
        },
        // Hard seat cap at accept-time: a company can never exceed its paid
        // seatCount, regardless of how many invitations are outstanding.
        beforeAcceptInvitation: async ({ organization: org }) => {
          const profile = await prisma.companyProfile.findUnique({
            where: { organizationId: org.id },
            select: { seatCount: true },
          });
          if (profile) {
            const members = await prisma.member.count({
              where: { organizationId: org.id },
            });
            if (members >= profile.seatCount) {
              throw new APIError("BAD_REQUEST", {
                message:
                  "Bu şirketin koltuk limiti dolu. Lütfen yöneticinizle iletişime geçin.",
              });
            }
          }
        },
      },
      async sendInvitationEmail(data) {
        const inviteUrl = `${PUBLIC_APP_URL}/invite/${data.id}`;
        const sent = await sendOrganizationInviteEmail({
          to: data.email,
          organizationName: data.organization.name,
          inviterName: data.inviter.user.name,
          inviteUrl,
          // The inviter's UI language — best available signal for the
          // company's language until the invitee has an own preference.
          locale: await requestLocale(),
        });
        if (!sent) throw new Error("email delivery failed");
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;

/**
 * The requester's UI language (NEXT_LOCALE cookie) for localized e-mails.
 * Auth callbacks run inside a request scope, so next/headers works; outside
 * one (jobs, scripts) this quietly falls back to undefined → English.
 */
async function requestLocale(): Promise<string | undefined> {
  try {
    const { cookies } = await import("next/headers");
    return (await cookies()).get("NEXT_LOCALE")?.value;
  } catch {
    return undefined;
  }
}
