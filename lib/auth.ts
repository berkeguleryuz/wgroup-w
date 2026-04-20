import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "./prisma";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrganizationInviteEmail,
} from "./email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const USER_ROLES = [
  "individual",
  "platform_editor",
  "admin",
  "instructor",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const auth = betterAuth({
  appName: "Businessflix",
  baseURL: APP_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
    sendResetPassword: async ({ user, url }) => {
      void sendPasswordResetEmail(user.email, url);
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendVerificationEmail(user.email, url);
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
      async sendInvitationEmail(data) {
        const inviteUrl = `${APP_URL}/invite/${data.id}`;
        await sendOrganizationInviteEmail({
          to: data.email,
          organizationName: data.organization.name,
          inviterName: data.inviter.user.name,
          inviteUrl,
        });
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
