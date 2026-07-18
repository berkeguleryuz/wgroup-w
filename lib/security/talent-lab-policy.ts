import { z } from "zod";

export const TALENT_MESSAGE_MAX_CHARS = 6000;
export const TALENT_MAX_OUTPUT_TOKENS = 4096;
export const TALENT_RATE_WINDOW_SEC = 60;
export const TALENT_RATE_MAX = 12;
export const TALENT_MAX_ACTIVE = 2;
export const TALENT_TIMEOUT_MS = 90_000;

export const talentRequestSchema = z.object({
  conversationId: z.string().trim().min(1).max(128).optional(),
  message: z.string().trim().min(1).max(TALENT_MESSAGE_MAX_CHARS),
});
