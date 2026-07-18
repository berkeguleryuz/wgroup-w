import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  organizationClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>(),
    adminClient(),
    organizationClient(),
  ],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
