import { after } from "next/server";
import { isAdminUser } from "@/lib/admin-access";
import { ChatError, openChat, runChat } from "@/lib/aquibot-engine/chat";
import { pruneOldData } from "@/lib/aquibot-engine/store";
import { getSession } from "@/lib/session";

export const maxDuration = 120;

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ error: "unauthorized", message: "Sign in to use Aquibot." }, { status: 401 });
  const actor = { user, isAdmin: isAdminUser(user) };

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  let opened;
  try {
    opened = await openChat(actor, { message: body.message, sessionId: body.sessionId, testMode: body.testMode });
  } catch (error) {
    if (error instanceof ChatError) return Response.json({ error: error.code, message: error.message, usage: error.usage }, { status: error.status });
    return Response.json({ error: "server_error", message: "Aquibot could not start this answer." }, { status: 500 });
  }

  const retentionMonths = opened.config.settings.pruneAgeMonths;
  after(() => pruneOldData(retentionMonths).catch(() => undefined));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // The reader left (stop button or closed tab); the turn still finishes and is saved.
        }
      };
      try {
        for await (const event of runChat(actor, opened, request.signal)) send(event);
      } catch {
        send({ type: "error", message: "The answer was interrupted. Please try again." });
      } finally {
        try {
          controller.close();
        } catch {
          // client already gone
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", "x-accel-buffering": "no" },
  });
}
