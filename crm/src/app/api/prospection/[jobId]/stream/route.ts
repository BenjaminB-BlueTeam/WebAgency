// crm/src/app/api/prospection/[jobId]/stream/route.ts
import { NextRequest } from "next/server";
import { getJob, subscribeToJob } from "@/lib/prospection-jobs";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  const { jobId } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      };

      const job = getJob(jobId);
      if (!job) {
        send("error", { error: "Job not found" });
        controller.close();
        return;
      }

      // Send current state immediately
      send("progress", { steps: job.steps, status: job.status });

      // If already finished, send final event and close
      if (job.status === "done") {
        send("done", { results: job.results });
        controller.close();
        return;
      }
      if (job.status === "error") {
        send("error", { error: job.error });
        controller.close();
        return;
      }

      // Subscribe to future events
      const unsubscribe = subscribeToJob(jobId, (event, data) => {
        send(event, data);
        if (event === "done" || event === "error") {
          controller.close();
          unsubscribe();
        }
      });

      // Clean up on client disconnect
      req.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
