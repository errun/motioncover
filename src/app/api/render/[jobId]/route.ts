import { queueInstance } from "@/server/revert-to-video/queueInstance";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { jobId } = await params;
  const job = queueInstance.getJob(jobId);
  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  return Response.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    eta: job.eta,
    error: job.error,
    outputPath: job.outputPath,
  });
}
