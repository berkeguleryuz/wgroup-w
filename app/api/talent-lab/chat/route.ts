import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { getSession, getEffectiveAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  TALENT_MAX_ACTIVE,
  TALENT_MAX_OUTPUT_TOKENS,
  TALENT_RATE_MAX,
  TALENT_RATE_WINDOW_SEC,
  TALENT_TIMEOUT_MS,
  talentRequestSchema,
} from "@/lib/security/talent-lab-policy";
import { safeErrorMessage } from "@/lib/security/log-redaction";

const MODEL = "claude-opus-4-8";
const HISTORY_LIMIT = 30;

async function claimQuota(userId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ allowed: boolean }>>`
    INSERT INTO "AgentQuota" AS quota
      ("userId", "windowStartedAt", "requestCount", "activeCount", "updatedAt")
    VALUES (${userId}, CURRENT_TIMESTAMP, 1, 1, CURRENT_TIMESTAMP)
    ON CONFLICT ("userId") DO UPDATE SET
      "windowStartedAt" = CASE
        WHEN quota."windowStartedAt" <= CURRENT_TIMESTAMP - (${TALENT_RATE_WINDOW_SEC} * INTERVAL '1 second')
          THEN CURRENT_TIMESTAMP
        ELSE quota."windowStartedAt"
      END,
      "requestCount" = CASE
        WHEN quota."windowStartedAt" <= CURRENT_TIMESTAMP - (${TALENT_RATE_WINDOW_SEC} * INTERVAL '1 second')
          THEN 1
        ELSE quota."requestCount" + 1
      END,
      "activeCount" = CASE
        WHEN quota."updatedAt" <= CURRENT_TIMESTAMP - (${TALENT_TIMEOUT_MS * 2} * INTERVAL '1 millisecond')
          THEN 1
        ELSE quota."activeCount" + 1
      END,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE
      (
        quota."updatedAt" <= CURRENT_TIMESTAMP - (${TALENT_TIMEOUT_MS * 2} * INTERVAL '1 millisecond')
        OR quota."activeCount" < ${TALENT_MAX_ACTIVE}
      )
      AND (
        quota."windowStartedAt" <= CURRENT_TIMESTAMP - (${TALENT_RATE_WINDOW_SEC} * INTERVAL '1 second')
        OR quota."requestCount" < ${TALENT_RATE_MAX}
      )
    RETURNING TRUE AS allowed
  `;
  return rows[0]?.allowed === true;
}

async function releaseQuota(userId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "AgentQuota"
    SET "activeCount" = GREATEST("activeCount" - 1, 0),
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "userId" = ${userId}
  `;
}

const SYSTEM_PROMPT = `You are the AI coach of the "Talent Development Laboratory" on Busyflix, a business-education streaming platform. You help professionals grow: leadership, management, communication, entrepreneurship, career planning, negotiation, productivity and similar business skills.

Guidelines:
- Be a practical, encouraging coach. Prefer concrete frameworks, examples and small actionable steps over generic advice.
- Keep answers focused and conversational; use short paragraphs and lists where helpful.
- Always reply in the same language the user writes in (Turkish, English or German).
- If asked something far outside professional development, politely steer back to career and business topics.
- Never invent Busyflix course names; speak generally about topics instead.`;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string | null }).role ?? null;
  const access = await getEffectiveAccess(session.user.id, role);
  if (!access.hasAccess) {
    return NextResponse.json({ error: "subscription_required" }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const parsed = talentRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const { message } = parsed.data;

  const userId = session.user.id;

  let conversationId = parsed.data.conversationId ?? null;

  if (conversationId) {
    const owned = await prisma.agentConversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
  } else {
    conversationId = null;
  }

  let quotaAllowed: boolean;
  try {
    quotaAllowed = await claimQuota(userId);
  } catch (error) {
    console.error("talent-lab quota error", safeErrorMessage(error));
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  if (!quotaAllowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    if (!conversationId) {
      const conversation = await prisma.agentConversation.create({
        data: { userId, title: message.slice(0, 80) },
      });
      conversationId = conversation.id;
    }

    await prisma.agentMessage.create({
      data: { conversationId, role: "user", content: message },
    });

    const history = await prisma.agentMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
    });
    const messages = history.reverse().map((m) => ({
      role:
        m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

    const anthropic = new Anthropic();
    const encoder = new TextEncoder();
    const convId = conversationId;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let full = "";
        try {
          const messageStream = anthropic.messages.stream(
            {
              model: MODEL,
              max_tokens: TALENT_MAX_OUTPUT_TOKENS,
              thinking: { type: "adaptive" },
              system: [
                {
                  type: "text",
                  text: SYSTEM_PROMPT,
                  cache_control: { type: "ephemeral" },
                },
              ],
              messages,
            },
            {
              maxRetries: 0,
              signal: request.signal,
              timeout: TALENT_TIMEOUT_MS,
            },
          );
          messageStream.on("text", (delta) => {
            full += delta;
            controller.enqueue(encoder.encode(delta));
          });
          await messageStream.finalMessage();
        } catch (e) {
          const fallback = "\n\n[error]";
          controller.enqueue(encoder.encode(fallback));
          console.error("talent-lab chat error", safeErrorMessage(e));
        } finally {
          try {
            if (full.trim()) {
              await prisma.$transaction([
                prisma.agentMessage.create({
                  data: {
                    conversationId: convId,
                    role: "assistant",
                    content: full,
                  },
                }),
                prisma.agentConversation.update({
                  where: { id: convId },
                  data: { updatedAt: new Date() },
                }),
              ]);
            }
          } catch (e) {
            console.error("talent-lab persist error", safeErrorMessage(e));
          } finally {
            await releaseQuota(userId).catch((error) => {
              console.error(
                "talent-lab quota release error",
                safeErrorMessage(error),
              );
            });
            controller.close();
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Conversation-Id": conversationId,
      },
    });
  } catch (error) {
    await releaseQuota(userId).catch(() => {});
    console.error("talent-lab setup error", safeErrorMessage(error));
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
