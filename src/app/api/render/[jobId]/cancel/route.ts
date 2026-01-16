import { queueInstance } from "@/server/revert-to-video/queueInstance";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ jobId: string }>;
};

export async function POST(_request: Request, { params }: Params) {
  const { jobId } = await params;
  const cancelled = queueInstance.cancel(jobId);
  if (!cancelled) {
    return Response.json({ error: "Job not found or already completed" }, { status: 404 });
  }

  return Response.json({ jobId, status: "cancelled" });
}
