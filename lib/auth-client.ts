import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  organizationClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [
    inferAdditionalFields<typeof auth>(),
    adminClient(),
    organizationClient(),
  ],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
