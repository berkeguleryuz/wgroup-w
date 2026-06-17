import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { getSession, getEffectiveAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const MODEL = "claude-opus-4-8";
const HISTORY_LIMIT = 30;

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

  const body = (await request.json().catch(() => null)) as
    | { conversationId?: string; message?: string }
    | null;
  const message = body?.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const userId = session.user.id;
  let conversationId = body?.conversationId ?? null;

  if (conversationId) {
    const owned = await prisma.agentConversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
  } else {
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
  const messages = history
    .reverse()
    .map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

  const anthropic = new Anthropic();
  const encoder = new TextEncoder();
  const convId = conversationId;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        const messageStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 64000,
          thinking: { type: "adaptive" },
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages,
        });
        messageStream.on("text", (delta) => {
          full += delta;
          controller.enqueue(encoder.encode(delta));
        });
        await messageStream.finalMessage();
      } catch (e) {
        const fallback = "\n\n[error]";
        controller.enqueue(encoder.encode(fallback));
        console.error("talent-lab chat error:", e);
      } finally {
        if (full.trim()) {
          await prisma.$transaction([
            prisma.agentMessage.create({
              data: { conversationId: convId, role: "assistant", content: full },
            }),
            prisma.agentConversation.update({
              where: { id: convId },
              data: { updatedAt: new Date() },
            }),
          ]);
        }
        controller.close();
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
}
